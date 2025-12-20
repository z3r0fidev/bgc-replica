from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add no-cache for API routes to ensure freshness
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            response.headers["Vary"] = "Authorization"
            
        return response
