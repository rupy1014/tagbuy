"""Influencer Post model - Recent posts from influencers"""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class InfluencerPost(Base):
    """Recent posts from influencers"""
    __tablename__ = "influencer_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Influencer reference
    influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Platform identifiers
    platform = Column(String(20), nullable=False, default="instagram")
    media_pk = Column(String(100), nullable=False, index=True)  # Platform media ID
    shortcode = Column(String(50), index=True)  # Instagram shortcode for URL

    # Post content
    media_type = Column(Integer, default=1)  # 1=photo, 2=video, 8=carousel
    thumbnail_url = Column(Text)  # Thumbnail/preview image URL
    post_url = Column(Text)  # Direct link to post

    # Caption
    caption = Column(Text)

    # Engagement metrics
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    play_count = Column(Integer)  # For videos

    # Post timestamp
    posted_at = Column(DateTime(timezone=True))

    # Crawl info
    crawled_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    influencer = relationship("Influencer", backref="posts")

    # Unique constraint: one post per platform + media_pk
    __table_args__ = (
        # Index for efficient queries
        {"schema": None},
    )

    def __repr__(self) -> str:
        return f"<InfluencerPost {self.platform}:{self.media_pk}>"

    @property
    def instagram_url(self) -> str:
        """Generate Instagram post URL from shortcode"""
        if self.shortcode:
            return f"https://www.instagram.com/p/{self.shortcode}/"
        return self.post_url or ""
