"""API v1 module"""
from fastapi import APIRouter

from app.api.v1 import auth, users, influencers, contents, health, discovery, admin

router = APIRouter(prefix="/v1")

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(influencers.router)
router.include_router(contents.router)
router.include_router(discovery.router)
router.include_router(admin.router)
