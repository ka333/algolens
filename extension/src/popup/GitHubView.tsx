import React, { useState, useEffect } from 'react';
import { 
  getStorageData, 
  setStorageData, 
  removeStorageData, 
  STORAGE_KEYS 
} from '../utils/storage';
import { 
  validateGitHubToken, 
  fetchUserRepos, 
  GitHubRepo 
} from '../utils/github';

interface GitHubViewProps {
  onConnectionChange: (connected: boolean, username: string) => void;
}

export function GitHubView({ onConnectionChange }: GitHubViewProps) {
  const [token, setToken] = useState<string>('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('leetcode');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Connection states
  const [connectedUser, setConnectedUser] = useState<string>('');
  const [connectedRepo, setConnectedRepo] = useState<string>('');
  const [connectedFolder, setConnectedFolder] = useState<string>('');

  // Load existing configuration on mount
  useEffect(() => {
    async function loadConfig() {
      const data = await getStorageData([
        STORAGE_KEYS.GITHUB_TOKEN,
        STORAGE_KEYS.GITHUB_USERNAME,
        STORAGE_KEYS.GITHUB_REPO,
        STORAGE_KEYS.GITHUB_FOLDER
      ]);

      if (data[STORAGE_KEYS.GITHUB_TOKEN]) {
        setConnectedUser(data[STORAGE_KEYS.GITHUB_USERNAME] || 'Connected');
        setConnectedRepo(data[STORAGE_KEYS.GITHUB_REPO] || '');
        setConnectedFolder(
          data[STORAGE_KEYS.GITHUB_FOLDER] !== undefined 
            ? data[STORAGE_KEYS.GITHUB_FOLDER] 
            : 'leetcode'
        );
        
        // Fetch repositories list in the background
        try {
          const fetchedRepos = await fetchUserRepos(data[STORAGE_KEYS.GITHUB_TOKEN]);
          setRepos(fetchedRepos);
        } catch (err) {
          console.error(err);
        }
      }
    }
    loadConfig();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // 1. Validate the PAT
      const user = await validateGitHubToken(token.trim());
      
      // 2. Fetch repos
      const fetchedRepos = await fetchUserRepos(token.trim());
      setRepos(fetchedRepos);
      
      // 3. Save basic connection state (repo selected later)
      await setStorageData({
        [STORAGE_KEYS.GITHUB_TOKEN]: token.trim(),
        [STORAGE_KEYS.GITHUB_USERNAME]: user.login,
      });

      setConnectedUser(user.login);
      onConnectionChange(true, user.login);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRepoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;

    try {
      await setStorageData({
        [STORAGE_KEYS.GITHUB_REPO]: selectedRepo,
        [STORAGE_KEYS.GITHUB_FOLDER]: folderPath.trim(),
      });

      setConnectedRepo(selectedRepo);
      setConnectedFolder(folderPath.trim());
    } catch (err) {
      setError('Failed to save repository settings.');
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await removeStorageData([
        STORAGE_KEYS.GITHUB_TOKEN,
        STORAGE_KEYS.GITHUB_USERNAME,
        STORAGE_KEYS.GITHUB_REPO,
        STORAGE_KEYS.GITHUB_FOLDER
      ]);

      setToken('');
      setRepos([]);
      setSelectedRepo('');
      setFolderPath('leetcode');
      setConnectedUser('');
      setConnectedRepo('');
      setConnectedFolder('');
      
      onConnectionChange(false, '');
    } catch (err) {
      setError('Failed to disconnect cleanly.');
    } finally {
      setIsLoading(false);
    }
  };

  // State 1: User is completely configured
  if (connectedUser && connectedRepo) {
    return (
      <div className="card">
        <h3 className="card-title" style={{ color: 'var(--success)' }}>
          ✓ GitHub Connected
        </h3>
        <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Account: <strong style={{ color: 'var(--text-primary)' }}>{connectedUser}</strong>
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Repository: <strong style={{ color: 'var(--text-primary)' }}>{connectedRepo}</strong>
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Target Folder: <strong style={{ color: 'var(--text-primary)' }}>{connectedFolder ? `${connectedFolder}/` : '[Repository Root]'}</strong>
          </p>
        </div>
        <button 
          className="btn-secondary" 
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          Disconnect Account
        </button>
      </div>
    );
  }

  // State 2: User authorized token, but needs to pick a repo
  if (connectedUser && !connectedRepo) {
    return (
      <div className="card">
        <h3 className="card-title">Setup Repository</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Choose the repository where AlgoLens should push your solutions.
        </p>

        <form onSubmit={handleSaveRepoConfig}>
          <div className="form-group">
            <label className="form-label">Select Repository</label>
            <select 
              className="form-input"
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              required
              style={{ background: 'var(--bg-primary)' }}
            >
              <option value="">-- Choose Repository --</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name} {repo.private ? '(Private)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Folder Path in Repository</label>
            <input 
              type="text" 
              className="form-input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g. leetcode"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            style={{ marginBottom: '10px' }}
          >
            Finish Setup
          </button>
        </form>

        <button 
          className="btn-secondary" 
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          Cancel / Reset
        </button>
      </div>
    );
  }

  // State 3: User needs to input token (Unauthenticated)
  return (
    <div className="card">
      <h3 className="card-title">Connect GitHub</h3>
      
      {error && (
        <div className="notification-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleConnect}>
        <div className="form-group">
          <label className="form-label">Personal Access Token (PAT)</label>
          <input 
            type="password" 
            className="form-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxx"
            required
            disabled={isLoading}
          />
        </div>
        
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
          * Security Notice: Your PAT remains client-side inside this extension's local storage and is sent directly to GitHub only.
        </p>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Verifying Token...' : 'Authorize Account'}
        </button>
      </form>
    </div>
  );
}
