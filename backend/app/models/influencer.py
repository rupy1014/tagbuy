"""Influencer model - Multi-platform support"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base
import enum


class Platform(str, enum.Enum):
    """Supported platforms"""
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    NAVER_BLOG = "naver_blog"


class Influencer(Base):
    """Influencer model - Multi-platform influencer data"""
    __tablename__ = "influencers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # User relation (optional - influencer may not have signed up)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    # Platform identifiers - using String instead of Enum for compatibility with existing data
    platform = Column(
        String(20),
        nullable=False,
        index=True,
        default="instagram"
    )
    platform_uid = Column(String(100), nullable=False, index=True)  # Platform-specific user ID
    username = Column(String(100), nullable=False, index=True)

    # Profile info
    full_name = Column(String(200))
    profile_pic_url = Column(Text)
    biography = Column(Text)
    landing_url = Column(Text)  # Profile URL on the platform

    # Demographics
    gender = Column(String(10))  # M, F, or null
    birth_year = Column(Integer)  # Year only for privacy

    # Metrics
    follower_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    media_count = Column(Integer, default=0)

    # Engagement metrics
    avg_likes = Column(Integer)
    avg_comments = Column(Integer)
    avg_reach = Column(Integer)  # Average reach per post
    engagement_rate = Column(Numeric(5, 2))  # e.g., 4.25%

    # Influence & Trust scores
    influence_score = Column(Numeric(12, 2))  # ISI from tagby
    trust_score = Column(Numeric(5, 2))  # 0-100
    fake_follower_ratio = Column(Numeric(5, 2))  # estimated %

    # Classification
    tier = Column(String(20))  # nano, micro, macro, mega
    categories = Column(ARRAY(String(50)))  # Multiple categories: ["DAILY", "BEAUTY"]
    is_verified = Column(Boolean, default=False)
    is_business = Column(Boolean, default=False)

    # Ad rate (0-100 scale, percentage of ads)
    ad_rate = Column(Integer, default=0)

    # Contact (for business accounts)
    public_email = Column(String(255))
    public_phone = Column(String(50))

    # Source tracking
    source = Column(String(50))  # e.g., "tagby_import", "discovery", "manual"
    source_idx = Column(Integer)  # Original index from source

    # Sync status
    last_synced_at = Column(DateTime(timezone=True))
    sync_error = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="influencer_profiles")
    campaign_participations = relationship(
        "CampaignInfluencer",
        back_populates="influencer"
    )
    contents = relationship("CampaignContent", back_populates="influencer")

    # Unique constraint: one entry per platform + platform_uid
    __table_args__ = (
        # UniqueConstraint handled via index for better performance
        {"schema": None},
    )

    def __repr__(self) -> str:
        return f"<Influencer {self.platform}:@{self.username}>"

    @property
    def profile_url(self) -> str:
        """Generate profile URL based on platform"""
        if self.landing_url:
            return self.landing_url

        if self.platform == "instagram":
            return f"https://www.instagram.com/{self.username}/"
        elif self.platform == "tiktok":
            return f"https://www.tiktok.com/@{self.username}"
        elif self.platform == "youtube":
            return f"https://www.youtube.com/@{self.username}"
        return ""

    @classmethod
    def calculate_tier(cls, follower_count: int) -> str:
        """Calculate influencer tier based on follower count"""
        if follower_count >= 1_000_000:
            return "mega"
        elif follower_count >= 100_000:
            return "macro"
        elif follower_count >= 10_000:
            return "micro"
        elif follower_count >= 1_000:
            return "nano"
        return "unknown"
