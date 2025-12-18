"""Content monitoring models"""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.constants import ContentStatus, MediaType


class CampaignContent(Base):
    """Campaign content submitted by influencer"""
    __tablename__ = "campaign_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # References
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id"),
        nullable=False,
        index=True,
    )
    influencer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("influencers.id"),
        nullable=False,
        index=True,
    )

    # Instagram content
    instagram_media_pk = Column(String(50), nullable=False, index=True)
    post_url = Column(Text, nullable=False)
    post_type = Column(SQLEnum(MediaType))

    # Status
    status = Column(
        SQLEnum(ContentStatus),
        default=ContentStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Verification
    screenshot_url = Column(Text)
    initial_metrics = Column(JSONB)  # Snapshot at submission

    # AI Analysis
    ai_analysis = Column(JSONB)  # Guideline compliance, hashtags found, etc.
    ai_score = Column(Numeric(5, 2))

    # Advertiser review
    advertiser_approved = Column(SQLEnum("pending", "approved", "rejected", name="approval_enum"), default="pending")
    advertiser_feedback = Column(Text)
    reviewed_at = Column(DateTime(timezone=True))

    # Settlement
    settlement_due_date = Column(DateTime(timezone=True))
    settled_at = Column(DateTime(timezone=True))

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    posted_at = Column(DateTime(timezone=True))  # When posted on Instagram
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="contents")
    influencer = relationship("Influencer", back_populates="contents")
    metrics_history = relationship(
        "ContentMetrics",
        back_populates="content",
        order_by="ContentMetrics.recorded_at.desc()"
    )
    monitoring_logs = relationship(
        "MonitoringLog",
        back_populates="content",
        order_by="MonitoringLog.checked_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<CampaignContent {self.instagram_media_pk}>"


class ContentMetrics(Base):
    """Historical metrics for content"""
    __tablename__ = "content_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    content_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaign_contents.id"),
        nullable=False,
        index=True,
    )

    # Engagement metrics
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    play_count = Column(Integer)  # For videos
    save_count = Column(Integer)
    share_count = Column(Integer)

    # Reach metrics (if available from insights)
    reach_count = Column(Integer)
    impression_count = Column(Integer)

    # Timestamp
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    content = relationship("CampaignContent", back_populates="metrics_history")

    def __repr__(self) -> str:
        return f"<ContentMetrics {self.content_id} at {self.recorded_at}>"


class MonitoringLog(Base):
    """Content monitoring log"""
    __tablename__ = "monitoring_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    content_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaign_contents.id"),
        nullable=False,
        index=True,
    )

    # Check result
    status = Column(SQLEnum(ContentStatus), nullable=False)
    check_result = Column(JSONB)  # Detailed check result
    error_message = Column(Text)

    # Timestamp
    checked_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    content = relationship("CampaignContent", back_populates="monitoring_logs")

    def __repr__(self) -> str:
        return f"<MonitoringLog {self.content_id} - {self.status}>"
