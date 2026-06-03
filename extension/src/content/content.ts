// AlgoLens Content Script - Step 3: Inactivity/Idle Detection
let activeTimeSeconds = 0;
let lastActiveTimestamp = Date.now();
let isTimerActive = true;
let isIdle = false;
let idleTimer: number | null = null;
let timerInterval: number | null = null;
let currentProblemSlug = '';

function getProblemSlug(): string {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : '';
}

function startTimer() {
  stopTimer();
  activeTimeSeconds = 0;
  lastActiveTimestamp = Date.now();
  isTimerActive = true;
  isIdle = false;
  resetIdleTimer();

  timerInterval = window.setInterval(() => {
    if (isTimerActive && !isIdle) {
      const now = Date.now();
      const elapsed = Math.round((now - lastActiveTimestamp) / 1000);
      activeTimeSeconds += elapsed;
      lastActiveTimestamp = now;
    } else {
      lastActiveTimestamp = Date.now();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function pauseTimer() {
  isTimerActive = false;
}

function resumeTimer() {
  isTimerActive = true;
  lastActiveTimestamp = Date.now();
  resetIdleTimer();
}

function resetIdleTimer() {
  if (isIdle) {
    isIdle = false;
    lastActiveTimestamp = Date.now();
  }

  if (idleTimer) {
    window.clearTimeout(idleTimer);
  }

  // Set idle timeout to 2 minutes
  idleTimer = window.setTimeout(() => {
    isIdle = true;
  }, 120000);
}

function setupActivityListeners() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  });

  window.addEventListener('blur', pauseTimer);
  window.addEventListener('focus', resumeTimer);

  // User input listener resets the idle state
  const inputs = ['mousemove', 'keydown', 'click', 'scroll'];
  inputs.forEach(event => {
    window.addEventListener(event, resetIdleTimer, { passive: true });
  });
}

function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    setupActivityListeners();
    console.log(`AlgoLens: Inactivity listeners initialized for ${slug}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
