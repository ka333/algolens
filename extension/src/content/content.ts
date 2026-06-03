// AlgoLens Content Script - Step 2: Page Activity Listeners
let activeTimeSeconds = 0;
let lastActiveTimestamp = Date.now();
let isTimerActive = true;
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

  timerInterval = window.setInterval(() => {
    if (isTimerActive) {
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
}

function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    setupActivityListeners();
    console.log(`AlgoLens: Timer & Activity listeners initialized for ${slug}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
