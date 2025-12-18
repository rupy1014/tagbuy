---
description: 정책설계서 - 비즈니스 규칙, 과금, 게임플레이 정책 정의
---

## User Input

```text
$ARGUMENTS
```

User input can be empty (전체) or specific policy category (monetization, gameplay, etc.)

## Overview

**논리적 사고 5단계 워크플로우**:

```
1. /appkit.new       → 아이디어 스케치 (어떤 서비스인지?)
2. /appkit.mvp       → MVP 범위 정하기 + 랜딩페이지
3. /appkit.ui        → 화면설계서 (라우터, 화면, 컴포넌트)
4. /appkit.policy    → 정책설계서 (비즈니스 규칙) ← YOU ARE HERE
5. /appkit.visualize → 목업 생성 (HTML 프로토타입)
```

**출력 디렉토리**: `docs/policies`

## Purpose

비즈니스 규칙, 과금 정책, 게임플레이 규칙, 콘텐츠 정책 등을 체계적으로 정의합니다.
개발자가 "이 경우엔 어떻게 해야 하지?"라는 질문에 답할 수 있는 명세를 작성합니다.

**정책 코드 체계**:
- `MN`: Monetization (과금/결제)
- `GM`: Gameplay (게임플레이/서비스 규칙)
- `CH`: Character/Content (콘텐츠/캐릭터)
- `PR`: Progression (진행/성장)
- `CR`: Content Rating (콘텐츠 등급)

---

## Pre-requisite

- `/appkit.new`로 서비스 컨셉이 정의되어 있어야 함
- (권장) `/appkit.ui`로 화면설계가 되어 있으면 더 좋음

---

## Usage

```bash
/appkit.policy                    # 전체 정책 설계
/appkit.policy monetization       # 과금 정책만
/appkit.policy gameplay           # 게임플레이 정책만
/appkit.policy "예약 취소"         # 특정 정책만
```

---

## Execution Flow

### 1. 기존 기획 읽기

Read files from `docs/`:
- `concept.md` - 서비스 컨셉
- `router.md` - 화면 구조

### 2. 정책 설계 대화

**Step 1: 정책 카테고리 도출**

```markdown
## 정책 설계 초안

이 서비스에 필요한 정책 카테고리:

| 코드 | 카테고리 | 설명 | 예시 |
|-----|---------|------|------|
| MN | 과금/결제 | 결제, 구독, 포인트 | 채팅권 소모, 구독 혜택 |
| GM | 서비스 규칙 | 핵심 기능 규칙 | 예약 규칙, 취소 정책 |
| CH | 콘텐츠 | 콘텐츠 관련 정책 | 리뷰 작성 규칙, 신고 |
| PR | 진행/성장 | 레벨, 등급 시스템 | 회원 등급, 포인트 적립 |

---

어떤 정책부터 정의할까요?
```

**Step 2: 사용자 피드백**

- "전체", "좋아" → 모든 카테고리 생성
- 특정 카테고리 지정 → 해당 카테고리만 생성

### 3. 생성할 문서들

#### 3-1. 00-policy-index.md (정책 인덱스)

**File**: `docs/policies/00-policy-index.md`

**템플릿**: `.specify/templates/policy-index.md` 참조

```markdown
# 정책 인덱스

> [서비스명] - 정책 문서 목록 및 화면 매핑

---

## 정책 문서 목록

| 코드 | 문서 | 설명 |
|-----|------|------|
| MN | [01-monetization.md](01-monetization.md) | 과금/결제 정책 |
| GM | [02-gameplay.md](02-gameplay.md) | 서비스 규칙 |
| CH | [03-content.md](03-content.md) | 콘텐츠 정책 |
| PR | [04-progression.md](04-progression.md) | 진행/성장 정책 |

---

## 화면별 적용 정책

| 화면 | 경로 | 적용 정책 |
|-----|------|----------|
| 홈 | `/` | GM-001, MN-001 |
| 예약 | `/booking` | GM-002, GM-003, MN-002 |
| 결제 | `/payment` | MN-003, MN-004 |
| 프로필 | `/profile` | PR-001, PR-002 |

---

## 정책별 적용 화면 (역매핑)

### 과금 정책 (MN)

| 정책 ID | 정책명 | 적용 화면 |
|---------|-------|----------|
| MN-001 | [정책명] | [화면 목록] |
| MN-002 | [정책명] | [화면 목록] |

### 서비스 규칙 (GM)

| 정책 ID | 정책명 | 적용 화면 |
|---------|-------|----------|
| GM-001 | [정책명] | [화면 목록] |
| GM-002 | [정책명] | [화면 목록] |

---

## 정책 변경 이력

| 날짜 | 정책 ID | 변경 내용 | 영향 화면 |
|-----|---------|----------|----------|
| YYYY-MM-DD | - | 초기 정책 프레임워크 생성 | 전체 |

---

## 사용법

### UI 문서에서 정책 참조

```markdown
## 화면명

### 적용 정책
- [MN-001] 채팅권 잔액 표시 → 헤더 우측에 배지 형태
- [GM-002] 예약 가능 시간 → 24시간 전까지만 가능
```

### 정책 문서에서 UI 영향 명시

```markdown
## MN-001: 채팅권 잔액 표시

### UI 영향
| 화면 | 위치 | 표시 방식 |
|-----|------|----------|
| 홈 | 헤더 우측 | 💬 127 (배지) |
```
```

#### 3-2. 01-monetization.md (과금 정책)

**File**: `docs/policies/01-monetization.md`

**템플릿**: `.specify/templates/policy-monetization.md` 참조

```markdown
# 과금 정책 (Monetization)

> 코드: `MN` | 결제, 구독, 포인트 관련 정책

---

## MN-001: [정책명]

### 정책 내용
- [정책 설명 1]
- [정책 설명 2]

### UI 영향

| 화면 | 위치 | 표시 방식 | mockup |
|-----|------|----------|--------|
| [화면] | [위치] | [방식] | [파일명].html |

### 표시 규칙

```
[상세 규칙 설명]
```

---

## MN-002: [정책명]

### 정책 내용
- [정책 설명]

### 적용 화면
- `[화면].html` - [용도]

### UI 표시

```
[UI 표시 예시]
```

---

## MN-003: [정책명]

### 정책 내용

| 항목 | 값 | 설명 |
|-----|-----|------|
| [항목1] | [값] | [설명] |
| [항목2] | [값] | [설명] |

### 적용 화면
- `[화면].html`

### UI 구성

```
[ASCII Art UI 예시]
┌─────────────────────────────────────┐
│  [UI 구성 요소]                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 관련 mockup

| 정책 | mockup 파일 |
|-----|------------|
| MN-001 | home.html, shop.html |
| MN-002 | payment.html |
| MN-003 | shop.html |
```

#### 3-3. 02-gameplay.md (서비스 규칙)

**File**: `docs/policies/02-gameplay.md`

```markdown
# 서비스 규칙 (Gameplay/Service)

> 코드: `GM` | 핵심 서비스 규칙

---

## GM-001: [규칙명]

### 정책 내용
- [규칙 설명]

### 로직

```
[로직 설명 또는 수도코드]
if (condition) {
  action();
}
```

### UI 영향

| 화면 | 영향 |
|-----|------|
| [화면] | [영향 설명] |

---

## GM-002: [규칙명]

### 정책 내용

| 조건 | 결과 | 비고 |
|-----|------|-----|
| [조건1] | [결과] | [비고] |
| [조건2] | [결과] | [비고] |

### 예외 처리

| 상황 | 처리 |
|-----|------|
| [상황1] | [처리 방법] |
| [상황2] | [처리 방법] |
```

---

### 4. 완료 리포트

```
✅ 정책설계서 작성 완료!

📁 생성된 파일:
- policies/00-policy-index.md
- policies/01-monetization.md
- policies/02-gameplay.md
- policies/03-content.md
- policies/04-progression.md

📊 요약:
- 정책 카테고리: N개
- 개별 정책: N개
- 화면 매핑: N개

📝 다음 단계:

**Step 5 - HTML 목업 (/appkit.visualize)**
  /appkit.visualize home
  /appkit.visualize all

📍 현재 위치: Step 4/5 완료
```

---

## 정책설계 원칙

### Do's
- ✅ **코드 체계**: 정책 ID 일관되게 사용 (MN-001, GM-002)
- ✅ **화면 매핑**: 정책이 어느 화면에 적용되는지 명시
- ✅ **UI 영향**: 정책이 UI에 어떻게 반영되는지 설명
- ✅ **예외 처리**: 모든 예외 상황 정의
- ✅ **mockup 연결**: 관련 HTML 목업 파일 명시

### Don'ts
- ❌ **모호함**: "적절히", "필요시" 같은 표현 지양
- ❌ **누락**: 예외 상황 누락 금지
- ❌ **불일치**: 정책 문서와 UI 문서 간 불일치 금지

---

## Example

```
$ /appkit.policy

📋 정책설계서 작성

정책 카테고리:
- MN: 과금/결제 (5개 정책)
- GM: 서비스 규칙 (8개 정책)
- CH: 콘텐츠 (3개 정책)
- PR: 진행/성장 (4개 정책)

화면-정책 매핑:
- /booking: GM-001, GM-002, MN-001
- /payment: MN-002, MN-003
- /profile: PR-001, PR-002

✅ 00-policy-index.md 생성 완료
✅ 01-monetization.md 생성 완료
✅ 02-gameplay.md 생성 완료
✅ 03-content.md 생성 완료
✅ 04-progression.md 생성 완료
```
