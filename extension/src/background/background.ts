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

// Map programming languages to their standard file extensions
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

// Build the custom commit message based on template
function compileCommitMessage(template: string, payload: any): string {
  return template
    .replace(/{title}/g, payload.title)
    .replace(/{difficulty}/g, payload.difficulty)
    .replace(/{language}/g, payload.language)
    .replace(/{slug}/g, payload.slug);
}

// Coordinate the full repository sync
async function handleSyncToGitHub(payload: any) {
  // 1. Fetch user credentials & configuration from storage
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

  // 2. Save solve stats locally in chrome.storage
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

  // 3. Stage 1: Commit the solution file
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

  // 4. Stage 2: Commit the metadata JSON
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

  // 5. Stage 3: Commit the updated README.md indexes
  await updateRepositoryREADME(token, repo, folder, updatedStats);

  console.log(`AlgoLens: Solution files and README successfully synced to GitHub for ${payload.title}`);

  // 6. Stage 4: Dispatch anonymous telemetry if not opted out
  if (!settings.optOutTelemetry) {
    dispatchTelemetry(payload);
  }
}

// Show standard Chrome system notifications on fail (Commit 29)
function showFailureNotification(problemTitle: string, errorMessage: string) {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.create('algolens_sync_failure', {
      type: 'basic',
      iconUrl: 'index.html', // default fallback context page icon
      title: 'AlgoLens Sync Failed',
      message: `Could not push "${problemTitle}" to GitHub: ${errorMessage}`,
      priority: 2
    });
  }
}

// Send anonymous telemetry events to Python/FastAPI backend
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
    
    // Add item to push queue & process
    pushQueue.push({
      action: message.action,
      payload: message.payload
    });
    
    processQueue();
    
    sendResponse({ status: 'Queued' });
  }
  return true;
});
