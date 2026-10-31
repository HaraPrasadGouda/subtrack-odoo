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

__all__ = [
    "auth_router",
    "users_router",
    "products_router",
    "plans_router",
    "taxes_router",
    "discounts_router",
    "templates_router",
    "customers_router",
    "subscriptions_router",
    "invoices_router",
    "billing_router",
    "dashboard_router",
    "portal_router",
    "dunning_router",
]
