"""Service for managing influencer posts"""
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.influencer import Influencer
from app.models.influencer_post import InfluencerPost
from app.integrations.instagram.client import InstagramMediaInfo
from app.integrations.instagram.client_pool import get_instagram_pool

logger = logging.getLogger(__name__)


class InfluencerPostService:
    """Service for crawling and managing influencer posts"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recent_posts(
        self,
        influencer_id: UUID,
        limit: int = 6,
    ) -> List[InfluencerPost]:
        """
        Get recent posts for an influencer.

        Args:
            influencer_id: Influencer UUID
            limit: Number of posts to return

        Returns:
            List of InfluencerPost objects
        """
        stmt = (
            select(InfluencerPost)
            .where(
                and_(
                    InfluencerPost.influencer_id == influencer_id,
                    InfluencerPost.is_deleted == False,
                )
            )
            .order_by(InfluencerPost.posted_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def crawl_influencer_posts(
        self,
        influencer_id: UUID,
        amount: int = 12,
    ) -> List[InfluencerPost]:
        """
        Crawl recent posts for an influencer from Instagram.

        Args:
            influencer_id: Influencer UUID
            amount: Number of posts to crawl

        Returns:
            List of saved InfluencerPost objects
        """
        # Get influencer
        influencer = await self.db.get(Influencer, influencer_id)
        if not influencer:
            logger.error(f"Influencer not found: {influencer_id}")
            return []

        if influencer.platform != "instagram":
            logger.info(f"Skipping non-Instagram influencer: {influencer.username}")
            return []

        # Get Instagram client pool
        try:
            pool = await get_instagram_pool()
            client = await pool.get_client()
        except Exception as e:
            logger.error(f"Failed to get Instagram client: {e}")
            return []

        try:
            # Fetch recent media from Instagram
            medias = await client.get_user_medias(influencer.platform_uid, amount)
            pool.mark_client_success(client.username)

            saved_posts = []
            for media in medias:
                post = await self._save_or_update_post(influencer_id, media)
                if post:
                    saved_posts.append(post)

            await self.db.commit()
            logger.info(f"Crawled {len(saved_posts)} posts for @{influencer.username}")
            return saved_posts

        except Exception as e:
            pool.mark_client_error(client.username)
            logger.error(f"Failed to crawl posts for @{influencer.username}: {e}")
            await self.db.rollback()
            return []

    async def _save_or_update_post(
        self,
        influencer_id: UUID,
        media: InstagramMediaInfo,
    ) -> Optional[InfluencerPost]:
        """Save or update a post in database"""
        # Check if post already exists
        stmt = select(InfluencerPost).where(
            and_(
                InfluencerPost.influencer_id == influencer_id,
                InfluencerPost.media_pk == media.pk,
            )
        )
        result = await self.db.execute(stmt)
        existing_post = result.scalar_one_or_none()

        if existing_post:
            # Update metrics
            existing_post.like_count = media.like_count
            existing_post.comment_count = media.comment_count
            existing_post.play_count = media.play_count
            existing_post.thumbnail_url = media.thumbnail_url
            existing_post.crawled_at = datetime.utcnow()
            return existing_post
        else:
            # Create new post
            post = InfluencerPost(
                influencer_id=influencer_id,
                platform="instagram",
                media_pk=media.pk,
                shortcode=media.code,
                media_type=media.media_type,
                thumbnail_url=media.thumbnail_url,
                post_url=f"https://www.instagram.com/p/{media.code}/",
                caption=media.caption_text[:500] if media.caption_text else None,
                like_count=media.like_count,
                comment_count=media.comment_count,
                play_count=media.play_count,
                posted_at=media.taken_at,
                crawled_at=datetime.utcnow(),
            )
            self.db.add(post)
            return post

    async def crawl_multiple_influencers(
        self,
        influencer_ids: List[UUID],
        amount: int = 6,
    ) -> int:
        """
        Crawl posts for multiple influencers.

        Args:
            influencer_ids: List of influencer UUIDs
            amount: Number of posts per influencer

        Returns:
            Total number of posts crawled
        """
        total = 0
        for influencer_id in influencer_ids:
            posts = await self.crawl_influencer_posts(influencer_id, amount)
            total += len(posts)
        return total
