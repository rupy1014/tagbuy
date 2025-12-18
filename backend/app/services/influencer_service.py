"""Influencer service - business logic for influencer operations (Multi-platform)"""
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import InfluencerTier
from app.core.exceptions import InfluencerNotFoundError
from app.models.influencer import Influencer
from app.schemas.influencer import (
    InfluencerResponse,
    InfluencerSearchRequest,
    InfluencerSearchResponse,
    InfluencerBriefResponse,
)

logger = logging.getLogger(__name__)


class InfluencerService:
    """
    Service for influencer operations.

    Handles:
    - Multi-platform influencer data management
    - Influencer search and filtering
    - Engagement analysis
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, influencer_id: UUID) -> Optional[Influencer]:
        """Get influencer by ID"""
        result = await self.db.execute(
            select(Influencer).where(Influencer.id == influencer_id)
        )
        return result.scalar_one_or_none()

    async def get_by_username(
        self, username: str, platform: Optional[str] = None
    ) -> Optional[Influencer]:
        """Get influencer by username, optionally filtered by platform"""
        query = select(Influencer).where(Influencer.username == username.lower())
        if platform:
            query = query.where(Influencer.platform == platform)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_platform_uid(
        self, platform: str, platform_uid: str
    ) -> Optional[Influencer]:
        """Get influencer by platform and platform-specific UID"""
        result = await self.db.execute(
            select(Influencer).where(
                and_(
                    Influencer.platform == platform,
                    Influencer.platform_uid == platform_uid,
                )
            )
        )
        return result.scalar_one_or_none()

    async def search(
        self,
        request: InfluencerSearchRequest,
    ) -> InfluencerSearchResponse:
        """
        Search for influencers with filters.

        Args:
            request: Search request with filters

        Returns:
            InfluencerSearchResponse with matching influencers
        """
        query = select(Influencer)
        conditions = []

        # Platform filter
        if request.platform:
            conditions.append(Influencer.platform == request.platform)

        # Follower count range
        if request.min_followers:
            conditions.append(Influencer.follower_count >= request.min_followers)
        if request.max_followers:
            conditions.append(Influencer.follower_count <= request.max_followers)

        # Categories filter (array overlap)
        if request.categories:
            # PostgreSQL array overlap using &&
            conditions.append(Influencer.categories.overlap(request.categories))

        # Engagement rate
        if request.min_engagement_rate:
            conditions.append(Influencer.engagement_rate >= request.min_engagement_rate)
        if request.max_engagement_rate:
            conditions.append(Influencer.engagement_rate <= request.max_engagement_rate)

        # Trust score
        if request.min_trust_score:
            conditions.append(Influencer.trust_score >= request.min_trust_score)

        # Influence score
        if request.min_influence_score:
            conditions.append(Influencer.influence_score >= request.min_influence_score)

        # Tiers
        if request.tiers:
            tier_values = [t.value for t in request.tiers]
            conditions.append(Influencer.tier.in_(tier_values))

        # Verified only
        if request.verified_only:
            conditions.append(Influencer.is_verified == True)

        # Gender filter
        if request.gender:
            conditions.append(Influencer.gender == request.gender)

        # Ad rate filter
        if request.max_ad_rate:
            conditions.append(Influencer.ad_rate <= request.max_ad_rate)

        # Username search
        if request.username_query:
            conditions.append(
                or_(
                    Influencer.username.ilike(f"%{request.username_query}%"),
                    Influencer.full_name.ilike(f"%{request.username_query}%"),
                )
            )

        # Apply conditions
        if conditions:
            query = query.where(and_(*conditions))

        # Count total
        count_query = select(func.count(Influencer.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Sorting
        sort_column = getattr(Influencer, request.sort_by or "follower_count", Influencer.follower_count)
        if request.sort_order == "asc":
            query = query.order_by(asc(sort_column).nullslast())
        else:
            query = query.order_by(desc(sort_column).nullslast())

        # Apply pagination
        query = query.offset(request.offset).limit(request.limit)

        result = await self.db.execute(query)
        influencers = result.scalars().all()

        return InfluencerSearchResponse(
            influencers=[self._to_response(inf) for inf in influencers],
            total=total,
            limit=request.limit,
            offset=request.offset,
        )

    async def get_stats(self) -> dict:
        """Get influencer statistics by platform"""
        result = await self.db.execute(
            select(
                Influencer.platform,
                func.count(Influencer.id).label("count"),
            ).group_by(Influencer.platform)
        )
        stats = {row.platform: row.count for row in result}

        # Total count
        total_result = await self.db.execute(select(func.count(Influencer.id)))
        total = total_result.scalar() or 0

        return {
            "total": total,
            "by_platform": stats,
        }

    def _to_response(self, influencer: Influencer) -> InfluencerResponse:
        """Convert Influencer model to response schema"""
        return InfluencerResponse(
            id=influencer.id,
            platform=influencer.platform.value if hasattr(influencer.platform, 'value') else str(influencer.platform),
            platform_uid=influencer.platform_uid,
            username=influencer.username,
            full_name=influencer.full_name,
            biography=influencer.biography,
            profile_pic_url=influencer.profile_pic_url,
            landing_url=influencer.landing_url,
            gender=influencer.gender,
            birth_year=influencer.birth_year,
            follower_count=influencer.follower_count or 0,
            following_count=influencer.following_count or 0,
            media_count=influencer.media_count or 0,
            avg_likes=influencer.avg_likes,
            avg_comments=influencer.avg_comments,
            avg_reach=influencer.avg_reach,
            engagement_rate=float(influencer.engagement_rate) if influencer.engagement_rate else None,
            influence_score=float(influencer.influence_score) if influencer.influence_score else None,
            trust_score=float(influencer.trust_score) if influencer.trust_score else None,
            fake_follower_ratio=float(influencer.fake_follower_ratio) if influencer.fake_follower_ratio else None,
            tier=influencer.tier,
            categories=influencer.categories,
            is_verified=influencer.is_verified or False,
            is_business=influencer.is_business or False,
            ad_rate=influencer.ad_rate,
            public_email=influencer.public_email,
            public_phone=influencer.public_phone,
            source=influencer.source,
            last_synced_at=influencer.last_synced_at,
            profile_url=self._generate_profile_url(influencer),
            created_at=influencer.created_at,
        )

    def _to_brief_response(self, influencer: Influencer) -> InfluencerBriefResponse:
        """Convert Influencer model to brief response schema"""
        return InfluencerBriefResponse(
            id=influencer.id,
            platform=influencer.platform.value if hasattr(influencer.platform, 'value') else str(influencer.platform),
            username=influencer.username,
            full_name=influencer.full_name,
            profile_pic_url=influencer.profile_pic_url,
            landing_url=influencer.landing_url,
            follower_count=influencer.follower_count or 0,
            engagement_rate=float(influencer.engagement_rate) if influencer.engagement_rate else None,
            influence_score=float(influencer.influence_score) if influencer.influence_score else None,
            tier=influencer.tier,
            categories=influencer.categories,
            is_verified=influencer.is_verified or False,
        )

    def _generate_profile_url(self, influencer: Influencer) -> Optional[str]:
        """Generate platform-specific profile URL"""
        platform = influencer.platform.value if hasattr(influencer.platform, 'value') else str(influencer.platform)
        username = influencer.username

        if platform == "instagram":
            return f"https://www.instagram.com/{username}/"
        elif platform == "tiktok":
            return f"https://www.tiktok.com/@{username}"
        elif platform == "youtube":
            return f"https://www.youtube.com/@{username}"
        elif platform == "naver_blog":
            return f"https://blog.naver.com/{username}"
        return None
