"""User schemas"""
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    business_number: Optional[str] = None
    phone_number: Optional[str] = None
    instagram_username: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=6)


class UserRegister(BaseModel):
    """User registration schema (from frontend)"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    type: Literal["advertiser", "influencer"]
    companyName: Optional[str] = None
    businessNumber: Optional[str] = None
    instagramUsername: Optional[str] = None


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema (frontend-compatible)"""
    id: UUID
    email: EmailStr
    name: Optional[str] = None  # mapped from full_name
    type: str  # mapped from user_type
    companyName: Optional[str] = None  # mapped from company_name
    businessNumber: Optional[str] = None  # mapped from business_number
    instagramUsername: Optional[str] = None  # mapped from instagram_username
    isActive: bool = True
    isVerified: bool = False
    createdAt: datetime
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_user(cls, user) -> "UserResponse":
        """Create UserResponse from ORM User model"""
        return cls(
            id=user.id,
            email=user.email,
            name=user.full_name,
            type=user.user_type,
            companyName=user.company_name,
            businessNumber=user.business_number,
            instagramUsername=user.instagram_username,
            isActive=user.is_active,
            isVerified=user.is_verified,
            createdAt=user.created_at,
            updatedAt=user.updated_at,
        )


class Token(BaseModel):
    """JWT token schema"""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str
    exp: int
