"""Influencer schemas - Multi-platform support"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.constants import InfluencerTier, TrustLevel


class InfluencerBase(BaseModel):
    """Base influencer schema"""
    username: str
    full_name: Optional[str] = None
    biography: Optional[str] = None


class InfluencerResponse(InfluencerBase):
    """Influencer response schema"""
    id: UUID
    platform: str  # instagram, tiktok, youtube, naver_blog
    platform_uid: str
    profile_pic_url: Optional[str] = None
    landing_url: Optional[str] = None

    # Demographics
    gender: Optional[str] = None
    birth_year: Optional[int] = None

    # Metrics
    follower_count: int = 0
    following_count: int = 0
    media_count: int = 0

    # Engagement metrics
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    avg_reach: Optional[int] = None
    engagement_rate: Optional[float] = None

    # Influence & Trust
    influence_score: Optional[float] = None
    trust_score: Optional[float] = None
    fake_follower_ratio: Optional[float] = None

    # Classification
    tier: Optional[str] = None
    categories: Optional[List[str]] = None
    is_verified: bool = False
    is_business: bool = False

    # Ad rate
    ad_rate: Optional[int] = None

    # Contact
    public_email: Optional[str] = None
    public_phone: Optional[str] = None

    # Metadata
    source: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    profile_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InfluencerSearchRequest(BaseModel):
    """Influencer search request"""
    # Platform filter
    platform: Optional[str] = None  # instagram, tiktok, youtube, naver_blog

    # Search
    username_query: Optional[str] = None

    # Filters
    min_followers: int = Field(default=1000, ge=0)
    max_followers: Optional[int] = Field(default=None, ge=0)
    categories: Optional[List[str]] = None
    min_engagement_rate: Optional[float] = Field(default=None, ge=0, le=100)
    max_engagement_rate: Optional[float] = Field(default=None, ge=0, le=100)
    min_trust_score: Optional[float] = Field(default=None, ge=0, le=100)
    min_influence_score: Optional[float] = Field(default=None, ge=0)
    tiers: Optional[List[InfluencerTier]] = None
    verified_only: bool = False
    gender: Optional[str] = None
    max_ad_rate: Optional[int] = Field(default=None, ge=0, le=100)

    # Sorting
    sort_by: Optional[str] = Field(default="follower_count")  # follower_count, engagement_rate, influence_score
    sort_order: Optional[str] = Field(default="desc")  # asc, desc

    # Pagination
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class InfluencerSearchResponse(BaseModel):
    """Influencer search response"""
    influencers: List[InfluencerResponse]
    total: int
    limit: int
    offset: int


class InfluencerSyncRequest(BaseModel):
    """Request to sync influencer data from Instagram"""
    username: str
    platform: str = "instagram"


class InfluencerSyncResponse(BaseModel):
    """Response after syncing influencer data"""
    influencer: InfluencerResponse
    synced: bool
    message: str


class InfluencerBriefResponse(BaseModel):
    """Brief influencer info for lists"""
    id: UUID
    platform: str
    username: str
    full_name: Optional[str] = None
    profile_pic_url: Optional[str] = None
    landing_url: Optional[str] = None
    follower_count: int
    engagement_rate: Optional[float] = None
    influence_score: Optional[float] = None
    tier: Optional[str] = None
    categories: Optional[List[str]] = None
    is_verified: bool = False

    class Config:
        from_attributes = True


class TrustAnalysis(BaseModel):
    """Trust analysis result"""
    trust_score: float = Field(..., ge=0, le=100)
    trust_level: TrustLevel
    engagement_rate: float
    follower_quality_score: float
    factors: dict


class EngagementMetrics(BaseModel):
    """Engagement metrics"""
    avg_likes: int
    avg_comments: int
    engagement_rate: float
    posts_analyzed: int
