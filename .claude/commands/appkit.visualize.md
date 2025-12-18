---
description: 목업 생성 - HTML 기반 라이브 프로토타입 UI 생성
---

## User Input

```text
$ARGUMENTS
```

**이 명령어는 인자를 받지 않습니다.**
사용자가 `/appkit.visualize`를 실행하면 자동으로:
- `index.html` (통합 뷰어)
- 모든 화면 목업 (`.html` 파일들)
- 공통 스타일/스크립트 파일

모두 생성합니다.

## Overview

**논리적 사고 5단계 워크플로우**:

```
1. /appkit.new       → 아이디어 스케치 (어떤 서비스인지?)
2. /appkit.mvp       → MVP 범위 정하기 + 랜딩페이지
3. /appkit.ui        → 화면설계서 (라우터, 화면, 컴포넌트)
4. /appkit.policy    → 정책설계서 (비즈니스 규칙)
5. /appkit.visualize → 목업 생성 (HTML 프로토타입) ← YOU ARE HERE
```

**출력 디렉토리**: `docs/mockup`

## Purpose

UI 설계서(`docs/ui/*.md`)와 정책 설계서(`docs/policies/*.md`)를 기반으로:
1. 실제 동작하는 HTML 목업을 생성합니다
2. **통합 뷰어(index.html)**: UI 설계서, 정책 설계서, 목업을 한 곳에서 볼 수 있는 인터랙티브 문서 생성

브라우저에서 바로 확인할 수 있는 라이브 프로토타입입니다.

---

## Pre-requisite

- `/appkit.ui`로 화면설계가 되어 있어야 함
- `docs/ui/router.md` 파일이 존재해야 함
- `docs/ui/main.md` 파일이 존재해야 함
- `docs/ui/[screen].md` 화면별 상세 문서가 존재해야 함

---

## Usage

```bash
/appkit.visualize              # 통합 뷰어(index.html) + 모든 화면 목업 생성
```

**자동 생성 항목:**
1. `docs/mockup/index.html` - 통합 뷰어 (UI 설계서 + 정책 설계서 + 목업 링크)
2. `docs/mockup/[screen].html` - 모든 화면 목업
3. `docs/mockup/styles.css` - 공통 스타일
4. `docs/mockup/scripts.js` - 공통 스크립트

---

## Execution Flow

### 1. 기존 기획 읽기

Read files from `docs/`:
- `ui/router.md` - 라우터 및 화면 목록
- `ui/main.md` - 메인 구조
- `ui/*.md` - 각 화면별 상세 문서
- `policies/*.md` - 정책 문서

### 2. 통합 뷰어 (index.html) 생성

**최우선 작업**: `docs/mockup/index.html` 생성/업데이트

통합 뷰어는 다음을 포함:
1. **UI 설계서 뷰어**: `docs/ui/*.md` 파일들을 읽어서 화면별 탭으로 표시
2. **정책 설계서 뷰어**: `docs/policies/*.md` 파일들을 읽어서 정책별 탭으로 표시
3. **목업 링크**: 생성된 HTML 목업으로 바로 이동할 수 있는 네비게이션

**index.html 구조**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <title>[서비스명] - 통합 문서 뷰어</title>
  <!-- 스타일 -->
</head>
<body>
  <!-- 상단 네비게이션 -->
  <nav>
    <button data-tab="ui">UI 설계서</button>
    <button data-tab="policies">정책 설계서</button>
    <button data-tab="mockups">목업</button>
  </nav>

  <!-- UI 설계서 탭 -->
  <section id="ui-tab">
    <aside>
      <!-- docs/ui/*.md 파일 목록 -->
    </aside>
    <main>
      <!-- 선택된 MD 파일 내용 (HTML 변환) -->
    </main>
  </section>

  <!-- 정책 설계서 탭 -->
  <section id="policies-tab">
    <aside>
      <!-- docs/policies/*.md 파일 목록 -->
    </aside>
    <main>
      <!-- 선택된 정책 MD 파일 내용 (HTML 변환) -->
    </main>
  </section>

  <!-- 목업 탭 -->
  <section id="mockups-tab">
    <div class="mockup-grid">
      <!-- 각 화면 목업으로 가는 카드 링크 -->
    </div>
  </section>
</body>
</html>
```

**구현 방식**:
- Markdown 파일을 JavaScript로 읽어서 HTML로 변환
- 또는 빌드 시점에 모든 MD를 HTML로 변환하여 포함

---

### 3. 자동 화면 목업 생성

**자동으로 수행:**

1. `docs/ui/` 디렉토리에서 모든 `.md` 파일 스캔
2. `router.md`, `main.md`를 제외한 모든 화면 문서 감지
3. 각 화면별 HTML 목업 자동 생성

```markdown
## 목업 생성 시작

docs/ui/에서 확인된 화면 문서:

| 화면 | 파일 | 목업 |
|-----|------|-----|
| 친구 | `friends.md` | `friends.html` |
| 채팅 목록 | `chat-list.md` | `chat-list.html` |
| 채팅방 | `chat.md` | `chat.html` |
| 진행 | `progress.md` | `progress.html` |
| 쇼핑 | `shop.md` | `shop.html` |

모든 화면 목업을 생성합니다...
```

### 4. 화면별 HTML 목업 파일 생성

#### 4-1. 기본 구조

**File**: `docs/mockup/[screen].html`

**템플릿**: `.specify/templates/mockup-base.html` 참조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>[화면명] - [서비스명]</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app">
    <!-- Header -->
    <header class="header" id="[screen]-header">
      <!-- 헤더 컴포넌트 -->
    </header>

    <!-- Main Content -->
    <main class="content" id="[screen]-content">
      <!-- 메인 콘텐츠 -->
    </main>

    <!-- Tab Bar -->
    <nav class="tab-bar">
      <!-- 탭바 -->
    </nav>
  </div>

  <!-- Overlay -->
  <div class="overlay" id="overlay" onclick="closeAll()"></div>

  <!-- Modals/Popups -->
  <!-- 모달/팝업 -->

  <script src="scripts.js"></script>
  <script>
    // 화면별 스크립트
  </script>
</body>
</html>
```

#### 4-2. 공통 스타일시트 (styles.css)

```css
/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Colors */
  --bg-primary: #0D0D1A;
  --bg-secondary: #1A1A2E;
  --bg-card: #252538;
  --text-primary: #FFFFFF;
  --text-secondary: #9999AA;
  --accent-primary: #6C5CE7;
  --accent-secondary: #45B7D1;
  --accent-pink: #FF6B9D;
  --accent-gold: #FFD93D;
  --danger: #FF6B6B;
  --success: #4ECB71;

  /* Sizing */
  --header-height: 56px;
  --tab-height: 64px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  font-family: 'Noto Sans KR', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* App Container */
.app {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  background: var(--bg-primary);
}

/* Header */
.header {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: var(--bg-primary);
  padding: 12px 16px;
  z-index: 100;
}

/* Tab Bar */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  background: var(--bg-primary);
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  padding-bottom: calc(8px + var(--safe-area-bottom));
  border-top: 1px solid #2D2D3A;
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  position: relative;
}

.tab-item.active {
  color: var(--text-primary);
}

.tab-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.tab-label {
  font-size: 10px;
}

.tab-badge {
  position: absolute;
  top: 0;
  right: 8px;
  background: var(--danger);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* Content Area */
.content {
  padding-top: var(--header-height);
  padding-bottom: calc(var(--tab-height) + var(--safe-area-bottom));
  min-height: 100vh;
}

/* Cards */
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 16px;
  margin: 12px 16px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

/* Modal */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  max-width: 320px;
  width: 90%;
}

.modal.active {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) scale(1);
}

/* Overlay */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Toast */
.toast {
  position: fixed;
  bottom: calc(var(--tab-height) + 20px + var(--safe-area-bottom));
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: var(--bg-card);
  padding: 12px 24px;
  border-radius: 12px;
  opacity: 0;
  transition: all 0.3s;
  z-index: 1002;
}

.toast.active {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

#### 4-3. 공통 스크립트 (scripts.js)

```javascript
// Modal Functions
function showModal(id) {
  document.getElementById('overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}

function closeAll() {
  document.getElementById('overlay').classList.remove('active');
  document.querySelectorAll('.modal, .bottom-sheet').forEach(el => {
    el.classList.remove('active');
  });
}

// Toast Function
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, duration);
  }
}

// Tab Badge Update
function updateBadge(tabId, count) {
  const badge = document.querySelector(`#${tabId} .tab-badge`);
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}
```

---

### 5. 화면별 목업 생성 규칙

각 화면에 대해 `docs/ui/[screen].md`의 컴포넌트 정보를 기반으로 HTML 생성:

1. **헤더 영역**: `[screen]-header` 컴포넌트들
2. **메인 콘텐츠**: `[screen]-content` 내 컴포넌트들
3. **탭바**: 전역 탭바 (현재 탭 active 표시)
4. **팝업/모달**: `popup-*`, `bs-*` 컴포넌트들

### 6. 완료 리포트

```
✅ 목업 생성 완료!

📁 생성된 파일:
- mockup/index.html (통합 뷰어 - UI 설계서 + 정책 + 목업 링크) ⭐
- mockup/friends.html
- mockup/chat-list.html
- mockup/chat.html
- mockup/progress.html
- mockup/shop.html
- ... (총 N개 화면)
- mockup/styles.css
- mockup/scripts.js

🌐 브라우저에서 확인:

**📚 통합 뷰어 (여기서 시작하세요!)**
file:///Users/.../docs/mockup/index.html

📊 생성 요약:
- 통합 뷰어: 1개 (index.html)
- 화면 목업: N개
- UI 설계서: N개 문서 포함
- 정책 설계서: N개 문서 포함
- 전체 컴포넌트: N개

📝 참고:
- **index.html**에서 모든 설계 문서와 목업을 한 곳에서 확인할 수 있습니다
- 각 화면 목업은 상호 링크되어 네비게이션 테스트가 가능합니다
- 정책 문서와 연결된 UI 요소에는 정책 ID 주석이 포함되어 있습니다

📍 현재 위치: Step 5/5 완료!

🎉 이제 프로젝트 전체 문서를 index.html에서 확인하세요!
```

---

## 목업 생성 원칙

### Do's
- ✅ **docs/ui/router.md 기반**: 모든 컴포넌트 ID와 구조 준수
- ✅ **정책 연결**: UI에 적용되는 정책 ID 주석 추가
- ✅ **상호 링크**: 화면 간 네비게이션 동작
- ✅ **상태 표시**: Empty, Loading, Error 상태 시뮬레이션
- ✅ **반응형**: 모바일 퍼스트 (max-width: 430px)

### Don'ts
- ❌ **과도한 디자인**: 와이어프레임 수준 유지
- ❌ **하드코딩**: 데이터는 의미있는 샘플로
- ❌ **누락**: docs/ui/router.md에 정의된 컴포넌트 누락 금지

---

## 정책 연결 주석 예시

```html
<!-- [MN-001] 채팅권 잔액 표시 -->
<div class="token-badge">
  <span>💬</span>
  <span>127</span>
</div>

<!-- [GM-002] 예약 가능 시간: 24시간 전까지만 -->
<button class="btn-primary" disabled>
  예약 마감
</button>
```

---

## Example

```
$ /appkit.visualize

🎨 통합 뷰어 + 전체 목업 생성

📚 UI 설계서 읽기:
- docs/ui/router.md
- docs/ui/main.md
- docs/ui/friends.md
- docs/ui/chat-list.md
- docs/ui/chat.md
- docs/ui/progress.md
- docs/ui/shop.md

📋 정책 설계서 읽기:
- docs/policies/01-monetization.md
- docs/policies/02-gameplay.md
- docs/policies/03-dating.md

🌐 통합 뷰어 생성:
✅ mockup/index.html 생성
   - UI 설계서 뷰어 (7개 문서)
   - 정책 설계서 뷰어 (3개 문서)
   - 목업 네비게이션

📱 화면 목업 생성:
✅ mockup/friends.html
✅ mockup/chat-list.html
✅ mockup/chat.html
✅ mockup/progress.html
✅ mockup/shop.html
✅ mockup/styles.css
✅ mockup/scripts.js

🌐 브라우저에서 확인:
📚 file:///Users/.../docs/mockup/index.html

💡 Tip:
- index.html을 열면 모든 UI 설계서, 정책, 목업을 한 곳에서 볼 수 있습니다
- 각 화면 목업은 상호 링크되어 있어 네비게이션 테스트가 가능합니다
```
