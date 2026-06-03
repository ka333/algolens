from fastapi import Request, HTTPException, status
import time
from typing import Dict, List

# Sliding window in-memory rate limiter
# Key: client IP, Value: list of call timestamps
request_history: Dict[str, List[float]] = {}

# Limit: Max 60 requests per 60 seconds
RATE_LIMIT_WINDOW = 60 
MAX_REQUESTS = 60

async def rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in request_history:
        request_history[client_ip] = []
        
    # Purge timestamps outside of current window
    request_history[client_ip] = [t for t in request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    if len(request_history[client_ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later."
        )
        
    request_history[client_ip].append(now)
