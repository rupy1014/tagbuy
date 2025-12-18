"""Admin API endpoints"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.influencer import Influencer
from app.core.exceptions import InstagramAccountNotFoundError, InstagramError
from app.services.influencer_service import InfluencerService
from app.schemas.influencer import InfluencerResponse, InfluencerSyncResponse

router = APIRouter(prefix="/admin", tags=["admin"])


class InfluencerRegisterRequest(BaseModel):
    """Request to register a new influencer by username"""
    username: str
    category: Optional[str] = None


class InfluencerBulkRegisterRequest(BaseModel):
    """Request to register multiple influencers"""
    usernames: List[str]
    category: Optional[str] = None


class BulkRegisterResult(BaseModel):
    """Result of bulk registration"""
    success: List[str]
    failed: List[dict]
    total_success: int
    total_failed: int


class AdminStats(BaseModel):
    """Admin dashboard stats"""
    total_users: int
    total_advertisers: int
    total_influencer_users: int
    total_influencers: int  # in influencers table
    total_admins: int


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get admin dashboard statistics"""
    # Count users by type
    result = await db.execute(
        select(User.user_type, func.count(User.id))
        .group_by(User.user_type)
    )
    user_counts = {row[0]: row[1] for row in result.fetchall()}

    # Count influencers in influencers table
    result = await db.execute(select(func.count(Influencer.id)))
    total_influencers = result.scalar() or 0

    return AdminStats(
        total_users=sum(user_counts.values()),
        total_advertisers=user_counts.get("advertiser", 0),
        total_influencer_users=user_counts.get("influencer", 0),
        total_influencers=total_influencers,
        total_admins=user_counts.get("admin", 0),
    )


@router.post("/influencers/register", response_model=InfluencerSyncResponse)
async def register_influencer(
    request: InfluencerRegisterRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    Register a new influencer by Instagram username.

    Fetches profile data from Instagram and creates/updates the influencer record.
    Admin only.
    """
    service = InfluencerService(db)

    try:
        influencer = await service.sync_from_instagram(request.username)

        # Update category if provided
        if request.category and influencer:
            influencer.category = request.category
            await db.commit()
            await db.refresh(influencer)

        return InfluencerSyncResponse(
            influencer=service._to_response(influencer),
            synced=True,
            message=f"Successfully registered @{request.username}",
        )
    except InstagramAccountNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instagram account not found: @{request.username}",
        )
    except InstagramError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Instagram API error: {e.message}",
        )


@router.post("/influencers/register-bulk", response_model=BulkRegisterResult)
async def register_influencers_bulk(
    request: InfluencerBulkRegisterRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    Register multiple influencers by Instagram usernames.

    Admin only. Continues even if some registrations fail.
    """
    service = InfluencerService(db)

    success = []
    failed = []

    for username in request.usernames:
        username = username.strip().lstrip("@")
        if not username:
            continue

        try:
            influencer = await service.sync_from_instagram(username)
            if request.category and influencer:
                influencer.category = request.category
            success.append(username)
        except InstagramAccountNotFoundError:
            failed.append({"username": username, "error": "Account not found"})
        except InstagramError as e:
            failed.append({"username": username, "error": str(e.message)})
        except Exception as e:
            failed.append({"username": username, "error": str(e)})

    await db.commit()

    return BulkRegisterResult(
        success=success,
        failed=failed,
        total_success=len(success),
        total_failed=len(failed),
    )


@router.get("/influencers", response_model=List[InfluencerResponse])
async def list_all_influencers(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """List all registered influencers. Admin only."""
    service = InfluencerService(db)

    result = await db.execute(
        select(Influencer)
        .order_by(Influencer.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    influencers = result.scalars().all()

    return [service._to_response(inf) for inf in influencers]


@router.delete("/influencers/{username}")
async def delete_influencer(
    username: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Delete an influencer by username. Admin only."""
    result = await db.execute(
        select(Influencer).where(Influencer.username == username)
    )
    influencer = result.scalar_one_or_none()

    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Influencer not found: @{username}",
        )

    await db.delete(influencer)
    await db.commit()

    return {"message": f"Influencer @{username} deleted successfully"}
