from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.init_db import setup_database
from backend.app.routers.auth import router as auth_router
from backend.app.routers.users import router as users_router
from backend.app.routers.products import router as products_router
from backend.app.routers.plans import router as plans_router
from backend.app.routers.taxes import router as taxes_router
from backend.app.routers.discounts import router as discounts_router
from backend.app.routers.templates import router as templates_router
from backend.app.routers.customers import router as customers_router
from backend.app.routers.subscriptions import router as subscriptions_router
from backend.app.routers.invoices import router as invoices_router
from backend.app.routers.billing import router as billing_router
from backend.app.routers.dashboard import router as dashboard_router
from backend.app.routers.portal import router as portal_router
from backend.app.routers.dunning import router as dunning_router
from backend.app.routers.analytics import router as analytics_router


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

# Register routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(products_router, prefix=settings.API_V1_STR)
app.include_router(plans_router, prefix=settings.API_V1_STR)
app.include_router(taxes_router, prefix=settings.API_V1_STR)
app.include_router(discounts_router, prefix=settings.API_V1_STR)
app.include_router(templates_router, prefix=settings.API_V1_STR)
app.include_router(customers_router, prefix=settings.API_V1_STR)
app.include_router(subscriptions_router, prefix=settings.API_V1_STR)
app.include_router(invoices_router, prefix=settings.API_V1_STR)
app.include_router(billing_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(portal_router, prefix=settings.API_V1_STR)
app.include_router(dunning_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
