"""Campaign models"""
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
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.constants import CampaignStatus, PaymentStatus


class Campaign(Base):
    """Campaign model"""
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Basic info
    title = Column(String(200), nullable=False)
    description = Column(Text)
    guidelines = Column(Text)

    # Advertiser
    advertiser_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Budget & Payment
    budget = Column(Numeric(12, 2), nullable=False)  # Total budget
    per_influencer_budget = Column(Numeric(12, 2))   # Budget per influencer
    escrow_fee = Column(Numeric(10, 2))              # 0.5% escrow fee
    pg_fee = Column(Numeric(10, 2))                  # PG fee
    pg_fee_payer = Column(
        SQLEnum("advertiser", "influencer", name="pg_fee_payer_enum"),
        default="advertiser",
    )

    # Status
    status = Column(
        SQLEnum(CampaignStatus),
        default=CampaignStatus.DRAFT,
        nullable=False,
        index=True,
    )

    # Target requirements
    target_follower_min = Column(Integer, default=1000)
    target_follower_max = Column(Integer)
    target_categories = Column(JSONB, default=list)  # List of category strings
    target_locations = Column(JSONB, default=list)   # List of location strings
    min_engagement_rate = Column(Numeric(5, 2))

    # Influencer slots
    max_influencers = Column(Integer, default=10)
    selected_influencers = Column(Integer, default=0)

    # Content requirements
    required_hashtags = Column(JSONB, default=list)
    required_mentions = Column(JSONB, default=list)
    content_type = Column(String(50))  # photo, video, reel, story

    # Settlement rules
    settlement_days = Column(Integer, default=7)  # D+7

    # Dates
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    application_deadline = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    advertiser = relationship("User", back_populates="campaigns")
    influencer_participations = relationship(
        "CampaignInfluencer",
        back_populates="campaign"
    )
    contents = relationship("CampaignContent", back_populates="campaign")

    def __repr__(self) -> str:
        return f"<Campaign {self.title}>"


class CampaignInfluencer(Base):
    """Junction table for Campaign-Influencer relationship"""
    __tablename__ = "campaign_influencers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

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

    # Application
    application_message = Column(Text)
    applied_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Selection
    is_selected = Column(Boolean, default=False)
    selected_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)

    # Payment
    agreed_amount = Column(Numeric(12, 2))
    payment_status = Column(
        SQLEnum(PaymentStatus),
        default=PaymentStatus.PENDING,
    )
    paid_at = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="influencer_participations")
    influencer = relationship("Influencer", back_populates="campaign_participations")

    def __repr__(self) -> str:
        return f"<CampaignInfluencer {self.campaign_id}:{self.influencer_id}>"
