"""
Post Scanner Task - 인플루언서 새 게시글 스캔 및 캠페인 매칭

주요 기능:
1. 활성 캠페인의 인플루언서들 새 게시글 스캔
2. 새 게시글 발견 시 캠페인 요구사항과 매칭
3. 매칭 성공 시 자동 콘텐츠 등록
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from celery import shared_task
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.tasks import celery_app
from app.core.database import get_sync_db
from app.core.constants import CampaignStatus, ContentStatus
from app.models.campaign import Campaign, CampaignInfluencer
from app.models.influencer import Influencer
from app.models.content import CampaignContent
from app.integrations.instagram.client import InstagramClient, InstagramMediaInfo
from app.tasks.campaign_matcher import match_post_to_campaign, auto_register_content

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.post_scanner.scan_active_campaigns",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def scan_active_campaigns(self) -> Dict[str, Any]:
    """
    활성 캠페인의 인플루언서들 새 게시글 스캔

    실행 주기: 30분 (Celery Beat)
    """
    logger.info("Starting active campaigns scan...")

    with get_sync_db() as db:
        # 1. 활성 캠페인 조회
        active_campaigns = db.execute(
            select(Campaign).where(
                and_(
                    Campaign.status == CampaignStatus.ACTIVE,
                    Campaign.end_date > datetime.utcnow()
                )
            )
        ).scalars().all()

        if not active_campaigns:
            logger.info("No active campaigns found")
            return {"status": "no_campaigns", "scanned": 0}

        logger.info(f"Found {len(active_campaigns)} active campaigns")

        # 2. 스캔 대상 인플루언서 수집 (중복 제거)
        influencer_campaign_map: Dict[str, List[str]] = {}

        for campaign in active_campaigns:
            # 선정된 인플루언서 중 아직 콘텐츠 미제출자
            participations = db.execute(
                select(CampaignInfluencer).where(
                    and_(
                        CampaignInfluencer.campaign_id == campaign.id,
                        CampaignInfluencer.is_selected == True
                    )
                )
            ).scalars().all()

            for participation in participations:
                # 이미 콘텐츠 제출했는지 확인
                existing_content = db.execute(
                    select(CampaignContent).where(
                        and_(
                            CampaignContent.campaign_id == campaign.id,
                            CampaignContent.influencer_id == participation.influencer_id
                        )
                    )
                ).scalar_one_or_none()

                if existing_content:
                    continue  # 이미 제출함

                inf_id = str(participation.influencer_id)
                if inf_id not in influencer_campaign_map:
                    influencer_campaign_map[inf_id] = []
                influencer_campaign_map[inf_id].append(str(campaign.id))

        logger.info(f"Found {len(influencer_campaign_map)} influencers to scan")

        # 3. 인플루언서별 스캔 태스크 분배
        tasks_queued = 0
        for influencer_id, campaign_ids in influencer_campaign_map.items():
            fetch_influencer_posts.delay(
                influencer_id=influencer_id,
                campaign_ids=campaign_ids
            )
            tasks_queued += 1

        return {
            "status": "completed",
            "active_campaigns": len(active_campaigns),
            "influencers_to_scan": len(influencer_campaign_map),
            "tasks_queued": tasks_queued
        }


@celery_app.task(
    name="app.tasks.post_scanner.fetch_influencer_posts",
    bind=True,
    queue="instagram_api",
    rate_limit="20/m",
    max_retries=3,
    default_retry_delay=60,
)
def fetch_influencer_posts(
    self,
    influencer_id: str,
    campaign_ids: List[str],
) -> Dict[str, Any]:
    """
    특정 인플루언서의 최근 게시글을 가져와서 캠페인과 매칭

    Args:
        influencer_id: 인플루언서 UUID
        campaign_ids: 매칭할 캠페인 UUID 목록
    """
    logger.info(f"Fetching posts for influencer: {influencer_id}")

    with get_sync_db() as db:
        # 1. 인플루언서 조회
        influencer = db.get(Influencer, UUID(influencer_id))
        if not influencer:
            logger.warning(f"Influencer not found: {influencer_id}")
            return {"status": "influencer_not_found"}

        if not influencer.platform_uid:
            logger.warning(f"Influencer has no platform_uid: {influencer_id}")
            return {"status": "no_platform_uid"}

        # 2. Instagram 클라이언트 생성 및 로그인
        try:
            client = InstagramClient()
            # 환경변수에서 계정 정보 로드하여 로그인
            from app.config import settings
            accounts = settings.get_instagram_accounts()
            if accounts:
                import asyncio
                asyncio.run(client.login(
                    username=accounts[0].username,
                    password=accounts[0].password
                ))
        except Exception as e:
            logger.error(f"Instagram login failed: {e}")
            raise self.retry(exc=e, countdown=300)

        # 3. 최근 게시글 가져오기 (최대 5개)
        try:
            import asyncio
            recent_posts = asyncio.run(
                client.get_user_medias(
                    user_pk=influencer.platform_uid,
                    amount=5
                )
            )
        except Exception as e:
            logger.error(f"Failed to fetch posts for {influencer.username}: {e}")
            raise self.retry(exc=e, countdown=60)

        # 4. 새 게시글 필터링
        last_checked = influencer.last_synced_at or datetime.min.replace(tzinfo=None)
        new_posts = []

        for post in recent_posts:
            post_time = post.taken_at.replace(tzinfo=None) if post.taken_at else None
            if post_time and post_time > last_checked:
                new_posts.append(post)

        if not new_posts:
            # 마지막 체크 시간만 업데이트
            influencer.last_synced_at = datetime.utcnow()
            db.commit()
            logger.info(f"No new posts for {influencer.username}")
            return {"status": "no_new_posts", "username": influencer.username}

        logger.info(f"Found {len(new_posts)} new posts for {influencer.username}")

        # 5. 각 캠페인과 매칭
        matched_contents = []

        for campaign_id in campaign_ids:
            campaign = db.get(Campaign, UUID(campaign_id))
            if not campaign:
                continue

            for post in new_posts:
                match_result = match_post_to_campaign(post, campaign)

                if match_result["is_match"]:
                    # 자동 콘텐츠 등록
                    content = auto_register_content(
                        db=db,
                        campaign=campaign,
                        influencer=influencer,
                        post=post,
                        match_result=match_result
                    )
                    matched_contents.append(str(content.id))
                    logger.info(
                        f"Auto-registered content: {content.id} "
                        f"(campaign={campaign.title}, influencer={influencer.username})"
                    )

        # 6. 마지막 체크 시간 업데이트
        influencer.last_synced_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "username": influencer.username,
            "new_posts_found": len(new_posts),
            "matched_contents": matched_contents
        }


@celery_app.task(name="app.tasks.post_scanner.scan_single_influencer")
def scan_single_influencer(influencer_id: str) -> Dict[str, Any]:
    """
    단일 인플루언서 스캔 (수동 실행용)

    Usage:
        from app.tasks.post_scanner import scan_single_influencer
        scan_single_influencer.delay("influencer-uuid")
    """
    with get_sync_db() as db:
        # 해당 인플루언서가 참여 중인 활성 캠페인 조회
        participations = db.execute(
            select(CampaignInfluencer).where(
                and_(
                    CampaignInfluencer.influencer_id == UUID(influencer_id),
                    CampaignInfluencer.is_selected == True
                )
            )
        ).scalars().all()

        campaign_ids = []
        for p in participations:
            campaign = db.get(Campaign, p.campaign_id)
            if campaign and campaign.status == CampaignStatus.ACTIVE:
                campaign_ids.append(str(campaign.id))

        if not campaign_ids:
            return {"status": "no_active_campaigns"}

        # 스캔 실행
        return fetch_influencer_posts(
            influencer_id=influencer_id,
            campaign_ids=campaign_ids
        )
