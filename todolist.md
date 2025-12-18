# TagBuy 개발 TODO List

> 마지막 업데이트: 2025-12-18

---

## 현재 완성도

| 영역 | Backend API | Frontend UI |
|------|-------------|-------------|
| 인증 | 80% | 90% |
| 인플루언서 | 95% | 90% |
| 캠페인 | 0% | 60% |
| 결제/에스크로 | 0% | 0% |
| 콘텐츠 | 60% | 30% |
| 관리자 | 40% | 70% |
| **전체** | **~45%** | **~60%** |

---

## Tier 1 - MVP 필수 (핵심 비즈니스)

### Backend API

- [ ] **캠페인 CRUD API** `/api/v1/campaigns`
  - [ ] `POST /campaigns` - 캠페인 생성
  - [ ] `GET /campaigns` - 캠페인 목록 (페이지네이션, 필터)
  - [ ] `GET /campaigns/{id}` - 캠페인 상세
  - [ ] `PUT /campaigns/{id}` - 캠페인 수정
  - [ ] `DELETE /campaigns/{id}` - 캠페인 삭제
  - [ ] `POST /campaigns/{id}/publish` - 캠페인 게시
  - [ ] `POST /campaigns/{id}/close` - 캠페인 종료
  - [ ] 파일: `backend/app/api/v1/campaigns.py`
  - [ ] 서비스: `backend/app/services/campaign_service.py`

- [ ] **캠페인 참여 API**
  - [ ] `GET /campaigns/{id}/participants` - 참여자 목록
  - [ ] `POST /campaigns/{id}/select-influencers` - 인플루언서 선택
  - [ ] `POST /campaigns/{id}/apply` - 캠페인 지원 (인플루언서)
  - [ ] `GET /influencer/applications` - 내 지원 목록
  - [ ] `DELETE /influencer/applications/{id}` - 지원 취소

- [ ] **콘텐츠 제출 완성**
  - [ ] `POST /contents/submit` 구현 (현재 501 반환)
  - [ ] 인플루언서 인증 컨텍스트 추가
  - [ ] 캠페인 요구사항 검증 (해시태그, 멘션)
  - [ ] 파일: `backend/app/api/v1/contents.py` 수정

- [ ] **결제/PG 연동**
  - [ ] Bootpay 클라이언트 구현
  - [ ] `POST /payments/prepare` - 결제 준비
  - [ ] `POST /payments/confirm` - 결제 확인
  - [ ] `GET /payments/history` - 결제 내역
  - [ ] 파일: `backend/app/integrations/bootpay/client.py`
  - [ ] 파일: `backend/app/api/v1/payments.py`

- [ ] **에스크로/정산 API**
  - [ ] `POST /escrow/deposit` - 에스크로 예치
  - [ ] `POST /escrow/release` - 에스크로 해제
  - [ ] `GET /settlements` - 정산 내역
  - [ ] `POST /withdrawals` - 출금 신청
  - [ ] `GET /withdrawals` - 출금 내역
  - [ ] 파일: `backend/app/services/escrow_service.py`
  - [ ] 파일: `backend/app/models/payment.py`

### Frontend UI

- [ ] **광고주 캠페인 상세 페이지** `/advertiser/campaigns/[id]`
  - [ ] 캠페인 정보 표시
  - [ ] 지원자 목록 및 승인/거절
  - [ ] 콘텐츠 리뷰 (승인/거절)
  - [ ] 캠페인 상태 관리

- [ ] **인플루언서 캠페인 상세 페이지** `/influencer/campaigns/[id]`
  - [ ] 캠페인 상세 정보
  - [ ] 지원하기 버튼 및 폼
  - [ ] 요구사항 체크리스트

- [ ] **인플루언서 내 캠페인** `/influencer/my-campaigns`
  - [ ] 참여중인 캠페인 목록
  - [ ] 콘텐츠 제출 폼
  - [ ] 진행 상태 표시

---

## Tier 2 - 중요 (사용자 경험)

### Backend API

- [ ] **사용자 프로필 API**
  - [ ] `PUT /users/me` - 프로필 수정
  - [ ] `PUT /users/me/password` - 비밀번호 변경
  - [ ] `DELETE /users/me` - 계정 삭제

- [ ] **은행 계좌 API**
  - [ ] `POST /users/me/bank-account` - 계좌 등록
  - [ ] `GET /users/me/bank-account` - 계좌 조회
  - [ ] `DELETE /users/me/bank-account` - 계좌 삭제

- [ ] **인증 확장**
  - [ ] `POST /auth/forgot-password` - 비밀번호 찾기
  - [ ] `POST /auth/reset-password` - 비밀번호 재설정
  - [ ] `POST /auth/verify-email` - 이메일 인증
  - [ ] `POST /auth/refresh` - 토큰 갱신

- [ ] **알림 시스템**
  - [ ] 알림 모델 생성
  - [ ] `GET /notifications` - 알림 목록
  - [ ] `PUT /notifications/{id}/read` - 읽음 처리
  - [ ] 이메일 발송 서비스

### Frontend UI

- [ ] **비밀번호 찾기** `/auth/forgot-password`
  - [ ] 이메일 입력 폼
  - [ ] 재설정 링크 발송 확인

- [ ] **인플루언서 설정** `/influencer/settings`
  - [ ] 프로필 수정
  - [ ] Instagram 연동 관리
  - [ ] 은행 계좌 등록/수정
  - [ ] 알림 설정

- [ ] **광고주 설정** `/advertiser/settings`
  - [ ] 회사 정보 수정
  - [ ] 결제 수단 관리
  - [ ] 알림 설정

- [ ] **광고주 결제 내역** `/advertiser/payments`
  - [ ] 실제 API 연동
  - [ ] 결제 상세 내역
  - [ ] 세금계산서 발행

---

## Tier 3 - 개선 (기능 완성도)

### Backend API

- [ ] **캠페인 분석 API**
  - [ ] `GET /campaigns/{id}/analytics` - 캠페인 성과
  - [ ] `GET /campaigns/{id}/report` - 리포트 생성

- [ ] **관리자 확장**
  - [ ] `GET /admin/users` - 사용자 목록
  - [ ] `PUT /admin/users/{id}/status` - 사용자 상태 변경
  - [ ] `GET /admin/campaigns` - 전체 캠페인 관리
  - [ ] `GET /admin/disputes` - 분쟁 목록
  - [ ] `PUT /admin/disputes/{id}` - 분쟁 처리

- [ ] **고급 기능**
  - [ ] `GET /campaigns/{id}/recommendations` - AI 인플루언서 추천
  - [ ] 콘텐츠 삭제 자동 감지
  - [ ] 실시간 메트릭 수집 스케줄러

### Frontend UI

- [ ] **광고주 분석/리포트** `/advertiser/analytics`
  - [ ] 캠페인별 성과 차트
  - [ ] ROI 분석
  - [ ] 인플루언서 성과 비교

- [ ] **관리자 사용자 관리** `/admin/users`
  - [ ] 사용자 목록
  - [ ] 계정 활성화/비활성화
  - [ ] 역할 변경

- [ ] **관리자 캠페인 관리** `/admin/campaigns`
  - [ ] 전체 캠페인 목록
  - [ ] 캠페인 검토/승인

- [ ] **관리자 분쟁 처리** `/admin/disputes`
  - [ ] 분쟁 목록
  - [ ] 상세 내역 및 처리

---

## 기술 부채 / 개선사항

### Backend

- [ ] 테스트 코드 작성
  - [ ] Unit tests for services
  - [ ] Integration tests for API
  - [ ] E2E tests for critical flows

- [ ] 보안 강화
  - [ ] Rate limiting 적용
  - [ ] Input validation 강화
  - [ ] SQL injection 방지 검증

- [ ] 성능 최적화
  - [ ] DB 인덱스 최적화
  - [ ] 캐싱 전략 (Redis)
  - [ ] API 응답 최적화

### Frontend

- [ ] 상태 관리 개선
  - [ ] React Query 캐싱 최적화
  - [ ] 에러 바운더리 추가

- [ ] UX 개선
  - [ ] 로딩 스켈레톤
  - [ ] 토스트 알림
  - [ ] 폼 자동저장

- [ ] 접근성
  - [ ] ARIA 라벨 추가
  - [ ] 키보드 네비게이션
  - [ ] 스크린 리더 지원

- [ ] 모바일 최적화
  - [ ] 반응형 테스트
  - [ ] 터치 인터랙션

---

## 누락된 파일 목록

### Backend - 생성 필요

```
backend/app/api/v1/campaigns.py
backend/app/api/v1/payments.py
backend/app/services/campaign_service.py
backend/app/services/payment_service.py
backend/app/services/escrow_service.py
backend/app/services/notification_service.py
backend/app/integrations/bootpay/
├── __init__.py
├── client.py
└── escrow_service.py
backend/app/models/payment.py
backend/app/models/notification.py
backend/app/schemas/payment.py
backend/app/schemas/notification.py
```

### Frontend - 생성 필요

```
frontend/app/advertiser/campaigns/[id]/page.tsx
frontend/app/advertiser/analytics/page.tsx
frontend/app/influencer/campaigns/[id]/page.tsx
frontend/app/influencer/my-campaigns/page.tsx
frontend/app/influencer/settings/page.tsx
frontend/app/auth/forgot-password/page.tsx
frontend/app/auth/reset-password/page.tsx
frontend/app/admin/users/page.tsx
frontend/app/admin/campaigns/page.tsx
frontend/app/admin/disputes/page.tsx
frontend/components/campaign/
├── campaign-detail.tsx
├── participant-list.tsx
├── content-review.tsx
└── application-form.tsx
frontend/components/payment/
├── payment-form.tsx
├── payment-history.tsx
└── bank-account-form.tsx
```

---

## 마일스톤

### Phase 1: MVP Core (예상: 2주)
- 캠페인 CRUD API
- 캠페인 상세 페이지 (광고주/인플루언서)
- 콘텐츠 제출 완성

### Phase 2: Payment (예상: 2주)
- Bootpay 연동
- 에스크로 시스템
- 정산/출금 기능

### Phase 3: Polish (예상: 1주)
- 사용자 설정 페이지
- 알림 시스템
- 관리자 기능 확장

### Phase 4: Launch Prep (예상: 1주)
- 테스트 및 버그 수정
- 성능 최적화
- 문서화

---

## 참고

- 서비스 기획서: `tagbuy-service-plan.md`
- Instagram 연동 설계: `tagbuy-instagram-architecture.md`
- 개발 가이드: `CLAUDE.md`
