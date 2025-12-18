"""Influencer API endpoints"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_optional
from app.core.exceptions import (
    InfluencerNotFoundError,
    InstagramAccountNotFoundError,
    InstagramError,
)
from app.models.user import User
from app.schemas.influencer import (
    InfluencerResponse,
    InfluencerSearchRequest,
    InfluencerSearchResponse,
    InfluencerSyncRequest,
    InfluencerSyncResponse,
    TrustAnalysis,
    EngagementMetrics,
)
from app.services.influencer_service import InfluencerService
from app.integrations.instagram.services.user_service import InstagramUserService

router = APIRouter(prefix="/influencers", tags=["influencers"])


@router.get("", response_model=InfluencerSearchResponse)
async def search_influencers(
    platform: Optional[str] = Query(default=None, description="Platform: instagram, tiktok, youtube, naver_blog"),
    min_followers: int = Query(default=1000, ge=0),
    max_followers: Optional[int] = Query(default=None, ge=0),
    categories: Optional[str] = Query(default=None, description="Comma-separated categories"),
    min_engagement_rate: Optional[float] = Query(default=None, ge=0, le=100),
    max_engagement_rate: Optional[float] = Query(default=None, ge=0, le=100),
    min_trust_score: Optional[float] = Query(default=None, ge=0, le=100),
    min_influence_score: Optional[float] = Query(default=None, ge=0),
    verified_only: bool = Query(default=False),
    gender: Optional[str] = Query(default=None, description="Gender filter"),
    max_ad_rate: Optional[int] = Query(default=None, ge=0),
    username_query: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(default="follower_count", description="Sort field"),
    sort_order: Optional[str] = Query(default="desc", description="asc or desc"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Search for influencers with filters.

    - **platform**: Platform filter (instagram, tiktok, youtube, naver_blog)
    - **min_followers**: Minimum follower count (default: 1000)
    - **max_followers**: Maximum follower count
    - **categories**: Comma-separated list of categories
    - **min_engagement_rate**: Minimum engagement rate (0-100)
    - **max_engagement_rate**: Maximum engagement rate (0-100)
    - **min_trust_score**: Minimum trust score (0-100)
    - **min_influence_score**: Minimum influence score
    - **verified_only**: Only show verified accounts
    - **gender**: Gender filter
    - **max_ad_rate**: Maximum ad rate
    - **username_query**: Search by username or name
    - **sort_by**: Sort field (follower_count, engagement_rate, influence_score)
    - **sort_order**: Sort order (asc, desc)
    """
    # Parse categories
    category_list = None
    if categories:
        category_list = [c.strip() for c in categories.split(",")]

    request = InfluencerSearchRequest(
        platform=platform,
        min_followers=min_followers,
        max_followers=max_followers,
        categories=category_list,
        min_engagement_rate=min_engagement_rate,
        max_engagement_rate=max_engagement_rate,
        min_trust_score=min_trust_score,
        min_influence_score=min_influence_score,
        verified_only=verified_only,
        gender=gender,
        max_ad_rate=max_ad_rate,
        username_query=username_query,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

    service = InfluencerService(db)
    return await service.search(request)


@router.get("/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(
    influencer_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get influencer by ID"""
    service = InfluencerService(db)
    influencer = await service.get_by_id(influencer_id)

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer not found",
        )

    return service._to_response(influencer)


@router.post("/sync", response_model=InfluencerSyncResponse)
async def sync_influencer(
    request: InfluencerSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Sync influencer data from Instagram.

    Fetches the latest profile data, engagement metrics, and trust analysis.
    Creates a new record if the influencer doesn't exist, or updates existing.
    """
    service = InfluencerService(db)

    try:
        influencer = await service.sync_from_instagram(request.username)
        return InfluencerSyncResponse(
            influencer=service._to_response(influencer),
            synced=True,
            message=f"Successfully synced @{request.username}",
        )
    except InstagramAccountNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instagram account not found: @{request.username}",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


@router.get("/by-username/{username}", response_model=InfluencerResponse)
async def get_influencer_by_username(
    username: str,
    sync_if_missing: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
):
    """
    Get influencer by Instagram username.

    If sync_if_missing is True (default), will fetch from Instagram if not in database.
    """
    service = InfluencerService(db)

    if sync_if_missing:
        try:
            influencer = await service.get_or_sync(username)
        except InstagramAccountNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instagram account not found: @{username}",
            )
        except InstagramError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Instagram API error: {e.message}",
            )
    else:
        influencer = await service.get_by_username(username)
        if not influencer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Influencer not found: @{username}",
            )

    return service._to_response(influencer)


@router.get("/analyze/{username}/engagement", response_model=EngagementMetrics)
async def analyze_engagement(
    username: str,
    posts_to_analyze: int = Query(default=12, ge=1, le=50),
):
    """
    Analyze engagement rate for an Instagram account.

    Returns average likes, comments, and calculated engagement rate.
    """
    instagram_service = InstagramUserService()

    try:
        result = await instagram_service.calculate_engagement_rate(
            username,
            posts_to_analyze,
        )
        return EngagementMetrics(
            avg_likes=result.avg_likes,
            avg_comments=result.avg_comments,
            engagement_rate=result.engagement_rate,
            posts_analyzed=result.posts_analyzed,
        )
    except InstagramAccountNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instagram account not found: @{username}",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


@router.get("/analyze/{username}/trust", response_model=TrustAnalysis)
async def analyze_trust(
    username: str,
    sample_followers: int = Query(default=50, ge=10, le=200),
):
    """
    Analyze trust/authenticity of an Instagram account.

    Returns trust score, engagement analysis, and suspicious factors.
    """
    instagram_service = InstagramUserService()

    try:
        result = await instagram_service.analyze_trust(username, sample_followers)
        return TrustAnalysis(
            trust_score=result.trust_score,
            trust_level=result.trust_level,
            engagement_rate=result.engagement_score,
            follower_quality_score=result.follower_quality_score,
            factors=result.factors,
        )
    except InstagramAccountNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instagram account not found: @{username}",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )
