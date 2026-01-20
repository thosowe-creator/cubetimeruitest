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
  const debounced = () => {
    if (i18nRaf) cancelAnimationFrame(i18nRaf);
    i18nRaf = requestAnimationFrame(() => {
      try { applyAutoI18n(document); } catch (_) {}
    });
  };
  i18nObserver = new MutationObserver(debounced);
  try {
    i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
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
    date: '2026.01.19',
    items: {
      ko: [
        '모든 종목의 스크램블 이미지 표기',
        '모든 종목의 스크램블 로직 고도화',
        '타이머 오차가 있던 현상 수정',
        '멀티블라인드 스코어 입력 기능 추가',
        '영어 및 한국어 지원',
      ],
      en: [
        'Scramble image display for all events',
        'Improved scramble logic for all events',
        'Fixed timer accuracy issue',
        'Added multi-blind score input',
        'Korean & English language support',
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
    since: '2026.01.19'
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
const mobTabHistory = document.getElementById('mob-tab-history');
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
const suffixes = ["", "'", "2"];
const orientations = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
const wideMoves = ["Uw", "Dw", "Lw", "Rw", "Fw", "Bw"]; 
function mapEventIdForCubing(eventId){
    // cubing.js / scramble-display uses WCA event IDs. Pyraminx is "pyram".
    if (eventId === 'pyra') return 'pyram';
    return eventId;
}
let cubeState = {};
const COLORS = { U: '#FFFFFF', D: '#FFD500', L: '#FF8C00', R: '#DC2626', F: '#16A34A', B: '#2563EB' };
// --- Mobile Tab Logic ---
window.switchMobileTab = (tab) => {
    if (tab === 'timer') {
        // Show Timer, Hide History
        timerSection.classList.remove('hidden');
        historySection.classList.add('hidden');
        
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
    const groups = ['standard', 'nonstandard', 'blind'];
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
    if (isRunning) return;
    currentEvent = e;
    if (eventSelect && eventSelect.value !== e) eventSelect.value = e;
    const conf = configs[e];
    initSessionIfNeeded(e);
    
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
        // 종목 변경/재생성 시 이전 내용 즉시 숨김
        if (scrambleEl) scrambleEl.innerText = '';
        clearScrambleDiagram();
        // Prevent blind-only message from sticking across events
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    }
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
    if (typeof cubingFn === 'function') {
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
    // Prefer cubing.js (official random-state scrambles) when available.
    const cubingFn = window.__randomScrambleForEvent;
    if (typeof cubingFn === 'function') {
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
        const dials = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
        dials.forEach(d => {
            const v = Math.floor(Math.random() * 12) - 5;
            res.push(`${d}${v >= 0 ? '+' : ''}${v}`);
        });
        res.push("y2");
        const dials2 = ["U", "R", "D", "L", "ALL"];
        dials2.forEach(d => {
            const v = Math.floor(Math.random() * 12) - 5;
            res.push(`${d}${v >= 0 ? '+' : ''}${v}`);
        });
        let pins = [];
        ["UR", "DR", "DL", "UL"].forEach(p => { if (Math.random() < 0.5) pins.push(p); });
        if (pins.length) res.push(pins.join(" "));
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
    scrambleDiagram.setAttribute('scramble', String(currentScramble || '').replace(/\n/g, ' '));
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
    let filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    const activeSession = (sessions[currentEvent] || []).find(s => s.isActive);
    if (activeSession) document.getElementById('currentSessionNameDisplay').innerText = activeSession.name;
    
    // Lazy Render Logic
    const subset = filtered.slice(0, displayedSolvesCount);
    
    const solvePrimaryText = (s) => {
        if (s.event === '333mbf' && s.mbf) {
            return s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        }
        const base = (s.penalty === 'DNF') ? 'DNF' : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time);
        return `${base}${s.penalty === '+2' ? '+' : ''}`;
    }

    historyList.innerHTML = subset.map(s => `
        <div class="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all" onclick="showSolveDetails(${s.id})">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">${solvePrimaryText(s)}</span>
            <button onclick="event.stopPropagation(); deleteSolve(${s.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        </div>
    `).join('') || '<div class="text-center py-10 text-slate-300 text-[11px] italic">No solves yet</div>';
    solveCountEl.innerText = filtered.length;
    if (currentEvent === '333mbf') {
        labelPrimaryAvg.innerText = "-";
        displayPrimaryAvg.innerText = "-";
        displayAo12.innerText = "-";
        sessionAvgEl.innerText = "-";
        bestSolveEl.innerText = "-";
        if (activeTool === 'graph') renderHistoryGraph();
        return;
    }
    if (isAo5Mode) { labelPrimaryAvg.innerText = "Ao5"; displayPrimaryAvg.innerText = calculateAvg(filtered, 5); } 
    else { labelPrimaryAvg.innerText = "Mo3"; displayPrimaryAvg.innerText = calculateAvg(filtered, 3, true); }
    displayAo12.innerText = calculateAvg(filtered, 12);
    let valid = filtered.filter(s=>s.penalty!=='DNF').map(s=>s.penalty==='+2'?s.time+2000:s.time);
    sessionAvgEl.innerText = valid.length ? formatTime(valid.reduce((a,b)=>a+b,0)/valid.length) : "-";
    bestSolveEl.innerText = valid.length ? formatTime(Math.min(...valid)) : "-";
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
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!editingSessionId) handleEnd(e);
    }
});
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
loadData();
applyLanguageToUI();
changeEvent(currentEvent);
// Check for updates on load
checkUpdateLog();
