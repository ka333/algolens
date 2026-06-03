// AlgoLens Background Worker - Push Queue & GitHub Automation
import { 
  getStorageData, 
  getAppSettings, 
  STORAGE_KEYS 
} from '../utils/storage';
import { 
  getGitHubFileDetails, 
  createOrUpdateGitHubFile, 
  pushProblemMetadataJSON, 
  updateRepositoryREADME,
  ProblemMetadataPayload 
} from '../utils/github';
import { recordSubmissionStats } from '../utils/stats';

// Simple queue to prevent concurrent race conditions on GitHub pushes
interface QueueItem {
  action: string;
  payload: any;
}

const pushQueue: QueueItem[] = [];
let isProcessingQueue = false;

// Process queue items one-by-one
async function processQueue() {
  if (isProcessingQueue || pushQueue.length === 0) return;
  isProcessingQueue = true;

  const item = pushQueue.shift();
  if (item && item.action === 'SUBMISSION_ACCEPTED') {
    try {
      await handleSyncToGitHub(item.payload);
    } catch (err: any) {
      console.error('Queue processing error:', err);
      showFailureNotification(item.payload.title, err.message || 'Unknown network error');
    }
  }

  isProcessingQueue = false;
  processQueue(); // Loop
}

const languageExtensions: Record<string, string> = {
  cpp: 'cpp',
  java: 'java',
  python: 'py',
  python3: 'py',
  c: 'c',
  csharp: 'cs',
  javascript: 'js',
  typescript: 'ts',
  ruby: 'rb',
  swift: 'swift',
  golang: 'go',
  scala: 'scala',
  kotlin: 'kt',
  rust: 'rs',
  php: 'php',
  sql: 'sql'
};

function compileCommitMessage(template: string, payload: any): string {
  return template
    .replace(/{title}/g, payload.title)
    .replace(/{difficulty}/g, payload.difficulty)
    .replace(/{language}/g, payload.language)
    .replace(/{slug}/g, payload.slug);
}

// Coordinate the full repository sync
async function handleSyncToGitHub(payload: any) {
  const config = await getStorageData([
    STORAGE_KEYS.GITHUB_TOKEN,
    STORAGE_KEYS.GITHUB_REPO,
    STORAGE_KEYS.GITHUB_FOLDER
  ]);

  const token = config[STORAGE_KEYS.GITHUB_TOKEN];
  const repo = config[STORAGE_KEYS.GITHUB_REPO];
  const folder = config[STORAGE_KEYS.GITHUB_FOLDER] || 'leetcode';

  if (!token || !repo) {
    throw new Error('GitHub settings are not configured in the extension.');
  }

  const settings = await getAppSettings();
  if (!settings.autoSync) {
    console.log('AlgoLens: Auto-sync is disabled in settings.');
    return;
  }

  console.log(`AlgoLens: Beginning GitHub sync for ${payload.title}`);

  const updatedStats = await recordSubmissionStats({
    slug: payload.slug,
    title: payload.title,
    difficulty: payload.difficulty,
    language: payload.language,
    runtime: payload.runtime,
    memory: payload.memory,
    solveTimeSeconds: payload.solveTimeSeconds,
    attempts: payload.attempts,
    solvedAt: payload.solvedAt
  });

  const ext = languageExtensions[payload.language.toLowerCase()] || 'txt';
  const solutionPath = `${folder}/solutions/${payload.slug}.${ext}`;
  
  const fileDetails = await getGitHubFileDetails(token, repo, solutionPath);
  const existingSha = fileDetails ? fileDetails.sha : null;
  
  const commitMessage = compileCommitMessage(settings.commitTemplate, payload);

  await createOrUpdateGitHubFile(
    token,
    repo,
    solutionPath,
    payload.code,
    existingSha,
    commitMessage
  );

  const metaPayload: ProblemMetadataPayload = {
    slug: payload.slug,
    title: payload.title,
    difficulty: payload.difficulty,
    tags: payload.tags,
    language: payload.language,
    runtime: payload.runtime,
    memory: payload.memory,
    solveTimeSeconds: payload.solveTimeSeconds,
    attempts: payload.attempts,
    solvedAt: payload.solvedAt
  };

  await pushProblemMetadataJSON(token, repo, folder, metaPayload);
  await updateRepositoryREADME(token, repo, folder, updatedStats);

  console.log(`AlgoLens: Solution files and README successfully synced to GitHub for ${payload.title}`);

  if (!settings.optOutTelemetry) {
    dispatchTelemetry(payload);
  }
}

// Force a complete rebuild & push of the repository README (Commit 30)
async function handleForceRebuild(): Promise<void> {
  const config = await getStorageData([
    STORAGE_KEYS.GITHUB_TOKEN,
    STORAGE_KEYS.GITHUB_REPO,
    STORAGE_KEYS.GITHUB_FOLDER,
    STORAGE_KEYS.LOCAL_STATS
  ]);

  const token = config[STORAGE_KEYS.GITHUB_TOKEN];
  const repo = config[STORAGE_KEYS.GITHUB_REPO];
  const folder = config[STORAGE_KEYS.GITHUB_FOLDER] || 'leetcode';
  const localStats = config[STORAGE_KEYS.LOCAL_STATS];

  if (!token || !repo) {
    throw new Error('Not connected to GitHub');
  }

  if (!localStats) {
    throw new Error('No local statistics found to push. Solve a problem first!');
  }

  console.log('AlgoLens: Force rebuilding README index...');
  await updateRepositoryREADME(token, repo, folder, localStats);
}

function showFailureNotification(problemTitle: string, errorMessage: string) {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.create('algolens_sync_failure', {
      type: 'basic',
      iconUrl: 'index.html',
      title: 'AlgoLens Sync Failed',
      message: `Could not push "${problemTitle}" to GitHub: ${errorMessage}`,
      priority: 2
    });
  }
}

async function dispatchTelemetry(payload: any) {
  try {
    const backendUrl = 'https://algolens-backend.onrender.com/api/submission-event';
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problem: payload.slug,
        solveTime: payload.solveTimeSeconds,
        attempts: payload.attempts,
        status: 'accepted'
      })
    });

    if (!response.ok) {
      console.warn('Telemetry server returned error code:', response.status);
    }
  } catch (err) {
    console.warn('Failed to dispatch anonymous telemetry details:', err);
  }
}

// Listen for solve completion events from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SUBMISSION_ACCEPTED') {
    console.log('AlgoLens: Submission message received from content script.');
    
    pushQueue.push({
      action: message.action,
      payload: message.payload
    });
    
    processQueue();
    sendResponse({ status: 'Queued' });
  }

  if (message.action === 'FORCE_REBUILD_INDEX') {
    handleForceRebuild()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Force rebuild failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // keeps the message channel open for async response
  }

  return true;
});
