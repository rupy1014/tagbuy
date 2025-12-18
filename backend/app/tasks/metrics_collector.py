"""
Metrics Collector Task - 콘텐츠 성과 메트릭 수집

주요 기능:
1. 등록된 콘텐츠의 좋아요/댓글/조회수 주기적 수집
2. 메트릭 히스토리 저장
3. 삭제된 콘텐츠 감지
"""

import logging
from datetime import datetime
from typing import Dict, Any, List
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.tasks import celery_app
from app.core.database import get_sync_db
from app.core.constants import ContentStatus
from app.models.content import CampaignContent, ContentMetrics, MonitoringLog
from app.integrations.instagram.client import InstagramClient
from app.core.exceptions import InstagramMediaNotFoundError

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.metrics_collector.update_content_metrics",
    bind=True,
    max_retries=3,
)
def update_content_metrics(self) -> Dict[str, Any]:
    """
    등록된 콘텐츠의 메트릭 업데이트

    실행 주기: 1시간 (Celery Beat)
    대상: status가 PENDING, APPROVED, ACTIVE인 콘텐츠
    """
    logger.info("Starting content metrics update...")

    with get_sync_db() as db:
        # 모니터링 대상 콘텐츠 조회
        active_contents = db.execute(
            select(CampaignContent).where(
                CampaignContent.status.in_([
                    ContentStatus.PENDING,
                    ContentStatus.APPROVED,
                    ContentStatus.ACTIVE,
                ])
            )
        ).scalars().all()

        if not active_contents:
            logger.info("No active contents to monitor")
            return {"status": "no_contents", "updated": 0}

        logger.info(f"Found {len(active_contents)} contents to update")

        # 각 콘텐츠에 대해 메트릭 수집 태스크 분배
        tasks_queued = 0
        for content in active_contents:
            collect_single_content_metrics.delay(str(content.id))
            tasks_queued += 1

        return {
            "status": "completed",
            "contents_count": len(active_contents),
            "tasks_queued": tasks_queued
        }


@celery_app.task(
    name="app.tasks.metrics_collector.collect_single_content_metrics",
    bind=True,
    queue="instagram_api",
    rate_limit="20/m",
    max_retries=3,
    default_retry_delay=60,
)
def collect_single_content_metrics(self, content_id: str) -> Dict[str, Any]:
    """
    단일 콘텐츠 메트릭 수집

    Args:
        content_id: 콘텐츠 UUID
    """
    logger.debug(f"Collecting metrics for content: {content_id}")

    with get_sync_db() as db:
        content = db.get(CampaignContent, UUID(content_id))
        if not content:
            logger.warning(f"Content not found: {content_id}")
            return {"status": "not_found"}

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

        # 미디어 정보 조회
        try:
            import asyncio
            media_info = asyncio.run(
                client.get_media_info(content.instagram_media_pk)
            )
        except InstagramMediaNotFoundError:
            # 콘텐츠 삭제됨
            content.status = ContentStatus.DELETED

            log = MonitoringLog(
                content_id=content.id,
                status=ContentStatus.DELETED,
                check_result={"exists": False, "reason": "media_not_found"}
            )
            db.add(log)
            db.commit()

            logger.warning(f"Content deleted: {content_id}")
            return {"status": "deleted", "content_id": content_id}
        except Exception as e:
            logger.error(f"Failed to get media info: {e}")
            raise self.retry(exc=e, countdown=60)

        # 메트릭 기록
        metrics = ContentMetrics(
            content_id=content.id,
            like_count=media_info.like_count,
            comment_count=media_info.comment_count,
            play_count=media_info.play_count,
            recorded_at=datetime.utcnow()
        )
        db.add(metrics)

        # 모니터링 로그
        log = MonitoringLog(
            content_id=content.id,
            status=content.status,
            check_result={
                "exists": True,
                "like_count": media_info.like_count,
                "comment_count": media_info.comment_count,
                "play_count": media_info.play_count
            }
        )
        db.add(log)
        db.commit()

        logger.debug(
            f"Metrics collected for {content_id}: "
            f"likes={media_info.like_count}, comments={media_info.comment_count}"
        )

        return {
            "status": "collected",
            "content_id": content_id,
            "likes": media_info.like_count,
            "comments": media_info.comment_count,
            "play_count": media_info.play_count
        }


@celery_app.task(name="app.tasks.metrics_collector.collect_metrics_for_campaign")
def collect_metrics_for_campaign(campaign_id: str) -> Dict[str, Any]:
    """
    특정 캠페인의 모든 콘텐츠 메트릭 수집 (수동 실행용)

    Usage:
        from app.tasks.metrics_collector import collect_metrics_for_campaign
        collect_metrics_for_campaign.delay("campaign-uuid")
    """
    logger.info(f"Collecting metrics for campaign: {campaign_id}")

    with get_sync_db() as db:
        contents = db.execute(
            select(CampaignContent).where(
                and_(
                    CampaignContent.campaign_id == UUID(campaign_id),
                    CampaignContent.status.in_([
                        ContentStatus.PENDING,
                        ContentStatus.APPROVED,
                        ContentStatus.ACTIVE,
                    ])
                )
            )
        ).scalars().all()

        tasks_queued = 0
        for content in contents:
            collect_single_content_metrics.delay(str(content.id))
            tasks_queued += 1

        return {
            "status": "completed",
            "campaign_id": campaign_id,
            "contents_count": len(contents),
            "tasks_queued": tasks_queued
        }


def get_metrics_summary(db: Session, content_id: str) -> Dict[str, Any]:
    """
    콘텐츠 메트릭 요약 조회

    Args:
        db: 데이터베이스 세션
        content_id: 콘텐츠 UUID

    Returns:
        메트릭 요약 정보
    """
    content = db.get(CampaignContent, UUID(content_id))
    if not content:
        return {"error": "Content not found"}

    # 최신 메트릭
    latest_metrics = db.execute(
        select(ContentMetrics)
        .where(ContentMetrics.content_id == UUID(content_id))
        .order_by(ContentMetrics.recorded_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    # 초기 메트릭
    initial = content.initial_metrics or {}

    if not latest_metrics:
        return {
            "content_id": content_id,
            "initial_metrics": initial,
            "latest_metrics": None,
            "growth": None
        }

    # 성장률 계산
    growth = {}
    if initial.get("like_count"):
        growth["likes"] = latest_metrics.like_count - initial["like_count"]
        growth["likes_pct"] = (
            (growth["likes"] / initial["like_count"] * 100)
            if initial["like_count"] > 0 else 0
        )
    if initial.get("comment_count"):
        growth["comments"] = latest_metrics.comment_count - initial["comment_count"]
        growth["comments_pct"] = (
            (growth["comments"] / initial["comment_count"] * 100)
            if initial["comment_count"] > 0 else 0
        )

    return {
        "content_id": content_id,
        "initial_metrics": initial,
        "latest_metrics": {
            "like_count": latest_metrics.like_count,
            "comment_count": latest_metrics.comment_count,
            "play_count": latest_metrics.play_count,
            "recorded_at": latest_metrics.recorded_at.isoformat()
        },
        "growth": growth
    }
