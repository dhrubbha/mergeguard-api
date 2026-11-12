from fastapi import FastAPI
from backend.app.config import settings
from backend.app.api.github_webhook import router as github_webhook_router

app=FastAPI(title=settings.APP_NAME , 
            description="GitHub PR Monitoring and Governance Platform" , 
            version=settings.APP_VERSION)



@app.get("/")
def home():
    return {
        "message":"Welcome to MergeGuard API",
        "application" : settings.APP_NAME,
        "version" : settings.APP_VERSION
    }
@app.get("/health")
def health():
    return {
        "status" : "Healthy",
        "application" : settings.APP_NAME
    }

app.include_router(github_webhook_router)