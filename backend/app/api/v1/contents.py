"""Content API endpoints"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
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
    """
    service = ContentService(db)

    try:
        # For now, we'll need to get influencer_id from somewhere
        # In a real implementation, this would come from the authenticated influencer
        # For MVP, we'll use a placeholder approach

        # First verify the content exists
        verification = await service.verify_url(request.post_url)
        if not verification.exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Instagram content not found or not accessible",
            )

        # Note: In production, influencer_id should come from authenticated user
        # For now, this endpoint is a placeholder
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Full submission flow requires influencer authentication",
        )

    except CampaignNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


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
        content = await service.approve_content(content_id, feedback)
        return {
            "status": "approved",
            "content_id": str(content.id),
            "message": "Content approved successfully",
        }
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


@router.post("/{content_id}/reject")
async def reject_content(
    content_id: UUID,
    reason: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject content (advertiser action).

    Marks content as rejected with the provided reason.
    """
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required",
        )

    service = ContentService(db)

    try:
        content = await service.reject_content(content_id, reason)
        return {
            "status": "rejected",
            "content_id": str(content.id),
            "message": "Content rejected",
            "reason": reason,
        }
    except ContentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )


@router.get("/campaign/{campaign_id}", response_model=ContentListResponse)
async def get_campaign_contents(
    campaign_id: UUID,
    status_filter: Optional[ContentStatus] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all contents for a campaign.

    Optionally filter by status.
    """
    service = ContentService(db)

    contents = await service.get_campaign_contents(campaign_id, status_filter)

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
