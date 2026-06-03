import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
# Import models to ensure they are registered on Base metadata
from app.db.models import Problem, SubmissionEvent
from app.api.endpoints import router as api_router

# Setup logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("algolens")

app = FastAPI(
    title="AlgoLens Telemetry API",
    description="Privacy-preserving global solve benchmarking server",
    version="0.1.0"
)

app.include_router(api_router)

# Enable CORS for browser extensions and README widgets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup lifecycle trigger to initialize PostgreSQL tables & indices (Commit 35)
@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables and indices ready.")

# Route logger middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {duration:.4f}s"
    )
    return response

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "AlgoLens Telemetry API",
        "version": "0.1.0"
    }
