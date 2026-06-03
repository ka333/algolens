from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models import Problem, SubmissionEvent

# Fetch problem aggregates (Commit 39)
async def get_problem_aggregates(db: AsyncSession, slug: str):
    query = select(Problem).filter(Problem.slug == slug)
    res = await db.execute(query)
    return res.scalar_one_or_none()

# Calculate percentile ranking based on time-distribution (Commit 40)
async def calculate_solve_time_percentile(db: AsyncSession, slug: str, user_time: int) -> float:
    # 1. Count total accepted events for this problem slug
    total_query = select(func.count(SubmissionEvent.id)).filter(
        SubmissionEvent.problem_slug == slug,
        SubmissionEvent.status == 'accepted'
    )
    total_res = await db.execute(total_query)
    total_count = total_res.scalar() or 0

    if total_count == 0:
        return 50.0 # Default median if no data

    # 2. Count submission events that were slower or equal (meaning the user was faster than them)
    slower_query = select(func.count(SubmissionEvent.id)).filter(
        SubmissionEvent.problem_slug == slug,
        SubmissionEvent.status == 'accepted',
        SubmissionEvent.solve_time >= user_time
    )
    slower_res = await db.execute(slower_query)
    slower_count = slower_res.scalar() or 0

    # Percentile: user is faster than X% of other solvers
    percentile = (slower_count / total_count) * 100
    return round(percentile, 1)
