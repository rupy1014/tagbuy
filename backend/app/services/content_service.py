"""Content service - business logic for campaign content operations"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ContentStatus, MediaType
from app.core.exceptions import ContentNotFoundError, CampaignNotFoundError
from app.models.content import CampaignContent, ContentMetrics, MonitoringLog
from app.models.campaign import Campaign
from app.models.influencer import Influencer
from app.schemas.content import (
    ContentVerifyRequest,
    ContentVerifyResponse,
    ContentStatusResponse,
    ContentMetricsResponse,
    ContentMetricsSnapshot,
    AIAnalysisResult,
)
from app.integrations.instagram.services.media_service import InstagramMediaService
from app.integrations.instagram.services.monitoring_service import ContentMonitoringService

logger = logging.getLogger(__name__)


class ContentService:
    """
    Service for campaign content operations.

    Handles:
    - Content verification
    - Content submission
    - Status monitoring
    - Metrics collection
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._media_service = InstagramMediaService()
        self._monitoring_service = ContentMonitoringService()

    async def get_by_id(self, content_id: UUID) -> Optional[CampaignContent]:
        """Get content by ID"""
        result = await self.db.execute(
            select(CampaignContent).where(CampaignContent.id == content_id)
        )
        return result.scalar_one_or_none()

    async def get_by_media_pk(self, media_pk: str) -> Optional[CampaignContent]:
        """Get content by Instagram media PK"""
        result = await self.db.execute(
            select(CampaignContent).where(CampaignContent.instagram_media_pk == media_pk)
        )
        return result.scalar_one_or_none()

    async def verify_url(self, url: str) -> ContentVerifyResponse:
        """
        Verify an Instagram URL without saving.

        Args:
            url: Instagram post URL

        Returns:
            ContentVerifyResponse with verification details
        """
        verification = await self._media_service.verify_content(url)

        if not verification.exists:
            return ContentVerifyResponse(
                exists=False,
                is_public=False,
                verified_at=datetime.utcnow(),
            )

        # Build response
        metrics = ContentMetricsSnapshot(
            like_count=verification.like_count,
            comment_count=verification.comment_count,
            play_count=verification.play_count,
            taken_at=verification.taken_at,
        )

        return ContentVerifyResponse(
            exists=True,
            is_public=True,
            media_pk=verification.media_pk,
            media_type=verification.media_type,
            metrics=metrics,
            verified_at=datetime.utcnow(),
        )

    async def submit_content(
        self,
        campaign_id: UUID,
        influencer_id: UUID,
        post_url: str,
    ) -> CampaignContent:
        """
        Submit content for a campaign.

        Args:
            campaign_id: Campaign ID
            influencer_id: Influencer ID
            post_url: Instagram post URL

        Returns:
            Created CampaignContent
        """
        # Verify campaign exists
        campaign = await self.db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = campaign.scalar_one_or_none()
        if not campaign:
            raise CampaignNotFoundError(campaign_id)

        # Verify content
        verification = await self._media_service.verify_content(post_url)
        if not verification.exists:
            raise ContentNotFoundError(post_url)

        # Create content record
        content = CampaignContent(
            campaign_id=campaign_id,
            influencer_id=influencer_id,
            instagram_media_pk=verification.media_pk,
            post_url=post_url,
            post_type=verification.media_type,
            status=ContentStatus.PENDING,
            initial_metrics={
                "like_count": verification.like_count,
                "comment_count": verification.comment_count,
                "play_count": verification.play_count,
            },
            posted_at=verification.taken_at,
            submitted_at=datetime.utcnow(),
            settlement_due_date=datetime.utcnow() + timedelta(days=campaign.settlement_days),
        )

        # Analyze hashtags if campaign has requirements
        if campaign.required_hashtags:
            hashtag_analysis = await self._media_service.analyze_hashtags(
                post_url,
                campaign.required_hashtags,
            )
            content.ai_analysis = {
                "hashtags_found": hashtag_analysis.hashtags_found,
                "required_present": hashtag_analysis.required_hashtags_present,
                "required_missing": hashtag_analysis.required_hashtags_missing,
                "hashtag_compliance": hashtag_analysis.compliance_rate,
            }
            content.ai_score = hashtag_analysis.compliance_rate

        self.db.add(content)
        await self.db.commit()
        await self.db.refresh(content)

        # Record initial metrics
        await self._record_metrics(content)

        logger.info(f"Content submitted: {content.id} for campaign {campaign_id}")
        return content

    async def check_status(self, content_id: UUID) -> ContentStatusResponse:
        """
        Check and update content status.

        Args:
            content_id: Content ID

        Returns:
            ContentStatusResponse with current status
        """
        content = await self.get_by_id(content_id)
        if not content:
            raise ContentNotFoundError(content_id)

        # Check with Instagram
        result = await self._monitoring_service.check_content_status(
            content.instagram_media_pk
        )

        # Update status if changed
        old_status = content.status
        if result.status != old_status:
            content.status = result.status
            await self.db.commit()
            await self.db.refresh(content)

            logger.info(f"Content {content_id} status changed: {old_status} -> {result.status}")

        # Log the check
        await self._log_monitoring_check(content, result)

        return ContentStatusResponse(
            id=content.id,
            campaign_id=content.campaign_id,
            influencer_id=content.influencer_id,
            instagram_media_pk=content.instagram_media_pk,
            post_url=content.post_url,
            post_type=content.post_type,
            status=content.status,
            advertiser_approved=content.advertiser_approved,
            advertiser_feedback=content.advertiser_feedback,
            submitted_at=content.submitted_at,
            reviewed_at=content.reviewed_at,
            settlement_due_date=content.settlement_due_date,
            settled_at=content.settled_at,
        )

    async def collect_metrics(self, content_id: UUID) -> ContentMetricsResponse:
        """
        Collect and store current metrics for content.

        Args:
            content_id: Content ID

        Returns:
            ContentMetricsResponse with metrics
        """
        content = await self.get_by_id(content_id)
        if not content:
            raise ContentNotFoundError(content_id)

        # Collect from Instagram
        metrics_snapshot = await self._monitoring_service.collect_metrics(
            content.instagram_media_pk
        )

        # Store metrics
        metrics = ContentMetrics(
            content_id=content_id,
            like_count=metrics_snapshot.like_count,
            comment_count=metrics_snapshot.comment_count,
            play_count=metrics_snapshot.play_count,
        )
        self.db.add(metrics)
        await self.db.commit()

        # Get history
        history_result = await self.db.execute(
            select(ContentMetrics)
            .where(ContentMetrics.content_id == content_id)
            .order_by(ContentMetrics.recorded_at.desc())
            .limit(10)
        )
        history = history_result.scalars().all()

        # Calculate growth if we have history
        growth = None
        if len(history) > 1:
            latest = history[0]
            previous = history[1]
            growth = {
                "likes": latest.like_count - previous.like_count,
                "comments": latest.comment_count - previous.comment_count,
            }

        return ContentMetricsResponse(
            content_id=content_id,
            current=ContentMetricsSnapshot(
                like_count=metrics_snapshot.like_count,
                comment_count=metrics_snapshot.comment_count,
                play_count=metrics_snapshot.play_count,
            ),
            history=[
                {
                    "like_count": m.like_count,
                    "comment_count": m.comment_count,
                    "recorded_at": m.recorded_at.isoformat(),
                }
                for m in history
            ],
            growth=growth,
        )

    async def approve_content(
        self,
        content_id: UUID,
        feedback: Optional[str] = None,
    ) -> CampaignContent:
        """
        Approve content (advertiser action).

        Args:
            content_id: Content ID
            feedback: Optional feedback

        Returns:
            Updated content
        """
        content = await self.get_by_id(content_id)
        if not content:
            raise ContentNotFoundError(content_id)

        content.advertiser_approved = "approved"
        content.advertiser_feedback = feedback
        content.reviewed_at = datetime.utcnow()
        content.status = ContentStatus.APPROVED

        await self.db.commit()
        await self.db.refresh(content)

        logger.info(f"Content {content_id} approved")
        return content

    async def reject_content(
        self,
        content_id: UUID,
        reason: str,
    ) -> CampaignContent:
        """
        Reject content (advertiser action).

        Args:
            content_id: Content ID
            reason: Rejection reason

        Returns:
            Updated content
        """
        content = await self.get_by_id(content_id)
        if not content:
            raise ContentNotFoundError(content_id)

        content.advertiser_approved = "rejected"
        content.advertiser_feedback = reason
        content.reviewed_at = datetime.utcnow()
        content.status = ContentStatus.REJECTED

        await self.db.commit()
        await self.db.refresh(content)

        logger.info(f"Content {content_id} rejected: {reason}")
        return content

    async def get_campaign_contents(
        self,
        campaign_id: UUID,
        status: Optional[ContentStatus] = None,
    ) -> List[CampaignContent]:
        """
        Get all contents for a campaign.

        Args:
            campaign_id: Campaign ID
            status: Optional status filter

        Returns:
            List of CampaignContent
        """
        query = select(CampaignContent).where(
            CampaignContent.campaign_id == campaign_id
        )

        if status:
            query = query.where(CampaignContent.status == status)

        query = query.order_by(CampaignContent.submitted_at.desc())

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_active_contents_for_monitoring(self) -> List[CampaignContent]:
        """
        Get all active contents that need monitoring.

        Returns:
            List of CampaignContent that are active and not yet settled
        """
        result = await self.db.execute(
            select(CampaignContent).where(
                and_(
                    CampaignContent.status == ContentStatus.ACTIVE,
                    CampaignContent.settled_at.is_(None),
                )
            )
        )
        return result.scalars().all()

    async def _record_metrics(self, content: CampaignContent) -> None:
        """Record initial metrics for content"""
        initial = content.initial_metrics or {}
        metrics = ContentMetrics(
            content_id=content.id,
            like_count=initial.get("like_count", 0),
            comment_count=initial.get("comment_count", 0),
            play_count=initial.get("play_count"),
        )
        self.db.add(metrics)
        await self.db.commit()

    async def _log_monitoring_check(self, content: CampaignContent, result) -> None:
        """Log a monitoring check result"""
        log = MonitoringLog(
            content_id=content.id,
            status=result.status,
            check_result={
                "exists": result.exists,
                "is_public": result.is_public,
                "current_likes": result.current_likes,
                "current_comments": result.current_comments,
            },
            error_message=result.error_message,
        )
        self.db.add(log)
        await self.db.commit()
