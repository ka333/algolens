import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

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

# Enable CORS for browser extensions and README widgets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins so Chrome extensions can fetch APIs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
