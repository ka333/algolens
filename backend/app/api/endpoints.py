from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models import Problem, SubmissionEvent
from app.api.schemas import SubmissionEventCreate
from app.services.analytics import get_problem_aggregates, calculate_solve_time_percentile
from app.api.rate_limiter import rate_limit

router = APIRouter(prefix="/api", dependencies=[Depends(rate_limit)])

@router.post("/submission-event", status_code=status.HTTP_201_CREATED)
async def record_submission_event(
    event: SubmissionEventCreate, 
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Store individual event
        db_event = SubmissionEvent(
            problem_slug=event.problem,
            solve_time=event.solveTime,
            attempts=event.attempts,
            status=event.status.lower()
        )
        db.add(db_event)

        # 2. Fetch or create the aggregated problem metrics
        query = select(Problem).filter(Problem.slug == event.problem)
        res = await db.execute(query)
        db_problem = res.scalar_one_or_none()

        is_accepted = event.status.lower() == 'accepted'

        if not db_problem:
            # First submission for this problem
            db_problem = Problem(
                slug=event.problem,
                difficulty=event.difficulty,
                total_submissions=1,
                accepted_count=1 if is_accepted else 0,
                avg_solve_time=float(event.solveTime) if is_accepted else 0.0,
                avg_attempts=float(event.attempts) if is_accepted else 0.0
            )
            db.add(db_problem)
        else:
            # Update existing problem aggregates
            db_problem.total_submissions += 1
            
            if is_accepted:
                old_count = db_problem.accepted_count
                new_count = old_count + 1
                db_problem.accepted_count = new_count
                
                # Running averages calculation
                db_problem.avg_solve_time = (
                    (db_problem.avg_solve_time * old_count) + event.solveTime
                ) / new_count
                
                db_problem.avg_attempts = (
                    (db_problem.avg_attempts * old_count) + event.attempts
                ) / new_count

        await db.commit()
        return {"success": True, "message": "Telemetry event saved."}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database commit failed: {str(e)}"
        )

# Fetch stats and calculate percentile comparisons (Commit 41)
@router.get("/stats/{problem}")
async def get_problem_stats(
    problem: str,
    solveTime: int | None = None,
    db: AsyncSession = Depends(get_db)
):
    db_problem = await get_problem_aggregates(db, problem)
    if not db_problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry data found for problem: {problem}"
        )
    
    percentile = 50.0
    if solveTime is not None:
        percentile = await calculate_solve_time_percentile(db, problem, solveTime)

    return {
        "slug": db_problem.slug,
        "difficulty": db_problem.difficulty,
        "totalSubmissions": db_problem.total_submissions,
        "acceptedCount": db_problem.accepted_count,
        "avgSolveTime": round(db_problem.avg_solve_time, 1),
        "avgAttempts": round(db_problem.avg_attempts, 1),
        "percentileEstimate": percentile
    }
