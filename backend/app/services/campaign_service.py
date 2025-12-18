"""Campaign service - business logic for campaign operations"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import CampaignStatus, PaymentStatus
from app.models.campaign import Campaign, CampaignInfluencer
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
)

logger = logging.getLogger(__name__)

# Fee constants
ESCROW_FEE_RATE = Decimal("0.005")  # 0.5%
PG_FEE_RATE = Decimal("0.033")  # 3.3% (typical card fee)


class CampaignService:
    """
    Service for campaign operations.

    Handles:
    - Campaign CRUD operations
    - Campaign status management
    - Influencer selection and participation
    - Fee calculations
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== CRUD Operations ====================

    async def create(
        self,
        advertiser_id: UUID,
        data: CampaignCreate,
    ) -> Campaign:
        """
        Create a new campaign.

        Args:
            advertiser_id: ID of the advertiser creating the campaign
            data: Campaign creation data

        Returns:
            Created campaign
        """
        # Calculate fees
        escrow_fee = data.budget * ESCROW_FEE_RATE
        pg_fee = data.budget * PG_FEE_RATE

        campaign = Campaign(
            advertiser_id=advertiser_id,
            title=data.title,
            description=data.description,
            guidelines=data.guidelines,
            budget=data.budget,
            per_influencer_budget=data.per_influencer_budget,
            escrow_fee=escrow_fee,
            pg_fee=pg_fee,
            pg_fee_payer=data.pg_fee_payer,
            status=CampaignStatus.DRAFT,
            target_follower_min=data.target_follower_min,
            target_follower_max=data.target_follower_max,
            target_categories=data.target_categories,
            target_locations=data.target_locations,
            min_engagement_rate=data.min_engagement_rate,
            max_influencers=data.max_influencers,
            selected_influencers=0,
            required_hashtags=data.required_hashtags,
            required_mentions=data.required_mentions,
            content_type=data.content_type,
            settlement_days=data.settlement_days,
            start_date=data.start_date,
            end_date=data.end_date,
            application_deadline=data.application_deadline,
        )

        self.db.add(campaign)
        await self.db.flush()
        await self.db.refresh(campaign)

        logger.info(f"Created campaign: {campaign.id} by advertiser: {advertiser_id}")
        return campaign

    async def get_by_id(
        self,
        campaign_id: UUID,
        include_participants: bool = False,
    ) -> Optional[Campaign]:
        """Get campaign by ID"""
        query = select(Campaign).where(Campaign.id == campaign_id)

        if include_participants:
            query = query.options(
                selectinload(Campaign.influencer_participations)
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update(
        self,
        campaign: Campaign,
        data: CampaignUpdate,
    ) -> Campaign:
        """
        Update a campaign.

        Args:
            campaign: Campaign to update
            data: Update data

        Returns:
            Updated campaign
        """
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(campaign, field):
                setattr(campaign, field, value)

        campaign.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(campaign)

        logger.info(f"Updated campaign: {campaign.id}")
        return campaign

    async def delete(self, campaign: Campaign) -> bool:
        """
        Delete a campaign (soft delete by changing status to cancelled).

        Args:
            campaign: Campaign to delete

        Returns:
            True if deleted
        """
        campaign.status = CampaignStatus.CANCELLED
        campaign.updated_at = datetime.utcnow()
        await self.db.flush()

        logger.info(f"Cancelled campaign: {campaign.id}")
        return True

    # ==================== List & Search ====================

    async def list_campaigns(
        self,
        advertiser_id: Optional[UUID] = None,
        status: Optional[CampaignStatus] = None,
        category: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[Campaign], int]:
        """
        List campaigns with filters.

        Args:
            advertiser_id: Filter by advertiser
            status: Filter by status
            category: Filter by category
            limit: Number of results
            offset: Offset for pagination
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)

        Returns:
            Tuple of (campaigns, total_count)
        """
        query = select(Campaign)
        count_query = select(func.count(Campaign.id))
        conditions = []

        # Apply filters
        if advertiser_id:
            conditions.append(Campaign.advertiser_id == advertiser_id)

        if status:
            conditions.append(Campaign.status == status)

        if category:
            conditions.append(Campaign.target_categories.contains([category]))

        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(Campaign, sort_by, Campaign.created_at)
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Apply pagination
        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        campaigns = list(result.scalars().all())

        return campaigns, total

    async def list_available_campaigns(
        self,
        category: Optional[str] = None,
        min_budget: Optional[Decimal] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Campaign], int]:
        """
        List campaigns available for influencers to apply.

        Args:
            category: Filter by category
            min_budget: Minimum per-influencer budget
            limit: Number of results
            offset: Offset for pagination

        Returns:
            Tuple of (campaigns, total_count)
        """
        query = select(Campaign)
        count_query = select(func.count(Campaign.id))

        # Only show active campaigns that are accepting applications
        conditions = [
            Campaign.status == CampaignStatus.ACTIVE,
            or_(
                Campaign.application_deadline.is_(None),
                Campaign.application_deadline > datetime.utcnow(),
            ),
            Campaign.selected_influencers < Campaign.max_influencers,
        ]

        if category:
            conditions.append(Campaign.target_categories.contains([category]))

        if min_budget:
            conditions.append(Campaign.per_influencer_budget >= min_budget)

        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Sort by deadline (soonest first), then by budget
        query = query.order_by(
            asc(Campaign.application_deadline),
            desc(Campaign.per_influencer_budget),
        )

        # Apply pagination
        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        campaigns = list(result.scalars().all())

        return campaigns, total

    # ==================== Status Management ====================

    async def publish(self, campaign: Campaign) -> Campaign:
        """
        Publish a campaign (change status from DRAFT to ACTIVE).

        Args:
            campaign: Campaign to publish

        Returns:
            Updated campaign
        """
        if campaign.status != CampaignStatus.DRAFT:
            raise ValueError(f"Cannot publish campaign with status: {campaign.status}")

        campaign.status = CampaignStatus.ACTIVE
        campaign.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(campaign)

        logger.info(f"Published campaign: {campaign.id}")
        return campaign

    async def close(self, campaign: Campaign) -> Campaign:
        """
        Close a campaign (stop accepting applications).

        Args:
            campaign: Campaign to close

        Returns:
            Updated campaign
        """
        if campaign.status not in [CampaignStatus.ACTIVE, CampaignStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot close campaign with status: {campaign.status}")

        campaign.status = CampaignStatus.COMPLETED
        campaign.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(campaign)

        logger.info(f"Closed campaign: {campaign.id}")
        return campaign

    async def start_progress(self, campaign: Campaign) -> Campaign:
        """
        Mark campaign as in progress (content creation started).

        Args:
            campaign: Campaign to update

        Returns:
            Updated campaign
        """
        if campaign.status != CampaignStatus.ACTIVE:
            raise ValueError(f"Cannot start progress for campaign with status: {campaign.status}")

        campaign.status = CampaignStatus.IN_PROGRESS
        campaign.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(campaign)

        logger.info(f"Started progress for campaign: {campaign.id}")
        return campaign

    # ==================== Participant Management ====================

    async def get_participants(
        self,
        campaign_id: UUID,
        is_selected: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CampaignInfluencer], int]:
        """
        Get campaign participants.

        Args:
            campaign_id: Campaign ID
            is_selected: Filter by selection status
            limit: Number of results
            offset: Offset for pagination

        Returns:
            Tuple of (participants, total_count)
        """
        query = select(CampaignInfluencer).where(
            CampaignInfluencer.campaign_id == campaign_id
        )
        count_query = select(func.count(CampaignInfluencer.id)).where(
            CampaignInfluencer.campaign_id == campaign_id
        )

        if is_selected is not None:
            query = query.where(CampaignInfluencer.is_selected == is_selected)
            count_query = count_query.where(CampaignInfluencer.is_selected == is_selected)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(desc(CampaignInfluencer.applied_at))
        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        participants = list(result.scalars().all())

        return participants, total

    async def apply_to_campaign(
        self,
        campaign_id: UUID,
        influencer_id: UUID,
        message: Optional[str] = None,
    ) -> CampaignInfluencer:
        """
        Apply to a campaign as an influencer.

        Args:
            campaign_id: Campaign to apply to
            influencer_id: Influencer applying
            message: Application message

        Returns:
            Created participation record
        """
        # Check if already applied
        existing = await self.db.execute(
            select(CampaignInfluencer).where(
                and_(
                    CampaignInfluencer.campaign_id == campaign_id,
                    CampaignInfluencer.influencer_id == influencer_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already applied to this campaign")

        participation = CampaignInfluencer(
            campaign_id=campaign_id,
            influencer_id=influencer_id,
            application_message=message,
            is_selected=False,
        )

        self.db.add(participation)
        await self.db.flush()
        await self.db.refresh(participation)

        logger.info(f"Influencer {influencer_id} applied to campaign {campaign_id}")
        return participation

    async def select_influencer(
        self,
        campaign: Campaign,
        participation: CampaignInfluencer,
        agreed_amount: Optional[Decimal] = None,
    ) -> CampaignInfluencer:
        """
        Select an influencer for a campaign.

        Args:
            campaign: Campaign
            participation: Participation record to update
            agreed_amount: Agreed payment amount

        Returns:
            Updated participation record
        """
        if participation.is_selected:
            raise ValueError("Influencer already selected")

        if campaign.selected_influencers >= campaign.max_influencers:
            raise ValueError("Campaign has reached maximum influencers")

        participation.is_selected = True
        participation.selected_at = datetime.utcnow()
        participation.agreed_amount = agreed_amount or campaign.per_influencer_budget
        participation.payment_status = PaymentStatus.PENDING

        # Update campaign count
        campaign.selected_influencers += 1

        await self.db.flush()
        await self.db.refresh(participation)

        logger.info(f"Selected influencer {participation.influencer_id} for campaign {campaign.id}")
        return participation

    async def reject_influencer(
        self,
        participation: CampaignInfluencer,
        reason: Optional[str] = None,
    ) -> CampaignInfluencer:
        """
        Reject an influencer's application.

        Args:
            participation: Participation record to update
            reason: Rejection reason

        Returns:
            Updated participation record
        """
        participation.is_selected = False
        participation.rejection_reason = reason
        participation.updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(participation)

        logger.info(f"Rejected influencer {participation.influencer_id}")
        return participation

    async def get_participation(
        self,
        campaign_id: UUID,
        influencer_id: UUID,
    ) -> Optional[CampaignInfluencer]:
        """Get a specific participation record"""
        result = await self.db.execute(
            select(CampaignInfluencer).where(
                and_(
                    CampaignInfluencer.campaign_id == campaign_id,
                    CampaignInfluencer.influencer_id == influencer_id,
                )
            )
        )
        return result.scalar_one_or_none()

    # ==================== Statistics ====================

    async def get_campaign_stats(self, campaign_id: UUID) -> dict:
        """
        Get statistics for a campaign.

        Args:
            campaign_id: Campaign ID

        Returns:
            Dictionary with campaign statistics
        """
        # Get participant counts
        total_applicants = await self.db.execute(
            select(func.count(CampaignInfluencer.id)).where(
                CampaignInfluencer.campaign_id == campaign_id
            )
        )

        selected_count = await self.db.execute(
            select(func.count(CampaignInfluencer.id)).where(
                and_(
                    CampaignInfluencer.campaign_id == campaign_id,
                    CampaignInfluencer.is_selected == True,
                )
            )
        )

        return {
            "total_applicants": total_applicants.scalar() or 0,
            "selected_influencers": selected_count.scalar() or 0,
        }
