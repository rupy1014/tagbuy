# TagBuy 콘텐츠 모니터링 스케줄러 설계서

## 1. 개요

### 1.1 목적
- DB에 등록된 인플루언서들의 Instagram 게시글을 주기적으로 크롤링
- 새 게시글이 캠페인 요구사항(해시태그, 멘션 등)과 일치하는지 자동 감지
- 등록된 콘텐츠의 성과 메트릭을 지속적으로 수집

### 1.2 핵심 기능
1. **새 게시글 스캔**: 활성 캠페인 참여 인플루언서의 새 게시글 감지
2. **캠페인 매칭**: 새 게시글이 캠페인 요구사항 충족 시 자동 등록
3. **메트릭 수집**: 등록된 콘텐츠의 좋아요/댓글/조회수 추적
4. **삭제 감지**: 콘텐츠 삭제 여부 모니터링

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Celery Beat (스케줄러)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [매 30분]  scan_active_campaigns_for_new_posts                    │
│              └─ 활성 캠페인의 인플루언서 새 게시글 확인                  │
│                                                                      │
│   [매 1시간] update_content_metrics                                  │
│              └─ 등록된 콘텐츠 메트릭 업데이트                           │
│                                                                      │
│   [매 6시간] check_content_existence                                 │
│              └─ 콘텐츠 삭제 여부 확인                                  │
│                                                                      │
│   [매일 3AM] sync_influencer_profiles                                │
│              └─ 인플루언서 프로필 정보 동기화                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Redis (Message Broker)                        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Celery Workers (3-5개)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Queue: instagram_api (concurrency=1, rate limited)                │
│   ├─ fetch_influencer_posts(influencer_id, since_date)              │
│   ├─ get_post_details(media_pk)                                     │
│   └─ verify_post_exists(media_pk)                                   │
│                                                                      │
│   Queue: default (concurrency=4)                                    │
│   ├─ match_post_to_campaign(post_data, campaign_id)                 │
│   ├─ analyze_post_compliance(content_id)                            │
│   └─ calculate_engagement_metrics(content_id)                       │
│                                                                      │
│   Queue: notifications (concurrency=2)                              │
│   ├─ notify_new_content_detected(content_id)                        │
│   └─ notify_content_deleted(content_id)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
1. 새 게시글 감지 플로우
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │  Celery Beat │────▶│   Scanner    │────▶│ Instagram API│
   │  (30분마다)   │     │    Task      │     │  (rate limit)│
   └──────────────┘     └──────────────┘     └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   새 게시글   │
                        │   발견?       │
                        └──────────────┘
                          │Yes      │No
                          ▼         ▼
                   ┌──────────┐   (종료)
                   │ Campaign │
                   │ Matching │
                   └──────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ 요구사항 충족? │
                   └──────────────┘
                     │Yes     │No
                     ▼        ▼
              ┌──────────┐  (무시)
              │  자동등록  │
              │ + 알림    │
              └──────────┘

2. 메트릭 수집 플로우
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │ 등록된 콘텐츠 │────▶│ Metrics Task │────▶│ ContentMetrics│
   │   목록 조회   │     │  (1시간마다)  │     │   테이블 저장  │
   └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 3. Rate Limit 전략

### 3.1 Instagram API 제한

| 항목 | 제한 |
|------|------|
| 요청 간격 | 최소 2초 |
| 분당 요청 | 최대 20회 |
| 시간당 요청 | 최대 200회 |
| 일일 요청 | 최대 1,000회 (안전 기준) |

### 3.2 처리량 계산

```python
# 시나리오: 활성 캠페인 10개, 총 인플루언서 100명

# 새 게시글 스캔 (30분마다)
requests_per_scan = 100  # 인플루언서 수
time_needed = 100 * 3    # 3초 간격 = 300초 = 5분

# 메트릭 업데이트 (1시간마다)
active_contents = 200    # 모니터링 중인 콘텐츠
time_needed = 200 * 3    # 3초 간격 = 600초 = 10분

# 일일 총 API 호출
daily_scans = 48 * 100       # 4,800회 (30분 × 48회 × 100명)
daily_metrics = 24 * 200     # 4,800회 (1시간 × 24회 × 200건)
daily_total = 9,600회        # 제한 초과!

# 해결책: 스마트 스캐닝
```

### 3.3 스마트 스캐닝 전략

```python
# 1. 우선순위 기반 스캐닝
SCAN_PRIORITY = {
    "high": {
        "interval_minutes": 30,
        "condition": "캠페인 시작 후 7일 이내"
    },
    "medium": {
        "interval_minutes": 60,
        "condition": "캠페인 진행 중"
    },
    "low": {
        "interval_minutes": 180,
        "condition": "캠페인 종료 임박 또는 이미 콘텐츠 제출"
    }
}

# 2. 마지막 스캔 시간 기반 필터링
def should_scan_influencer(influencer, campaign):
    last_scanned = influencer.last_post_scanned_at
    priority = get_scan_priority(influencer, campaign)
    interval = SCAN_PRIORITY[priority]["interval_minutes"]

    return datetime.now() - last_scanned > timedelta(minutes=interval)

# 3. 변경 감지 최적화
def get_new_posts_efficiently(influencer):
    # 마지막으로 확인한 게시글 이후의 것만 가져옴
    last_known_post_pk = influencer.last_known_post_pk

    # amount=5로 최소화 (최근 5개만)
    recent_posts = await get_user_medias(influencer.platform_uid, amount=5)

    # last_known_post_pk 이후 게시글만 필터링
    new_posts = [p for p in recent_posts if p.pk > last_known_post_pk]

    return new_posts
```

### 3.4 다중 계정 풀링

```python
# Instagram 계정 풀을 사용하여 Rate Limit 분산
class InstagramClientPool:
    def __init__(self):
        self.clients = []  # 5-10개 계정
        self.current_index = 0

    async def get_available_client(self):
        """Rate limit이 여유있는 클라이언트 반환"""
        for _ in range(len(self.clients)):
            client = self.clients[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.clients)

            if client.can_make_request():
                return client

        # 모든 클라이언트가 제한 중이면 대기
        await asyncio.sleep(60)
        return await self.get_available_client()
```

---

## 4. 태스크 상세 설계

### 4.1 새 게시글 스캔 태스크

```python
# backend/app/tasks/post_scanner.py

from celery import shared_task
from datetime import datetime, timedelta

@shared_task(
    name="scan_active_campaigns",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5분 후 재시도
)
def scan_active_campaigns(self):
    """
    활성 캠페인의 인플루언서들 새 게시글 스캔

    실행 주기: 30분
    예상 소요: 5-15분 (인플루언서 수에 따라)
    """
    # 1. 활성 캠페인 조회
    active_campaigns = Campaign.query.filter(
        Campaign.status == CampaignStatus.ACTIVE,
        Campaign.end_date > datetime.utcnow()
    ).all()

    # 2. 스캔 대상 인플루언서 수집 (중복 제거)
    influencer_campaign_map = {}  # {influencer_id: [campaign_ids]}

    for campaign in active_campaigns:
        for participation in campaign.influencer_participations:
            if participation.is_selected and not has_submitted_content(participation):
                inf_id = participation.influencer_id
                if inf_id not in influencer_campaign_map:
                    influencer_campaign_map[inf_id] = []
                influencer_campaign_map[inf_id].append(campaign.id)

    # 3. 인플루언서별 스캔 태스크 분배
    for influencer_id, campaign_ids in influencer_campaign_map.items():
        fetch_and_match_posts.delay(
            influencer_id=str(influencer_id),
            campaign_ids=[str(c) for c in campaign_ids]
        )


@shared_task(
    name="fetch_and_match_posts",
    bind=True,
    queue="instagram_api",  # Rate limited queue
    rate_limit="20/m",      # 분당 20회
)
def fetch_and_match_posts(self, influencer_id: str, campaign_ids: list):
    """
    특정 인플루언서의 최근 게시글을 가져와서 캠페인과 매칭
    """
    influencer = Influencer.query.get(influencer_id)

    # 1. 최근 게시글 가져오기 (최대 5개)
    try:
        recent_posts = instagram_client.get_user_medias(
            user_pk=influencer.platform_uid,
            amount=5
        )
    except RateLimitError:
        # 재시도 스케줄링
        raise self.retry(countdown=60)

    # 2. 새 게시글 필터링
    last_checked = influencer.last_post_checked_at or datetime.min
    new_posts = [
        p for p in recent_posts
        if p.taken_at and p.taken_at > last_checked
    ]

    if not new_posts:
        # 마지막 체크 시간만 업데이트
        influencer.last_post_checked_at = datetime.utcnow()
        db.session.commit()
        return {"status": "no_new_posts"}

    # 3. 각 캠페인과 매칭
    matched_contents = []

    for campaign_id in campaign_ids:
        campaign = Campaign.query.get(campaign_id)

        for post in new_posts:
            match_result = match_post_to_campaign(post, campaign)

            if match_result["is_match"]:
                # 자동 콘텐츠 등록
                content = auto_register_content(
                    campaign=campaign,
                    influencer=influencer,
                    post=post,
                    match_result=match_result
                )
                matched_contents.append(content.id)

    # 4. 마지막 체크 시간 업데이트
    influencer.last_post_checked_at = datetime.utcnow()
    if new_posts:
        influencer.last_known_post_pk = max(p.pk for p in new_posts)
    db.session.commit()

    return {
        "status": "completed",
        "new_posts_found": len(new_posts),
        "matched_contents": matched_contents
    }
```

### 4.2 캠페인 매칭 로직

```python
# backend/app/tasks/campaign_matcher.py

def match_post_to_campaign(post: InstagramMediaInfo, campaign: Campaign) -> dict:
    """
    게시글이 캠페인 요구사항을 충족하는지 검증

    Returns:
        {
            "is_match": bool,
            "score": float,  # 0-100
            "details": {
                "hashtags": {"required": [...], "found": [...], "missing": [...]},
                "mentions": {"required": [...], "found": [...], "missing": [...]},
                "content_type": {"required": "...", "actual": "...", "match": bool},
                "posted_within_period": bool
            }
        }
    """
    result = {
        "is_match": False,
        "score": 0,
        "details": {}
    }

    caption = post.caption_text or ""
    caption_lower = caption.lower()

    # 1. 해시태그 검증
    required_hashtags = campaign.required_hashtags or []
    found_hashtags = []
    missing_hashtags = []

    for tag in required_hashtags:
        tag_normalized = tag.lower().replace("#", "")
        if f"#{tag_normalized}" in caption_lower or tag_normalized in caption_lower:
            found_hashtags.append(tag)
        else:
            missing_hashtags.append(tag)

    result["details"]["hashtags"] = {
        "required": required_hashtags,
        "found": found_hashtags,
        "missing": missing_hashtags
    }

    # 2. 멘션 검증
    required_mentions = campaign.required_mentions or []
    found_mentions = []
    missing_mentions = []

    for mention in required_mentions:
        mention_normalized = mention.lower().replace("@", "")
        if f"@{mention_normalized}" in caption_lower:
            found_mentions.append(mention)
        else:
            missing_mentions.append(mention)

    result["details"]["mentions"] = {
        "required": required_mentions,
        "found": found_mentions,
        "missing": missing_mentions
    }

    # 3. 콘텐츠 타입 검증
    media_type_map = {1: "photo", 2: "video", 8: "album"}
    actual_type = media_type_map.get(post.media_type, "unknown")
    required_type = campaign.content_type

    type_match = (
        not required_type or
        required_type == actual_type or
        required_type == "any"
    )

    result["details"]["content_type"] = {
        "required": required_type,
        "actual": actual_type,
        "match": type_match
    }

    # 4. 기간 내 게시 여부
    posted_within = (
        campaign.start_date <= post.taken_at <= campaign.end_date
        if post.taken_at else False
    )
    result["details"]["posted_within_period"] = posted_within

    # 5. 최종 판정
    hashtag_pass = len(missing_hashtags) == 0 if required_hashtags else True
    mention_pass = len(missing_mentions) == 0 if required_mentions else True

    result["is_match"] = all([
        hashtag_pass,
        mention_pass,
        type_match,
        posted_within
    ])

    # 6. 점수 계산 (부분 매칭 시 참고용)
    scores = []
    if required_hashtags:
        scores.append(len(found_hashtags) / len(required_hashtags) * 100)
    if required_mentions:
        scores.append(len(found_mentions) / len(required_mentions) * 100)
    if required_type:
        scores.append(100 if type_match else 0)

    result["score"] = sum(scores) / len(scores) if scores else 100

    return result
```

### 4.3 메트릭 수집 태스크

```python
# backend/app/tasks/metrics_collector.py

@shared_task(name="update_content_metrics")
def update_content_metrics():
    """
    등록된 콘텐츠의 메트릭 업데이트

    실행 주기: 1시간
    대상: status가 ACTIVE인 콘텐츠
    """
    # 모니터링 대상 콘텐츠 조회
    active_contents = CampaignContent.query.filter(
        CampaignContent.status.in_([
            ContentStatus.PENDING,
            ContentStatus.APPROVED,
            ContentStatus.MONITORING
        ])
    ).all()

    for content in active_contents:
        collect_single_content_metrics.delay(str(content.id))


@shared_task(
    name="collect_single_content_metrics",
    queue="instagram_api",
    rate_limit="20/m",
)
def collect_single_content_metrics(content_id: str):
    """단일 콘텐츠 메트릭 수집"""
    content = CampaignContent.query.get(content_id)

    try:
        media_info = instagram_client.get_media_info(content.instagram_media_pk)
    except MediaNotFound:
        # 콘텐츠 삭제됨
        content.status = ContentStatus.DELETED
        log_monitoring_event(content, "DELETED", "Post not found")
        db.session.commit()
        return {"status": "deleted"}

    # 메트릭 기록
    metrics = ContentMetrics(
        content_id=content.id,
        like_count=media_info.like_count,
        comment_count=media_info.comment_count,
        play_count=media_info.play_count,
        recorded_at=datetime.utcnow()
    )
    db.session.add(metrics)
    db.session.commit()

    return {
        "status": "collected",
        "likes": media_info.like_count,
        "comments": media_info.comment_count
    }
```

### 4.4 콘텐츠 존재 확인 태스크

```python
# backend/app/tasks/content_checker.py

@shared_task(name="check_content_existence")
def check_content_existence():
    """
    콘텐츠 삭제 여부 확인

    실행 주기: 6시간
    목적: 인플루언서가 게시글을 삭제했는지 감지
    """
    # 정산 전 콘텐츠만 확인 (정산 완료된 건 제외)
    contents_to_check = CampaignContent.query.filter(
        CampaignContent.status.in_([
            ContentStatus.APPROVED,
            ContentStatus.MONITORING
        ]),
        CampaignContent.settled_at.is_(None)
    ).all()

    for content in contents_to_check:
        verify_content_exists.delay(str(content.id))


@shared_task(
    name="verify_content_exists",
    queue="instagram_api",
    rate_limit="20/m",
)
def verify_content_exists(content_id: str):
    """개별 콘텐츠 존재 확인"""
    content = CampaignContent.query.get(content_id)

    try:
        instagram_client.get_media_info(content.instagram_media_pk)

        # 존재 확인 로그
        log = MonitoringLog(
            content_id=content.id,
            status=content.status,
            check_result={"exists": True}
        )
        db.session.add(log)

    except MediaNotFound:
        # 삭제 감지!
        old_status = content.status
        content.status = ContentStatus.DELETED

        log = MonitoringLog(
            content_id=content.id,
            status=ContentStatus.DELETED,
            check_result={"exists": False, "previous_status": old_status.value}
        )
        db.session.add(log)

        # 광고주에게 알림
        notify_content_deleted.delay(
            content_id=str(content.id),
            campaign_id=str(content.campaign_id)
        )

    db.session.commit()
```

---

## 5. Celery 설정

### 5.1 Celery 앱 설정

```python
# backend/app/tasks/__init__.py

from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "tagbuy",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=[
        "app.tasks.post_scanner",
        "app.tasks.metrics_collector",
        "app.tasks.content_checker",
        "app.tasks.notifications",
    ]
)

# Celery 설정
celery_app.conf.update(
    # 태스크 설정
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=True,

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
        "app.tasks.post_scanner.*": {"queue": "instagram_api"},
        "app.tasks.metrics_collector.*": {"queue": "instagram_api"},
        "app.tasks.content_checker.*": {"queue": "instagram_api"},
        "app.tasks.notifications.*": {"queue": "notifications"},
    },

    # Rate Limit (instagram_api 큐)
    task_annotations={
        "app.tasks.post_scanner.fetch_and_match_posts": {
            "rate_limit": "20/m"
        },
        "app.tasks.metrics_collector.collect_single_content_metrics": {
            "rate_limit": "20/m"
        },
    }
)

# Beat 스케줄 (주기적 태스크)
celery_app.conf.beat_schedule = {
    # 새 게시글 스캔 (30분마다)
    "scan-active-campaigns": {
        "task": "scan_active_campaigns",
        "schedule": crontab(minute="*/30"),
        "options": {"queue": "default"}
    },

    # 메트릭 수집 (1시간마다)
    "update-content-metrics": {
        "task": "update_content_metrics",
        "schedule": crontab(minute=0),  # 매시 정각
        "options": {"queue": "default"}
    },

    # 콘텐츠 존재 확인 (6시간마다)
    "check-content-existence": {
        "task": "check_content_existence",
        "schedule": crontab(hour="*/6", minute=30),
        "options": {"queue": "default"}
    },

    # 인플루언서 프로필 동기화 (매일 새벽 3시)
    "sync-influencer-profiles": {
        "task": "sync_influencer_profiles",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "default"}
    },
}
```

### 5.2 Docker Compose 설정

```yaml
# docker-compose.yml (추가)

services:
  # ... 기존 서비스 ...

  celery-worker-api:
    build: ./backend
    command: celery -A app.tasks worker -Q instagram_api -c 1 -l info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - db
    restart: unless-stopped

  celery-worker-default:
    build: ./backend
    command: celery -A app.tasks worker -Q default -c 4 -l info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - db
    restart: unless-stopped

  celery-worker-notifications:
    build: ./backend
    command: celery -A app.tasks worker -Q notifications -c 2 -l info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - db
    restart: unless-stopped

  celery-beat:
    build: ./backend
    command: celery -A app.tasks beat -l info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
    restart: unless-stopped

  flower:
    build: ./backend
    command: celery -A app.tasks flower --port=5555
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=${REDIS_URL}
    depends_on:
      - redis
      - celery-worker-default
```

---

## 6. 데이터 모델 추가

### 6.1 Influencer 모델 확장

```python
# backend/app/models/influencer.py (추가 필드)

class Influencer(Base):
    # ... 기존 필드 ...

    # 스캐닝 관련
    last_post_checked_at = Column(DateTime(timezone=True))  # 마지막 게시글 확인 시간
    last_known_post_pk = Column(String(50))                  # 마지막으로 확인한 게시글 PK
    scan_priority = Column(String(20), default="medium")     # high, medium, low
```

### 6.2 스캔 로그 테이블 (선택)

```python
# backend/app/models/scan_log.py

class InfluencerScanLog(Base):
    """인플루언서 스캔 기록"""
    __tablename__ = "influencer_scan_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    influencer_id = Column(UUID(as_uuid=True), ForeignKey("influencers.id"), index=True)

    # 스캔 결과
    posts_checked = Column(Integer, default=0)
    new_posts_found = Column(Integer, default=0)
    matched_campaigns = Column(Integer, default=0)

    # 에러
    error_message = Column(Text)

    # 타임스탬프
    scanned_at = Column(DateTime(timezone=True), default=datetime.utcnow)
```

---

## 7. 파일 구조

```
backend/app/tasks/
├── __init__.py              # Celery 앱 & Beat 스케줄 설정
├── post_scanner.py          # 새 게시글 스캔 태스크
├── campaign_matcher.py      # 캠페인 매칭 로직
├── metrics_collector.py     # 메트릭 수집 태스크
├── content_checker.py       # 콘텐츠 존재 확인 태스크
├── notifications.py         # 알림 태스크
└── utils.py                 # 공통 유틸리티
```

---

## 8. 실행 방법

### 8.1 로컬 개발

```bash
# 터미널 1: Redis
docker run -p 6379:6379 redis:7-alpine

# 터미널 2: Celery Worker (Instagram API)
cd backend
celery -A app.tasks worker -Q instagram_api -c 1 -l info

# 터미널 3: Celery Worker (Default)
celery -A app.tasks worker -Q default -c 4 -l info

# 터미널 4: Celery Beat (스케줄러)
celery -A app.tasks beat -l info

# 터미널 5: Flower (모니터링 UI) - 선택
celery -A app.tasks flower --port=5555
```

### 8.2 Docker Compose

```bash
docker-compose up -d celery-worker-api celery-worker-default celery-beat flower
```

### 8.3 수동 태스크 실행 (테스트)

```python
# Python Shell에서
from app.tasks.post_scanner import scan_active_campaigns, fetch_and_match_posts

# 전체 스캔 실행
scan_active_campaigns.delay()

# 특정 인플루언서만 스캔
fetch_and_match_posts.delay(
    influencer_id="uuid-here",
    campaign_ids=["campaign-uuid-1", "campaign-uuid-2"]
)
```

---

## 9. 모니터링 & 알림

### 9.1 Flower 대시보드

- URL: http://localhost:5555
- 기능:
  - 실시간 태스크 상태 확인
  - 워커 상태 모니터링
  - 큐 길이 확인
  - 실패한 태스크 재시도

### 9.2 알림 설정

```python
# backend/app/tasks/notifications.py

@shared_task(name="notify_new_content_detected")
def notify_new_content_detected(content_id: str, campaign_id: str):
    """새 콘텐츠 감지 시 광고주에게 알림"""
    content = CampaignContent.query.get(content_id)
    campaign = Campaign.query.get(campaign_id)

    # 이메일, 푸시, 카카오톡 등
    send_notification(
        user_id=campaign.advertiser_id,
        type="NEW_CONTENT",
        data={
            "campaign_title": campaign.title,
            "influencer_name": content.influencer.username,
            "post_url": content.post_url
        }
    )


@shared_task(name="notify_content_deleted")
def notify_content_deleted(content_id: str, campaign_id: str):
    """콘텐츠 삭제 감지 시 알림"""
    # 광고주 + 관리자에게 알림
    pass
```

---

## 10. 예상 비용 & 확장

### 10.1 인프라 비용 (AWS 기준)

| 리소스 | 스펙 | 월 비용 |
|--------|------|---------|
| Redis (ElastiCache) | t3.micro | ~$15 |
| Celery Workers (ECS) | 0.25 vCPU × 3 | ~$30 |
| Total | | ~$45/월 |

### 10.2 확장 시나리오

```
현재: 인플루언서 100명, 캠페인 10개
- Worker 3개로 충분
- 일일 API 호출 ~5,000회

확장: 인플루언서 1,000명, 캠페인 100개
- Instagram 계정 풀 5→10개로 확장
- Worker 3→6개로 확장
- 일일 API 호출 ~50,000회
- 스마트 스캐닝 필수
```

---

## 11. 다음 단계

1. **Phase 1** (필수)
   - [ ] Celery 기본 설정 구현
   - [ ] 새 게시글 스캔 태스크 구현
   - [ ] 캠페인 매칭 로직 구현

2. **Phase 2** (중요)
   - [ ] 메트릭 수집 태스크 구현
   - [ ] 콘텐츠 삭제 감지 구현
   - [ ] 알림 시스템 연동

3. **Phase 3** (개선)
   - [ ] 스마트 스캐닝 전략 적용
   - [ ] Flower 모니터링 설정
   - [ ] 성능 최적화
