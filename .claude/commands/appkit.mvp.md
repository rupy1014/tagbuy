---
description: MVP 범위 정하기 - 최소한의 기능으로 최대한의 검증 + 랜딩페이지 생성
---

## User Input

```text
$ARGUMENTS
```

User input **may** contain constraints like "2-week validation", "budget: 500만원" etc.

## Overview

**논리적 사고 5단계 워크플로우**:

```
1. /appkit.new       → 아이디어 스케치 (어떤 서비스인지?)
2. /appkit.mvp       → MVP 범위 정하기 + 랜딩페이지 ← YOU ARE HERE
3. /appkit.ui        → 화면설계서 (라우터, 화면, 컴포넌트)
4. /appkit.policy    → 정책설계서 (비즈니스 규칙)
5. /appkit.visualize → 목업 생성 (HTML 프로토타입)
```

**출력 디렉토리**: `docs/`

## Purpose

핵심 가치만 구현하여 빠르게 시장 검증을 하기 위한 MVP 범위를 정의합니다.
"있으면 좋은" 기능을 제외하고 "없으면 안되는" 기능만 선별합니다.
**추가로, MVP 검증을 위한 랜딩페이지를 HTML로 생성합니다.**

**핵심 질문**: "최소한으로 검증하려면 뭐가 필요할까?"

---

## Pre-requisite

- `/appkit.new`로 서비스 컨셉이 정의되어 있어야 함
- `concept.md` 파일이 존재해야 함

---

## Execution Flow

### 1. 기존 기획 읽기

Read files from `docs/`:
- `concept.md` - 서비스 컨셉

### 2. MVP 정의 대화

**Step 1: 핵심 가치 파악**

```markdown
## MVP 분석

### The ONE Thing Test
"만약 딱 하나의 기능만 만들 수 있다면?"
→ [핵심 기능 도출]

### 기능 분류

**Phase 0: Core MVP (2주)**
"없으면 서비스가 성립 안 되는 기능"

✅ Must Have (핵심):
- [기능 1]: [이유]
- [기능 2]: [이유]

❌ 제외할 것:
- [기능 A]: [Phase 1으로]
- [기능 B]: [Phase 2로]

**Phase 1: Enhanced MVP (1개월)**
"사용자 만족도를 높이는 기능"

- [기능 A]
- [기능 C]

**Phase 2: Growth (3개월)**
"성장과 확장을 위한 기능"

- [기능 B]
- [기능 D]

---

이 MVP 범위가 맞나요? 조정하고 싶은 부분이 있나요?
```

**Step 2: 사용자 피드백**

- "좋아", "Yes" → MVP 문서 + 랜딩페이지 생성
- 조정 요청 → 업데이트 후 재제시

### 3. MVP 문서 생성

**File**: `docs/mvp-scope.md`

```markdown
# MVP Scope Definition

## Overview
- **서비스명**: [서비스명]
- **MVP 목표**: [목표 한 줄 정의]
- **검증 기간**: 2주

---

## Phase 0: Core MVP (2주)

### Must Have
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| [기능1] | [설명] | P0 |
| [기능2] | [설명] | P0 |

### 구현 수준
- UI: [기본 모바일 웹 / 앱 등]
- 백엔드: [최소 API 개수]
- 결제: [결제 방식]
- 인증: [인증 방식]

### 제외 항목
| 기능 | 이유 | 예정 Phase |
|------|------|------------|
| [기능A] | [이유] | Phase 1 |
| [기능B] | [이유] | Phase 2 |

---

## Phase 1: Enhanced MVP (1개월)

### Should Have
| 기능 | 설명 |
|------|------|
| [기능A] | [설명] |

### 검증 목표
- [지표 1]
- [지표 2]

---

## Phase 2: Growth (3개월)

### Nice to Have
| 기능 | 설명 |
|------|------|
| [기능B] | [설명] |

---

## 검증 지표

### Success Metrics (성공 지표)
- [정량 지표 1]
- [정량 지표 2]

### Learning Metrics (학습 지표)
- [학습할 것 1]
- [학습할 것 2]

### Pivot Indicators (피벗 신호)
- 🚨 [위험 신호 1]
- 🚨 [위험 신호 2]

---

## MVP Checklist

### Before Launch
- [ ] 핵심 가치 명확한가?
- [ ] 타겟 사용자 명확한가?
- [ ] 성공 지표 정의했나?
- [ ] 2주 안에 가능한가?

### During Development
- [ ] Scope creep 발생하지 않았나?
- [ ] 핵심 플로우만 집중했나?

### After Launch
- [ ] 정량 지표 달성했나?
- [ ] 다음 단계 명확한가?
```

---

### 4. 랜딩페이지 생성

**Template 참조**: `.specify/templates/sales-landing-template.html`

**File**: `docs/landing.html`

랜딩페이지는 다음 섹션을 포함해야 합니다:

#### 4-1. 랜딩페이지 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- SEO Meta Tags -->
    <title>[서비스명] - [한 줄 슬로건]</title>
    <meta name="description" content="[서비스 설명 2-3문장]">
    <meta name="keywords" content="[키워드1], [키워드2], [키워드3]">

    <!-- Open Graph -->
    <meta property="og:title" content="[서비스명] - [슬로건]">
    <meta property="og:description" content="[서비스 설명]">
    <meta property="og:type" content="website">

    <!-- Fonts & Styles -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        /* 템플릿 스타일 적용 */
    </style>
</head>
<body>
    <!-- 1. Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <span class="badge">[배지 텍스트 - 예: 🚀 사전 등록 중]</span>
            <h1>[메인 헤드라인]<br>[서브 헤드라인]</h1>
            <p class="tagline">[2-3문장의 핵심 가치 설명]</p>
            <a href="#cta" class="cta-button">[CTA 버튼 텍스트]</a>
        </div>
    </section>

    <!-- 2. Problem Section: 공감 유도 -->
    <section class="problem">
        <div class="container">
            <h2 class="section-title">[문제 제기 질문]</h2>
            <ul class="problem-list">
                <li>[고객 Pain Point 1]</li>
                <li>[고객 Pain Point 2]</li>
                <li>[고객 Pain Point 3]</li>
            </ul>
            <div class="highlight-box">
                <p>[문제 요약]</p>
                <p class="key">[핵심 메시지/솔루션 티저]</p>
            </div>
        </div>
    </section>

    <!-- 3. Solution Section: 해결책 제시 -->
    <section class="solution">
        <div class="container">
            <h2 class="section-title">[솔루션 헤드라인]</h2>
            <p class="section-subtitle">[솔루션 설명]</p>
            <div class="feature-grid">
                <div class="feature-card">
                    <span class="feature-icon">[이모지]</span>
                    <h3>[기능 1]</h3>
                    <p>[기능 1 설명]</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">[이모지]</span>
                    <h3>[기능 2]</h3>
                    <p>[기능 2 설명]</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">[이모지]</span>
                    <h3>[기능 3]</h3>
                    <p>[기능 3 설명]</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. How It Works: 작동 방식 -->
    <section class="how-it-works">
        <div class="container">
            <h2 class="section-title">어떻게 이용하나요?</h2>
            <div class="steps">
                <div class="step">
                    <span class="step-number">1</span>
                    <h3>[단계 1]</h3>
                    <p>[설명]</p>
                </div>
                <div class="step">
                    <span class="step-number">2</span>
                    <h3>[단계 2]</h3>
                    <p>[설명]</p>
                </div>
                <div class="step">
                    <span class="step-number">3</span>
                    <h3>[단계 3]</h3>
                    <p>[설명]</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. Social Proof (Optional): 신뢰 요소 -->
    <section class="social-proof">
        <div class="container">
            <h2 class="section-title">이런 분들이 사용합니다</h2>
            <div class="testimonials">
                <!-- 후기 또는 사용자 유형 -->
            </div>
        </div>
    </section>

    <!-- 6. Pricing (Optional): 가격 -->
    <section class="pricing">
        <div class="container">
            <h2 class="section-title">합리적인 가격</h2>
            <div class="pricing-cards">
                <!-- 가격 카드 -->
            </div>
        </div>
    </section>

    <!-- 7. FAQ Section -->
    <section class="faq">
        <div class="container">
            <h2 class="section-title">자주 묻는 질문</h2>
            <div class="faq-list">
                <div class="faq-item">
                    <h3 class="faq-question">[질문 1]</h3>
                    <p class="faq-answer">[답변 1]</p>
                </div>
                <!-- 더 많은 FAQ -->
            </div>
        </div>
    </section>

    <!-- 8. Final CTA -->
    <section class="final-cta" id="cta">
        <div class="container">
            <h2>[최종 CTA 헤드라인]</h2>
            <p>[마지막 설득 문구]</p>
            <a href="[링크]" class="cta-button cta-large">[CTA 버튼]</a>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <p>© 2024 [서비스명]. All rights reserved.</p>
    </footer>

    <script>
        // Scroll Animation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    </script>
</body>
</html>
```

#### 4-2. 스타일 가이드 (템플릿 참조)

```css
:root {
    --primary: #7C3AED;          /* 메인 컬러 (보라) */
    --primary-light: #8B5CF6;
    --primary-dark: #6D28D9;
    --bg-white: #FFFFFF;
    --bg-gray: #F5F7FA;
    --text-primary: #1F2937;
    --text-secondary: #6B7280;
    --border: #E5E7EB;
}

/* 반응형 브레이크포인트 */
/* Mobile: default */
/* Tablet: @media (min-width: 768px) */
/* Desktop: @media (min-width: 912px) */
```

#### 4-3. 랜딩페이지 생성 원칙

**Do's**:
- ✅ 고객의 Pain Point로 시작
- ✅ 명확한 CTA (Call to Action)
- ✅ 모바일 퍼스트 디자인
- ✅ 스크롤 애니메이션 적용
- ✅ SEO 메타태그 완성
- ✅ 3-5개 핵심 기능만 강조

**Don'ts**:
- ❌ 기능 나열식 설명
- ❌ 전문 용어 남발
- ❌ CTA 없는 섹션
- ❌ 과도한 정보량

---

### 5. 완료 리포트

```
✅ MVP 범위 정의 + 랜딩페이지 생성 완료!

📁 생성된 파일:
- docs/mvp-scope.md
- docs/landing.html

📊 MVP 요약:
- Phase 0 기능: [N개]
- Phase 1 기능: [N개]
- Phase 2 기능: [N개]

🌐 랜딩페이지:
- 섹션: [N개]
- CTA: [N개]
- 브라우저에서 확인: file:///...landing.html

📝 다음 단계:

**Step 3 - 화면설계서 (/appkit.ui)**
  /appkit.ui

**Step 4 - 정책설계서 (/appkit.policy)**
  /appkit.policy

**Step 5 - HTML 목업 (/appkit.visualize)**
  /appkit.visualize all

📍 현재 위치: Step 2/5 완료
```

---

## MVP 원칙

### Do's
- ✅ **Maximize Learning**: 최소 투자로 최대 학습
- ✅ **Ship Fast**: 완벽보다 속도
- ✅ **Core Value Only**: 핵심 가치만 구현
- ✅ **Real Users**: 실제 사용자로 검증
- ✅ **Metrics-Driven**: 감이 아닌 데이터로 결정

### Don'ts
- ❌ **Feature Creep**: "이것도 있으면 좋겠는데..."
- ❌ **Perfectionism**: "조금만 더 다듬고..."
- ❌ **Assumption**: "사용자는 당연히..."
- ❌ **Premature Scaling**: 검증 전 확장

---

## Tips

- **Time Box**: 2주를 넘기지 마라
- **User Cap**: 10-100명으로 시작
- **Manual First**: 자동화는 나중에
- **Talk to Users**: 매일 사용자와 대화
- **Kill Features**: 과감하게 빼라
- **Landing First**: 랜딩페이지로 관심도 먼저 검증

---

## Example

```
$ /appkit.mvp

🎯 MVP Scope 정의

Phase 0 (2주):
✅ 검색 (위치 기반)
✅ 예약 (실시간)
✅ 결제 (간단)

❌ 제외:
- 리뷰 (Phase 1)
- 커뮤니티 (Phase 2)

검증 목표:
- 주간 10건 예약
- 10명 활성 사용자

✅ mvp-scope.md 생성 완료
✅ landing.html 생성 완료

🌐 랜딩페이지 미리보기:
file:///Users/.../ui/works/landing.html
```
