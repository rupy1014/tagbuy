"""
Celery app configuration for TagBuy

Usage:
    # Start worker
    celery -A app.tasks worker -Q instagram_api -c 1 -l info
    celery -A app.tasks worker -Q default -c 4 -l info

    # Start beat scheduler
    celery -A app.tasks beat -l info

    # Start flower monitoring
    celery -A app.tasks flower --port=5555
"""

from celery import Celery
from celery.schedules import crontab

from app.config import settings

# Celery 앱 생성
celery_app = Celery(
    "tagbuy",
    broker=settings.redis_url,
    backend=settings.redis_url.replace("/0", "/1"),  # 결과는 다른 DB 사용
    include=[
        "app.tasks.post_scanner",
        "app.tasks.campaign_matcher",
        "app.tasks.metrics_collector",
        "app.tasks.content_checker",
        "app.tasks.influencer_crawler",
    ]
)

# Celery 설정
celery_app.conf.update(
    # 직렬화 설정
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # 시간대 설정
    timezone="Asia/Seoul",
    enable_utc=True,

    # 기본 큐 설정
    task_default_queue="default",

    # 워커 설정
    worker_prefetch_multiplier=1,  # Rate limit 준수를 위해
    task_acks_late=True,

    # 결과 만료
    result_expires=3600,  # 1시간

    # 재시도 설정
    task_default_retry_delay=300,  # 5분
    task_max_retries=3,

    # 큐 라우팅
    task_routes={
        "app.tasks.post_scanner.fetch_influencer_posts": {"queue": "instagram_api"},
        "app.tasks.metrics_collector.collect_single_content_metrics": {"queue": "instagram_api"},
        "app.tasks.content_checker.verify_content_exists": {"queue": "instagram_api"},
        "app.tasks.influencer_crawler.crawl_single_influencer": {"queue": "instagram_api"},
    },

    # Rate Limit 설정 (instagram_api 큐)
    task_annotations={
        "app.tasks.post_scanner.fetch_influencer_posts": {
            "rate_limit": "20/m"  # 분당 20회
        },
        "app.tasks.metrics_collector.collect_single_content_metrics": {
            "rate_limit": "20/m"
        },
        "app.tasks.content_checker.verify_content_exists": {
            "rate_limit": "20/m"
        },
        "app.tasks.influencer_crawler.crawl_single_influencer": {
            "rate_limit": "20/m"
        },
    }
)

# Beat 스케줄 (주기적 태스크)
celery_app.conf.beat_schedule = {
    # 새 게시글 스캔 (30분마다) - 활성 캠페인용
    "scan-active-campaigns": {
        "task": "app.tasks.post_scanner.scan_active_campaigns",
        "schedule": crontab(minute="*/30"),
        "options": {"queue": "default"}
    },

    # 메트릭 수집 (1시간마다)
    "update-content-metrics": {
        "task": "app.tasks.metrics_collector.update_content_metrics",
        "schedule": crontab(minute=0),  # 매시 정각
        "options": {"queue": "default"}
    },

    # 콘텐츠 존재 확인 (6시간마다)
    "check-content-existence": {
        "task": "app.tasks.content_checker.check_content_existence",
        "schedule": crontab(hour="*/6", minute=30),
        "options": {"queue": "default"}
    },

    # 인플루언서 게시물 크롤링 (6시간마다)
    "crawl-all-influencers": {
        "task": "app.tasks.influencer_crawler.crawl_all_influencers",
        "schedule": crontab(hour="*/6", minute=0),
        "options": {"queue": "default"}
    },

    # 오래된 썸네일 갱신 (매일 새벽 3시)
    "refresh-stale-thumbnails": {
        "task": "app.tasks.influencer_crawler.refresh_stale_thumbnails",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "default"}
    },
}


# 간단한 테스트 태스크
@celery_app.task(name="app.tasks.ping")
def ping():
    """간단한 연결 테스트 태스크"""
    return {"status": "pong", "message": "Celery is working!"}


# Celery 앱 export
__all__ = ["celery_app", "ping"]
