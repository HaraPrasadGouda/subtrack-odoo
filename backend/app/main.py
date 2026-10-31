from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.init_db import setup_database
from backend.app.routers.auth import router as auth_router
from backend.app.routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed admin are created
    setup_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Subscription Management System for Brightloop Software (Odoo Hackathon)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
