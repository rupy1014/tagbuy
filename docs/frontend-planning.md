# TagBuy 프론트엔드 기획서

## 1. 사용자 유형

| 유형 | 설명 | 주요 목표 |
|------|------|----------|
| **광고주 (Advertiser)** | 인플루언서 마케팅을 원하는 기업/개인 | 캠페인 생성, 인플루언서 매칭, 성과 분석 |
| **인플루언서 (Influencer)** | 콘텐츠 제작자 | 캠페인 탐색, 콘텐츠 제출, 정산 수령 |
| **관리자 (Admin)** | 플랫폼 운영자 | 사용자 관리, 분쟁 중재, 시스템 모니터링 |

---

## 2. 사용자 시나리오

### 2.1 광고주 시나리오

#### 시나리오 A: 신규 광고주 가입 및 첫 캠페인 생성

```
1. 랜딩 페이지 방문
   └─ "광고주로 시작하기" 클릭

2. 회원가입 (/auth/register?type=advertiser)
   └─ 이메일 입력 → 인증 코드 확인
   └─ 비밀번호 설정
   └─ 기업 정보 입력 (사업자번호, 회사명, 담당자)
   └─ 결제수단 등록 (카드 또는 가상계좌)

3. 광고주 대시보드 진입 (/advertiser/dashboard)
   └─ 온보딩 가이드 표시
   └─ "첫 캠페인 만들기" CTA

4. 캠페인 생성 (/advertiser/campaigns/new)
   └─ Step 1: 기본 정보
       - 캠페인명
       - 목표 (브랜드 인지도 / 판매 전환)
       - 카테고리 (뷰티, 패션, 음식 등)
   └─ Step 2: 타겟 설정
       - 팔로워 수 범위 (1K-10K, 10K-100K, 100K+)
       - 인게이지먼트율 최소 기준
       - 인플루언서 수
   └─ Step 3: 예산 및 일정
       - 총 예산 (최소 50만원)
       - 인플루언서당 보상금
       - 콘텐츠 유지 기간 (D+7, D+14, D+30)
   └─ Step 4: 가이드라인
       - 제품/서비스 설명
       - 필수 멘션 사항
       - 금지 사항
       - 레퍼런스 이미지 업로드
   └─ Step 5: 결제
       - PG 수수료 부담 주체 선택 (광고주/인플루언서)
       - 결제 수단 선택 (카드/가상계좌)
       - 비용 요약 확인 (광고비 + 에스크로 0.5% + PG 수수료)
       - 원클릭 결제

5. 캠페인 활성화 완료
   └─ 대시보드에서 "인플루언서 매칭 대기중" 표시
```

#### 시나리오 B: 인플루언서 신청 검토 및 승인

```
1. 알림 수신 "새로운 인플루언서 신청 3건"

2. 캠페인 상세 (/advertiser/campaigns/:id)
   └─ "신청 현황" 탭 클릭

3. 신청자 목록 확인
   └─ 각 인플루언서 카드:
       - 프로필 사진, 유저네임
       - 팔로워 수, 인게이지먼트율
       - AI 매칭 점수
       - 과거 캠페인 완료율
   └─ "상세보기" 클릭

4. 인플루언서 상세 모달 (/advertiser/influencers/:id)
   └─ 인스타그램 프로필 미리보기
   └─ 최근 게시물 6개
   └─ 팔로워 분석 (성별, 연령, 지역)
   └─ 과거 캠페인 이력
   └─ "승인" / "거절" 버튼

5. 승인 시
   └─ 예산 할당 확인
   └─ 인플루언서에게 알림 전송
```

#### 시나리오 C: 콘텐츠 검수 및 승인

```
1. 알림 수신 "콘텐츠가 제출되었습니다"

2. 콘텐츠 검수 페이지 (/advertiser/campaigns/:id/contents/:contentId)
   └─ 인스타그램 게시물 미리보기 (스크린샷)
   └─ 원본 URL 링크
   └─ AI 검증 리포트:
       - 가이드라인 준수도 (%)
       - 체크리스트 (해시태그 ✓, 브랜드명 ✓, 제품 이미지 ✓)
       - 예상 도달률
       - 금지어 사용 여부
   └─ 광고주 액션:
       - "승인" → 정산 트리거 (D+7)
       - "수정 요청" → 피드백 입력 → 인플루언서 재제출
       - "거절" → 사유 입력 → 에스크로 환불

3. 승인 후
   └─ 콘텐츠 모니터링 시작 (D+1~D+7 자동 체크)
   └─ 대시보드에서 성과 지표 실시간 확인
```

#### 시나리오 D: 캠페인 성과 분석

```
1. 캠페인 대시보드 (/advertiser/campaigns/:id/analytics)
   └─ 실시간 지표:
       - 총 도달 (Reach)
       - 인게이지먼트 (좋아요, 댓글, 저장)
       - CPE (Cost Per Engagement)
   └─ 인플루언서별 성과 비교 차트
   └─ 일별/주별 추이 그래프

2. 리포트 다운로드
   └─ PDF 리포트 생성
   └─ 캠페인 종료 후 최종 보고서
```

---

### 2.2 인플루언서 시나리오

#### 시나리오 E: 신규 인플루언서 가입

```
1. 랜딩 페이지 방문
   └─ "인플루언서로 시작하기" 클릭

2. 회원가입 (/auth/register?type=influencer)
   └─ 이메일 입력 → 인증 코드 확인
   └─ 비밀번호 설정
   └─ 인스타그램 연동 (username 입력)
       - 우리 시스템에서 프로필 자동 크롤링
       - 팔로워 수, 인게이지먼트율 자동 계산
   └─ 프로필 완성
       - 자기소개
       - 주요 카테고리 선택 (복수)
       - 희망 보상 범위
   └─ 정산 계좌 등록 (은행, 계좌번호, 예금주)

3. 인플루언서 대시보드 진입 (/influencer/dashboard)
   └─ 프로필 완성도 표시
   └─ 추천 캠페인 카드
```

#### 시나리오 F: 캠페인 탐색 및 신청

```
1. 캠페인 탐색 (/influencer/campaigns)
   └─ 필터:
       - 카테고리 (뷰티, 패션, 음식...)
       - 보상 범위
       - 마감일
   └─ 정렬:
       - 매칭률 높은 순 (AI 추천)
       - 높은 보상순
       - 마감 임박순
       - 최신순

2. 캠페인 상세 보기 (/influencer/campaigns/:id)
   └─ 브랜드 정보
   └─ 캠페인 요구사항
   └─ 보상 금액
   └─ 가이드라인 미리보기
   └─ 예상 일정

3. 신청하기
   └─ 지원 메시지 작성
   └─ 포트폴리오 첨부 (선택)
   └─ "신청 완료"

4. 승인 대기
   └─ 알림으로 결과 수신
```

#### 시나리오 G: 콘텐츠 제작 및 제출

```
1. 승인 알림 수신 "캠페인에 선정되었습니다!"

2. 나의 캠페인 (/influencer/my-campaigns/:id)
   └─ 가이드라인 전문 확인
   └─ 체크리스트:
       - [ ] 제품 수령 완료
       - [ ] 콘텐츠 제작
       - [ ] 인스타그램 게시
       - [ ] URL 제출

3. 콘텐츠 제작 & 게시
   └─ 인스타그램에 직접 게시

4. URL 제출 (/influencer/my-campaigns/:id/submit)
   └─ 게시물 URL 입력
   └─ 자동 스크린샷 캡처
   └─ AI 자동 검증 (30초)
   └─ 검증 결과 미리보기:
       - 가이드라인 준수도
       - 문제점 있으면 수정 권고
   └─ 제출 완료

5. 광고주 검수 대기
   └─ 상태: "검수중" → "승인" / "수정요청" / "거절"
```

#### 시나리오 H: 정산 및 출금

```
1. 승인 알림 수신 "콘텐츠가 승인되었습니다"

2. 정산 대기
   └─ 상태: "정산 예정 (D+7)"
   └─ 즉시 정산 옵션 (+0.5% 수수료)

3. 정산 완료 알림

4. 수익 관리 (/influencer/earnings)
   └─ 이번 달 수익
   └─ 정산 대기 금액
   └─ 출금 가능 금액
   └─ 월별 수익 그래프

5. 출금 신청 (/influencer/withdraw)
   └─ 출금 금액 입력 (최소 1만원)
   └─ 등록 계좌 확인
   └─ "즉시 출금" → 10분 내 입금
```

---

### 2.3 관리자 시나리오

#### 시나리오 I: 인플루언서 발굴 모니터링

```
1. 관리자 대시보드 (/admin/dashboard)
   └─ 발굴 통계:
       - 총 인플루언서 수
       - 오늘 신규 발굴
       - 카테고리별 분포
       - 티어별 분포

2. 발굴 관리 (/admin/discovery)
   └─ 수동 발굴 트리거
       - 특정 해시태그 크롤링
       - 특정 카테고리 크롤링
   └─ 크롤링 로그 확인
   └─ 오류 현황

3. 인플루언서 목록 (/admin/influencers)
   └─ 전체 인플루언서 테이블
   └─ 필터/정렬/검색
   └─ 수동 데이터 수정
```

---

## 3. 프론트엔드 라우터 목록

### 3.1 공통 (Public)

| Route | 페이지 | 설명 |
|-------|-------|------|
| `/` | 랜딩 페이지 | 서비스 소개, CTA |
| `/auth/login` | 로그인 | 이메일 로그인 |
| `/auth/register` | 회원가입 | 유형 선택 후 가입 |
| `/auth/register/advertiser` | 광고주 가입 | 기업 정보 입력 |
| `/auth/register/influencer` | 인플루언서 가입 | 인스타 연동 |
| `/auth/forgot-password` | 비밀번호 찾기 | 이메일 인증 |
| `/auth/reset-password` | 비밀번호 재설정 | 새 비밀번호 |

### 3.2 광고주 (Advertiser)

| Route | 페이지 | 설명 |
|-------|-------|------|
| `/advertiser/dashboard` | 대시보드 | 통계, 진행중 캠페인 |
| `/advertiser/campaigns` | 캠페인 목록 | 전체 캠페인 리스트 |
| `/advertiser/campaigns/new` | 캠페인 생성 | 스텝 위저드 |
| `/advertiser/campaigns/:id` | 캠페인 상세 | 상세 + 탭 메뉴 |
| `/advertiser/campaigns/:id/edit` | 캠페인 수정 | 수정 폼 |
| `/advertiser/campaigns/:id/applicants` | 신청자 관리 | 인플루언서 신청 목록 |
| `/advertiser/campaigns/:id/contents` | 콘텐츠 관리 | 제출된 콘텐츠 목록 |
| `/advertiser/campaigns/:id/contents/:contentId` | 콘텐츠 검수 | AI 리포트 + 승인/거절 |
| `/advertiser/campaigns/:id/analytics` | 성과 분석 | 차트, 지표 |
| `/advertiser/influencers` | 인플루언서 검색 | 검색 + 필터 |
| `/advertiser/influencers/:id` | 인플루언서 상세 | 프로필, 통계 |
| `/advertiser/payments` | 결제 내역 | 결제 이력 |
| `/advertiser/settings` | 설정 | 계정, 결제수단, 알림 |
| `/advertiser/settings/company` | 기업 정보 | 기업 정보 수정 |
| `/advertiser/settings/payment-methods` | 결제수단 관리 | 카드/계좌 관리 |

### 3.3 인플루언서 (Influencer)

| Route | 페이지 | 설명 |
|-------|-------|------|
| `/influencer/dashboard` | 대시보드 | 수익, 추천 캠페인 |
| `/influencer/campaigns` | 캠페인 탐색 | 캠페인 검색 + 필터 |
| `/influencer/campaigns/:id` | 캠페인 상세 | 상세 + 신청 버튼 |
| `/influencer/my-campaigns` | 나의 캠페인 | 신청/진행중/완료 |
| `/influencer/my-campaigns/:id` | 캠페인 진행 | 가이드라인 + 제출 |
| `/influencer/my-campaigns/:id/submit` | 콘텐츠 제출 | URL 입력 + AI 검증 |
| `/influencer/earnings` | 수익 관리 | 수익 현황 + 그래프 |
| `/influencer/withdraw` | 출금 | 출금 신청 |
| `/influencer/withdraw/history` | 출금 내역 | 출금 이력 |
| `/influencer/settings` | 설정 | 계정 설정 |
| `/influencer/settings/profile` | 프로필 수정 | 자기소개, 카테고리 |
| `/influencer/settings/instagram` | 인스타 연동 | 연동 상태, 재연동 |
| `/influencer/settings/bank` | 정산 계좌 | 계좌 정보 수정 |

### 3.4 관리자 (Admin)

| Route | 페이지 | 설명 |
|-------|-------|------|
| `/admin/dashboard` | 관리자 대시보드 | 전체 통계 |
| `/admin/users` | 사용자 관리 | 광고주 + 인플루언서 |
| `/admin/users/:id` | 사용자 상세 | 상세 + 액션 |
| `/admin/campaigns` | 캠페인 관리 | 전체 캠페인 |
| `/admin/campaigns/:id` | 캠페인 상세 | 상세 + 관리 기능 |
| `/admin/influencers` | 인플루언서 DB | 전체 인플루언서 |
| `/admin/influencers/:id` | 인플루언서 상세 | 상세 + 수정 |
| `/admin/discovery` | 발굴 관리 | 크롤러 관리 |
| `/admin/discovery/stats` | 발굴 통계 | 통계 대시보드 |
| `/admin/discovery/run` | 수동 발굴 | 해시태그/카테고리 실행 |
| `/admin/disputes` | 분쟁 관리 | 분쟁 목록 |
| `/admin/disputes/:id` | 분쟁 상세 | 중재 처리 |
| `/admin/transactions` | 거래 내역 | 전체 결제/정산 |
| `/admin/settings` | 시스템 설정 | 수수료, 카테고리 등 |

---

## 4. 페이지별 컴포넌트 구조

### 4.1 광고주 대시보드

```
/advertiser/dashboard
├── Header
│   ├── Logo
│   ├── Navigation
│   └── UserMenu (알림, 프로필)
├── StatsCards
│   ├── TotalSpent (총 광고비)
│   ├── ActiveCampaigns (진행중 캠페인)
│   ├── TotalReach (총 도달)
│   └── AverageROI (평균 ROI)
├── CampaignList
│   └── CampaignCard[] (진행중 캠페인)
├── QuickActions
│   ├── NewCampaignButton
│   └── FindInfluencerButton
└── RecentActivity (최근 활동)
```

### 4.2 인플루언서 대시보드

```
/influencer/dashboard
├── Header
├── EarningsCards
│   ├── ThisMonthEarning
│   ├── PendingSettlement
│   └── WithdrawableBalance
├── WithdrawButton (즉시 출금)
├── RecommendedCampaigns
│   └── CampaignCard[] (AI 추천)
├── MyCampaigns
│   └── ActiveCampaignCard[] (진행중)
└── EarningsChart (월별 수익)
```

### 4.3 캠페인 생성 위저드

```
/advertiser/campaigns/new
├── StepIndicator (1-2-3-4-5)
├── StepContent
│   ├── Step1BasicInfo
│   │   ├── CampaignNameInput
│   │   ├── GoalSelect
│   │   └── CategorySelect
│   ├── Step2Targeting
│   │   ├── FollowerRangeSlider
│   │   ├── EngagementRateInput
│   │   └── InfluencerCountInput
│   ├── Step3Budget
│   │   ├── TotalBudgetInput
│   │   ├── RewardPerInfluencer
│   │   └── MaintenancePeriodSelect
│   ├── Step4Guidelines
│   │   ├── ProductDescriptionEditor
│   │   ├── RequiredMentionsInput
│   │   ├── ProhibitedItemsInput
│   │   └── ReferenceImageUpload
│   └── Step5Payment
│       ├── PGFeePayerSelect (광고주/인플루언서)
│       ├── PaymentMethodSelect
│       ├── CostSummary
│       └── PayButton
└── NavigationButtons (이전/다음)
```

---

## 5. API 연동 매핑

### 5.1 현재 구현된 Backend API

```
# Health
GET  /api/v1/health

# Influencers
GET  /api/v1/influencers
GET  /api/v1/influencers/:id
GET  /api/v1/influencers/search
GET  /api/v1/influencers/:id/engagement

# Contents
POST /api/v1/contents/verify-url
GET  /api/v1/contents/:id/metrics

# Discovery (관리자)
GET  /api/v1/discovery/stats
GET  /api/v1/discovery/categories
GET  /api/v1/discovery/hashtags
POST /api/v1/discovery/run/hashtag
POST /api/v1/discovery/run/category
POST /api/v1/discovery/run/full
POST /api/v1/discovery/run/update-stale
```

### 5.2 추가 필요 API

```
# Auth
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password

# Users
GET  /api/v1/users/me
PUT  /api/v1/users/me
GET  /api/v1/users/me/settings

# Advertisers
GET  /api/v1/advertisers/me
PUT  /api/v1/advertisers/me
GET  /api/v1/advertisers/me/payment-methods
POST /api/v1/advertisers/me/payment-methods

# Campaigns
GET  /api/v1/campaigns
POST /api/v1/campaigns
GET  /api/v1/campaigns/:id
PUT  /api/v1/campaigns/:id
DELETE /api/v1/campaigns/:id

# Campaign Applications
GET  /api/v1/campaigns/:id/applications
POST /api/v1/campaigns/:id/applications
PUT  /api/v1/campaigns/:id/applications/:appId

# Campaign Contents
GET  /api/v1/campaigns/:id/contents
POST /api/v1/campaigns/:id/contents
PUT  /api/v1/campaigns/:id/contents/:contentId
GET  /api/v1/campaigns/:id/contents/:contentId/ai-report

# Campaign Analytics
GET  /api/v1/campaigns/:id/analytics
GET  /api/v1/campaigns/:id/analytics/export

# Influencer Side
GET  /api/v1/influencer/me
PUT  /api/v1/influencer/me
GET  /api/v1/influencer/campaigns
GET  /api/v1/influencer/my-campaigns
POST /api/v1/influencer/my-campaigns/:id/submit

# Earnings & Withdrawals
GET  /api/v1/influencer/earnings
GET  /api/v1/influencer/earnings/history
POST /api/v1/influencer/withdraw
GET  /api/v1/influencer/withdraw/history

# Payments (Bootpay Integration)
POST /api/v1/payments/prepare
POST /api/v1/payments/confirm
GET  /api/v1/payments/:id
POST /api/v1/payments/webhook
```

---

## 6. 기술 스택 제안

### Frontend Stack

```
Framework:     Next.js 14 (App Router)
Language:      TypeScript
Styling:       Tailwind CSS + shadcn/ui
State:         Zustand (global) + React Query (server state)
Forms:         React Hook Form + Zod
Charts:        Recharts 또는 Chart.js
Auth:          NextAuth.js
HTTP:          Axios + React Query
```

### 디렉토리 구조

```
frontend/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes
│   │   ├── page.tsx              # Landing
│   │   └── auth/
│   │       ├── login/
│   │       └── register/
│   ├── (advertiser)/             # Advertiser routes
│   │   └── advertiser/
│   │       ├── dashboard/
│   │       ├── campaigns/
│   │       └── settings/
│   ├── (influencer)/             # Influencer routes
│   │   └── influencer/
│   │       ├── dashboard/
│   │       ├── campaigns/
│   │       └── earnings/
│   └── (admin)/                  # Admin routes
│       └── admin/
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── common/                   # Shared components
│   ├── advertiser/               # Advertiser-specific
│   ├── influencer/               # Influencer-specific
│   └── admin/                    # Admin-specific
│
├── lib/
│   ├── api/                      # API clients
│   ├── hooks/                    # Custom hooks
│   └── utils/                    # Utilities
│
├── stores/                       # Zustand stores
├── types/                        # TypeScript types
└── styles/                       # Global styles
```

---

## 7. 우선순위 및 구현 순서

### Phase 1: MVP (핵심 플로우)

```
Week 1-2: 기초 설정
├── Next.js 프로젝트 설정
├── UI 컴포넌트 라이브러리 구성
├── API 클라이언트 설정
└── 인증 시스템 (로그인/회원가입)

Week 3-4: 광고주 핵심
├── 광고주 대시보드
├── 캠페인 생성 위저드
├── 인플루언서 검색 (조회)
└── 캠페인 상세 (기본)

Week 5-6: 인플루언서 핵심
├── 인플루언서 대시보드
├── 캠페인 탐색 + 신청
├── 콘텐츠 제출
└── 수익 확인 (기본)
```

### Phase 2: 확장

```
├── 콘텐츠 검수 (AI 리포트)
├── 성과 분석 차트
├── 정산/출금 시스템
├── 알림 시스템
└── 관리자 패널 (기본)
```

### Phase 3: 고도화

```
├── 실시간 알림 (WebSocket)
├── 고급 분석 대시보드
├── 분쟁 관리 시스템
└── 모바일 최적화
```

---

## 8. 디자인 가이드라인

### 컬러 팔레트

```css
/* Primary */
--primary: #6366F1;        /* Indigo-500 */
--primary-dark: #4F46E5;   /* Indigo-600 */

/* Secondary */
--secondary: #10B981;      /* Emerald-500 */

/* Status */
--success: #22C55E;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Neutral */
--gray-50: #F9FAFB;
--gray-900: #111827;
```

### 타이포그래피

```css
/* Font Family */
font-family: 'Pretendard', -apple-system, sans-serif;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### UI/UX 원칙

1. **Simple**: 3클릭 이내 모든 작업 완료
2. **Fast**: 5초 결제, 10분 정산 강조
3. **Transparent**: 실시간 상태 표시
4. **Trustworthy**: 금융 보안 강조
