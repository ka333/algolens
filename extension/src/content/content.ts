// AlgoLens Content Script - Time Tracking, Attempt Tracking, and Submission Detection
let activeTimeSeconds = 0;
let lastActiveTimestamp = Date.now();
let isTimerActive = true;
let isIdle = false;
let idleTimer: number | null = null;
let timerInterval: number | null = null;

let currentProblemSlug = '';
let attemptCount = 0;
let submittedCode = '';

// Get problem slug from current window URL
function getProblemSlug(): string {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : '';
}

// 1. ACTIVE TIMER SYSTEM
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

// Inactivity/Idle detection
function resetIdleTimer() {
  if (isIdle) {
    isIdle = false;
    lastActiveTimestamp = Date.now();
  }

  if (idleTimer) {
    window.clearTimeout(idleTimer);
  }

  // Set idle timeout to 2 minutes (120000 ms)
  idleTimer = window.setTimeout(() => {
    isIdle = true;
  }, 120000);
}

// Add window focus & activity listeners
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

// 2. NETWORK INTERCEPTOR (Handled natively by MAIN world content script)

// 3. FETCH METADATA VIA GRAPHQL
interface GraphQLMetadata {
  title: string;
  difficulty: string;
  tags: string[];
}

async function fetchProblemMetadata(slug: string): Promise<GraphQLMetadata> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        topicTags {
          name
        }
      }
    }
  `;

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug }
      })
    });

    const result = await response.json();
    const question = result.data.question;
    
    return {
      title: question.title,
      difficulty: question.difficulty,
      tags: question.topicTags.map((t: any) => t.name)
    };
  } catch (err) {
    console.error('Failed to fetch problem metadata via GraphQL:', err);
    // Fallback based on URL/DOM
    return {
      title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      difficulty: 'Unknown',
      tags: []
    };
  }
}

// 4. MAIN INGESTION PORT & MESSAGING (Commit 20 Coordinate messaging)
window.addEventListener('message', async (event) => {
  if (event.source !== window || !event.data) {
    return;
  }

  if (event.data.type === 'ALGOLENS_SUBMIT_CODE') {
    submittedCode = event.data.code;
    console.log('AlgoLens: Intercepted submitted code.');
    return;
  }

  if (event.data.type !== 'ALGOLENS_SUBMISSION_CHECK') {
    return;
  }

  const checkResult = event.data.data;
  
  if (checkResult.state === 'SUCCESS') {
    const slug = getProblemSlug();
    
    if (slug !== currentProblemSlug) {
      currentProblemSlug = slug;
      attemptCount = 0;
    }

    attemptCount++;
    const isAccepted = checkResult.status_msg === 'Accepted';

    console.log(`AlgoLens: Submission check completed. Status: ${checkResult.status_msg}. Attempts: ${attemptCount}`);

    if (isAccepted) {
      stopTimer();
      const metadata = await fetchProblemMetadata(slug);

      const payload = {
        slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        tags: metadata.tags,
        code: submittedCode || '// Code not captured',
        language: checkResult.lang,
        runtime: checkResult.runtime,
        memory: checkResult.memory,
        solveTimeSeconds: activeTimeSeconds === 0 ? 1 : activeTimeSeconds,
        attempts: attemptCount,
        solvedAt: new Date().toISOString()
      };

      // Coordinate content-to-background runtime messaging (Commit 20)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'SUBMISSION_ACCEPTED',
          payload: payload
        }, (response) => {
          console.log('AlgoLens: Background response received:', response);
        });
      } else {
        console.warn('AlgoLens: Extension context invalidated. Please refresh the page to sync your solution!');
      }

      // Reset for next solve/retries
      attemptCount = 0;
      startTimer();
    }
  }
});

// Initialization
function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    setupActivityListeners();
    console.log(`AlgoLens: Active time tracking started for problem: ${slug}`);
  }
}

// Wait for document load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle SPA route changes on LeetCode
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    const newSlug = getProblemSlug();
    if (newSlug && newSlug !== currentProblemSlug) {
      console.log(`AlgoLens: Navigated to new problem ${newSlug}. Resetting trackers.`);
      currentProblemSlug = newSlug;
      attemptCount = 0;
      startTimer();
    }
  }
}).observe(document, { subtree: true, childList: true });
