---
description: 아이디어 스케치 - 막연한 아이디어를 서비스 컨셉으로 구체화
---

## User Input

```text
$ARGUMENTS
```

User input **must** be considered (if not empty).

## Overview

`/appkit.new` 뒤에 오는 텍스트가 앱 설명입니다.

**논리적 사고 5단계 워크플로우**:

```
1. /appkit.new       → 아이디어 스케치 (어떤 서비스인지?) ← YOU ARE HERE
2. /appkit.mvp       → MVP 범위 정하기 + 랜딩페이지
3. /appkit.ui        → 화면설계서 (라우터, 화면, 컴포넌트)
4. /appkit.policy    → 정책설계서 (비즈니스 규칙)
5. /appkit.visualize → 목업 생성 (HTML 프로토타입)
```

**출력 디렉토리**: `docs/`

---

## Execution Flow

### 1. 아이디어 스케치 (고객 중심 대화)

**Input**: 사용자의 자연어 앱 설명

**Step 1: 고객 문제 파악**
1. **무슨 문제를 해결하나?**
   - 현재 고객이 겪는 불편함
   - 기존 솔루션의 한계

2. **누가 이 문제를 겪나?**
   - 주요 타겟 고객군
   - 그들의 특성과 행동 패턴

**Step 2: 서비스 컨셉 제시**

```markdown
## 서비스 컨셉

**서비스명**: [추론한 이름 또는 사용자 입력]

### 핵심 문제와 해결책

**고객이 겪는 문제**:
- [구체적인 문제 1]
- [구체적인 문제 2]

**우리의 해결책**:
- [해결책 1]
- [해결책 2]

### 타겟 고객

**Primary (핵심 고객)**:
- [타겟 설명]

**Secondary (보조 고객)**:
- [보조 타겟 설명]

### 핵심 가치 (왜 써야 하나?)

1. **[가치1]**: [설명]
2. **[가치2]**: [설명]
3. **[가치3]**: [설명]

### 주요 기능 (고객 가치 중심)

1. **001-[feature]**: [설명]
2. **002-[feature]**: [설명]
3. **003-[feature]**: [설명]

### 수익 모델

- [수익원 1]
- [수익원 2]

---

이렇게 이해한 것이 맞나요? 수정하거나 추가하고 싶은 내용이 있나요?
```

**Step 3: 사용자 피드백 수신**

- "좋아", "Yes", "진행해" → Step 4로 이동
- 수정 요청 → 내용 업데이트 후 Step 2로
- 추가 기능 요청 → 기능 목록 추가 후 Step 2로

**Step 4: 최종 확인**

사용자가 확정하면:

```
✅ 서비스 컨셉 확정!

파일 생성 중...
```

---

### 2. 파일 생성 (사용자 확인 후에만)

**디렉토리 생성**:
- `docs/`
- `docs/specs/`
- 각 기능별 서브디렉토리 (`001-user/`, `002-venue/`, ...)

---

### 3. 서비스 컨셉 문서 생성

**File**: `docs/concept.md`

**Content**:

```markdown
# [서비스명] 서비스 컨셉

## 서비스 본질
[한 문장으로 서비스 정의]

## 해결하는 문제
- [문제 1]
- [문제 2]

## 타겟 고객

### Primary Persona
- [페르소나 설명]

### Secondary Personas
- [보조 페르소나들]

## 핵심 가치 제안
1. **[가치1]**: [설명]
2. **[가치2]**: [설명]
3. **[가치3]**: [설명]

## 주요 기능 (고객 가치 중심)
- **001-[feature]**: [설명]
- **002-[feature]**: [설명]
- **003-[feature]**: [설명]

## 비즈니스 모델
- [수익원 설명]
```

---

### 4. 개별 Spec 초안 생성

각 기능 디렉토리에 `spec.md` 파일 생성:

**File**: `docs/specs/001-[feature]/spec.md`

```markdown
# Spec: 001-[feature]

## Feature Name
[기능명]

## User Value (고객 가치)
- [가치 1]
- [가치 2]

## Target User (누가 쓸까?)
- Primary: [타겟]
- Use case: [사용 시나리오]

## User Journey & Screen Flow

### 1. [화면명]
- **UI Elements**: [UI 요소들]
- **CTA**: [주요 버튼/액션]
- **Next**: [다음 화면]

## Business Rules
- [규칙 1]
- [규칙 2]

## Edge Cases
- [예외 상황 1]
- [예외 상황 2]

## Dependencies
- [의존성]

---

💡 **더 구체화하려면**: `/appkit.ui`, `/appkit.policy` 실행
```

---

### 5. 완료 리포트

```
✅ 서비스 컨셉 정의 완료!

📁 생성된 파일:
- docs/concept.md
- docs/specs/001-[feature]/spec.md
- docs/specs/002-[feature]/spec.md
- ...

📝 다음 단계:

**Step 2 - MVP 범위 + 랜딩페이지 (/appkit.mvp)**
  /appkit.mvp

**Step 3 - 화면설계서 (/appkit.ui)**
  /appkit.ui

**Step 4 - 정책설계서 (/appkit.policy)**
  /appkit.policy

**Step 5 - HTML 목업 (/appkit.visualize)**
  /appkit.visualize all

📍 현재 위치: Step 1/5 완료
```

---

## Important Notes

### 필수 요구사항

1. **인터랙티브 프로세스 필수**:
   - 즉시 파일 생성 금지
   - Step 2에서 항상 요약 제시
   - 사용자 확인 후에만 파일 생성

2. **사용자 피드백 처리**:
   - "좋아", "Yes", "진행해" → 파일 생성 진행
   - 수정 요청 → 업데이트 후 재제시
   - 불확실하면 추가 질문

3. **확인 전 반복**:
   - 사용자 만족할 때까지 Step 2-3 반복

### 분석 가이드라인

1. **자연어 분석**:
   - 사용자 입력 신중히 분석
   - 도메인과 비즈니스 모델 추론
   - 합리적인 주요 기능 도출 (5-8개)

2. **번호 체계**:
   - 3자리 숫자 사용 (001, 002, 003, ...)
   - 논리적 순서로 정렬

3. **기능명**:
   - 짧고 명확하게
   - 소문자 영어와 하이픈 사용

---

## Example Flow

```
User: /appkit.new 테니스 코트 예약 앱

Claude: [Step 2 요약 제시]

User: 레슨 예약도 추가해줘

Claude: [업데이트된 요약 제시]

User: 좋아!

Claude: ✅ 확정! 파일 생성 중...
[파일 생성 실행]
```
