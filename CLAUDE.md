# TagBuy 프로젝트 개발 지침

## 프로젝트 개요

TagBuy는 **PG + 에스크로 기반 인플루언서 마케팅 플랫폼**입니다.

**핵심 가치**: 에스크로 0.5% + PG 실비, 10분 만에 정산받는 인플루언서 마케팅 플랫폼

### 주요 문서
- `tagbuy-service-plan.md`: 서비스 기획서 (비즈니스 로직, 사용자 플로우)
- `tagbuy-instagram-architecture.md`: Instagram 연동 기술 설계서

---

## 기술 스택

### Backend
- **언어**: Python 3.11+
- **프레임워크**: FastAPI
- **ORM**: SQLAlchemy 2.0 + Alembic (마이그레이션)
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **작업 큐**: Celery + Redis
- **Instagram API**: instagrapi (개발), HikerAPI (프로덕션 백업)

### Frontend (추후)
- **프레임워크**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **상태관리**: Zustand 또는 React Query

### 인프라
- **컨테이너**: Docker + Docker Compose
- **배포**: AWS ECS 또는 Railway
- **모니터링**: Sentry + CloudWatch

---

## 프로젝트 구조

```
tagbuy/
├── CLAUDE.md                          # 이 파일
├── tagbuy-service-plan.md             # 서비스 기획서
├── tagbuy-instagram-architecture.md   # Instagram 연동 설계서
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI 앱 진입점
│   │   ├── config.py                  # 설정 관리
│   │   │
│   │   ├── api/                       # API 라우터
│   │   │   ├── v1/
│   │   │   │   ├── campaigns.py
│   │   │   │   ├── influencers.py
│   │   │   │   ├── contents.py
│   │   │   │   └── payments.py
│   │   │   └── deps.py                # 의존성 주입
│   │   │
│   │   ├── core/                      # 핵심 모듈
│   │   │   ├── security.py
│   │   │   ├── exceptions.py
│   │   │   └── constants.py
│   │   │
│   │   ├── models/                    # SQLAlchemy 모델
│   │   │   ├── user.py
│   │   │   ├── campaign.py
│   │   │   ├── influencer.py
│   │   │   └── content.py
│   │   │
│   │   ├── schemas/                   # Pydantic 스키마
│   │   │   ├── user.py
│   │   │   ├── campaign.py
│   │   │   └── influencer.py
│   │   │
│   │   ├── services/                  # 비즈니스 로직
│   │   │   ├── campaign_service.py
│   │   │   ├── influencer_service.py
│   │   │   ├── content_service.py
│   │   │   └── payment_service.py
│   │   │
│   │   ├── integrations/              # 외부 연동
│   │   │   ├── instagram/
│   │   │   │   ├── client.py          # instagrapi 래퍼
│   │   │   │   ├── client_pool.py     # 다중 계정 관리
│   │   │   │   ├── session_manager.py
│   │   │   │   └── services/
│   │   │   │       ├── user_service.py
│   │   │   │       ├── media_service.py
│   │   │   │       └── monitoring_service.py
│   │   │   │
│   │   │   └── bootpay/               # PG/에스크로 연동
│   │   │       ├── client.py
│   │   │       └── escrow_service.py
│   │   │
│   │   └── tasks/                     # Celery 태스크
│   │       ├── __init__.py            # Celery 앱 & Beat 스케줄 설정
│   │       ├── post_scanner.py        # 새 게시글 스캔 & 캠페인 매칭
│   │       ├── campaign_matcher.py    # 캠페인 매칭 로직
│   │       ├── metrics_collector.py   # 메트릭 수집
│   │       └── content_checker.py     # 콘텐츠 삭제 감지
│   │
│   ├── alembic/                       # DB 마이그레이션
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── instagrapi/                        # clone된 라이브러리 (참조용)
│
└── docker-compose.yml
```

---

## 코딩 컨벤션

### Python

```python
# 타입 힌트 필수
def get_influencer(user_id: str) -> Influencer:
    ...

# async/await 일관성 유지
async def fetch_user_info(username: str) -> User:
    ...

# Pydantic 모델 사용
class InfluencerCreate(BaseModel):
    username: str
    platform: Literal["instagram", "youtube"]

# 예외 처리
from app.core.exceptions import InfluencerNotFoundError

async def get_influencer(user_id: str) -> Influencer:
    influencer = await db.get(Influencer, user_id)
    if not influencer:
        raise InfluencerNotFoundError(user_id=user_id)
    return influencer
```

### 네이밍 규칙

```python
# 클래스: PascalCase
class InfluencerService:
    pass

# 함수/변수: snake_case
def calculate_engagement_rate():
    user_count = 100

# 상수: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
DEFAULT_TIMEOUT = 30

# Private: 언더스코어 prefix
def _internal_helper():
    pass
```

### 파일 구조

```python
# 순서: imports → constants → models → functions → classes

# 1. 표준 라이브러리
import os
from datetime import datetime
from typing import List, Optional

# 2. 서드파티
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# 3. 로컬
from app.core.exceptions import NotFoundError
from app.models.influencer import Influencer
from app.services.instagram import InstagramService
```

---

## Instagram 연동 개발 가이드

### 기본 원칙

```python
# 1. 직접 instagrapi 사용 금지 → 래퍼 클래스 사용
# Bad
from instagrapi import Client
cl = Client()
cl.login(...)

# Good
from app.integrations.instagram import InstagramClient
client = InstagramClient()
await client.get_user_info(username)
```

### Rate Limiting

```python
# 모든 Instagram API 호출은 rate limit 준수
# 최소 2초 간격, 분당 20회 이하

class InstagramClient:
    MIN_REQUEST_INTERVAL = 2.0  # seconds

    async def _request(self, func, *args, **kwargs):
        await self._wait_for_rate_limit()
        return await func(*args, **kwargs)
```

### 에러 처리

```python
from instagrapi.exceptions import (
    UserNotFound,
    MediaNotFound,
    RateLimitError,
    ChallengeRequired,
)

async def get_user_safely(username: str) -> Optional[User]:
    try:
        return await self.client.get_user_info(username)
    except UserNotFound:
        return None
    except RateLimitError:
        # 다른 클라이언트로 전환
        await self.switch_client()
        return await self.get_user_safely(username)
    except ChallengeRequired:
        # 관리자 알림
        await self.notify_challenge_required()
        raise
```

### 세션 관리

```python
# 세션 파일 저장 위치
SESSIONS_DIR = "backend/sessions/"

# 세션 파일 형식
# {username}.json

# 세션 로드 시 항상 예외 처리
def load_session(username: str) -> Client:
    try:
        client.load_settings(f"{SESSIONS_DIR}/{username}.json")
    except FileNotFoundError:
        # 새 로그인 필요
        pass
```

---

## 데이터베이스 가이드

### 모델 정의

```python
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Influencer(Base):
    __tablename__ = "influencers"

    id = Column(UUID, primary_key=True, default=uuid4)
    instagram_pk = Column(String(50), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    follower_count = Column(Integer, default=0)
    engagement_rate = Column(Numeric(5, 2))
    trust_score = Column(Numeric(5, 2))
    tier = Column(String(20))  # nano, micro, macro, mega
    is_verified = Column(Boolean, default=False)
    last_synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 마이그레이션

```bash
# 새 마이그레이션 생성
alembic revision --autogenerate -m "add influencer table"

# 마이그레이션 적용
alembic upgrade head

# 롤백
alembic downgrade -1
```

---

## API 설계 가이드

### 라우터 구조

```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_db, get_current_user

router = APIRouter(prefix="/influencers", tags=["influencers"])

@router.get("/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(
    influencer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """인플루언서 상세 조회"""
    influencer = await influencer_service.get(db, influencer_id)
    if not influencer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Influencer not found"
        )
    return influencer
```

### 응답 형식

```python
# 성공 응답
{
    "data": {...},
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 100
    }
}

# 에러 응답
{
    "error": {
        "code": "INFLUENCER_NOT_FOUND",
        "message": "인플루언서를 찾을 수 없습니다",
        "details": {"influencer_id": "123"}
    }
}
```

---

## 테스트 가이드

### 테스트 구조

```
tests/
├── conftest.py              # 공통 fixtures
├── unit/
│   ├── test_influencer_service.py
│   └── test_engagement_calculator.py
├── integration/
│   ├── test_instagram_client.py
│   └── test_campaign_flow.py
└── e2e/
    └── test_campaign_creation.py
```

### 테스트 작성

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_instagram_client():
    with patch("app.integrations.instagram.client.Client") as mock:
        yield mock

async def test_get_user_info(mock_instagram_client):
    # Arrange
    mock_instagram_client.user_info_by_username.return_value = User(
        pk="123",
        username="test_user",
        follower_count=10000
    )

    # Act
    service = InfluencerService(mock_instagram_client)
    result = await service.get_user_info("test_user")

    # Assert
    assert result.username == "test_user"
    assert result.follower_count == 10000
```

### 테스트 실행

```bash
# 전체 테스트
pytest

# 특정 파일
pytest tests/unit/test_influencer_service.py

# 커버리지
pytest --cov=app --cov-report=html
```

---

## 개발 워크플로우

### 기능 개발 순서

```
1. 요구사항 확인 (tagbuy-service-plan.md 참조)
2. 설계 검토 (tagbuy-instagram-architecture.md 참조)
3. 모델 정의 (models/)
4. 스키마 정의 (schemas/)
5. 서비스 구현 (services/)
6. API 라우터 구현 (api/)
7. 테스트 작성 (tests/)
8. 문서 업데이트
```

### Git 브랜치 전략

```
main           ← 프로덕션 배포
  └── develop  ← 개발 통합
       ├── feature/influencer-search
       ├── feature/content-monitoring
       └── fix/rate-limit-handling
```

### 커밋 메시지

```
feat: 인플루언서 검색 API 구현
fix: Instagram rate limit 에러 핸들링 개선
refactor: InstagramClient 세션 관리 로직 분리
docs: API 문서 업데이트
test: 인플루언서 서비스 유닛 테스트 추가
```

---

## 환경 설정

### 환경 변수

```bash
# .env.example
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/tagbuy
REDIS_URL=redis://localhost:6379/0

# Instagram
INSTAGRAM_USERNAME=your_account
INSTAGRAM_PASSWORD=your_password
INSTAGRAM_PROXY=http://user:pass@proxy:port

# Bootpay (PG)
BOOTPAY_APPLICATION_ID=xxx
BOOTPAY_PRIVATE_KEY=xxx

# Security
SECRET_KEY=your-secret-key
```

### Docker Compose

```yaml
services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/tagbuy
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: tagbuy
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine

  celery:
    build: ./backend
    command: celery -A app.tasks worker -l info
    depends_on:
      - redis

  celery-beat:
    build: ./backend
    command: celery -A app.tasks beat -l info
    depends_on:
      - redis
```

---

## 서비스 실행 가이드

### 로컬 개발 환경 (권장)

```bash
# 1. 필수 서비스 실행 (Docker)
docker run -d --name tagbuy-redis -p 6379:6379 redis:7-alpine
docker run -d --name tagbuy-postgres -p 5432:5432 \
  -e POSTGRES_DB=tagbuy -e POSTGRES_PASSWORD=postgres postgres:15

# 2. 가상환경 & 패키지 설치
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 3. 환경변수 설정
cp .env.example .env  # 후 수정

# 4. FastAPI 서버
uvicorn app.main:app --reload --port 8000
```

### Celery 워커 실행

```bash
cd backend

# 터미널 1: Instagram API 워커 (Rate Limit 적용, 동시성 1)
celery -A app.tasks worker -Q instagram_api -c 1 -l info

# 터미널 2: 기본 워커 (동시성 4)
celery -A app.tasks worker -Q default -c 4 -l info

# 터미널 3: Beat 스케줄러 (주기적 태스크 실행)
celery -A app.tasks beat -l info

# (선택) 터미널 4: Flower 모니터링 UI
celery -A app.tasks flower --port=5555
# 접속: http://localhost:5555
```

### Celery Beat 스케줄

| 태스크 | 주기 | 설명 |
|--------|------|------|
| `scan_active_campaigns` | 30분 | 인플루언서 새 게시글 스캔 → 캠페인 자동 매칭 |
| `update_content_metrics` | 1시간 | 등록된 콘텐츠 좋아요/댓글 수 업데이트 |
| `check_content_existence` | 6시간 | 콘텐츠 삭제 여부 감지 |

### 수동 태스크 실행

```python
# Python Shell에서
from app.tasks.post_scanner import scan_active_campaigns, scan_single_influencer
from app.tasks.metrics_collector import collect_metrics_for_campaign
from app.tasks.content_checker import check_campaign_contents

# 전체 활성 캠페인 스캔
scan_active_campaigns.delay()

# 특정 인플루언서만 스캔
scan_single_influencer.delay("influencer-uuid")

# 특정 캠페인 메트릭 수집
collect_metrics_for_campaign.delay("campaign-uuid")

# 특정 캠페인 콘텐츠 삭제 확인
check_campaign_contents.delay("campaign-uuid")
```

### 서비스 상태 확인

```bash
# Redis 연결 확인
redis-cli ping  # PONG

# Celery 워커 상태
celery -A app.tasks inspect active

# 큐 상태
celery -A app.tasks inspect reserved
```

### 테스트 스크립트

```bash
cd backend

# Instagram 게시글 가져오기 테스트
python scripts/test_fetch_posts.py <username> -n 5

# Celery 태스크 테스트
python scripts/test_tasks.py --all
```

---

## 우선순위 및 마일스톤

### Phase 1: MVP (완료)

```
[P0] Instagram Integration Layer ✅
  - [x] instagrapi 클라이언트 래퍼
  - [x] 세션 관리
  - [x] 기본 에러 핸들링

[P0] Influencer Service (기본) ✅
  - [x] 유저 프로필 조회
  - [x] 인게이지먼트율 계산
  - [x] 티어 분류

[P0] Content Monitoring (기본) ✅
  - [x] URL 검증
  - [x] 콘텐츠 존재 확인
  - [x] 기본 메트릭 수집

[P0] Influencer Discovery ✅
  - [x] 해시태그 기반 크롤러
  - [x] 카테고리별 발굴
  - [x] 스케줄러 (Celery 연동 준비)
```

### Phase 2: 확장

```
[P1] 콘텐츠 모니터링 스케줄러 (Celery) ✅
  - [x] Celery 앱 설정 & Beat 스케줄
  - [x] 새 게시글 스캔 태스크
  - [x] 캠페인 매칭 로직
  - [x] 메트릭 수집 태스크
  - [x] 콘텐츠 삭제 감지 태스크

[P1] 인플루언서 검색 고도화
[P1] 사기 탐지 알고리즘 강화
[P2] 성과 리포트 자동 생성
```

---

## 인플루언서 발굴 시스템

### 발굴 전략

1. **해시태그 크롤링** (Primary)
   - 카테고리별 한국 해시태그 설정 (`hashtag_config.py`)
   - 상위 게시물에서 작성자 추출

2. **최소 기준**
   - 팔로워 1,000명 이상
   - 게시물 10개 이상
   - 비공개 계정 제외
   - 인게이지먼트율 0.5% 이상

3. **스케줄**
   - 매일 3시: 신규 발굴 (5개 카테고리)
   - 일요일 4시: 기존 데이터 업데이트

### 카테고리별 해시태그

| 카테고리 | 주요 해시태그 |
|---------|--------------|
| 뷰티 | #뷰티 #메이크업 #화장품 #스킨케어 |
| 패션 | #패션 #ootd #데일리룩 #코디 |
| 음식 | #맛집 #먹스타그램 #카페스타그램 |
| 여행 | #여행 #국내여행 #제주도 |
| 라이프 | #일상 #데일리 #라이프스타일 |

### Discovery API

```bash
# 해시태그 발굴
POST /api/v1/discovery/run/hashtag?hashtag=뷰티&category=Beauty

# 카테고리 발굴
POST /api/v1/discovery/run/category?category=beauty

# 전체 발굴
POST /api/v1/discovery/run/full

# 통계 조회
GET /api/v1/discovery/stats
```

---

## 참고 자료

### 내부 문서
- `tagbuy-service-plan.md`: 전체 서비스 기획
- `tagbuy-instagram-architecture.md`: Instagram 연동 상세 설계

### 외부 문서
- [instagrapi 공식 문서](https://subzeroid.github.io/instagrapi/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 문서](https://docs.sqlalchemy.org/en/20/)

### instagrapi 주요 레퍼런스
- `instagrapi/mixins/user.py`: 유저 관련 메서드
- `instagrapi/mixins/media.py`: 미디어 관련 메서드
- `instagrapi/mixins/insights.py`: 인사이트 (비즈니스 계정)
- `instagrapi/types.py`: 데이터 타입 정의
