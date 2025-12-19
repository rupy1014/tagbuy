# TagBuy 개발 TODO List

> **프로젝트 목표**: 태그바이(TagBy)를 최대한 동일하게 클론하는 인플루언서 마케팅 플랫폼
>
> 마지막 업데이트: 2025-12-19

---

## 현재 완성도

| 영역 | Backend API | Frontend UI | 비고 |
|------|-------------|-------------|------|
| 인증 | 80% | 90% | |
| 인플루언서 관리 | 95% | 95% | |
| 캠페인 CRUD | 90% | 80% | 보상 유형 추가됨 |
| 캠페인 상세/관리 | 95% | 90% | ✅ 완료 |
| 콘텐츠 자동 검증 | 80% | 70% | 캠페인 상세에서 리뷰 가능 |
| 결제/에스크로 | 50% | 40% | |
| 인플루언서 앱 | 30% | 10% | **다음 우선순위** |
| 관리자 | 40% | 70% | |
| **전체** | **~70%** | **~70%** | |

---

## 태그바이 핵심 플로우 (구현 목표)

```
[광고주]                              [인플루언서]
   │                                      │
   ├─ 1. 캠페인 등록 ✅                    │
   │    └─ 제품/현금/혼합 보상 ✅           │
   │                                      │
   │◀─────── 2. 캠페인 지원 ──────────────┤ ✅
   │                                      │
   ├─ 3. 인플루언서 선정 ─────────────────▶│ ✅
   │                                      │
   │                                      ├─ 4. 콘텐츠 업로드 (Instagram)
   │                                      │
   │◀─────── 5. 자동 콘텐츠 감지 ──────────┤ ✅ (Celery)
   │                                      │
   ├─ 6. 콘텐츠 승인/거절 ✅               │
   │                                      │
   ├─ 7. 에스크로 해제 🔲                  │
   │                                      │
   │                        8. 정산 수령 ◀┤ 🔲
```

---

## 서비스 구조

### 광고주 (Advertiser)

```
광고주 대시보드
├── 대시보드          /advertiser/dashboard      ✅
├── 캠페인            /advertiser/campaigns      ✅
│   ├── 캠페인 등록   /advertiser/campaigns/new  ✅ (보상유형 추가)
│   └── 캠페인 상세   /advertiser/campaigns/[id] ✅ (NEW)
│       ├── 지원자 목록/선정 ✅
│       ├── 콘텐츠 리뷰 (승인/거절) ✅
│       └── 캠페인 통계 ✅
├── 인플루언서 탐색   /advertiser/influencers    ✅
├── 즐겨찾기          /advertiser/favorites      ✅
├── 리포트            /advertiser/reports        ✅
├── 결제 내역         /advertiser/payments       🔲
└── 마이페이지        /advertiser/mypage         ✅
```

### 인플루언서 (Influencer)

```
인플루언서 대시보드
├── 대시보드          /influencer/dashboard      🔲
├── 캠페인 탐색       /influencer/campaigns      🔲
│   └── 캠페인 상세   /influencer/campaigns/[id] 🔲
├── 내 캠페인         /influencer/my-campaigns   🔲 **우선순위 2**
│   ├── 지원한 캠페인
│   ├── 진행중 캠페인
│   └── 완료 캠페인
├── 정산 내역         /influencer/settlements    🔲
└── 마이페이지        /influencer/mypage         🔲
```

---

## 다음 구현 목록 (우선순위순)

### 1. 광고주 캠페인 상세 페이지 `/advertiser/campaigns/[id]` ✅ 완료

캠페인 생성 후 관리하는 핵심 페이지

**Backend API**
- [x] `GET /campaigns/{id}` - 캠페인 상세 조회
- [x] `GET /campaigns/{id}/participants` - 지원자/선정자 목록
- [x] `POST /campaigns/{id}/select` - 인플루언서 선정
- [x] `POST /campaigns/{id}/reject` - 인플루언서 거절
- [x] `GET /contents/campaign/{id}` - 제출된 콘텐츠 목록
- [x] `POST /contents/{id}/approve` - 콘텐츠 승인
- [x] `POST /contents/{id}/reject` - 콘텐츠 거절 (사유 포함)

**Frontend UI**
- [x] 캠페인 기본 정보 표시
- [x] 탭 구조: 지원자 | 선정자 | 콘텐츠 | 통계
- [x] 지원자 카드 (프로필, 팔로워, 참여율)
- [x] 선정/거절 버튼 + 다이얼로그
- [x] 자동 감지된 콘텐츠 목록 (pending/approved/rejected 섹션)
- [x] 콘텐츠 승인/거절 버튼 + 다이얼로그
- [ ] 캠페인 상태 변경 (모집중 → 진행중 → 완료)

---

### 2. 인플루언서 내 캠페인 `/influencer/my-campaigns`

인플루언서가 참여한 캠페인 관리

**Backend API**
- [x] `GET /campaigns/me/applications` - 내 지원 목록
- [ ] `GET /influencer/campaigns/active` - 진행중 캠페인
- [ ] `GET /influencer/campaigns/completed` - 완료 캠페인
- [ ] `POST /contents/submit` - 콘텐츠 URL 수동 제출

**Frontend UI**
- [ ] 탭: 지원중 | 진행중 | 완료
- [ ] 캠페인 카드 (상태, 보상, 마감일)
- [ ] 콘텐츠 제출 버튼/모달
- [ ] 제출한 콘텐츠 상태 표시

---

### 3. 콘텐츠 자동 검증 시스템 (UI 연결)

Celery로 백엔드 구현됨, 프론트엔드 연결 필요

**현재 구현 (Backend)**
- [x] `post_scanner.py` - 30분마다 새 게시물 스캔
- [x] `campaign_matcher.py` - 해시태그/멘션 자동 매칭
- [x] `content_checker.py` - 6시간마다 삭제 감지
- [x] `metrics_collector.py` - 1시간마다 메트릭 수집

**필요한 구현**
- [ ] 자동 감지된 콘텐츠 → DB 저장 완성
- [ ] 콘텐츠 상태: `detected` → `pending_review` → `approved`/`rejected`
- [ ] 광고주 알림 (새 콘텐츠 감지됨)
- [ ] 캠페인 상세 페이지에서 콘텐츠 리뷰 UI

---

### 4. 에스크로/정산 시스템

**Backend API**
- [x] 에스크로 모델 생성
- [ ] `POST /escrow/release/{content_id}` - 콘텐츠 승인 시 에스크로 해제
- [ ] `GET /influencer/settlements` - 정산 내역
- [ ] `POST /influencer/withdrawals` - 출금 신청
- [ ] `GET /influencer/balance` - 잔액 조회

**Frontend UI**
- [ ] 정산 대시보드
- [ ] 출금 신청 폼
- [ ] 정산 내역 테이블

---

## 완료된 기능

### Backend API
- [x] 캠페인 CRUD API
- [x] 캠페인 참여 API (지원/선정/거절)
- [x] 인플루언서 검색/필터 API
- [x] 인플루언서 게시물 크롤링 API
- [x] Bootpay 결제 연동
- [x] Celery 자동 스캔/매칭/삭제감지

### Frontend UI
- [x] 광고주 캠페인 등록 (보상 유형: 제품/현금/혼합)
- [x] 인플루언서 탐색 (검색/필터/상세패널)
- [x] 즐겨찾기 관리
- [x] 리포트 대시보드
- [x] 마이페이지

---

## Celery 스케줄러

| 태스크 | 주기 | 설명 | 상태 |
|--------|------|------|------|
| `scan_active_campaigns` | 30분 | 인플루언서 새 게시글 스캔 | ✅ |
| `update_content_metrics` | 1시간 | 좋아요/댓글 수 업데이트 | ✅ |
| `check_content_existence` | 6시간 | 콘텐츠 삭제 여부 감지 | ✅ |
| `crawl_all_influencers` | 6시간 | 모든 인플루언서 게시물 크롤링 | ✅ |
| `refresh_stale_thumbnails` | 매일 3시 | 오래된 썸네일 URL 갱신 | ✅ |

---

## 태그바이 vs 우리 시스템 비교

| 기능 | 태그바이 | 우리 시스템 |
|------|---------|------------|
| 캠페인 등록 | ✅ | ✅ |
| 보상 유형 (제품/현금/혼합) | ✅ | ✅ |
| 인플루언서 검색 | ✅ | ✅ |
| 캠페인 지원 | ✅ | ✅ |
| 인플루언서 선정 | ✅ | ✅ |
| 콘텐츠 URL 수동 제출 | ✅ | 🔲 |
| 콘텐츠 자동 감지 | ❌ | ✅ (우위) |
| 콘텐츠 승인/거절 | ✅ | ✅ |
| 콘텐츠 삭제 감지 | ✅ | ✅ |
| 에스크로 정산 | ✅ | 🔲 |
| 채팅 | ✅ | 🔲 |

---

## 참고

- 서비스 기획서: `tagbuy-service-plan.md`
- 서비스 구성도: `CLAUDE.md`
- 태그바이 참고: https://tag-by.com
