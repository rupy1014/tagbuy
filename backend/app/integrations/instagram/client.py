"""Instagram client wrapper around instagrapi"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from functools import wraps

from instagrapi import Client
from instagrapi.exceptions import (
    BadPassword,
    ChallengeRequired,
    ClientError,
    ClientLoginRequired,
    LoginRequired,
    MediaNotFound,
    PleaseWaitFewMinutes,
    PrivateError,
    RateLimitError,
    UserNotFound,
)
from instagrapi.types import Media, User, UserShort

from app.config import settings
from app.core.exceptions import (
    InstagramAccountNotFoundError,
    InstagramChallengeRequiredError,
    InstagramError,
    InstagramMediaNotFoundError,
    RateLimitExceededError,
)

logger = logging.getLogger(__name__)


@dataclass
class InstagramUserInfo:
    """Normalized Instagram user info"""
    pk: str
    username: str
    full_name: str
    biography: str
    profile_pic_url: str
    follower_count: int
    following_count: int
    media_count: int
    is_verified: bool
    is_business: bool
    is_private: bool
    category: Optional[str] = None
    public_email: Optional[str] = None
    public_phone: Optional[str] = None
    external_url: Optional[str] = None


@dataclass
class InstagramMediaInfo:
    """Normalized Instagram media info"""
    pk: str
    code: str
    media_type: int  # 1=photo, 2=video, 8=album
    like_count: int
    comment_count: int
    play_count: Optional[int] = None
    taken_at: Optional[datetime] = None
    caption_text: Optional[str] = None
    thumbnail_url: Optional[str] = None
    user: Optional[InstagramUserInfo] = None


def handle_instagram_errors(func):
    """Decorator to handle Instagram API errors"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except UserNotFound as e:
            raise InstagramAccountNotFoundError(str(e))
        except MediaNotFound as e:
            raise InstagramMediaNotFoundError(str(e))
        except (RateLimitError, PleaseWaitFewMinutes):
            raise RateLimitExceededError()
        except ChallengeRequired as e:
            raise InstagramChallengeRequiredError(str(e))
        except (LoginRequired, ClientLoginRequired):
            raise InstagramError("Instagram login required")
        except BadPassword:
            raise InstagramError("Invalid Instagram credentials")
        except PrivateError:
            raise InstagramError("Cannot access private account")
        except ClientError as e:
            logger.error(f"Instagram client error: {e}")
            raise InstagramError(f"Instagram API error: {str(e)}")
        except Exception as e:
            logger.exception(f"Unexpected Instagram error: {e}")
            raise InstagramError(f"Unexpected error: {str(e)}")
    return wrapper


class InstagramClient:
    """
    Wrapper around instagrapi Client with rate limiting and error handling.

    Usage:
        client = InstagramClient()
        await client.login("username", "password")
        user = await client.get_user_info("target_user")
    """

    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        proxy: Optional[str] = None,
        session_path: Optional[str] = None,
    ):
        self._client = Client()
        self._username = username
        self._password = password
        self._session_path = session_path
        self._last_request_time: float = 0
        self._request_count: int = 0
        self._logged_in: bool = False

        if proxy:
            self._client.set_proxy(proxy)

        # Set device and user agent to avoid detection
        self._client.set_locale("ko_KR")
        self._client.set_timezone_offset(9 * 3600)  # KST

    @property
    def is_logged_in(self) -> bool:
        return self._logged_in

    @property
    def username(self) -> Optional[str]:
        return self._username

    async def _wait_for_rate_limit(self) -> None:
        """Wait to respect rate limiting"""
        now = time.time()
        elapsed = now - self._last_request_time

        if elapsed < settings.instagram_min_request_interval:
            wait_time = settings.instagram_min_request_interval - elapsed
            await asyncio.sleep(wait_time)

        self._last_request_time = time.time()
        self._request_count += 1

    async def _run_sync(self, func, *args, **kwargs) -> Any:
        """Run synchronous instagrapi method in executor"""
        await self._wait_for_rate_limit()
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

    async def login(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> bool:
        """
        Login to Instagram.

        Args:
            username: Instagram username (uses instance value if not provided)
            password: Instagram password (uses instance value if not provided)

        Returns:
            True if login successful
        """
        username = username or self._username
        password = password or self._password

        if not username or not password:
            raise InstagramError("Username and password are required")

        self._username = username

        try:
            # Try to load existing session
            if self._session_path:
                try:
                    await self._run_sync(
                        self._client.load_settings,
                        self._session_path
                    )
                    # Verify session is valid
                    await self._run_sync(self._client.login, username, password)
                    self._logged_in = True
                    logger.info(f"Logged in with existing session: {username}")
                    return True
                except FileNotFoundError:
                    pass
                except Exception as e:
                    logger.warning(f"Failed to load session, will re-login: {e}")

            # Fresh login
            await self._run_sync(self._client.login, username, password)
            self._logged_in = True

            # Save session
            if self._session_path:
                await self._run_sync(
                    self._client.dump_settings,
                    self._session_path
                )

            logger.info(f"Successfully logged in: {username}")
            return True

        except ChallengeRequired:
            raise InstagramChallengeRequiredError(username)
        except BadPassword:
            raise InstagramError(f"Invalid password for {username}")
        except Exception as e:
            logger.error(f"Login failed for {username}: {e}")
            raise InstagramError(f"Login failed: {str(e)}")

    @handle_instagram_errors
    async def get_user_info(self, username: str) -> InstagramUserInfo:
        """
        Get user info by username.

        Args:
            username: Instagram username

        Returns:
            InstagramUserInfo object
        """
        user: User = await self._run_sync(
            self._client.user_info_by_username,
            username
        )
        return self._convert_user(user)

    @handle_instagram_errors
    async def get_user_info_by_pk(self, user_pk: str) -> InstagramUserInfo:
        """
        Get user info by user PK.

        Args:
            user_pk: Instagram user PK

        Returns:
            InstagramUserInfo object
        """
        user: User = await self._run_sync(self._client.user_info, user_pk)
        return self._convert_user(user)

    @handle_instagram_errors
    async def get_user_medias(
        self,
        user_pk: str,
        amount: int = 12,
    ) -> List[InstagramMediaInfo]:
        """
        Get user's recent media.

        Args:
            user_pk: Instagram user PK
            amount: Number of media to fetch

        Returns:
            List of InstagramMediaInfo objects
        """
        medias: List[Media] = await self._run_sync(
            self._client.user_medias,
            user_pk,
            amount
        )
        return [self._convert_media(m) for m in medias]

    @handle_instagram_errors
    async def get_media_info(self, media_pk: str) -> InstagramMediaInfo:
        """
        Get media info by PK.

        Args:
            media_pk: Instagram media PK

        Returns:
            InstagramMediaInfo object
        """
        media: Media = await self._run_sync(self._client.media_info, media_pk)
        return self._convert_media(media)

    @handle_instagram_errors
    async def get_media_pk_from_url(self, url: str) -> str:
        """
        Extract media PK from Instagram URL.

        Args:
            url: Instagram post URL

        Returns:
            Media PK string
        """
        return await self._run_sync(self._client.media_pk_from_url, url)

    @handle_instagram_errors
    async def get_media_likers(
        self,
        media_pk: str,
        amount: int = 100,
    ) -> List[UserShort]:
        """
        Get users who liked a media.

        Args:
            media_pk: Instagram media PK
            amount: Number of likers to fetch

        Returns:
            List of UserShort objects
        """
        return await self._run_sync(
            self._client.media_likers,
            media_pk,
            amount
        )

    @handle_instagram_errors
    async def get_user_followers(
        self,
        user_pk: str,
        amount: int = 100,
    ) -> Dict[str, UserShort]:
        """
        Get user's followers.

        Args:
            user_pk: Instagram user PK
            amount: Number of followers to fetch

        Returns:
            Dict of user_pk -> UserShort
        """
        return await self._run_sync(
            self._client.user_followers,
            user_pk,
            amount
        )

    @handle_instagram_errors
    async def get_hashtag_medias_top(
        self,
        hashtag: str,
        amount: int = 20,
    ) -> List[InstagramMediaInfo]:
        """
        Get top media for a hashtag.

        Args:
            hashtag: Hashtag name (without #)
            amount: Number of media to fetch

        Returns:
            List of InstagramMediaInfo objects
        """
        medias: List[Media] = await self._run_sync(
            self._client.hashtag_medias_top,
            hashtag,
            amount
        )
        return [self._convert_media(m) for m in medias]

    def _convert_user(self, user: User) -> InstagramUserInfo:
        """Convert instagrapi User to InstagramUserInfo"""
        return InstagramUserInfo(
            pk=str(user.pk),
            username=user.username,
            full_name=user.full_name or "",
            biography=user.biography or "",
            profile_pic_url=str(user.profile_pic_url) if user.profile_pic_url else "",
            follower_count=user.follower_count,
            following_count=user.following_count,
            media_count=user.media_count,
            is_verified=user.is_verified,
            is_business=user.is_business,
            is_private=user.is_private,
            category=user.category_name or user.category,
            public_email=user.public_email,
            public_phone=user.public_phone_number,
            external_url=user.external_url,
        )

    def _convert_media(self, media: Media) -> InstagramMediaInfo:
        """Convert instagrapi Media to InstagramMediaInfo"""
        # Get thumbnail URL - try different sources
        thumbnail_url = None
        if media.thumbnail_url:
            thumbnail_url = str(media.thumbnail_url)
        elif media.resources and len(media.resources) > 0:
            # For carousel, get first resource
            thumbnail_url = str(media.resources[0].thumbnail_url) if media.resources[0].thumbnail_url else None

        return InstagramMediaInfo(
            pk=str(media.pk),
            code=media.code,
            media_type=media.media_type,
            like_count=media.like_count or 0,
            comment_count=media.comment_count or 0,
            play_count=media.play_count,
            taken_at=media.taken_at,
            caption_text=media.caption_text,
            thumbnail_url=thumbnail_url,
        )
