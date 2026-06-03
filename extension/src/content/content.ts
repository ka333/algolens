// AlgoLens Content Script - Step 5: GraphQL Metadata Extraction
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

// Fetch difficulty & topic tags from LeetCode GraphQL API
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
    return {
      title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      difficulty: 'Unknown',
      tags: []
    };
  }
}

function init() {
  const slug = getProblemSlug();
  if (slug) {
    currentProblemSlug = slug;
    startTimer();
    setupActivityListeners();
    injectNetworkInterceptor();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
