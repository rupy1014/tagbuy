"""
Influencer Crawler Task - 인플루언서 게시물 주기적 크롤링

주요 기능:
1. 모든 인플루언서의 최근 게시물 주기적 크롤링
2. 썸네일 URL 갱신 (Instagram CDN URL 만료 대응)
3. 배치 처리로 Rate Limit 준수
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from uuid import UUID

from celery import shared_task
from sqlalchemy import select, and_, or_

from app.tasks import celery_app
from app.core.database import get_sync_db
from app.models.influencer import Influencer
from app.models.influencer_post import InfluencerPost
from app.integrations.instagram.client import InstagramClient

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.influencer_crawler.crawl_all_influencers",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def crawl_all_influencers(self, batch_size: int = 50) -> Dict[str, Any]:
    """
    모든 인플루언서의 게시물을 배치로 크롤링

    실행 주기: 6시간 (Celery Beat)
    - 마지막 크롤링 후 6시간 이상 지난 인플루언서만 대상
    - 배치 단위로 처리하여 Rate Limit 준수
    """
    logger.info("Starting batch influencer crawling...")

    with get_sync_db() as db:
        # 6시간 이상 지난 인플루언서 조회
        cutoff_time = datetime.utcnow() - timedelta(hours=6)

        influencers = db.execute(
            select(Influencer).where(
                and_(
                    Influencer.platform == "instagram",
                    Influencer.platform_uid.isnot(None),
                    or_(
                        Influencer.last_synced_at.is_(None),
                        Influencer.last_synced_at < cutoff_time
                    )
                )
            ).order_by(Influencer.last_synced_at.asc().nullsfirst())
            .limit(batch_size)
        ).scalars().all()

        if not influencers:
            logger.info("No influencers need crawling")
            return {"status": "no_influencers", "crawled": 0}

        logger.info(f"Found {len(influencers)} influencers to crawl")

        # 각 인플루언서에 대해 크롤링 태스크 분배
        tasks_queued = 0
        for influencer in influencers:
            crawl_single_influencer.delay(str(influencer.id))
            tasks_queued += 1

        return {
            "status": "queued",
            "influencers_queued": tasks_queued
        }


@celery_app.task(
    name="app.tasks.influencer_crawler.crawl_single_influencer",
    bind=True,
    queue="instagram_api",
    rate_limit="20/m",
    max_retries=3,
    default_retry_delay=60,
)
def crawl_single_influencer(
    self,
    influencer_id: str,
    amount: int = 12
) -> Dict[str, Any]:
    """
    단일 인플루언서의 게시물 크롤링

    Args:
        influencer_id: 인플루언서 UUID
        amount: 가져올 게시물 수 (기본 12개)
    """
    logger.info(f"Crawling posts for influencer: {influencer_id}")

    with get_sync_db() as db:
        # 인플루언서 조회
        influencer = db.get(Influencer, UUID(influencer_id))
        if not influencer:
            logger.warning(f"Influencer not found: {influencer_id}")
            return {"status": "not_found"}

        if not influencer.platform_uid:
            logger.warning(f"Influencer has no platform_uid: {influencer_id}")
            return {"status": "no_platform_uid"}

        # Instagram 클라이언트 생성
        try:
            client = InstagramClient()
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

        # 게시물 가져오기
        try:
            import asyncio
            posts = asyncio.run(
                client.get_user_medias(
                    user_pk=influencer.platform_uid,
                    amount=amount
                )
            )
        except Exception as e:
            logger.error(f"Failed to fetch posts for {influencer.username}: {e}")
            raise self.retry(exc=e, countdown=60)

        # 게시물 저장/업데이트
        saved_count = 0
        for post in posts:
            existing = db.execute(
                select(InfluencerPost).where(
                    and_(
                        InfluencerPost.influencer_id == influencer.id,
                        InfluencerPost.media_pk == str(post.pk)
                    )
                )
            ).scalar_one_or_none()

            if existing:
                # 썸네일 URL 업데이트
                existing.thumbnail_url = post.thumbnail_url
                existing.like_count = post.like_count or 0
                existing.comment_count = post.comment_count or 0
                existing.crawled_at = datetime.utcnow()
            else:
                # 새 게시물 저장
                new_post = InfluencerPost(
                    influencer_id=influencer.id,
                    platform="instagram",
                    media_pk=str(post.pk),
                    shortcode=post.code,
                    media_type=post.media_type,
                    thumbnail_url=post.thumbnail_url,
                    post_url=f"https://www.instagram.com/p/{post.code}/" if post.code else None,
                    caption=post.caption_text[:1000] if post.caption_text else None,
                    like_count=post.like_count or 0,
                    comment_count=post.comment_count or 0,
                    play_count=post.play_count,
                    posted_at=post.taken_at,
                    crawled_at=datetime.utcnow(),
                )
                db.add(new_post)
                saved_count += 1

        # 마지막 동기화 시간 업데이트
        influencer.last_synced_at = datetime.utcnow()
        db.commit()

        logger.info(f"Crawled {len(posts)} posts for {influencer.username}, {saved_count} new")

        return {
            "status": "completed",
            "username": influencer.username,
            "posts_crawled": len(posts),
            "new_posts": saved_count
        }


@celery_app.task(name="app.tasks.influencer_crawler.refresh_stale_thumbnails")
def refresh_stale_thumbnails(hours: int = 24, limit: int = 100) -> Dict[str, Any]:
    """
    오래된 썸네일 URL 갱신

    Instagram CDN URL은 일정 시간 후 만료되므로
    주기적으로 갱신 필요
    """
    logger.info(f"Refreshing thumbnails older than {hours} hours...")

    with get_sync_db() as db:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # 오래된 게시물의 인플루언서 ID 조회 (중복 제거)
        stale_posts = db.execute(
            select(InfluencerPost.influencer_id).where(
                InfluencerPost.crawled_at < cutoff_time
            ).distinct().limit(limit)
        ).scalars().all()

        if not stale_posts:
            return {"status": "no_stale_thumbnails", "refreshed": 0}

        # 각 인플루언서에 대해 크롤링 태스크 분배
        queued = 0
        for inf_id in stale_posts:
            crawl_single_influencer.delay(str(inf_id), amount=6)
            queued += 1

        return {
            "status": "queued",
            "influencers_queued": queued
        }
