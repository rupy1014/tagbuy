"""Constants and enums for TagBuy"""
from enum import Enum


class InfluencerTier(str, Enum):
    """Influencer tier based on follower count"""
    NANO = "nano"          # 1K - 10K
    MICRO = "micro"        # 10K - 100K
    MACRO = "macro"        # 100K - 1M
    MEGA = "mega"          # 1M+

    @classmethod
    def from_follower_count(cls, count: int) -> "InfluencerTier":
        """Determine tier from follower count"""
        if count < 10_000:
            return cls.NANO
        elif count < 100_000:
            return cls.MICRO
        elif count < 1_000_000:
            return cls.MACRO
        else:
            return cls.MEGA


class ContentStatus(str, Enum):
    """Content monitoring status"""
    PENDING = "pending"        # Submitted, waiting for verification
    ACTIVE = "active"          # Verified and active
    DELETED = "deleted"        # Deleted by user
    PRIVATE = "private"        # Made private
    REJECTED = "rejected"      # Rejected by advertiser
    APPROVED = "approved"      # Approved by advertiser


class CampaignStatus(str, Enum):
    """Campaign status"""
    DRAFT = "draft"            # Created but not published
    ACTIVE = "active"          # Published and accepting applications
    IN_PROGRESS = "in_progress"  # Has active content being created
    COMPLETED = "completed"    # All content delivered and approved
    CANCELLED = "cancelled"    # Cancelled by advertiser


class PaymentStatus(str, Enum):
    """Payment status"""
    PENDING = "pending"
    ESCROWED = "escrowed"      # Held in escrow
    RELEASED = "released"      # Released to influencer
    REFUNDED = "refunded"      # Refunded to advertiser


class TrustLevel(str, Enum):
    """Influencer trust level based on trust score"""
    VERIFIED = "verified"      # 80+
    NORMAL = "normal"          # 60-79
    SUSPICIOUS = "suspicious"  # Below 60


class MediaType(str, Enum):
    """Instagram media types"""
    PHOTO = "photo"
    VIDEO = "video"
    CAROUSEL = "carousel"
    REEL = "reel"
    STORY = "story"
    IGTV = "igtv"


# Engagement rate benchmarks by tier
ENGAGEMENT_BENCHMARKS = {
    InfluencerTier.NANO: {"min": 3.0, "max": 8.0, "avg": 5.0},
    InfluencerTier.MICRO: {"min": 2.0, "max": 5.0, "avg": 3.5},
    InfluencerTier.MACRO: {"min": 1.0, "max": 3.0, "avg": 2.0},
    InfluencerTier.MEGA: {"min": 0.5, "max": 2.0, "avg": 1.2},
}

# Instagram categories
INSTAGRAM_CATEGORIES = [
    "Beauty",
    "Fashion",
    "Food & Drink",
    "Travel",
    "Fitness",
    "Lifestyle",
    "Technology",
    "Gaming",
    "Music",
    "Art",
    "Photography",
    "Business",
    "Education",
    "Entertainment",
    "Health",
    "Home & Garden",
    "Pets",
    "Sports",
    "Other",
]
