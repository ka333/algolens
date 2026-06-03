import React, { useState, useEffect, useRef } from 'react';
import { fetchSubmissions, fetchSubmissionDetails, LeetCodeSubmission } from '../utils/leetcodeGraphQL';
import { getGitHubDirectoryList } from '../utils/github';
import { getStorageData, STORAGE_KEYS } from '../utils/storage';

interface SyncItem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  language: string;
  timestamp: number;
  status: 'ready' | 'syncing' | 'completed' | 'failed' | 'skipped';
  error?: string;
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

export function BulkSyncView() {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'paused' | 'completed' | 'error'>('idle');
  
  const [foundItems, setFoundItems] = useState<SyncItem[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(0);

  // Auto-scroll logs
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Perform full LeetCode history scan
  const handleScan = async () => {
    setScanStatus('scanning');
    setLogs([]);
    addLog('Starting scan of LeetCode submission history...');

    try {
      // 1. Fetch GitHub config
      const config = await getStorageData([
        STORAGE_KEYS.GITHUB_TOKEN,
        STORAGE_KEYS.GITHUB_REPO,
        STORAGE_KEYS.GITHUB_FOLDER
      ]);

      const token = config[STORAGE_KEYS.GITHUB_TOKEN];
      const repo = config[STORAGE_KEYS.GITHUB_REPO];
      const folder = config[STORAGE_KEYS.GITHUB_FOLDER] !== undefined ? config[STORAGE_KEYS.GITHUB_FOLDER] : 'leetcode';

      if (!token || !repo) {
        throw new Error('Please connect your GitHub account in the GitHub tab first.');
      }

      // 2. Fetch existing solutions from GitHub (so we do not re-upload them)
      addLog('Fetching list of already synced solutions from GitHub...');
      const prefix = folder ? `${folder}/` : '';
      const existingFiles = await getGitHubDirectoryList(token, repo, `${prefix}solutions`);
      addLog(`Found ${existingFiles.length} files in solutions/ directory on GitHub.`);

      // 3. Scan LeetCode Submissions
      let offset = 0;
      const limit = 50;
      let hasNext = true;
      const allAcceptedSubmissions: LeetCodeSubmission[] = [];

      addLog('Querying LeetCode for accepted submissions...');
      
      // Let's safe-guard scan limit to 300 submissions to prevent rate limits during popup use
      const maxSubmissionsToScan = 300; 

      while (hasNext && allAcceptedSubmissions.length < maxSubmissionsToScan) {
        addLog(`Scanning submissions (offset: ${offset})...`);
        const result = await fetchSubmissions(offset, limit);
        
        const accepted = result.submissions.filter(s => s.statusDisplay === 'Accepted');
        allAcceptedSubmissions.push(...accepted);
        
        hasNext = result.hasNext;
        offset += limit;

        if (offset >= maxSubmissionsToScan) {
          addLog(`Scanning capped at ${maxSubmissionsToScan} submissions.`);
          break;
        }

        // Slight cooling delay
        await new Promise(r => setTimeout(r, 200));
      }

      addLog(`Found ${allAcceptedSubmissions.length} total Accepted submissions in history.`);

      // 4. Deduplicate: select only the latest accepted submission per (slug, language)
      // Since LeetCode returns submissions sorted by timestamp descending, the first we encounter is the latest.
      const seen = new Set<string>();
      const uniqueSubmissions: LeetCodeSubmission[] = [];

      allAcceptedSubmissions.forEach(sub => {
        const langKey = sub.lang.toLowerCase();
        const key = `${sub.titleSlug}_${langKey}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSubmissions.push(sub);
        }
      });

      addLog(`Deduplicated to ${uniqueSubmissions.length} unique solves (grouped by question + language).`);

      // 5. Cross reference with GitHub files to see what's already there
      const itemsToSync: SyncItem[] = uniqueSubmissions.map(sub => {
        const ext = languageExtensions[sub.lang.toLowerCase()] || 'txt';
        const expectedFilename = `${sub.titleSlug}.${ext}`;
        const alreadyExists = existingFiles.includes(expectedFilename);
        
        return {
          id: sub.id,
          title: sub.title,
          slug: sub.titleSlug,
          difficulty: '', // Will populate later from details
          language: sub.lang,
          timestamp: parseInt(sub.timestamp, 10),
          status: alreadyExists ? 'skipped' : 'ready'
        };
      });

      setFoundItems(itemsToSync);
      
      const readyQueue = itemsToSync.filter(i => i.status === 'ready');
      setSyncQueue(readyQueue);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      
      addLog(`Scan complete! ${readyQueue.length} new solutions ready to sync. (${itemsToSync.length - readyQueue.length} already exist on GitHub).`);
      setScanStatus('ready');
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Scan failed: ${err.message || err}`);
      setScanStatus('error');
    }
  };

  // Sync Loop Controller
  const startSync = () => {
    if (syncStatus === 'syncing' || syncQueue.length === 0) return;
    
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    addLog(`Starting sync queue: ${syncQueue.length} files to push...`);
    runSyncQueue();
  };

  const pauseSync = () => {
    isSyncingRef.current = false;
    setSyncStatus('paused');
    addLog('Sync paused by user.');
  };

  const runSyncQueue = async () => {
    while (isSyncingRef.current && currentIndexRef.current < syncQueue.length) {
      const idx = currentIndexRef.current;
      const item = syncQueue[idx];
      
      // Update item state to syncing
      updateQueueItemStatus(item.id, 'syncing');
      addLog(`[${idx + 1}/${syncQueue.length}] Fetching code details for "${item.title}" (${item.language})...`);

      try {
        // 1. Fetch source code from LeetCode
        const details = await fetchSubmissionDetails(item.id);
        
        // 2. Build full payload
        const payload = {
          slug: item.slug,
          title: item.title,
          difficulty: details.question.difficulty,
          tags: details.question.topicTags.map((t: any) => t.name),
          language: details.lang.verboseName,
          runtime: details.runtime,
          memory: details.memory,
          solveTimeSeconds: 600, // Fallback for bulk sync
          attempts: 1, // Fallback for bulk sync
          solvedAt: new Date(item.timestamp * 1000).toISOString(),
          code: details.code
        };

        // 3. Message background worker to sync to GitHub
        const response: any = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'BULK_SYNC_SUBMISSION',
            payload
          }, (res) => {
            resolve(res || { success: false, error: 'Communication error' });
          });
        });

        if (response.success) {
          updateQueueItemStatus(item.id, 'completed');
          addLog(`✓ successfully synced "${item.title}" (${item.language}) to GitHub.`);
        } else {
          throw new Error(response.error || 'Failed to commit');
        }
      } catch (err: any) {
        console.error(err);
        updateQueueItemStatus(item.id, 'failed', err.message || 'Push Error');
        addLog(`❌ Failed to sync "${item.title}": ${err.message || err}`);
      }

      // Increment index
      currentIndexRef.current += 1;
      setCurrentIndex(currentIndexRef.current);

      // Delay for safety
      if (isSyncingRef.current && currentIndexRef.current < syncQueue.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Check if fully complete
    if (currentIndexRef.current >= syncQueue.length && syncQueue.length > 0) {
      isSyncingRef.current = false;
      addLog('All files pushed! Finalizing repository README index...');
      
      // Rebuild README index once at the end
      const rebuildResponse: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'FORCE_REBUILD_INDEX' }, (res) => {
          resolve(res || { success: false });
        });
      });

      if (rebuildResponse.success) {
        addLog('✓ Repository README index rebuilt successfully!');
      } else {
        addLog('⚠️ Failed to rebuild repository README index.');
      }

      addLog('🎉 Bulk Sync Complete!');
      setSyncStatus('completed');
    }
  };

  const updateQueueItemStatus = (id: string, status: SyncItem['status'], error?: string) => {
    setFoundItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, error } : item))
    );
    setSyncQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, error } : item))
    );
  };

  // Render Difficulty Badges
  const renderBadge = (difficulty: string) => {
    if (!difficulty) return null;
    const diffClass = difficulty.toLowerCase();
    return <span className={`difficulty-badge ${diffClass}`}>{difficulty}</span>;
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
      <h3 className="card-title">Bulk Sync Solutions</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
        Import and sync your historical solved questions to your GitHub repository in batches.
      </p>

      {/* Controller Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {scanStatus !== 'ready' && scanStatus !== 'scanning' && (
          <button className="btn-primary" onClick={handleScan}>
            Scan Solved Problems
          </button>
        )}

        {scanStatus === 'scanning' && (
          <button className="btn-primary" disabled>
            Scanning...
          </button>
        )}

        {scanStatus === 'ready' && (
          <>
            {syncStatus !== 'syncing' && syncStatus !== 'completed' && (
              <button className="btn-primary" onClick={startSync} disabled={syncQueue.length === 0}>
                {syncStatus === 'paused' ? 'Resume Sync' : 'Start Syncing'}
              </button>
            )}

            {syncStatus === 'syncing' && (
              <button className="btn-secondary" onClick={pauseSync}>
                Pause Sync
              </button>
            )}

            <button className="btn-secondary" onClick={handleScan} disabled={syncStatus === 'syncing'} style={{ width: 'auto', paddingLeft: '12px', paddingRight: '12px' }}>
              Rescan
            </button>
          </>
        )}
      </div>

      {/* Progress Section */}
      {scanStatus === 'ready' && syncQueue.length > 0 && (
        <div className="progress-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>Progress: {currentIndex} / {syncQueue.length} files</span>
            <span>{Math.round((currentIndex / syncQueue.length) * 100)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${(currentIndex / syncQueue.length) * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* Log Console */}
      <div className="log-box" ref={logBoxRef}>
        {logs.length === 0 ? 'Log Console ready. Click "Scan" to start.' : logs.join('\n')}
      </div>

      {/* Table of found items */}
      {foundItems.length > 0 && (
        <div className="problems-table-container">
          <table className="problems-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Lang</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {foundItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={item.title}>
                    {item.title}
                  </td>
                  <td><code>{item.language}</code></td>
                  <td>
                    <span className={`status-text ${item.status}`}>
                      {item.status === 'ready' && 'Ready'}
                      {item.status === 'syncing' && 'Syncing...'}
                      {item.status === 'completed' && '✓ Synced'}
                      {item.status === 'failed' && `⚠️ Failed`}
                      {item.status === 'skipped' && 'Exists'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
