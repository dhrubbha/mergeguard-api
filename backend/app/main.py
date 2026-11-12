
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.api.github_webhook import router as github_webhook_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="GitHub Pull Request Monitoring Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(github_webhook_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to MergeGuard API",
        "application": settings.APP_NAME
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
