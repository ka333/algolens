from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class Problem(Base):
  __tablename__ = 'problems'

  id = Column(Integer, primary_key=True, index=True)
  slug = Column(String, unique=True, index=True, nullable=False)
  difficulty = Column(String, nullable=False)
  total_submissions = Column(Integer, default=0, nullable=False)
  accepted_count = Column(Integer, default=0, nullable=False)
  avg_solve_time = Column(Float, default=0.0, nullable=False)
  avg_attempts = Column(Float, default=0.0, nullable=False)

class SubmissionEvent(Base):
  __tablename__ = 'submission_events'

  id = Column(Integer, primary_key=True, index=True)
  problem_slug = Column(String, index=True, nullable=False)
  solve_time = Column(Integer, nullable=False) # in seconds
  attempts = Column(Integer, nullable=False)
  status = Column(String, nullable=False)       # e.g., 'accepted'
  timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
