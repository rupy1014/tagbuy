"""Instagram media service for content operations"""
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from app.core.constants import MediaType
from app.core.exceptions import InstagramMediaNotFoundError
from app.integrations.instagram.client import InstagramClient, InstagramMediaInfo
from app.integrations.instagram.client_pool import InstagramClientPool, get_instagram_pool

logger = logging.getLogger(__name__)


@dataclass
class ContentVerification:
    """Content verification result"""
    exists: bool
    is_public: bool
    media_pk: Optional[str] = None
    media_type: Optional[MediaType] = None
    like_count: int = 0
    comment_count: int = 0
    play_count: Optional[int] = None
    taken_at: Optional[datetime] = None
    caption_text: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class HashtagAnalysis:
    """Hashtag analysis in content"""
    hashtags_found: List[str]
    required_hashtags_present: List[str]
    required_hashtags_missing: List[str]
    compliance_rate: float


class InstagramMediaService:
    """
    Service for Instagram media/content operations.

    This service provides:
    - Media info fetching
    - URL parsing and validation
    - Content verification
    - Hashtag analysis
    """

    # Instagram URL patterns
    POST_URL_PATTERN = re.compile(
        r'(?:https?://)?(?:www\.)?instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)'
    )
    STORY_URL_PATTERN = re.compile(
        r'(?:https?://)?(?:www\.)?instagram\.com/stories/([^/]+)/(\d+)'
    )

    def __init__(self, pool: Optional[InstagramClientPool] = None):
        self._pool = pool

    async def _get_pool(self) -> InstagramClientPool:
        """Get the client pool (lazy initialization)"""
        if self._pool is None:
            self._pool = await get_instagram_pool()
        return self._pool

    def parse_post_url(self, url: str) -> Optional[str]:
        """
        Parse Instagram post URL to extract shortcode.

        Args:
            url: Instagram URL

        Returns:
            Shortcode if valid URL, None otherwise
        """
        match = self.POST_URL_PATTERN.search(url)
        if match:
            return match.group(1)
        return None

    def is_valid_instagram_url(self, url: str) -> bool:
        """
        Check if URL is a valid Instagram post URL.

        Args:
            url: URL to validate

        Returns:
            True if valid Instagram URL
        """
        return bool(self.POST_URL_PATTERN.search(url))

    async def get_media_pk_from_url(self, url: str) -> str:
        """
        Get media PK from Instagram URL.

        Args:
            url: Instagram post URL

        Returns:
            Media PK string

        Raises:
            InstagramMediaNotFoundError: If URL is invalid or media not found
        """
        if not self.is_valid_instagram_url(url):
            raise InstagramMediaNotFoundError(url)

        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            media_pk = await client.get_media_pk_from_url(url)
            pool.mark_client_success(client.username)
            return media_pk
        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    async def get_media_info(self, media_pk: str) -> InstagramMediaInfo:
        """
        Get media information by PK.

        Args:
            media_pk: Instagram media PK

        Returns:
            InstagramMediaInfo object
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            media = await client.get_media_info(media_pk)
            pool.mark_client_success(client.username)
            return media
        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    async def verify_content(self, url: str) -> ContentVerification:
        """
        Verify that content exists and is accessible.

        Args:
            url: Instagram post URL

        Returns:
            ContentVerification result
        """
        if not self.is_valid_instagram_url(url):
            return ContentVerification(
                exists=False,
                is_public=False,
                error_message="Invalid Instagram URL format",
            )

        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            media_pk = await client.get_media_pk_from_url(url)
            media = await client.get_media_info(media_pk)

            media_type = self._get_media_type(media.media_type)

            pool.mark_client_success(client.username)

            return ContentVerification(
                exists=True,
                is_public=True,
                media_pk=media.pk,
                media_type=media_type,
                like_count=media.like_count,
                comment_count=media.comment_count,
                play_count=media.play_count,
                taken_at=media.taken_at,
                caption_text=media.caption_text,
            )

        except InstagramMediaNotFoundError:
            pool.mark_client_success(client.username)
            return ContentVerification(
                exists=False,
                is_public=False,
                error_message="Content not found or deleted",
            )
        except Exception as e:
            pool.mark_client_error(client.username)
            return ContentVerification(
                exists=False,
                is_public=False,
                error_message=f"Error verifying content: {str(e)}",
            )

    async def analyze_hashtags(
        self,
        url: str,
        required_hashtags: List[str],
    ) -> HashtagAnalysis:
        """
        Analyze hashtags in content.

        Args:
            url: Instagram post URL
            required_hashtags: List of required hashtags (without #)

        Returns:
            HashtagAnalysis result
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            media_pk = await client.get_media_pk_from_url(url)
            media = await client.get_media_info(media_pk)

            # Extract hashtags from caption
            caption = media.caption_text or ""
            hashtags_found = self._extract_hashtags(caption)

            # Normalize for comparison
            hashtags_found_lower = {h.lower() for h in hashtags_found}
            required_lower = {h.lower() for h in required_hashtags}

            present = [h for h in required_hashtags if h.lower() in hashtags_found_lower]
            missing = [h for h in required_hashtags if h.lower() not in hashtags_found_lower]

            compliance_rate = len(present) / len(required_hashtags) * 100 if required_hashtags else 100.0

            pool.mark_client_success(client.username)

            return HashtagAnalysis(
                hashtags_found=hashtags_found,
                required_hashtags_present=present,
                required_hashtags_missing=missing,
                compliance_rate=compliance_rate,
            )

        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        pattern = r'#(\w+)'
        return re.findall(pattern, text)

    def _get_media_type(self, media_type_int: int) -> MediaType:
        """Convert Instagram media type int to MediaType enum"""
        type_map = {
            1: MediaType.PHOTO,
            2: MediaType.VIDEO,
            8: MediaType.CAROUSEL,
        }
        return type_map.get(media_type_int, MediaType.PHOTO)

    async def get_media_likers_count(self, media_pk: str) -> int:
        """
        Get the number of users who liked a post.

        Note: This only fetches a sample, actual count comes from media_info.

        Args:
            media_pk: Instagram media PK

        Returns:
            Number of likers (from media info)
        """
        media = await self.get_media_info(media_pk)
        return media.like_count
