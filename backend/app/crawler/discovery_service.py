"""Influencer discovery service - main orchestrator"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import InfluencerTier
from app.models.influencer import Influencer
from app.crawler.hashtag_config import (
    KOREAN_HASHTAGS,
    MINIMUM_REQUIREMENTS,
    get_hashtags_by_priority,
)
from app.integrations.instagram.client_pool import InstagramClientPool, get_instagram_pool
from app.integrations.instagram.services.user_service import InstagramUserService

logger = logging.getLogger(__name__)


class InfluencerDiscoveryService:
    """
    Main service for discovering and maintaining influencer database.

    Responsibilities:
    1. Discover new influencers from hashtags
    2. Update existing influencer data
    3. Manage discovery queue and priorities
    4. Track discovery metrics
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._user_service = InstagramUserService()

    async def discover_from_hashtag(
        self,
        hashtag: str,
        category: str,
        max_users: int = 50,
    ) -> Tuple[int, int]:
        """
        Discover influencers from a hashtag.

        Returns:
            Tuple of (new_count, updated_count)
        """
        pool = await get_instagram_pool()
        client = await pool.get_client()

        new_count = 0
        updated_count = 0
        processed_pks = set()

        try:
            logger.info(f"Starting discovery from #{hashtag}")

            # Get top posts from hashtag
            medias = await client.get_hashtag_medias_top(hashtag, max_users)
            logger.info(f"Found {len(medias)} posts from #{hashtag}")

            for media in medias:
                try:
                    # Extract user PK from media URL/code and fetch user info
                    # Note: In instagrapi, we need to get the user from media

                    # Get full media info to access user
                    full_media = await client.get_media_info(media.pk)

                    # The user PK should be extractable from media_id format: {media_pk}_{user_pk}
                    # Or we can use the media's owner info

                    # For simplicity, let's use a different approach:
                    # Parse the media_id which is often in format "mediapk_userpk"
                    media_id_parts = str(media.pk).split("_")
                    if len(media_id_parts) < 2:
                        # Try to get from media info
                        await asyncio.sleep(2)
                        continue

                    user_pk = media_id_parts[1] if len(media_id_parts) > 1 else None

                    if not user_pk or user_pk in processed_pks:
                        continue

                    processed_pks.add(user_pk)

                    # Get user info
                    user_info = await client.get_user_info_by_pk(user_pk)

                    # Skip if doesn't meet requirements
                    if not self._meets_requirements(user_info):
                        continue

                    # Check if exists in DB
                    existing = await self._get_by_instagram_pk(user_info.pk)

                    if existing:
                        # Update existing
                        await self._update_influencer(existing, user_info, category)
                        updated_count += 1
                    else:
                        # Create new
                        await self._create_influencer(user_info, category, hashtag)
                        new_count += 1

                    # Rate limiting
                    await asyncio.sleep(3)

                except Exception as e:
                    logger.warning(f"Error processing media: {e}")
                    continue

            await self.db.commit()
            pool.mark_client_success(client.username)
            logger.info(f"#{hashtag}: {new_count} new, {updated_count} updated")

        except Exception as e:
            logger.error(f"Discovery error for #{hashtag}: {e}")
            pool.mark_client_error(client.username)
            await self.db.rollback()

        return new_count, updated_count

    async def discover_category(
        self,
        category: str,
        max_hashtags: int = 3,
        max_users_per_hashtag: int = 30,
    ) -> Tuple[int, int]:
        """
        Discover influencers from a category's hashtags.

        Returns:
            Tuple of (total_new, total_updated)
        """
        if category not in KOREAN_HASHTAGS:
            logger.warning(f"Unknown category: {category}")
            return 0, 0

        config = KOREAN_HASHTAGS[category]
        total_new = 0
        total_updated = 0

        # Use primary hashtags
        hashtags = config.primary[:max_hashtags]

        for hashtag in hashtags:
            try:
                new, updated = await self.discover_from_hashtag(
                    hashtag=hashtag,
                    category=config.category,
                    max_users=max_users_per_hashtag,
                )
                total_new += new
                total_updated += updated

                # Break between hashtags
                await asyncio.sleep(10)

            except Exception as e:
                logger.error(f"Error with hashtag {hashtag}: {e}")
                continue

        return total_new, total_updated

    async def run_full_discovery(
        self,
        max_categories: int = 5,
        max_hashtags_per_category: int = 2,
        max_users_per_hashtag: int = 20,
    ) -> dict:
        """
        Run full discovery across all categories.

        Returns:
            Discovery statistics
        """
        stats = {
            "started_at": datetime.utcnow().isoformat(),
            "categories_processed": 0,
            "total_new": 0,
            "total_updated": 0,
            "errors": [],
        }

        categories = get_hashtags_by_priority()[:max_categories]

        for category, config in categories:
            try:
                logger.info(f"Processing category: {category}")

                new, updated = await self.discover_category(
                    category=category,
                    max_hashtags=max_hashtags_per_category,
                    max_users_per_hashtag=max_users_per_hashtag,
                )

                stats["total_new"] += new
                stats["total_updated"] += updated
                stats["categories_processed"] += 1

                # Long break between categories
                await asyncio.sleep(30)

            except Exception as e:
                error_msg = f"Category {category}: {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)
                continue

        stats["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Discovery complete: {stats}")
        return stats

    async def update_stale_influencers(
        self,
        max_age_days: int = 7,
        limit: int = 100,
    ) -> int:
        """
        Update influencers that haven't been synced recently.

        Returns:
            Number of influencers updated
        """
        stale_threshold = datetime.utcnow() - timedelta(days=max_age_days)

        # Get stale influencers
        result = await self.db.execute(
            select(Influencer)
            .where(
                or_(
                    Influencer.last_synced_at < stale_threshold,
                    Influencer.last_synced_at.is_(None),
                )
            )
            .order_by(Influencer.last_synced_at.asc().nullsfirst())
            .limit(limit)
        )
        influencers = result.scalars().all()

        updated_count = 0

        for influencer in influencers:
            try:
                # Fetch fresh data
                user_info = await self._user_service.get_user_info(influencer.username)
                engagement = await self._user_service.calculate_engagement_rate(
                    influencer.username
                )

                # Update record
                influencer.follower_count = user_info.follower_count
                influencer.following_count = user_info.following_count
                influencer.media_count = user_info.media_count
                influencer.biography = user_info.biography
                influencer.is_verified = user_info.is_verified
                influencer.engagement_rate = engagement.engagement_rate
                influencer.avg_likes = engagement.avg_likes
                influencer.avg_comments = engagement.avg_comments
                influencer.tier = InfluencerTier.from_follower_count(
                    user_info.follower_count
                ).value
                influencer.last_synced_at = datetime.utcnow()
                influencer.sync_error = None

                updated_count += 1

                # Rate limiting
                await asyncio.sleep(3)

            except Exception as e:
                logger.warning(f"Error updating @{influencer.username}: {e}")
                influencer.sync_error = str(e)
                continue

        await self.db.commit()
        logger.info(f"Updated {updated_count} stale influencers")
        return updated_count

    async def get_discovery_stats(self) -> dict:
        """Get current discovery statistics"""
        # Total count
        total_result = await self.db.execute(
            select(func.count(Influencer.id))
        )
        total = total_result.scalar()

        # Count by tier
        tier_result = await self.db.execute(
            select(Influencer.tier, func.count(Influencer.id))
            .group_by(Influencer.tier)
        )
        by_tier = dict(tier_result.all())

        # Count by category
        category_result = await self.db.execute(
            select(Influencer.category, func.count(Influencer.id))
            .group_by(Influencer.category)
        )
        by_category = dict(category_result.all())

        # Recently synced
        recent_threshold = datetime.utcnow() - timedelta(days=1)
        recent_result = await self.db.execute(
            select(func.count(Influencer.id))
            .where(Influencer.last_synced_at >= recent_threshold)
        )
        recently_synced = recent_result.scalar()

        return {
            "total_influencers": total,
            "by_tier": by_tier,
            "by_category": by_category,
            "recently_synced_24h": recently_synced,
        }

    def _meets_requirements(self, user_info) -> bool:
        """Check if user meets minimum requirements"""
        if user_info.follower_count < MINIMUM_REQUIREMENTS["follower_count"]:
            return False
        if user_info.media_count < MINIMUM_REQUIREMENTS["media_count"]:
            return False
        if user_info.is_private:
            return False
        return True

    async def _get_by_instagram_pk(self, pk: str) -> Optional[Influencer]:
        """Get influencer by Instagram PK"""
        result = await self.db.execute(
            select(Influencer).where(Influencer.instagram_pk == pk)
        )
        return result.scalar_one_or_none()

    async def _create_influencer(
        self,
        user_info,
        category: str,
        discovered_via: str,
    ) -> Influencer:
        """Create new influencer record"""
        influencer = Influencer(
            instagram_pk=user_info.pk,
            username=user_info.username.lower(),
            full_name=user_info.full_name,
            biography=user_info.biography,
            profile_pic_url=user_info.profile_pic_url,
            external_url=user_info.external_url,
            follower_count=user_info.follower_count,
            following_count=user_info.following_count,
            media_count=user_info.media_count,
            is_verified=user_info.is_verified,
            is_business=user_info.is_business,
            category=category,
            public_email=user_info.public_email,
            public_phone=user_info.public_phone,
            tier=InfluencerTier.from_follower_count(user_info.follower_count).value,
            last_synced_at=datetime.utcnow(),
        )
        self.db.add(influencer)
        return influencer

    async def _update_influencer(
        self,
        influencer: Influencer,
        user_info,
        category: str,
    ) -> Influencer:
        """Update existing influencer record"""
        influencer.username = user_info.username.lower()
        influencer.full_name = user_info.full_name
        influencer.biography = user_info.biography
        influencer.profile_pic_url = user_info.profile_pic_url
        influencer.follower_count = user_info.follower_count
        influencer.following_count = user_info.following_count
        influencer.media_count = user_info.media_count
        influencer.is_verified = user_info.is_verified
        influencer.is_business = user_info.is_business
        influencer.tier = InfluencerTier.from_follower_count(user_info.follower_count).value
        influencer.last_synced_at = datetime.utcnow()
        influencer.sync_error = None

        # Keep existing category if set, otherwise use new
        if not influencer.category:
            influencer.category = category

        return influencer
