"""Custom exceptions for TagBuy"""
from typing import Any, Dict, Optional


class TagBuyException(Exception):
    """Base exception for TagBuy"""

    def __init__(
        self,
        message: str = "An error occurred",
        code: str = "TAGBUY_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


# Not Found Errors
class NotFoundError(TagBuyException):
    """Resource not found"""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            code=f"{resource.upper()}_NOT_FOUND",
            details={"identifier": str(identifier)},
        )


class InfluencerNotFoundError(NotFoundError):
    """Influencer not found"""

    def __init__(self, identifier: Any):
        super().__init__("Influencer", identifier)


class ContentNotFoundError(NotFoundError):
    """Content not found"""

    def __init__(self, identifier: Any):
        super().__init__("Content", identifier)


class CampaignNotFoundError(NotFoundError):
    """Campaign not found"""

    def __init__(self, identifier: Any):
        super().__init__("Campaign", identifier)


class UserNotFoundError(NotFoundError):
    """User not found"""

    def __init__(self, identifier: Any):
        super().__init__("User", identifier)


# Instagram Errors
class InstagramError(TagBuyException):
    """Instagram API error"""

    def __init__(
        self,
        message: str = "Instagram API error",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            code="INSTAGRAM_ERROR",
            details=details,
        )


class RateLimitExceededError(InstagramError):
    """Instagram rate limit exceeded"""

    def __init__(self):
        super().__init__(
            message="Instagram rate limit exceeded. Please try again later.",
            details={"retry_after": 60},
        )


class InstagramChallengeRequiredError(InstagramError):
    """Instagram challenge required"""

    def __init__(self, username: str):
        super().__init__(
            message="Instagram security challenge required",
            details={"username": username},
        )


class InstagramAccountNotFoundError(InstagramError):
    """Instagram account not found"""

    def __init__(self, username: str):
        super().__init__(
            message=f"Instagram account not found: {username}",
            details={"username": username},
        )


class InstagramMediaNotFoundError(InstagramError):
    """Instagram media not found"""

    def __init__(self, media_pk: str):
        super().__init__(
            message=f"Instagram media not found: {media_pk}",
            details={"media_pk": media_pk},
        )


class NoAvailableClientError(InstagramError):
    """No available Instagram client"""

    def __init__(self):
        super().__init__(
            message="No available Instagram client. All clients are in cooldown.",
        )


# Validation Errors
class ValidationError(TagBuyException):
    """Validation error"""

    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"field": field} if field else {},
        )


# Authentication Errors
class AuthenticationError(TagBuyException):
    """Authentication error"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
        )


class AuthorizationError(TagBuyException):
    """Authorization error"""

    def __init__(self, message: str = "Not authorized"):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
        )
