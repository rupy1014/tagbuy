"""Health check endpoints"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.api.deps import get_db
from app.integrations.instagram.client_pool import get_instagram_pool

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}


@router.get("/health/db")
async def health_check_db(db: AsyncSession = Depends(get_db)):
    """Database health check"""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "error": str(e)}


@router.get("/health/instagram")
async def health_check_instagram():
    """Instagram client pool health check"""
    try:
        pool = await get_instagram_pool()
        status = pool.get_pool_status()
        return {
            "status": "healthy" if status["available_clients"] > 0 else "degraded",
            "instagram": status,
        }
    except Exception as e:
        return {"status": "unhealthy", "instagram": "error", "error": str(e)}
