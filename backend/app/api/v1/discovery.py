"""Discovery/Crawler management API endpoints"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crawler.discovery_service import InfluencerDiscoveryService
from app.crawler.hashtag_config import (
    KOREAN_HASHTAGS,
    get_all_primary_hashtags,
    CATEGORY_PRIORITY,
)

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.get("/stats")
async def get_discovery_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get current discovery statistics.

    Returns counts by tier, category, and recent sync info.
    """
    service = InfluencerDiscoveryService(db)
    return await service.get_discovery_stats()


@router.get("/categories")
async def get_available_categories():
    """
    Get available categories for discovery.

    Returns list of categories with their hashtags and priority.
    """
    categories = []
    for key, config in KOREAN_HASHTAGS.items():
        categories.append({
            "key": key,
            "name": config.category,
            "priority": CATEGORY_PRIORITY.get(key, 0),
            "primary_hashtags": config.primary[:5],
            "total_hashtags": len(config.primary) + len(config.secondary),
        })

    # Sort by priority
    categories.sort(key=lambda x: x["priority"], reverse=True)
    return {"categories": categories}


@router.get("/hashtags")
async def get_hashtags(
    category: Optional[str] = Query(default=None),
):
    """
    Get hashtags for discovery.

    If category is specified, returns hashtags for that category.
    Otherwise returns all primary hashtags.
    """
    if category:
        if category not in KOREAN_HASHTAGS:
            raise HTTPException(status_code=404, detail=f"Category not found: {category}")

        config = KOREAN_HASHTAGS[category]
        return {
            "category": config.category,
            "primary": config.primary,
            "secondary": config.secondary,
            "brand_related": config.brand_related,
        }

    return {
        "all_primary_hashtags": get_all_primary_hashtags(),
        "total_count": len(get_all_primary_hashtags()),
    }


@router.post("/run/hashtag")
async def run_hashtag_discovery(
    hashtag: str = Query(..., description="Hashtag to crawl (without #)"),
    category: str = Query(default="Lifestyle", description="Category to assign"),
    max_users: int = Query(default=30, ge=1, le=100),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Run discovery for a specific hashtag.

    This crawls the top posts from the hashtag and discovers influencers.
    """
    service = InfluencerDiscoveryService(db)

    # Run synchronously for now (small task)
    new_count, updated_count = await service.discover_from_hashtag(
        hashtag=hashtag,
        category=category,
        max_users=max_users,
    )

    return {
        "status": "completed",
        "hashtag": hashtag,
        "category": category,
        "new_influencers": new_count,
        "updated_influencers": updated_count,
    }


@router.post("/run/category")
async def run_category_discovery(
    category: str = Query(..., description="Category key (e.g., 'beauty', 'fashion')"),
    max_hashtags: int = Query(default=3, ge=1, le=10),
    max_users_per_hashtag: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Run discovery for a category.

    Crawls multiple hashtags for the specified category.
    """
    if category not in KOREAN_HASHTAGS:
        raise HTTPException(status_code=404, detail=f"Category not found: {category}")

    service = InfluencerDiscoveryService(db)

    new_count, updated_count = await service.discover_category(
        category=category,
        max_hashtags=max_hashtags,
        max_users_per_hashtag=max_users_per_hashtag,
    )

    return {
        "status": "completed",
        "category": category,
        "new_influencers": new_count,
        "updated_influencers": updated_count,
    }


@router.post("/run/full")
async def run_full_discovery(
    max_categories: int = Query(default=3, ge=1, le=10),
    max_hashtags_per_category: int = Query(default=2, ge=1, le=5),
    max_users_per_hashtag: int = Query(default=15, ge=1, le=30),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Run full discovery across all categories.

    This is a long-running task. For production, use background task queue.
    """
    service = InfluencerDiscoveryService(db)

    # For MVP, run synchronously
    # In production, this should be a background task
    stats = await service.run_full_discovery(
        max_categories=max_categories,
        max_hashtags_per_category=max_hashtags_per_category,
        max_users_per_hashtag=max_users_per_hashtag,
    )

    return {
        "status": "completed",
        "stats": stats,
    }


@router.post("/run/update-stale")
async def run_update_stale(
    max_age_days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Update stale influencer data.

    Refreshes data for influencers that haven't been synced recently.
    """
    service = InfluencerDiscoveryService(db)

    updated_count = await service.update_stale_influencers(
        max_age_days=max_age_days,
        limit=limit,
    )

    return {
        "status": "completed",
        "updated_count": updated_count,
    }
