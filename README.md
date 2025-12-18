# TagBuy - Influencer Marketing Platform

인플루언서 마케팅 플랫폼 with PG 연동 & 에스크로 정산

## Overview

TagBuy는 광고주와 인플루언서를 연결하는 마케팅 플랫폼입니다.

### 주요 특징
- **낮은 수수료**: 에스크로 0.5% + PG 실비 (업계 평균 대비 70% 절감)
- **실시간 정산**: 인플루언서 10분 내 출금
- **AI 검증**: 콘텐츠 품질 자동 검증
- **인플루언서 DB**: 자동 발굴 및 관리

### 사용자 유형
- **광고주**: 캠페인 생성, 인플루언서 검색, 정산 관리
- **인플루언서**: 캠페인 참여, 수익 관리, 출금
- **관리자**: 플랫폼 운영, 인플루언서 발굴

---

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15 + SQLAlchemy (async)
- **Cache/Queue**: Redis 7 + Celery
- **Instagram**: instagrapi

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query

---

## Quick Start

### 요구사항
- Docker Desktop
- Git

### 1. 프로젝트 클론
```bash
git clone <repo-url>
cd tagbuy
```

### 2. 환경변수 설정
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. 서비스 시작
```bash
./scripts/start.sh
```

### 4. 접속
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Scripts

프로젝트 루트의 `scripts/` 폴더에 유용한 스크립트가 있습니다.

### 서비스 관리

```bash
# 서비스 시작
./scripts/start.sh

# 컨테이너 재빌드 후 시작
./scripts/start.sh --build

# 서비스 중지
./scripts/stop.sh

# 서비스 중지 + 볼륨 삭제 (DB 데이터 포함)
./scripts/stop.sh --clean
```

### 로그 확인

```bash
# 전체 로그
./scripts/logs.sh

# 특정 서비스 로그
./scripts/logs.sh api
./scripts/logs.sh frontend
./scripts/logs.sh db
./scripts/logs.sh redis
```

### 데이터베이스

```bash
# 마이그레이션 적용
./scripts/migrate.sh

# 새 마이그레이션 생성
./scripts/migrate.sh create "add user table"

# 마이그레이션 롤백
./scripts/migrate.sh downgrade

# DB 초기화 (모든 데이터 삭제)
./scripts/reset-db.sh
```

### 컨테이너 쉘 접속

```bash
# API 컨테이너 (Python)
./scripts/shell.sh api

# Frontend 컨테이너
./scripts/shell.sh frontend

# PostgreSQL psql
./scripts/shell.sh db
```

---

## Docker Compose Commands

스크립트 대신 직접 docker-compose 명령어를 사용할 수도 있습니다.

```bash
# 서비스 시작 (백그라운드)
docker-compose up -d

# 서비스 시작 + 빌드
docker-compose up -d --build

# 서비스 중지
docker-compose down

# 로그 확인
docker-compose logs -f [service_name]

# 컨테이너 상태 확인
docker-compose ps

# 특정 서비스 재시작
docker-compose restart api
```

---

## Project Structure

```
tagbuy/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/            # API 라우터
│   │   ├── core/           # 설정, 보안
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── schemas/        # Pydantic 스키마
│   │   ├── services/       # 비즈니스 로직
│   │   └── main.py         # FastAPI 앱
│   ├── alembic/            # DB 마이그레이션
│   ├── tests/              # 테스트
│   └── requirements.txt
│
├── frontend/               # Next.js Frontend
│   ├── app/               # App Router 페이지
│   │   ├── auth/          # 로그인, 회원가입
│   │   ├── advertiser/    # 광고주 페이지
│   │   ├── influencer/    # 인플루언서 페이지
│   │   └── admin/         # 관리자 페이지
│   ├── components/        # React 컴포넌트
│   ├── lib/               # 유틸리티
│   ├── stores/            # Zustand 스토어
│   └── types/             # TypeScript 타입
│
├── instagrapi/            # Instagram 통합 모듈
│   └── ...
│
├── scripts/               # 유틸리티 스크립트
│   ├── start.sh
│   ├── stop.sh
│   ├── logs.sh
│   ├── migrate.sh
│   ├── reset-db.sh
│   └── shell.sh
│
├── docs/                  # 문서
│   └── frontend-planning.md
│
├── docker-compose.yml     # Docker 구성
└── README.md
```

---

## Development

### Backend 개발 (Docker 외부)

```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행 (DB, Redis는 Docker로)
uvicorn app.main:app --reload --port 8000
```

### Frontend 개발 (Docker 외부)

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

---

## API Endpoints

### 인증
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 캠페인
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | 캠페인 목록 |
| POST | `/api/campaigns` | 캠페인 생성 |
| GET | `/api/campaigns/{id}` | 캠페인 상세 |

### 인플루언서
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/influencers` | 인플루언서 검색 |
| GET | `/api/influencers/{id}` | 인플루언서 상세 |

### 정산
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/earnings/summary` | 수익 요약 |
| POST | `/api/earnings/withdraw` | 출금 신청 |

전체 API 문서: http://localhost:8000/docs

---

## Troubleshooting

### Docker 관련

**문제**: `Cannot connect to the Docker daemon`
```bash
# Docker Desktop이 실행 중인지 확인
# macOS: Docker Desktop 앱 실행
```

**문제**: Port already in use
```bash
# 해당 포트 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :8000

# 프로세스 종료 후 재시작
./scripts/stop.sh
./scripts/start.sh
```

### 데이터베이스

**문제**: Migration 오류
```bash
# 마이그레이션 초기화
./scripts/reset-db.sh
```

**문제**: DB 연결 실패
```bash
# DB 컨테이너 상태 확인
docker-compose ps db

# DB 로그 확인
./scripts/logs.sh db
```

---

## License

Private - All rights reserved
