// NOTE: This file contains the original application logic, moved into an ES module.
// We intentionally keep the code largely intact to preserve behavior while enabling modular structure.

import { randomScrambleForEvent } from './scramble.js';

let solves = [];
let sessions = {};
let currentEvent = '333';
let isRunning = false;
let isReady = false;
let startTime;
let timerInterval;
let timerRafId = null;
let startPerf = 0;
let currentScramble = "";
let precision = 2;
let isManualMode = false;
let holdTimer = null;
let selectedSolveId = null;
let isAo5Mode = true;
let editingSessionId = null; 
let activeTool = 'scramble';
let holdDuration = 300; // ms
let wakeLock = null;
let isWakeLockEnabled = false;
// Inspection Logic Vars
let isInspectionMode = false;
let inspectionState = 'none'; // 'none', 'inspecting', 'holding'
let inspectionStartTime = 0;
let inspectionInterval = null;
let inspectionPenalty = null; // null, '+2', 'DNF'
let hasSpoken8 = false;
let hasSpoken12 = false;
let lastStopTimestamp = 0;
// i18n (Korean / English)
let currentLang = (localStorage.getItem('lang') || '').toLowerCase();
if (currentLang !== 'ko' && currentLang !== 'en') {
  const nav = (navigator.language || '').toLowerCase();
  currentLang = nav.startsWith('ko') ? 'ko' : 'en';
}
const I18N = {
  ko: {
    language: '언어',
    updateLog: '업데이트',
    latest: '최신',
    okGotIt: '확인',
    devLog: '개발자 로그',
    noDevLog: '현재 등록된 개발자 로그가 없습니다.',
    devSince: '시작:',
    scrambleLoading: '스크램블 로딩 중…',
    scrambleRetry: '실패. 탭해서 재시도',
    holdToReady: '길게 눌러 Ready',
    ready: 'Ready',
    running: 'RUNNING',
    stopped: 'STOPPED',
  },
  en: {
    language: 'Language',
    updateLog: 'Update Log',
    latest: 'Latest',
    okGotIt: 'Okay, got it!',
    devLog: 'Developer Log',
    noDevLog: 'No developer logs currently.',
    devSince: 'Since:',
    scrambleLoading: 'Loading scramble…',
    scrambleRetry: 'Failed. Tap to retry.',
    holdToReady: 'Hold to Ready',
    ready: 'Ready',
    running: 'RUNNING',
    stopped: 'STOPPED',
  }
};
function t(key) {
  const table = I18N[currentLang] || I18N.ko;
  return table[key] ?? key;
}

// Full-UI i18n helper
// 기존 HTML의 문구를 전부 data-i18n으로 바꾸지 않아도 되도록,
// 버튼/라벨/설명 등 고정 문구는 텍스트 매칭으로 일괄 번역합니다.
// (동적 값/숫자는 매칭되지 않도록 "완전 일치"만 처리)
const AUTO_I18N_PAIRS = [
  // Header / common
  { en: 'Backup', ko: '백업' },
  { en: 'Restore', ko: '복원' },
  { en: 'Close', ko: '닫기' },
  { en: 'Cancel', ko: '취소' },
  { en: 'Save', ko: '저장' },
  { en: 'Add', ko: '추가' },
  { en: 'Clear', ko: '초기화' },
  { en: 'Clear All', ko: '전체 삭제' },
  { en: 'Clear all history for this session?', ko: '이 세션의 기록을 모두 삭제할까요?' },
  { en: 'Timer', ko: '타이머' },
  { en: 'Stats', ko: '기록' },
  { en: 'History', ko: '기록' },
  { en: 'Settings', ko: '설정' },
  { en: 'Update Log', ko: '업데이트' },
  { en: 'Developer Log', ko: '개발자 로그' },
  { en: 'Event', ko: '종목' },
  { en: 'Scramble', ko: '스크램블' },
  { en: 'Tools', ko: '도구' },
  { en: 'Scramble Image', ko: '스크램블 이미지' },
  { en: 'Graph (Trends)', ko: '그래프(추세)' },
  { en: 'Visualizer for standard cubes only', ko: '기본 큐브 종목만 지원합니다' },

  // Bluetooth
  { en: 'Bluetooth Timer', ko: '블루투스 타이머' },
  { en: 'Connect your Gan Smart Timer', ko: 'Gan Smart Timer를 연결하세요' },
  { en: 'Device', ko: '기기' },
  { en: 'Connect Timer', ko: '타이머 연결' },
  { en: 'Disconnect', ko: '연결 해제' },

  // Sessions
  { en: 'Sessions', ko: '세션' },
  { en: 'Create New Session', ko: '새 세션 만들기' },
  { en: 'Session Name', ko: '세션 이름' },

  // MBF
  { en: 'Multi-Blind Scrambles', ko: '멀티블라인드 스크램블' },
  { en: 'Cubes', ko: '개' },
  { en: 'Copy All', ko: '전체 복사' },
  { en: 'MBF Result', ko: 'MBF 결과' },
  { en: 'WCA 형식(Attempted / Solved / Time)을 입력해 주세요.', ko: 'WCA 형식(시도 / 성공 / 시간)을 입력해 주세요.' },
  { en: 'Attempted', ko: '시도' },
  { en: 'Solved', ko: '성공' },
  { en: 'Time', ko: '시간' },
  { en: 'Enter number of cubes', ko: '큐브 개수 입력' },
  { en: 'e.g. 10', ko: '예: 10' },
  { en: 'mm:ss', ko: '분:초' },

  // Settings rows
  { en: 'Dark Mode', ko: '다크 모드' },
  { en: 'Prevent Sleep (Wake Lock)', ko: '화면 꺼짐 방지(Wake Lock)' },
  { en: 'WCA Inspection', ko: 'WCA 인스펙션' },
  { en: '15s countdown + voice', ko: '15초 카운트다운 + 음성' },
  { en: 'Hold Duration', ko: '홀드 시간' },

  // History footer
  { en: 'Avg of All', ko: '전체 평균' },
  { en: '(More)', ko: '(더보기)' },
  { en: 'Personal Best', ko: '개인 최고' },

  // Scramble status defaults
  { en: 'Generating...', ko: '생성 중…' },
  { en: 'Loading scramble…', ko: '스크램블 로딩 중…' },
  { en: 'Failed. Tap to retry.', ko: '실패. 탭해서 재시도' },
  { en: 'Hold to Ready', ko: '길게 눌러 Ready' },

  // Share / Settings
  { en: 'Save & Close', ko: '저장하고 닫기' },
  { en: 'Share Single', ko: '싱글 공유' },
  { en: 'Copy Text', ko: '텍스트 복사' },
  { en: 'Copied!', ko: '복사됨!' },
  { en: 'Date :', ko: '날짜 :' },
];

const AUTO_I18N_LOOKUP = (() => {
  const map = new Map();
  for (const p of AUTO_I18N_PAIRS) {
    map.set(p.en, p);
    map.set(p.ko, p);
  }
  return map;
})();

function applyAutoI18n(root = document) {
  // NOTE:
  // 기존 버전은 "자식 엘리먼트가 없는 요소"만 번역해서,
  // 아이콘(svg) + 텍스트 구조의 버튼/탭 라벨이 거의 번역되지 않았습니다.
  // -> 텍스트 노드(TreeWalker) 단위로 정확히 치환하도록 변경.
  if (!root) return;
  const targetLang = currentLang === 'ko' ? 'ko' : 'en';

  // Translate placeholders (inputs / textareas)
  try {
    const scope = root.querySelectorAll ? root : document;
    for (const el of scope.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      const ph = (el.getAttribute('placeholder') || '').trim();
      const pair = AUTO_I18N_LOOKUP.get(ph);
      if (pair) el.setAttribute('placeholder', pair[targetLang]);
    }

    // Translate common label attributes
    for (const el of scope.querySelectorAll('[aria-label],[title]')) {
      const aria = (el.getAttribute('aria-label') || '').trim();
      const pairA = aria ? AUTO_I18N_LOOKUP.get(aria) : null;
      if (pairA) el.setAttribute('aria-label', pairA[targetLang]);
      const title = (el.getAttribute('title') || '').trim();
      const pairT = title ? AUTO_I18N_LOOKUP.get(title) : null;
      if (pairT) el.setAttribute('title', pairT[targetLang]);
    }

    // Translate visible value text on <input> buttons (value="...")
    for (const el of scope.querySelectorAll('input[value]')) {
      const type = (el.getAttribute('type') || '').toLowerCase();
      // Only touch value for button-like inputs to avoid corrupting user data.
      if (!['button', 'submit', 'reset'].includes(type)) continue;
      const v = (el.getAttribute('value') || '').trim();
      const pairV = v ? AUTO_I18N_LOOKUP.get(v) : null;
      if (pairV) el.setAttribute('value', pairV[targetLang]);
    }

    // Translate data-* label helpers if present
    for (const el of scope.querySelectorAll('[data-label]')) {
      const v = (el.getAttribute('data-label') || '').trim();
      const pairV = v ? AUTO_I18N_LOOKUP.get(v) : null;
      if (pairV) el.setAttribute('data-label', pairV[targetLang]);
    }
  } catch (_) {}

  // Translate text nodes (including buttons with svg + text)
  const walkerRoot = root.nodeType === 9 ? root.body : root; // document -> body
  if (!walkerRoot) return;

  const walker = document.createTreeWalker(
    walkerRoot,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node || !node.parentNode) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode;
        // Skip script/style/noscript
        const tag = (parent.tagName || '').toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        const txt = (node.nodeValue || '').trim();
        if (!txt) return NodeFilter.FILTER_REJECT;
        // Exact-match only (avoid touching dynamic numbers)
        if (!AUTO_I18N_LOOKUP.has(txt)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    const raw = (node.nodeValue || '');
    const trimmed = raw.trim();
    const pair = AUTO_I18N_LOOKUP.get(trimmed);
    if (!pair) continue;
    // Preserve leading/trailing whitespace
    const leading = raw.match(/^\s*/)?.[0] ?? '';
    const trailing = raw.match(/\s*$/)?.[0] ?? '';
    node.nodeValue = `${leading}${pair[targetLang]}${trailing}`;
  }
}

// Keep UI translated even when other render functions overwrite text later.
// (e.g. switching tabs, re-rendering history/settings)
let i18nObserver = null;
let i18nRaf = 0;
function ensureI18nObserver() {
  if (i18nObserver) return;

  const roots = () => {
    // Only watch/translate areas where text is actually replaced dynamically
    // (Modals / overlays). Avoid scanning the entire app during rapid timer UI updates.
    return [
      'btOverlay',
      'sessionOverlay',
      'mbfScrambleOverlay',
      'mbfResultOverlay',
      'statsOverlay',
      'settingsOverlay',
      'avgShareOverlay',
      'modalOverlay',
      'updateLogOverlay',
      'knownIssuesOverlay',
    ]
      .map(id => document.getElementById(id))
      .filter(Boolean);
  };

  const debounced = () => {
    if (i18nRaf) cancelAnimationFrame(i18nRaf);
    i18nRaf = requestAnimationFrame(() => {
      try {
        // Translate only modal roots (fast)
        for (const r of roots()) applyAutoI18n(r);
      } catch (_) {}
    });
  };

  i18nObserver = new MutationObserver(debounced);
  try {
    for (const r of roots()) {
      i18nObserver.observe(r, { childList: true, subtree: true, characterData: true });
    }
  } catch (_) {}
}

window.setLanguage = (lang) => {
  if (lang !== 'ko' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyLanguageToUI();
  // Refresh modals content if open
  try { renderUpdateLog(true); } catch (_) {}
  try {
    const overlay = document.getElementById('knownIssuesOverlay');
    if (overlay && overlay.classList.contains('active')) window.openKnownIssues();
  } catch (_) {}
};
function applyLanguageToUI() {
  // Keep translations applied even if later renders overwrite texts.
  try { ensureI18nObserver(); } catch (_) {}
  document.documentElement.lang = currentLang;
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = currentLang;
  const langLabel = document.getElementById('langLabel');
  if (langLabel) langLabel.textContent = t('language');
  const scrambleLoadingText = document.getElementById('scrambleLoadingText');
  if (scrambleLoadingText) scrambleLoadingText.textContent = t('scrambleLoading');
  const scrambleRetryBtn = document.getElementById('scrambleRetryBtn');
  if (scrambleRetryBtn) scrambleRetryBtn.textContent = t('scrambleRetry');
  const statusHint = document.getElementById('statusHint');
  if (statusHint && !isRunning && !isReady) statusHint.textContent = t('holdToReady');

  // Update Log modal labels
  const updateOverlay = document.getElementById('updateLogOverlay');
  if (updateOverlay) {
    const title = updateOverlay.querySelector('h3');
    if (title) title.textContent = t('updateLog');
    const latestLabel = updateOverlay.querySelector('.tracking-widest');
    if (latestLabel) latestLabel.textContent = t('latest');
    const okBtn = updateOverlay.querySelector('button');
    if (okBtn) okBtn.textContent = t('okGotIt');
  }

  // Developer Log modal labels
  const devOverlay = document.getElementById('knownIssuesOverlay');
  if (devOverlay) {
    const title = devOverlay.querySelector('h3');
    if (title) title.textContent = t('devLog');
    const closeBtn = devOverlay.querySelector('button');
    if (closeBtn) closeBtn.textContent = currentLang === 'ko' ? '닫기' : 'Close';
  }

  // Finally, auto-translate remaining static UI strings & placeholders.
  // This is what makes the whole UI actually switch languages.
  try { applyAutoI18n(document); } catch (_) {}
}

// Release Notes / Developer Log (Settings에서 언제든 확인 가능)
const APP_VERSION = '2';
const RELEASE_NOTES = [
  {
    version: '2',
    date: '2026.01.22',
    items: {
      ko: [
        'PC, 모바일 UI/UX 개편',
        '모든 종목에서 스크램블 시각화 지원',
        '멀티블라인드 스코어 입력 기능 추가',
        '한국어 지원',
        '스페이스바를 통한 측정 정확도 개선',
      ],
      en: [
        'PC & Mobile UI/UX overhaul',
        'Scramble visualization support for all events',
        'Multi-Blind score input feature added',
        'Korean language support',
        'Improved measurement accuracy using the spacebar',
      ]
    }
  },
  {
    version: '1.1.1',
    date: '2025.12.22',
    items: {
      ko: ['스페이스바를 통한 측정 불가 현상 수정'],
      en: ['Fixed issue where timing did not work via Space key'],
    }
  },
  {
    version: '1.1',
    date: '2025.12.21',
    items: {
      ko: ['모바일 UI 개선', '인스펙션 기능 추가 (설정 탭)', '간 타이머 로직 수정'],
      en: ['Improved mobile UI', 'Added WCA inspection (Settings)', 'Adjusted GAN timer logic'],
    }
  },
  {
    version: 'BETA',
    date: '2025.12.20',
    items: {
      ko: ['BETA 공개'],
      en: ['BETA release'],
    }
  }
];
const KNOWN_ISSUES = [
  {
    id: 'DL-001',
    title: {
      ko: '모바일 UI가 여전히 모바일친화적이지 않아 수정 계획중입니다.',
      en: 'Mobile UI is still not fully mobile-friendly; improvements are planned.',
    },
    status: 'planning',
    since: '2026.01.22'
  }
];
// Lazy Loading Vars
let displayedSolvesCount = 50;
const SOLVES_BATCH_SIZE = 50;
let btDevice = null;
let btCharacteristic = null;
let isBtConnected = false;
let lastBtState = null;
// Scramble race-condition guard
let scrambleReqId = 0;
let lastScrambleTrigger = null; // retry 용
// MBF pending solve
let pendingMbfDraft = null;
const timerEl = document.getElementById('timer');
const scrambleEl = document.getElementById('scramble');
const mbfInputArea = document.getElementById('mbfInputArea');
const mbfCubeInput = document.getElementById('mbfCubeInput');
const manualInput = document.getElementById('manualInput');
const historyList = document.getElementById('historyList');
const solveCountEl = document.getElementById('solveCount');
const sessionAvgEl = document.getElementById('sessionAvg');
const bestSolveEl = document.getElementById('bestSolve');
const labelPrimaryAvg = document.getElementById('labelPrimaryAvg');
const displayPrimaryAvg = document.getElementById('displayPrimaryAvg');
const displayAo12 = document.getElementById('displayAo12');
const statusHint = document.getElementById('statusHint');
const plus2Btn = document.getElementById('plus2Btn');
const dnfBtn = document.getElementById('dnfBtn');
const visualizerCanvas = document.getElementById('cubeVisualizer');
const noVisualizerMsg = document.getElementById('noVisualizerMsg');
const avgModeToggle = document.getElementById('avgModeToggle');
const precisionToggle = document.getElementById('precisionToggle');
const manualEntryToggle = document.getElementById('manualEntryToggle');
const darkModeToggle = document.getElementById('darkModeToggle');
const wakeLockToggle = document.getElementById('wakeLockToggle');
const holdDurationSlider = document.getElementById('holdDurationSlider');
const holdDurationValue = document.getElementById('holdDurationValue');
const inspectionToggle = document.getElementById('inspectionToggle');
const scrambleDiagram = document.getElementById('scrambleDiagram');
const eventSelect = document.getElementById('eventSelect');
// Scramble Loading UI Elements (optional: null guard)
const scrambleLoadingRow = document.getElementById('scrambleLoadingRow');
const scrambleLoadingText = document.getElementById('scrambleLoadingText');
const scrambleDiagramSkeleton = document.getElementById('scrambleDiagramSkeleton');
const scrambleRetryBtn = document.getElementById('scrambleRetryBtn');
// UI Sections for Mobile Tab Switching
const timerSection = document.getElementById('timerSection');
const historySection = document.getElementById('historySection');
const mobTabTimer = document.getElementById('mob-tab-timer');
const mobTabHistory = document.getElementById('mob-tab-history')

// --- Layout: viewport-centered timer + dynamic scramble sizing (no scroll / no "more") ---
const scrambleBoxEl = document.getElementById('scrambleBox');
const scrambleBottomAreaEl = document.querySelector('.scramble-bottom-area');
const timerContainerEl = document.getElementById('timerContainer');
let __layoutRAF = 0;
let __timerLayoutLocked = false;

/** Lock timer recentering while scramble/diagram is regenerating (prevents oscillation). */
function lockTimerLayout() { __timerLayoutLocked = true; }
/** Unlock and request a single recenter on next layout pass. */
function unlockTimerLayoutAndRecenter(reason='scramble-ready') {
    __timerLayoutLocked = false;
    scheduleLayout(reason);
}

function scheduleLayout(reason = '') {
    if (__layoutRAF) cancelAnimationFrame(__layoutRAF);
    __layoutRAF = requestAnimationFrame(() => {
        __layoutRAF = 0;
        applyLayoutBudgets(reason);
    });
}

function applyLayoutBudgets(reason = '') {
    try {
        updateScrambleBottomAreaBudget();
        fitScrambleTextToBudget();
        if (!__timerLayoutLocked) positionTimerToViewportCenter();
    } catch (e) {
        // Never break the timer if layout calc fails
        console.warn('[CubeTimer] layout budget error', e);
    }
}

function updateScrambleBottomAreaBudget() {
    // Reduce the huge "dead space" below scramble text.
    // Only keep extra space when showing loading skeleton / retry button.
    const root = document.documentElement;
    const isSkeletonVisible = scrambleDiagramSkeleton && !scrambleDiagramSkeleton.classList.contains('hidden');
    const isRetryVisible = scrambleRetryBtn && !scrambleRetryBtn.classList.contains('hidden');

    if (isSkeletonVisible || isRetryVisible) {
        // Match skeleton's rendered height (fallback to 160)
        const rect = scrambleDiagramSkeleton ? scrambleDiagramSkeleton.getBoundingClientRect() : null;
        const h = rect && rect.height ? rect.height : (window.innerWidth >= 768 ? 220 : 190);
        root.style.setProperty('--scrambleBottomH', `${Math.round(h)}px`);
    } else {
        // Keep a small cushion so the layout doesn't feel cramped
        root.style.setProperty('--scrambleBottomH', '10px');
    }
}

function fitScrambleTextToBudget() {
    if (!scrambleEl || scrambleEl.classList.contains('hidden')) return;
    if (currentEvent === '333mbf') return;

    // Width: use as much as possible, but keep comfortable side padding via scrambleBox padding var.
    // Height: keep scramble text from pushing the timer off-screen.
    const isMobile = window.innerWidth < 768;
    const vh = window.innerHeight || 0;
    const isMinx = typeof currentEvent === 'string' && currentEvent.includes('minx');
    const cap = isMobile ? (isMinx ? 160 : 120) : (isMinx ? 220 : 170);
    const maxTextH = Math.max(52, Math.min(cap, Math.floor(vh * (isMobile ? 0.18 : 0.20))));
    scrambleEl.style.maxHeight = `${maxTextH}px`;
    scrambleEl.style.overflow = 'hidden';

    // Reset to CSS baseline before measuring
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';

    const computed = window.getComputedStyle(scrambleEl);
    let fontPx = parseFloat(computed.fontSize) || (isMobile ? 16 : 20);
    const minFont = isMobile ? 12 : 16; // readability floor
    const step = isMobile ? 0.75 : 0.6;

    // Slightly tighten when we have to shrink
    const tighten = (scale) => {
        scrambleEl.style.lineHeight = scale < 0.9 ? '1.15' : '1.3';
        scrambleEl.style.letterSpacing = scale < 0.85 ? '-0.02em' : '0';
    };

    // Iterate down until it fits
    let safety = 0;
    while (safety++ < 60) {
        const fits = scrambleEl.scrollHeight <= maxTextH + 1;
        if (fits) break;
        const next = fontPx - step;
        if (next < minFont) {
            // Hard stop: keep min font; overflow stays hidden but should be rare.
            scrambleEl.style.fontSize = `${minFont}px`;
            tighten(minFont / (isMobile ? 16 : 20));
            break;
        }
        fontPx = next;
        scrambleEl.style.fontSize = `${fontPx}px`;
        tighten(fontPx / (isMobile ? 16 : 20));
    }
}

function positionTimerToViewportCenter() {
    if (!timerContainerEl || !scrambleBoxEl) return;
    // If the timer section is hidden (mobile history tab), don't fight layout.
    if (timerSection && timerSection.classList.contains('hidden')) return;

    const viewportCenterY = window.innerHeight / 2;
    const scrambleRect = scrambleBoxEl.getBoundingClientRect();
    const timerRect = timerContainerEl.getBoundingClientRect();
    const timerHalf = timerRect.height / 2;

    const gap = window.innerWidth < 768 ? 10 : 14; // breathing room between scramble box and timer block
    const minCenterY = scrambleRect.bottom + gap + timerHalf;

    // Target center is viewport center, but never collide with scramble area
    let targetCenterY = Math.max(viewportCenterY, minCenterY);

    // Prevent pushing past bottom (keep at least a small margin)
    const bottomMargin = (window.innerWidth < 768 ? 18 : 22);
    const maxCenterY = window.innerHeight - bottomMargin - timerHalf;
    targetCenterY = Math.min(targetCenterY, maxCenterY);

    const currentCenterY = timerRect.top + timerHalf;
    const dy = Math.round(targetCenterY - currentCenterY);

    // Apply translation
    timerContainerEl.style.transform = `translateY(${dy}px)`;
    timerContainerEl.style.transition = 'transform 160ms ease';
}

;
const configs = {
    '333': { moves: ["U","D","L","R","F","B"], len: 21, n: 3, cat: 'standard' },
    '333oh': { moves: ["U","D","L","R","F","B"], len: 21, n: 3, cat: 'standard' },
    '222': { moves: ["U","R","F"], len: 11, n: 2, cat: 'standard' },
    '444': { moves: ["U","D","L","R","F","B","Uw","Rw","Fw"], len: 44, n: 4, cat: 'standard' },
    '555': { moves: ["U","D","L","R","F","B","Uw","Dw","Lw","Rw","Fw","Bw"], len: 60, n: 5, cat: 'standard' },
    '666': { moves: ["U","D","L","R","F","B","Uw","Dw","Lw","Rw","Fw","Bw","3Uw","3Rw","3Fw"], len: 80, n: 6, cat: 'standard' },
    '777': { moves: ["U","D","L","R","F","B","Uw","Dw","Lw","Rw","Fw","Bw","3Uw","3Dw","3Lw","3Rw","3Fw","3Bw"], len: 100, n: 7, cat: 'standard' },
    'minx': { moves: ["R++","R--","D++","D--"], len: 77, cat: 'nonstandard' },
    'pyra': { moves: ["U","L","R","B"], len: 10, tips: ["u","l","r","b"], cat: 'nonstandard' },
    'clock': { len: 18, cat: 'nonstandard' },
    'skewb': { moves: ["U","L","R","B"], len: 10, cat: 'nonstandard' },
    'sq1': { len: 12, cat: 'nonstandard' },
    '333bf': { moves: ["U","D","L","R","F","B"], len: 21, n: 3, cat: 'blind' },
    '444bf': { moves: ["U","D","L","R","F","B","Uw","Rw","Fw"], len: 44, n: 4, cat: 'blind' },
    '555bf': { moves: ["U","D","L","R","F","B","Uw","Dw","Lw","Rw","Fw","Bw"], len: 60, n: 5, cat: 'blind' },
    '333mbf': { moves: ["U","D","L","R","F","B"], len: 21, n: 3, cat: 'blind' }
};

/*
 * Practice scramble engine (Route 1)
 * Uses Alg-Trainer (Tao Yu) scramble approach + cube solver under MIT License.
 * Source attribution is shown in Settings (bottom).
 */


/* --- Begin Alg-Trainer deps (MIT) --- */
/*
# License

The MIT License (MIT)

Copyright (c) 2014 Lucas Garron

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/




// --- Minimal alg utilities (Practice only) ---
// We only need invert for Cube.solve() outputs (U/R/F/D/L/B with optional 2 or ').
function invertAlg(algText) {
  const moves = String(algText || '').trim().split(/\s+/).filter(Boolean);
  const inv = [];
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i];
    // handle double moves and primes
    if (m.endsWith("2")) {
      inv.push(m); // 180-degree is self-inverse
    } else if (m.endsWith("'")) {
      inv.push(m.slice(0, -1));
    } else {
      inv.push(m + "'");
    }
  }
  return inv.join(' ');
}

(function() {
  var BL, BR, Cube, DB, DBL, DF, DFR, DL, DLF, DR, DRB, FL, FR, UB, UBR, UF, UFL, UL, ULB, UR, URF, cornerColor, cornerFacelet, edgeColor, edgeFacelet, ref, ref1, ref2;

  ref = [0, 1, 2, 3, 4, 5, 6, 7], URF = ref[0], UFL = ref[1], ULB = ref[2], UBR = ref[3], DFR = ref[4], DLF = ref[5], DBL = ref[6], DRB = ref[7];

  ref1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], UR = ref1[0], UF = ref1[1], UL = ref1[2], UB = ref1[3], DR = ref1[4], DF = ref1[5], DL = ref1[6], DB = ref1[7], FR = ref1[8], FL = ref1[9], BL = ref1[10], BR = ref1[11];

  ref2 = (function() {
    var B, D, F, L, R, U;
    U = function(x) {
      return x - 1;
    };
    R = function(x) {
      return U(9) + x;
    };
    F = function(x) {
      return R(9) + x;
    };
    D = function(x) {
      return F(9) + x;
    };
    L = function(x) {
      return D(9) + x;
    };
    B = function(x) {
      return L(9) + x;
    };
    return [[[U(9), R(1), F(3)], [U(7), F(1), L(3)], [U(1), L(1), B(3)], [U(3), B(1), R(3)], [D(3), F(9), R(7)], [D(1), L(9), F(7)], [D(7), B(9), L(7)], [D(9), R(9), B(7)]], [[U(6), R(2)], [U(8), F(2)], [U(4), L(2)], [U(2), B(2)], [D(6), R(8)], [D(2), F(8)], [D(4), L(8)], [D(8), B(8)], [F(6), R(4)], [F(4), L(6)], [B(6), L(4)], [B(4), R(6)]]];
  })(), cornerFacelet = ref2[0], edgeFacelet = ref2[1];

  cornerColor = [['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'], ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B']];

  edgeColor = [['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'], ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'], ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R']];

  Cube = (function() {
    var faceNames, faceNums, parseAlg;

    function Cube(other) {
      var x;
      if (other != null) {
        this.init(other);
      } else {
        this.identity();
      }
      this.newCp = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 7; x = ++k) {
          results.push(0);
        }
        return results;
      })();
      this.newEp = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 11; x = ++k) {
          results.push(0);
        }
        return results;
      })();
      this.newCo = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 7; x = ++k) {
          results.push(0);
        }
        return results;
      })();
      this.newEo = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 11; x = ++k) {
          results.push(0);
        }
        return results;
      })();
    }

    Cube.prototype.init = function(state) {
      this.co = state.co.slice(0);
      this.ep = state.ep.slice(0);
      this.cp = state.cp.slice(0);
      return this.eo = state.eo.slice(0);
    };

    Cube.prototype.identity = function() {
      var x;
      this.cp = [0, 1, 2, 3, 4, 5, 6, 7];
      this.co = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 7; x = ++k) {
          results.push(0);
        }
        return results;
      })();
      this.ep = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      return this.eo = (function() {
        var k, results;
        results = [];
        for (x = k = 0; k <= 11; x = ++k) {
          results.push(0);
        }
        return results;
      })();
    };

    Cube.prototype.toJSON = function() {
      return {
        cp: this.cp,
        co: this.co,
        ep: this.ep,
        eo: this.eo
      };
    };

    Cube.prototype.asString = function() {
      var c, corner, edge, i, k, l, len, m, n, o, ori, p, ref3, ref4, result;
      result = [];
      ref3 = [[4, 'U'], [13, 'R'], [22, 'F'], [31, 'D'], [40, 'L'], [49, 'B']];
      for (k = 0, len = ref3.length; k < len; k++) {
        ref4 = ref3[k], i = ref4[0], c = ref4[1];
        result[i] = c;
      }
      for (i = l = 0; l <= 7; i = ++l) {
        corner = this.cp[i];
        ori = this.co[i];
        for (n = m = 0; m <= 2; n = ++m) {
          result[cornerFacelet[i][(n + ori) % 3]] = cornerColor[corner][n];
        }
      }
      for (i = o = 0; o <= 11; i = ++o) {
        edge = this.ep[i];
        ori = this.eo[i];
        for (n = p = 0; p <= 1; n = ++p) {
          result[edgeFacelet[i][(n + ori) % 2]] = edgeColor[edge][n];
        }
      }
      return result.join('');
    };

    Cube.fromString = function(str) {
      var col1, col2, cube, i, j, k, l, m, o, ori, p, ref3;
      cube = new Cube;
      for (i = k = 0; k <= 7; i = ++k) {
        for (ori = l = 0; l <= 2; ori = ++l) {
          if ((ref3 = str[cornerFacelet[i][ori]]) === 'U' || ref3 === 'D') {
            break;
          }
        }
        col1 = str[cornerFacelet[i][(ori + 1) % 3]];
        col2 = str[cornerFacelet[i][(ori + 2) % 3]];
        for (j = m = 0; m <= 7; j = ++m) {
          if (col1 === cornerColor[j][1] && col2 === cornerColor[j][2]) {
            cube.cp[i] = j;
            cube.co[i] = ori % 3;
          }
        }
      }
      for (i = o = 0; o <= 11; i = ++o) {
        for (j = p = 0; p <= 11; j = ++p) {
          if (str[edgeFacelet[i][0]] === edgeColor[j][0] && str[edgeFacelet[i][1]] === edgeColor[j][1]) {
            cube.ep[i] = j;
            cube.eo[i] = 0;
            break;
          }
          if (str[edgeFacelet[i][0]] === edgeColor[j][1] && str[edgeFacelet[i][1]] === edgeColor[j][0]) {
            cube.ep[i] = j;
            cube.eo[i] = 1;
            break;
          }
        }
      }
      return cube;
    };

    Cube.prototype.clone = function() {
      return new Cube(this.toJSON());
    };

    Cube.prototype.randomize = (function() {
      var mixPerm, randOri, randint, result;
      randint = function(min, max) {
        return min + (Math.random() * (max - min + 1) | 0);
      };
      mixPerm = function(arr) {
        var i, k, max, r, ref3, ref4, ref5, results;
        max = arr.length - 1;
        results = [];
        for (i = k = 0, ref3 = max - 2; 0 <= ref3 ? k <= ref3 : k >= ref3; i = 0 <= ref3 ? ++k : --k) {
          r = randint(i, max);
          if (i !== r) {
            ref4 = [arr[r], arr[i]], arr[i] = ref4[0], arr[r] = ref4[1];
            results.push((ref5 = [arr[max - 1], arr[max]], arr[max] = ref5[0], arr[max - 1] = ref5[1], ref5));
          } else {
            results.push(void 0);
          }
        }
        return results;
      };
      randOri = function(arr, max) {
        var i, k, ori, ref3;
        ori = 0;
        for (i = k = 0, ref3 = arr.length - 2; 0 <= ref3 ? k <= ref3 : k >= ref3; i = 0 <= ref3 ? ++k : --k) {
          ori += (arr[i] = randint(0, max - 1));
        }
        return arr[arr.length - 1] = (max - ori % max) % max;
      };
      result = function() {
        mixPerm(this.cp);
        mixPerm(this.ep);
        randOri(this.co, 3);
        randOri(this.eo, 2);
        return this;
      };
      return result;
    })();

    Cube.random = function() {
      return new Cube().randomize();
    };

    Cube.prototype.isSolved = function() {
      var c, e, k, l;
      for (c = k = 0; k <= 7; c = ++k) {
        if (this.cp[c] !== c) {
          return false;
        }
        if (this.co[c] !== 0) {
          return false;
        }
      }
      for (e = l = 0; l <= 11; e = ++l) {
        if (this.ep[e] !== e) {
          return false;
        }
        if (this.eo[e] !== 0) {
          return false;
        }
      }
      return true;
    };

    Cube.prototype.cornerMultiply = function(other) {
      var from, k, ref3, ref4, to;
      for (to = k = 0; k <= 7; to = ++k) {
        from = other.cp[to];
        this.newCp[to] = this.cp[from];
        this.newCo[to] = (this.co[from] + other.co[to]) % 3;
      }
      ref3 = [this.newCp, this.cp], this.cp = ref3[0], this.newCp = ref3[1];
      ref4 = [this.newCo, this.co], this.co = ref4[0], this.newCo = ref4[1];
      return this;
    };

    Cube.prototype.edgeMultiply = function(other) {
      var from, k, ref3, ref4, to;
      for (to = k = 0; k <= 11; to = ++k) {
        from = other.ep[to];
        this.newEp[to] = this.ep[from];
        this.newEo[to] = (this.eo[from] + other.eo[to]) % 2;
      }
      ref3 = [this.newEp, this.ep], this.ep = ref3[0], this.newEp = ref3[1];
      ref4 = [this.newEo, this.eo], this.eo = ref4[0], this.newEo = ref4[1];
      return this;
    };

    Cube.prototype.multiply = function(other) {
      this.cornerMultiply(other);
      this.edgeMultiply(other);
      return this;
    };

    Cube.moves = [
      {
        cp: [UBR, URF, UFL, ULB, DFR, DLF, DBL, DRB],
        co: [0, 0, 0, 0, 0, 0, 0, 0],
        ep: [UB, UR, UF, UL, DR, DF, DL, DB, FR, FL, BL, BR],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }, {
        cp: [DFR, UFL, ULB, URF, DRB, DLF, DBL, UBR],
        co: [2, 0, 0, 1, 1, 0, 0, 2],
        ep: [FR, UF, UL, UB, BR, DF, DL, DB, DR, FL, BL, UR],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }, {
        cp: [UFL, DLF, ULB, UBR, URF, DFR, DBL, DRB],
        co: [1, 2, 0, 0, 2, 1, 0, 0],
        ep: [UR, FL, UL, UB, DR, FR, DL, DB, UF, DF, BL, BR],
        eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0]
      }, {
        cp: [URF, UFL, ULB, UBR, DLF, DBL, DRB, DFR],
        co: [0, 0, 0, 0, 0, 0, 0, 0],
        ep: [UR, UF, UL, UB, DF, DL, DB, DR, FR, FL, BL, BR],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }, {
        cp: [URF, ULB, DBL, UBR, DFR, UFL, DLF, DRB],
        co: [0, 1, 2, 0, 0, 2, 1, 0],
        ep: [UR, UF, BL, UB, DR, DF, FL, DB, FR, UL, DL, BR],
        eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }, {
        cp: [URF, UFL, UBR, DRB, DFR, DLF, ULB, DBL],
        co: [0, 0, 1, 2, 0, 0, 2, 1],
        ep: [UR, UF, UL, BR, DR, DF, DL, BL, FR, FL, UB, DB],
        eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1]
      }
    ];

    faceNums = {
      U: 0,
      R: 1,
      F: 2,
      D: 3,
      L: 4,
      B: 5
    };

    faceNames = {
      0: 'U',
      1: 'R',
      2: 'F',
      3: 'D',
      4: 'L',
      5: 'B'
    };

    parseAlg = function(arg) {
      var k, len, move, part, power, ref3, results;
      if (typeof arg === 'string') {
        ref3 = arg.split(/\s+/);
        results = [];
        for (k = 0, len = ref3.length; k < len; k++) {
          part = ref3[k];
          if (part.length === 0) {
            continue;
          }
          if (part.length > 2) {
            throw new Error("Invalid move: " + part);
          }
          move = faceNums[part[0]];
          if (move === void 0) {
            throw new Error("Invalid move: " + part);
          }
          if (part.length === 1) {
            power = 0;
          } else {
            if (part[1] === '2') {
              power = 1;
            } else if (part[1] === "'") {
              power = 2;
            } else {
              throw new Error("Invalid move: " + part);
            }
          }
          results.push(move * 3 + power);
        }
        return results;
      } else if (arg.length != null) {
        return arg;
      } else {
        return [arg];
      }
    };

    Cube.prototype.move = function(arg) {
      var face, k, l, len, move, power, ref3, ref4, x;
      ref3 = parseAlg(arg);
      for (k = 0, len = ref3.length; k < len; k++) {
        move = ref3[k];
        face = move / 3 | 0;
        power = move % 3;
        for (x = l = 0, ref4 = power; 0 <= ref4 ? l <= ref4 : l >= ref4; x = 0 <= ref4 ? ++l : --l) {
          this.multiply(Cube.moves[face]);
        }
      }
      return this;
    };

    Cube.inverse = function(arg) {
      var face, k, len, move, power, result, str;
      result = (function() {
        var k, len, ref3, results;
        ref3 = parseAlg(arg);
        results = [];
        for (k = 0, len = ref3.length; k < len; k++) {
          move = ref3[k];
          face = move / 3 | 0;
          power = move % 3;
          results.push(face * 3 + -(power - 1) + 1);
        }
        return results;
      })();
      result.reverse();
      if (typeof arg === 'string') {
        str = '';
        for (k = 0, len = result.length; k < len; k++) {
          move = result[k];
          face = move / 3 | 0;
          power = move % 3;
          str += faceNames[face];
          if (power === 1) {
            str += '2';
          } else if (power === 2) {
            str += "'";
          }
          str += ' ';
        }
        return str.substring(0, str.length - 1);
      } else if (arg.length != null) {
        return result;
      } else {
        return result[0];
      }
    };

    return Cube;

  })();

  if (typeof module !== "undefined" && module !== null) {
    module.exports = Cube;
  } else {
    this.Cube = Cube;
  }

}).call(this);
/*

Copyright (c) 2013-2017 Petri Lehtinen <petri@digip.org>
Copyright (c) 2018 Ludovic Fernandez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

(function() {
  var BL, BR, Cnk, Cube, DB, DBL, DF, DFR, DL, DLF, DR, DRB, FL, FR, Include, N_FLIP, N_FRtoBR, N_PARITY, N_SLICE1, N_SLICE2, N_TWIST, N_UBtoDF, N_URFtoDLF, N_URtoDF, N_URtoUL, UB, UBR, UF, UFL, UL, ULB, UR, URF, allMoves1, allMoves2, computeMoveTable, computePruningTable, factorial, key, max, mergeURtoDF, moveTableParams, nextMoves1, nextMoves2, permutationIndex, pruning, pruningTableParams, ref, ref1, rotateLeft, rotateRight, value,
    slice1 = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Cube = this.Cube || require('./cube');

  ref = [0, 1, 2, 3, 4, 5, 6, 7], URF = ref[0], UFL = ref[1], ULB = ref[2], UBR = ref[3], DFR = ref[4], DLF = ref[5], DBL = ref[6], DRB = ref[7];

  ref1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], UR = ref1[0], UF = ref1[1], UL = ref1[2], UB = ref1[3], DR = ref1[4], DF = ref1[5], DL = ref1[6], DB = ref1[7], FR = ref1[8], FL = ref1[9], BL = ref1[10], BR = ref1[11];

  Cnk = function(n, k) {
    var i, j, s;
    if (n < k) {
      return 0;
    }
    if (k > n / 2) {
      k = n - k;
    }
    s = 1;
    i = n;
    j = 1;
    while (i !== n - k) {
      s *= i;
      s /= j;
      i--;
      j++;
    }
    return s;
  };

  factorial = function(n) {
    var f, i, m, ref2;
    f = 1;
    for (i = m = 2, ref2 = n; 2 <= ref2 ? m <= ref2 : m >= ref2; i = 2 <= ref2 ? ++m : --m) {
      f *= i;
    }
    return f;
  };

  max = function(a, b) {
    if (a > b) {
      return a;
    } else {
      return b;
    }
  };

  rotateLeft = function(array, l, r) {
    var i, m, ref2, ref3, tmp;
    tmp = array[l];
    for (i = m = ref2 = l, ref3 = r - 1; ref2 <= ref3 ? m <= ref3 : m >= ref3; i = ref2 <= ref3 ? ++m : --m) {
      array[i] = array[i + 1];
    }
    return array[r] = tmp;
  };

  rotateRight = function(array, l, r) {
    var i, m, ref2, ref3, tmp;
    tmp = array[r];
    for (i = m = ref2 = r, ref3 = l + 1; ref2 <= ref3 ? m <= ref3 : m >= ref3; i = ref2 <= ref3 ? ++m : --m) {
      array[i] = array[i - 1];
    }
    return array[l] = tmp;
  };

  permutationIndex = function(context, start, end, fromEnd) {
    var i, maxAll, maxB, maxOur, our, permName;
    if (fromEnd == null) {
      fromEnd = false;
    }
    maxOur = end - start;
    maxB = factorial(maxOur + 1);
    if (context === 'corners') {
      maxAll = 7;
      permName = 'cp';
    } else {
      maxAll = 11;
      permName = 'ep';
    }
    our = (function() {
      var m, ref2, results;
      results = [];
      for (i = m = 0, ref2 = maxOur; 0 <= ref2 ? m <= ref2 : m >= ref2; i = 0 <= ref2 ? ++m : --m) {
        results.push(0);
      }
      return results;
    })();
    return function(index) {
      var a, b, c, j, k, m, o, p, perm, q, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, t, u, w, x, y, z;
      if (index != null) {
        for (i = m = 0, ref2 = maxOur; 0 <= ref2 ? m <= ref2 : m >= ref2; i = 0 <= ref2 ? ++m : --m) {
          our[i] = i + start;
        }
        b = index % maxB;
        a = index / maxB | 0;
        perm = this[permName];
        for (i = o = 0, ref3 = maxAll; 0 <= ref3 ? o <= ref3 : o >= ref3; i = 0 <= ref3 ? ++o : --o) {
          perm[i] = -1;
        }
        for (j = p = 1, ref4 = maxOur; 1 <= ref4 ? p <= ref4 : p >= ref4; j = 1 <= ref4 ? ++p : --p) {
          k = b % (j + 1);
          b = b / (j + 1) | 0;
          while (k > 0) {
            rotateRight(our, 0, j);
            k--;
          }
        }
        x = maxOur;
        if (fromEnd) {
          for (j = q = 0, ref5 = maxAll; 0 <= ref5 ? q <= ref5 : q >= ref5; j = 0 <= ref5 ? ++q : --q) {
            c = Cnk(maxAll - j, x + 1);
            if (a - c >= 0) {
              perm[j] = our[maxOur - x];
              a -= c;
              x--;
            }
          }
        } else {
          for (j = t = ref6 = maxAll; ref6 <= 0 ? t <= 0 : t >= 0; j = ref6 <= 0 ? ++t : --t) {
            c = Cnk(j, x + 1);
            if (a - c >= 0) {
              perm[j] = our[x];
              a -= c;
              x--;
            }
          }
        }
        return this;
      } else {
        perm = this[permName];
        for (i = u = 0, ref7 = maxOur; 0 <= ref7 ? u <= ref7 : u >= ref7; i = 0 <= ref7 ? ++u : --u) {
          our[i] = -1;
        }
        a = b = x = 0;
        if (fromEnd) {
          for (j = w = ref8 = maxAll; ref8 <= 0 ? w <= 0 : w >= 0; j = ref8 <= 0 ? ++w : --w) {
            if ((start <= (ref9 = perm[j]) && ref9 <= end)) {
              a += Cnk(maxAll - j, x + 1);
              our[maxOur - x] = perm[j];
              x++;
            }
          }
        } else {
          for (j = y = 0, ref10 = maxAll; 0 <= ref10 ? y <= ref10 : y >= ref10; j = 0 <= ref10 ? ++y : --y) {
            if ((start <= (ref11 = perm[j]) && ref11 <= end)) {
              a += Cnk(j, x + 1);
              our[x] = perm[j];
              x++;
            }
          }
        }
        for (j = z = ref12 = maxOur; ref12 <= 0 ? z <= 0 : z >= 0; j = ref12 <= 0 ? ++z : --z) {
          k = 0;
          while (our[j] !== start + j) {
            rotateLeft(our, 0, j);
            k++;
          }
          b = (j + 1) * b + k;
        }
        return a * maxB + b;
      }
    };
  };

  Include = {
    twist: function(twist) {
      var i, m, o, ori, parity, v;
      if (twist != null) {
        parity = 0;
        for (i = m = 6; m >= 0; i = --m) {
          ori = twist % 3;
          twist = (twist / 3) | 0;
          this.co[i] = ori;
          parity += ori;
        }
        this.co[7] = (3 - parity % 3) % 3;
        return this;
      } else {
        v = 0;
        for (i = o = 0; o <= 6; i = ++o) {
          v = 3 * v + this.co[i];
        }
        return v;
      }
    },
    flip: function(flip) {
      var i, m, o, ori, parity, v;
      if (flip != null) {
        parity = 0;
        for (i = m = 10; m >= 0; i = --m) {
          ori = flip % 2;
          flip = flip / 2 | 0;
          this.eo[i] = ori;
          parity += ori;
        }
        this.eo[11] = (2 - parity % 2) % 2;
        return this;
      } else {
        v = 0;
        for (i = o = 0; o <= 10; i = ++o) {
          v = 2 * v + this.eo[i];
        }
        return v;
      }
    },
    cornerParity: function() {
      var i, j, m, o, ref2, ref3, ref4, ref5, s;
      s = 0;
      for (i = m = ref2 = DRB, ref3 = URF + 1; ref2 <= ref3 ? m <= ref3 : m >= ref3; i = ref2 <= ref3 ? ++m : --m) {
        for (j = o = ref4 = i - 1, ref5 = URF; ref4 <= ref5 ? o <= ref5 : o >= ref5; j = ref4 <= ref5 ? ++o : --o) {
          if (this.cp[j] > this.cp[i]) {
            s++;
          }
        }
      }
      return s % 2;
    },
    edgeParity: function() {
      var i, j, m, o, ref2, ref3, ref4, ref5, s;
      s = 0;
      for (i = m = ref2 = BR, ref3 = UR + 1; ref2 <= ref3 ? m <= ref3 : m >= ref3; i = ref2 <= ref3 ? ++m : --m) {
        for (j = o = ref4 = i - 1, ref5 = UR; ref4 <= ref5 ? o <= ref5 : o >= ref5; j = ref4 <= ref5 ? ++o : --o) {
          if (this.ep[j] > this.ep[i]) {
            s++;
          }
        }
      }
      return s % 2;
    },
    URFtoDLF: permutationIndex('corners', URF, DLF),
    URtoUL: permutationIndex('edges', UR, UL),
    UBtoDF: permutationIndex('edges', UB, DF),
    URtoDF: permutationIndex('edges', UR, DF),
    FRtoBR: permutationIndex('edges', FR, BR, true)
  };

  for (key in Include) {
    value = Include[key];
    Cube.prototype[key] = value;
  }

  computeMoveTable = function(context, coord, size) {
    var apply, cube, i, inner, j, k, m, move, o, p, ref2, results;
    apply = context === 'corners' ? 'cornerMultiply' : 'edgeMultiply';
    cube = new Cube;
    results = [];
    for (i = m = 0, ref2 = size - 1; 0 <= ref2 ? m <= ref2 : m >= ref2; i = 0 <= ref2 ? ++m : --m) {
      cube[coord](i);
      inner = [];
      for (j = o = 0; o <= 5; j = ++o) {
        move = Cube.moves[j];
        for (k = p = 0; p <= 2; k = ++p) {
          cube[apply](move);
          inner.push(cube[coord]());
        }
        cube[apply](move);
      }
      results.push(inner);
    }
    return results;
  };

  mergeURtoDF = (function() {
    var a, b;
    a = new Cube;
    b = new Cube;
    return function(URtoUL, UBtoDF) {
      var i, m;
      a.URtoUL(URtoUL);
      b.UBtoDF(UBtoDF);
      for (i = m = 0; m <= 7; i = ++m) {
        if (a.ep[i] !== -1) {
          if (b.ep[i] !== -1) {
            return -1;
          } else {
            b.ep[i] = a.ep[i];
          }
        }
      }
      return b.URtoDF();
    };
  })();

  N_TWIST = 2187;

  N_FLIP = 2048;

  N_PARITY = 2;

  N_FRtoBR = 11880;

  N_SLICE1 = 495;

  N_SLICE2 = 24;

  N_URFtoDLF = 20160;

  N_URtoDF = 20160;

  N_URtoUL = 1320;

  N_UBtoDF = 1320;

  Cube.moveTables = {
    parity: [[1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]],
    twist: null,
    flip: null,
    FRtoBR: null,
    URFtoDLF: null,
    URtoDF: null,
    URtoUL: null,
    UBtoDF: null,
    mergeURtoDF: null
  };

  moveTableParams = {
    twist: ['corners', N_TWIST],
    flip: ['edges', N_FLIP],
    FRtoBR: ['edges', N_FRtoBR],
    URFtoDLF: ['corners', N_URFtoDLF],
    URtoDF: ['edges', N_URtoDF],
    URtoUL: ['edges', N_URtoUL],
    UBtoDF: ['edges', N_UBtoDF],
    mergeURtoDF: []
  };

  Cube.computeMoveTables = function() {
    var len, m, name, ref2, scope, size, tableName, tables;
    tables = 1 <= arguments.length ? slice1.call(arguments, 0) : [];
    if (tables.length === 0) {
      tables = (function() {
        var results;
        results = [];
        for (name in moveTableParams) {
          results.push(name);
        }
        return results;
      })();
    }
    for (m = 0, len = tables.length; m < len; m++) {
      tableName = tables[m];
      if (this.moveTables[tableName] !== null) {
        continue;
      }
      if (tableName === 'mergeURtoDF') {
        this.moveTables.mergeURtoDF = (function() {
          var UBtoDF, URtoUL, o, results;
          results = [];
          for (URtoUL = o = 0; o <= 335; URtoUL = ++o) {
            results.push((function() {
              var p, results1;
              results1 = [];
              for (UBtoDF = p = 0; p <= 335; UBtoDF = ++p) {
                results1.push(mergeURtoDF(URtoUL, UBtoDF));
              }
              return results1;
            })());
          }
          return results;
        })();
      } else {
        ref2 = moveTableParams[tableName], scope = ref2[0], size = ref2[1];
        this.moveTables[tableName] = computeMoveTable(scope, tableName, size);
      }
    }
    return this;
  };

  allMoves1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  nextMoves1 = (function() {
    var face, lastFace, m, next, o, p, power, results;
    results = [];
    for (lastFace = m = 0; m <= 5; lastFace = ++m) {
      next = [];
      for (face = o = 0; o <= 5; face = ++o) {
        if (face !== lastFace && face !== lastFace - 3) {
          for (power = p = 0; p <= 2; power = ++p) {
            next.push(face * 3 + power);
          }
        }
      }
      results.push(next);
    }
    return results;
  })();

  allMoves2 = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];

  nextMoves2 = (function() {
    var face, lastFace, len, m, next, o, p, power, powers, results;
    results = [];
    for (lastFace = m = 0; m <= 5; lastFace = ++m) {
      next = [];
      for (face = o = 0; o <= 5; face = ++o) {
        if (!(face !== lastFace && face !== lastFace - 3)) {
          continue;
        }
        powers = face === 0 || face === 3 ? [0, 1, 2] : [1];
        for (p = 0, len = powers.length; p < len; p++) {
          power = powers[p];
          next.push(face * 3 + power);
        }
      }
      results.push(next);
    }
    return results;
  })();

  pruning = function(table, index, value) {
    var pos, shift, slot;
    pos = index % 8;
    slot = index >> 3;
    shift = pos << 2;
    if (value != null) {
      table[slot] &= ~(0xF << shift);
      table[slot] |= value << shift;
      return value;
    } else {
      return (table[slot] & (0xF << shift)) >>> shift;
    }
  };

  computePruningTable = function(phase, size, currentCoords, nextIndex) {
    var current, depth, done, index, len, m, move, moves, next, o, ref2, table, x;
    table = (function() {
      var m, ref2, results;
      results = [];
      for (x = m = 0, ref2 = Math.ceil(size / 8) - 1; 0 <= ref2 ? m <= ref2 : m >= ref2; x = 0 <= ref2 ? ++m : --m) {
        results.push(0xFFFFFFFF);
      }
      return results;
    })();
    if (phase === 1) {
      moves = allMoves1;
    } else {
      moves = allMoves2;
    }
    depth = 0;
    pruning(table, 0, depth);
    done = 1;
    while (done !== size) {
      for (index = m = 0, ref2 = size - 1; 0 <= ref2 ? m <= ref2 : m >= ref2; index = 0 <= ref2 ? ++m : --m) {
        if (!(pruning(table, index) === depth)) {
          continue;
        }
        current = currentCoords(index);
        for (o = 0, len = moves.length; o < len; o++) {
          move = moves[o];
          next = nextIndex(current, move);
          if (pruning(table, next) === 0xF) {
            pruning(table, next, depth + 1);
            done++;
          }
        }
      }
      depth++;
    }
    return table;
  };

  Cube.pruningTables = {
    sliceTwist: null,
    sliceFlip: null,
    sliceURFtoDLFParity: null,
    sliceURtoDFParity: null
  };

  pruningTableParams = {
    sliceTwist: [
      1, N_SLICE1 * N_TWIST, function(index) {
        return [index % N_SLICE1, index / N_SLICE1 | 0];
      }, function(current, move) {
        var newSlice, newTwist, slice, twist;
        slice = current[0], twist = current[1];
        newSlice = Cube.moveTables.FRtoBR[slice * 24][move] / 24 | 0;
        newTwist = Cube.moveTables.twist[twist][move];
        return newTwist * N_SLICE1 + newSlice;
      }
    ],
    sliceFlip: [
      1, N_SLICE1 * N_FLIP, function(index) {
        return [index % N_SLICE1, index / N_SLICE1 | 0];
      }, function(current, move) {
        var flip, newFlip, newSlice, slice;
        slice = current[0], flip = current[1];
        newSlice = Cube.moveTables.FRtoBR[slice * 24][move] / 24 | 0;
        newFlip = Cube.moveTables.flip[flip][move];
        return newFlip * N_SLICE1 + newSlice;
      }
    ],
    sliceURFtoDLFParity: [
      2, N_SLICE2 * N_URFtoDLF * N_PARITY, function(index) {
        return [index % 2, (index / 2 | 0) % N_SLICE2, (index / 2 | 0) / N_SLICE2 | 0];
      }, function(current, move) {
        var URFtoDLF, newParity, newSlice, newURFtoDLF, parity, slice;
        parity = current[0], slice = current[1], URFtoDLF = current[2];
        newParity = Cube.moveTables.parity[parity][move];
        newSlice = Cube.moveTables.FRtoBR[slice][move];
        newURFtoDLF = Cube.moveTables.URFtoDLF[URFtoDLF][move];
        return (newURFtoDLF * N_SLICE2 + newSlice) * 2 + newParity;
      }
    ],
    sliceURtoDFParity: [
      2, N_SLICE2 * N_URtoDF * N_PARITY, function(index) {
        return [index % 2, (index / 2 | 0) % N_SLICE2, (index / 2 | 0) / N_SLICE2 | 0];
      }, function(current, move) {
        var URtoDF, newParity, newSlice, newURtoDF, parity, slice;
        parity = current[0], slice = current[1], URtoDF = current[2];
        newParity = Cube.moveTables.parity[parity][move];
        newSlice = Cube.moveTables.FRtoBR[slice][move];
        newURtoDF = Cube.moveTables.URtoDF[URtoDF][move];
        return (newURtoDF * N_SLICE2 + newSlice) * 2 + newParity;
      }
    ]
  };

  Cube.computePruningTables = function() {
    var len, m, name, params, tableName, tables;
    tables = 1 <= arguments.length ? slice1.call(arguments, 0) : [];
    if (tables.length === 0) {
      tables = (function() {
        var results;
        results = [];
        for (name in pruningTableParams) {
          results.push(name);
        }
        return results;
      })();
    }
    for (m = 0, len = tables.length; m < len; m++) {
      tableName = tables[m];
      if (this.pruningTables[tableName] !== null) {
        continue;
      }
      params = pruningTableParams[tableName];
      this.pruningTables[tableName] = computePruningTable.apply(null, params);
    }
    return this;
  };

  Cube.initSolver = function() {
    Cube.computeMoveTables();
    return Cube.computePruningTables();
  };

  Cube.prototype.solve = function(maxDepth) {
    var State, freeStates, moveNames, phase1, phase1search, phase2, phase2search, solution, state, x;
    if (maxDepth == null) {
      maxDepth = 22;
    }
    moveNames = (function() {
      var face, faceName, m, o, power, powerName, result;
      faceName = ['U', 'R', 'F', 'D', 'L', 'B'];
      powerName = ['', '2', "'"];
      result = [];
      for (face = m = 0; m <= 5; face = ++m) {
        for (power = o = 0; o <= 2; power = ++o) {
          result.push(faceName[face] + powerName[power]);
        }
      }
      return result;
    })();
    State = (function() {
      function State(cube) {
        this.parent = null;
        this.lastMove = null;
        this.depth = 0;
        if (cube) {
          this.init(cube);
        }
      }

      State.prototype.init = function(cube) {
        this.flip = cube.flip();
        this.twist = cube.twist();
        this.slice = cube.FRtoBR() / N_SLICE2 | 0;
        this.parity = cube.cornerParity();
        this.URFtoDLF = cube.URFtoDLF();
        this.FRtoBR = cube.FRtoBR();
        this.URtoUL = cube.URtoUL();
        this.UBtoDF = cube.UBtoDF();
        return this;
      };

      State.prototype.solution = function() {
        if (this.parent) {
          return this.parent.solution() + moveNames[this.lastMove] + ' ';
        } else {
          return '';
        }
      };

      State.prototype.move = function(table, index, move) {
        return Cube.moveTables[table][index][move];
      };

      State.prototype.pruning = function(table, index) {
        return pruning(Cube.pruningTables[table], index);
      };

      State.prototype.moves1 = function() {
        if (this.lastMove !== null) {
          return nextMoves1[this.lastMove / 3 | 0];
        } else {
          return allMoves1;
        }
      };

      State.prototype.minDist1 = function() {
        var d1, d2;
        d1 = this.pruning('sliceFlip', N_SLICE1 * this.flip + this.slice);
        d2 = this.pruning('sliceTwist', N_SLICE1 * this.twist + this.slice);
        return max(d1, d2);
      };

      State.prototype.next1 = function(move) {
        var next;
        next = freeStates.pop();
        next.parent = this;
        next.lastMove = move;
        next.depth = this.depth + 1;
        next.flip = this.move('flip', this.flip, move);
        next.twist = this.move('twist', this.twist, move);
        next.slice = this.move('FRtoBR', this.slice * 24, move) / 24 | 0;
        return next;
      };

      State.prototype.moves2 = function() {
        if (this.lastMove !== null) {
          return nextMoves2[this.lastMove / 3 | 0];
        } else {
          return allMoves2;
        }
      };

      State.prototype.minDist2 = function() {
        var d1, d2, index1, index2;
        index1 = (N_SLICE2 * this.URtoDF + this.FRtoBR) * N_PARITY + this.parity;
        d1 = this.pruning('sliceURtoDFParity', index1);
        index2 = (N_SLICE2 * this.URFtoDLF + this.FRtoBR) * N_PARITY + this.parity;
        d2 = this.pruning('sliceURFtoDLFParity', index2);
        return max(d1, d2);
      };

      State.prototype.init2 = function(top) {
        if (top == null) {
          top = true;
        }
        if (this.parent === null) {
          return;
        }
        this.parent.init2(false);
        this.URFtoDLF = this.move('URFtoDLF', this.parent.URFtoDLF, this.lastMove);
        this.FRtoBR = this.move('FRtoBR', this.parent.FRtoBR, this.lastMove);
        this.parity = this.move('parity', this.parent.parity, this.lastMove);
        this.URtoUL = this.move('URtoUL', this.parent.URtoUL, this.lastMove);
        this.UBtoDF = this.move('UBtoDF', this.parent.UBtoDF, this.lastMove);
        if (top) {
          return this.URtoDF = this.move('mergeURtoDF', this.URtoUL, this.UBtoDF);
        }
      };

      State.prototype.next2 = function(move) {
        var next;
        next = freeStates.pop();
        next.parent = this;
        next.lastMove = move;
        next.depth = this.depth + 1;
        next.URFtoDLF = this.move('URFtoDLF', this.URFtoDLF, move);
        next.FRtoBR = this.move('FRtoBR', this.FRtoBR, move);
        next.parity = this.move('parity', this.parity, move);
        next.URtoDF = this.move('URtoDF', this.URtoDF, move);
        return next;
      };

      return State;

    })();
    solution = null;
    phase1search = function(state) {
      var depth, m, ref2, results;
      depth = 0;
      results = [];
      for (depth = m = 1, ref2 = maxDepth; 1 <= ref2 ? m <= ref2 : m >= ref2; depth = 1 <= ref2 ? ++m : --m) {
        phase1(state, depth);
        if (solution !== null) {
          break;
        }
        results.push(depth++);
      }
      return results;
    };
    phase1 = function(state, depth) {
      var len, m, move, next, ref2, ref3, results;
      if (depth === 0) {
        if (state.minDist1() === 0) {
          if (state.lastMove === null || (ref2 = state.lastMove, indexOf.call(allMoves2, ref2) < 0)) {
            return phase2search(state);
          }
        }
      } else if (depth > 0) {
        if (state.minDist1() <= depth) {
          ref3 = state.moves1();
          results = [];
          for (m = 0, len = ref3.length; m < len; m++) {
            move = ref3[m];
            next = state.next1(move);
            phase1(next, depth - 1);
            freeStates.push(next);
            if (solution !== null) {
              break;
            } else {
              results.push(void 0);
            }
          }
          return results;
        }
      }
    };
    phase2search = function(state) {
      var depth, m, ref2, results;
      state.init2();
      results = [];
      for (depth = m = 1, ref2 = maxDepth - state.depth; 1 <= ref2 ? m <= ref2 : m >= ref2; depth = 1 <= ref2 ? ++m : --m) {
        phase2(state, depth);
        if (solution !== null) {
          break;
        }
        results.push(depth++);
      }
      return results;
    };
    phase2 = function(state, depth) {
      var len, m, move, next, ref2, results;
      if (depth === 0) {
        if (state.minDist2() === 0) {
          return solution = state.solution();
        }
      } else if (depth > 0) {
        if (state.minDist2() <= depth) {
          ref2 = state.moves2();
          results = [];
          for (m = 0, len = ref2.length; m < len; m++) {
            move = ref2[m];
            next = state.next2(move);
            phase2(next, depth - 1);
            freeStates.push(next);
            if (solution !== null) {
              break;
            } else {
              results.push(void 0);
            }
          }
          return results;
        }
      }
    };
    freeStates = (function() {
      var m, ref2, results;
      results = [];
      for (x = m = 0, ref2 = maxDepth + 1; 0 <= ref2 ? m <= ref2 : m >= ref2; x = 0 <= ref2 ? ++m : --m) {
        results.push(new State);
      }
      return results;
    })();
    state = freeStates.pop().init(this);
    phase1search(state);
    freeStates.push(state);
    if (solution.length > 0) {
      solution = solution.substring(0, solution.length - 1);
    }
    return solution;
  };

  Cube.scramble = function() {
    return Cube.inverse(Cube.random().solve());
  };

}).call(this);
/* --- End Alg-Trainer deps (MIT) --- */

/* --- Begin Alg-Trainer alg lists (subset, MIT) --- */
var OLL = {
    "OLL": ["R U2 R2' F R F' U2 R' F R F'/R U B' R B R2 U' R' F R F'/U R U' R2 D' r U' r' D R2 U R'/r U R' U R' r2 U' R' U R' r2 U2 r'","F R U R' U' F' f R U R' U' f'/F R U R' U' S R U R' U' f'/U r U r' U2 R U2 R' U2 r U' r'/R' U2 r U' r' U2' r U r' U2 R","U' f R U R' U' f' U' F R U R' U' F'/r' R2 U R' U r U2 r' U M'/r' R U R' F2 R U L' U L M'/U F U R U' R' F' U F R U R' U' F'","U' f R U R' U' f' U F R U R' U' F'/M U' r U2 r' U' R U' R2 r/U F U R U' R' F' U' F R U R' U' F'/U' f R U R' d' l' F R U R' U' F'","r' U2 R U R' U r/U2 l' U2 L U L' U l/U2 R' F2 r U r' F R/F R U R' U' F' U' F R U R' U' F'","r U2 R' U' R U' r'/U2 l U2 L' U' L U' l'/U2 R U R2 F R F2 U F/U' x' D R2 U' R' U R' D' x","r U R' U R U2 r'/F R' F' R U2 R U2 R'/L' U2 L U2 L F' L' F/U2 l U L' U L U2 l'","U2 r' U' R U' R' U2 r/l' U' L U' L' U2 l/R U2 R' U2 R' F R F'/F' L F L' U2 L' U2 L","U R U R' U' R' F R2 U R' U' F'/U' L' U' L U' L F' L' F L' U2 L/U2 R' U' R U' R' U R' F R F' U R/r' R2 U2 R' U' R U' R' U' M'","R U R' U R' F R F' R U2 R'/U2 L' U' L U L F' L2 U' L U F/R U R' y R' F R U' R' F' R/R U R' y' r' U r U' r' U' r","r' R2 U R' U R U2 R' U M'/M R U R' U R U2 R' U M'/U F' L' U' L U F U F R U R' U' F'/U2 r U R' U R' F R F' R U2 r'","F R U R' U' F' U F R U R' U' F'/U' M' R' U' R U' R' U2 R U' M/U' r R2' U' R U' R' U2 R U' R r'/U M U2 R' U' R U' R' U2 R U M'","r U' r' U' r U r' F' U F/F U R U2 R' U' R U R' F'/F U R U' R2 F' R U R U' R'/r U' r' U' r U r' y' R' U R","R' F R U R' F' R F U' F'/R' F R U R' F' R y' R U' R'/r' U r U r' U' r y R U' R'/l' U l U l' U' l y' R U' R'","U2 l' U' l L' U' L U l' U l/r' U' r R' U' R U r' U r/r' U' M' U' R U r' U r/U2 R' F' R L' U' L U R' F R","r U r' R U R' U' r U' r'/r U M U R' U' r U' r'/U2 R' F R U R' U' F' R U' R' U2 R/U2 l U l' L U L' U' l U' l'","R U R' U R' F R F' U2 R' F R F'/U2 F R' F' R2 r' U R U' R' U' M'/f R U R' U' f' U' R U R' U' R' F R F'/R' F R U' M' U2 r' U' F' U R","r U R' U R U2 r2 U' R U' R' U2 r/U R U2 R2 F R F' U2 M' U R U' r'/U2 F R U R' d R' U2 R' F R F'/U2 F R U R' U y' R' U2 R' F R F'","M U R U R' U' M' R' F R F'/r' R U R U R' U' r R2' F R F'/r' U2 R U R' U r2 U2 R' U' R U' r'/R' U2 F R U R' U' F2 U2 F R","M U R U R' U' M2 U R U' r'/r U R' U' M2 U R U' R' U' M'/M' U M' U M' U M' U' M' U M' U M' U M'/M' U2 M U2 M' U M U2 M' U2 M","U R U2 R' U' R U R' U' R U' R'/U F R U R' U' R U R' U' R U R' U' F'/R U R' U R U' R' U R U2 R'/R' U' R U' R' U R U' R' U2 R","R U2 R2 U' R2 U' R2 U2 R/f R U R' U' f' F R U R' U' F'/R U2' R2' U' R2 U' R2' U2 R/R' U2 R2 U R2 U R2 U2 R'","R2 D R' U2 R D' R' U2 R'/U2 R2 D' R U2 R' D R U2 R/U R U R' U' R U' R' U2 R U' R' U2 R U R'/R U R' U R U2 R2 U' R U' R' U2 R","r U R' U' r' F R F'/U2 l' U' L U R U' r' F/U' x' R U R' D R U' R' D' x/L F R' F' L' F R F'","U F' r U R' U' r' F R/R' F R B' R' F' R B/F R' F' r U R U' r'/U' x' R U' R' D R U R' D' x","U R U2 R' U' R U' R'/R' U' R U' R' U2 R/U2 L' U' L U' L' U2 L/U2 L' U R U' L U R'","R U R' U R U2 R'/U' R' U2 R U R' U R/R U' L' U R' U' L/U2 L U L' U L U2 L'","r U R' U' M U R U' R'/U2 M' U M U2 M' U M/M U M' U2 M U M'/U' M' U' M U2 M' U' M","M U R U R' U' R' F R F' M'/r2 D' r U r' D r2 U' r' U' r/U R U R' U' R U' R' F' U' F R U R'/U2 R' F R F' R U2 R' U' F' U' F","U' r' D' r U' r' D r2 U' r' U r U r'/M U' L' U' L U L F' L' F M'/U2 F R' F R2 U' R' U' R U R' F2/R2 U R' B' R U' R2 U R B R'","R' U' F U R U' R' F' R/U2 S' L' U' L U L F' L' f/U' F R' F' R U R U R' U' R U' R'/U S R U R' U' f' U' F","S R U R' U' R' F R f'/R U B' U' R' U R B R'/U2 L U F' U' L' U L F L'/R d L' d' R' U l U l'","R U R' U' R' F R F'/F R U' R' U R U R' F'/U2 L' U' L U L F' L' F/U' r' U' r' D' r U r' D r2","U2 R U R' U' B' R' F R F' B/U2 R U R2 U' R' F R U R U' F'/F R U R' U' R' F' r U R U' r'/U2 R U R' U' x D' R' U R U' D x'","R U2 R2' F R F' R U2 R'/f R U R' U' f' R U R' U R U2 R'/U' R' U2 R l U' R' U l' U2 R/U' R U2 R' U' R U' R' U2 F R U R' U' F'","U2 L' U' L U' L' U L U L F' L' F/R' U' R U' R' U R U l U' R' U x/U2 R U R' F' R U R' U' R' F R U' R' F R F'/R' U' R U' R' U R U R y R' F' R","F R U' R' U' R U R' F'/F R' F' R U R U' R'/R' F R F' U' F' U F/U' R U2 R' F R' F' R2 U2 R'","R U R' U R U' R' U' R' F R F'/L' U' L F L' U' L U L F' L' U L F' L' F/R' U2 r' D' r U2 r' D R r/U2 R U R' U R U2 R' U F R U R' U' F'","U L F' L' U' L U F U' L'/U' R U R' F' U' F U R U2 R'/U' R B' R' U' R U B U' R'/F R U R' U' R U R' U' R U' R' U' R U R' F'","U R' F R U R' U' F' U R/U' f R' F' R U R U' R' S'/U' F R U R' U' F' R U R' U R U2 R'/R r D r' U r D' r' U' R'","U2 R U R' U R U2' R' F R U R' U' F'/U' L F' L' F L F' L' F L' U' L U L' U' L/R U' R' U2 R U y R U' R' U' F'/f R U R' U' f' U' R U R' U R U2 R'","R' U' R U' R' U2 R F R U R' U' F'/U R' F R F' R' F R F' R U R' U' R U R'/M U F R U R' U' F' M'/L' U L U2 L' U' y' L' U L U F","f' L' U' L U f/U2 F' U' L' U L F/U R' U' F' U F R/B' U' R' U R B","f R U R' U' f'/U2 F U R U' R' F'/U2 r U x' R U' R' U x U' r'/U' L d R U' R' F'","F R U R' U' F'/U2 f U R U' R' f'/U2 F' L' U' L U F/F R2 D R' U R D' R2 U' F'","R' U' R' F R F' U R/U F R U R' y' R' U R U2 R'/U2 r' F' L' U L U' F r/U' F R U R2 U' R F' U' R' U2 R","F' L' U' L U L' U' L U F/R' U' R' F R F' R' F R F' U R/R' U' l' U R U' R' U R U' x' U R/U2 B' R' U' R U R' U' R U B","F R U R' U' R U R' U' F'/R U2 R' U' R U R' U2 R' F R F'/U2 f U R U' R' U R U' R' f'","U2 r U' r2 U r2 U r2 U' r/l U' l2 U l2 U l2 U' l/R B' R2 F R2 B R2 F' R/U2 R' F R' F' R2 U2 B' R B R'","r' U r2 U' r2' U' r2 U r'/U2 R' F R2 B' R2 F' R2 B R'/U' R U2 R' U' R U' R' F R U R' U' F'/U2 l' U l2 U' l2 U' l2 U l'","f R U R' U' R U R' U' f'/U2 F U R U' R' U R U' R' F'/U' R' U' R' F R F' R U' R' U2 R/U2 f' L' U' L U L' U' L U f","R U R' U R d' R U' R' F'/R' U' R U' R' U F' U F R/R' U' R U' R' d R' U R B/R U R' U R U' y R U' R' F'","r' U' R U' R' U R U' R' U2 r/U2 l' U' L U' L' U L U' L' U2 l/U r' U2 R U R' U' R U R' U r/U' l' U2 L U L' U' L U L' U l","r U R' U R U' R' U R U2 r'/U' r U2 R' U' R U R' U' R U' r'/U' r U r' R U R' U' R U R' U' r U' r'/F' L' U' L U L' U L U' L' U' L F","R U2 R2 U' R U' R' U2 F R F'/U R' F R U R U' R2 F' R2 U' R' U R U R'/r U2 R2 F R F' U2 r' F R F'/U r U2 R' U' R2 r' U R' U' r U' r'","r U r' U R U' R' U R U' R' r U' r'/F R U R' U' R F' r U R' U' r'/r' U' r U' R' U R U' R' U R r' U r/U f R U R' U' f' F R U R' U' R U R' U' F'","R U R' U' M' U R U' r'/M' U M' U M' U2 M U M U M/R U R' U' r R' U R U' r'/M' U M' U M' U M' U2 M' U M' U M' U M'"],
};
var PLL = {
    "Ua":["U2 R2 U' R' U' R U R U R U' R/R U' R U R U R U' R' U' R2/M2 U M U2 M' U M2/U2 M2' U M' U2' M U M2'/U2 R U R' U R' U' R2 U' R' U R' U R/U' R2 U' S' U2 S U' R2"],
    "Ub":["R' U R' U' R' U' R' U R U R2/U2 M2 U' M U2 M' U' M2/M2' U' M' U2' M U' M2'"],
    "H":["M2 U' M2 U2 M2 U' M2/M2 U M2 U2 M2 U M2"],
    "Z":["M' U' M2 U' M2 U' M' U2 M2/U M' U M2 U M2 U M' U2 M2/U M2' U' M2' U' M' U2' M2' U2' M'/M2' U M2' U M' U2' M2' U2' M'"],
    "Aa":["l' U R' D2 R U' R' D2 R2 x'/U x' R2 D2 R' U' R D2 R' U R' x"],
    "Ab":["x R2 D2 R U R' D2 R U' R x'/U x' R U' R D2 R' U R D2 R2 x"],
    "E":["x' R U' R' D R U R' D' R U R' D R U' R' D' x"],
    "Ga":["R2 u R' U R' U' R u' R2 y' R' U R/R2 U R' U R' U' R U' R2 D U' R' U R D'"],
    "Gb":["U F' U' F R2 u R' U R U' R u' R2/R' U' R y R2 u R' U R U' R u' R2/R' U' R U D' R2 U R' U R U' R U' R2 D"],
    "Gc":["R2 u' R U' R U R' u R2 y R U' R'/R2 u' R U' R U R' D x' U2 r U' r'/U2 R2' F2 R U2 R U2' R' F R U R' U' R' F R2/R2' U' R U' R U R' U R2 D' U R U' R' D"],
    "Gd":["R U R' y' R2 u' R U' R' U R' u R2/R U R' U' D R2 U' R U' R' U R' U R2 D'"],
    "Ra":["R U R' F' R U2 R' U2 R' F R U R U2 R'/R U' R' U' R U R D R' U' R D' R' U2 R'/U' L U2 L' U2 L F' L' U' L U L F L2"],
    "Rb":["R' U2 R U2 R' F R U R' U' R' F' R2/R' U2 R' D' R U' R' D R U R U' R' U' R"],
    "Ja":["R' U L' U2 R U' R' U2 R L/U2 L' U R' z R2 U R' U' R2 U D/U x R2 F R F' R U2 r' U r U2 x'/U' L' U' L F L' U' L U L F' L2 U L"],
    "Jb":["R U R' F' R U R' U' R' F R2 U' R' U'"],
    "Na":["R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'/z D R' U R2 D' R U' D R' U R2 D' R U' z'/z U R' D R2' U' R D' U R' D R2 U' R D' z'"],
    "Nb":["z D' R U' R2 D R' U D' R U' R2 D R' U z'/R' U R U' R' F' U' F R U R' F R' F' R U' R/R' U R U' R' F' U' F R U R' U' R U' f R f'/z U' R D' R2' U R' D U' R D' R2' U R' D z'"],
    "Y":["F R U' R' U' R U R' F' R U R' U' R' F R F'/F R' F R2 U' R' U' R U R' F' R U R' U' F'"],
    "F":["R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R/U R' U2 R' d' R' F' R2 U' R' U R' F R U' F"],
    "T":["R U R' U' R' F R2 U' R' U' R U R' F'"],
    "V":["R' U R' d' R' F' R2 U' R' U R' F R F/z D' R2 D R2' U R' D' R U' R U R' D R U' z'/U2 L' U L' U' y' R' F' R2 U' R' U R' F R F/R' U R U' x' U R U2' R' U' R U' R' U2' R U R' U' x/R' U R' U' R D' R' D R' U D' R2 U' R2' D R2"],
};
var ZBLS = {
    "1":["(U) R U' R'", "U R U R' U2 M' U R U' r'/U R U R' U2' R' F R F' /R' U' F U R2 U' R' F' ", "M' U R U' r'/R' F R F'", "M U R U' R' U' M'/U S' R U' R' S/(U2) R U' B U' B' R'", "U2' R' F R F' R U2 R' /U R B U' B' R' /U R' F R F2 U F/(U2) F2 r U r' F/y' U2' R2' F R F' R ", "R' F R2 U R' U' F' /U2 R U' R' U' R' F R F' ", "R' U' F U R U' F'/U F' L' U' L F/U2 R U2 B U B' U' R' ", "M' U R U' r2 U2' R U R' U r/y R' F' R U2 M' U' M/U2 R' F R F' U2 R' F R F' "],
    "2":["y U' L' U L", "U R' D' r U' r' D R/U' R2 D r' U r D' R2  ", "F R' F' R /r U R' U' M", "U' R' D' r U r' D R /U' F2 r U r' U F", "U' r U' r' U r U r' /U2 R2 B' R' B R'/(U2 l R U' R' U l')", "R U2 R D r' U' r D' R2", "d' F R U R' F'/U2' R U R' U' R' F R F' R U' R' ", "r U r' U2 M' U M "],
    "3":["y L' U' L", "y' S' (R' U' R) S", "R U' R' F' r U' r' F2 ", "U R2 D r' U' r D' R2", "F' r U' r' F2 R U' R'", "U2 R' D' r U' r' D R2 U' R' ", "U' R' F R U R U' R2 F' R", "R' F R2 U' M' U2 r' U' F'"],
    "4":["R U R'", "R U R' U' F R U R' U' F'/R U y R U R' U' F' /S' R U R' S ", "R U R' F R U R' U' F' /U M U' R U R' M' ", "U F U R U' R2' F' R /R U R' U' r' U2 R U R' U r", "(U') F' U2 F U R U' R'/R U R' F U R U' R' F' /", "R U' R2' F R F' R U2' R' /R U' R' F2 r U r' F  ", "U2 r U' r' U' r U r' /R U' R' U2 R' F R F'  ", "R' D' r U' r' D R2 U R'  "],
    "5":["(U') R U R' U2 R U' R'", "U' R U R' U R' F R F' ", "U2 R U' R' U2 R U' R' U R' F R F' /R U' R B2 r' U' r B' R2 ", "U' r U R' U' R2 r' U2 R' ", "y' U r' U R U' R' U' r /r U' r' U' r U r' F' r U' r' F2", "U' F R U R' U' F' R U2 R'/U R U' R' U' R' F R F' R U R' ", "R' D' R U R' D F R F' ", "U' r U' r' U2 r U r' U' R U' R'"],
    "6":["y F2 R U R' U' F2", "y U L' U' L U' L F' L' F /F R U' R' U' R U R' F2 U F ", "U2' R' F' U' F U R2 U' R' /(R U R' U') (R U R' U') F' U' F", "U' R' F R F' R U2' R2' F R F' /R2 D r' U' r D' R' U R'  ", "U' r U' R' U R U r'", "U2 y' R' F' U' F U2' R /U' R' F2 R U' F U' R U2 R' F2/U2 F' L' U' L U2' F /U R U R2' F R F' r U' r' U' r U r' ", "R' D' F r U2 r' F D R", "U M' U M U2 r U R' U M/U R U R D r' U' r D' R2' U' R U R' /U R U' R' d' L' U L2 F' L' F"],
    "7":["(U') R U2 R' U2 R U' R' ", "U' R U2 R' U R' F R F'", "R U R' U R U' R2 F R F' /U R' F R F' R U' R' U R U R' ", "F R' F' R U2 R U' R' U R U' R' /r' F' R2 U R' U2 R U' R2 F r", "R' D' R U2 R' D F R F'", "U R U' R' U R' F R F' R U R' /U' R B r' U r B2 U' R' /", "R' D' r U2 r' D F R F'/y' R2' F R F' U R U2' R' U R /F2 r U r' F R U R' U2 R U R'", "M' U' M U2 r U' r'"],
    "8":["y' U R' U2 R U2 R' U R", "U y L' U2 L U' L F' L' F /r' U2 R2 U R2' F' U F r/", "B' R' U' R2 U R' B/U2 R U' R' F' U' F U' R U R' ", "F R' F' R U' R U R' U' F' U' F/R2 D R' U' R r' U' r D' R' U R'/(x' R2) U' R' U F' l' U R' F R F' ", "r' U2 R2 U R2' U r/U2 r' D' r U r' D r2 U' R' U R U r' ", "U' r' F' r U r U' r2' F2 r F/r' U2 R U R' U r2 U' R' U' R U r'", "U R U' R' d R' U R U' R' U R /r' U2 R2 U R' U' R' U2 r/(R l) U' R' U F' l' U2 R U' R'", "r U r' U' R U' M' U r' "],
    "9":["y' U2' R' U R U R' U' R/U y' R' U' R U' R' U' R /R' D' R U' R' D R F' U' F", "F R U R' U' F' U' R' F R F'    /M' U R2 r' U2 M' U r'            ", "F R U R' U' F' R U' R' ", "U' r U2 r' U' r U' r' U r U2 r'/U r U' r' U2' r U r' R U' R' ", "U' R U' R' d R' U' R /F2 r U r' U' r' F r U' F", "R' F R2 U' R' U' r U2 r' U' F'", "U r U R' U' M R U' R' /R' F R U2 r U2 r' U2 F' ", "U r U r' U2 M' U M R U' R' /U2 R U R' U' R' F R F' R U2' R2' F R F'/U2 R U R D r' U' r D' R' U R'/R' F2 R2 U' R' U' R' F' R2 U R' F2/"],
    "10":["(U') R U R' U R U R'", "U F R' F' R U2 R U' R' /R U R' F' U F U R U' R' ", "F R' F' R U R' F R F' R U R'/r' D' r U r' D R r U R'", "U2 R U' R' U r U' r' U' r U r' /R B' R' U' R U B U2 R'", "R U R2 F R F' R U R' /U2' r U' R' U' R U r' ", "U' R U R' U' r U' r' U' r U r' /R' F' R U R U' R' F' r U r' F", "U' r' D' r U' r' D r2 U' r' U' r U r' /U' F' U' F r U' r' U' r U r' /R' D2 r U' r2' D r D2 R   /R' F R F' U2' R U R' U' R U R'              ", "r U' r' U' r U r' U2' R' F R F' /R U' R D r' U' r D' R' U' R' /R' D' R U M' U r' D R2 U R'"],
    "11":["(y') R U2 R2 U' R2 U' R'/R U2' R' U R U R' F' U' F /", "F' U r' F2 r U2 F", "(U') R U R' U' R U' R' U' F' U' F/R U' R' U R U' R2' F R F' R U' R' ", "R U2 R' U' r U' r' U2 r U r'/r' U' R2 U' R2' U2' r F' U F/R U' R' U' R U' R2' F R F2 U' F", "R U R' U' R U' R' F' U' F", "F' L' U' L U' L' U L U' F /F' U r' F' r U r' F r F/R' D' r U r U R U' r2' D/", "U' R U2 R' U F' U' F", "F R' F' R U' R U' R2 F R F'/R U R' U2 R' F R F2 U' F/R U' R' U y r' F2 r2 U' r' F "],
    "12":["R U' R' U R U' R' U2 R U' R'", "R d' R U2 R' U2 F' ", "R U' r' U R U' R' U' r U2 R'", "R U M' U' M U2 M' U' r'/(U2) R' F2 r U r' F R2 U R'", "R U' R' U R U' R' U R' F R F'/U r U' R' U' R U r' U' R U R' ", "R U R' U R' F R F' R U R'", "(U) F' U2 F U' R U R'", "R' D' R U2 M' U r' D R2 U R'/R U2 R' U' M' U' M U2' r U' r' "],
    "13":["U y' R' U R U' R' U' R /R' D' R U R' D R F' U' F", "R' D' r U r' D R U R U' R' /R' F R F' U' R' F R F' R U R' ", "R2 D R' U R D' R2 F' U' F /U R U' R' U R U' R' U' y' R' U R ", "M' U' R U' r' U2 r U' r'", "M' U' R U R' U2 R U' r' /R U' R' U R' F R F' R U' R' /R U R' U R U' R' F' U' F", "R' F R U2 r U' r' U2 F'/U2' r U2' r' U' r U r' U r U2' r' ", "R' F' r U R U2 r' F2", "U2 R U R D r' U r D' R' U R' "],
    "14":["(U') R U' R' U R U R'", "R U R' U' R' F R F' R U R'", "U' R' F R2 U R' U' R' F' R /r' D' r U' r' D r R U R' /U F R U R' D R2 U' R2 D' F' ", "R U R' U' F' U' F U R U R'/U2 r U R' U R U2 r' U R U' R'/R B r' U r B2 U2' R' ", "M' U' R U' R' U R U R' U' M", "F' r U' r' F2 U' R U R'/U' R U' R' U' r U' r' U' r U r' ", "U2 R U R' U R U2 R2 F R F'", "U2 r U' r' U M' U2' R U r' /R' F R F' R U' R' U R U2' R2' F R F' /U2 r U' r' U2 r U r' U R U R'/U R2 D r' U r D' R2' U2' R U R'"],
    "15":["R' D' R U' R' D R U R U' R'/R U2 R' U R U R' U R U' R'/R U R' U2 R U' R' U R U' R'/", "R U R' U2 R U' R2 F R F'", "M U r U' r' U' M'/F D R U R U' R2 D' F' /", "R U2' R2' F R F' U' R U2' R'", "F' U F U2 R U R'/U R' F R F' U R U R'", "M U R U R' U' r U' R' ", "R' D' R U' R' D F R F' /U' R' F R F' R U R' U2' R U R' /y' R2' F R F' R U2' R' U R ", "l U r U' r2' F r U2 l'/U R U' R D r' U r D' R' U' R' /r' U' R U M' U' R' F U R U' F'/"],
    "16":["r U r' U r U2 r' U' r U' r'/U M' U R U' r' U' R U R'/U F R' F' R2 U' R' U R' F R F' /F' U (R U R' U R U2' R') F  /", "r U' r' U l' U2 R U' R' U2 l /U2 r' F' r U' r' F2' r2 U' r' U2' r U r' ", "R U R' U2' R U' R' U' F' U F ", "U2 R' D' r U' M U' R' D R/U r U' r' U2' r U r' U' R U R' ", "R U' R' U2 F' U' F", "F' U R U R' U' R' F2 R F'/U2 R U R' r U' r' U2' r U r' ", "U F U R U' R' F' R U R' /(l R) U' R' U l' U2 R U' R' /R' D' R U R' D R F R' F' R", "U' r U' R' U' M U2 r U r'/U R U2' R' r U' r' U2' r U r' /U R U2 R' F' L' U2 L F "],
    "17":["R U2 R' U' R U R'", "U R U2 R' U' R U R' U R' F R F'/U' F R U R' U' F2 r U' r' F2/U' R U2 R' U' F' U' F R U R'/R U' R' U' F R' F' R U2 R U' R'  ", "F' U' F U R U' R' U R U' R'/R U2' R' U r U' r' U' r U r' ", "R U2 R' F U R U' R2 F' R ", "R U R' U' F R' F' R2 U R' ", "R U' R' r U' R' U' R U r' /R U' M' U' R' U' R U r'  ", "F' U2' F R U R' U2 R U' R' /y' M U' R' U2 R U' R' U R U2' M' /R U l' U R' U' R U R' U' l /B' R U' R U R' U' R2 U B", "r' D' r U2' r' D r2 U' R' U2' R U r' /F' r U' r' F2 R U2' R2 F R F' "],
    "18":["y' R' U2 R U R' U' R /R' F R F' R U' R' U R U' R' ", "r U R' U R U r' U M' U2 R U r'/U' R2 D' r U' r' D r U R2 U' r'/R' D' R U2 R' D R r U' r' U2' r U r' /M' U2 r' F2 R U2 r U' r' U2 F/R U2 R' r U r' U2 r U R' U R r'", "R U' R' F' U' F U R U' R'/R U R' d' L' U L U' L' U L ", "R U' R2' F R F' r U' r' U' r U r' /R' D R2 U2' r' U2 R U r D' R2 /", "R U' R' F' U F U R U R'/U R U' R2' F R F' U R U' R' /U R' F R F' R U' R' U F' U' F ", "R U R' d' r' F r2 U' r' F /R U R' F' L' U2 L U' F /R U' R D r' U' r D' R2' U' R U R' /U F2 r U r' U F R U2 R'", "R' F R F' R U' R2' F R F' /R U R' U' R U2 R' F' U2 F", "F R' F' R2 U' R' U R U2' R2' F R F' /F R U R' U' F' R U2' R2 F R F'"],
    "19":["U R U2 R' U R U' R'", "U' l R U' R' U x U' R' U2 R U R'/U F R' F' R r U' R' U R U r' /F R' F' R2 U2 R' U2 R U R' ", "R' U R U' R2 F R2 U R' U' R F'/U' R U' R' U r U' R' U2' R U r' ", "U (F R U R' U' F') R U R'", "U R' F R F' R U' R' U2 R U' R' /F' U R U R' U' R' F R2 U R' /U R U2' r' U R U' R' U' M' ", "U R U2 R2 F R F' ", "F' U' F U2 R U' R' U R U' R'/U' r U' R' U' R U r' U R U' R'/U R U2' R' U R U R' U2' R' F R F' ", "U2 R U R2' r U' M U2' r U' r' /R' U' F' U F2 R2 U R' U' R' F' R/"],
    "20":["y' U' R' U2 R U' R' U R  y", "R' F2 R U' F U R' F2 R", "R' U' R' F R F' U R2 U' R'/U2' r U' R' U R U r' F' U' F /x R' U R U' R' U R U2' x' U' F/U2' R U' R' U F' r U' r' F2' ", "r' D' r U r' D r2 U' r' U2' r U r' /U' R U' r' U r U2' r' U' r U R' /F D R2 U' R' U2 R U R2 D' F' ", "U' R U' R' U R U' R' d R' U R /R' F2 r U2 R U' r2' F r F", "U' F' U' r U' r' F2/y U' L' U2 L2 F' L' F ", "U' R U' R2 F R F' R U' R'  ", "U' R U' R2' F R F' U' R' F R F' /U R U' R2 F R F2 U' F "],
    "21":["U2 R U R' U R U' R'", "r U' R' U2 R U r' ", "U R' F R F' U' R U2 R'/U2 F' U' F R U R' /", "U2 F R U R' U' F' U' R U2 R' ", "U2' R U R2' F R F' /U2 R B' R B R2 ", "U F R' F' R2 U' R' U R U R' /U2' R U r' U R U' R' U' M' /r' U2 R' U R2 U' R U2 r ", "U R U' R' U2 R U' R2' F R F' /R U R' U' F' U F R U R' /U2 F' r U R' U' r' F2 R F' ", "U2' F' r' F2 r2 U' r' F2 /U R' F R F2 U' F R U2 R'"],
    "22":["y' R' U R U2 R' U' R y /U2 R' F R F' R U R' U R U' R' ", "r U' r' U2' r U r' /F' L' U2 L F", "U2' R U R' F' U' F /y' R' F' U F U R y", "U2 R' F R F2 U' F R U R' ", "U2 F' r U' r' F2 ", "U2' R' F R F' R U R2' F R F' /r U' r' U2 y' R U R U' R' y", "U R U' R' U' R U' R' y' R' U' R /R2 U2 R2 F R F' R U2 R2", "U' R U2 r' U r U2 r' U' r U R'/U' F R' F' R U2' r U' r' U r U r' /M' U R U' r' F2 r U r' U2 F  "],
    "23":["U2 R2 U2' R' U' R U' R2'/R U' R2' D' R U2 R' D R ", "U F R' F' R U R U R' /R U R' F' U F R U R'", "U2 R U R' U' R U' R' U R' F R F' /U2 R U2 R' U' R U' R2 F R F'", "R U2' R' U r U' R' U' R U r' /R U2 R' F' U F U' R U R' ", "U R U' R' U' R U' R2' F R F' /F' U' F U' R U' R' U R U' R' /", "M U2 R U R' U r U' R'  /U2' r U' r' U r U r' U R U' R' ", "U R' F R F' R U R' U2 R U' R'/F U R U' R' F' U' F' U' F ", "U' R' F R F' U2' R U' R' U R' F R F'/U F R' F' R2 r' U R U R' U' M'  /(U') F2 r U r' U' r' F' r2 U' r' F2"],
    "24":["U' R U R2' F R F' R U' R'", "U' R U' R' U r U' r' U2' r U r' /F U R U' R' F2 U' F R U' R' ", "R U' R' U r U' R' U R U r'  ", "r U' r' U' r U r2' D' r U2' r' D r /r U R' U R U r' U' r U r' /r U' r' U' r U r' F' U2' F", "R U R' d R' U R U' R' U R /R U' R2 F' U' F U R2 U' R'  /U F' r' F r F R U R'", "y' M' U2 R' U' R U' r' U R /U r U' r' U2' r U r' R U2' R' U R U' R' /F' U' r U2 R' U' R U' r' U2' F/U2 R' F R y' R U2' R U R' U R2 /U' R U' R' F' L' U' L U' F /U' F' U r' F r U r' F r U' F ", "F U R U' R' F' R U' R' ", "R U' R2 D' r U M U R' D R/R U R' U2 F' r' F2 r U' F/U2 R U R' U' r U2' r' U' r U' r' U r U2' r'"],
    "25":["R' F' R U R U' R' F/U' F' R U R' U' R' F R /R' U' R' U' R' U R U R", "r U r' U2 r U R' U2 R U' r'/F2 r U2 R' U' r' F2 R F'", "U' (M' U R U' r') R U R'/U' R' F R F' R U R' ", "U2 r U2' R' U R U' R' U2' R U' r'/r' U' R' U' R' U R U r", "U' F' U F U R U' R' /L D (R' F R F') D' L'", "U2 r U' r' R U' R' U' r U' r'/U r U r' U R U M' U r' /U2 F' L' U' L U R U R' U' R' F R", "U' F' U' F U R U R' /R2' U R U' R' U F R2 F' R'", "r U r' U2 r U R' U' R U2 r'/U R2 D r' U r D' R' U' R' "],
    "26":["L E' L' U L E L' /U2 L E' L' U' L E L' /U2 R U' R' U' r U' R' U R U r' /r2 U2' R2' F R2 U2' r2' F", "r U R' U2 R U r' U2 r U' r'/R' D' R U M' U' r' D R", "U R U' R' F R' F' R/U R U' M' U R' U' M/R2 U R' U' R' F R F' R'", "r U r' U2' r U' R' U2' R U' r'/R' D' R U' M' U r' D R/(y') r U R U R U' R' U' r'", "U R U' R' U' F' U F", "r U2' f R f' U2 r' /R' D' r U r' D R U' R U R' /U F R U' R' r U2 r' U' F'/R' D r2 U r' U' r U' r2 D' R/F2 R U' R2 F R2 U R' F2", "U R U R' U' y' R' U' R /F U' r U M U' R' U F' ", "r U2 R' U R U' r' U2 r U' r' /U R U R D r' U' r D' R2' "],
    "27":["R U' R' U R U' R'", "R U' R2 F R F'", "R U' R2 F R2 U R' U' F' ", "U2 r U' r' U r U r' R U2' R' /R U' R2 U' F U R2 U' R' F'/R U' R' U R U R' U2' R' F R F' ", "R' F2 r U' R U r' F2/R' D' R U' R' D R U R' F R F' /R' D' R U R' D R U' R' F R F' ", "R U' R2 U' F U R U' F'/U2 R U R' U R U R2' F R F' ", "R U' r' U R U' R' U' M' ", "U' R U' R2 r U' M U2 r U' r'/R U' R' y R' F' R U2 M' U' M "],
    "28":["y' R' U R U' R' U R y", "F' U2' r U' r' F2 /y r' F r2 U' r' F ", "R U R' d R' U2 R /R U R' r' D' r U' r' D r/F U R U' R2 F' R2 U R' ", "R U2 R' U R2 D r' U r D' R2' /R U R' F R U R' U' F2 U' F", "R U2 l U' R' U l'", "y L' U L U' F R U R' F' /R U2 R' U' F R U R' U' F2 U' F/R U' R' r U' R' U' R r' U' r U r'", "R U2 R' y' R' U2 R y/U2 R' F R F' r U' r' U2' r U r' ", "R U2' R2' F R F2 U2' F "],
    "29":["y' R' U' R U R' U' R /M' U R U' r' U R U' R'/", "U R' F R F2 U' F", "U2 R U' R' F' U' F", "U R2 D r' U' r D' R2' U' R U2 R' /F' r2 D2 r' U r D2 r' U2 r' F2", "R' F R F' R' F R F' /x R' U R U' R' U R U' x'", "U' R U R' U' r U' r' U2 r U r'", "R' F R F' U R U R' U2' R' F R F' /U2 R U' R' U' R' F R U R U' R2' F' R /R U' R2' D' r U' r' D F R F'", "M' U' M U2 r U' R' U R U' r'"],
    "30":["R U R' U' R U R'", "U' F R' F' R2 U R' ", "U2' F' U F R U R' /R U R' F U R U' R2 F' R", "R U r' U' R U R2 r  ", "x U R' U' R U R' U' l ", "R U R' U r U' r' U' r U r'", "U2 R' F R F' R U' R' U2 R U R'", "R U R' U' R' D' r U r' D R2 U R' /r U R' U' R U r' U2' M' U M /U' F' U2 r' F r2 U' r' F2/"],
    "31":["R U' R' U y' R' U R y", "r U' r' U M' U R U r' ", "U' R' F R F' R U' R'", "U' R' F R F' U' R' F R F' /F2 r U r' U2 F R U' R' ", "R U2 R' U' F R' F' R", "R U2 R2 D' r U' r' D R  ", "F' U F R U2' R' /R' F' R U R U' R' U2 F", "r U' R' U' M U' r U r'"],
    "32":["(U) R U' R' U R U' R' U R U' R'", "U R' F R F' d R' U' R /U2 F' U r' F' r U' F/U2 R' F R F2 r U' r' F2 ", "U2 R U r' U R U R' U' r U' R'/R U' R2 F2 r U r' F R2 U R'/U R U' R' U R U' r' U R U' R' U' M' ", "U2 R U' f R f' U R' /U' F R' F' R U' R U R' /U' r U r' R' F R F' r U' r' /r U' R2 U' R U' R' U2 R2 U r'/", "U R U' R' U R U' R2 F R F' ", "U2 F R' F' R2 U R' U R U' R'/U2 R U2 R' U2 R U' R2 F R F'/R U R' U F' U F R U R' /", "U' R U R' U' R U R2 F R F'", "U2' r U2' r' U2 r U' r' U2 r U2' r' /U2' R' F R F' U2' r U' r' U2' r U r' /y U2 R' F2 R U2' R' F R U2' R' F2 R /r U M U2 r R2' U2' R U r' "],
    "33":["(U') R U' R' U2 R U' R'", "U r U' r' U r U r' R U' R' /M' U' R U r' U2 r U' r' /", "R U M U' R' U r U' R'", "(U') R U' R' U M' U R U' r' ", "U' R U' R' U2' R U R' U2' R' F R F' /R' F R F' R2 U R' U' R' F R F' R' /r2 D r2 U' R2 r' U r2 D' R2 r'", "y U2 F R U2 R' U2 F' /R U R' U' F' U' F U' R U2 R' /U' F' U2 L' U2 L F", "U R U' R2 F R F' R U R' ", "U' F R' F' R2 U2' R2' F R F' /D' r U' r' F2 U R' F R F2 D"],
    "34":["(U) R' D' R U' R' D R/U' R' D' R U R' D R", "y U L' U L U' L F' L' F /r' D' r U2 r' U' F2 U F2 D r", "r U r' U' R U M' U' r' /U' R U R' U' r U' R' U' R U r' ", "U R U M' U' r' U' r U r' /F U' R2 D2 R' U' R D2 R2 U F'", "U R U' R' F R' F' R2 U R' /U' R U2' R' U' r U' r' U' r U r' /R U' R' U' R' F R F' U R U R'/r U r' U R U2 R' U r U' r'", "R U R' U2 R' F R F' R U R'/U2 R U' R' U r U' R' U' R U r' ", "U r U' R' U R U r' U' R U R' /U R U' R' U' F' U F R U R' /F U R2 D2 R' U' R D2 R2 F'", "U r U2' r' U2' r U r' U2' r U2' r' /R U R D r' U r D' R' U' R'"],
    "35":["R' D' r U' r' D F R F' ", "R2 D r' U' r D' R2 U R U' R'  /U2 r U' r' U R' F R F' r U2' r' ", "U' R U R' d R' U' R /U M' U R U' M U' R' /R U R2 F R F' R' F R F'/(R U R' l' U R U' R' U R U' x')", "(U2) R U' R D r' U' r D' R2", "U2 R U' R' U' F' U' F /R U R2 F R F' U R U' R' ", "R' D' r U' r' D R U R U' R' ", "U2' R U R' F R' F' R /R2 D R' U2 R D' R2 F' U' F", "(U) R' D' r U r' D R2 U2' R' /R' F R F' U2' R' F R F' R U R' "],
    "36":["(U) F' U' F U' R U R'", "R2 D r' U r D' R' U R'", "U2 F' U' F U R U' R' /R U R' U R U' R' d' r' F r /R U R' F U2' r U r' U2' F'", "U2 R' F R F' r U' r' U' r U r'", "U2' R' F R F' U2 R U R' /R U R2 U' R F' R' U R F ", "U2 R2 D r' U' r D' R2' U' R U R'/R' F' r U2 r' F2 R2 U2' R' U' F/F' U2' r' F2 r2 U' r' F U' F /R2 D R' U2 R r' U' r D' R' U R'/", "F' U' F R U R' U' R U R' /R U R U R' U' R' F R F' R'  ", "R U M' U2 f R f' U2 r' /U F' U' F2 U R U' R2' F' R /R U R2' D' r U r' D R U' R U R' /R U R2' D' r U' r' D R U R U R'/R' F2 D' F' D R U R U' R2 F' R "],
    "37":["U' R' F R F' R U' R' U R U' R' U2 R U' R' /U' R' F R F' R' U2' R2 U R2' U R /U R2 U R' U' R' U2' r U R U' r' R'/R U' R' B' R' U' R2 U R' B", "U' r U' r' R U R' U r U' r' R U R' /R' F R F' U F' U2' F U' R U R' /R' F R F2 U' F U' R U R' U' R U R'/R U' R' U R' F R F2 U2 F R U R'"],
    "38":["R2 U2 R' U' R U' R' U2 R'", "F R' F' R2 U2' R' U' R U R'", "U R U' R' U' R U R' U R' F R F' /R' F R U R U' R2 F' R U' R U2' R'", "M' U R U' R' U' R U' r' U2 r U' r' /R U' R' U' r U' r' U2' r U r' R U2 R' /R U2' B2 r' U' r B' R2 F R F'  /R U' R' U2 R2 D r' U' r D' R' U' R'"],
    "39":["R U2 R' U R U' R' U R U R'", "R U' R' U R U2 R2 F R F'", "R U2' R' U R' F R2 U R' U' R' F' R", "R U2' R' r U' r' U M' U2' R U r' /r' U' R2 U' R2' U2' r F' r' F2 r F/R U R D r' U r D' R2' U2' R U R' "],
    "40":["U R U' R' F R U R' U' F' R U' R' /F2 r U r' F U2' R U R' ", "r U' r' U2' r U r' R U R' /R' F R D R U R U' R2 D' F' "],
    "41":["U' R U R' F U R U' R' F' R U R' /R U R' U' R U' R' U2 F' U' F", "R U' M' U' r' U2 r U r'"],


};
var algdbZBLL = {
    "T": ["U R' U' R U' R' U' L' U' L R U2 L' U' L/U' L' U' L U' L' U' L U2 R' L' U L U' R/U' R' U2 R' U' D R' U' R D' R U R U R2/U R' U' R U' R' U' R U2 L' R' U R U' L","R2 U2 R' U R U' R U2 R U L' U R U' L/U R' U2 R2 U R' U' R' U2 F' R U2 R U2 R' F/U2 F' L' U' L U L F U2 L' U' L' U L2 U2 L'","R2 F2 R U2 R U2 R' F2 R U' R' U R/R U R' U' R' U R' U' D R' U R D' R/R U R' U' D R' U R' U' R' U R2 D'/L' U' L' D' L U' r' R U2' R' B L2","U R2 U R2 U R2 U' R D R' U' R D' R/U2 F R2 D R' U' R D' R2' U' R U2 R' U' F'","U' R U2 R' U2 R U' R' U L' U R U' L U' R'/U' R U2' R' U2 R U' R' U r' F R F' r U' R'","U l' U' L U R U' r' F/U' F R F' r U R' U' r'/U2 x' R U R' D R U' R' D' x/U2 R' U' R' D' R U R' D R2","R' U2 R F U' R' U R U F' R' U R/R U2 D' R U' R U R U' R2 D U' R'/R' U2 R2 D' R U R' D U' R' U R2 U R","U' R' U' R U R' U R L' U R' U' R L/R U R U' R2 U' D R' U2 R U2 D' R/R' U' R U R' U R L' U R' U' R L","U F U R U2 R' U R U R' F'/L U2 R' U2 R U2 L' U' R' U R","U r' F2 r U2 r U' r' U' r' F r F/U R U R' U' R' F' R U2 R U2' R' F/U L' U2 L U2 L F' L' U' L' U L F","x' M' U' R U L' U' R' U' R U R' U R/L R' U' R U L' U' R' U' R U R' U R/L U' R' U L' U R U R' U' R U R' U R/U R U R' U' R U R2' D' R U2 R' D R U' R U' R'","U' R' U R U R' U' R' D' R U2 R' D R U R/U r' F R U2 F U2 F' U2 M'/U' R' U L y' R2' U R2 U' R2' S z'","L2 F2 L' U2 L' U2 L F2 L' U L U' L'/U2 R2 B2 R' U2 R' U2 R B2 R' U R U' R'/U2 R' U' R U D' R U' R U R U' R2 D/U L R U' R' U L' R U R' U R U R' U' R U' R'","R D' R' U R2 U' R2 U' R2 U2 R' D R'/U R2 U' R2 U' R2 U R' D' R U R' D R'/U2 F' L2 D' L U L' D L2 U L' U2 L U F/U R' L' U2 R U R' U' R U' L U2 R' U R","U' L U L' U L U R U L' R' U2 R U R'/U R U R' U R U L U R' L' U2 L U L'/U R U R' U R U R' U2 L R U' R' U L'","U2 R2 U2 R U' R' U R' U2 R' U' L U' R' U L'/U2 F R U R' U' R' F' U2 R U R U' R2 U2 R/U2 R2 U2 R U' R' U R' U2 R' U' L U' R' U L'","U' r U R' U' r' F R F'/R U R D R' U' R D' R2/U' R U R' U' L' U R U' R' L/R' F' R U R' U' R' F R U R","U' R' U2 R U2 R' U R U' L U' R' U L' U R","U2 R U2 R' B' U R U' R' U' B R U' R'/U' R U2 R2 D R' U' R D' U R U' R2 U' R'/U2 R' U2 D R' U R' U' R' U R2 U D' R/U2 R U R D R' U2 R D' R' U' R' U R U' R' U' R U' R'","U2 x' D R U' R' U R' U' D R' U R D2 x/U' R U R' U' R U' M' x' U' R U R' L'/U' R U R' U' R U' R' L U' R U R' L'","U' R U2' R' U2' R' F R U R U' R' F'/U R' U' R U2 R' F R U R' U' R' F' R U' R","U' F' U' r' F2 r U' L' U' L F/U2 R' U' R U' R' U R' F' R U R U' R' F R/L' U' y' L' U2 L U' L' U' L F/x' R' F2 r U2 L' U2 R U L U' L'","U' R U' R' U' R U R D R' U2 R D' R' U' R'/U L U' R' y' R2 U' R2 U R2 S z'","U R' U' R U R' U' R2 D R' U2 R D' R' U R' U R/R' U' y' R U l' D l U R' U' R U' R'/U2 R L' U R' U' L U R U R' U' R U' R'","R' U R U2 L' R' U R U' L/R' U r U2 R2 F R F' R U2 M/z' U' L D' L' U D z U2 L' U' L/R' U L' U' R L U2 L' U' L","L' R U R U' L U R2 U R U2 R'/U R U R2' F R F' R U' R' F' U F/U' R U R D R' U' R D' R' U2 R' U' R U' R'/R' U' R y R U R' U' R l U' R' U l'","U2 R U' R' U2 L R U' R' U L'/U2 R' F R U R' U' R' F' R2 U' R' U2 R","U R' F R' F' R2 U' R' U' F' U' F R/U' R' U' R' D' R U R' D R U2 R U R' U R/R U2 R' U' R' F R2 U' R' U' R U R' F' R U' R'/R U R' y' R' U' R U R2 F R F' R","F R U' R' U' R U2 R' U' F' R' U' R U' R' U2 R/U2 r U2 R' U' l R U2 R' U' R U2 l' U' r'","R2' U R U' R2' U R U2' L' R U R U' R2 r x'/R' U2 R U R' U R F U R U2 R' U R U R' F'/r' U2 R U R' l' U2 R U R' U2 l U r/R B L U2 L' U L U2 L2 B L B2 R'","U2 r U' r U2 R' F R U2 r2 F/r' U r' U2' l U' R' F2 r2 U' x/U' F B' R U R' U' R' F R2 U' R' U' R U R' F2 B/U' R U2 R U2 F2 R F2 L' U2 L U2 R2","R U R' U' R' U L' U2 R U' R' U2 L R2 U' R'/U2 R' U' R2 U R' F' R U R' U' R' F R2 U' R' U' R' U R","R U R' D R2 U' R2 U' R2 U2 R2 U' D' R U' R'/U2 R' U' R U' R' U R F U' R' U2 R U F'/R U' R' U R U R' U' R U R' U' R' D' R U' R' D R/U2 R' U' R U' R' U R U L U2 R' U2' R U2 L'","R U R' U R U' R' U' L' U2 R U2' R' U2 L/R' F R U2 M' U L' U' l y' U' R U' R'/R U R' U R U' R' B' U R U2 R' U' B","F U' R' U2 R U F' R' U' R U R' U R/R' D' R U R' D R U R U' R' U R U' R' U' R U R'/U2 r' F' r U r' F r2 U2 r' U F2 U' r U2 r'","U L' U2 R U2' R' U2 L U R U R' U' R U' R'","U R U R' U B' U R U' R' U' B R U' R'/U' L U L' U F' U L U' L' U' x' D r U' r' x/U R U R' L' U2 R U' R' U2 L U R U' R'","R' U2 R' D' R U2 R' D R' U R' U R U2 R'/U2 R U' R U D' R U' R' D U2 R2 U' R2 U' R'/U' R U R2' D' R U2 R' D R U2 R U R' U' R U' R'","U R' U' R U' F U' R' U R U F' R' U R/U R' U' R U' F U' R' U R U x' D' R' F R x/U' L' U' L R U2 L' U L U2 R' U' L' U L","U2 R U2 R D R' U2 R D' R U' R U' R' U2 R/R' U R' U' D R' U R D' U2 R2 U R2 U R/U' R' F2 R U' R2' F2 R2 U' R' U2 R' F2 R2","U' l' U2 R' D2 R U2 R' D2 R2 x'/U R U2 R' F2 R U2 R' U2 R' F2 R/U2 R U2' R' U2 R' F' R U2 R U2' R' F/z R' U' R' F' r U R2 U' r' F R' U","U' l U2 R D2 R' U2 R D2 R2 x/R' U2 R U' R' F R U R' U' R' F' R U' R/U' L' U2 L F2 L' U2 L U2 L F2 L'/U' R' F R F' R' F R F' R' F R F' R U R' U' R U R' U' R U R'","U2 F R U R' U' R U' R' U' R U R' F'","U2 R U2 R2 U' R2 U' R' U2 R' U R L' U R' U' R L/U' R U2 x U R' U R2 U' R' U R' U2 x' U2 R'/U' R U2 F U R2 U' R' U R' U' R' F' U2 R'/U' R U R' U2 R U' R' U2 R U' R2 F' R U R U' R' F","U R' U' R' D' R U R' D R U' R U' R' U2 R/U2 R D R' U' R D' R' U2 R' U2 R U' R' U' R/U R' U' y' R' U l U l' U L y' R U R' U' S z'","U R U R D R' U' R D' R' U R' U R U2 R'/R' D' R U R' D R U2 R U2 R' U R U R'","L' U' L U' R U2 R' U' R U2 L' U M' x'/x' M' U' R' U L' U' R U' R U R' U R/R' U2 R U R' U R U' R U R D R' U' R D' R2'/R' U R2 D R' U R D' R' U R' U' R U' R' U' R","L U' R U' L' U R2 U2 L U' L' U2 R/R U R' U L' U2 L U L' U2 R U' M' x'/U2 R L' U R' U' L U R U R' U' R U' R'/U2 R U2' R' U' R U' R2' F' r U R U' r' F","R2 U' R2 U' R' D R' U R D' R' U R2/U' R U R' L' U2 R U R' U L U' L' U2 L/U R' U' R U R' U' R2 D R' U R D' R' U2 R' U R/R' U' R2 U2 L' U R2 U' L U' R2 U' R'","R' U D' R U2 R' D R' U' R U2 R' U' R2/U' R2' F2 R U2 R U2' R' F' R U R' U' R' F' R2/F U' R2 U R' U R U2' R2' U' R U2 R' F'","U R U' R2' D' r U2 r' D R2 U' R' U' R U' R'/R U R' U' R' U R D R' U' R2 D' R D R2 D' R/D R D' F2 L' U' L F2 R2 U R U' R2/U2 L' U' L F L' U' L U L F' L' U L F' L' U' L' U L F","R2 U R' D' R U R' D R' U' R2 U' R2/U' R U2 R' U' R U L' U L U2 R' L' U L/U2 R U R' U2 R' D' R U R' D R2 U' R' U R U' R'","U2 r2 U R' U' r' F R F' U R' U' r' F R F'/R U2 R' U L U' R U L2 U R' U' L","U2 R2 F R U R' U' R' F' R' U' R2 U2 R U2 R/U' R U2 R U2' R2 U' R' B' R' U' R' U R B R2/U' R' U2 R' U2 R2 U R F R U R U' R' F' R2/R U R' U R U' R' U R L' U L U2 R' U' L' U2 L","U2 R U' R2 D' r U2 r' D R2 U R'","R' U R2 D r' U2 r D' R2 U' R/U R' U' R U R2' D' R U2 R' D R2 U' R' U R","U2 R2 U' R D R' U' R D' R U R2 U R2/U' R' U2 R U R' U' L U' L' U2 R L U' L'/U L' U2 L U L' U' R U' R' U2 L R U' R'","U R2' F R U R U' R' F R U2' R' U2 R' F2 R2/U' R2' U R U2 R' U R D' R U2 R' D U' R/F R U2' R' U R2 U2 R' U' R U' R2' U F'","U L' U' L R U2 L' U' L U' R' U R U2 R'/U' R2' U' R U F' U2' R' U2 R F U' R/U R U R' U' R U R2 D' R U' R' D R U2 R U' R'","U2 R U R' F' R U R' U' R' F R U' R' F R U R U' R' F'/U R U R' U R U R2' D' r U2 r' D R2 U R'/U R U R' U' R' U R D R' U' R2 D' R D R2 D' R/R' U L U R U2 L' U2 R' U2 R U' L U2 L'","U2 R U' R' U2 R U R' U2 R U R' U R U' R'/U' R' U' R U' R' U2 R U R' U2 R U R' U R/U L' U' L U' L' U2 L U' R' U2 R U R' U R/L U' L' U2 L U L' U2 L U L' U L U' L'","U' R U R' U R U2 R' U' R U2 R' U' R U' R'/R' U R U2 R' U' R U2 R' U' R U' R' U R","U' R U R' U R U' R' U R' U' R2' U' R2 U2 R","R U2 R' U' R U' R' U R U R' U R U2 R'","U' R' U' R U' R' U R U' R U R2' U R2 U2 R'","U2 R' U2 R U R' U R U' R' U' R U' R' U2 R/R U2 R2 U R' U2 R2 U R U' R U' R U' R2","U' R' U' R2 U R2 U R2 U2 R' U R' U R/L' U L2 F' L' F r' F U' F U F r","U' R U R2 U' R2 U' R2 U2 R U' R U' R'/R U' R2' F R F' R U' y R U' R' U' F'/L' U2 L R U2 R' U L' U L U R U' R'","R U2 R' U' R U' R2 U2 R U R' U R","U2 R' U2 R U R' U R2 U2 R' U' R U' R'","R' U R U2 R' U' R U' R U R' U' R' U' R U R U' R'/x' U' R' D R U R2 U2 R D' R' U2 R2 x/U2 R' U2 R2 U' R U' R U' R U' R' U2 R2 U R2","U' R U R' U R U2 R' U2 R' U' R U' R' U2 R/U' R U R' U R U2 R' L' U' L U' L' U2 L/U r' F' r U' r' F2 r R U R' U R U2 R'/U' L' U' L U' L' U2 L R U R' U R U2 R'"],
    "U": ["R' U' R U' R' U2 R2 U' L' U R' U' L/R U' R' U' R U2 R' U' R' D' R U2 R' D R","U' R U2 R D R' U2 R D' R' U2 R' U' R U' R'/L U' R' U L' U L U2 L' U' L U' L' R/U2 R U' L' U R' U' L R' U' R U' R' U2' R","U2 R2 D r' U2 r D' R' U2 R'/L2 D R' F2 R D' L' U2 L'/L2 D l' U2 l D' L' U2 L'/R' U2' R U R2' F' R U R U' R' F R","U R2 D R' U R D' R2 U R U2 R'/U R U R' U R U' R' U' R' F R U R U' R' F'","U' R U2 R2 D' R U2 R' D R2 U' R' U2 R U2 R'/U2 x' R U L' U2 R D' R' U R D R2 U L U' x","U2 R2 D R' U2 R D' R' U2 R'","R U R' y' R' U' R2 u R' U R' U' R u' R'/R U R' F' U' F2 D R' U R' U' R D' F'","U2 R' U R D' R U R' D R2 U' R U R U2 R/R' U' R U R U R' U' R' U F R U R U' R' F'/R' U' R U' R' U2 R2 U' L' U R' U' L","U R' U' L U' R U L' U R' U' R U' R' U R/R D' R' U R2 D' r' u2 l' U' R2 U' r2/U2 R2 F2' R2' U R U2 R' U' R U R F2' R' U2 R'","U R' U R' U' D' R U' R' U2 R U' R' D R U' R/U R2' U F' R2 U' R2' U' R2 U2 R2' U' F U' R2/U' R2' D' R U' R' D R2 U R' U R U2 R' U R U2 R' U' R","U' R' U' R U' L U' R' U2 L' U2 R U' L U2 L'/U L' U' L U' R U' L' U2 R' U2 L U' R U2 R'/U' R' U' R U2 x' U2 l' U2 R U2 l U2 R' l' U' R","U' R U' R' U R U R' U' R U R' U' R U L U' R' U L'/U F' L' U' L' U L' y' L' U' L U' F' U2 F' R/R F2 U' R2 U' R U2 R' U' R U' R U F2 R'/U' R U' R' U R U R' U2 R' D' R U R' D R2 U R'","R2' D' r U2 r' D R U2 R/R2 D' L F2 L' D R U2 R","U R2' D' R U' R' D R2 U' R' U2 R/U' L2 D' L U' L' D L2 U' L' U2 L","U2 R U R' U R U2 R2 U L U' R U L'/U2 R U R' U R U2' R2' z R U R' D R U' z'/U2 R' U R U R' U2 R U R D R' U2 R D' R'","R' U L U' R U L' R U R' U R U2 R'/U' R' U2 R' D' R U2 R' D R U2 R U R' U R","R2 D' R U2 R' D R U2 R","U R' U R U2 L' R U' L U R2 U2 L' U2 L R/U L' U2' L2' D L' U2' L D' L2' U L U2' L' U2' L/U' R' U2 R2 D R' U2 R D' R2 U R U2 R' U2 R","U R U R' U' L' U2 R U L U R' U L' U L/U2 R' U' R y R U R2 u' R U' R U R' u R/R' U R U R' U2 R U' D' R U' R' U2 R U' R' D","R U' R' D R' U' R D' R2 U R' U' R' U2 R'/R' F R U' R' F R U R' F R U' R' F2 R y' R U R'","R' U2 F U F' R F U2 R' U' R U F'/U R U' R U D R' U R U2 R' U R D' R' U R'/R U' R' D R' U' R D' R2 U2 R2 U' R' U' R2","U' L U R' U L' U' R U' L U L' U L U' L'/L' D L U' L2 D l u2 r U L2 U l2","R2' F2 R2 U R2' F2 R2 U' R2' U' R F2' R' U R F2' R/U' F R U R U' R y R U R' U F U2 F L'/U L' U L U' L' U' L U L' U' L U L' U' R' U L U' R/U' R' U R U' R' U' R U2 R D R' U' R D' R2 U' R","U' R U R' U2 F2 R U2 R' U2 R' F2 R2 U R'/U' R U R' U L' U R U2 L U2 R' U L' U2 L/U R2 U' R2 U' R U2 D' R U' R' U' D R U R2/U F R U' R' U' R U2 R' U' F' U R' U' R U' R' U2 R","R' F R U' R' U' R U R' F' R U R' U' R' F R F' R/R U' R2' U' R2 U R' F' R U R2' U' R' F R2/U' L U2 z' U' L2' U L' z L' U L U R' U L' U2 R/R D' R2' U R2 U' R2' D R2 U' R2' U R2 U R'","L' R' U2 L U2 R U' L' U R' U R U' L/F' R U' R F' R' U R F' U' F' U F2 R2 F/U2 L' R' U R' d' R' F' R2 U' R' U R' F R F B/U2 z U' D' R2 D R2' U R' D' R U' R U R' D z'","U' F2 R U' R' U' R U R' F' R U R' U' R' F R F2/U' F R2 U' R2' U' R2 U R' F' R U R2' U' R' F R F'/U2 R' U R U' x' U L' U L U2 R U' R' U x","U R U' L U L' U R' U' l U2 R U2 R2 x/F L' U L' F L U' L' F U F U' F2 L2 F'","U' F U R2 D' R U' R' D R2 F' R' U R/U' R U R' B' R2 D R' U' R D' R2 U B/U' r U R' U' r' F R U R' U' R F' R' U R/R2 L D' R U' R' D R2 U L' U' R' U R","U' R' U' R F R2 D' R U R' D R2 U' F'/U' R' U' R F R' U R U' R' F' r U R U' r'/U2 R2 L' D R' U R D' R2 U' L U R U' R'/U' R' U' R U L U' R2 D' R U R' D R2 L'","L U R' U L' U2 R U' R' L U L' U2 R/U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R' U2 R/D R' U' R D' F2 R2 U' r U2 r' U R2 F2/U F' R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R' F","R U' R' U R U' L U L' U x' U2 R U2 R2 x/U' R2 F' R U R' U' R' F R2 U' R' U2 R2 U R' U R/U2 r U2 x r U2 r U2' r' U2 l U2 r' U2' r U2 r' U2' r'/U2 R U2 x R U2 R U2 R' U2 L U2 r' U2 R U2 R' U2 R'","U F U R U2' R' U R U R2' F' r U R U' r'/U' R' U2 R' U' F' U F R2 U' R' F R' F' R2/R U R' U R U2' R' U R2' D' R U2 R' D R U2 R","U2 F R2 U R' D R2 D' R U' R2' F' R U' R'/U' R U2 R2 L' U2 L U L' U2 R2 U' M' x'/U' R U2 R' U2 R' F R U R U2' R' U' R U2 R' U' F'/U R U R' U R U2' R' U R U2 R D R' U2 R D' R2'","U' r U R' U' r' F R2 U' R' U' R U2 R' U' F'/L R' U' R2 U2 L' U L U2 L' R2 U2 R/U2 R' U2 R' D' R U2 R' D R2 U' R U2' R' U' R U' R'","U2 R U R' F R2 U R' D R2 D' R U' R2' F'/R' L U L2 U2 R U' R' U2 R L2 U2 L'/F R U R U2 R' U' R U' R' U2 R' U2 R U' R' U' F'/U' R2 D R' U2 R D' R' U2 R' U' R U2 R' U' R U' R'","L U L' U' R' U2 L U L' U2 L R U' L'/U2 R U R' B' U R U R' U' B U' R U' R'","U' R U2 R' U' R U' R D' R U2 R' D R U2 R/U2 L2 F2 L' U2 L' U' L2 F2 L2 U' L F2 L'/R U R' U R U' R' U2 R' D' R U2 R' D R2 U' R'","R' U' R U L U2 R' U' L' U' L R U2 L'/R' U' R F U' R' U' R U F' U R' U R","U2 R2 F2 R U2 R U R2 F2 R2 U R' F2 R/U' R' U2 R U R' U R' D R' U2 R D' R' U2 R'/U2 R U R' U' R' U' F U R2 U' R2 F' R U R U' R'","x' R2 D2 R' U2 R D2 R' U2 R' x/U2 R U2 R' U2 L' U2 R U2 R' U2 L/R U R' U' R U R' U' R U R' U' R' F R F' R' F R F' R' F R F'/U R' U R' F R U R U' R' F' R U R' U2 R","U2 x R2 D2 R U2 R' D2 R U2 R x'/U F' R U2 R' U2 R' F R U2 R U2 R'/R' U2 R U2 L U2 R' U2 R U2 L'/R' U2 R F' R' F U2 F' R F","F R U' R' U R U R' U R U' R' F'","U2 R U' R2' F R U R U' R2' F' R U' F' U F/U R U2 x U2 R U' R U R2 U' R U' x' U2 R'/U F' R U R' U' R' F R2 U R' U2 R U R' U2 R U' R'/R' L' U R U' R' L U' R U2' R U R2 U R2 U2 R'","U' R' U2 R U2 L' U L U2 R' U R U' L' U L/U' R' U R U R' U R U' R D R' U' R D' R2 U' R/U L' U2 L U2 R' U R U2 L' U L U' R' U R","U L U2 L' U2 R U' R' U2 L U' L' U R U' R'/U' R U' R' U' R U' R' U R' D' R U R' D R2 U R'","R' U2 R U R' U R' D' R U' R' D R U R/L' F' U L U L' U2 L U L' F L","R U R' F' R U R' F' R U R' U' R' F R2 U' R' F R U' R'/R F U' R' U' R U2 R' U' R F' R'/U2 R U2 R' U' R U' R D R' U R D' R' U' R'","R U' R' U' R U R D R' U R D' R2/R' D R2 U' R' U' R U2 R2 D' R","R U' L' U R2 U' R U' L U R' U2 L' U2 L R/U2 R' U' R2 U R2 U' R' U2 R U D' R U R' U2 D R'/U2 R' U' R U' R' U2 R F U' R' U R U F' R' U2 R/U' F R U R' U' R U R' U' F' U' R' F' U' F U R","R U R' U L' U R U' M' x' U' R U' R'/F R U R' U' x z' R2 U' R U' R' U2 R U' r' R","R' U2 R F U' R' U' R U F'/R2 D' R U R' D R U R U' R' U' R/U2 L' U2 L U R U2 L' U' L U2 R'","F R U' R' U' R U2 R' U' R U' R' U' R U2 R' U' F'/x' R U2 l' L' U2 L2 U R D L2 D' R' U L","U' r U R' U' M U R U' R' F R U R' U' F'/R' F' R U R U R' U' R' U' R' F R U R U R U' R'/R' U' D R' U' R U D' R U R U R U' R'/U' F R U R' F' r' U' R' F' R U r","U L U2 L' R' U L U' L' R U' L U' L'/U R U R' U R L' U R' U' R L U2 R'/U' R U2 R2 F R F' M' U' R U' R' U M/U' r U2 R2 F R F' U2 r' R U R U' R'","U R U L' R' U2 R U M' x' z R U' R U z'/U R U R' L' U2 R U R' L U L' U L/U' R' U2 R F U' R' U R U R' U R U' F'","L U2 L' F' U L U L' U' F/L U2 L' U' R' U2 L U L' U2 R/U2 R U2 R' U' L' U2 R U R' U2 L/U2 R' D R2 U2 R' U R U R2' D' R","M U' M' F R U R' U' F' M U M'/U F R U R' U' F' R' F R2 F' U2 F' U2 F R'/U R' L' U2 L U2 R U' L' U R' U R2 U' L U R'/R U R2 U' R2 U R U2 R' U' D R' U' R D' U2 R","L U2 R' U R U2 L' U' R' U2 R/U' F U' R' U R U F' R' U2 R/U2 R' U R U R' U' R' D' R U' R' D R2/U2 R U2 L' U L U2 R' U' L' U2 L","U2 M' U R' U2' R U R' U R2 z x' U R U' R' F'/U2 R U R' U L' R U R' U' L U' R U' R'/R U2 L' R' U R U L U L' U M' x'/U2 M' U R' U2' R U R' U R2 f l U' R' F'","U2 R U R' U R U2 R' U R U2 R' U' R U' R'/U' R' U' R U R' U R U2 R' U R U2 R' U' R","U' R U R' U' R U' R' U2 R U' R' U2 R U R'/R' U' R U' R' U2 R U' R' U2 R U R' U R/U2 L' U' L U' L' U2 L U' L' U2 L U L' U L","U R U2 R' U' R U' R' U' R U R' U R U2 R'","U R' U2' R2 U R2' U R U' R U R' U' R U' R'/U R' U' F R' F' R2 U' R' U F' U F R","U R' U2 R U R' U R U R' U' R U' R' U2 R","U R U2 R2 U' R2 U' R' U R' U' R U R' U R","U2 R U R' U R' U2 R2 U R2 U R2 U' R'","R' U' R U' R U2 R2 U' R2 U' R2 U R","R' U' R U' R' U2 R2 U R' U R U2 R'/U2 L' U' L U' L' U2 L2 U L' U L U2 L'","U2 R U R' U R U2 R2 U' R U' R' U2 R","R U R' U' R U' R U2 R2 U' R U R' U' R2 U' R2/x' R2 D2' R' U' R D2' R2' D R U R' D' x/R U R' U' R' U R U R U' R' U R' U R U2 R' U' R","U R U2 R' U' R U' R' U2 R' U2 R U R' U R/U R U2 R' U' R U' R' L' U2 L U L' U L/U r' U2' R U R' U r U2 r U2' R' U' R U' r'/U R' U2 R U R' U R L U2 L' U' L U' L'"],
    "L": ["R' F R' U F' R' F U' R2 F' R U R'/U' R' U' R U' R' U2 R' D' R U2 R' D R U2 R","U' L U' R' U L' U' R2 U2 R' U' R U' R'/U R D R' U2 R D' R' U' R' U2 R U' R' U' R","U' R' U2 R U R2' D' R U R' D R2/R U2 R' U' R U' R' U' R2' D' R U2 R' D R U2 R","R' U2 R' D' r U2 r' D R2/U2 L2 R U' R' U L' U2 R U' R' U2 L' R U R'","U' R' D' L U' D R' D R U R' D2 L' D R2/R' U2 R U2 R' U' R2 D R' U2 R D' R2 U2 R","R' U2 R' D' R U2 R' D R2","U' L' U R' U' R U L U2 R' U' L' U' R U' L/R U R' U2 R U R' U2 y' R' U2 R U' R' U' R/R' u' R U' R' U R' u R2 U' R' F' U F/R' u' R U' R' U R' u R2 U' R' y' R' U R","U R U2 R' F U2 F' U' R F U' F' U2 R'/U R U2 R U R U' R2 D R' U R D' R U R'","R2 U' R' U' R2 U R U D' R U2 R' D R2/R U' R D R' U' R U2 R' U' R D' U' R' U R'","U' L2 D' R' B2 R' D2 L' D R2 D2 L'/R U R' U' R U' R' U r' F R F' r U' R'","U' R' U' D R' U2 R U2 D' R2 U2 R' U' R2 U' R'/R' U R2 D R' U R D' R' U2 R' U R U R' U' R","U' R U' R2 F2 R U2 R U2 R' F2 U2 R U' R'","L F' U L U' L' U' F L U2 L' U2 L'/U2 R U R' U' R B2 R' U2 R U2 R B2 R2/U' F R U' R' U' R U R D R' U R D' R2 U' F'","R2' U R2 U' R' U' F R2' U R2 U' F' R'/U R D' R U' R' D R U' R2 U R2 U R2/U R' U' R U2 L' U R' U R U' R' U2 R r","L U' L' U2 L R U' L' U' R' U' R U' R'/L U' R U R' L' U2 R U' R' U' R U' R'","L U' R U L' U R U2 R U' R U R' U2 R2/R' U2 R2 U R' U' R' U2 F R U R U' R' F'","U' R U2 R2 U L U' L' R U2 R U L U2 L' R'/U2 R' U' L U' R U L' U R' U' R U2 R' U2 R","x' R U' R' D R U R' D' x/U F R' F' r U R U' r'/U2 R2 D R' U R D' R' U' R'","U' R' U2 R U2 D' R U' R U R U' R2 D/U2 z U R U' F' R U R U' R' F U R2 U'/R U R' U R U R' U' R U R D R' U2 R D' R' U' R'","R F U' R' U R U R' U R U' F' R'","U' U M' U2 y R' U2 R U2 F l U' z'/U R U R D R' U2 R D' R' U' R' U R U R'","R U R' U R U' R' U' L' U R U' M' x'/R' U' R U' R D R' U2 R D' R2 U R U' R' U R","U' x' M' U L' U2 R U2 L U' L' U' R' U R/U F R U R' U' R' F' R U2 R U2 R'","U' R' F' R U R' U' R' F R U' R U R' U R/F' r' F r U r' F2 r U F/L U L' U' R' U2 L U2 L' U2 R/U2 R U R' U' r' F2 R F2 l' U2 r","U' R' U' R U R' F2 R U2 R' U2 R' F2 R2/U R' D R' U' R D' U R U' R U R U' R'/U D R2 U' R U R U' R D' U R U' R'","U' R' U L' U' L R U2 L' U L U L' U L","R U R' U2 L U' R U' R' U R U2' R' L'/R' D R' U R D' R' U R2 U' R2 U' R2","U' R' U L' U' R U' L' U2 L' U L' U' L U2 L2/U2 F' R U2' R' U2 R' F U2' R U R U' R2 U2' R","U' x' D R U R' D' R U' l'/U2 F' r U R' U' r' F R/U R' F R U R' U' R' F' R U R U'","U' R U L' U R' U' L U' R U R' U2 R U2 R'","U R' L' U R U' R' L U' R U' R' U R","U2 R D' U R2 U R' U' R' U R' U2 D R'/U R' U' R F U' R' U' R U F' R' U2 R","U2 R U2 R' U' R U R D R' U' R D' R' U' R'/U2 F' R U2 R' U2 R' F R U R U' R'","U' L' U' L U' L' U L U R U' L' U M' x'/U R U R' U R' D' R U2 R' D R2 U' R' U R U' R'","U' M' U2 y' L U2 L' U2 F' r' U z/R' U' R' D' R U2 R' D R U R U' R' U' R/U' R U R' U2' R U' R' U' R U2 R' F' R U R' U' R' F R","U' F R U' R' U' R U2 R' U' F'/L' U' L U R U2 R' F2 L F2 L'/U L' U' L U R U2 R' F2 L F2 L'","U2 R U R' U R U2' R D R' U2 R D' R' U2 R'/x' M' U L' U L U2' L' U' L U' R U L'","L U2 L' U' L2 D L' U' L D' L2/U2 R U2 R' U' R2 D R' U' R D' R2","U' R U' R' F2 U2 F2 D R' U R U' R D'/U2 L' U R U' L U R2' U2' R U R' U R","U R U2 R D r' U2 r D' R2/U2 R' U M' U' R U' R' U' R U2 r' F R' F' R U' R/R' F' R U R' U' R' F R2 U' R' U2 R","U R U2 R D R' U2 R D' R2/F' r U' L D2 L' U L D2 r2 D","U R U2' R' U2 R U R2' D' R U2 R' D R2 U2' R'/U2 l x' U L' U' z' R U L' U' R' U L2 z L U' l2","R' U2 R' U' R' U R2 D' R U' R' D R' U' R/U2 F R U R' U' R' F' U' R U R U' R' U' R' U R","U' R U R' F' U' R' U2 R U F R' U R2 U2 R'/U R u R' U R U' R u' R2 U' F' U' F R","L U D' L U2 L' U2 D L2 U2 L U L2 U L/U L U' R U L' U' R' U R U' R' U R U' R' U' R U R'/U R U' R2 D' R U' R' D R U2 R U' R' U' R U R'","R2 D' R2 U R' D R2 U' D r2 D2 r2 D' R'/U R' U' R U R' U R U' L U' R' U L' U R","U R' U F U' F' U2 R F R' U R U2 F'/U R' U R' D' R U R' U2 R U R' U D R U' R","L' U L2 F2 L' U2 L' U2 L F2 U2 L' U L/U2 R' U R2 x' U2 R' F2 R' F2 R U2 x U2 R' U R","U2 R' F2 R2 U' L' U R2 r U2 R x'/U r U2 r2 F R F' r2 R' U2 r'","R U2 R' U' L' U2 R U M' x' U L' U L","U' L' U2 L U R U2 L' U' M' x' U' R U' R'","U' R' F2 R2 L' U' L U R2 F2 R/r U2 R r2 F R' F' r2 U2 r'","U R U' R F' R' U R F' R2 F U' F' R2 F2 R2","U' R' U L2 D' L' U2 L D L' U R U L'/R' U L U R' D R U2 R' D' R2 U L'","U' F R U R' U' R' F R2 U' R' U' R U R' F2/U R U2 R' U' F' R U R' U R U2 R' F R U' R'","U' R' U' R U R' U' R' F R2 U' R' U' R U R' F' U R/U' F R U R' U' F' R' U' R U' y R U' R' U R U' R' U F' U2 F","U' R' U' R U R' F' R U R' U' R' F R2/U' R' U' R U' F U' R' U' R U F'/U2 L U2 R' U R U2 R' L' U R/U r U2 R2 F R F' R U2 r'","F R U R' U' R U' R' U2 R U2 R' U' F'/U L' U L R U R' U' R' F R2 U' R' U' R U R' F' L' U' L/U F R U R2 F R F' R U' R' F'/U R' F' r U' r' F2 U' F' U F R","U' L' U2 R U' R' U2 L R U' R'/U2 R U R' L' U2 R U R' U2 L/U2 R U R' U F2 r U r' U' r' F r F/F R F' U2 R' U' R U' F R' F'","U' F R U' R' U' R U R D R' U' R D' R' U2 R' U' F'/R U D' R U R' D R2 U' R U R2 U2 R'/R' U2 R2 U R' F' R U R' U' R' F R2 U' R' U' R' U2 R/L R U2 R' U2 R B' R' U' R U R B R2 U L'","U' R U2 R' U2 R' U2 R' U R U' R U2 R2 U2 R'/U' R2 U R' U R' U' R U' R' U' R U R U' R2","U R U2 R' U' R U' R' U R' U2 R U R' U R/U R U2 R' U' R U' R' y R' U2 R U R' U R","U R U R' U R U2 R' U R' U' R U' R' U2 R","U R2 U' R U R U' R' U' R U' R' U R' U R2","R' U2 R U R' U R U' R U2 R' U' R U' R'","U2 R2 U' R U' R U R' U R U R' U' R' U R2","R' U' R U' R' U2 R U' R U R' U R U2 R'","R2 U R' U' R' U R U R' U R U' R U' R2","R' U2 R U R' U R U2 R' U' R U' R' U2 R","R' U' R U' R' U2 R U2 R' U2 R U R' U R","U' R U R' U R U' R' U R U' R' U R U2 R'","R U' R' L' U2 L U L' U L R U2 R'/U' R U2 R' U2 R' U' R U R U' R' U2 R' U2 R/U2 L U' L' R' U2 R U R' U R L U2 L'/U' R U' R' U R' U' R2 U' R2 U R U' R U R2 U R"],
    "PI": ["R' U2 R U' L U2 R' U' R U R' U R L'/U' R U R' U R U2 R' U l U R' D R U' R' D' x/U' R U R' U R U2 R' l' U' L U R U' r' F/R U R' U R U2' R2 U' R' F R U R U' R' F' R","R U2 R' U L' U2 R U R' U' R U' R' L/U R' U' R U' R' U2 R U2 r U R' U' r' F R F'/R U2 R' U' R U' r' F' r U R' U2 r' F2 r/R U2' R2' U' D R2 U' R2' U R2 D' R' U' R' U2 R","U R U R' U R' D R2 U' R' U R U' R D' R' U' R'/U2 R2 U2 R' U2 R' F R F' R2 F R F' U R U R'/U2 R' U' R' D' R U R' D R' U R' U R U2 R'/U' L U F' U L2 U' L2 U' F L2 U2 L","U' R' U' F U' R2 U R2 U F' R2 U2 R'/U' R' D R2 U2 R2 D' R U R' D R2 U R2 D' R/U2 R U R D R' U' R D' R U' R U' R' U2 R","U L U2 R' L' U L U2 R U2 L' U R' U2 R/R U R' F' U' R U2 R2 U' R U' R' U2 F R2 U' R'/U R' U' R L U2 R' U2 R U2 L' U R' U2 R/U' R U2 R' U F2 R U2 R' U2 R' F2 R2 U R'","U' R U L' R' U2 R U2' R' U2 L U' R U2' R'/U R2' F2 r U r' F R2 U2' x' U' R U l'/F R U R' U' R' F' R U2 R' U' R2 U' R2 U2 R","R2' F R U R U' R' F' R U' R' U' R U R' U R/R U2 R2 U' R' D R' U' R D2 L F2 L' D R2/U R U2 R2 U' R U' R' U2 F R U R U' R' F'","U F U R U' R' U R U2 R' U' R U R' F'/R U y R U' R' U R U2 R' U' R U R' F'","U' R U R' U R U' R' U' R' F' R U2 R U2' R' F/U F R2 U' R2' U R2 U R2' B' R2 F' B/U F R2 U' R2' U R2 U F' B U2 B'/R U R' U L' U2 R U R' U2 L R U2 R'","U' F U' R U' R' U R U R' U2 R U2 R' U F'/R U' L U' R' U L' U' R' U' R2 U' R2 U2 R/U2 R U' R' U2 y' R' U R U2' R' U R d' R U R'/U R' F' R U R U' R' F U R2 U R2' U R U' R U' R2'","U R2 D' R U' R' D R U R' D' R U R' D R U R U' R' U' R/U' R F U R2 U2 R2 U R2 U R2 F' R'/U L U L2 R U2 L2 U L2 U L2 U R' U' L'/U' R U R' U' D R' U2 R' U' R U R U2 R D' R U2 R'","R' U' F' R U R' U' R' F R2 U2' R' U2 R/R' U' R U' L U2 R' U' L' U2 L R U2 L'","L' U L U' L' U L U L' U2 R' U L U' R/U R2 D' R U2 R' D R2 U R2 D' R U R' D R2/U2 R' U R U' R' U R U R' U2 L' U R U' L/U R U2 R' U2 F R U' R' U R U R2' F' R2 U2 R'","U2 R U' R' U R U' R' U' R U2 L U' R' U L'/U2 R' U2 R' F' R U R U' R' F U R U' R' U2 R/U' R2 D R' U2 R D' R2 U' R2 D R' U' R D' R2/L U2 R' U L' U L U' L' U' L U' R U2 L'","R' U2 R' D R' U R D' R U R2 U2 R'/R' U' R U' R2' D' R U R' D R2 U' R' U2 R","R U2 R D' R U' R' D R' U' R2 U2 R/R U R' U R2 D R' U' R D' R2' U R U2 R'","R U R' U R' U' R2 U2 L' U R2 U' L U' R/R' U2 R U R' U R U R' U2 F' R U R' U' R' F R U2 R/R' U' R U' R' U2 R U' R' U' R U' R2 D' R U2 R' D R2/l' U R' U' x' R2 U R2' U' F l' U' l U R2","R U' L' U R' U L2 U L2 U L U' L U' L'/R' U2 R2 U R2 U R U' R U2 L' U R' U' L/U R' U' R U' R U R2 U R F' R U2 R' U2 R' F R/U' R' U' F' R U2 R' U' R U' R' F U R U R' U2' R","U R U2 R2 U' R2 U' R D' r U2 r' D R2/U' F U R U2 R' U R U R' F' R U2 R' U' R U' R'","R2 U R' U' R' U2 R' U2 R U R' D R' U R D'/U2 R U2 R' U' R U r' F2 r U2 R' U' r' F r/U2 R U2 R' U' R U L' U2 L U2 R' U' L' U L","U2 L' U R U' L U' R' U' R U' R'/U R' U' R U' R' U R' F R U R U' R' F' R/U2 r' F R F' r U' R' U' R U' R'/U' R U2 R' U R' D' R U2 R' D R2 U' R'","L' U L U2 R' L' U L2 U' R U L'/r' U r U r' U' r U l' R' U R U' R/U2 R' F R U R' F' R U r' L' U L U' r","L U' L' U2 R L U' L2 U R' U' L/r U' r' U' r U r' U' l R U' R' U R'/L F' L' U' L F L' U' l R U' R' U l'","R U' r' F R' F r U r' F r/R U' L' U R' U L U L' U L","R' U2 R U R' U' R U2 L U' R' U R L'/U2 L' U2 L U L' U' L U2 R U' L' U M' x'","R U' R' U' R U' R' U R U R' U R' F' R U R U' R' F/U' R U2 R F2 R2 U' R U' R' U R2 F2 R2/U' R U2 R' U L U' R' U' R2 U' R2 U2 R L'","U L' R U R' U' L U2 R U' R' U R U2 R'","U2 R' U2' R U R' U' R U R2' F R U R U' R' F' R/L' R U2 R2 U' R2 U' R' U' L U R' U2 R","L' U2 R U' L U' R' U' R U2 L' U M' x'/R U' L' U R' U' L U' R U' L' U R' U' L/U F U R U2 R' U2' R U R2' F' R U2 R U2' R'/L U' R U R' L' U2 R U2' R' U R U2' R'","U' R U' R U2 R U2 R2 U R' F2 R' U R' U' R2 F2/U F U R U' R' U R U' R2' F' R U R U' R'/R U R' U R' F R2 U' R' U' R U R' F' U R U' R'","U2 R U R' U R U R' U x U' L U' L' U2 R' U R U' x'/U' R2 U' F' U F U R2 U' R2 U' R2 F R2 F'/F U' R2 U R U' R' U R2 U2' R' U' R' U R U' R F'/U R U R' U R U2 R' U' R U R' U R2 D R' U2 R D' R2","U' R U R' U R U' R' U F2 r U2 r' U' r' F r/L' U L' U2 L' U L U' R U' L U L R' U2 L2/R' U' R U R U2 R' U2 R D R' U R D' U' R2 U2 R/U B U' B' U' R' U R' U' F U R2 U' R' F' R","U R' U' R U' B2 R' U2 R U2 l U2 l'/U' R U2 R' U2 R2 F2 R2 U R U' R F2 R2","U' R' U' R U' R' U R U' R' U R' D' R U R' D R2/U L' U R U' L U R2 U' R U' R' U2 R/U R B2 R' U R2 B2 R' U' R' U' R2 B2 R2","U R U2 R' U' R U' R2 U L U' R U L'/U R2' F2 R2 U' R' U' R' F2 R2 U R' F2 R","R' F2 R U2 R U2 R' F2 U' R U' R'/R' U' R U' R' U2 R U' L' U R U' L U R'","R' F R U R' U' R' F' R2 U' R' U R U' R' U2 R/U' R U R' U R2 F2 R' U2 R' U2 R2 F2 R2","R U2 R' U' R U R' U2 L' U R U' M' x'","L R' U2' R2 U R2' U R U L' U' R U2 R'/x' M' U2 R2 U R2 U R U L' U' R U2 R'","U' L R' U' R U L' U2 R' U R U' R' U2 R/U' R' U' R U' R' U R U' R2' D' R U R' D R U R/U' x' M' U' R U L' U2 R' U R U' R' U2 R/U F' R U2 R' U2 R' F R U2 R U' R' U R U2 R'","R U R' U' R' F R2 U R' U' R U R' U' F'/R U R' U' l' U R2 x' U R' U' R U R' U' F'","U2 R U2 R' U2' R' F R2 U' R' U2 R U2' R' U' F'/U2 R U2 R' U' R U2 R' U2 L R U' R' U L'/U2 R U2 R' U2 l' U R' z' R' U' R U' r'/U' F' r U2 R' U R U r' F r' F2 r","U' R U R' U R2 F2 U R U R2 U' R' U' F2 R2/U2 R' U' R U' R' U' R U' x' U L' U L U2 R U' R' U","r' F' r U r U2' r' F2 U' R U R' U' R U' R'/U' R' F U R' F' R2 U F U2 R2 U R' U' R2 F'/R U R' U' R' U2 R U2 R' D' R U' R' U D R2 U2 R'/R' F R U R2 U' F' U R U' R U B U B'","l U2 l' U2 R' U2' R B2 U R' U R/U2 R U2 R' U2 R' F2 R F2 U L' U L/R B2 R' U2 R' U2 R B2 U R' U R","U' R' U2 R U R' U R2 U' L' U R' U' L/U' R' U2 R U R' U R2 U' r' F R' F' r/U2 R2' D' R U' R' D R U' R U R' U' R U R' U R/U' R2 B2 R2' U R U R B2 R2' U' R B2 R'","U' R' F2 R U' R2 F2 R U R U R2 F2 R2/U R U R' U R U' R' U R U' R D R' U' R D' R2/U' L U' R' U L' U' R2 U R' U R U2 R'","U' R U R' U F2 R U2 R' U2 R' F2 R","R U D' R U R' D R2 U' R' U' R2 U2 R/U2 R' U2 R U' R D R' U' R D' R2 U R U' R' U R","U' R U R' F' R U R' U R U2 R' F U R U2 R'/U R' U2 L U' R U M x U R2 U R2 U2 R'","U2 F R2 U' R U2 R U R' U R' U R2 F'/R' U' L' U2 R2 U R' U R U2 R2 U2 L U R/B' R2 U R' U R' U R U2 R U' R2' B","U R U R' U' R U R2 D' R U' R' D R U' R U2 R'/R' U R U2 L U' R' U M x U2 R' U' R","F U R' U' R2 U' R2 U2 R U2 R U R' F'","U' R U R' U L' U R U' L U' R' U R U2 R'/U R' U' R' D' R U R' D R U2 R' D' R U2 R' D R2/R' U2 l R U' R' U R U' R' U R U' R' U l' U2 R/R' U' L' U2 R2 U R' U R U2 R2 U2 L U R","R' L U L' U L U R U L' U R' U R/R2 D R' U' R D' R' U' R' U R U' R' U' R U' R'/U2 R U R' U R U R' U' R U R D R' U R D' R2","L U L' U R' U L U R U R' U M x/R2 D' R U R' D R U R U' R' U R U R' U R","U2 R U2 R' U R' D' R U R' D R2 U' R' U R U' R'/R' U' D R' U' R D' R2 U R U R2 U2 R'","F R2 U' R U' R U' R' U2 R' U R2 F'/U2 B' R2 U R' U2 R' U' R U' R U' R2' B","U' R' U' R U R' U' R2 D R' U R D' R' U R' U2 R/R U' R' U2 L' U R U' M' x' U2 R U R'/U' r U R' U R' F R F' R U' R' U R U2 r'","U R U2 R' U' F' R U2 R' U' R U' R' F R U' R'/U R U2 R2 U' R2 U' M' x' U' R' U L' U2 R","R U2 R2 U' R2 U' R2 U2 R","U R U R' U R U2' R2' U2' R U R' U R/U' R' U2 R U R' U R2 U R' U R U2 R'/R U2 R' U' R U' R' U2 R' U' R U' R' U2' R","U' R U2 R' U2 R U' R' U2 R U' R' U2 R U R'/z U' R' U R U2' R' U R' U' R2 U2' R U' R' U/U2 R U R' U' R2 U R' U R' U' R U R U2 R2","U R' U2 R U2 R' U R U2 R' U R U2 R' U' R/S R2 S' R' U2 R2 U' R2 U R2 U2' R'/U2 R U R' U' R2 U R' U R U2' R2' U' R U R'/L U L' U' L2 U L' U L U2 L2 U' L U L'","U2 R U' R' U2 R U R' U2' R U R' U2' R U2 R'/L' U L U' L2 U2 L U L' U L2 U' L' U L","U2 R' U R U2' R' U' R U2' R' U' R U2' R' U2 R/z U' R U R2 U' R' U R2 U' R' U R2 U' R2 U/L U' L' U L2 U2 L' U' L U' L2 U L U' L'/U2 R U' R' U R2 U2' R' U' R U' R2' U R U' R'","U' R' U' R U' R' U2 R2 U2 R' U' R U' R'/U R U2 R' U' R U' R2' U' R U' R' U2' R/R' U2 R U R' U R U2' R U R' U R U2' R'","R' U2 R2 U R2 U R2 U2 R'/U2 L' U2 L2 U L2' U L2 U2 L'","R U R' U R U2' R' U' R U R' U R U2' R'/R' U' R U R U2 R' U' R U' R2 U2 R/R' U2 R2 U R' U R U2 R' U' R' U R","R U R' U' R' U2 R U R' U R2 U2 R'/R' U' R U' R' U2 R U R' U' R U' R' U2 R/U2 F U R U' R' F' f U R U' R' f'/U2 F U R U' R' S U R U' R' f'","U R U R' U R U2 R' U R U R' U R U2 R'/R' U2 R U R' U R U R' U2' R U R' U R/z U2 R' U R' U' R U2 R' U' R U' R U R' U/R U2 R' U' R U' R' U' R U2 R' U' R U' R'","R U R2 U' R2 U' R2 U2 R2 U' R' U R U2 R'/U' R' U2 R U R' U' R2 U2' R2' U' R2 U' R2' U R/F R U R' U' R U R' U' F' R U R' U' M' U R U' r'/R U R' U' R' U' R U R U R' U' R' U R U' R U' R'"],
    "S": ["L' U2 L U2 R U' L' U M' x'","U R U2 R D R' U' R D' R2 U R U2 R'/R U R' U R U L U2 R' U R U2 R' L'","U L' U R U' L U' R2 U' R2 U' R2 U2 R/U' R' U' R U R2' F' R U R U' R' F U R/R' U R U2 R' U R2 D R' U R D' R'","U L' R U2 R2 U' R2 U' R2 U' L U' R","L' R U R' U' L U R U2 L' U R' U' L","U' R' U' R U' R B' U R2 U R2 U' B U' R'","U R' U' F R U R' U' R' F U' R F2 R' U F2 R2/R' U L' U2 R U' R' U2 R U2 L U L' U L","U2 F R U R2 U' R2 U' R2 U2 R U R U R' F'","U' R' U2 R' D R' U R D' R' U' R' U R' U R","U2 R U R' U R2 D R' U2 R D' R2","F R' U' R2 U' R2 U2 R2 U' R' F'/R U R2' F' R U2 R U2' R' F R U' R'","R U R' U' L U' R U L' U' R' U' R U2 R'","R U' R F2 R' U2 R' U R U2 R' U R2 F2 R2","U L' U2 L U' R U' L2 U R' U' L2 U' L' U L","U R' U' F2 U' R2 U R2 U F2 R2 U2 R'","U2 R U2 R' U L' U2 R U R' U2 L U R U' R'","U R U2 L' R' U2 R U R' U2 L R U2 R'","R2' F2 r U R2 U' r' F R2 F R2'/U' F R' U2 R F' R' F U2 F' R/U2 R' U R' D U R D' R' U2 R D R' U D' R U' R/U2 R2' U' R U R' D' R U2 R' D R U R' U R2","U2 R U R' U' R' U' F2 U R F2 R' F2 R F2 U' F2","U L' U' L U' R U2 L' U' R' U2 L U' R U' R'","U R' B2 R U R U R' U2 R U R2 B2 R","U R D' R2 U' F2 U' F2 R U2 R2 D R2","U' R U R' U R U' R D R' U' R D' R2","U2 R2 D' R U' R' D R U' R U R' U R","R U R' U' F' L' U2 L U x U2 R' U' l","U' R' U2 F' R U R' U' R' F R U2 R","R' U2 R L U2 R' U L' U' L U' R U2 L'","L U2 L F L' U' L' U L F' U2 L'","R U' L' U R' U' L/U' M' U R U' r' F R' F' R/U2 R U R' F' R U R' U' R' F R U R U2 R'/U' r' R U R U' L' U R' U' R' r2","U' R' U2 R2 U R D' R U R' D R2 U' R U' R'","L' U' L U' L' U' R U' L U' R' U' R U' R'","U' R2 U R U' R2 U' R U R' D R' U R D'/U2 R U R' F' R U R' U R U' R' U' R' F R2 U' R'","R' L' U2 R L2 U' R' U L2 U2 R U' L/R2 S2 R' U' R S2 R' L' U R' U' L/U' R' F U' R' F R F' U2 R U2 R' U' F' U2 R/U' R' U' F R U' R' U' R U2 R' U' F' U2 R","R U' L' U R' L' U' L' U' L' U L U L2","R2' U R U R' U' R' U' R' L' U R' U' L","U' R' U' D R' U R U2 D' R2 U R' U' R'","L' R U R' U' L U2 R U2 R'","U' L' U L U2 R U' L' U R2 U L U' R","U R' U2 R U R2 D' R U' R' D R U2 R","R U R' F' R U R' U' R' F R2 U' R' U' R U R' U R U2' R'/U R U' r' F U2 F U2 F' U2 M'/R U2 R' U' R U2 L' U R' U' L R U R' U R U2' R/U R U R' F' R U R' U' R' F R2 U' R' L U' R' U L' U' R","U R U' L' U R' U2 L U R U' L' U M' x'","U F R' U' R2 U' R2 U2 F R F' R U' R' F'","U2 L U2 L' U R' U2 L U' L' R U R' U R","U' R' U' L U' R2 U L' R U' R2 U2 R' U' R2","U L U2 L' U2 R' U L U' L' R2 U2 R' U' R U' R'","U R U' L U' R2 D' F2 D R2 U2 L' R'","U z F' U' R' U2 R2 U2 R' U2 R' U' F z'","U2 R2 D' R U2 R' D R2 U R' U R","U2 R' U' L U' R' U L' U R' U R' U' R U2 R2","U' F' L' U' L U L' U' L F' L F L' U F","U L' R' U2 L U R U2 L U' R' U L2 U' L U' R","U' R2 U2 R U' R' U R' U L' U R' U' L U' l' x'","U' R U' L' U R' U' R U' L U R' U' L' U L","F R U R' U R U2 R U2 R2 U' R2 U' R2 F'/L' U2 L U R U2 L' U' L U' R' U R U2 R'","U R' U2 R U R' U' R L U' R' U L' U2 R/U' R U2 R' U' R U R' U' F' R U2 R' U' R U' R' F R U' R'/L' U2 L U L' U' L U R U2 L' U' L U2 R'","U' R U2 L' U R' U' R L U' R' U R U2 R'","U2 R U R' U L' U R U' L U2 R'","U' R U' L U' L2 U R' U' R L2 U L' U R'/F U' R' U R U F' R U R2 U R2 U2 R'","R' U2 L U' R U L' U R' U R","F R U' R2 U2 R U R' U R2 U R' F'/U2 R U R' F' R U R' U R U2 R' F R U' R'","U2 R U' R' U' R U2 R' U2 R U R' U2 R U R'/R U R' U' R' U2 R U R' U R U' R U' R'/U' R2 U' R2 U' R' U2 R U' R' U' R' U R2/R U R' U R U' R' U R' U' R' U R U' R' U' R2 U R","U' R2 U' R2 U' R U2 R U' R' U' R U R2/R U R' U R U' R' U R' U' R2 U' R' U R' U R","R U R2 U' R2 U' R2 U2 R2 U2 R'","U' R' U2 R U R' U R","U' R2 U R' U' R' U' R U2 R' U' R2 U' R2","U' R2 U R U' R' U' R U2 R U' R2 U' R2","R U R' U R U2 R'","R' U2 R2 U2 R2 U' R2 U' R2 U R/U' R' U2 R2 U R U' R' U R U R2 U' R'","R U R' U R2 U R U R2 U' R' U' R2/U' R U R' U' R' U2 R U R U' R' U R' U R","U' R' U2 R2 U R U R U' R' U' R2 U R/U' R' U' R U R U R' U' R' U R U R U' R'","U2 R' U' R U' R U R2 U R2 U2 R'/U' R' U2' R2 U R2 U R U' R U' R'/L' U' L U' L U L2' U L2 U2 L'","R U R' U R' D' R L F2 L' U2 R2 D R2/U' R U2 R' U' R U' R' U' R U2 R2 U' R2 U' R2 U2 R/U' R' U R2 U R' U R U2 R U2 R U R' U R2"],
    "AS": ["U' R U R' U' L' U2 R U' R' U2 L U' R U2 R'/R U2 R' U R U R' U2 y' R' U' R U R' U R U R' U' R/U' R U R' B' U R U' R' U' B U2 R U2 R'","R U2' R2' F2 U' R2 U' R2' U F2 U R","R' U' R U R2 U L U' R2 U L' U R' U2 R","F2 R2 u' L F2 L' u R2 F U2 F/U2 R' U2 R' U2 F' R U R U' R' F R' U2 R U2 R/U' R U2 R U2' R' U' R' U R F' R U2' R' U2 R' F/U2 r U' r' U2 R' F R U2 F2 U' R U' R' F'","U2 R' F U2 F' R F R' U2 R F'/U' R U R2 D R2 D' R2 U' R2 D R2 D' R/U' R U2' R2 U' R' F' R U R2 U' R' F R U' R'/U R' U R' D U' R D' R' U2 R D R' U' D' R U' R","R' U L U' R2 z' R2 U' L U R2 U' D' z","U R' F R' F' R' U2 R' U2 R2 U2 R U2 F R2 F'","U R U R' U L' U2 R U L U2 R' U L' U L","U R U R' U2 L' U2 R U2 L U L' R' U2 L","U R' U L U' R U' R' L' U L U' R U2 L'","U2 R2 D R' U R D' R' U R' U' R U' R'/U2 L' U R U' L2 U2 R' U R U2 L' R'","U R' U' R U' R' U R' D' R U R' D R2","U' L U' R' U L' U R2 U R2 U R2 U2 R'","U R U2 R' U' F' R U R' U' R' F R2 U' R'/U R L' U2 L2 U L2 U L2 U R' U L'","U2 R U2' R' U2 L' U R U' M' x'","R' U' R U' R' U' L' U2 R U' R' U2 R L","U R U R' U R' F U' R2 U' R2 U F' U R","R' L U' R U L' U' R' U2 L U' R U L'","R U' L U2 R' U R U2 R' U2 L' U' L U' L'","U2 R' U' R U' R2 D' r U2 r' D R2","U2 R' U' R U' R2 D' R U2 R' D R2","U L U L' U L U2 L2 R U R' U' L U2 R U2 R'/U R U2 R' U' F' r U R' U' r' F R2 U' R'","U R' U' R U' R' U y' R' U2 R U' R' U' R B/U R' U' R U' R' U R U' R' U R' F' R U R U' R' F R/F R U R2' U' R U' R U R2' U R2 U' R' U F'","U L U2 L' U2 R' U L2 U' R U L' U' L'","U' R U2 R' U' R U R D R' U2 R D' R2","U2 R' U2 R' F' R U R U' R' F U2 R","U2 L' U' L U F R U2 R' U' x U2 L U r'","U R U2 R D R2 U' R U' R' U2 R2 D' R2","U' L U2 L2 U' L' D L' U' L D' L2 U L' U L","R' U L U' R U L'/U2 L' U R U' L U R'","U2 R U R' U R U L' U R' U L U L' U L","U R2 U' R' U R2 U R' U' R D' R U' R' D","U2 L' U R U' L R U R U R U' R' U' R2","U R U2 R' U' R U2 R F2 R' U R' U' R2 F2 R2","U' L U D' L U' L' U2 D L2 U' L U L","U2 R' U' R F2 R' U R2 U2 R' U R U R' F2","L R U2 R' U' R U2 L' U' R' U' R U' R'","U' R' U L' U R2 U R2 U R2 U2 R' L/U L' U R' U L2 U L2 U L2 U2 L' R","x' M' U' R U L' U2 R' U2 R","U' R U' R' U2 L' U R U' L2 U' R' U L'/R' U' F' R U R' U' R' F R2 U' R' U R/U' R D R' U' R D' R2 U' R U2 R' U' R","U R U R' U R' U' R' D R' U' R D' R U2 R","U L' U R U' L U2 R' U' L' U R U' L R'","U2 R2 D r' U2 r D' R2 U' R U' R'","R' U' R U' R' U2 L' U2 L U L' U2 R U' L","R U2 R' U R U L U' R' U L' U R U' R'","U' R' U' R U R U' R' U2 R L U' R2 U L' U2 R","U2 R2 D R' U2 R D' R2 U' R U' R'","U F R U R2 U2 R2 U R2 U R F'/R U R' F' R U2 R' U2 R' F R2 U' R'","R U2 L' U R' U' L U' R U' R'/R U' R' U2 R U' R' U2 R' D' R U R' D R","U' R U2 R2 U' R2 U' R' F U' R' U' R U F'/U L U' R U' L' R2 U L U' R2 U R' U L'/U' R U' L U' R' L2 U R U' L2 U L' U R'","U2 F R U' R2 U' R U' R' U2 R2 U R' F'/R U R' F' R U2 R' U' R U' R' F R U' R'","L' U' L U' R U' L' U R' U2 L/U2 R' U' R U' L U' R' U L' U2 R/U' R D R' U R D' R' U2 R' U' R U2 R' U' R","U2 R' U' R2 U' L U2 R' U R U2 R2 L' U2 R","R U2 R' U' R U L' U L U2 R' U' L' U2 L","U R' U2 L U' R U L' R' U R U' R' U2 R","U' R U2 R' U' R U R' L' U R U' L U2 R'","U R U R' U L' U2 R U2 L U2 L' R' U2 L","U' F R U R' U' R U R' F R' F' R U' F'","U2 R U L' U R U' L U' R U' R U R' U2 R2","U L R U2 R' U' L' U2 R' U L U' R2 U R' U L'","U' R2 U' R U' R2 U R2 U' R' U R2 U R2/U2 R U' R' U R U2 R U2' R' U' R U' R2' U' R U R'/R' U' R U' R' U R U' R U R2 U R U' R U' R'/U R U R2' F' R U R U R' U2 R' F R2 U' R'","U R2 U R2 U R U2 R' U R U R U' R2/U2 R U R' U R' U' R' U R U' R' U' R' U' R' U2 R","U' R2 F2 R' U2 R' U' R U' R F2 R2/R' U' R U' R' U' R' U' R' U' R' U R U R2","U R2 U' R' U R U R' U2 R' U R2 U R2/U R U R' U' R U R2 U' R2 U' R' U R U' R' U R' U R","R' U' R2 U R2 U R2 U2 R2 U2 R","U R U2 R' U' R U' R'","R U2 R2 U2 R2 U R2 U R2 U' R'","R' U' R U' R' U2 R","U R U2 R2 U' R' U' R' U R U R2 U' R'/U R U R' U' R' U' R U R U' R' U' R' U R","R' U' R U' R2 U' R' U' R2 U R U R2/U R' U' R U R U2 R' U' R' U R U' R U' R'","U2 R U R' U R' U' R2 U' R2 U2 R","U R U' R2 U' R U' R' U2 R' U2 R' U' R U' R2/U R U2 R' U' R U' R' U' R' U R' U' R' U' R' U R U R2"],
    "H": ["x' M' U' R U' R' U R U2 L' U R' U2 R/U2 R U R' U' R' F R U R U' R' F' R U R' U R U2 R'/L R' U' R U' R' U R U2 L' U R' U2 R/R' F R U R' U' R' F' R U R2 U2 R' U' R U' R'","R' L U L' U L U' L' U2 R U' L U2 L'/U2 L' R U R' U R U' R' U2 L U' R U2 R'/U' R U R' U R U2 R' U' R2 D R' U R D' R' U' R'/U2 F' U' L' U L F R U R' U' R' F R F'","U L' U2 L2 F' U L2 U L2 U' F U' L'/U R U R D R' U R' U' R U R2 D' R U' R U' R'/R U2 R' U' R U' R D' R U' R' D R U R/R U2 R' U' R U' l' U R D R' U' R D' R' x'","U' R U2' R2' F U' R2 U' R2' U F' U R/U R' D R2 U' R2' D' R U' R' D R2 U2' R2' D' R/U2 R' U2 R U R' U R' D R' U R D' R' U' R'/U R' U' R' D' R U' R U R' U' R2 D R' U R' U R","U' R B' R' B U2 R2 F' r U' r' F2 R2/U' l U' R' U x U2' R2' F' r U' r' F2 R2/U R U2 R' U L' U2 R U2' R' U2 L R U' R'/U L' U L2 F2 L' U2 L' U2 L F2 U L' U2 L","U' R U' R2' F2 R U2 R U2' R' F2 U' R U2 R'/U' R' F R F' U2 x' R2 U L' U L U2 R2 x/U R' U2 R U' L U2 R' U2 R U2 L' R' U R/L' U R2 D R' U2 R D' R' U L U R'","U' F R U R' U' R' F' U2 R U R' U R2 U2 R'/U2 R' U' R U' R' U R U R' F R U R' U' R' F' R2","U2 F R U' R' U R U2 R' U' R U R' U' F'","R' F R U R' U' F' R U' R' U R' F R F' U R/U2 R U2 R2 U' R2 U' R' U' L' U R' U' L U' R/R F R2 U' R2' U' R2 U2' R2' U' F' R'/R U L U' R2 U' R2' U' R2 U2' R2 L' U' R'","U' R' U2 R U2' R2 F' R U R U' R' F U R/U L' U2 M' x' D R2 U R2 u' R2 B/U' R' U2 L R U2' R' U R U2' L' U R' U R","F B' R2 B R2 U' R2 U' R2 U R2 F'/U' L' U2 L R U2 L' U' R' U2 L U' R U' R'/U' z U' R2 U D R2 U' R' D' R2 U R' D R' D'/U F' R U2 R' U2 R' F R U R U R' U' R U' R'","F U' R U2 R' U2 R U' R' U' R U R' U F'/R' U2 R2 U R2 U R U L U' R U L' U R'/L' F' L2' U L2 U L2' U2 L2 U F L/R2 U R' U R' U' R2 U' R2 U' F' R U R' U' R' F R","U2 R2 D R' U R D' R2' U R2 D R' U2 R D' R2'/U' L U' R U L' U2 R' U R U R' U' R U R'/U' R' U2 R U R' U' F' R U R' U' R' F R U2 R/L U2 R' U L' U L U L' U' L U' R U2 L'","U R' U2 R2 U R D' R U R' D R' U2 R'/U2 R2 D R' U2 R D' R U' R2' U' R2 U2 R/U' z U' R2 U2 R U L' U R U' L U' R2 U'/U' L' U2 L2 U L D' L U L' D L' U2 L'","U2 R2 D' R U' R' D R2 U' R2 D' R U2 R' D R2/U L' U R' U' L U2 R U' R' U' R U R' U' R/R' U2 R U R' U R2 y R U' R' U' R U2 R' U' F'/U' R' U L' U' R U2 L U' L' U' L U L' U' L","U' R U2 R2 U' R' D R' U' R D' R U2 R/U2 R2 D' R U2 R' D R' U R2 U R2 U2 R'/U R' U2 R U R2' D' R U' R' D R2 U R' U R","U2 R U R' U R' U' R2 U' R2 U' L U' R U L'/L U L' U L' U' L2 U' L2 U' R U' L U R'/R' U2 R' D' R2 D2 R' U R D2 R' U R' D R2","U2 R' U' R U' R U R2 U R2 U L' U R' U' L/R' U' R2 U R' U' R2 U' R2 L' U R' U' M'/U2 R U2 R D R2' D2 R U' R' D2 R U' R D' R2'/L' U' L U' L U L2' U L2 U R' U L' U' R","D R' U' R D' R U' R' U2 R U2 R U R U' R2/U R U R' U' R' U2 R U R2 D' R U R' D R' U2 R'/U R U R' U' R' U2 R2 D R' U R D' R2 U R2 U2 R'/U R U R' U' L' U2 R U2 R' U L U' r' F2 r","U R U R' U R U2 R' F R U' R' U' R U2 R' U' F'/U2 R2' D' r U2 r' D R' U R2 U R2 U2 R'/U R U' L U L2' R' U2 L U L' U L U L U' L'/U' L U' R U R2' L' U2 R U R' U R U R U' R'","R' U' R U' R' U' L U' R U L'/U2 L' U' L U' L' U' R U' L U R'/R' F' R U2 R U2' R' F U' R U' R'","R U R' U R U L' U R' U' L/R U R' U R U r' F R' F' r/U R' F R U R' U' R' F' R U' R U R' U R","U R' F R' F' R2 U' r' U r U' r' U' r/U l' U R' U' x' R2 U' r' U r U' r' U' r/U R U' L' U R2' U' R L U2 R' U' R/U R U R' U R U2 R D' R U' R' D R U R","U' l U' R U R' l' U r U' r' U r U r'/U' R' U L U' R2 U R' L' U2 R U R'/U' R' U' R U' R' U2 R' D R' U R D' R' U' R'/U' R U R2 F R F' r U' r' U r U r'","F U' R2 U R U2 R' U R2 U2 R' U' R F'/U' R' U' R y U' R U' R' U R l U' R' U l'","U' R U R' U R U2 R' L' U2 R U' R' U2 L R U' R'/U R U' R2 U' F2 U' R2 U R2 U F2 R2 U R'/z U L' U R2 U' R U R' U' R U2 R U R' U2 L U'/z U R2 U' R' U R' F R y' R' U R' U' R2 B' R' U'","U F R U R' U' R U R' U' R U R' U' F'/U F U R U' R' U R U' R' U R U' R' F'","x' U' R U' R' U R' F2 R U' R U R' U x/R U' L' U R' U' L R U' L' U R' U' L/U R' F R' F' R F' U2 F R' F R F' R/x U R' U R U' l U2 l' U R' U' R U' x'","R U R' U R U2 R2 U2 L U' R U L' U R' U R/U F' R' F2 R U2 F' U2 F U2 F L F' L' F2/R' U2 R U R' U R U' R U2 R' L' U R U' L U2 R'/x' R' U' R2 U x U2' R' U2 R U2' l D R' D' R2","R' U' R U' R' U2 R2 U2 L' U R' U' L U' R U' R'/R U' R' U R U R' U' L U L' U' R U R' U2 L U L'/x U R' U' l R U' R U2' R U2' R' U2 x U R2 U' R'/R U2 R' U' R2 F2 U2 R' U' R U' F2 R' U' R'","U' R' U' R U' R' U2 R U R' U' R L U2 R' U' R U2 L'/U R U' R2 F2 U' R2 U' R2 U F2 U R2 U R'/U' R' U' R U' R' U2 R L U2 R' U R U2 L' R' U R/U' R' U' R U' R' U2 R U R' U' R U R' F' R U R' U' R' F R2","U' R U R' U y' R' U R U' R2 F R F' R/F R' U R U2' R2' U' R U2' R' U' R2' U F'/U' R U R' U y L' U L U' r' L' U L U' r","R U R' U R U' R' U R U2 R'","R' U' R U' R' U R U' R' U2 R","U' R' U2 R U R' U' R U R' U R","U' R U2 R' U' R U R' U' R U' R'","U' R' U2 R U R' U R U R U R' U R U2 R'/U' R U2 R2 U2 R' U2 R U2 R' U2 R2 U2 R","U R U2 R' U' R U' R' U' R' U' R U' R' U2 R/R L F2' L' R U2' R2' F U2' y' R' U2 R' U2' R' U2 R/r R U2' r' R U2' R' l' U2 y U' R2 U' R2' U' R2 U' R2' U/r R U2' r' R U2' R' l' U2 d' R2 U' R2' U' R2 U' R2' U","U2 R' U' R U' R' U2 R U R U2 R' U' R U' R'/R U R' U R U2 R' U' R' U2 R U R' U R/R' U' R' r2 U' R' U R' r2 U' r' U2 r","R' F R U R' F R U' R' F' R U' R' F R U R' F R U' R' F' R/R U R' U R U' R' U R U' R' U R' U' R2 U' R' U R' U R/R U' R' U' R U R' U R U R' U' R U' R' U' R U R' U R U R'/R U R' U R U' R' U R2 U R U R U' R' U' R' U R'"],
};
/* --- End Alg-Trainer alg lists (subset, MIT) --- */


// --- Practice state ---
const PRACTICE_EVENTS = {  'p_oll': { label: 'OLL', cubeEvent: '333' },
  'p_pll': { label: 'PLL', cubeEvent: '333' },
  'p_zbls': { label: 'ZBLS', cubeEvent: '333' },
  'p_zbll': { label: 'ZBLL', cubeEvent: '333' },
};
// Register practice events in configs (so the app doesn't early-return)
Object.assign(configs, {  'p_oll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_pll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_zbls': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_zbll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
});

let currentPracticeCase = 'any';

// --- ZBLS Hand (R/L) ---
const PRACTICE_ZBLS_HAND_KEY = 'practiceZblsHand';
let practiceZblsHand = (() => {
  try {
    const v = String(localStorage.getItem(PRACTICE_ZBLS_HAND_KEY) || 'R').toUpperCase();
    return (v === 'L') ? 'L' : 'R';
  } catch (_) {
    return 'R';
  }
})();
let _zblsHandDraft = practiceZblsHand;

function _saveZblsHand(value) {
  practiceZblsHand = (value === 'L') ? 'L' : 'R';
  try { localStorage.setItem(PRACTICE_ZBLS_HAND_KEY, practiceZblsHand); } catch (_) {}
}

function _updateZblsHandUI() {
  const row = document.getElementById('zblsHandRow');
  if (!row) return;
  const r = document.getElementById('zblsHandR');
  const l = document.getElementById('zblsHandL');
  if (r) r.classList.toggle('active', _zblsHandDraft !== 'L');
  if (l) l.classList.toggle('active', _zblsHandDraft === 'L');
}

window.setZblsHandDraft = (value) => {
  _zblsHandDraft = (String(value || '').toUpperCase() === 'L') ? 'L' : 'R';
  _updateZblsHandUI();
};

// --- Practice case pool (per-event, stored separately to prevent overlap) ---
const PRACTICE_CASE_POOL_PREFIX = 'practiceCasePool:';
const practiceCasePoolState = {
  'p_zbls': { mode: 'any', selected: [] },
  'p_zbll': { mode: 'any', selected: [] },
};

function _poolKey(eventId) {
  return PRACTICE_CASE_POOL_PREFIX + String(eventId || '').trim();
}

function _loadCasePoolState(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  try {
    const raw = localStorage.getItem(_poolKey(id));
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const mode = (parsed && (parsed.mode === 'pool')) ? 'pool' : 'any';
    const selected = Array.isArray(parsed?.selected) ? parsed.selected.map(String) : [];
    practiceCasePoolState[id].mode = mode;
    practiceCasePoolState[id].selected = selected;
  } catch (_) {
    // ignore corrupt storage
  }
}

function _saveCasePoolState(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  try {
    const st = practiceCasePoolState[id];
    localStorage.setItem(_poolKey(id), JSON.stringify({
      mode: (st.mode === 'pool') ? 'pool' : 'any',
      selected: Array.isArray(st.selected) ? st.selected.map(String) : [],
    }));
  } catch (_) {}
}

function _getAllowedCaseKeys(eventId) {
  const options = getPracticeCaseOptions(eventId) || [];
  return options.filter(k => k !== 'any').map(String);
}

function _sanitizeCasePoolSelection(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  const allowed = new Set(_getAllowedCaseKeys(id));
  const uniq = [];
  const seen = new Set();
  for (const k of (practiceCasePoolState[id].selected || [])) {
    const kk = String(k);
    if (!allowed.has(kk)) continue;
    if (seen.has(kk)) continue;
    seen.add(kk);
    uniq.push(kk);
  }
  practiceCasePoolState[id].selected = uniq;
  // If pool mode but nothing selected, fall back to any to avoid silent "empty random"
  if (practiceCasePoolState[id].mode === 'pool' && uniq.length === 0) {
    practiceCasePoolState[id].mode = 'any';
  }
}

function _ensureCasePoolLoaded(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  // Load once lazily
  if (practiceCasePoolState[id]._loaded) return;
  practiceCasePoolState[id]._loaded = true;
  _loadCasePoolState(id);
  _sanitizeCasePoolSelection(id);
}

function _getPracticeCaseKeyForScramble(eventId, keysAll) {
  const id = String(eventId || '').trim();
  const keys = (keysAll || []).map(String);
  _ensureCasePoolLoaded(id);

  // For ZBLS/ZBLL: only two modes are supported here:
  // - any  : random from all cases
  // - pool : random from selected cases
  // Legacy single-case selection (currentPracticeCase) is intentionally ignored
  // to prevent "random -> stuck on one case" behavior.
  if (id === 'p_zbls' || id === 'p_zbll') {
    if (practiceCasePoolState[id]?.mode === 'pool') {
      const pool = (practiceCasePoolState[id].selected || [])
        .map(String)
        .filter(k => keys.includes(k));
      if (pool.length) return pool[_randInt(pool.length)];
      // If pool is empty, fall back to all-random (sanitizer should avoid this anyway)
    }
    return keys[_randInt(keys.length)];
  }

  // 1) Pool mode (multi-select) has priority: random from selected cases.
  if (practiceCasePoolState[id]?.mode === 'pool') {
    const pool = (practiceCasePoolState[id].selected || []).map(String).filter(k => keys.includes(k));
    if (pool.length) return pool[_randInt(pool.length)];
  }

  // 2) Legacy single-case selection.
  if (currentPracticeCase && currentPracticeCase !== 'any') {
    return String(currentPracticeCase);
  }

  // 3) Otherwise random from all.
  return keys[_randInt(keys.length)];
}

function updateCasePoolSummary(eventId) {
  const btn = document.getElementById('casePoolOpenBtn');
  const sum = document.getElementById('casePoolSummary');
  if (!btn || !sum) return;

  const id = String(eventId || '').trim();
  if (id !== 'p_zbls' && id !== 'p_zbll') {
    btn.textContent = (currentLang === 'ko') ? '랜덤' : 'Random';
    sum.textContent = '';
    return;
  }

  _ensureCasePoolLoaded(id);
  const st = practiceCasePoolState[id];
  const count = (st.selected || []).length;

  // Button label
  btn.textContent = (currentLang === 'ko') ? '선택…' : 'Select…';

  // Summary
  if (st.mode === 'pool') {
    sum.textContent = (currentLang === 'ko') ? `선택 ${count}개` : `${count} selected`;
  } else {
    sum.textContent = (currentLang === 'ko') ? '전체 랜덤' : 'All random';
  }
}

export function initApp() {
  // init theme once per load
  lightTheme = loadLightTheme();
  applyLightTheme();

  loadData();
  applyLanguageToUI();
  changeEvent(currentEvent);
  // Check for updates on load
  checkUpdateLog();
}

// --- public action exports (used by bindings.js) ---
export const actions = {
  applyCasePoolSelection,
  changeEvent,
  clearCasePoolSelection,
  closeAvgShare,
  closeBTModal,
  closeCasePoolModal,
  closeKnownIssues,
  closeMbfResultModal,
  closeMbfScrambleModal,
  closeModal,
  closeSessionModal,
  closeSettings,
  closeStatsModal,
  closeThemeSettings,
  closeUpdateLog,
  connectGanTimer,
  copyMbfText,
  copyShareText,
  createNewSession,
  disconnectBT,
  exportData,
  generateMbfScrambles,
  handleOutsideCasePoolClick,
  handleOutsideSettingsClick,
  openAvgShare,
  openBTModal,
  openCasePoolModal,
  openKnownIssues,
  openSessionModal,
  openSettings,
  openSingleShare,
  openThemePicker,
  openThemeSettings,
  openUpdateLog,
  resetAllThemeLight,
  retryScramble,
  saveMbfResult,
  selectTool,
  setCasePoolMode,
  setZblsHandDraft,
  showExtendedStats,
  switchCategory,
  switchMobileTab,
  themePickerApply,
  themePickerCancel,
  themePickerDefault,
  toggleToolsMenu,
  triggerImport,
  useThisScramble,
};
