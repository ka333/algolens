// AlgoLens Content Script - Step 4: Network Interception Injection
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

  const inputs = ['mousemove', 'keydown', 'click', 'scroll'];
  inputs.forEach(event => {
    window.addEventListener(event, resetIdleTimer, { passive: true });
  });
}

// Intercept fetch queries on leetcode.com
function injectNetworkInterceptor() {
  const scriptContent = `
    (function() {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0];
        
        if (typeof url === 'string') {
          if (url.includes('/submissions/detail/') && url.includes('/check/')) {
            const clone = response.clone();
            clone.json().then(data => {
              window.postMessage({
                type: 'ALGOLENS_SUBMISSION_CHECK',
                data: data,
                url: url
              }, '*');
            }).catch(err => console.error('Error reading json check:', err));
          }
        }
        return response;
      };
    })();
  `;

  const script = document.createElement('script');
  script.textContent = scriptContent;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    setupActivityListeners();
    injectNetworkInterceptor();
    console.log(`AlgoLens: Interceptor injected for ${slug}`);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
