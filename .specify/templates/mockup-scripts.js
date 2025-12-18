/* ============================================
   [서비스명] - Mockup Scripts
   ============================================ */

// ============================================
// Modal Functions
// ============================================
function showModal(id) {
  document.getElementById('overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}

function showBottomSheet(id) {
  document.getElementById('overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}

function closeAll() {
  document.getElementById('overlay').classList.remove('active');
  document.querySelectorAll('.modal, .bottom-sheet').forEach(el => {
    el.classList.remove('active');
  });
}

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAll();
  }
});

// ============================================
// Toast Function
// ============================================
function showToast(message, type = 'default', duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'toast';
    if (type !== 'default') {
      toast.classList.add(type);
    }
    toast.classList.add('active');

    setTimeout(() => {
      toast.classList.remove('active');
    }, duration);
  }
}

// ============================================
// Tab Badge Update
// ============================================
function updateBadge(tabSelector, count) {
  const badge = document.querySelector(`${tabSelector} .tab-badge`);
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}

// ============================================
// Status Badge Update (Header)
// ============================================
function updateStatusBadge(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;

    // 색상 변경 (잔량에 따라)
    const badge = element.closest('.status-badge');
    if (badge) {
      badge.classList.remove('low', 'critical', 'empty');
      if (value <= 0) {
        badge.classList.add('empty');
      } else if (value < 10) {
        badge.classList.add('critical');
      } else if (value < 50) {
        badge.classList.add('low');
      }
    }
  }
}

// ============================================
// Loading State
// ============================================
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>로딩 중...</p>
      </div>
    `;
  }
}

function hideLoading(containerId, content) {
  const container = document.getElementById(containerId);
  if (container && content) {
    container.innerHTML = content;
  }
}

// ============================================
// Empty State
// ============================================
function showEmptyState(containerId, icon, title, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3 class="empty-title">${title}</h3>
        <p class="empty-message">${message}</p>
      </div>
    `;
  }
}

// ============================================
// Confirm Dialog
// ============================================
function showConfirm(title, message, onConfirm, onCancel) {
  // 동적 모달 생성
  const modalId = 'modal-confirm-' + Date.now();
  const modalHtml = `
    <div class="modal" id="${modalId}">
      <div class="modal-icon">❓</div>
      <h3 class="modal-title">${title}</h3>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="handleConfirmCancel('${modalId}')">취소</button>
        <button class="btn btn-primary" onclick="handleConfirmOk('${modalId}')">확인</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 콜백 저장
  window._confirmCallbacks = window._confirmCallbacks || {};
  window._confirmCallbacks[modalId] = { onConfirm, onCancel };

  // 모달 표시
  setTimeout(() => showModal(modalId), 10);
}

function handleConfirmOk(modalId) {
  const callbacks = window._confirmCallbacks[modalId];
  closeAll();
  document.getElementById(modalId).remove();
  if (callbacks && callbacks.onConfirm) {
    callbacks.onConfirm();
  }
  delete window._confirmCallbacks[modalId];
}

function handleConfirmCancel(modalId) {
  const callbacks = window._confirmCallbacks[modalId];
  closeAll();
  document.getElementById(modalId).remove();
  if (callbacks && callbacks.onCancel) {
    callbacks.onCancel();
  }
  delete window._confirmCallbacks[modalId];
}

// ============================================
// Form Validation Helpers
// ============================================
function validateRequired(value, fieldName) {
  if (!value || value.trim() === '') {
    return `${fieldName}을(를) 입력해주세요.`;
  }
  return null;
}

function validateLength(value, fieldName, min, max) {
  const len = value ? value.length : 0;
  if (min && len < min) {
    return `${fieldName}은(는) ${min}자 이상이어야 합니다.`;
  }
  if (max && len > max) {
    return `${fieldName}은(는) ${max}자 이하여야 합니다.`;
  }
  return null;
}

// ============================================
// Local Storage Helpers (Mock Data)
// ============================================
function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Storage save error:', e);
    return false;
  }
}

function loadData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Storage load error:', e);
    return defaultValue;
  }
}

// ============================================
// Animation Helpers
// ============================================
function fadeIn(element, duration = 300) {
  element.style.opacity = 0;
  element.style.display = 'block';

  let start = null;
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    element.style.opacity = progress;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function fadeOut(element, duration = 300) {
  let start = null;
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    element.style.opacity = 1 - progress;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.style.display = 'none';
    }
  }
  requestAnimationFrame(step);
}

// ============================================
// Utility Functions
// ============================================
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

  return date.toLocaleDateString('ko-KR');
}

// ============================================
// Debug Mode
// ============================================
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[Mockup]', ...args);
  }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  log('Mockup scripts loaded');

  // 현재 탭 활성화 표시
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
  document.querySelectorAll('.tab-item').forEach(tab => {
    const href = tab.getAttribute('href');
    if (href && href.includes(currentPage)) {
      tab.classList.add('active');
    } else if (tab.classList.contains('active') && !href.includes(currentPage)) {
      // center 탭이 아닌 경우에만 active 제거
      if (!tab.classList.contains('center')) {
        tab.classList.remove('active');
      }
    }
  });
});
