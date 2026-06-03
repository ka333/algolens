from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models import Problem, SubmissionEvent
from app.api.schemas import SubmissionEventCreate
from app.services.analytics import get_problem_aggregates, calculate_solve_time_percentile
from app.api.rate_limiter import rate_limit
from app.services.svg_renderer import render_stats_card, render_radar_card, render_benchmark_card
from typing import Dict

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

# Fetch stats and calculate percentile comparisons
@router.get("/stats/{problem}")
async def get_problem_stats(
    problem: str,
    solveTime: int | None = Query(None, gt=0),
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

# In-memory cache dictionary (Commit 49)
# Key: string hash of params, Value: (timestamp, svg_string)
svg_cache: Dict[str, str] = {}

# Dynamic SVG generator route (Commit 48, 49, 50)
@router.get("/svg/stats")
async def get_svg_card(
    response: Response,
    cardType: str = "profile",
    easy: int = 0,
    medium: int = 0,
    hard: int = 0,
    streak: int = 0,
    problem: str | None = None,
    solveTime: int | None = None,
    db: AsyncSession = Depends(get_db)
):
    # 1. Generate cache key based on query parameters (Commit 49)
    cache_key = f"{cardType}:{easy}:{medium}:{hard}:{streak}:{problem}:{solveTime}"
    if cache_key in svg_cache:
        # Serve from cache directly
        svg_content = svg_cache[cache_key]
    else:
        # Render the correct SVG template
        if cardType == "benchmark" and problem and solveTime:
            # Benchmark Card requires fetching NeonDB averages
            db_problem = await get_problem_aggregates(db, problem)
            avg_time = db_problem.avg_solve_time if db_problem else float(solveTime * 1.2)
            percentile = await calculate_solve_time_percentile(db, problem, solveTime)
            svg_content = render_benchmark_card(float(solveTime), avg_time, percentile)
        elif cardType == "radar":
            # Topic Mastery radar card
            mock_topics = [("Arrays", 85), ("Dynamic Programming", 45), ("Graphs", 60)]
            svg_content = render_radar_card(mock_topics)
        else:
            # Default Profile Stats Card
            svg_content = render_stats_card(easy, medium, hard, streak)
            
        # Store in cache
        svg_cache[cache_key] = svg_content

    # 2. Add HTTP cache-busting headers to prevent GitHub Camo caching (Commit 50)
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
    }
    return Response(content=svg_content, media_type="image/svg+xml", headers=headers)
