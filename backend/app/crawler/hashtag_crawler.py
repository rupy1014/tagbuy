"""Hashtag-based influencer crawler"""
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Set

from app.crawler.hashtag_config import (
    KOREAN_HASHTAGS,
    MINIMUM_REQUIREMENTS,
    get_hashtags_by_priority,
)
from app.integrations.instagram.client import InstagramUserInfo, InstagramMediaInfo
from app.integrations.instagram.client_pool import InstagramClientPool, get_instagram_pool
from app.core.constants import InfluencerTier

logger = logging.getLogger(__name__)


@dataclass
class DiscoveredInfluencer:
    """Discovered influencer from crawling"""
    user_info: InstagramUserInfo
    discovered_via: str  # hashtag or method used
    category: str
    engagement_rate: Optional[float] = None
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    discovered_at: datetime = None

    def __post_init__(self):
        if self.discovered_at is None:
            self.discovered_at = datetime.utcnow()

    def meets_requirements(self) -> bool:
        """Check if influencer meets minimum requirements"""
        if self.user_info.follower_count < MINIMUM_REQUIREMENTS["follower_count"]:
            return False
        if self.user_info.media_count < MINIMUM_REQUIREMENTS["media_count"]:
            return False
        if self.user_info.is_private:
            return False
        if self.engagement_rate and self.engagement_rate < MINIMUM_REQUIREMENTS["engagement_rate"]:
            return False
        return True


class HashtagCrawler:
    """
    Crawl Instagram hashtags to discover influencers.

    This crawler:
    1. Fetches top posts from Korean hashtags
    2. Extracts unique users from those posts
    3. Fetches user info and calculates engagement
    4. Filters by minimum requirements
    5. Returns qualified influencers for storage
    """

    def __init__(self, pool: Optional[InstagramClientPool] = None):
        self._pool = pool
        self._discovered_pks: Set[str] = set()  # Track already discovered users

    async def _get_pool(self) -> InstagramClientPool:
        if self._pool is None:
            self._pool = await get_instagram_pool()
        return self._pool

    async def crawl_hashtag(
        self,
        hashtag: str,
        category: str,
        max_posts: int = 50,
        analyze_engagement: bool = True,
    ) -> List[DiscoveredInfluencer]:
        """
        Crawl a single hashtag and discover influencers.

        Args:
            hashtag: Hashtag to crawl (without #)
            category: Category for classification
            max_posts: Maximum posts to fetch
            analyze_engagement: Whether to calculate engagement rate

        Returns:
            List of discovered influencers
        """
        pool = await self._get_pool()
        client = await pool.get_client()
        discovered = []

        try:
            logger.info(f"Crawling hashtag: #{hashtag}")

            # Fetch top posts
            medias = await client.get_hashtag_medias_top(hashtag, max_posts)
            logger.info(f"Found {len(medias)} posts for #{hashtag}")

            # Extract unique user PKs
            user_pks = set()
            for media in medias:
                if media.user and hasattr(media, 'user'):
                    # Note: media.user might be a UserShort, need to get full info
                    pass

            # For each media, we need to get the user info
            # The media object from hashtag_medias_top should have user info
            seen_users = set()

            for media in medias:
                try:
                    # Get user PK from media (need to fetch media info for user)
                    media_info = await client.get_media_info(media.pk)

                    # Skip if we've seen this user or already discovered
                    # Note: This is a simplified approach - in reality we'd extract from media
                    # For now, we'll use the media's user info

                except Exception as e:
                    logger.warning(f"Error processing media {media.pk}: {e}")
                    continue

                # Rate limit between requests
                await asyncio.sleep(2)

            pool.mark_client_success(client.username)

        except Exception as e:
            logger.error(f"Error crawling #{hashtag}: {e}")
            pool.mark_client_error(client.username)

        return discovered

    async def crawl_category(
        self,
        category: str,
        max_hashtags: int = 5,
        max_posts_per_hashtag: int = 30,
    ) -> List[DiscoveredInfluencer]:
        """
        Crawl all hashtags for a category.

        Args:
            category: Category key (e.g., "beauty", "fashion")
            max_hashtags: Maximum hashtags to crawl
            max_posts_per_hashtag: Maximum posts per hashtag

        Returns:
            List of discovered influencers
        """
        if category not in KOREAN_HASHTAGS:
            logger.warning(f"Unknown category: {category}")
            return []

        config = KOREAN_HASHTAGS[category]
        all_discovered = []
        seen_pks = set()

        # Crawl primary hashtags first
        hashtags_to_crawl = config.primary[:max_hashtags]

        for hashtag in hashtags_to_crawl:
            try:
                discovered = await self.crawl_hashtag(
                    hashtag=hashtag,
                    category=config.category,
                    max_posts=max_posts_per_hashtag,
                )

                # Deduplicate
                for inf in discovered:
                    if inf.user_info.pk not in seen_pks:
                        seen_pks.add(inf.user_info.pk)
                        all_discovered.append(inf)

                # Rate limit between hashtags
                await asyncio.sleep(5)

            except Exception as e:
                logger.error(f"Error crawling category {category}, hashtag {hashtag}: {e}")
                continue

        logger.info(f"Category {category}: discovered {len(all_discovered)} influencers")
        return all_discovered

    async def crawl_all_categories(
        self,
        max_categories: int = 5,
        max_hashtags_per_category: int = 3,
        max_posts_per_hashtag: int = 20,
    ) -> List[DiscoveredInfluencer]:
        """
        Crawl all categories by priority.

        Args:
            max_categories: Maximum categories to crawl
            max_hashtags_per_category: Maximum hashtags per category
            max_posts_per_hashtag: Maximum posts per hashtag

        Returns:
            List of all discovered influencers
        """
        all_discovered = []
        seen_pks = set()

        categories_by_priority = get_hashtags_by_priority()[:max_categories]

        for category, config in categories_by_priority:
            try:
                discovered = await self.crawl_category(
                    category=category,
                    max_hashtags=max_hashtags_per_category,
                    max_posts_per_hashtag=max_posts_per_hashtag,
                )

                # Deduplicate across categories
                for inf in discovered:
                    if inf.user_info.pk not in seen_pks:
                        seen_pks.add(inf.user_info.pk)
                        all_discovered.append(inf)

                # Longer break between categories
                await asyncio.sleep(10)

            except Exception as e:
                logger.error(f"Error crawling category {category}: {e}")
                continue

        logger.info(f"Total discovered: {len(all_discovered)} influencers")
        return all_discovered

    async def discover_from_post_users(
        self,
        hashtag: str,
        category: str,
        max_posts: int = 30,
    ) -> List[DiscoveredInfluencer]:
        """
        Discover influencers from hashtag posts - simplified approach.

        This method:
        1. Gets top posts from hashtag
        2. For each post, gets the user info
        3. Calculates basic engagement
        4. Returns qualifying influencers
        """
        pool = await self._get_pool()
        client = await pool.get_client()
        discovered = []
        seen_pks = set()

        try:
            logger.info(f"Discovering from #{hashtag}")

            # Get top posts
            medias = await client.get_hashtag_medias_top(hashtag, max_posts)

            for media in medias:
                try:
                    # Get full media info to get user details
                    full_media = await client.get_media_info(media.pk)

                    # We need the user pk - this comes from the media's user field
                    # In instagrapi, media.user should be a UserShort
                    # But we need to handle this properly

                    # For now, skip processing and log
                    await asyncio.sleep(2)

                except Exception as e:
                    logger.warning(f"Error processing post: {e}")
                    continue

            pool.mark_client_success(client.username)

        except Exception as e:
            logger.error(f"Discovery error for #{hashtag}: {e}")
            pool.mark_client_error(client.username)

        return discovered
