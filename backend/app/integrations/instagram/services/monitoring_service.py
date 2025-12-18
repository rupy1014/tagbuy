"""Content monitoring service for tracking campaign content"""
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from app.core.constants import ContentStatus
from app.core.exceptions import InstagramMediaNotFoundError
from app.integrations.instagram.client_pool import InstagramClientPool, get_instagram_pool
from app.integrations.instagram.services.media_service import InstagramMediaService, ContentVerification

logger = logging.getLogger(__name__)


@dataclass
class MonitoringResult:
    """Result of content monitoring check"""
    media_pk: str
    status: ContentStatus
    exists: bool
    is_public: bool
    current_likes: int = 0
    current_comments: int = 0
    checked_at: datetime = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if self.checked_at is None:
            self.checked_at = datetime.utcnow()


@dataclass
class MetricsSnapshot:
    """Snapshot of content metrics"""
    like_count: int
    comment_count: int
    play_count: Optional[int]
    recorded_at: datetime


class ContentMonitoringService:
    """
    Service for monitoring campaign content.

    This service provides:
    - Content status checking (active/deleted/private)
    - Metrics collection
    - Batch monitoring
    """

    def __init__(self, pool: Optional[InstagramClientPool] = None):
        self._pool = pool
        self._media_service: Optional[InstagramMediaService] = None

    async def _get_pool(self) -> InstagramClientPool:
        """Get the client pool (lazy initialization)"""
        if self._pool is None:
            self._pool = await get_instagram_pool()
        return self._pool

    async def _get_media_service(self) -> InstagramMediaService:
        """Get the media service (lazy initialization)"""
        if self._media_service is None:
            pool = await self._get_pool()
            self._media_service = InstagramMediaService(pool)
        return self._media_service

    async def check_content_status(self, media_pk: str) -> MonitoringResult:
        """
        Check if content exists and is accessible.

        Args:
            media_pk: Instagram media PK

        Returns:
            MonitoringResult with current status
        """
        media_service = await self._get_media_service()

        try:
            media = await media_service.get_media_info(media_pk)

            return MonitoringResult(
                media_pk=media_pk,
                status=ContentStatus.ACTIVE,
                exists=True,
                is_public=True,
                current_likes=media.like_count,
                current_comments=media.comment_count,
            )

        except InstagramMediaNotFoundError:
            return MonitoringResult(
                media_pk=media_pk,
                status=ContentStatus.DELETED,
                exists=False,
                is_public=False,
                error_message="Content not found (possibly deleted)",
            )

        except Exception as e:
            error_msg = str(e)
            if "private" in error_msg.lower():
                return MonitoringResult(
                    media_pk=media_pk,
                    status=ContentStatus.PRIVATE,
                    exists=True,
                    is_public=False,
                    error_message="Content is now private",
                )

            return MonitoringResult(
                media_pk=media_pk,
                status=ContentStatus.ACTIVE,  # Assume active if error is not deletion
                exists=True,
                is_public=False,
                error_message=f"Error checking content: {error_msg}",
            )

    async def collect_metrics(self, media_pk: str) -> MetricsSnapshot:
        """
        Collect current metrics for content.

        Args:
            media_pk: Instagram media PK

        Returns:
            MetricsSnapshot with current metrics
        """
        media_service = await self._get_media_service()
        media = await media_service.get_media_info(media_pk)

        return MetricsSnapshot(
            like_count=media.like_count,
            comment_count=media.comment_count,
            play_count=media.play_count,
            recorded_at=datetime.utcnow(),
        )

    async def batch_check_status(
        self,
        media_pks: List[str],
    ) -> List[MonitoringResult]:
        """
        Check status of multiple content items.

        Args:
            media_pks: List of Instagram media PKs

        Returns:
            List of MonitoringResult objects
        """
        results = []

        for media_pk in media_pks:
            try:
                result = await self.check_content_status(media_pk)
                results.append(result)
            except Exception as e:
                logger.error(f"Error checking {media_pk}: {e}")
                results.append(MonitoringResult(
                    media_pk=media_pk,
                    status=ContentStatus.ACTIVE,
                    exists=True,
                    is_public=False,
                    error_message=f"Batch check error: {str(e)}",
                ))

        return results

    async def verify_content_url(self, url: str) -> MonitoringResult:
        """
        Verify content by URL.

        Args:
            url: Instagram post URL

        Returns:
            MonitoringResult with verification status
        """
        media_service = await self._get_media_service()

        verification = await media_service.verify_content(url)

        if not verification.exists:
            return MonitoringResult(
                media_pk="",
                status=ContentStatus.DELETED,
                exists=False,
                is_public=False,
                error_message=verification.error_message,
            )

        return MonitoringResult(
            media_pk=verification.media_pk or "",
            status=ContentStatus.ACTIVE,
            exists=True,
            is_public=verification.is_public,
            current_likes=verification.like_count,
            current_comments=verification.comment_count,
        )

    def should_alert(
        self,
        previous_status: ContentStatus,
        current_status: ContentStatus,
    ) -> bool:
        """
        Determine if an alert should be sent based on status change.

        Args:
            previous_status: Previous content status
            current_status: Current content status

        Returns:
            True if alert should be sent
        """
        # Alert if content becomes deleted or private
        alert_statuses = {ContentStatus.DELETED, ContentStatus.PRIVATE}

        if current_status in alert_statuses and previous_status not in alert_statuses:
            return True

        return False
