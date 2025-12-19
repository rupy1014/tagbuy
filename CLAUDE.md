# TagBuy - 인플루언서 마케팅 플랫폼

## 서비스 구성도

```
┌─────────────────────────────────────────────────────────────────────┐
│                         클라이언트 (브라우저)                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│   Next.js Frontend  │               │   FastAPI Backend   │
│     :3000           │◄─────────────►│      :8000          │
│                     │    REST API   │                     │
│ - 광고주 대시보드    │               │ - /api/v1/          │
│ - 인플루언서 검색    │               │   ├─ influencers    │
│ - 캠페인 관리       │               │   ├─ campaigns      │
│ - 결제/정산         │               │   ├─ contents       │
└─────────────────────┘               │   ├─ payments       │
                                      │   └─ discovery      │
                                      └──────────┬──────────┘
                                                 │
              ┌──────────────────────────────────┼──────────────────────────────────┐
              │                                  │                                  │
              ▼                                  ▼                                  ▼
┌─────────────────────┐               ┌─────────────────────┐         ┌─────────────────────┐
│     PostgreSQL      │               │       Redis         │         │   Instagram API     │
│      :5432          │               │       :6379         │         │    (instagrapi)     │
│                     │               │                     │         │                     │
│ - users             │               │ - Celery Broker     │         │ - 프로필 조회        │
│ - influencers       │               │ - Session Cache     │         │ - 게시물 크롤링      │
│ - influencer_posts  │               │ - Rate Limit        │         │ - 메트릭 수집        │
│ - campaigns         │               │                     │         │                     │
│ - contents          │               └──────────┬──────────┘         └─────────────────────┘
│ - payments          │                          │
│ - escrows           │                          │
└─────────────────────┘               ┌──────────┴──────────┐
                                      │                     │
                                      ▼                     ▼
                          ┌─────────────────┐   ┌─────────────────────┐
                          │  Celery Worker  │   │   Celery Beat       │
                          │                 │   │   (스케줄러)         │
                          │ Q: instagram_api│   │                     │
                          │   (동시성 1)    │   │ - 30분: 게시글 스캔  │
                          │ Q: default      │   │ - 1시간: 메트릭 수집 │
                          │   (동시성 4)    │   │ - 6시간: 삭제 감지   │
                          └─────────────────┘   └─────────────────────┘
```

## 서비스 실행

```bash
# 1. Backend (FastAPI)
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 2. Frontend (Next.js)
cd frontend && npm run dev

# 3. Celery Worker
celery -A app.tasks worker -Q default,instagram_api -c 2 -l info

# 4. Celery Beat (스케줄러)
celery -A app.tasks beat -l info

# 5. 상태 확인
redis-cli ping                        # Redis
celery -A app.tasks inspect active    # Celery
```

## 주요 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/v1/influencers` | 인플루언서 검색 |
| `GET /api/v1/influencers/{id}/posts` | 게시물 조회 (캐시) |
| `POST /api/v1/influencers/{id}/posts/crawl` | 게시물 크롤링 |
| `POST /api/v1/campaigns` | 캠페인 생성 |
| `POST /api/v1/payments/prepare` | 결제 준비 |

## 스케줄 태스크 (Celery Beat)

| 태스크 | 주기 | 설명 |
|--------|------|------|
| `scan_active_campaigns` | 30분 | 활성 캠페인 인플루언서 게시글 스캔 |
| `update_content_metrics` | 1시간 | 콘텐츠 좋아요/댓글 수 업데이트 |
| `check_content_existence` | 6시간 | 콘텐츠 삭제 여부 감지 |

## 코딩 컨벤션

- **Backend**: Python 타입힌트 필수, async/await, Pydantic 스키마
- **Frontend**: TypeScript, camelCase (API 응답은 snake_case → 변환 필요)
- **DB**: snake_case 컬럼명, UUID PK
- **Instagram**: Rate Limit 분당 20회, 최소 2초 간격

## 환경변수

```bash
# .env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/tagbuy
REDIS_URL=redis://localhost:6379/0
INSTAGRAM_USERNAME=xxx
INSTAGRAM_PASSWORD=xxx
BOOTPAY_APPLICATION_ID=xxx
BOOTPAY_PRIVATE_KEY=xxx
SECRET_KEY=xxx
```

## 데모 계정

- 이메일: `demo@tagbuy.kr`
- 비밀번호: `demo1234`
