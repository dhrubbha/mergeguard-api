
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.config import settings
from backend.app.api.github_webhook import router as github_webhook_router
from backend.app.database.connection import engine

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="GitHub Pull Request Monitoring Platform"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

app.include_router(github_webhook_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to MergeGuard API",
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@app.get("/health")
def health_check():
    db_status = "operational"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "operational" else "degraded",
        "database": db_status,
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION
    }
