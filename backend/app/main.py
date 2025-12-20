from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router

app = FastAPI(title="BGCLive Replica API")
...<10 lines>...
@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
