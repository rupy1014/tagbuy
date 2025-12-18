"""Campaign schemas"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.constants import CampaignStatus


class CampaignBase(BaseModel):
    """Base campaign schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    guidelines: Optional[str] = None


class CampaignCreate(CampaignBase):
    """Campaign creation schema"""
    budget: Decimal = Field(..., gt=0)
    per_influencer_budget: Optional[Decimal] = Field(default=None, gt=0)
    pg_fee_payer: str = Field(default="advertiser")

    # Target requirements
    target_follower_min: int = Field(default=1000, ge=0)
    target_follower_max: Optional[int] = Field(default=None, ge=0)
    target_categories: List[str] = Field(default_factory=list)
    target_locations: List[str] = Field(default_factory=list)
    min_engagement_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)

    # Influencer slots
    max_influencers: int = Field(default=10, ge=1)

    # Content requirements
    required_hashtags: List[str] = Field(default_factory=list)
    required_mentions: List[str] = Field(default_factory=list)
    content_type: Optional[str] = None

    # Settlement
    settlement_days: int = Field(default=7, ge=1, le=30)

    # Dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    """Campaign update schema"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    guidelines: Optional[str] = None
    status: Optional[CampaignStatus] = None

    # Target requirements
    target_follower_min: Optional[int] = Field(default=None, ge=0)
    target_follower_max: Optional[int] = Field(default=None, ge=0)
    target_categories: Optional[List[str]] = None
    min_engagement_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)

    # Content requirements
    required_hashtags: Optional[List[str]] = None
    required_mentions: Optional[List[str]] = None

    # Dates
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None


class CampaignResponse(CampaignBase):
    """Campaign response schema"""
    id: UUID
    advertiser_id: UUID

    # Budget
    budget: Decimal
    per_influencer_budget: Optional[Decimal] = None
    escrow_fee: Optional[Decimal] = None
    pg_fee: Optional[Decimal] = None
    pg_fee_payer: str

    # Status
    status: CampaignStatus

    # Target requirements
    target_follower_min: int
    target_follower_max: Optional[int] = None
    target_categories: List[str]
    target_locations: List[str]
    min_engagement_rate: Optional[Decimal] = None

    # Influencer slots
    max_influencers: int
    selected_influencers: int

    # Content requirements
    required_hashtags: List[str]
    required_mentions: List[str]
    content_type: Optional[str] = None

    # Settlement
    settlement_days: int

    # Dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignListResponse(BaseModel):
    """Campaign list response"""
    campaigns: List[CampaignResponse]
    total: int
    limit: int
    offset: int


class CampaignBriefResponse(BaseModel):
    """Brief campaign info for lists"""
    id: UUID
    title: str
    budget: Decimal
    status: CampaignStatus
    max_influencers: int
    selected_influencers: int
    application_deadline: Optional[datetime] = None

    class Config:
        from_attributes = True
