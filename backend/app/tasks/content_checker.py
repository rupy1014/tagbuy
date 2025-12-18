"""
Content Checker Task - 콘텐츠 삭제 여부 확인

주요 기능:
1. 정산 전 콘텐츠의 삭제 여부 감지
2. 삭제 감지 시 상태 업데이트 및 알림
3. 콘텐츠 존재 모니터링 로그 기록
"""

import logging
from datetime import datetime
from typing import Dict, Any
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.tasks import celery_app
from app.core.database import get_sync_db
from app.core.constants import ContentStatus
from app.models.content import CampaignContent, MonitoringLog
from app.integrations.instagram.client import InstagramClient
from app.core.exceptions import InstagramMediaNotFoundError

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.content_checker.check_content_existence",
    bind=True,
    max_retries=3,
)
def check_content_existence(self) -> Dict[str, Any]:
    """
    콘텐츠 삭제 여부 확인

    실행 주기: 6시간 (Celery Beat)
    목적: 인플루언서가 게시글을 삭제했는지 감지
    """
    logger.info("Starting content existence check...")

    with get_sync_db() as db:
        # 정산 전 콘텐츠만 확인 (정산 완료된 건 제외)
        contents_to_check = db.execute(
            select(CampaignContent).where(
                and_(
                    CampaignContent.status.in_([
                        ContentStatus.APPROVED,
                        ContentStatus.ACTIVE,
                    ]),
                    CampaignContent.settled_at.is_(None)  # 정산 전
                )
            )
        ).scalars().all()

        if not contents_to_check:
            logger.info("No contents to check")
            return {"status": "no_contents", "checked": 0}

        logger.info(f"Found {len(contents_to_check)} contents to check")

        # 각 콘텐츠에 대해 존재 확인 태스크 분배
        tasks_queued = 0
        for content in contents_to_check:
            verify_content_exists.delay(str(content.id))
            tasks_queued += 1

        return {
            "status": "completed",
            "contents_count": len(contents_to_check),
            "tasks_queued": tasks_queued
        }


@celery_app.task(
    name="app.tasks.content_checker.verify_content_exists",
    bind=True,
    queue="instagram_api",
    rate_limit="20/m",
    max_retries=3,
    default_retry_delay=60,
)
def verify_content_exists(self, content_id: str) -> Dict[str, Any]:
    """
    개별 콘텐츠 존재 확인

    Args:
        content_id: 콘텐츠 UUID
    """
    logger.debug(f"Verifying content exists: {content_id}")

    with get_sync_db() as db:
        content = db.get(CampaignContent, UUID(content_id))
        if not content:
            logger.warning(f"Content not found in DB: {content_id}")
            return {"status": "not_found_in_db"}

        # 이미 삭제 상태면 스킵
        if content.status == ContentStatus.DELETED:
            return {"status": "already_deleted"}

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

        # 미디어 존재 확인
        try:
            import asyncio
            asyncio.run(client.get_media_info(content.instagram_media_pk))

            # 존재 확인 로그
            log = MonitoringLog(
                content_id=content.id,
                status=content.status,
                check_result={"exists": True}
            )
            db.add(log)
            db.commit()

            logger.debug(f"Content exists: {content_id}")
            return {"status": "exists", "content_id": content_id}

        except InstagramMediaNotFoundError:
            # 삭제 감지!
            old_status = content.status
            content.status = ContentStatus.DELETED

            log = MonitoringLog(
                content_id=content.id,
                status=ContentStatus.DELETED,
                check_result={
                    "exists": False,
                    "previous_status": old_status.value,
                    "detected_at": datetime.utcnow().isoformat()
                }
            )
            db.add(log)
            db.commit()

            logger.warning(
                f"Content DELETED detected: {content_id} "
                f"(was {old_status.value})"
            )

            # 알림 태스크 호출 (옵션)
            # notify_content_deleted.delay(content_id, str(content.campaign_id))

            return {
                "status": "deleted",
                "content_id": content_id,
                "previous_status": old_status.value
            }

        except Exception as e:
            logger.error(f"Failed to verify content: {e}")
            raise self.retry(exc=e, countdown=60)


@celery_app.task(name="app.tasks.content_checker.check_single_content")
def check_single_content(content_id: str) -> Dict[str, Any]:
    """
    단일 콘텐츠 즉시 확인 (수동 실행용)

    Usage:
        from app.tasks.content_checker import check_single_content
        result = check_single_content("content-uuid")
    """
    return verify_content_exists(content_id)


@celery_app.task(name="app.tasks.content_checker.check_campaign_contents")
def check_campaign_contents(campaign_id: str) -> Dict[str, Any]:
    """
    특정 캠페인의 모든 콘텐츠 존재 확인 (수동 실행용)

    Usage:
        from app.tasks.content_checker import check_campaign_contents
        check_campaign_contents.delay("campaign-uuid")
    """
    logger.info(f"Checking contents for campaign: {campaign_id}")

    with get_sync_db() as db:
        contents = db.execute(
            select(CampaignContent).where(
                and_(
                    CampaignContent.campaign_id == UUID(campaign_id),
                    CampaignContent.status != ContentStatus.DELETED
                )
            )
        ).scalars().all()

        tasks_queued = 0
        for content in contents:
            verify_content_exists.delay(str(content.id))
            tasks_queued += 1

        return {
            "status": "completed",
            "campaign_id": campaign_id,
            "contents_count": len(contents),
            "tasks_queued": tasks_queued
        }


def get_deleted_contents_report(db: Session, campaign_id: str = None) -> Dict[str, Any]:
    """
    삭제된 콘텐츠 리포트 생성

    Args:
        db: 데이터베이스 세션
        campaign_id: 캠페인 ID (옵션)

    Returns:
        삭제된 콘텐츠 목록 및 통계
    """
    query = select(CampaignContent).where(
        CampaignContent.status == ContentStatus.DELETED
    )

    if campaign_id:
        query = query.where(CampaignContent.campaign_id == UUID(campaign_id))

    deleted_contents = db.execute(query).scalars().all()

    report = {
        "total_deleted": len(deleted_contents),
        "contents": []
    }

    for content in deleted_contents:
        # 마지막 모니터링 로그 조회
        last_log = db.execute(
            select(MonitoringLog)
            .where(MonitoringLog.content_id == content.id)
            .order_by(MonitoringLog.checked_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        report["contents"].append({
            "content_id": str(content.id),
            "campaign_id": str(content.campaign_id),
            "influencer_id": str(content.influencer_id),
            "post_url": content.post_url,
            "submitted_at": content.submitted_at.isoformat() if content.submitted_at else None,
            "deleted_detected_at": (
                last_log.checked_at.isoformat()
                if last_log else None
            )
        })

    return report
