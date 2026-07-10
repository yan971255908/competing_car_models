from fastapi import APIRouter
from app.api.v1.signals import router as signals_router
from app.api.v1.system import router as system_router
from app.api.v1.ai import router as ai_router
from app.api.v1.competitors import router as competitors_router
from app.api.v1.competitor_reviews import router as competitor_reviews_router
from app.api.v1.competitor_ai import router as competitor_ai_router

router = APIRouter()

router.include_router(signals_router, prefix="/intel", tags=["Intelligence"])
router.include_router(system_router, prefix="/admin", tags=["System Control"])
router.include_router(ai_router, prefix="/ai", tags=["AI Strategy"])
router.include_router(competitors_router, prefix="/competitors", tags=["Competitors"])
router.include_router(competitor_reviews_router, prefix="/competitors/reviews", tags=["Competitor Reviews"])
router.include_router(competitor_ai_router, prefix="/competitors/ai", tags=["Competitor AI"])

