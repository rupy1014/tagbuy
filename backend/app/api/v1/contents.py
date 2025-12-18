"""Content API endpoints"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.constants import ContentStatus
from app.core.exceptions import (
    ContentNotFoundError,
    CampaignNotFoundError,
    InstagramMediaNotFoundError,
    InstagramError,
)
from app.models.user import User
from app.schemas.content import (
    ContentVerifyRequest,
    ContentVerifyResponse,
    ContentSubmitRequest,
    ContentSubmitResponse,
    ContentStatusResponse,
    ContentMetricsResponse,
    ContentListResponse,
)
from app.services.content_service import ContentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contents", tags=["contents"])


@router.post("/verify", response_model=ContentVerifyResponse)
async def verify_content_url(
    request: ContentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an Instagram post URL.

    Checks if the content exists and is accessible, returns metrics snapshot.
    Does not save anything to the database.
    """
    service = ContentService(db)

    try:
        return await service.verify_url(request.post_url)
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


@router.post("/submit", response_model=ContentSubmitResponse)
async def submit_content(
    request: ContentSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit content for a campaign.

    Verifies the Instagram post and creates a content record for tracking.
    Only selected influencers can submit content for a campaign.
    """
    # Only influencers can submit content
    if current_user.user_type != "influencer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only influencers can submit content",
        )

    # Get influencer record
    from sqlalchemy import select, and_
    from app.models.influencer import Influencer
    from app.models.campaign import Campaign, CampaignInfluencer

    if not current_user.instagram_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please link your Instagram account first",
        )

    result = await db.execute(
        select(Influencer).where(
            Influencer.username == current_user.instagram_username.lower()
        )
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer profile not found. Please verify your Instagram account.",
        )

    # Verify campaign exists
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == request.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Verify influencer is selected for this campaign
    participation_result = await db.execute(
        select(CampaignInfluencer).where(
            and_(
                CampaignInfluencer.campaign_id == request.campaign_id,
                CampaignInfluencer.influencer_id == influencer.id,
                CampaignInfluencer.is_selected == True,
            )
        )
    )
    participation = participation_result.scalar_one_or_none()

    if not participation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be selected for this campaign to submit content",
        )

    service = ContentService(db)

    try:
        # First verify the content exists
        verification = await service.verify_url(request.post_url)
        if not verification.exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Instagram content not found or not accessible",
            )

        # Check for duplicate submission
        existing_content = await service.get_by_media_pk(verification.media_pk)
        if existing_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This content has already been submitted",
            )

        # Submit content
        content = await service.submit_content(
            campaign_id=request.campaign_id,
            influencer_id=influencer.id,
            post_url=request.post_url,
        )

        return ContentSubmitResponse(
            content_id=content.id,
            status=content.status,
            verification=verification,
            settlement_due_date=content.settlement_due_date,
        )

    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instagram content not found or not accessible",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


# ==================== My Contents (Influencer) ====================
# NOTE: These routes MUST be before /{content_id} to avoid path conflicts

@router.get("/me", response_model=ContentListResponse)
async def get_my_contents(
    status_filter: Optional[ContentStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get my submitted contents (for influencers).
    """
    if current_user.user_type != "influencer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only influencers can view their contents",
        )

    from sqlalchemy import select, func
    from app.models.influencer import Influencer
    from app.models.content import CampaignContent

    if not current_user.instagram_username:
        return ContentListResponse(
            contents=[],
            total=0,
            limit=limit,
            offset=offset,
        )

    result = await db.execute(
        select(Influencer).where(
            Influencer.username == current_user.instagram_username.lower()
        )
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        return ContentListResponse(
            contents=[],
            total=0,
            limit=limit,
            offset=offset,
        )

    # Build query
    query = select(CampaignContent).where(
        CampaignContent.influencer_id == influencer.id
    )
    count_query = select(func.count(CampaignContent.id)).where(
        CampaignContent.influencer_id == influencer.id
    )

    if status_filter:
        query = query.where(CampaignContent.status == status_filter)
        count_query = count_query.where(CampaignContent.status == status_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(CampaignContent.submitted_at.desc())
    query = query.offset(offset).limit(limit)

    contents_result = await db.execute(query)
    contents = list(contents_result.scalars().all())

    return ContentListResponse(
        contents=[
            ContentStatusResponse(
                id=c.id,
                campaign_id=c.campaign_id,
                influencer_id=c.influencer_id,
                instagram_media_pk=c.instagram_media_pk,
                post_url=c.post_url,
                post_type=c.post_type,
                status=c.status,
                advertiser_approved=c.advertiser_approved,
                advertiser_feedback=c.advertiser_feedback,
                submitted_at=c.submitted_at,
                reviewed_at=c.reviewed_at,
                settlement_due_date=c.settlement_due_date,
                settled_at=c.settled_at,
            )
            for c in contents
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/campaign/{campaign_id}", response_model=ContentListResponse)
async def get_campaign_contents(
    campaign_id: UUID,
    status_filter: Optional[ContentStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all contents for a campaign.

    - Advertisers can see contents for their own campaigns
    - Influencers can see their own contents for any campaign
    - Admins can see all contents
    """
    from sqlalchemy import select
    from app.models.campaign import Campaign
    from app.models.influencer import Influencer

    # Verify campaign exists and check permissions
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Permission check
    influencer_filter = None

    if current_user.user_type == "advertiser":
        if campaign.advertiser_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view contents for your own campaigns",
            )
    elif current_user.user_type == "influencer":
        # Influencers can only see their own contents
        if not current_user.instagram_username:
            return ContentListResponse(
                contents=[],
                total=0,
                limit=limit,
                offset=offset,
            )

        result = await db.execute(
            select(Influencer).where(
                Influencer.username == current_user.instagram_username.lower()
            )
        )
        influencer = result.scalar_one_or_none()

        # Filter by influencer_id will be applied below
        influencer_filter = influencer.id if influencer else None
    # Admins can see all

    service = ContentService(db)
    contents = await service.get_campaign_contents(campaign_id, status_filter)

    # For influencers, filter to only their contents
    if current_user.user_type == "influencer" and influencer_filter:
        contents = [c for c in contents if c.influencer_id == influencer_filter]

    # Manual pagination (should be in query for production)
    total = len(contents)
    paginated = contents[offset:offset + limit]

    return ContentListResponse(
        contents=[
            ContentStatusResponse(
                id=c.id,
                campaign_id=c.campaign_id,
                influencer_id=c.influencer_id,
                instagram_media_pk=c.instagram_media_pk,
                post_url=c.post_url,
                post_type=c.post_type,
                status=c.status,
                advertiser_approved=c.advertiser_approved,
                advertiser_feedback=c.advertiser_feedback,
                submitted_at=c.submitted_at,
                reviewed_at=c.reviewed_at,
                settlement_due_date=c.settlement_due_date,
                settled_at=c.settled_at,
            )
            for c in paginated
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


# ==================== Content Detail Operations ====================

@router.get("/{content_id}", response_model=ContentStatusResponse)
async def get_content_status(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get content status by ID"""
    service = ContentService(db)

    try:
        return await service.check_status(content_id)
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


@router.get("/{content_id}/metrics", response_model=ContentMetricsResponse)
async def get_content_metrics(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get content metrics with history.

    Returns current metrics and historical data for tracking growth.
    """
    service = ContentService(db)

    try:
        return await service.collect_metrics(content_id)
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


@router.post("/{content_id}/approve")
async def approve_content(
    content_id: UUID,
    feedback: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve content (advertiser action).

    Marks content as approved and triggers settlement process.
    """
    service = ContentService(db)

    try:
        content = await service.get_by_id(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found",
            )

        # Verify the current user is the campaign advertiser
        from sqlalchemy import select
        from app.models.campaign import Campaign

        campaign_result = await db.execute(
            select(Campaign).where(Campaign.id == content.campaign_id)
        )
        campaign = campaign_result.scalar_one_or_none()

        if not campaign or campaign.advertiser_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the campaign advertiser can approve content",
            )

        approved_content = await service.approve_content(content_id, feedback)
        return {
            "status": "approved",
            "content_id": str(approved_content.id),
            "message": "Content approved successfully",
        }
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


class ContentRejectRequest(BaseModel):
    """Content rejection request"""
    reason: str = Field(..., min_length=1, max_length=500)


@router.post("/{content_id}/reject")
async def reject_content(
    content_id: UUID,
    request: ContentRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject content (advertiser action).

    Marks content as rejected with the provided reason.
    """
    service = ContentService(db)

    try:
        content = await service.get_by_id(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found",
            )

        # Verify the current user is the campaign advertiser
        from sqlalchemy import select
        from app.models.campaign import Campaign

        campaign_result = await db.execute(
            select(Campaign).where(Campaign.id == content.campaign_id)
        )
        campaign = campaign_result.scalar_one_or_none()

        if not campaign or campaign.advertiser_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the campaign advertiser can reject content",
            )

        rejected_content = await service.reject_content(content_id, request.reason)
        return {
            "status": "rejected",
            "content_id": str(rejected_content.id),
            "message": "Content rejected",
            "reason": request.reason,
        }
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
