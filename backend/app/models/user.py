"""User model"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """User model for advertisers, influencers, and platform users"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200))
    company_name = Column(String(200))
    business_number = Column(String(50))  # 사업자등록번호
    phone_number = Column(String(50))
    instagram_username = Column(String(100))  # 인플루언서용

    # User type
    user_type = Column(
        SQLEnum("advertiser", "influencer", "admin", name="user_type_enum"),
        default="advertiser",
        nullable=False,
    )

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)
    last_login_at = Column(DateTime(timezone=True))

    # Relationships
    campaigns = relationship("Campaign", back_populates="advertiser")

    def __repr__(self) -> str:
        return f"<User {self.email}>"
