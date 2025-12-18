"""Instagram user service for influencer operations"""
import logging
from dataclasses import dataclass
from typing import List, Optional

from app.core.constants import InfluencerTier, TrustLevel, ENGAGEMENT_BENCHMARKS
from app.core.exceptions import InstagramAccountNotFoundError
from app.integrations.instagram.client import InstagramClient, InstagramUserInfo, InstagramMediaInfo
from app.integrations.instagram.client_pool import InstagramClientPool, get_instagram_pool

logger = logging.getLogger(__name__)


@dataclass
class EngagementAnalysis:
    """Engagement analysis result"""
    engagement_rate: float
    avg_likes: int
    avg_comments: int
    posts_analyzed: int
    is_healthy: bool
    tier_benchmark: dict


@dataclass
class TrustAnalysis:
    """Trust analysis result"""
    trust_score: float
    trust_level: TrustLevel
    engagement_score: float
    follower_quality_score: float
    factors: dict


class InstagramUserService:
    """
    Service for Instagram user/influencer operations.

    This service provides:
    - User profile fetching
    - Engagement rate calculation
    - Trust score analysis
    - Influencer tier classification
    """

    def __init__(self, pool: Optional[InstagramClientPool] = None):
        self._pool = pool

    async def _get_pool(self) -> InstagramClientPool:
        """Get the client pool (lazy initialization)"""
        if self._pool is None:
            self._pool = await get_instagram_pool()
        return self._pool

    async def get_user_info(self, username: str) -> InstagramUserInfo:
        """
        Get user information by username.

        Args:
            username: Instagram username

        Returns:
            InstagramUserInfo object

        Raises:
            InstagramAccountNotFoundError: If user not found
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            user = await client.get_user_info(username)
            pool.mark_client_success(client.username)
            return user
        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    async def get_recent_posts(
        self,
        username: str,
        amount: int = 12,
    ) -> List[InstagramMediaInfo]:
        """
        Get user's recent posts.

        Args:
            username: Instagram username
            amount: Number of posts to fetch

        Returns:
            List of InstagramMediaInfo objects
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            # First get user info to get PK
            user = await client.get_user_info(username)
            posts = await client.get_user_medias(user.pk, amount)
            pool.mark_client_success(client.username)
            return posts
        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    async def calculate_engagement_rate(
        self,
        username: str,
        posts_to_analyze: int = 12,
    ) -> EngagementAnalysis:
        """
        Calculate engagement rate for a user.

        Engagement Rate = (avg_likes + avg_comments) / follower_count * 100

        Args:
            username: Instagram username
            posts_to_analyze: Number of posts to analyze

        Returns:
            EngagementAnalysis object
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            user = await client.get_user_info(username)
            posts = await client.get_user_medias(user.pk, posts_to_analyze)

            if not posts:
                return EngagementAnalysis(
                    engagement_rate=0.0,
                    avg_likes=0,
                    avg_comments=0,
                    posts_analyzed=0,
                    is_healthy=False,
                    tier_benchmark={},
                )

            total_likes = sum(p.like_count for p in posts)
            total_comments = sum(p.comment_count for p in posts)
            posts_count = len(posts)

            avg_likes = total_likes // posts_count
            avg_comments = total_comments // posts_count

            if user.follower_count > 0:
                engagement_rate = ((avg_likes + avg_comments) / user.follower_count) * 100
            else:
                engagement_rate = 0.0

            tier = InfluencerTier.from_follower_count(user.follower_count)
            benchmark = ENGAGEMENT_BENCHMARKS.get(tier, {})
            is_healthy = benchmark.get("min", 0) <= engagement_rate <= benchmark.get("max", 100)

            pool.mark_client_success(client.username)

            return EngagementAnalysis(
                engagement_rate=round(engagement_rate, 2),
                avg_likes=avg_likes,
                avg_comments=avg_comments,
                posts_analyzed=posts_count,
                is_healthy=is_healthy,
                tier_benchmark=benchmark,
            )

        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    async def analyze_trust(
        self,
        username: str,
        sample_followers: int = 50,
    ) -> TrustAnalysis:
        """
        Analyze trust/authenticity of an account.

        Factors considered:
        - Engagement rate health
        - Follower quality (sample analysis)
        - Account completeness

        Args:
            username: Instagram username
            sample_followers: Number of followers to sample

        Returns:
            TrustAnalysis object
        """
        pool = await self._get_pool()
        client = await pool.get_client()

        try:
            user = await client.get_user_info(username)

            # Get engagement data
            engagement = await self.calculate_engagement_rate(username)

            # Analyze followers (sample)
            follower_quality = 100.0  # Default score
            suspicious_ratio = 0.0

            if not user.is_private and user.follower_count > 0:
                try:
                    followers = await client.get_user_followers(user.pk, sample_followers)
                    suspicious_count = 0

                    for follower in followers.values():
                        # Simple heuristics for suspicious accounts
                        if self._is_suspicious_follower(follower):
                            suspicious_count += 1

                    if followers:
                        suspicious_ratio = suspicious_count / len(followers)
                        follower_quality = max(0, 100 - (suspicious_ratio * 100))

                except Exception as e:
                    logger.warning(f"Could not analyze followers for {username}: {e}")

            # Calculate engagement score
            engagement_score = min(100, engagement.engagement_rate * 20)  # Normalize to 0-100

            # Calculate overall trust score
            trust_score = (
                engagement_score * 0.4 +
                follower_quality * 0.4 +
                (100 if user.is_verified else 50) * 0.1 +
                (100 if user.is_business else 50) * 0.1
            )

            # Determine trust level
            if trust_score >= 80:
                trust_level = TrustLevel.VERIFIED
            elif trust_score >= 60:
                trust_level = TrustLevel.NORMAL
            else:
                trust_level = TrustLevel.SUSPICIOUS

            pool.mark_client_success(client.username)

            return TrustAnalysis(
                trust_score=round(trust_score, 2),
                trust_level=trust_level,
                engagement_score=round(engagement_score, 2),
                follower_quality_score=round(follower_quality, 2),
                factors={
                    "engagement_rate": engagement.engagement_rate,
                    "suspicious_follower_ratio": round(suspicious_ratio * 100, 2),
                    "is_verified": user.is_verified,
                    "is_business": user.is_business,
                    "has_bio": bool(user.biography),
                    "has_profile_pic": bool(user.profile_pic_url),
                },
            )

        except Exception as e:
            pool.mark_client_error(client.username)
            raise

    def _is_suspicious_follower(self, follower) -> bool:
        """
        Check if a follower appears suspicious (potential bot).

        Heuristics:
        - No profile picture
        - Generic or random username pattern
        - No full name
        """
        # Check for missing profile pic (often a sign of fake account)
        if not follower.profile_pic_url:
            return True

        # Check for generic usernames (lots of numbers)
        username = follower.username or ""
        digit_count = sum(1 for c in username if c.isdigit())
        if len(username) > 5 and digit_count / len(username) > 0.5:
            return True

        return False

    def classify_tier(self, follower_count: int) -> InfluencerTier:
        """
        Classify influencer tier based on follower count.

        Args:
            follower_count: Number of followers

        Returns:
            InfluencerTier enum value
        """
        return InfluencerTier.from_follower_count(follower_count)
