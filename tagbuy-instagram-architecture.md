# TagBuy Instagram 연동 아키텍처 설계서

**버전**: 1.0
**작성일**: 2025년 12월 17일
**기반**: tagbuy-service-plan.md + instagrapi 라이브러리 분석

---

## 1. 개요

### 1.1 목적
TagBuy 서비스의 핵심 기능인 인플루언서 검색, 콘텐츠 모니터링, 성과 추적을 위한 Instagram 데이터 수집 및 분석 시스템 설계

### 1.2 instagrapi 라이브러리 선택 이유
- **비공식 Private API**: 공식 API 제한 우회 가능
- **풍부한 기능**: 유저 정보, 미디어, 인사이트, 해시태그 등 지원
- **Python 기반**: 백엔드 통합 용이
- **주의사항**: Instagram 정책 위반 가능성, 계정 밴 리스크 존재 (프로덕션에서는 HikerAPI 등 SaaS 고려)

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        TagBuy Backend                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Campaign    │  │ Influencer  │  │ Content Monitoring      │  │
│  │ Service     │  │ Service     │  │ Service                 │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                  ┌───────▼───────┐                               │
│                  │ Instagram     │                               │
│                  │ Integration   │                               │
│                  │ Layer         │                               │
│                  └───────┬───────┘                               │
│                          │                                       │
├──────────────────────────┼───────────────────────────────────────┤
│                  ┌───────▼───────┐                               │
│                  │  instagrapi   │                               │
│                  │  Client Pool  │                               │
│                  └───────┬───────┘                               │
│                          │                                       │
│           ┌──────────────┼──────────────┐                        │
│           ▼              ▼              ▼                        │
│    ┌──────────┐   ┌──────────┐   ┌──────────┐                    │
│    │ Proxy 1  │   │ Proxy 2  │   │ Proxy N  │                    │
│    └──────────┘   └──────────┘   └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Instagram   │
                    │  Servers     │
                    └──────────────┘
```

### 2.2 핵심 컴포넌트

#### A. Instagram Integration Layer
- **역할**: instagrapi 클라이언트 관리 및 API 추상화
- **책임**:
  - 다중 계정/프록시 관리
  - Rate Limiting 처리
  - Challenge Resolver (2FA, CAPTCHA)
  - 세션 지속성 관리

#### B. Influencer Service
- **역할**: 인플루언서 검색, 프로필 분석, 사기 탐지
- **주요 기능**:
  - 카테고리/팔로워수 기반 검색
  - 인게이지먼트율 계산
  - 가짜 팔로워 탐지

#### C. Content Monitoring Service
- **역할**: 캠페인 콘텐츠 모니터링 및 증빙
- **주요 기능**:
  - 포스팅 존재 여부 확인
  - 삭제/비공개 감지
  - 스크린샷 캡처

---

## 3. instagrapi 기능 매핑

### 3.1 TagBuy 기능 → instagrapi 메서드

| TagBuy 기능 | instagrapi 메서드 | 설명 |
|-------------|-------------------|------|
| **인플루언서 검색** | | |
| 유저명으로 조회 | `user_info_by_username(username)` | User 객체 반환 |
| 해시태그 기반 탐색 | `hashtag_medias_top(name, amount)` | 인기 게시물 조회 |
| 팔로워 목록 | `user_followers(user_id, amount)` | 팔로워 분석용 |
| **프로필 정보** | | |
| 기본 정보 | `User.follower_count, following_count, media_count` | 팔로워 수 등 |
| 카테고리 | `User.category_name, business_category_name` | 비즈니스 카테고리 |
| 비즈니스 여부 | `User.is_business` | 비즈니스 계정 확인 |
| 연락처 | `User.public_email, contact_phone_number` | 비즈니스 연락처 |
| **콘텐츠 모니터링** | | |
| 미디어 조회 | `media_info(media_pk)` | 게시물 존재 확인 |
| URL → PK 변환 | `media_pk_from_url(url)` | URL에서 미디어 ID 추출 |
| 유저 미디어 목록 | `user_medias(user_id, amount)` | 최근 게시물 조회 |
| **성과 데이터** | | |
| 미디어 인사이트 | `insights_media(media_pk)` | 도달, 노출 등 (비즈니스 계정) |
| 좋아요 유저 | `media_likers(media_pk)` | 좋아요 한 유저 목록 |
| 댓글 | `media_comments(media_pk)` | 댓글 목록 |

### 3.2 데이터 타입 매핑

```python
# instagrapi User 타입 → TagBuy Influencer 모델
class Influencer:
    # From instagrapi User
    pk: str                      # User.pk
    username: str                # User.username
    full_name: str               # User.full_name
    profile_pic_url: str         # User.profile_pic_url
    follower_count: int          # User.follower_count
    following_count: int         # User.following_count
    media_count: int             # User.media_count
    is_verified: bool            # User.is_verified
    is_business: bool            # User.is_business
    category: str                # User.category_name
    biography: str               # User.biography

    # TagBuy 계산 필드
    engagement_rate: float       # 계산: (avg_likes + avg_comments) / follower_count
    fake_follower_score: float   # AI 분석 결과
    tier: str                    # nano/micro/macro/mega
```

---

## 4. 핵심 기능 상세 설계

### 4.1 인플루언서 검색 시스템

#### 4.1.1 검색 전략

```python
class InfluencerSearchService:
    """
    인플루언서 검색 서비스
    """

    async def search_by_hashtag(
        self,
        hashtags: List[str],
        min_followers: int = 1000,
        max_followers: int = 100000,
        category: str = None
    ) -> List[Influencer]:
        """
        해시태그 기반 인플루언서 탐색

        1. 해시태그별 상위 게시물 수집
        2. 게시물 작성자 유저 정보 조회
        3. 팔로워 수, 카테고리 필터링
        4. 인게이지먼트율 계산
        5. 정렬 및 반환
        """
        pass

    async def search_by_similar_accounts(
        self,
        seed_username: str,
        amount: int = 50
    ) -> List[Influencer]:
        """
        유사 계정 기반 탐색

        1. 시드 계정의 팔로워 분석
        2. 유사 카테고리 계정 추출
        3. 필터링 및 반환
        """
        pass
```

#### 4.1.2 인플루언서 티어 분류

```python
def classify_tier(follower_count: int) -> str:
    """
    팔로워 수 기반 티어 분류
    - Nano: 1K - 10K
    - Micro: 10K - 100K
    - Macro: 100K - 1M
    - Mega: 1M+
    """
    if follower_count < 10_000:
        return "nano"
    elif follower_count < 100_000:
        return "micro"
    elif follower_count < 1_000_000:
        return "macro"
    else:
        return "mega"
```

### 4.2 콘텐츠 모니터링 시스템

#### 4.2.1 모니터링 워크플로우

```
캠페인 콘텐츠 제출
        │
        ▼
┌───────────────────┐
│ URL 파싱 및       │
│ media_pk 추출     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 초기 콘텐츠 검증   │
│ - 존재 여부        │
│ - 가이드라인 준수  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌─────────────────┐
│ 스케줄러 등록      │────▶│ 매일 크롤링      │
│ (D+0 ~ D+7)       │     │ (Cron Job)      │
└───────────────────┘     └────────┬────────┘
                                   │
                          ┌────────▼────────┐
                          │ 상태 체크        │
                          │ - 존재 여부      │
                          │ - 공개/비공개    │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐   ┌──────────┐
              │ 정상     │  │ 삭제됨   │   │ 비공개   │
              └──────────┘  └────┬─────┘   └────┬─────┘
                                 │              │
                                 ▼              ▼
                          ┌───────────────────────┐
                          │ 알림 발송 & 정산 취소  │
                          └───────────────────────┘
```

#### 4.2.2 모니터링 코드 구조

```python
class ContentMonitoringService:
    """
    콘텐츠 모니터링 서비스
    """

    async def verify_content(self, post_url: str) -> ContentVerification:
        """
        콘텐츠 초기 검증

        Returns:
            ContentVerification:
                - exists: bool
                - is_public: bool
                - media_info: Media
                - screenshot_url: str
                - verification_time: datetime
        """
        media_pk = self.client.media_pk_from_url(post_url)

        try:
            media = self.client.media_info(media_pk)
            return ContentVerification(
                exists=True,
                is_public=True,
                media_info=media,
                screenshot_url=await self.capture_screenshot(post_url)
            )
        except MediaNotFound:
            return ContentVerification(exists=False)

    async def check_content_status(self, media_pk: str) -> ContentStatus:
        """
        콘텐츠 상태 체크 (스케줄러에서 호출)
        """
        try:
            media = self.client.media_info(media_pk)
            return ContentStatus.ACTIVE
        except MediaNotFound:
            return ContentStatus.DELETED
        except PrivateError:
            return ContentStatus.PRIVATE
```

### 4.3 AI 사기 탐지 시스템

#### 4.3.1 탐지 지표

```python
class FraudDetectionService:
    """
    가짜 팔로워 / 사기 계정 탐지
    """

    async def analyze_account(self, username: str) -> FraudAnalysis:
        """
        계정 진정성 분석
        """
        user = await self.get_user_info(username)
        recent_posts = await self.get_recent_posts(user.pk, amount=12)
        sample_followers = await self.get_sample_followers(user.pk, amount=100)

        return FraudAnalysis(
            engagement_rate=self._calc_engagement_rate(user, recent_posts),
            follower_quality_score=self._analyze_followers(sample_followers),
            growth_pattern_score=self._analyze_growth_pattern(user),
            comment_quality_score=self._analyze_comments(recent_posts),
            overall_trust_score=self._calculate_trust_score(...)
        )

    def _calc_engagement_rate(self, user: User, posts: List[Media]) -> float:
        """
        인게이지먼트율 계산
        = (평균 좋아요 + 평균 댓글) / 팔로워수 * 100

        정상 범위:
        - Nano (1K-10K): 3-8%
        - Micro (10K-100K): 2-5%
        - Macro (100K+): 1-3%
        """
        if not posts:
            return 0.0

        avg_likes = sum(p.like_count for p in posts) / len(posts)
        avg_comments = sum(p.comment_count for p in posts) / len(posts)

        return ((avg_likes + avg_comments) / user.follower_count) * 100

    def _analyze_followers(self, followers: List[UserShort]) -> float:
        """
        팔로워 품질 분석

        의심 지표:
        - 프로필 사진 없음
        - 게시물 0개
        - 팔로잉 >> 팔로워 (1000:10 등)
        - 의미없는 유저명 (랜덤 문자열)
        """
        suspicious_count = 0

        for follower in followers:
            if self._is_suspicious_account(follower):
                suspicious_count += 1

        fake_ratio = suspicious_count / len(followers)
        return max(0, 100 - (fake_ratio * 100))
```

#### 4.3.2 신뢰도 점수 계산

```python
def calculate_trust_score(
    engagement_rate: float,
    follower_quality: float,
    growth_pattern: float,
    comment_quality: float
) -> TrustScore:
    """
    종합 신뢰도 점수 (0-100)

    가중치:
    - 인게이지먼트율: 30%
    - 팔로워 품질: 30%
    - 성장 패턴: 20%
    - 댓글 품질: 20%
    """
    score = (
        engagement_rate * 0.3 +
        follower_quality * 0.3 +
        growth_pattern * 0.2 +
        comment_quality * 0.2
    )

    if score >= 80:
        return TrustScore(score=score, level="VERIFIED", color="green")
    elif score >= 60:
        return TrustScore(score=score, level="NORMAL", color="yellow")
    else:
        return TrustScore(score=score, level="SUSPICIOUS", color="red")
```

### 4.4 성과 데이터 수집

#### 4.4.1 데이터 수집 전략

```python
class PerformanceTrackingService:
    """
    캠페인 성과 추적
    """

    async def collect_metrics(
        self,
        media_pk: str,
        influencer_pk: str
    ) -> CampaignMetrics:
        """
        성과 지표 수집

        Note: insights_media()는 비즈니스 계정 + 본인 콘텐츠만 가능
              타인 콘텐츠는 공개 데이터만 수집 가능
        """
        media = self.client.media_info(media_pk)

        # 공개 데이터 (항상 수집 가능)
        public_metrics = {
            "like_count": media.like_count,
            "comment_count": media.comment_count,
            "play_count": media.play_count,  # 비디오인 경우
            "taken_at": media.taken_at,
        }

        # 댓글 분석
        comments = self.client.media_comments(media_pk)
        comment_analysis = self._analyze_comments(comments)

        return CampaignMetrics(
            **public_metrics,
            sentiment_score=comment_analysis.sentiment,
            engagement_quality=comment_analysis.quality
        )

    async def generate_report(
        self,
        campaign_id: str
    ) -> CampaignReport:
        """
        캠페인 리포트 생성
        """
        # 캠페인의 모든 콘텐츠 성과 집계
        pass
```

---

## 5. 인프라 설계

### 5.1 클라이언트 풀 관리

```python
class InstagrapiClientPool:
    """
    다중 계정 + 프록시 관리

    Rate Limit 회피 및 안정성을 위해 여러 계정/프록시 사용
    """

    def __init__(self):
        self.clients: List[ManagedClient] = []
        self.current_index = 0

    def add_client(
        self,
        username: str,
        password: str,
        proxy: str = None
    ):
        """
        클라이언트 추가
        """
        client = Client()

        if proxy:
            client.set_proxy(proxy)

        client.login(username, password)
        client.dump_settings(f"sessions/{username}.json")

        self.clients.append(ManagedClient(
            client=client,
            username=username,
            last_request=None,
            request_count=0
        ))

    def get_client(self) -> Client:
        """
        라운드 로빈 방식으로 클라이언트 반환
        Rate Limit 고려하여 쿨다운 시간 체크
        """
        for _ in range(len(self.clients)):
            managed = self.clients[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.clients)

            if self._is_available(managed):
                return managed.client

        raise NoAvailableClientError("All clients are in cooldown")

    def _is_available(self, managed: ManagedClient) -> bool:
        """
        쿨다운 체크 (분당 요청 수 제한)
        """
        if managed.last_request is None:
            return True

        elapsed = time.time() - managed.last_request
        return elapsed > 2  # 최소 2초 간격
```

### 5.2 세션 관리

```python
class SessionManager:
    """
    세션 지속성 관리
    """

    def __init__(self, storage_path: str = "sessions/"):
        self.storage_path = storage_path

    def save_session(self, client: Client, username: str):
        """
        세션 저장 (재로그인 방지)
        """
        client.dump_settings(f"{self.storage_path}{username}.json")

    def load_session(self, username: str, password: str) -> Client:
        """
        세션 로드 또는 새 로그인
        """
        session_file = f"{self.storage_path}{username}.json"
        client = Client()

        if os.path.exists(session_file):
            client.load_settings(session_file)
            try:
                client.login(username, password)
                return client
            except Exception:
                # 세션 만료, 재로그인
                pass

        client.login(username, password)
        self.save_session(client, username)
        return client
```

### 5.3 Challenge Resolver

```python
class ChallengeHandler:
    """
    Instagram 보안 챌린지 처리
    - Email/SMS 인증
    - CAPTCHA
    - 2FA
    """

    def setup_challenge_resolver(self, client: Client):
        """
        챌린지 핸들러 설정
        """
        client.challenge_code_handler = self.challenge_code_handler
        client.change_password_handler = self.change_password_handler

    def challenge_code_handler(self, username: str, choice) -> str:
        """
        Email/SMS 인증 코드 처리

        프로덕션에서는:
        1. 이메일 수신 서버 연동
        2. SMS 수신 서비스 연동
        3. 관리자 알림 및 수동 입력 UI
        """
        # 알림 발송 후 대기
        code = self.wait_for_verification_code(username, choice)
        return code
```

---

## 6. 데이터베이스 설계

### 6.1 Instagram 관련 테이블

```sql
-- 인플루언서 정보 캐시
CREATE TABLE influencers (
    id UUID PRIMARY KEY,
    instagram_pk VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(200),
    profile_pic_url TEXT,
    follower_count INTEGER,
    following_count INTEGER,
    media_count INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    is_business BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    biography TEXT,
    engagement_rate DECIMAL(5, 2),
    trust_score DECIMAL(5, 2),
    tier VARCHAR(20), -- nano, micro, macro, mega
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 콘텐츠 모니터링
CREATE TABLE campaign_contents (
    id UUID PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    influencer_id UUID REFERENCES influencers(id),
    instagram_media_pk VARCHAR(50) NOT NULL,
    post_url TEXT NOT NULL,
    post_type VARCHAR(20), -- photo, video, carousel, reel, story
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, deleted, private
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    screenshot_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 성과 데이터 히스토리
CREATE TABLE content_metrics (
    id UUID PRIMARY KEY,
    content_id UUID REFERENCES campaign_contents(id),
    like_count INTEGER,
    comment_count INTEGER,
    play_count INTEGER,
    save_count INTEGER,
    share_count INTEGER,
    reach_count INTEGER,
    impression_count INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- 모니터링 로그
CREATE TABLE monitoring_logs (
    id UUID PRIMARY KEY,
    content_id UUID REFERENCES campaign_contents(id),
    status VARCHAR(20),
    check_result JSONB,
    checked_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. API 설계

### 7.1 인플루언서 검색 API

```yaml
POST /api/v1/influencers/search
Request:
  {
    "hashtags": ["뷰티", "스킨케어"],
    "min_followers": 10000,
    "max_followers": 100000,
    "categories": ["Beauty", "Fashion"],
    "min_engagement_rate": 2.0,
    "min_trust_score": 60,
    "limit": 50
  }

Response:
  {
    "influencers": [
      {
        "id": "uuid",
        "username": "beauty_creator",
        "full_name": "뷰티 크리에이터",
        "profile_pic_url": "https://...",
        "follower_count": 45000,
        "engagement_rate": 4.2,
        "trust_score": 85,
        "tier": "micro",
        "category": "Beauty",
        "recent_avg_likes": 1800,
        "recent_avg_comments": 120
      }
    ],
    "total": 150,
    "page": 1
  }
```

### 7.2 콘텐츠 검증 API

```yaml
POST /api/v1/campaigns/{campaign_id}/contents/verify
Request:
  {
    "post_url": "https://www.instagram.com/p/ABC123/"
  }

Response:
  {
    "verification": {
      "exists": true,
      "is_public": true,
      "media_pk": "123456789",
      "media_type": "photo",
      "like_count": 500,
      "comment_count": 30,
      "taken_at": "2025-12-17T10:00:00Z",
      "screenshot_url": "https://storage.../screenshot.png",
      "ai_analysis": {
        "guideline_compliance": 95,
        "hashtags_found": ["#광고", "#뷰티"],
        "brand_mentioned": true,
        "estimated_reach": 15000
      }
    }
  }
```

---

## 8. 스케줄링 및 작업 큐

### 8.1 정기 작업

```python
# Celery Beat 스케줄
CELERYBEAT_SCHEDULE = {
    # 콘텐츠 상태 체크 (매 시간)
    'check-content-status': {
        'task': 'tasks.content.check_all_active_contents',
        'schedule': crontab(minute=0),
    },

    # 인플루언서 정보 동기화 (매일 새벽 3시)
    'sync-influencer-data': {
        'task': 'tasks.influencer.sync_all_influencers',
        'schedule': crontab(hour=3, minute=0),
    },

    # 성과 데이터 수집 (4시간마다)
    'collect-metrics': {
        'task': 'tasks.metrics.collect_campaign_metrics',
        'schedule': crontab(minute=0, hour='*/4'),
    },
}
```

### 8.2 작업 큐 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        Redis Queue                          │
├─────────────────────────────────────────────────────────────┤
│  high_priority    │  인플루언서 검색, 콘텐츠 검증           │
│  default          │  성과 데이터 수집                       │
│  low_priority     │  정기 동기화, 리포트 생성               │
│  monitoring       │  콘텐츠 상태 체크 (전용)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 에러 처리 및 재시도

### 9.1 에러 유형별 처리

```python
class InstagramErrorHandler:

    RETRY_ERRORS = [
        "rate_limit_exceeded",
        "checkpoint_required",
        "temporarily_unavailable"
    ]

    NO_RETRY_ERRORS = [
        "user_not_found",
        "media_not_found",
        "account_suspended"
    ]

    def handle_error(self, error: Exception, context: dict):
        """
        에러 유형별 처리
        """
        if isinstance(error, RateLimitError):
            # 다른 클라이언트로 전환 후 재시도
            return self.switch_client_and_retry(context)

        elif isinstance(error, ChallengeRequired):
            # 챌린지 해결 프로세스
            return self.resolve_challenge(context)

        elif isinstance(error, (UserNotFound, MediaNotFound)):
            # 재시도 없이 결과 반환
            return ErrorResult(retryable=False, error=str(error))

        else:
            # 일반 에러, 지수 백오프 재시도
            return self.exponential_backoff_retry(context)
```

### 9.2 재시도 정책

```python
@celery.task(
    bind=True,
    autoretry_for=(RateLimitError, TemporaryError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5
)
def fetch_user_info(self, username: str):
    """
    지수 백오프 + 지터를 적용한 재시도
    """
    try:
        return instagram_service.get_user_info(username)
    except PermanentError as e:
        # 재시도하지 않고 실패 처리
        raise Reject(e, requeue=False)
```

---

## 10. 보안 및 리스크 관리

### 10.1 계정 보안

```yaml
계정 관리 원칙:
  - 운영용 Instagram 계정 분리 (개인 계정 사용 금지)
  - 2FA 필수 활성화
  - 세션 정보 암호화 저장
  - 계정별 요청 로그 기록

프록시 관리:
  - Residential 프록시 사용 권장
  - IP 로테이션 설정
  - 지역별 프록시 풀 분리
```

### 10.2 Rate Limiting

```yaml
요청 제한 (보수적 설정):
  - 분당 요청: 최대 20회/계정
  - 시간당 요청: 최대 200회/계정
  - 일일 요청: 최대 1000회/계정

  검색 관련:
  - user_info: 10초 간격
  - user_medias: 15초 간격
  - hashtag_medias: 20초 간격
```

### 10.3 Instagram 정책 대응

```yaml
리스크 요소:
  - 비공식 API 사용으로 인한 계정 정지 가능성
  - Instagram 정책 변경에 따른 기능 중단 가능성

대응 방안:
  1. 다중 계정 운영 (계정 밴 시 대체)
  2. HikerAPI 등 SaaS 백업 연동
  3. 공식 Instagram Basic Display API 병행 사용 (제한적)
  4. 정책 모니터링 및 빠른 대응 체계
```

---

## 11. 프로덕션 고려사항

### 11.1 개발 vs 프로덕션

| 구분 | 개발 환경 | 프로덕션 환경 |
|------|----------|--------------|
| 클라이언트 | instagrapi 직접 | HikerAPI SaaS + instagrapi 폴백 |
| 계정 수 | 1-2개 | 10개+ (로드 밸런싱) |
| 프록시 | 없음 또는 무료 | Residential 프록시 풀 |
| 모니터링 | 기본 로깅 | 전문 APM (Datadog, Sentry) |

### 11.2 확장 계획

```yaml
Phase 1 (MVP):
  - instagrapi 기반 기본 기능 구현
  - 단일 계정 운영
  - 수동 챌린지 해결

Phase 2 (성장기):
  - 다중 계정 + 프록시 풀
  - 자동 챌린지 해결
  - HikerAPI 연동

Phase 3 (성숙기):
  - 자체 인프라 구축
  - ML 기반 사기 탐지 고도화
  - 실시간 모니터링 시스템
```

---

## 12. 다음 단계

### 12.1 즉시 구현 가능 (MVP)

1. **Instagram Integration Layer**
   - instagrapi 클라이언트 래퍼
   - 기본 세션 관리
   - 에러 핸들링

2. **Influencer Service (기본)**
   - 유저명 기반 프로필 조회
   - 인게이지먼트율 계산
   - 기본 필터링

3. **Content Monitoring (기본)**
   - URL → media_pk 변환
   - 콘텐츠 존재 여부 확인
   - 기본 메트릭 수집

### 12.2 우선순위

```
[High] 인플루언서 프로필 조회 및 검증
[High] 콘텐츠 URL 검증 및 모니터링
[Medium] 해시태그 기반 인플루언서 탐색
[Medium] 성과 데이터 수집 (기본 메트릭)
[Low] AI 사기 탐지 고도화
[Low] 실시간 알림 시스템
```

---

## 부록: instagrapi 주요 메서드 레퍼런스

```python
# 유저 관련
cl.user_info_by_username(username)      # User 객체 반환
cl.user_id_from_username(username)      # user_pk 반환
cl.user_followers(user_pk, amount)      # 팔로워 목록
cl.user_following(user_pk, amount)      # 팔로잉 목록
cl.user_medias(user_pk, amount)         # 유저 게시물

# 미디어 관련
cl.media_pk_from_url(url)               # URL → media_pk
cl.media_info(media_pk)                 # Media 객체 반환
cl.media_likers(media_pk)               # 좋아요 한 유저
cl.media_comments(media_pk)             # 댓글 목록

# 해시태그 관련
cl.hashtag_info(name)                   # Hashtag 객체
cl.hashtag_medias_top(name, amount)     # 인기 게시물
cl.hashtag_medias_recent(name, amount)  # 최신 게시물

# 인사이트 (비즈니스 계정)
cl.insights_account()                   # 계정 인사이트
cl.insights_media(media_pk)             # 게시물 인사이트
```
