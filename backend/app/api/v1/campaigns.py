"""Campaign API endpoints"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.constants import CampaignStatus
from app.models.user import User
from app.services.campaign_service import CampaignService
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignListResponse,
    CampaignApplicationCreate,
    CampaignParticipantResponse,
    CampaignParticipantListResponse,
    SelectInfluencerRequest,
    RejectInfluencerRequest,
    CampaignStatsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/campaigns", tags=["campaigns"])


# ==================== Campaign CRUD ====================

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new campaign.

    Requires authentication as an advertiser.
    """
    if current_user.user_type != "advertiser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only advertisers can create campaigns",
        )

    service = CampaignService(db)
    campaign = await service.create(
        advertiser_id=current_user.id,
        data=data,
    )

    return CampaignResponse.model_validate(campaign)


@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    status: Optional[CampaignStatus] = Query(default=None, description="Filter by status"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="created_at", description="Sort field"),
    sort_order: str = Query(default="desc", description="Sort order (asc/desc)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List campaigns.

    - Advertisers see their own campaigns
    - Influencers see available campaigns they can apply to
    - Admins see all campaigns
    """
    service = CampaignService(db)

    if current_user.user_type == "advertiser":
        # Advertisers see their own campaigns
        campaigns, total = await service.list_campaigns(
            advertiser_id=current_user.id,
            status=status,
            category=category,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    elif current_user.user_type == "influencer":
        # Influencers see available campaigns
        campaigns, total = await service.list_available_campaigns(
            category=category,
            limit=limit,
            offset=offset,
        )
    else:
        # Admins see all campaigns
        campaigns, total = await service.list_campaigns(
            status=status,
            category=category,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    return CampaignListResponse(
        campaigns=[CampaignResponse.model_validate(c) for c in campaigns],
        total=total,
        limit=limit,
        offset=offset,
    )


# ==================== My Applications (Influencer) ====================
# NOTE: This route MUST be before /{campaign_id} routes to avoid "me" being parsed as UUID

@router.get("/me/applications", response_model=CampaignParticipantListResponse)
async def get_my_applications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get my campaign applications (for influencers).
    """
    if current_user.user_type != "influencer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only influencers have applications",
        )

    # Get influencer record by instagram_username
    from sqlalchemy import select, func, desc
    from app.models.influencer import Influencer
    from app.models.campaign import CampaignInfluencer

    if not current_user.instagram_username:
        return CampaignParticipantListResponse(
            participants=[],
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
        return CampaignParticipantListResponse(
            participants=[],
            total=0,
            limit=limit,
            offset=offset,
        )

    # Get applications
    query = select(CampaignInfluencer).where(
        CampaignInfluencer.influencer_id == influencer.id
    )
    count_query = select(func.count(CampaignInfluencer.id)).where(
        CampaignInfluencer.influencer_id == influencer.id
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(CampaignInfluencer.applied_at))
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    applications = list(result.scalars().all())

    return CampaignParticipantListResponse(
        participants=[CampaignParticipantResponse.model_validate(a) for a in applications],
        total=total,
        limit=limit,
        offset=offset,
    )


# ==================== Campaign Detail Operations ====================

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign details.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Check access permissions
    if current_user.user_type == "advertiser" and campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this campaign",
        )

    return CampaignResponse.model_validate(campaign)


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a campaign.

    Only the campaign owner (advertiser) can update.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can update",
        )

    updated = await service.update(campaign, data)
    return CampaignResponse.model_validate(updated)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete (cancel) a campaign.

    Only the campaign owner can delete.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can delete",
        )

    await service.delete(campaign)
    return None


# ==================== Campaign Status ====================

@router.post("/{campaign_id}/publish", response_model=CampaignResponse)
async def publish_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Publish a campaign (change from DRAFT to ACTIVE).
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can publish",
        )

    try:
        published = await service.publish(campaign)
        return CampaignResponse.model_validate(published)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{campaign_id}/close", response_model=CampaignResponse)
async def close_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Close a campaign (stop accepting applications).
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can close",
        )

    try:
        closed = await service.close(campaign)
        return CampaignResponse.model_validate(closed)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ==================== Campaign Statistics ====================

@router.get("/{campaign_id}/stats", response_model=CampaignStatsResponse)
async def get_campaign_stats(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign statistics.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Only owner or admin can see stats
    if campaign.advertiser_id != current_user.id and current_user.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    stats = await service.get_campaign_stats(campaign_id)
    return CampaignStatsResponse(**stats)


# ==================== Participant Management ====================

@router.get("/{campaign_id}/participants", response_model=CampaignParticipantListResponse)
async def list_participants(
    campaign_id: UUID,
    is_selected: Optional[bool] = Query(default=None, description="Filter by selection status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List campaign participants (applicants).

    Only campaign owner or admin can see participants.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id and current_user.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    participants, total = await service.get_participants(
        campaign_id=campaign_id,
        is_selected=is_selected,
        limit=limit,
        offset=offset,
    )

    return CampaignParticipantListResponse(
        participants=[CampaignParticipantResponse.model_validate(p) for p in participants],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/{campaign_id}/apply", response_model=CampaignParticipantResponse)
async def apply_to_campaign(
    campaign_id: UUID,
    data: CampaignApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Apply to a campaign as an influencer.
    """
    if current_user.user_type != "influencer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only influencers can apply to campaigns",
        )

    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status != CampaignStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign is not accepting applications",
        )

    # Get influencer record by instagram_username from user
    from sqlalchemy import select
    from app.models.influencer import Influencer

    if not current_user.instagram_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please link your Instagram account first.",
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

    try:
        participation = await service.apply_to_campaign(
            campaign_id=campaign_id,
            influencer_id=influencer.id,
            message=data.message,
        )
        return CampaignParticipantResponse.model_validate(participation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{campaign_id}/select", response_model=CampaignParticipantResponse)
async def select_influencer(
    campaign_id: UUID,
    data: SelectInfluencerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Select an influencer for the campaign.

    Only campaign owner can select influencers.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can select influencers",
        )

    participation = await service.get_participation(
        campaign_id=campaign_id,
        influencer_id=data.influencer_id,
    )

    if not participation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer has not applied to this campaign",
        )

    try:
        selected = await service.select_influencer(
            campaign=campaign,
            participation=participation,
            agreed_amount=data.agreed_amount,
        )
        return CampaignParticipantResponse.model_validate(selected)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{campaign_id}/reject", response_model=CampaignParticipantResponse)
async def reject_influencer(
    campaign_id: UUID,
    data: RejectInfluencerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject an influencer's application.

    Only campaign owner can reject influencers.
    """
    service = CampaignService(db)
    campaign = await service.get_by_id(campaign_id)

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.advertiser_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only campaign owner can reject influencers",
        )

    participation = await service.get_participation(
        campaign_id=campaign_id,
        influencer_id=data.influencer_id,
    )

    if not participation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer has not applied to this campaign",
        )

    rejected = await service.reject_influencer(
        participation=participation,
        reason=data.reason,
    )
    return CampaignParticipantResponse.model_validate(rejected)
