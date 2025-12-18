"""Content schemas"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from app.core.constants import ContentStatus, MediaType


class ContentVerifyRequest(BaseModel):
    """Content verification request"""
    post_url: str = Field(..., description="Instagram post URL")


class ContentMetricsSnapshot(BaseModel):
    """Snapshot of content metrics"""
    like_count: int = 0
    comment_count: int = 0
    play_count: Optional[int] = None
    taken_at: Optional[datetime] = None


class AIAnalysisResult(BaseModel):
    """AI analysis result for content"""
    guideline_compliance: float = Field(..., ge=0, le=100)
    hashtags_found: List[str] = Field(default_factory=list)
    mentions_found: List[str] = Field(default_factory=list)
    brand_mentioned: bool = False
    estimated_reach: Optional[int] = None
    content_quality_score: Optional[float] = None
    issues: List[str] = Field(default_factory=list)


class ContentVerifyResponse(BaseModel):
    """Content verification response"""
    exists: bool
    is_public: bool = False
    media_pk: Optional[str] = None
    media_type: Optional[MediaType] = None
    metrics: Optional[ContentMetricsSnapshot] = None
    screenshot_url: Optional[str] = None
    ai_analysis: Optional[AIAnalysisResult] = None
    verified_at: datetime


class ContentSubmitRequest(BaseModel):
    """Content submission request"""
    campaign_id: UUID
    post_url: str = Field(..., description="Instagram post URL")


class ContentSubmitResponse(BaseModel):
    """Content submission response"""
    content_id: UUID
    status: ContentStatus
    verification: ContentVerifyResponse
    settlement_due_date: Optional[datetime] = None


class ContentStatusResponse(BaseModel):
    """Content status response"""
    id: UUID
    campaign_id: UUID
    influencer_id: UUID
    instagram_media_pk: str
    post_url: str
    post_type: Optional[MediaType] = None
    status: ContentStatus
    advertiser_approved: str
    advertiser_feedback: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    settlement_due_date: Optional[datetime] = None
    settled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContentMetricsResponse(BaseModel):
    """Content metrics response"""
    content_id: UUID
    current: ContentMetricsSnapshot
    history: List[Dict[str, Any]] = Field(default_factory=list)
    growth: Optional[Dict[str, float]] = None


class MonitoringLogResponse(BaseModel):
    """Monitoring log response"""
    id: UUID
    content_id: UUID
    status: ContentStatus
    check_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    checked_at: datetime

    class Config:
        from_attributes = True


class ContentListResponse(BaseModel):
    """Content list response"""
    contents: List[ContentStatusResponse]
    total: int
    limit: int
    offset: int
