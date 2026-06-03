// AlgoLens Content Script - Step 1: Timer Tracking
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

function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    console.log(`AlgoLens: Timer initialized for ${slug}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
