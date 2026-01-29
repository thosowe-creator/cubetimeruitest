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


// [FIX] Some deployed HTML variants contain an empty #caseSelectWrap without required children.
// This helper ensures the required DOM exists so case tabs can render.
function ensureCaseSelectorDOM() {
  const wrap = document.getElementById('caseSelectWrap');
  if (!wrap) return;

  // --- [FIX] Ensure the case selector is placed inside a visible container ---
  // In this UI, #caseSelectWrap was originally located under #group-practice,
  // which is hidden by default (legacy tab UI). When the user selects ZBLS/ZBLL
  // via the main dropdown, the parent stays hidden, so the case selector never
  // appears even though we remove 'hidden' from the wrap itself.
  //
  // Move #caseSelectWrap right under the main event selector section (always visible),
  // unless it is already there.
  try {
    const evSel = document.getElementById('eventSelect');
    if (evSel) {
      // Prefer the immediate container around the select
      const anchor = evSel.closest('div.w-full') || evSel.parentElement;
      if (anchor && wrap.parentElement !== anchor.parentElement) {
        // Insert wrap right after the anchor container
        anchor.insertAdjacentElement('afterend', wrap);
      }
    }
  } catch (_) {}

  // If a full layout is already present, do nothing.
  let tabs = document.getElementById('caseTabs');
  let sel = document.getElementById('caseSelect');

  if (!tabs) {
    tabs = document.createElement('div');
    tabs.id = 'caseTabs';
    // keep styling reasonably consistent even if HTML was missing
    tabs.className = 'flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar py-2';
    wrap.appendChild(tabs);
  }

  if (!sel) {
    sel = document.createElement('select');
    sel.id = 'caseSelect';
    sel.className = 'hidden';
    sel.onchange = () => changePracticeCase(sel.value);
    wrap.appendChild(sel);
  }
}

function isPracticeEvent(eventId) {
  return !!PRACTICE_EVENTS[eventId];
}

window.changePracticeCase = (val) => {
  currentPracticeCase = val || 'any';
  // Sync UI state for tabs/select
  updateCaseTabActive();
  const sel = document.getElementById('caseSelect');
  if (sel) sel.value = currentPracticeCase;
  if (isPracticeEvent(currentEvent)) generateScramble();
};

function getPracticeCaseOptions(eventId) {
  if (eventId === 'p_zbls') {
    // keys: "1".."41"
    const keys = Object.keys(ZBLS || {}).sort((a,b) => (parseInt(a,10)||0) - (parseInt(b,10)||0));
    return ['any', ...keys];
  }
  if (eventId === 'p_zbll') {
    // subsets: T, U, L, ... H (and any other keys present in the dataset)
    const keys = Object.keys(algdbZBLL || {});
    const preferred = ['T','U','L','S','AS','A','E','F','G','H','PI'];
    keys.sort((a,b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      }
      return String(a).localeCompare(String(b));
    });
    return ['any', ...keys];
  }
  return null;
}

function updateCaseTabActive() {
  const tabs = document.getElementById('caseTabs');
  if (!tabs) return;
  tabs.querySelectorAll('button.case-tab').forEach(btn => {
    const key = btn.getAttribute('data-case');
    if ((key || 'any') === (currentPracticeCase || 'any')) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

// --- Case pool modal (Settings-style) ---
let _casePoolModalEventId = null;
let _casePoolDraft = { mode: 'any', selected: new Set() };

window.openCasePoolModal = () => {
  const eventId = String(currentEvent || '').trim();
  if (eventId !== 'p_zbls' && eventId !== 'p_zbll') return;
  _ensureCasePoolLoaded(eventId);
  _casePoolModalEventId = eventId;

  // ZBLS Hand (draft only; commit on Apply)
  const handRow = document.getElementById('zblsHandRow');
  if (handRow) {
    if (eventId === 'p_zbls') {
      handRow.classList.remove('hidden');
      _zblsHandDraft = (practiceZblsHand === 'L') ? 'L' : 'R';
      _updateZblsHandUI();
    } else {
      handRow.classList.add('hidden');
    }
  }

  // Draft from stored state
  const st = practiceCasePoolState[eventId];
  _casePoolDraft = {
    mode: st.mode === 'pool' ? 'pool' : 'any',
    selected: new Set((st.selected || []).map(String)),
  };

  // Title
  const title = document.getElementById('casePoolTitle');
  if (title) {
    const label = PRACTICE_EVENTS?.[eventId]?.label || 'Case';
    title.textContent = (currentLang === 'ko') ? `${label} 케이스 선택` : `${label} Case Selection`;
  }

  // Render list
  _renderCasePoolList();

  // Show modal
  const overlay = document.getElementById('casePoolOverlay');
  const modal = document.getElementById('casePoolModal');
  if (overlay && modal) {
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      modal.classList.remove('scale-95', 'opacity-0');
      modal.classList.add('scale-100', 'opacity-100');
    });
  }

  // Initialize mode UI
  window.setCasePoolMode(_casePoolDraft.mode);
};

window.closeCasePoolModal = () => {
  const overlay = document.getElementById('casePoolOverlay');
  const modal = document.getElementById('casePoolModal');
  if (overlay && modal) {
    modal.classList.add('scale-95', 'opacity-0');
    modal.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 150);
  }
  // Hide hand row when closing (prevents flashing when switching events)
  const handRow = document.getElementById('zblsHandRow');
  if (handRow) handRow.classList.add('hidden');
  _casePoolModalEventId = null;
};

window.handleOutsideCasePoolClick = (event) => {
  if (event?.target?.id === 'casePoolOverlay') window.closeCasePoolModal();
};

function _renderCasePoolList() {
  const eventId = _casePoolModalEventId;
  if (!eventId) return;

  const list = document.getElementById('casePoolList');
  const hint = document.getElementById('casePoolModeHint');
  if (!list) return;

  const keys = _getAllowedCaseKeys(eventId);
  list.innerHTML = '';
  list.className = 'case-pool-list grid grid-cols-5 gap-2 custom-scroll pr-1';

  const selectable = (_casePoolDraft?.mode === 'pool');

  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-pool-item rounded-2xl px-2 py-2 text-xs font-black active:scale-95 transition-all';
    btn.textContent = String(k);

    const key = String(k);
    if (_casePoolDraft.selected.has(key)) btn.classList.add('selected');

    // In "Random (any)" mode, prevent individual selection changes.
    if (!selectable) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.onclick = () => {
        if (_casePoolDraft.selected.has(key)) _casePoolDraft.selected.delete(key);
        else _casePoolDraft.selected.add(key);
        btn.classList.toggle('selected');
        _updateCasePoolCount();
      };
    }

    list.appendChild(btn);
  });

  _updateCasePoolCount();

  if (hint) {
    hint.textContent = (_casePoolDraft.mode === 'pool')
      ? ((currentLang === 'ko') ? '선택한 케이스 안에서 랜덤' : 'Random from selected cases')
      : ((currentLang === 'ko') ? '전체 케이스에서 랜덤' : 'Random from all cases');
  }
}

function _updateCasePoolCount() {
  const cnt = document.getElementById('casePoolCount');
  if (!cnt) return;

  const n = _casePoolDraft.selected ? _casePoolDraft.selected.size : 0;

  // Count is only meaningful in "Selected" (pool) mode.
  if (_casePoolDraft.mode === 'pool') {
    cnt.textContent = (currentLang === 'ko') ? `선택 ${n}개` : `${n} selected`;
  } else {
    cnt.textContent = '';
  }

  const applyBtn = document.getElementById('casePoolApplyBtn');
  if (!applyBtn) return;
  const disabled = (_casePoolDraft.mode === 'pool' && n === 0);
  applyBtn.disabled = disabled;
  applyBtn.classList.toggle('opacity-50', disabled);
  applyBtn.classList.toggle('cursor-not-allowed', disabled);

  // In "Random" mode, prevent editing actions (Clear) because individual selection is disabled.
  const clearBtn = document.getElementById('casePoolClearBtn');
  if (clearBtn) {
    const lock = (_casePoolDraft.mode !== 'pool');
    clearBtn.disabled = lock;
    clearBtn.classList.toggle('opacity-50', lock);
    clearBtn.classList.toggle('cursor-not-allowed', lock);
  }
}

window.setCasePoolMode = (mode) => {
  _casePoolDraft.mode = (mode === 'pool') ? 'pool' : 'any';
  const anyBtn = document.getElementById('casePoolModeAny');
  const poolBtn = document.getElementById('casePoolModePool');
  const hint = document.getElementById('casePoolModeHint');

  if (anyBtn) anyBtn.classList.toggle('active', _casePoolDraft.mode === 'any');
  if (poolBtn) poolBtn.classList.toggle('active', _casePoolDraft.mode === 'pool');

  if (hint) {
    hint.textContent = (_casePoolDraft.mode === 'pool')
      ? ((currentLang === 'ko') ? '선택한 케이스 안에서 랜덤' : 'Random from selected cases')
      : ((currentLang === 'ko') ? '전체 케이스에서 랜덤' : 'Random from all cases');
  }

  // Re-render to reflect disabled/enabled case list behavior.
  _renderCasePoolList();
};

window.clearCasePoolSelection = () => {
  if (_casePoolDraft?.selected) _casePoolDraft.selected.clear();
  _renderCasePoolList();
};

window.applyCasePoolSelection = () => {
  const eventId = _casePoolModalEventId;
  if (!eventId) return;

  const selected = Array.from(_casePoolDraft.selected || []).map(String);
  const mode = (_casePoolDraft.mode === 'pool') ? 'pool' : 'any';

  if (mode === 'pool' && selected.length === 0) return;

  _ensureCasePoolLoaded(eventId);
  practiceCasePoolState[eventId].mode = mode;
  practiceCasePoolState[eventId].selected = selected;
  _sanitizeCasePoolSelection(eventId);
  _saveCasePoolState(eventId);

  // Commit ZBLS hand choice
  if (eventId === 'p_zbls') {
    _saveZblsHand(_zblsHandDraft);
  }

  // Avoid overriding pool mode by legacy single-case selection
  currentPracticeCase = 'any';

  updateCasePoolSummary(eventId);
  window.closeCasePoolModal();
  if (isPracticeEvent(currentEvent)) generateScramble();
};


function renderCaseTabs(options) {
  const tabs = document.getElementById('caseTabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  (options || ['any']).forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-tab';
    btn.setAttribute('data-case', k);
    btn.textContent = (k === 'any') ? ((currentLang === 'ko') ? '랜덤' : 'Random') : String(k);
    btn.onclick = () => window.changePracticeCase(k);
    tabs.appendChild(btn);
  });
  updateCaseTabActive();
}

function setCaseSelectorVisible(visible, options = null) {
  const wrap = document.getElementById('caseSelectWrap');
  const sel = document.getElementById('caseSelect');
  const tabs = document.getElementById('caseTabs');
  if (!wrap) return;
  if (!visible) {
    wrap.classList.add('hidden');
    if (tabs) tabs.innerHTML = '';
    return;
  }
  // Populate tabs
  renderCaseTabs(options || ['any']);
  // Keep selection if possible
  const exists = (options || []).includes(currentPracticeCase);
  currentPracticeCase = exists ? currentPracticeCase : 'any';
  // Sync hidden <select> for fallback/compat
  if (sel) {
    sel.innerHTML = '';
    (options || ['any']).forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = (k === 'any') ? ((currentLang === 'ko') ? '랜덤' : 'Random') : String(k);
      sel.appendChild(opt);
    });
    sel.value = currentPracticeCase;
  }
  updateCaseTabActive();
  updateCasePoolSummary(currentEvent);
  wrap.classList.remove('hidden');
}

function refreshPracticeUI() {
  ensureCaseSelectorDOM();
  // Show case selector whenever the current event has case options (ZBLS/ZBLL),
  // even if PRACTICE_EVENTS or other metadata is out of sync.
  const eventId = String(currentEvent || '').trim();
  const options = getPracticeCaseOptions(eventId);
  setCaseSelectorVisible(!!options, options);
  updateCasePoolSummary(eventId);
}

// --- Route 1 scramble builders (adapted from Alg-Trainer RubiksCube.js) ---
function _cleanAlg(s) {
  // Alg-Trainer datasets sometimes include multiple variants separated by '/'.
  // For display/diagram we must choose a single variant because '/' is not a valid alg character for cubing.js.
  let str = String(s || '');
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length) str = parts[_randInt(parts.length)];
  }
  return str
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Practice alg helpers (string-level, no cube simulation) ---
// We only use these for practice events (F2L/OLL/PLL/ZBLS/ZBLL) so we don't touch normal scramble logic.
function _invertMoveToken(tok) {
  const t = String(tok || '').trim();
  if (!t) return '';
  // Move token: base + optional suffix (2 or ')
  // Examples: R, R', R2, Rw, Rw', u2, M', x, y2
  const m = t.match(/^([A-Za-z]+)(2|')?$/);
  if (!m) return t; // keep as-is
  const base = m[1];
  const suf = m[2] || '';
  if (suf === '2') return base + '2';
  if (suf === "'") return base;
  return base + "'";
}
function _invertAlgString(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const inv = parts.reverse().map(_invertMoveToken);
  return _cleanAlg(inv.join(' '));
}

// ZBLS left-hand mode: swap R<->L (including r/l, Rw/Lw, 3Rw/3Lw...) and invert direction.
// Example: R L U B -> L' R' U' B'
function _swapRLAndInvertAlgString(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const out = parts.map((tok) => {
    const m = String(tok).trim().match(/^([0-9]*)([A-Za-z]+)(2|')?$/);
    if (!m) return tok;
    const prefixNum = m[1] || '';
    let base = m[2] || '';
    const suf = m[3] || '';

    // swap only the first face letter if it's R/L (or r/l)
    if (base.length) {
      const first = base[0];
      const rest = base.slice(1);
      if (first === 'R') base = 'L' + rest;
      else if (first === 'L') base = 'R' + rest;
      else if (first === 'r') base = 'l' + rest;
      else if (first === 'l') base = 'r' + rest;
    }

    // invert suffix (keep 2 as-is)
    let nextSuf = '';
    if (suf === '2') nextSuf = '2';
    else if (suf === "'") nextSuf = '';
    else nextSuf = "'";

    return `${prefixNum}${base}${nextSuf}`;
  });
  return _cleanAlg(out.join(' '));
}

// Normalize an alg string (practice only):
// - remove cube rotations (x/y/z)
// - merge consecutive identical bases (U U -> U2, U U' -> removed, etc.)
function _normalizePracticeAlgString(algText) {
  const raw = _cleanAlg(algText);
  if (!raw) return '';

  const tokens = raw.split(' ').filter(Boolean);
  const out = [];

  // Orientation mapping: local face -> global face
  // Start identity and update when we encounter x/y/z.
  let ori = { U:'U', D:'D', F:'F', B:'B', R:'R', L:'L' };

  const applyRotX = () => {
    // x: rotate as R (new U = old F, new F = old D, new D = old B, new B = old U)
    ori = { U: ori.F, F: ori.D, D: ori.B, B: ori.U, R: ori.R, L: ori.L };
  };
  const applyRotY = () => {
    // y: rotate as U (new F = old L, new R = old F, new B = old R, new L = old B)
    ori = { U: ori.U, D: ori.D, F: ori.L, R: ori.F, B: ori.R, L: ori.B };
  };
  const applyRotZ = () => {
    // z: rotate as F (new U = old L, new R = old U, new D = old R, new L = old D)
    ori = { F: ori.F, B: ori.B, U: ori.L, R: ori.U, D: ori.R, L: ori.D };
  };
  const applyRotation = (axis, turns) => {
    const t = ((turns % 4) + 4) % 4;
    for (let i = 0; i < t; i++) {
      if (axis === 'x') applyRotX();
      else if (axis === 'y') applyRotY();
      else if (axis === 'z') applyRotZ();
    }
  };

  const parse = (tok) => {
    const s = String(tok).trim();

    // Fix weird tokens like "U2'" -> treat as "U2"
    const m2 = s.match(/^([A-Za-z]+)2'$/);
    if (m2) return { base: m2[1], suf: '2' };

    const m = s.match(/^([A-Za-z]+)(2|')?$/);
    if (!m) return null;
    return { base: m[1], suf: m[2] || '' };
  };

  const pow = (suf) => (suf === '2' ? 2 : (suf === "'" ? 3 : 1));
  const sufFrom = (p) => {
    const v = ((p % 4) + 4) % 4;
    if (v === 0) return '';
    if (v === 1) return '';
    if (v === 2) return '2';
    return "'"; // 3
  };

  const remapBase = (base) => {
    // Cube rotations are absorbed into `ori` and removed from output.
    if (base === 'x' || base === 'y' || base === 'z') return base;

    // Face turns
    if (base.length === 1) {
      const ch = base;
      if ('URFDLB'.includes(ch)) return ori[ch];
      if ('urfdlb'.includes(ch)) return ori[ch.toUpperCase()].toLowerCase(); // wide (r/l/u/d/f/b)
      return base;
    }

    // Wide turns like Rw, Uw...
    if (base.length === 2 && base[1] === 'w' && 'URFDLB'.includes(base[0])) {
      return ori[base[0]] + 'w';
    }

    // If something else (M/E/S, 3Rw, etc.) slips through, keep it as-is.
    return base;
  };

  for (const tok of tokens) {
    const p = parse(tok);
    if (!p) { out.push(tok); continue; }

    // Absorb cube rotations (x/y/z) into orientation mapping instead of deleting them.
    if (p.base === 'x' || p.base === 'y' || p.base === 'z') {
      applyRotation(p.base, pow(p.suf));
      continue;
    }

    const mappedBase = remapBase(p.base);
    const mappedTok = mappedBase + p.suf;

    const last = out.length ? parse(out[out.length - 1]) : null;
    if (last) {
      const lastMappedBase = last.base; // already mapped in output
      if (lastMappedBase === mappedBase) {
        const merged = (pow(last.suf) + pow(p.suf)) % 4;
        if (merged === 0) out.pop();
        else out[out.length - 1] = mappedBase + sufFrom(merged);
        continue;
      }
    }

    out.push(mappedTok);
  }

  return _cleanAlg(out.join(' '));
}

// Convert practice scramble tokens to a cubing.js-friendly form for scramble-display.
// - lowercase u/r/l/f/b/d => Uw/Rw/Lw/Fw/Bw/Dw
// - slice moves M/E/S => wide + face combos (no slice tokens needed)
// This conversion is ONLY for the scramble image (diagram). Text display stays original.
function _practiceAlgForDiagram(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const out = [];
  const invSuffix = (s) => (s === "'") ? '' : (s === '2' ? '2' : "'");
  const parse = (tok) => {
    const m = tok.match(/^([A-Za-z]+)(2|')?$/);
    if (!m) return { base: tok, suf: '' };
    return { base: m[1], suf: m[2] || '' };
  };
  const wideMap = { u: 'Uw', d: 'Dw', l: 'Lw', r: 'Rw', f: 'Fw', b: 'Bw' };

  for (const tok of parts) {
    const { base, suf } = parse(tok);
    // Lowercase single-face = wide move
    if (base.length === 1 && wideMap[base]) {
      out.push(wideMap[base] + suf);
      continue;
    }
    // Slice moves -> (wide + face) decomposition
    if (base === 'M') {
      // M  = Rw' R
      // M' = R' Rw
      // M2 = R2 Rw2
      if (suf === "'") out.push("R'", 'Rw');
      else if (suf === '2') out.push('R2', 'Rw2');
      else out.push("Rw'", 'R');
      continue;
    }
    if (base === 'E') {
      // E  = Uw' U
      // E' = U' Uw
      // E2 = U2 Uw2
      if (suf === "'") out.push("U'", 'Uw');
      else if (suf === '2') out.push('U2', 'Uw2');
      else out.push("Uw'", 'U');
      continue;
    }
    if (base === 'S') {
      // S  = F' Fw
      // S' = Fw' F
      // S2 = F2 Fw2
      if (suf === "'") out.push("Fw'", 'F');
      else if (suf === '2') out.push('F2', 'Fw2');
      else out.push("F'", 'Fw');
      continue;
    }
    // Keep anything else (R, U, x, y, z, Rw, etc.)
    out.push(base + suf);
  }
  return _cleanAlg(out.join(' '));
}
function _randInt(n) { return Math.floor(Math.random() * n); }

function _pickRandomAlgFromSet(eventId) {
  if (eventId === 'p_oll') {
    // OLL.OLL is array of algs
    const arr = (OLL && OLL.OLL) ? OLL.OLL : [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_pll') {
    const keys = Object.keys(PLL || {});
    const k = keys[_randInt(keys.length)];
    const arr = PLL[k] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_zbls') {
    const keys = Object.keys(ZBLS || {});
    const chosenKey = _getPracticeCaseKeyForScramble(eventId, keys);
    const arr = ZBLS[chosenKey] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_zbll') {
    const keys = Object.keys(algdbZBLL || {});
    const chosenKey = _getPracticeCaseKeyForScramble(eventId, keys);
    const arr = algdbZBLL[chosenKey] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  return '';
}

function _preScramble(length, endwith = null) {
  const moves = ["U","D","F","B","L","R"];
  const suffix = ["", "2", "'"];
  let scramble = "";
  let last = "";
  for (let i = 0; i < length; i++) {
    let move;
    do { move = moves[_randInt(moves.length)]; } while (move === last);
    scramble += move + suffix[_randInt(suffix.length)] + " ";
    last = move;
  }
  if (endwith) scramble += endwith;
  return scramble.trim();
}

function _isTopLayerOnly(algText) {
  const txt = String(algText || '');
  // If includes D moves / wide / slice / cube rotations, treat as not top-only
  return !/[dDlLrRfFbB][w]?|M|E|S|x|y|z/.test(txt.replace(/[Uu]\w?/g,''));
}

function _obfuscate(cube, randomstate = false) {
  // cube is in a specific case state.
  // We add a random pre-scramble, then solve back to that state to get a "random-looking" scramble.
  const prec = randomstate ? Cube.random() : new Cube();
  if (!randomstate) {
    // Randomize by applying random moves
    prec.move(_preScramble(20));
  }
  // Apply pre-scramble to case cube
  const target = cube.clone();
  target.multiply(prec);

  // Solve from solved to target (gives alg); invert to get scramble
  const solution = target.solve();
  return invertAlg(solution);
}

function _generateAlgScramble(rawAlg, opts = {}) {
  const { randomstate = true, preLen = 4, auf = true } = opts;
  let algText = _cleanAlg(rawAlg);
  if (!algText) return '';

  // Build a cube that represents "apply alg to solved cube"
  const c = new Cube();
  c.move(algText);

  // Optional random U/AUF at end (keeps last-layer alignment flexible)
  let aufMove = '';
  if (auf) {
    const u = ["", "U", "U2", "U'"];
    aufMove = u[_randInt(u.length)];
  }

  // Pre-scramble: add some random moves first, then solve back.
  const pre = _preScramble(preLen, aufMove ? aufMove : null);
  const preCube = new Cube();
  if (pre) preCube.move(pre);
  const caseCube = c.clone();
  caseCube.multiply(preCube);

  const scramble = _obfuscate(caseCube, randomstate);
  return _cleanAlg(scramble);
}


// --- Alg-Trainer compatible practice scramble engine (OLL/PLL/ZBLL/ZBLS only) ---
// This is a trimmed, DOM-free port of Tao Yu's Alg-Trainer scramble logic.
// It intentionally keeps non-practice scramble logic untouched.
const PRACTICE_AT = (() => {
  // Tokenize an alg string that may or may not contain spaces.
  // Supports: R U F D L B, rotations x y z, slices M E S, lowercase r u f d l b (wide-like).
  function tokenizeAlg(s) {
    const str = String(s || '').replace(/\s+/g, '').trim();
    const tokens = [];
    let i = 0;
    const isFace = (ch) => /[RUFBLDrufbldxyzMES]/.test(ch);
    while (i < str.length) {
      const ch = str[i];
      if (!isFace(ch)) { i++; continue; }
      let tok = ch;
      i++;
      // Optional wide marker (e.g., Rw) - not used by Alg-Trainer's premove/postmove, but kept for safety
      if (str[i] === 'w' || str[i] === 'W') { tok += 'w'; i++; }

      // Optional digits (we care mainly about "2")
      if (i < str.length && /[0-9]/.test(str[i])) {
        // consume all digits but only keep mod 4 semantics later
        let digits = '';
        while (i < str.length && /[0-9]/.test(str[i])) { digits += str[i]; i++; }
        tok += digits;
      }
      // Optional prime
      if (i < str.length && str[i] === "'") { tok += "'"; i++; }

      // Normalize weird "2'" (treat as "2")
      tok = tok.replace(/2'/g, '2');
      tokens.push(tok);
    }
    return tokens;
  }

  
  let _solverReady = false;
  function ensureCubeSolver() {
    if (_solverReady) return;
    try {
      if (typeof Cube !== 'undefined' && typeof Cube.initSolver === 'function') {
        Cube.initSolver();
      }
      _solverReady = true;
    } catch (e) {
      // If solver init fails, keep going; rc.solution() will throw and surface the error.
      _solverReady = false;
    }
  }

function invertToken(tok) {
    tok = String(tok || '').trim();
    if (!tok) return '';
    // split into base + suffix
    const m = tok.match(/^([0-9]*)([A-Za-z]+w?)([0-9]*)(\'?)$/);
    if (!m) {
      // fallback: toggle last prime or append prime
      if (tok.endsWith("2")) return tok;
      if (tok.endsWith("'")) return tok.slice(0, -1);
      return tok + "'";
    }
    const prefixNum = m[1] || '';
    const base = m[2] || '';
    const digits = m[3] || '';
    const prime = m[4] || '';

    // Determine amount (quarter turns)
    let amt = 1;
    if (digits) {
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) amt = ((n % 4) + 4) % 4;
      if (amt === 0) amt = 0;
    }
    if (prime === "'") amt = (4 - amt) % 4;

    // Invert amount
    const invAmt = (4 - amt) % 4;

    // Re-encode
    if (invAmt === 0) return ''; // identity, should be dropped by simplify
    if (invAmt === 1) return `${prefixNum}${base}`;
    if (invAmt === 2) return `${prefixNum}${base}2`;
    if (invAmt === 3) return `${prefixNum}${base}'`;
    return `${prefixNum}${base}`;
  }

  // Equivalent to alg.cube.invert, but returns a compact string (no spaces),
  // so concatenation behaves like Alg-Trainer's generators.
  function invertCompact(algText) {
    const tokens = tokenizeAlg(algText);
    const inv = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = invertToken(tokens[i]);
      if (t) inv.push(t);
    }
    return inv.join('');
  }

  function parseMove(move){
    if (move.trim() == ""){
        return [null, null];
    }

    var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
    var match = myRegexp.exec(move.trim());

    if (match!=null) {

        var side = match[1];

        var times = 1;
        if (!match[2]=="") {
            times = match[2] % 4;
        }

        if (match[3]=="'") {
            times = (4 - times) % 4;
        }

        return [side, times];
    }
    else {
        return [null, null];
    }
  }

  function moveRotationsToStart(rotationFreeAlg, rotations){
    // Needs moves of algs to be separated by spaces
    // wide moves not supported (matches Alg-Trainer assumptions)

    let transformDict = {
        "U": "U","R": "R","F": "F","B": "B","L": "L","D": "D"
    };

    let rotationEffectDict = {
        "x": {"U":"B", "B":"D", "D":"F", "F":"U"},
        "y": {"F":"L", "L":"B", "B":"R", "R":"F"},
        "z": {"U":"R", "R":"D", "D":"L", "L":"U"}
    };

    let rotationsArr = rotations.trim().split(" ").filter(Boolean);

    // apply rotations to the transformation dict
    for (let i=0; i<rotationsArr.length; i++){
        let rot = rotationsArr[i];
        let [side, times] = parseMove(rot);
        if (!side || !times) continue;
        for (let t=0; t<times; t++){
            let effect = rotationEffectDict[side];
            if (!effect) continue;
            let newTransformDict = Object.assign({}, transformDict);
            for (let key in effect){
                newTransformDict[key] = transformDict[effect[key]];
            }
            transformDict = newTransformDict;
        }
    }

    // push each rotation onto the start of the alg by transforming the subsequent moves
    let movesArr = rotationFreeAlg.trim().split(" ").filter(Boolean);
    let transformedMoves = [];
    for (let i=0; i<movesArr.length; i++){
        let mv = movesArr[i];
        let [side, times] = parseMove(mv);
        if (!side) continue;
        // skip rotations already (shouldn't exist here)
        if ("xyz".includes(side)) continue;
        let base = transformDict[side] || side;
        // rebuild
        let suf = "";
        if (times === 2) suf = "2";
        else if (times === 3) suf = "'";
        transformedMoves.push(base + suf);
    }

    const rotPrefix = rotationsArr.length ? (rotationsArr.join(" ") + " ") : "";
    return rotPrefix + transformedMoves.join(" ") + (transformedMoves.length ? " " : "");
  }

  // Minimal simplify: merges consecutive identical bases (including x/y/z, M/E/S, lowercases).
  function simplifyAlg(algText) {
    const toks = String(algText || '').trim().split(/\s+/).filter(Boolean).map(t => t.replace(/2'/g,'2'));
    const out = [];
    const parseTok = (tok) => {
      const m = tok.match(/^([A-Za-z]+w?)(2|')?$/);
      if (!m) return { base: tok, amt: 1 };
      const base = m[1];
      const suf = m[2] || '';
      let amt = 1;
      if (suf === "2") amt = 2;
      else if (suf === "'") amt = 3;
      return { base, amt };
    };
    const encode = (base, amt) => {
      const a = ((amt % 4) + 4) % 4;
      if (a === 0) return null;
      if (a === 1) return base;
      if (a === 2) return base + "2";
      if (a === 3) return base + "'";
      return base;
    };
    for (const tok of toks) {
      const cur = parseTok(tok);
      if (out.length > 0) {
        const prev = parseTok(out[out.length-1]);
        if (prev.base === cur.base) {
          const merged = encode(prev.base, prev.amt + cur.amt);
          out.pop();
          if (merged) out.push(merged);
          continue;
        }
      }
      out.push(tok);
    }
    return out.join(" ");
  }

  function getPremoves(length) {
    var previous = "U"; // prevents first move from being U or D
    var moveset = ['U', 'R', 'F', 'D', 'L', 'B'];
    var amts = [" ","' "];
    var randmove = "";
    var sequence = "";
    for (let i=0; i<length; i++) {
        do {
            randmove = moveset[Math.floor(Math.random()*moveset.length)];
        } while (previous != "" && (randmove === previous || Math.abs(moveset.indexOf(randmove) - moveset.indexOf(previous)) === 3))
        previous = randmove;
        sequence += randmove;
        sequence += amts[Math.floor(Math.random()*amts.length)];
    }
    return sequence;
  }
  function getPostmoves(length) {
    var previous = "";
    var moveset = ['U', 'R', 'F', 'D', 'L', 'B'];
    var amts = [" ","' ", "2 "];
    var randmove = "";
    var sequence = "";
    for (let i=0; i<length; i++) {
        do {
            randmove = moveset[Math.floor(Math.random()*moveset.length)];
        } while (previous != "" && (randmove === previous || Math.abs(moveset.indexOf(randmove) - moveset.indexOf(previous)) === 3))
        previous = randmove;
        sequence += randmove;
        sequence += amts[Math.floor(Math.random()*amts.length)];
    }
    return sequence;
  }

  // DOM-free extraction of Alg-Trainer's RubiksCube core (used by obfuscate)
  function RubiksCube() {
    this.cubestate = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    this.resetCube = function(){
        this.cubestate = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6];
    }
    this.solution = function(){
        var gcube = Cube.fromString(this.toString());
        return gcube.solve();
    }

    this.isSolved = function(){
        for (var i = 0; i<6;i++){
            var colour1 = this.cubestate[9*i];
            for (var j = 0; j<8; j++){
                if (this.cubestate[9*i + j + 1]!=colour1){
                    return false;
                }
            }
        }
        return true;
    }
    this.wcaOrient = function() {
        // u-r--f--d--l--b
        // 4 13 22 31 40 49
        //
        var moves = "";

        if (this.cubestate[13]==1) {//R face
            this.doAlgorithm("z'");
            moves +="z'";
            moves += " ";
        } else if (this.cubestate[22]==1) {//on F face
            this.doAlgorithm("x");
            moves+="x";
            moves += " ";
        } else if (this.cubestate[31]==1) {//on D face
            this.doAlgorithm("x2");
            moves+="x2";
            moves += " ";
        } else if (this.cubestate[40]==1) {//on L face
            this.doAlgorithm("z");
            moves+="z";
            moves += " ";
        } else if (this.cubestate[49]==1) {//on B face
            this.doAlgorithm("x'");
            moves+="x'";
            moves += " ";
        }

        if (this.cubestate[13]==3) {//R face
            this.doAlgorithm("y");
            moves+="y";
            moves += " ";
        } else if (this.cubestate[40]==3) {//on L face
            this.doAlgorithm("y'");
            moves+="y'";
            moves += " ";
        } else if (this.cubestate[49]==3) {//on B face
            this.doAlgorithm("y2");
            moves+="y2";
            moves += " ";
        }

        return moves;
    }
    this.toString = function(){
        var str = "";
        var i;
        var sides = ["U","R","F","D","L","B"]
        for(i=0;i<this.cubestate.length;i++){
            str+=sides[this.cubestate[i]-1];
        }
        return str;

    }


    this.test = function(alg){
        this.doAlgorithm(alg);
        drawCube(this.cubestate);
    }

    this.doAlgorithm = function(alg) {
        if (alg == "") return;

        var moveArr = alg.split(/(?=[A-Za-z])/);
        var i;

        for (i = 0;i<moveArr.length;i++) {
            var move = moveArr[i];
            var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
            var match = myRegexp.exec(move.trim());


            if (match!=null) {

                var side = match[1];

                var times = 1;
                if (!match[2]=="") {
                    times = match[2] % 4;
                }

                if (match[3]=="'") {
                    times = (4 - times) % 4;
                }

                switch (side) {
                    case "R":
                        this.doR(times);
                        break;
                    case "U":
                        this.doU(times);
                        break;
                    case "F":
                        this.doF(times);
                        break;
                    case "B":
                        this.doB(times);
                        break;
                    case "L":
                        this.doL(times);
                        break;
                    case "D":
                        this.doD(times);
                        break;
                    case "r":
                        this.doRw(times);
                        break;
                    case "u":
                        this.doUw(times);
                        break;
                    case "f":
                        this.doFw(times);
                        break;
                    case "b":
                        this.doBw(times);
                        break;
                    case "l":
                        this.doLw(times);
                        break;
                    case "d":
                        this.doDw(times);
                        break;
                    case "x":
                        this.doX(times);
                        break;
                    case "y":
                        this.doY(times);
                        break;
                    case "z":
                        this.doZ(times);
                        break;
                    case "E":
                        this.doE(times);
                        break;
                    case "M":
                        this.doM(times);
                        break;
                    case "S":
                        this.doS(times);
                        break;

                }
            } else {

                console.log("Invalid alg, or no alg specified:" + alg + "|");

            }

        }

    }

    this.solveNoRotate = function(){
        //Center sticker indexes: 4, 13, 22, 31, 40, 49
        cubestate = this.cubestate;
        this.cubestate = [cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],
                          cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],
                          cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],
                          cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],
                          cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],
                          cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49]];
    }

    this.doU = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[6], cubestate[3], cubestate[0], cubestate[7], cubestate[4], cubestate[1], cubestate[8], cubestate[5], cubestate[2], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doR = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.cubestate = [cubestate[0], cubestate[1], cubestate[20], cubestate[3], cubestate[4], cubestate[23], cubestate[6], cubestate[7], cubestate[26], cubestate[15], cubestate[12], cubestate[9], cubestate[16], cubestate[13], cubestate[10], cubestate[17], cubestate[14], cubestate[11], cubestate[18], cubestate[19], cubestate[29], cubestate[21], cubestate[22], cubestate[32], cubestate[24], cubestate[25], cubestate[35], cubestate[27], cubestate[28], cubestate[51], cubestate[30], cubestate[31], cubestate[48], cubestate[33], cubestate[34], cubestate[45], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[8], cubestate[46], cubestate[47], cubestate[5], cubestate[49], cubestate[50], cubestate[2], cubestate[52], cubestate[53]]
        }

    }

    this.doF = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[44], cubestate[41], cubestate[38], cubestate[6], cubestate[10], cubestate[11], cubestate[7], cubestate[13], cubestate[14], cubestate[8], cubestate[16], cubestate[17], cubestate[24], cubestate[21], cubestate[18], cubestate[25], cubestate[22], cubestate[19], cubestate[26], cubestate[23], cubestate[20], cubestate[15], cubestate[12], cubestate[9], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[27], cubestate[39], cubestate[40], cubestate[28], cubestate[42], cubestate[43], cubestate[29], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doD = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[24], cubestate[25], cubestate[26], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[42], cubestate[43], cubestate[44], cubestate[33], cubestate[30], cubestate[27], cubestate[34], cubestate[31], cubestate[28], cubestate[35], cubestate[32], cubestate[29], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[51], cubestate[52], cubestate[53], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[15], cubestate[16], cubestate[17]];
        }

    }

    this.doL = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[53], cubestate[1], cubestate[2], cubestate[50], cubestate[4], cubestate[5], cubestate[47], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[0], cubestate[19], cubestate[20], cubestate[3], cubestate[22], cubestate[23], cubestate[6], cubestate[25], cubestate[26], cubestate[18], cubestate[28], cubestate[29], cubestate[21], cubestate[31], cubestate[32], cubestate[24], cubestate[34], cubestate[35], cubestate[42], cubestate[39], cubestate[36], cubestate[43], cubestate[40], cubestate[37], cubestate[44], cubestate[41], cubestate[38], cubestate[45], cubestate[46], cubestate[33], cubestate[48], cubestate[49], cubestate[30], cubestate[51], cubestate[52], cubestate[27]];
        }

    }

    this.doB = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[11], cubestate[14], cubestate[17], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[35], cubestate[12], cubestate[13], cubestate[34], cubestate[15], cubestate[16], cubestate[33], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[36], cubestate[39], cubestate[42], cubestate[2], cubestate[37], cubestate[38], cubestate[1], cubestate[40], cubestate[41], cubestate[0], cubestate[43], cubestate[44], cubestate[51], cubestate[48], cubestate[45], cubestate[52], cubestate[49], cubestate[46], cubestate[53], cubestate[50], cubestate[47]];
        }

    }

    this.doE = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doM = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[52], cubestate[2], cubestate[3], cubestate[49], cubestate[5], cubestate[6], cubestate[46], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[1], cubestate[20], cubestate[21], cubestate[4], cubestate[23], cubestate[24], cubestate[7], cubestate[26], cubestate[27], cubestate[19], cubestate[29], cubestate[30], cubestate[22], cubestate[32], cubestate[33], cubestate[25], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[34], cubestate[47], cubestate[48], cubestate[31], cubestate[50], cubestate[51], cubestate[28], cubestate[53]];
        }

    }

    this.doS = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[43], cubestate[40], cubestate[37], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[3], cubestate[11], cubestate[12], cubestate[4], cubestate[14], cubestate[15], cubestate[5], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[16], cubestate[13], cubestate[10], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[30], cubestate[38], cubestate[39], cubestate[31], cubestate[41], cubestate[42], cubestate[32], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doX = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doR(1);
            this.doM(3);
            this.doL(3);
        }
    }

    this.doY = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.doU(1);
            this.doE(3);
            this.doD(3);
        }
    }

    this.doZ = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.doF(1);
            this.doS(1);
            this.doB(3);
        }
    }

    this.doUw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doE(3);
            this.doU(1);

        }

    }

    this.doRw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doM(3);
            this.doR(1);
        }

    }

    this.doFw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doS(1);
            this.doF(1);
        }

    }

    this.doDw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doE(1);
            this.doD(1);
        }

    }

    this.doLw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doM(1);
            this.doL(1);
        }

    }

    this.doBw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doS(3);
            this.doB(1);
        }

    }
}

  function obfuscate(algorithm, numPremoves=3, minLength=16, numPostmoves=0){
    var premoves = getPremoves(numPremoves);
    var postmoves = getPostmoves(numPostmoves);

    const rc = new RubiksCube();
    // Alg-Trainer expects `algorithm` to be a scramble. It inverts it internally.
    rc.doAlgorithm(postmoves + invertCompact(algorithm) + premoves);
    var o = rc.wcaOrient(); 
    ensureCubeSolver();
    var solution = rc.solution();

    var obAlg = moveRotationsToStart(premoves, o) + solution  + postmoves;
    obAlg = simplifyAlg(obAlg).replace(/2'/g, "2").trim();
    return obAlg.split(" ").length >= minLength ? obAlg : obfuscate(algorithm, numPremoves+1, minLength, numPostmoves);
  }

  function generatePreScrambleFromSolution(rawSolutionAlg, generatorCSV, times){
    const genArray = String(generatorCSV || '').split(',').filter(Boolean);
    let scramble = "";
    for (let i=0; i<times; i++){
      const rand = Math.floor(Math.random()*genArray.length);
      scramble += String(genArray[rand] || '').replace(/\s+/g,'').replace(/2'/g,'2');
    }
    scramble += invertCompact(rawSolutionAlg);
    return obfuscate(scramble);
  }

  return {
    obfuscate,
    invertCompact,
    generatePreScrambleFromSolution,
    simplifyAlg
  };
})();

async function generatePracticeScrambleText() {
  const raw = _pickRandomAlgFromSet(currentEvent);
  if (!raw) return '';

  // Practice events (OLL/PLL/ZBLS/ZBLL):
  // Use Alg-Trainer compatible "real scramble" generation for stability.
  // Keep case selection logic intact; only the conversion from case-alg -> scramble is swapped.
  let solAlg = _cleanAlg(raw).replace(/2'/g, '2');

  // ZBLS hand mode (R/L): mirror the *solution alg* (swap R/L and invert each token),
  // then generate scramble from that mirrored solution.
  if (String(currentEvent || '').trim() === 'p_zbls' && practiceZblsHand === 'L') {
    solAlg = _swapRLAndInvertAlgString(solAlg).replace(/2'/g, '2');
  }

  const ev = String(currentEvent || '').trim();

  // Alg-Trainer preset generators
  const GEN_ZBLL = "RBR'FRB'R'F',RUR'URU2R',U,R'U'RU'R'U2R,F2U'R'LF2L'RU'F2";
  const GEN_PLL  = "R'FR'B2'RF'R'B2'R2,F2U'R'LF2RL'U'F2,U";

  if (ev === 'p_oll' || ev === 'p_pll') {
    // Alg-Trainer: OLL/PLL => PLL-style prescramble, then obfuscate
    return PRACTICE_AT.generatePreScrambleFromSolution(solAlg, GEN_PLL, 100);
  }

  if (ev === 'p_zbls' || ev === 'p_zbll') {
    // Alg-Trainer: ZBLS/ZBLL => heavier prescramble, then obfuscate
    return PRACTICE_AT.generatePreScrambleFromSolution(solAlg, GEN_ZBLL, 1000);
  }

  // Fallback (shouldn't happen): mimic Alg-Trainer "obfuscate inverse"
  const baseScramble = PRACTICE_AT.invertCompact(solAlg);
  return PRACTICE_AT.obfuscate(baseScramble);
}

const suffixes = ["", "'", "2"];
const orientations = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
const wideMoves = ["Uw", "Dw", "Lw", "Rw", "Fw", "Bw"]; 
function mapEventIdForCubing(eventId){
    // cubing.js / scramble-display uses WCA event IDs. Pyraminx is "pyram".
    if (isPracticeEvent(eventId)) return '333';
    if (eventId === 'pyra') return 'pyram';
    return eventId;
}
let cubeState = {};
const COLORS = { U: '#FFFFFF', D: '#FFD500', L: '#FF8C00', R: '#DC2626', F: '#16A34A', B: '#2563EB' };
// --- Mobile Tab Logic ---
window.switchMobileTab = (tab) => {
    // Close Settings if open (prevents overlay stacking on mobile)
    try {
        const _so = document.getElementById('settingsOverlay');
        if (_so && _so.classList.contains('active')) closeSettings();
    } catch (e) {}

    if (tab === 'timer') {
        // Show Timer, Hide History
        timerSection.classList.remove('hidden');
        historySection.classList.add('hidden');
        // Ensure we don't leave mobile-only flex layout on history section
        historySection.classList.remove('flex');
        
        // Update Tab Colors
        mobTabTimer.className = "flex flex-col items-center justify-center w-full h-full text-blue-600 dark:text-blue-400";
        mobTabHistory.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors";
    } else if (tab === 'history') {
        // Hide Timer, Show History
        timerSection.classList.add('hidden');
        historySection.classList.remove('hidden');
        // Force flex for history section when active on mobile
        historySection.classList.add('flex');
        // Update Tab Colors
        mobTabHistory.className = "flex flex-col items-center justify-center w-full h-full text-blue-600 dark:text-blue-400";
        mobTabTimer.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors";
        
        // Refresh graph if tool is active
        if(activeTool === 'graph') renderHistoryGraph();
    }
};
// Ensure desktop layout on resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        // Desktop: Show both
        timerSection.classList.remove('hidden');
        historySection.classList.remove('hidden');
        historySection.classList.add('flex');
    } else {
        // Mobile: Revert to current tab state (defaulting to timer if mixed)
        if (mobTabTimer.classList.contains('text-blue-600') || mobTabTimer.classList.contains('text-blue-400')) {
            switchMobileTab('timer');
        } else {
            switchMobileTab('history');
        }
    }
    scheduleLayout('resize');
});
// --- Update Log / Known Issues ---
function renderUpdateLog(latestOnly = true) {
    const overlay = document.getElementById('updateLogOverlay');
    const versionEl = document.getElementById('updateVersion');
    const listEl = document.getElementById('updateList');
    if (!overlay || !versionEl || !listEl) return;

    const notes = latestOnly ? RELEASE_NOTES.slice(0, 1) : RELEASE_NOTES;
    const latest = RELEASE_NOTES[0];

    // Emphasize V2 in the badge
    const badgeText = latest ? (latest.version === '2' ? `V${latest.version}` : `v${latest.version}`) : `v${APP_VERSION}`;
    versionEl.innerText = badgeText;
    versionEl.classList.toggle('text-sm', latest && latest.version === '2');
    versionEl.classList.toggle('px-3', latest && latest.version === '2');

    listEl.innerHTML = notes.map((r, idx) => {
        const header = latestOnly ? '' : `<li class="list-none -ml-4 mb-1"><span class="text-[11px] font-black text-slate-500 dark:text-slate-400">${r.date} · ${r.version === '2' ? 'V2' : 'v' + r.version}</span></li>`;
        const items = (r.items && (r.items[currentLang] || r.items.ko) ? (r.items[currentLang] || r.items.ko) : []).map(it => `<li>${it}</li>`).join('');
        return `${header}${items}${idx < notes.length - 1 ? '<li class="list-none -ml-4 my-3 border-t border-slate-100 dark:border-slate-800"></li>' : ''}`;
    }).join('');
}
window.openUpdateLog = (auto = false) => {
    if (isRunning) return;
    renderUpdateLog(!auto ? false : true);
    const overlay = document.getElementById('updateLogOverlay');
    if (overlay) overlay.classList.add('active');
}
function checkUpdateLog() {
    const savedVersion = localStorage.getItem('appVersion');
    if (savedVersion !== APP_VERSION) {
        renderUpdateLog(true);
        const overlay = document.getElementById('updateLogOverlay');
        if (overlay) overlay.classList.add('active');
    }
}
window.closeUpdateLog = () => {
    const overlay = document.getElementById('updateLogOverlay');
    if (overlay) overlay.classList.remove('active');
    localStorage.setItem('appVersion', APP_VERSION);
};
window.openKnownIssues = () => {
    if (isRunning) return;
    const overlay = document.getElementById('knownIssuesOverlay');
    const listEl = document.getElementById('knownIssuesList');
    if (!overlay || !listEl) return;
    if (!KNOWN_ISSUES.length) {
        listEl.innerHTML = `<li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">${t('noDevLog')}</li>`;
    } else {
        listEl.innerHTML = KNOWN_ISSUES.map(ki => {
            const status = ki.status ? String(ki.status) : 'open';
            const titleObj = ki.title || {};
            const title = (typeof titleObj === 'string') ? titleObj : (titleObj[currentLang] || titleObj.ko || ki.id || 'Log');
            return `<li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center justify-between"><span class="text-[11px] font-black text-slate-700 dark:text-slate-200">${title}</span><span class="text-[10px] font-black text-slate-400 uppercase">${status}</span></div><div class="mt-1 text-[10px] font-bold text-slate-400">${t('devSince')} ${ki.since || '-'}</div></li>`;
        }).join('');
    }
    overlay.classList.add('active');
}
window.closeKnownIssues = () => {
    const overlay = document.getElementById('knownIssuesOverlay');
    if (overlay) overlay.classList.remove('active');
};
// --- Inspection Logic ---
function toggleInspection(checkbox) {
    isInspectionMode = checkbox.checked;
    
    // Force set hold duration to ~0 if inspection is ON
    if (isInspectionMode) {
        updateHoldDuration(0.01); // Basically instant
        holdDurationSlider.value = 0.01;
        holdDurationSlider.disabled = true;
        document.getElementById('holdDurationContainer').classList.add('opacity-50', 'pointer-events-none');
    } else {
        updateHoldDuration(0.3);
        holdDurationSlider.value = 0.3;
        holdDurationSlider.disabled = false;
        document.getElementById('holdDurationContainer').classList.remove('opacity-50', 'pointer-events-none');
    }
    
    saveData();
}
function startInspection() {
    inspectionState = 'inspecting';
    inspectionStartTime = Date.now();
    inspectionPenalty = null;
    hasSpoken8 = false;
    hasSpoken12 = false;
    
    timerEl.classList.remove('text-ready');
    timerEl.style.color = '#ef4444'; // Red color for inspection countdown
    statusHint.innerText = "Inspection";
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionInterval = setInterval(() => {
        const elapsed = (Date.now() - inspectionStartTime) / 1000;
        const remaining = 15 - elapsed;
        
        if (remaining > 0) {
            timerEl.innerText = Math.ceil(remaining);
        } else if (remaining > -2) {
            timerEl.innerText = "+2";
            inspectionPenalty = '+2';
        } else {
            timerEl.innerText = "DNF";
            inspectionPenalty = 'DNF';
        }
        // TTS
        if (elapsed >= 8 && !hasSpoken8) {
            speak("Eight seconds");
            hasSpoken8 = true;
        }
        if (elapsed >= 12 && !hasSpoken12) {
            speak("Twelve seconds");
            hasSpoken12 = true;
        }
    }, 100);
}
function stopInspection() {
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionState = 'none';
    timerEl.style.color = '';
    // Calculate penalty one last time to be precise
    if (isInspectionMode && inspectionStartTime > 0) {
        const elapsed = (Date.now() - inspectionStartTime) / 1000;
        if (elapsed > 17) inspectionPenalty = 'DNF';
        else if (elapsed > 15) inspectionPenalty = '+2';
        else inspectionPenalty = null;
    }
}
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}
// --- Dark Mode ---
function toggleDarkMode(checkbox) {
    const isDark = checkbox.checked;
    document.documentElement.classList.toggle('dark', isDark);
    saveData();
    if(activeTool === 'graph') renderHistoryGraph();
}
// --- Wake Lock ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { console.log('Wake Lock released'); });
        }
    } catch (err) {
        console.log(`Wake Lock not available: ${err.message}`);
    }
}
async function toggleWakeLock(checkbox) {
    isWakeLockEnabled = checkbox.checked;
    if (isWakeLockEnabled) {
        await requestWakeLock();
    } else if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
    }
    saveData();
}
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible' && isWakeLockEnabled) {
        await requestWakeLock();
    }
});
function updateHoldDuration(val) {
    holdDuration = parseFloat(val) * 1000;
    holdDurationValue.innerText = val < 0.1 ? "Instant" : val + "s";
    saveData();
}
// --- Bluetooth & Timer Logic ---
window.openBTModal = () => document.getElementById('btOverlay').classList.add('active');
window.closeBTModal = () => document.getElementById('btOverlay').classList.remove('active');
async function connectGanTimer() {
    const btBtn = document.getElementById('btConnectBtn');
    const btStatusText = document.getElementById('btStatusText');
    const btIcon = document.getElementById('btModalIcon');
    if (!navigator.bluetooth) {
        btStatusText.innerText = "Web Bluetooth is not supported in this browser.";
        btStatusText.classList.add('text-red-400');
        return;
    }
    try {
        btBtn.disabled = true;
        btBtn.innerText = "Searching...";
        btStatusText.innerText = "Select your GAN Timer in the popup";
        btIcon.classList.add('bt-pulse');
        btDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'GAN' }],
            optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
        });
        const server = await btDevice.gatt.connect();
        const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        
        btCharacteristic = await service.getCharacteristic('0000fff5-0000-1000-8000-00805f9b34fb');
        await btCharacteristic.startNotifications();
        btCharacteristic.addEventListener('characteristicvaluechanged', handleGanBTData);
        isBtConnected = true;
        document.getElementById('btStatusIcon').classList.replace('disconnected', 'connected');
        document.getElementById('btInfoPanel').classList.remove('hidden');
        document.getElementById('btDeviceName').innerText = btDevice.name;
        document.getElementById('btDisconnectBtn').classList.remove('hidden');
        btBtn.classList.add('hidden');
        btStatusText.innerText = "Timer Connected & Ready";
        btIcon.classList.remove('bt-pulse');
        
        statusHint.innerText = "Timer Ready (BT)";
        btDevice.addEventListener('gattserverdisconnected', onBTDisconnected);
    } catch (error) {
        console.error("Bluetooth Connection Error:", error);
        btStatusText.innerText = "Connection failed";
        btBtn.disabled = false;
        btBtn.innerText = "Connect Timer";
        btIcon.classList.remove('bt-pulse');
    }
}
function handleGanBTData(event) {
    const data = event.target.value;
    if (data.byteLength < 4) return; 
    const state = data.getUint8(3);
    
    // Sync time when not running (1:GetSet, 2:HandsOff, 4:Stopped)
    if (state !== 3 && !isRunning && data.byteLength >= 8) {
        const min = data.getUint8(4);
        const sec = data.getUint8(5);
        const msec = data.getUint16(6, true);
        const currentMs = (min * 60000) + (sec * 1000) + msec;
        timerEl.innerText = formatTime(currentMs);
    }
    if (state !== lastBtState) {
        if (state === 6) { // HANDS_ON
            // If inspecting, do not reset ready state (user puts hands on timer during inspection)
            if (!isInspectionMode) {
                isReady = false;
                timerEl.classList.add('text-ready'); 
                statusHint.innerText = "Ready!";
            }
        } else if (state === 1) { // GET_SET
        } else if (state === 2) { // HANDS_OFF (Just released)
             // If inspecting, this is where we start the solve and end inspection
             if (!isInspectionMode) {
                 timerEl.classList.remove('text-ready', 'text-running');
                 statusHint.innerText = "Timer Ready (BT)";
             }
        } else if (state === 3) { // RUNNING
            if (!isRunning) {
                // If inspection mode was active, stop it and check penalty
                if (isInspectionMode && inspectionState === 'inspecting') {
                    stopInspection();
                }
                startTime = Date.now();
                isRunning = true;
                if(timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timerEl.innerText = formatTime(Date.now() - startTime);
                }, 16);
                
                timerEl.classList.remove('text-ready');
                timerEl.classList.add('text-running');
                statusHint.innerText = "Timing...";
            }
        } else if (state === 4) { // STOPPED
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                if (data.byteLength >= 8) {
                    const min = data.getUint8(4);
                    const sec = data.getUint8(5);
                    const msec = data.getUint16(6, true); 
                    const finalMs = (min * 60000) + (sec * 1000) + msec;
                    
                    timerEl.innerText = formatTime(finalMs);
                    stopTimer(finalMs);
                }
                timerEl.classList.remove('text-running');
                statusHint.innerText = "Finished";
            }
        }
        lastBtState = state;
    }
}
function disconnectBT() {
    if (btDevice && btDevice.gatt.connected) {
        btDevice.gatt.disconnect();
    }
}
function onBTDisconnected() {
    isBtConnected = false;
    lastBtState = null;
    document.getElementById('btStatusIcon').classList.replace('connected', 'disconnected');
    document.getElementById('btInfoPanel').classList.add('hidden');
    document.getElementById('btDisconnectBtn').classList.add('hidden');
    const btBtn = document.getElementById('btConnectBtn');
    btBtn.classList.remove('hidden');
    btBtn.disabled = false;
    btBtn.innerText = "Connect Timer";
    document.getElementById('btStatusText').innerText = "Timer Disconnected";
    statusHint.innerText = "Hold to Ready";
}
function setControlsLocked(locked) {
    // RUNNING 중 실수 방지 (모바일 한 손 사용 가이드)
    const disabled = !!locked;
    if (eventSelect) eventSelect.disabled = disabled;
    if (plus2Btn) plus2Btn.disabled = disabled;
    if (dnfBtn) dnfBtn.disabled = disabled;
}

function startTimer() {
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionState = 'none';
    // High-precision timer loop (prevents interval drift)
    startPerf = performance.now();
    isRunning = true;
    // Prevent accidental page scroll while timing on mobile
    document.body.classList.add('no-scroll');
    setControlsLocked(true);
    if (timerRafId) cancelAnimationFrame(timerRafId);
    const tick = () => {
        if (!isRunning) return;
        const elapsed = performance.now() - startPerf;
        timerEl.innerText = formatTime(elapsed);
        timerRafId = requestAnimationFrame(tick);
    };
    timerRafId = requestAnimationFrame(tick);
    timerEl.style.color = '';
    statusHint.innerText = "Timing...";
    timerEl.classList.add('text-running');
    timerEl.classList.remove('text-ready');
}
function stopTimer(forcedTime = null) {
    if (timerRafId) {
        cancelAnimationFrame(timerRafId);
        timerRafId = null;
    }
    clearInterval(timerInterval); // legacy safety (in case any older interval was running)
    const elapsed = forcedTime !== null ? forcedTime : (performance.now() - startPerf);
    lastStopTimestamp = Date.now();

    // Stop timing: restore scroll
    document.body.classList.remove('no-scroll');

    // Multi-Blind: WCA식 입력 모달에서 결과를 완성해야 저장
    if (currentEvent === '333mbf') {
        isRunning = isReady = false;
        inspectionState = 'none';
        inspectionPenalty = null;
        setControlsLocked(false);
        // Ensure we don't keep the "running" (blue) timer color after stopping in MBF.
        timerEl.classList.remove('text-running', 'text-ready', 'text-hold');
        timerEl.style.color = '';
        timerEl.innerText = formatTime(elapsed);
        statusHint.innerText = "Enter MBF Result";
        openMbfResultModal({ defaultTimeMs: elapsed });
        saveData();
        return;
    }
    let finalPenalty = inspectionPenalty;
    if (elapsed > 10 || finalPenalty === 'DNF') {
        solves.unshift({
            id: Date.now(),
            time: elapsed,
            scramble: currentScramble,
            event: currentEvent,
            sessionId: getCurrentSessionId(),
            penalty: finalPenalty,
            date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "")
        });
        if (finalPenalty === 'DNF') {
            timerEl.innerText = "DNF";
        } else {
            let displayTime = formatTime(elapsed);
            if (finalPenalty === '+2') {
                displayTime = formatTime(elapsed + 2000) + "+";
            }
            timerEl.innerText = displayTime;
        }
    }
    isRunning = isReady = false;
    inspectionState = 'none';
    inspectionPenalty = null;
    setControlsLocked(false);
    updateUI();
    generateScramble();
    statusHint.innerText = isBtConnected ? "Ready (Bluetooth)" : (isInspectionMode ? "Start Inspection" : "Hold to Ready");
    timerEl.classList.remove('text-running', 'text-ready');
    timerEl.style.color = '';
    setControlsLocked(false);
    saveData();
}
// --- Penalty Functions ---
function updatePenaltyBtns(s) {
    if (plus2Btn && dnfBtn) {
        plus2Btn.className = `penalty-btn ${s?.penalty==='+2'?'active-plus2':'inactive'}`;
        dnfBtn.className = `penalty-btn ${s?.penalty==='DNF'?'active-dnf':'inactive'}`;
    }
}
function resetPenalty() {
    updatePenaltyBtns(null);
}
function deleteSolve(id) {
    solves = solves.filter(s => s.id !== id);
    updateUI();
    saveData();
}
function togglePenalty(p) {
    if(!solves.length || isRunning) return;
    const sid = getCurrentSessionId();
    const currentList = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    if (!currentList.length) return;
    const targetSolve = currentList[0];
    targetSolve.penalty = (targetSolve.penalty===p)?null:p;
    
    if (targetSolve.penalty === 'DNF') {
        timerEl.innerText = 'DNF';
    } else {
        const t = targetSolve.time + (targetSolve.penalty === '+2' ? 2000 : 0);
        timerEl.innerText = formatTime(t) + (targetSolve.penalty === '+2' ? '+' : '');
    }
    
    updateUI(); updatePenaltyBtns(targetSolve); saveData();
}

// Toggle penalty for an arbitrary solve in the history list (used by each row's +2/DNF buttons).
// This MUST exist because history rows are rendered with inline onclick="toggleSolvePenalty(...)".
function toggleSolvePenalty(solveId, p) {
    try {
        if (isRunning) return;
        const s = solves.find(x => x.id === solveId);
        if (!s) return;

        s.penalty = (s.penalty === p) ? null : p;

        // If the edited solve is the latest solve in the current event/session, reflect it on the main timer + top penalty buttons.
        const sid = getCurrentSessionId();
        const currentList = solves.filter(x => x.event === currentEvent && x.sessionId === sid);
        if (currentList.length && currentList[0].id === s.id) {
            if (s.penalty === 'DNF') {
                timerEl.innerText = 'DNF';
            } else {
                const t = s.time + (s.penalty === '+2' ? 2000 : 0);
                timerEl.innerText = formatTime(t) + (s.penalty === '+2' ? '+' : '');
            }
            updatePenaltyBtns(s);
        }

        updateUI();
        saveData();
    } catch (err) {
        // Fail silently to avoid breaking tap/click globally.
        console.error('toggleSolvePenalty error:', err);
    }
}
// --- Data Persistence ---
function exportData() {
    const data = {
        solves: solves,
        sessions: sessions,
        settings: { 
            precision, 
            isAo5Mode, 
            currentEvent, 
            holdDuration, 
            isDarkMode: document.documentElement.classList.contains('dark'), 
            isWakeLockEnabled,
            isInspectionMode 
        }
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubetimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function triggerImport() { document.getElementById('importInput').click(); }
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.solves && data.sessions) {
                solves = data.solves;
                sessions = data.sessions;
                if (data.settings) {
                    precision = data.settings.precision || 2;
                    isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
                    currentEvent = data.settings.currentEvent || '333';
                    holdDuration = data.settings.holdDuration || 300;
                    isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
                    const isDark = data.settings.isDarkMode || false;
                    isInspectionMode = data.settings.isInspectionMode || false;
                    
                    precisionToggle.checked = (precision === 3);
                    avgModeToggle.checked = isAo5Mode;
                    darkModeToggle.checked = isDark;
                    wakeLockToggle.checked = isWakeLockEnabled;
                    inspectionToggle.checked = isInspectionMode;
                    
                    toggleInspection(inspectionToggle);
                    if (!isInspectionMode) {
                        holdDurationSlider.value = holdDuration / 1000;
                        updateHoldDuration(holdDurationSlider.value);
                    }
                    document.documentElement.classList.toggle('dark', isDark);
                    if(isWakeLockEnabled) requestWakeLock();
                }
                saveData();
                location.reload(); 
            } else { throw new Error("Invalid format"); }
        } catch (err) {
            alert("Failed to restore data. Invalid JSON.");
        }
    };
    reader.readAsText(file);
}
function saveData() {
    const data = {
        solves: solves,
        sessions: sessions,
        settings: { 
            precision, 
            isAo5Mode, 
            currentEvent, 
            holdDuration,
            isDarkMode: document.documentElement.classList.contains('dark'),
            isWakeLockEnabled,
            isInspectionMode
        }
    };
    localStorage.setItem('cubeTimerData_v5', JSON.stringify(data));
}
function loadData() {
    const saved = localStorage.getItem('cubeTimerData_v5') || localStorage.getItem('cubeTimerData_v4');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            solves = data.solves || [];
            sessions = data.sessions || {};
            if (data.settings) {
                precision = data.settings.precision || 2;
                isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
                currentEvent = data.settings.currentEvent || '333';
                holdDuration = data.settings.holdDuration || 300;
                const isDark = data.settings.isDarkMode || false;
                isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
                isInspectionMode = data.settings.isInspectionMode || false;
                precisionToggle.checked = (precision === 3);
                avgModeToggle.checked = isAo5Mode;
                darkModeToggle.checked = isDark;
                wakeLockToggle.checked = isWakeLockEnabled;
                inspectionToggle.checked = isInspectionMode;
                
                if (isInspectionMode) {
                    toggleInspection(inspectionToggle);
                } else {
                    holdDurationSlider.value = holdDuration / 1000;
                    holdDurationValue.innerText = holdDurationSlider.value + "s";
                }
                document.documentElement.classList.toggle('dark', isDark);
                if(isWakeLockEnabled) requestWakeLock();
                const conf = configs[currentEvent];
                if (eventSelect) eventSelect.value = currentEvent;
                if (conf) switchCategory(conf.cat, false);
            }
        } catch (e) { console.error("Load failed", e); }
    }
    initSessionIfNeeded(currentEvent);
    
    if (!isBtConnected) {
        statusHint.innerText = isInspectionMode ? "Start Inspection" : "Hold to Ready";
    }
}
function initSessionIfNeeded(eventId) {
    if (!sessions[eventId] || sessions[eventId].length === 0) {
        sessions[eventId] = [{ id: Date.now(), name: "Session 1", isActive: true }];
    } else if (!sessions[eventId].find(s => s.isActive)) {
        sessions[eventId][0].isActive = true;
    }
}
function getCurrentSessionId() {
    const eventSessions = sessions[currentEvent] || [];
    const active = eventSessions.find(s => s.isActive);
    if (active) return active.id;
    initSessionIfNeeded(currentEvent);
    return sessions[currentEvent][0].id;
}
// --- Cube Logic ---
function initCube(n = 3) {
    cubeState = { n };
    ['U','D','L','R','F','B'].forEach(f => cubeState[f] = Array(n*n).fill(COLORS[f]));
}
function rotateFaceMatrix(fName) {
    const n = cubeState.n; const f = cubeState[fName]; const next = Array(n*n);
    for(let r=0; r<n; r++) for(let c=0; c<n; c++) next[c*n + (n-1-r)] = f[r*n + c];
    cubeState[fName] = next;
}
function applyMove(move) {
    const n = cubeState.n; if(!n) return;
    let base = move[0], layer = 1;
    if(move.includes('w')) {
        if(/^\d/.test(move)) { layer = parseInt(move[0]); base = move[1]; }
        else { layer = 2; base = move[0]; }
    }
    const reps = move.includes("'") ? 3 : (move.includes("2") ? 2 : 1);
    for(let r=0; r<reps; r++) {
        for(let l=1; l<=layer; l++) {
            if(l===1) rotateFaceMatrix(base);
            const d = l-1, last = n-1-d;
            if(base==='U') for(let i=0; i<n; i++) { let t=cubeState.F[d*n+i]; cubeState.F[d*n+i]=cubeState.R[d*n+i]; cubeState.R[d*n+i]=cubeState.B[d*n+i]; cubeState.B[d*n+i]=cubeState.L[d*n+i]; cubeState.L[d*n+i]=t; }
            else if(base==='D') for(let i=0; i<n; i++) { let t=cubeState.F[last*n+i]; cubeState.F[last*n+i]=cubeState.L[last*n+i]; cubeState.L[last*n+i]=cubeState.B[last*n+i]; cubeState.B[last*n+i]=cubeState.R[last*n+i]; cubeState.R[last*n+i]=t; }
            else if(base==='L') for(let i=0; i<n; i++) { let t=cubeState.F[i*n+d]; cubeState.F[i*n+d]=cubeState.U[i*n+d]; cubeState.U[i*n+d]=cubeState.B[(n-1-i)*n+(n-1-d)]; cubeState.B[(n-1-i)*n+(n-1-d)]=cubeState.D[i*n+d]; cubeState.D[i*n+d]=t; }
            else if(base==='R') for(let i=0; i<n; i++) { let t=cubeState.F[i*n+last]; cubeState.F[i*n+last]=cubeState.D[i*n+last]; cubeState.D[i*n+last]=cubeState.B[(n-1-i)*n+d]; cubeState.B[(n-1-i)*n+d]=cubeState.U[i*n+last]; cubeState.U[i*n+last]=t; }
            else if(base==='F') for(let i=0; i<n; i++) { let t=cubeState.U[last*n+i]; cubeState.U[last*n+i]=cubeState.L[(n-1-i)*n+last]; cubeState.L[(n-1-i)*n+last]=cubeState.D[d*n+(n-1-i)]; cubeState.D[d*n+(n-1-i)]=cubeState.R[i*n+d]; cubeState.R[i*n+d]=t; }
            else if(base==='B') for(let i=0; i<n; i++) { let t=cubeState.U[d*n+i]; cubeState.U[d*n+i]=cubeState.R[i*n+last]; cubeState.R[i*n+last]=cubeState.D[last*n+(n-1-i)]; cubeState.D[last*n+(n-1-i)]=cubeState.L[(n-1-i)*n+d]; cubeState.L[(n-1-i)*n+d]=t; }
        }
    }
}
function drawCube() {
    const n = cubeState.n;
    // Only show visualizer availability messages inside the Scramble Image tool.
    if (activeTool !== 'scramble') {
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
        return;
    }
    if(!n || configs[currentEvent]?.cat === 'blind') { 
        visualizerCanvas.style.display='none'; 
        noVisualizerMsg.innerText = configs[currentEvent]?.cat === 'blind'
            ? (currentLang === 'ko' ? '블라인드 종목에서는 스크램블 이미지가 비활성화됩니다' : 'Scramble images disabled for Blind')
            : (currentLang === 'ko' ? '기본 큐브 종목만 지원합니다' : 'Visualizer for standard cubes only');
        noVisualizerMsg.classList.remove('hidden'); 
        return; 
    }
    visualizerCanvas.style.display='block'; 
    noVisualizerMsg.classList.add('hidden');
    const ctx = visualizerCanvas.getContext('2d');
    const faceS = 55, tileS = faceS/n, gap = 4;
    ctx.clearRect(0,0,260,190);
    const offX = (260-(4*faceS+3*gap))/2, offY = (190-(3*faceS+2*gap))/2;
    const drawF = (f,x,y) => cubeState[f].forEach((c,i) => {
        ctx.fillStyle=c; ctx.fillRect(x+(i%n)*tileS, y+Math.floor(i/n)*tileS, tileS, tileS);
        ctx.strokeStyle='#1e293b'; ctx.lineWidth=n>5?0.2:0.5; ctx.strokeRect(x+(i%n)*tileS, y+Math.floor(i/n)*tileS, tileS, tileS);
    });
    drawF('U', offX+faceS+gap, offY);
    drawF('L', offX, offY+faceS+gap);
    drawF('F', offX+faceS+gap, offY+faceS+gap);
    drawF('R', offX+2*(faceS+gap), offY+faceS+gap);
    drawF('B', offX+3*(faceS+gap), offY+faceS+gap);
    drawF('D', offX+faceS+gap, offY+2*(faceS+gap));
}
// --- Tools & UI ---
window.toggleToolsMenu = (e) => { e.stopPropagation(); document.getElementById('toolsDropdown').classList.toggle('show'); };
window.selectTool = (tool) => {
    activeTool = tool;
    const isBlind = configs[currentEvent]?.cat === 'blind';
    document.getElementById('toolLabel').innerText = isBlind
        ? (currentLang === 'ko' ? '해당 없음(블라인드)' : 'N/A (Blind)')
        : (tool === 'scramble' ? (currentLang === 'ko' ? '스크램블 이미지' : 'Scramble Image') : (currentLang === 'ko' ? '그래프(추세)' : 'Graph (Trends)'));
    document.getElementById('visualizerWrapper').classList.toggle('hidden', tool !== 'scramble');
    document.getElementById('graphWrapper').classList.toggle('hidden', tool !== 'graph');
    document.querySelectorAll('.tool-option').forEach(opt => opt.classList.remove('active'));
    document.getElementById(`tool-opt-${tool}`).classList.add('active');
    document.getElementById('toolsDropdown').classList.remove('show');
    if (tool !== 'scramble') {
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    }
    if (tool === 'graph') renderHistoryGraph();
    else if (tool === 'scramble') {
        drawCube();
        updateScrambleDiagram();
    }
    scheduleLayout('tool');
};
window.addEventListener('click', () => { document.getElementById('toolsDropdown').classList.remove('show'); });
function renderHistoryGraph() {
    if (activeTool !== 'graph') return;
    const sid = getCurrentSessionId();
    const filtered = [...solves].filter(s => s.event === currentEvent && s.sessionId === sid).reverse();
    const polyline = document.getElementById('graphLine');
    if (filtered.length < 2) { polyline.setAttribute('points', ""); return; }
    const validTimes = filtered.map(s => s.penalty === 'DNF' ? null : (s.penalty === '+2' ? s.time + 2000 : s.time));
    const maxTime = Math.max(...validTimes.filter(t => t !== null));
    const minTime = Math.min(...validTimes.filter(t => t !== null));
    const range = maxTime - minTime || 1;
    const points = filtered.map((s, i) => {
        const t = s.penalty === 'DNF' ? maxTime : (s.penalty === '+2' ? s.time + 2000 : s.time);
        const x = (i / (filtered.length - 1)) * 100;
        const y = 90 - ((t - minTime) / range) * 80;
        return `${x},${y}`;
    }).join(' ');
    polyline.setAttribute('points', points);
}
function switchCategory(cat, autoSelectFirst = true) {
    if (isRunning) return;
    // Legacy tab UI is hidden by default. If it doesn't exist, just keep currentEvent as-is.
    const hasLegacy = document.querySelectorAll('.category-btn').length > 0 && document.getElementById('group-standard');
    if (!hasLegacy) return;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active', 'text-white'));
    const catBtn = document.getElementById(`cat-${cat}`); 
    if (catBtn) { 
        catBtn.classList.add('active', 'text-white'); 
        catBtn.classList.remove('text-slate-500', 'dark:text-slate-400');
    }
    const groups = ['standard', 'nonstandard', 'blind', 'practice'];
    groups.forEach(g => {
        const el = document.getElementById(`group-${g}`);
        if (g === cat) { el.classList.remove('hidden'); el.classList.add('flex'); }
        else { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    if (autoSelectFirst) {
        const targetGroup = document.getElementById(`group-${cat}`);
        const firstButton = targetGroup ? targetGroup.querySelector('button') : null;
        if (firstButton) changeEvent(firstButton.id.replace('tab-', ''));
    }
}
function changeEvent(e) {
  // Normalize incoming event id (guards against stray whitespace from HTML/select values)
  e = String(e || '').trim();
  ensureCaseSelectorDOM();
    if (isRunning) return;
    currentEvent = e;
    if (eventSelect && eventSelect.value !== e) eventSelect.value = e;
    const conf = configs[e];
    initSessionIfNeeded(e);
    // Practice UI (case selector)
    refreshPracticeUI();
    
    // Reset lazy loading on event change
    displayedSolvesCount = SOLVES_BATCH_SIZE;
    if(historyList) historyList.scrollTop = 0;
    // Legacy tab UI (hidden). Guard to avoid null refs.
    const legacyTabs = document.querySelectorAll('.event-tab');
    if (legacyTabs && legacyTabs.length) {
    document.querySelectorAll('.event-tab').forEach(t => {
        t.classList.remove('active', 'text-white', 'bg-blue-600');
        t.classList.add('text-slate-500', 'dark:text-slate-400');
    });
    const activeTab = document.getElementById(`tab-${e}`); 
    if (activeTab) {
        activeTab.classList.add('active', 'text-white', 'bg-blue-600');
        activeTab.classList.remove('text-slate-500', 'dark:text-slate-400');
    }
    }
    
    if (conf.cat === 'blind') {
        activeTool = 'graph'; 
        selectTool('graph');
    } else {
        if (activeTool === 'graph') selectTool('graph');
        else selectTool('scramble');
    }
    if (['666', '777', '333bf', '444bf', '555bf', '333mbf'].includes(e)) { 
        isAo5Mode = false; avgModeToggle.checked = false; 
    } else { 
        isAo5Mode = true; avgModeToggle.checked = true; 
    }
    if (currentEvent === '333mbf') {
        scrambleEl.classList.add('hidden');
        mbfInputArea.classList.remove('hidden');
        setScrambleLoadingState(false);
    } else {
        scrambleEl.classList.remove('hidden');
        mbfInputArea.classList.add('hidden');
        setScrambleLoadingState(true, 'Loading scramble…');
        clearScrambleDiagram();
        generateScramble(); 
    }
    
    updateUI(); timerEl.innerText = (0).toFixed(precision); saveData();
    scheduleLayout('event-change');
}

function clearScrambleDiagram() {
    // 이전 다이어그램/텍스트가 잠깐 보이는 문제 방지
    if (scrambleDiagram) {
        scrambleDiagram.classList.add('hidden');
        scrambleDiagram.removeAttribute('scramble');
    }
}

function setScrambleLoadingState(isLoading, message = 'Loading scramble…', showRetry = false) {
    // null guard: 일부 레이아웃/버전에서 요소가 없을 수 있음
    if (scrambleRetryBtn) {
        scrambleRetryBtn.classList.toggle('hidden', !showRetry);
    }
    if (scrambleLoadingRow) {
        scrambleLoadingRow.classList.toggle('hidden', !isLoading);
        scrambleLoadingRow.classList.toggle('flex', isLoading);
    }
    if (scrambleLoadingText) {
        scrambleLoadingText.innerText = message || 'Loading scramble…';
    }
    if (scrambleDiagramSkeleton) {
        scrambleDiagramSkeleton.classList.toggle('hidden', !isLoading);
    }
    if (isLoading) {
        lockTimerLayout();
        // 종목 변경/재생성 시 이전 내용 즉시 숨김
        if (scrambleEl) scrambleEl.innerText = '';
        clearScrambleDiagram();
        // Prevent blind-only message from sticking across events
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    }
    scheduleLayout(isLoading ? 'scramble-loading' : 'scramble-ready');
}

window.retryScramble = () => {
    if (isRunning) return;
    setScrambleLoadingState(true, 'Retrying…');
    if (typeof lastScrambleTrigger === 'function') {
        lastScrambleTrigger();
    } else {
        generateScramble();
    }
}
async function generate3bldScrambleText() {
    const conf = configs['333bf'];
    const cubingFn = window.__randomScrambleForEvent;
    if (currentEvent !== '666' && typeof cubingFn === 'function') {
        try {
            const alg = await cubingFn('333bf');
            return alg.toString();
        } catch (err) {
            console.warn('[CubeTimer] cubing.js 3BLD scramble failed, fallback.', err);
        }
    }
    let res = [];
    let last = "";
    for (let i = 0; i < conf.len; i++) {
        let m; do { m = conf.moves[Math.floor(Math.random() * conf.moves.length)]; } while (m[0] === last[0]);
        res.push(m + suffixes[Math.floor(Math.random() * 3)]); last = m;
    }
    const wideMoveCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < wideMoveCount; i++) {
        const wm = wideMoves[Math.floor(Math.random() * wideMoves.length)];
        const suf = suffixes[Math.floor(Math.random() * 3)];
        res.push(wm + suf);
    }
    return res.join(" ");
}
async function generateScramble() {
    const conf = configs[currentEvent];
    if (!conf || currentEvent === '333mbf') return;
    lastScrambleTrigger = () => generateScramble();
    const reqId = ++scrambleReqId;
    setScrambleLoadingState(true, 'Loading scramble…', false);
    // Practice scrambles (F2L/OLL/PLL/ZBLS/ZBLL) - do NOT affect normal events
    if (isPracticeEvent(currentEvent)) {
        try {
            const txt = await generatePracticeScrambleText();
            if (reqId !== scrambleReqId) return;
            currentScramble = String(txt || '').trim() || 'N/A';
            if (scrambleEl) scrambleEl.innerText = currentScramble;
            setScrambleLoadingState(false);
            updateScrambleDiagram();
            resetPenalty();
            if (activeTool === 'graph') renderHistoryGraph();
            return;
        } catch (err) {
            if (reqId !== scrambleReqId) return;
            console.warn('[CubeTimer] practice scramble failed. Falling back to 3x3.', err);
            // fallthrough to existing generator using 3x3
        }
    }
    // Prefer cubing.js (official random-state scrambles) when available.
    const cubingFn = window.__randomScrambleForEvent;
    if (typeof cubingFn === 'function' && currentEvent !== '666' && currentEvent !== 'clock') {
        try {
            const alg = await cubingFn(mapEventIdForCubing(currentEvent));
            if (reqId !== scrambleReqId) return; // stale
            currentScramble = alg.toString();
            if (scrambleEl) scrambleEl.innerText = currentScramble;
            setScrambleLoadingState(false);
            updateScrambleDiagram();
            resetPenalty();
            if (activeTool === 'graph') renderHistoryGraph();
            return;
            scheduleLayout('scramble-ready');
        } catch (err) {
            if (reqId !== scrambleReqId) return;
            console.warn('[CubeTimer] cubing.js scramble failed. Falling back to internal generator.', err);
        }
    }
    // Fallback: existing internal generator (keeps app usable offline)
    let res = [];
    if (currentEvent === 'minx') {
        for (let i = 0; i < 7; i++) {
            let line = [];
            for (let j = 0; j < 10; j++) {
                const type = (j % 2 === 0) ? "R" : "D";
                const suffix = (Math.random() < 0.5) ? "++" : "--";
                line.push(type + suffix);
            }
            line.push(Math.random() < 0.5 ? "U" : "U'");
            res.push(line.join(" "));
        }
        currentScramble = res.join("\n");
    } else if (currentEvent === 'clock') {
        // WCA-style Clock scramble formatting:
        // - First two tokens should be UR... DR...
        // - Use dial format like UR3+ / DR4- (number then sign)
        // - Include y2 and end with an ALL... token (no trailing pin-pattern tokens)
        const dialOrderFront = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
        const dialOrderBack  = ["U", "R", "D", "L", "ALL"];

        const fmt = (dial, v) => {
            const abs = Math.abs(v);
            return `${dial}${abs}${v >= 0 ? '+' : '-'}`;
        };

        dialOrderFront.forEach((dial) => {
            const v = Math.floor(Math.random() * 12) - 5; // -5..+6
            res.push(fmt(dial, v));
        });

        res.push("y2");

        dialOrderBack.forEach((dial) => {
            const v = Math.floor(Math.random() * 12) - 5; // -5..+6
            res.push(fmt(dial, v));
        });

        currentScramble = res.join(" ");
    } else if (currentEvent === 'sq1') {
        // NOTE: Internal SQ1 generator is kept only as a fallback.
        let topCuts = [true, false, true, true, false, true, true, false, true, true, false, true];
        let botCuts = [true, false, true, true, false, true, true, false, true, true, false, true];
        let movesCount = 0;
        let scrambleOps = [];
        const rotateArray = (arr, amt) => {
            const n = 12;
            let amount = amt % n;
            if (amount < 0) amount += n;
            const spliced = arr.splice(n - amount, amount);
            arr.unshift(...spliced);
        };
        let guard = 0;
        while (movesCount < 12 && guard < 5000) {
            guard++;
            let u = Math.floor(Math.random() * 12) - 5;
            let d = Math.floor(Math.random() * 12) - 5;
            if (u === 0 && d === 0) continue;
            let nextTop = [...topCuts];
            let nextBot = [...botCuts];
            rotateArray(nextTop, u);
            rotateArray(nextBot, d);
            if (nextTop[0] && nextTop[6] && nextBot[0] && nextBot[6]) {
                scrambleOps.push(`(${u},${d})`);
                let topRight = nextTop.slice(6, 12);
                let botRight = nextBot.slice(6, 12);
                let newTop = [...nextTop.slice(0, 6), ...botRight];
                let newBot = [...nextBot.slice(0, 6), ...topRight];
                topCuts = newTop;
                botCuts = newBot;
                scrambleOps.push("/");
                movesCount++;
            }
        }
        currentScramble = scrambleOps.join(" ");
    } else if (['pyra', 'skewb'].includes(currentEvent)) {
        let last = "";
        for (let i = 0; i < conf.len; i++) {
            let m;
            do { m = conf.moves[Math.floor(Math.random() * conf.moves.length)]; } while (m === last);
            res.push(m + (Math.random() < 0.5 ? "'" : ""));
            last = m;
        }
        if (currentEvent === 'pyra') {
            conf.tips.forEach(t => {
                const r = Math.floor(Math.random() * 3);
                if (r === 1) res.push(t);
                else if (r === 2) res.push(t + "'");
            });
        }
        currentScramble = res.join(" ");
    } else {
        let lastAxis = -1;
        let secondLastAxis = -1;
        let lastMoveBase = "";
        const getMoveAxis = (m) => {
            const c = m[0];
            if ("UD".includes(c)) return 0;
            if ("LR".includes(c)) return 1;
            if ("FB".includes(c)) return 2;
            return -1;
        };
        for (let i = 0; i < conf.len; i++) {
            let move, axis, base;
            let valid = false;
            while (!valid) {
                move = conf.moves[Math.floor(Math.random() * conf.moves.length)];
                axis = getMoveAxis(move);
                base = move[0];
                if (base === lastMoveBase) { valid = false; continue; }
                if (axis !== -1 && axis === lastAxis && axis === secondLastAxis) { valid = false; continue; }
                valid = true;
            }
            res.push(move + suffixes[Math.floor(Math.random() * 3)]);
            secondLastAxis = lastAxis;
            lastAxis = axis;
            lastMoveBase = base;
        }
        if (currentEvent === '333bf') {
            const wideMoveCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < wideMoveCount; i++) {
                const wm = wideMoves[Math.floor(Math.random() * wideMoves.length)];
                const suf = suffixes[Math.floor(Math.random() * 3)];
                res.push(wm + suf);
            }
        } else if (conf.cat === 'blind') {
            res.push(orientations[Math.floor(Math.random() * orientations.length)]);
            if (Math.random() > 0.5) res.push(orientations[Math.floor(Math.random() * orientations.length)]);
        }
        currentScramble = res.join(" ");
    }
    if (reqId !== scrambleReqId) return; // stale
    if (scrambleEl) scrambleEl.innerText = currentScramble;
    setScrambleLoadingState(false);
    updateScrambleDiagram();
    resetPenalty();
    if (activeTool === 'graph') renderHistoryGraph();
    scheduleLayout('scramble-ready');
}
function updateScrambleDiagram() {
    if (!scrambleDiagram) return;
    const conf = configs[currentEvent];
    const isBlind = conf && conf.cat === 'blind';
    // Message should only be shown in Scramble Image tool.
    if (activeTool !== 'scramble') {
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
        return;
    }
    if (isBlind) {
        scrambleDiagram.classList.add('hidden');
        if (noVisualizerMsg) {
            noVisualizerMsg.classList.remove('hidden');
            noVisualizerMsg.innerText = (currentLang === 'ko')
                ? '블라인드 종목에서는 스크램블 이미지가 비활성화됩니다'
                : 'Scramble images disabled for Blind';
        }
        return;
    }
    if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    scrambleDiagram.classList.remove('hidden');
    // scramble-display auto-updates when attributes change.
    scrambleDiagram.setAttribute('event', mapEventIdForCubing(currentEvent));
    const _scr = String(currentScramble || '').replace(/\n/g, ' ');
    const _diagScr = isPracticeEvent(currentEvent) ? _practiceAlgForDiagram(_scr) : _scr;
    scrambleDiagram.setAttribute('scramble', _diagScr);
}
window.generateMbfScrambles = async () => {
    const count = parseInt(mbfCubeInput.value);
    if (!count || count < 2 || count > 100) return;
    const listContainer = document.getElementById('mbfScrambleList');
    document.getElementById('mbfCubeCountDisplay').innerText = `${count} Cubes`;
    listContainer.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        const scr = await generate3bldScrambleText();
        listContainer.innerHTML += `
            <div class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px] font-bold">#${i}</span>
                    <span class="text-[10px] font-black uppercase text-slate-400">Scramble</span>
                </div>
                <p class="font-bold text-slate-600 dark:text-slate-300 leading-relaxed scramble-text">${scr}</p>
            </div>`;
    }
    document.getElementById('mbfScrambleOverlay').classList.add('active');
    currentScramble = `Multi-Blind (${count} Cubes Attempt)`;
};
window.closeMbfScrambleModal = () => document.getElementById('mbfScrambleOverlay').classList.remove('active');
window.copyMbfText = () => {
    const texts = Array.from(document.querySelectorAll('.scramble-text')).map((el, i) => `${i+1}. ${el.innerText}`).join('\n\n');
    const countText = document.getElementById('mbfCubeCountDisplay').innerText;
    const fullText = `[CubeTimer] Multi-Blind Scrambles (${countText})\n\n${texts}`;
    const textArea = document.createElement("textarea"); textArea.value = fullText; document.body.appendChild(textArea); textArea.select();
    document.execCommand('copy'); document.body.removeChild(textArea);
    const btn = document.querySelector('[onclick="copyMbfText()"]');
    const original = btn.innerText; btn.innerText = "Copied!"; setTimeout(() => btn.innerText = original, 2000);
};

function formatClockTime(ms) {
    if (ms == null || isNaN(ms)) return '-';
    const totalSec = Math.round(ms / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const hr = Math.floor(totalMin / 60);
    const pad = (n) => String(n).padStart(2, '0');
    if (hr > 0) return `${hr}:${pad(min)}:${pad(sec)}`;
    return `${min}:${pad(sec)}`;
}

function parseClockTimeToMs(str) {
    // Accept: ss, mm:ss, hh:mm:ss
    const s = String(str || '').trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
        // seconds (allow decimal)
        return Math.round(parseFloat(s) * 1000);
    }
    const parts = s.split(':').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 3) return null;
    const nums = parts.map(p => ( /^\d+(\.\d+)?$/.test(p) ? parseFloat(p) : NaN));
    if (nums.some(n => isNaN(n))) return null;
    let hr = 0, min = 0, sec = 0;
    if (nums.length === 2) {
        [min, sec] = nums;
    } else {
        [hr, min, sec] = nums;
    }
    if (sec < 0 || sec >= 60 || min < 0 || min >= 60 || hr < 0) return null;
    return Math.round(((hr * 3600) + (min * 60) + sec) * 1000);
}

window.openMbfResultModal = ({ defaultTimeMs } = {}) => {
    const overlay = document.getElementById('mbfResultOverlay');
    if (!overlay) return;
    const attemptedEl = document.getElementById('mbfAttemptedInput');
    const solvedEl = document.getElementById('mbfSolvedInput');
    const timeEl = document.getElementById('mbfTimeInput');
    const errEl = document.getElementById('mbfResultError');
    if (errEl) { errEl.classList.add('hidden'); errEl.innerText = ''; }

    // Draft 생성 (Save 버튼을 누를 때 실제 solve로 저장)
    pendingMbfDraft = {
        id: Date.now(),
        event: '333mbf',
        sessionId: getCurrentSessionId(),
        date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, ""),
        scramble: currentScramble || 'Multi-Blind',
        time: (defaultTimeMs != null ? defaultTimeMs : null),
        penalty: null,
        mbf: {
            attempted: null,
            solved: null,
            timeMs: (defaultTimeMs != null ? defaultTimeMs : null),
            resultText: ''
        }
    };

    // 기본값: mbfCubeInput이 있으면 attempted에 반영
    const defaultAttempted = parseInt(mbfCubeInput?.value);
    if (attemptedEl) attemptedEl.value = Number.isFinite(defaultAttempted) ? String(defaultAttempted) : '';
    if (solvedEl) solvedEl.value = '';
    if (timeEl) timeEl.value = defaultTimeMs != null ? formatClockTime(defaultTimeMs) : '';

    overlay.classList.add('active');
    // focus (모바일)
    setTimeout(() => { attemptedEl?.focus?.(); }, 50);
}
window.closeMbfResultModal = () => {
    const overlay = document.getElementById('mbfResultOverlay');
    if (overlay) overlay.classList.remove('active');
    pendingMbfDraft = null;
    statusHint.innerText = isBtConnected ? "Ready (Bluetooth)" : (isInspectionMode ? "Start Inspection" : "Hold to Ready");
}
window.saveMbfResult = () => {
    const errEl = document.getElementById('mbfResultError');
    const attemptedEl = document.getElementById('mbfAttemptedInput');
    const solvedEl = document.getElementById('mbfSolvedInput');
    const timeEl = document.getElementById('mbfTimeInput');
    const attempted = parseInt(attemptedEl?.value);
    const solved = parseInt(solvedEl?.value);
    const timeMs = parseClockTimeToMs(timeEl?.value);

    const fail = (msg) => {
        if (!errEl) return;
        errEl.innerText = msg;
        errEl.classList.remove('hidden');
    };
    if (!pendingMbfDraft) return fail('저장할 MBF 기록이 없습니다.');
    if (!Number.isFinite(attempted) || attempted < 1) return fail('Attempted는 1 이상이어야 합니다.');
    if (!Number.isFinite(solved) || solved < 0) return fail('Solved는 0 이상이어야 합니다.');
    if (solved > attempted) return fail('Solved는 Attempted를 초과할 수 없습니다.');
    if (timeMs == null) return fail('Time 형식이 올바르지 않습니다. 예) 12:34 또는 1:02:03');

    pendingMbfDraft.mbf.attempted = attempted;
    pendingMbfDraft.mbf.solved = solved;
    pendingMbfDraft.mbf.timeMs = timeMs;
    pendingMbfDraft.mbf.resultText = `${solved}/${attempted} ${formatClockTime(timeMs)}`;
    // 대표 time 필드는 mbf.timeMs로 통일
    pendingMbfDraft.time = timeMs;

    solves.unshift(pendingMbfDraft);
    pendingMbfDraft = null;
    closeMbfResultModal();
    updateUI();
    saveData();
}
// [UPDATED] Format Time to support Minutes:Seconds format
function formatTime(ms) { 
    const minutes = Math.floor(ms / 60000);
    const remainingMs = ms % 60000;
    let seconds;
    if (precision === 3) {
        seconds = (remainingMs / 1000).toFixed(3);
    } else {
        // For 2 decimals, we ignore the last digit (truncate)
        seconds = (Math.floor(remainingMs / 10) / 100).toFixed(2);
    }
    if (minutes > 0) {
        // Add leading zero if seconds is less than 10 (e.g. 1:05.43)
        if (parseFloat(seconds) < 10) {
            seconds = "0" + seconds;
        }
        return `${minutes}:${seconds}`;
    }
    return seconds;
} 
// Updated UpdateUI with Lazy Loading support
function updateUI() {
    const sid = getCurrentSessionId();
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);

    const activeSession = (sessions[currentEvent] || []).find(s => s.isActive);
    if (activeSession) {
        const el = document.getElementById('currentSessionNameDisplay');
        if (el) el.innerText = activeSession.name;
    }

    // Lazy Render
    const subset = filtered.slice(0, displayedSolvesCount);

    const solvePrimaryText = (s) => {
        if (s.event === '333mbf' && s.mbf) {
            return s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        }
        const base = (s.penalty === 'DNF')
            ? 'DNF'
            : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time);
        return `${base}${s.penalty === '+2' ? '+' : ''}`;
    };

    historyList.innerHTML = subset.map(s => `
        <div class="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all" onclick="showSolveDetails(${s.id})">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">${solvePrimaryText(s)}</span>
            <div class="flex items-center gap-2">
                ${s.event === '333mbf' ? '' : `
                    <button class="history-pen-btn ${s.penalty === '+2' ? 'active-plus2' : ''}" onclick="event.stopPropagation(); toggleSolvePenalty(${s.id}, '+2')">+2</button>
                    <button class="history-pen-btn ${s.penalty === 'DNF' ? 'active-dnf' : ''}" onclick="event.stopPropagation(); toggleSolvePenalty(${s.id}, 'DNF')">DNF</button>
                `}
                <button onclick="event.stopPropagation(); deleteSolve(${s.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 font-black text-lg leading-none" aria-label="Delete">&times;</button>
            </div>
        </div>
    `).join('') || '<div class="text-center py-10 text-slate-300 text-[11px] italic">No solves yet</div>';

    solveCountEl.innerText = filtered.length;

    // Stats
    if (currentEvent === '333mbf') {
        labelPrimaryAvg.innerText = "-";
        displayPrimaryAvg.innerText = "-";
        displayAo12.innerText = "-";
        sessionAvgEl.innerText = "-";
        bestSolveEl.innerText = "-";
        if (activeTool === 'graph') renderHistoryGraph();
        return;
    }

    if (isAo5Mode) {
        labelPrimaryAvg.innerText = "Ao5";
        displayPrimaryAvg.innerText = calculateAvg(filtered, 5);
    } else {
        labelPrimaryAvg.innerText = "Mo3";
        displayPrimaryAvg.innerText = calculateAvg(filtered, 3, true);
    }
    displayAo12.innerText = calculateAvg(filtered, 12);

    const valid = filtered
        .filter(s => s.penalty !== 'DNF')
        .map(s => s.penalty === '+2' ? s.time + 2000 : s.time);

    sessionAvgEl.innerText = valid.length
        ? formatTime(valid.reduce((a, b) => a + b, 0) / valid.length)
        : "-";

    bestSolveEl.innerText = valid.length
        ? formatTime(Math.min(...valid))
        : "-";

    if (activeTool === 'graph') renderHistoryGraph();
}


// Infinite Scroll Event Listener
historyList.addEventListener('scroll', () => {
    if (historyList.scrollTop + historyList.clientHeight >= historyList.scrollHeight - 50) {
        // Near bottom
        const sid = getCurrentSessionId();
        const total = solves.filter(s => s.event === currentEvent && s.sessionId === sid).length;
        if (displayedSolvesCount < total) {
            displayedSolvesCount += SOLVES_BATCH_SIZE;
            updateUI(); // Re-render with more items
        }
    }
});
// Extended Stats Modal Logic
window.showExtendedStats = () => {
    // If Settings is open, close it before showing stats
    try {
        const _so = document.getElementById('settingsOverlay');
        if (_so && _so.classList.contains('active')) closeSettings();
    } catch (e) {}

    const sid = getCurrentSessionId();
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    
    const ao25 = calculateAvg(filtered, 25);
    const ao50 = calculateAvg(filtered, 50);
    const ao100 = calculateAvg(filtered, 100);
    
    const content = document.getElementById('statsContent');
    content.innerHTML = `
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Current Ao25</span>
            <span class="text-lg font-bold text-slate-700 dark:text-white">${ao25}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Current Ao50</span>
            <span class="text-lg font-bold text-slate-700 dark:text-white">${ao50}</span>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Current Ao100</span>
            <span class="text-lg font-bold text-slate-700 dark:text-white">${ao100}</span>
        </div>
    `;
    document.getElementById('statsOverlay').classList.add('active');
}
window.closeStatsModal = () => document.getElementById('statsOverlay').classList.remove('active');
function calculateAvg(list, count, mean=false) {
    if(list.length < count) return "-";
    let slice = list.slice(0, count); let dnfC = slice.filter(s=>s.penalty==='DNF').length;
    
    // Trim logic: Best 5% and Worst 5% removal for large averages
    let removeCount = Math.ceil(count * 0.05); // 5%
    if (count <= 12) removeCount = 1; 
    if(dnfC >= removeCount + (mean?0:1)) return "DNF"; 
    // Work in milliseconds so averages keep mm:ss.xx formatting consistently
    let nums = slice.map(s => s.penalty==='DNF'?Infinity:(s.penalty==='+2'?s.time+2000:s.time));
    if(mean) {
        const sum = nums.reduce((a,b)=>a+b,0);
        const avgMs = sum / count;
        return formatTime(avgMs);
    }
    
    nums.sort((a,b)=>a-b); 
    // Remove outliers
    for(let i=0; i<removeCount; i++) { nums.pop(); nums.shift(); }
    
    const avgMs = nums.reduce((a,b)=>a+b,0)/nums.length;
    return formatTime(avgMs);
}
// --- Interaction Logic with configurable Hold Time ---
function handleStart(e) {
    // [FIX] Ignore touches on interactive elements like badges or buttons
    // This allows clicking on stats/settings without triggering the timer
    // Also ensuring e exists and checking target only for non-keyboard events to prevent errors or blocks
    if (e && e.type !== 'keydown' && e.target && (e.target.closest('.avg-badge') || e.target.closest('button') || e.target.closest('.tools-dropdown'))) return;
    if (isBtConnected && !isInspectionMode) return; 
    
    if(e && e.cancelable) e.preventDefault();
    if(isManualMode || isRunning) { if(isRunning) stopTimer(); return; }
    
    // Inspection Logic Handling
    if (isInspectionMode && inspectionState === 'none') {
        // Space pressed in Idle with inspection ON: Do nothing (wait for release to start inspection)
        return;
    }
    if (isInspectionMode && inspectionState === 'inspecting') {
        // BT 연결 시에는 키보드로 'Ready' 상태 진입 불가 (오직 간 타이머 핸즈온으로만 가능)
        if (isBtConnected) return;
        // Pressed during inspection -> Ready to solve
        timerEl.style.color = '#ef4444'; 
        timerEl.classList.add('holding-status');
        holdTimer = setTimeout(()=> { 
            isReady=true; 
            timerEl.style.color = '#10b981'; 
            timerEl.classList.replace('holding-status','ready-to-start'); 
            statusHint.innerText="Ready!"; 
        }, holdDuration); 
        return;
    }
    // Standard Logic (BT 연결 시 여기 도달 안함)
    timerEl.style.color = '#ef4444'; 
    timerEl.classList.add('holding-status');
    
    holdTimer = setTimeout(()=> { 
        isReady=true; 
        timerEl.style.color = '#10b981'; 
        timerEl.classList.replace('holding-status','ready-to-start'); 
        statusHint.innerText="Ready!"; 
    }, holdDuration); 
}
function handleEnd(e) {
    // Allow taps on UI controls inside the interactive area (avg badges, buttons, dropdown)
    // to behave like normal clicks on mobile (iOS can cancel the click if we preventDefault on touchend).
    if (e && e.type !== 'keydown' && e.target && (e.target.closest('.avg-badge') || e.target.closest('button') || e.target.closest('.tools-dropdown'))) return;

    // [CRITICAL FIX] Prevent immediate inspection restart after stopping timer
    if (Date.now() - lastStopTimestamp < 500) return;
    // BT 모드일 때
    if (isBtConnected) {
        if (isInspectionMode && inspectionState === 'none') {
             // BT 연결되어 있어도 인스펙션 모드라면 스페이스바 뗄 때 인스펙션 시작 허용
             startInspection(); 
        }
        // BT 모드에서는 키보드 뗄 때 절대 startTimer() 호출 금지
        return; 
    }
    if(e && e.cancelable) e.preventDefault();
    clearTimeout(holdTimer);
    if (isManualMode) return;
    // Inspection Mode: Start Countdown on Release if Idle
    if (isInspectionMode && !isRunning && inspectionState === 'none') {
        startInspection();
        return;
    }
    if(!isRunning && isReady) {
        startTimer();
    } else { 
        // Reset color logic for dark mode
        timerEl.style.color = ''; 
        
        timerEl.classList.remove('holding-status','ready-to-start'); 
        isReady=false; 
        // If inspecting, don't reset to "Hold to Ready"
        if (!isInspectionMode || inspectionState === 'none') {
            statusHint.innerText= isInspectionMode ? "Start Inspection" : "Hold to Ready";
        } else {
            // Returned to inspecting state without starting
            timerEl.style.color = '#ef4444'; 
        }
    }
}
window.openSessionModal = () => { document.getElementById('sessionOverlay').classList.add('active'); renderSessionList(); };
window.closeSessionModal = () => { document.getElementById('sessionOverlay').classList.remove('active'); document.getElementById('newSessionName').value = ""; editingSessionId = null; };
// ... (Session Management Functions - Logic Preserved) ...
function renderSessionList() {
    const listContainer = document.getElementById('sessionList');
    const eventSessions = sessions[currentEvent] || [];
    document.getElementById('sessionCountLabel').innerText = `${eventSessions.length}/10`;
    listContainer.innerHTML = eventSessions.map(s => {
        if (editingSessionId === s.id) {
            return `<div class="flex items-center gap-2"><input type="text" id="editSessionInput" value="${s.name}" class="flex-1 bg-white dark:bg-slate-800 border border-blue-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white" autofocus onkeydown="if(event.key==='Enter') saveSessionName(${s.id})" onblur="saveSessionName(${s.id})"><button onclick="saveSessionName(${s.id})" class="p-2 text-blue-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button></div>`;
        }
        return `<div class="flex items-center gap-2 group"><div class="flex-1 flex items-center gap-2 p-1 rounded-xl border ${s.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'} hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"><button onclick="switchSession(${s.id})" class="flex-1 text-left p-2.5 text-xs font-bold truncate">${s.name}</button><button onclick="editSessionName(${s.id})" class="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>${eventSessions.length > 1 ? `<button onclick="deleteSession(${s.id})" class="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>` : ''}</div>`;
    }).join('');
    if (editingSessionId) document.getElementById('editSessionInput').focus();
    document.getElementById('sessionCreateForm').classList.toggle('hidden', eventSessions.length >= 10);
}
// ... (Remaining window functions - Logic Preserved) ...
window.editSessionName = (id) => { editingSessionId = id; renderSessionList(); };
window.saveSessionName = (id) => { const input = document.getElementById('editSessionInput'); if (!input) return; const newName = input.value.trim(); if (newName) { const s = sessions[currentEvent].find(x => x.id === id); if (s) s.name = newName; } editingSessionId = null; renderSessionList(); updateUI(); saveData(); };
window.createNewSession = () => { const nameInput = document.getElementById('newSessionName'); const name = nameInput.value.trim() || `Session ${sessions[currentEvent].length + 1}`; if (sessions[currentEvent].length >= 10) return; sessions[currentEvent].forEach(s => s.isActive = false); sessions[currentEvent].push({ id: Date.now(), name: name, isActive: true }); nameInput.value = ""; renderSessionList(); updateUI(); saveData(); timerEl.innerText = (0).toFixed(precision); resetPenalty(); };
window.switchSession = (id) => { sessions[currentEvent].forEach(s => s.isActive = (s.id === id)); renderSessionList(); updateUI(); saveData(); timerEl.innerText = (0).toFixed(precision); resetPenalty(); closeSessionModal(); };
window.deleteSession = (id) => { const eventSessions = sessions[currentEvent]; if (!eventSessions || eventSessions.length <= 1) return; const targetIdx = eventSessions.findIndex(s => s.id === id); if (targetIdx === -1) return; const wasActive = eventSessions[targetIdx].isActive; sessions[currentEvent] = eventSessions.filter(s => s.id !== id); solves = solves.filter(s => !(s.event === currentEvent && s.sessionId === id)); if (wasActive && sessions[currentEvent].length > 0) sessions[currentEvent][0].isActive = true; renderSessionList(); updateUI(); saveData(); };
window.openAvgShare = (type) => {
    const sid = getCurrentSessionId();
    const count = (type === 'primary') ? (isAo5Mode ? 5 : 3) : 12;
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    if (filtered.length < count) return;
    const list = filtered.slice(0, count);
    const avgValue = calculateAvg(filtered, count, (type === 'primary' && !isAo5Mode));

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = (type === 'primary' && !isAo5Mode)
        ? (currentLang === 'ko' ? 'Mo3 :' : 'Mean of 3 :')
        : (currentLang === 'ko' ? `Ao${count} :` : `Average of ${count} :`);
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = list.map((s, idx) => `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">${count - idx}.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${s.penalty==='DNF'?'DNF':formatTime(s.penalty==='+2'?s.time+2000:s.time)}${s.penalty==='+2'?'+':''}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${s.scramble}</span></div></div>`).reverse().join('');

    document.getElementById('avgShareOverlay').classList.add('active');
};
window.openSingleShare = () => {
    const s = solves.find(x => x.id === selectedSolveId);
    if (!s) return;
    closeModal();
    const dateStr = s.date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;
    document.getElementById('shareLabel').innerText = (currentLang === 'ko') ? '싱글 :' : 'Single :';
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'single';
        overlay.dataset.shareCount = '';
    }

    const listContainer = document.getElementById('shareList');
    if (s.event === '333mbf' && s.mbf) {
        const res = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        document.getElementById('shareAvg').innerText = res;
        listContainer.innerHTML = `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">1.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${res}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${(s.scramble || '').toString()}</span></div></div>`;
    } else {
        const res = (s.penalty==='DNF') ? 'DNF' : (formatTime(s.penalty==='+2'?s.time+2000:s.time) + (s.penalty==='+2'?'+':''));
        document.getElementById('shareAvg').innerText = res;
        listContainer.innerHTML = `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">1.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${s.penalty==='DNF'?'DNF':formatTime(s.penalty==='+2'?s.time+2000:s.time)}${s.penalty==='+2'?'+':''}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${s.scramble}</span></div></div>`;
    }
    document.getElementById('avgShareOverlay').classList.add('active');
};
window.closeAvgShare = () => document.getElementById('avgShareOverlay').classList.remove('active');
window.copyShareText = () => {
    const date = document.getElementById('shareDate').innerText;
    const avgLabel = document.getElementById('shareLabel').innerText;
    const avgVal = document.getElementById('shareAvg').innerText;
    const overlay = document.getElementById('avgShareOverlay');
    const mode = overlay?.dataset?.shareMode || '';
    const count = parseInt(overlay?.dataset?.shareCount || '0', 10);

    const isSingle = mode === 'single';
    let text = `[CubeTimer]\n\n${date}\n\n${avgLabel} ${avgVal}\n\n`;

    if (isSingle) {
        const s = solves.find(x => x.id === selectedSolveId);
        if (s) text += `1. ${avgVal}   ${s.scramble}\n`;
    } else {
        const n = (Number.isFinite(count) && count > 0) ? count : 12;
        const sid = getCurrentSessionId();
        const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid).slice(0, n);
        filtered.reverse().forEach((s, i) => {
            text += `${i + 1}. ${s.penalty === 'DNF' ? 'DNF' : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}   ${s.scramble}\n`;
        });
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        const btn = document.querySelector('[onclick="copyShareText()"]');
        const original = btn.innerHTML;
        btn.innerHTML = (currentLang === 'ko') ? '복사됨!' : 'Copied!';
        btn.classList.add('bg-green-600');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('bg-green-600');
            try { applyAutoI18n(document); } catch (_) {}
        }, 2000);
    } catch (err) {
        console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
};
window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    const isTypingTarget = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // If editing something, don't hijack keyboard (except manual input submit)
    if (editingSessionId || isTypingTarget) {
        if (e.code === 'Enter' && document.activeElement === manualInput) {
            // allow manual submit below
        } else {
            return;
        }
    }

    if (e.code === 'Space') {
        // Prevent default always, including key repeat, to stop page scrolling.
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) handleStart(e);
        return;
    }

    if (isManualMode && e.code === 'Enter') {
        let v = parseFloat(manualInput.value);
        if (v > 0) {
            solves.unshift({
                id: Date.now(),
                time: v * 1000,
                scramble: currentScramble,
                event: currentEvent,
                sessionId: getCurrentSessionId(),
                penalty: null,
                date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "")
            });
            manualInput.value = "";
            updateUI();
            generateScramble();
            saveData();
        }
    }
}, { capture: true });

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!editingSessionId) handleEnd(e);
    }
}, { capture: true });
const interactiveArea = document.getElementById('timerInteractiveArea');
interactiveArea.addEventListener('touchstart', handleStart, { passive: false });
interactiveArea.addEventListener('touchend', handleEnd, { passive: false });
// [UPDATED] Toggle Settings: Acts as open/close toggle
window.openSettings = () => { 
    if (isRunning) return;
    const overlay = document.getElementById('settingsOverlay');
    if (overlay.classList.contains('active')) {
        closeSettings();
    } else {
        overlay.classList.add('active'); 
        setTimeout(()=>document.getElementById('settingsModal').classList.remove('scale-95','opacity-0'), 10); 
    }
};
window.closeSettings = () => { document.getElementById('settingsModal').classList.add('scale-95','opacity-0'); setTimeout(()=>document.getElementById('settingsOverlay').classList.remove('active'), 200); saveData(); };
window.handleOutsideSettingsClick = (e) => { if(e.target === document.getElementById('settingsOverlay')) closeSettings(); };
window.showSolveDetails = (id) => {
    const s = solves.find(x => x.id === id);
    if (!s) return;
    selectedSolveId = id;
    const timeEl = document.getElementById('modalTime');
    const eventEl = document.getElementById('modalEvent');
    const scrEl = document.getElementById('modalScramble');
    const overlay = document.getElementById('modalOverlay');
    const useBtn = document.querySelector('[onclick="useThisScramble()"]');

    if (s.event === '333mbf' && s.mbf) {
        if (timeEl) timeEl.innerText = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        if (eventEl) eventEl.innerText = '333mbf';
        if (scrEl) scrEl.innerText = (s.scramble || '').toString();
        if (useBtn) useBtn.classList.add('hidden');
    } else {
        const base = (s.penalty === 'DNF') ? 'DNF' : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time);
        if (timeEl) timeEl.innerText = `${base}${s.penalty === '+2' ? '+' : ''}`;
        if (eventEl) eventEl.innerText = s.event;
        if (scrEl) scrEl.innerText = s.scramble;
        if (useBtn) useBtn.classList.remove('hidden');
    }

    if (overlay) overlay.classList.add('active');
};
window.closeModal = () => document.getElementById('modalOverlay').classList.remove('active');
window.useThisScramble = () => { let s=solves.find(x=>x.id===selectedSolveId); if(s){currentScramble=s.scramble; scrambleEl.innerText=currentScramble; closeModal();} };
precisionToggle.onchange = e => { precision = e.target.checked?3:2; updateUI(); timerEl.innerText=(0).toFixed(precision); saveData(); };
avgModeToggle.onchange = e => { isAo5Mode = e.target.checked; updateUI(); saveData(); };
manualEntryToggle.onchange = e => { isManualMode = e.target.checked; timerEl.classList.toggle('hidden', isManualMode); manualInput.classList.toggle('hidden', !isManualMode); statusHint.innerText = isManualMode ? (currentLang === 'ko' ? '시간 입력 후 Enter' : 'Type time & Enter') : t('holdToReady'); };
document.getElementById('clearHistoryBtn').onclick = () => {
  const sid = getCurrentSessionId();
  const msg = 'Clear all history for this session?';
  const customConfirm = document.createElement('div');
  customConfirm.id = 'clearConfirmModal';
  customConfirm.innerHTML = `<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div class="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-xs shadow-2xl"><p class="text-sm font-bold text-slate-700 dark:text-white mb-6 text-center">${msg}</p><div class="flex gap-2"><button id="cancelClear" class="flex-1 py-3 text-slate-400 font-bold text-sm">Cancel</button><button id="confirmClear" class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Clear All</button></div></div></div>`;
  document.body.appendChild(customConfirm);
  try { applyAutoI18n(customConfirm); } catch (_) {}
  document.getElementById('cancelClear').onclick = () => {
    document.body.removeChild(document.getElementById('clearConfirmModal'));
  };
  document.getElementById('confirmClear').onclick = () => {
    solves = solves.filter(s => !(s.event === currentEvent && s.sessionId === sid));
    updateUI();
    saveData();
    document.body.removeChild(document.getElementById('clearConfirmModal'));
    timerEl.innerText = (0).toFixed(precision);
    resetPenalty();
  };
};

/* =========================
   Theme Settings (Light mode only)
   - Dark mode is not modified
   ========================= */
const THEME_STORAGE_KEY = 'cubeTimerLightThemeV1';
const LIGHT_THEME_DEFAULTS = {
  accent: [59, 130, 246],      // #3B82F6
  bg: [248, 250, 252],         // #F8FAFC
  card: [255, 255, 255],       // #FFFFFF
  text: [15, 23, 42],          // #0F172A
  scramble: [255, 255, 255],   // #FFFFFF
};

let lightTheme = structuredClone(LIGHT_THEME_DEFAULTS);

function clamp255(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(255, Math.max(0, Math.round(x)));
}

function rgbToHex([r, g, b]) {
  const to = (v) => v.toString(16).padStart(2, '0').toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

function loadLightTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return structuredClone(LIGHT_THEME_DEFAULTS);
    const parsed = JSON.parse(raw);
    const next = {};
    for (const k of Object.keys(LIGHT_THEME_DEFAULTS)) {
      const v = parsed?.[k];
      if (Array.isArray(v) && v.length === 3) {
        next[k] = [clamp255(v[0]), clamp255(v[1]), clamp255(v[2])];
      } else {
        next[k] = structuredClone(LIGHT_THEME_DEFAULTS[k]);
      }
    }
    return next;
  } catch (_) {
    return structuredClone(LIGHT_THEME_DEFAULTS);
  }
}

function saveLightTheme() {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(lightTheme));
  } catch (_) {}
}

function applyLightTheme() {
  const root = document.documentElement;
  const setRGB = (name, rgb) => {
    root.style.setProperty(name, `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
  };
  setRGB('--ct-accent-rgb', lightTheme.accent);
  setRGB('--ct-bg-rgb', lightTheme.bg);
  setRGB('--ct-card-rgb', lightTheme.card);
  setRGB('--ct-text-rgb', lightTheme.text);
  setRGB('--ct-scramble-rgb', lightTheme.scramble);
}

/* =========================
   HSV Color Picker (Theme)
   - Replaces RGB sliders
   - Light mode only (dark mode is not modified)
   ========================= */

function rgbToHsv([r, g, b]) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rr = 0, gg = 0, bb = 0;
  if (h >= 0 && h < 60) { rr = c; gg = x; bb = 0; }
  else if (h < 120) { rr = x; gg = c; bb = 0; }
  else if (h < 180) { rr = 0; gg = c; bb = x; }
  else if (h < 240) { rr = 0; gg = x; bb = c; }
  else if (h < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }
  return [
    clamp255((rr + m) * 255),
    clamp255((gg + m) * 255),
    clamp255((bb + m) * 255),
  ];
}

function partLabel(part) {
  return ({
    accent: 'Accent',
    bg: 'Background',
    card: 'Panels',
    text: 'Text',
    scramble: 'Scramble Box',
  })[part] || 'Color';
}

function syncThemeRowsUI() {
  const map = {
    accent: 'Accent',
    bg: 'Bg',
    card: 'Card',
    text: 'Text',
    scramble: 'Scramble',
  };
  for (const [part, suf] of Object.entries(map)) {
    const rgb = lightTheme[part];
    if (!rgb) continue;
    const dot = document.getElementById(`themeRow${suf}Dot`);
    const hexEl = document.getElementById(`themeRow${suf}Hex`);
    if (dot) dot.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    if (hexEl) hexEl.textContent = rgbToHex(rgb);
  }
}

window.resetAllThemeLight = () => {
  lightTheme = structuredClone(LIGHT_THEME_DEFAULTS);
  applyLightTheme();
  saveLightTheme();
  syncThemeRowsUI();
};

// Picker state
const themePickerState = {
  part: null,
  prevRgb: null,
  hsv: { h: 200, s: 0.4, v: 1 },
  dragging: null, // 'sv' | 'hue'
};

function getCanvasPos(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = Math.min(r.width, Math.max(0, clientX - r.left));
  const y = Math.min(r.height, Math.max(0, clientY - r.top));
  // map to canvas internal pixels
  return {
    x: x * (canvas.width / r.width),
    y: y * (canvas.height / r.height),
    w: canvas.width,
    h: canvas.height,
  };
}

function drawHue(canvas, hue) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (let i = 0; i <= 360; i += 60) {
    grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
  }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // indicator line
  const y = (hue / 360) * h;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(1, y - 2, w - 2, 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, y - 2, w - 2, 4);
}

function drawSV(canvas, hsv) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  // base hue
  ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
  ctx.fillRect(0, 0, w, h);

  // white overlay (saturation)
  const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
  whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
  whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = whiteGrad;
  ctx.fillRect(0, 0, w, h);

  // black overlay (value)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
  blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
  blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = blackGrad;
  ctx.fillRect(0, 0, w, h);

  // picker circle
  const x = hsv.s * w;
  const y = (1 - hsv.v) * h;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 8.5, 0, Math.PI * 2);
  ctx.stroke();
}

function setPickerUIFromHsv() {
  const rgb = hsvToRgb(themePickerState.hsv);
  // live apply
  if (themePickerState.part && lightTheme[themePickerState.part]) {
    lightTheme[themePickerState.part] = rgb;
    applyLightTheme();
    saveLightTheme();
  }

  const dot = document.getElementById('themePickerDot');
  const hexEl = document.getElementById('themePickerHex');
  const rgbEl = document.getElementById('themePickerRgb');
  if (dot) dot.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  if (hexEl) hexEl.textContent = rgbToHex(rgb);
  if (rgbEl) rgbEl.textContent = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  syncThemeRowsUI();

  const sv = document.getElementById('themeSV');
  const hue = document.getElementById('themeHue');
  if (sv) drawSV(sv, themePickerState.hsv);
  if (hue) drawHue(hue, themePickerState.hsv.h);
}

function setPickerForPart(part) {
  themePickerState.part = part;
  themePickerState.prevRgb = structuredClone(lightTheme[part]);
  themePickerState.hsv = rgbToHsv(lightTheme[part]);
  const title = document.getElementById('themePickerTitle');
  if (title) title.textContent = partLabel(part);
  setPickerUIFromHsv();
}

function ensurePickerEvents() {
  const sv = document.getElementById('themeSV');
  const hue = document.getElementById('themeHue');
  if (!sv || !hue) return;

  const onDownSV = (e) => {
    themePickerState.dragging = 'sv';
    onMoveSV(e);
  };
  const onMoveSV = (e) => {
    if (themePickerState.dragging !== 'sv') return;
    const p = getCanvasPos(sv, e.clientX, e.clientY);
    themePickerState.hsv.s = Math.min(1, Math.max(0, p.x / p.w));
    themePickerState.hsv.v = Math.min(1, Math.max(0, 1 - (p.y / p.h)));
    setPickerUIFromHsv();
  };
  const onDownHue = (e) => {
    themePickerState.dragging = 'hue';
    onMoveHue(e);
  };
  const onMoveHue = (e) => {
    if (themePickerState.dragging !== 'hue') return;
    const p = getCanvasPos(hue, e.clientX, e.clientY);
    themePickerState.hsv.h = Math.min(360, Math.max(0, (p.y / p.h) * 360));
    setPickerUIFromHsv();
  };
  const onUp = () => {
    themePickerState.dragging = null;
  };

  // prevent duplicate wiring
  if (!sv.__ctBound) {
    sv.__ctBound = true;
    sv.addEventListener('pointerdown', (e) => { sv.setPointerCapture(e.pointerId); onDownSV(e); });
    sv.addEventListener('pointermove', onMoveSV);
    sv.addEventListener('pointerup', onUp);
    sv.addEventListener('pointercancel', onUp);
  }
  if (!hue.__ctBound) {
    hue.__ctBound = true;
    hue.addEventListener('pointerdown', (e) => { hue.setPointerCapture(e.pointerId); onDownHue(e); });
    hue.addEventListener('pointermove', onMoveHue);
    hue.addEventListener('pointerup', onUp);
    hue.addEventListener('pointercancel', onUp);
  }
}

window.openThemePicker = (part) => {
  if (!LIGHT_THEME_DEFAULTS[part]) return;
  const themeList = document.getElementById('themeSettingsView');
  const picker = document.getElementById('themePickerView');
  if (themeList) themeList.classList.add('hidden');
  if (picker) picker.classList.remove('hidden');
  // header back should go back to theme list
  const title = document.getElementById('settingsTitle');
  if (title) title.textContent = 'Theme';
  setPickerForPart(part);
  ensurePickerEvents();
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.themePickerCancel = () => {
  const part = themePickerState.part;
  if (part && themePickerState.prevRgb) {
    lightTheme[part] = structuredClone(themePickerState.prevRgb);
    applyLightTheme();
    saveLightTheme();
  }
  window.closeThemePicker();
};

window.themePickerApply = () => {
  // already live-applied; just close
  window.closeThemePicker();
};

window.themePickerDefault = () => {
  const part = themePickerState.part;
  if (!part) return;
  lightTheme[part] = structuredClone(LIGHT_THEME_DEFAULTS[part]);
  themePickerState.hsv = rgbToHsv(lightTheme[part]);
  applyLightTheme();
  saveLightTheme();
  setPickerUIFromHsv();
};

window.closeThemePicker = () => {
  const themeList = document.getElementById('themeSettingsView');
  const picker = document.getElementById('themePickerView');
  if (picker) picker.classList.add('hidden');
  if (themeList) themeList.classList.remove('hidden');
  syncThemeRowsUI();
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.openThemeSettings = () => {
  const main = document.getElementById('settingsMainView');
  const theme = document.getElementById('themeSettingsView');
  const back = document.getElementById('themeBackBtn');
  const resetAll = document.getElementById('themeResetAllBtn');
  const title = document.getElementById('settingsTitle');

  if (main) main.classList.add('hidden');
  const lic = document.getElementById('licenseBlock');
  if (lic) lic.classList.add('hidden');
  if (theme) theme.classList.remove('hidden');
  if (back) back.classList.remove('hidden');
  if (resetAll) resetAll.classList.remove('hidden');
  if (title) title.textContent = 'Theme';
  // ensure picker is closed when entering theme list
  const picker = document.getElementById('themePickerView');
  if (picker) picker.classList.add('hidden');
  syncThemeRowsUI();
  // keep scroll at top when entering theme view
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.closeThemeSettings = () => {
  // if picker is open, go back to theme list first
  const picker = document.getElementById('themePickerView');
  if (picker && !picker.classList.contains('hidden')) {
    window.closeThemePicker();
    return;
  }
  const main = document.getElementById('settingsMainView');
  const theme = document.getElementById('themeSettingsView');
  const back = document.getElementById('themeBackBtn');
  const resetAll = document.getElementById('themeResetAllBtn');
  const title = document.getElementById('settingsTitle');

  if (theme) theme.classList.add('hidden');
  if (main) main.classList.remove('hidden');
  const lic = document.getElementById('licenseBlock');
  if (lic) lic.classList.remove('hidden');
  if (back) back.classList.add('hidden');
  if (resetAll) resetAll.classList.add('hidden');
  if (title) title.textContent = 'Settings';
  // restore scroll top as well
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

// init theme once per load
lightTheme = loadLightTheme();
applyLightTheme();

loadData();
applyLanguageToUI();
changeEvent(currentEvent);
// Check for updates on load
checkUpdateLog();

// [FIX] Ensure inline HTML handlers can always find these (in case of bundling/scoping changes)
window.changeEvent = window.changeEvent || changeEvent;
window.changePracticeCase = window.changePracticeCase || changePracticeCase;
