import React, { useState, useEffect } from 'react';
import './styles/popup.css';
import { DashboardView } from './popup/DashboardView';
import { GitHubView } from './popup/GitHubView';
import { SettingsView } from './popup/SettingsView';
import { StatsView } from './popup/StatsView';
import { BulkSyncView } from './popup/BulkSyncView';
import { getStorageData, STORAGE_KEYS } from './utils/storage';

// Type definitions for views
type TabType = 'dashboard' | 'stats' | 'bulksync' | 'github' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('github');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  const openGitHub = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'https://github.com/ka333/algolens' });
    } else {
      window.open('https://github.com/ka333/algolens', '_blank');
    }
  };

  // Function to respond to connections changes in GitHubView
  const handleConnectionChange = (connected: boolean, user: string) => {
    setIsConnected(connected);
    setUsername(user);
    if (connected) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('github');
    }
  };

  // Read config from chrome storage on mount
  useEffect(() => {
    async function checkAuth() {
      const data = await getStorageData([
        STORAGE_KEYS.GITHUB_TOKEN,
        STORAGE_KEYS.GITHUB_USERNAME,
        STORAGE_KEYS.GITHUB_REPO
      ]);
      
      if (data[STORAGE_KEYS.GITHUB_TOKEN] && data[STORAGE_KEYS.GITHUB_REPO]) {
        setIsConnected(true);
        setUsername(data[STORAGE_KEYS.GITHUB_USERNAME] || 'Connected');
        setActiveTab('dashboard');
      } else {
        setIsConnected(false);
        setActiveTab('github');
      }
    }
    checkAuth();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container" onClick={openGitHub} style={{ cursor: 'pointer' }}>
          <span className="logo-text">AlgoLens</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a 
            href="https://github.com/ka333/algolens" 
            onClick={openGitHub} 
            className="header-github-link"
          >
            GitHub
          </a>
          <div className="status-badge">
            <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
            <span style={{ fontSize: '11px' }}>{isConnected ? username : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => isConnected && setActiveTab('dashboard')}
          disabled={!isConnected}
          style={{ opacity: isConnected ? 1 : 0.5, cursor: isConnected ? 'pointer' : 'not-allowed' }}
        >
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => isConnected && setActiveTab('stats')}
          disabled={!isConnected}
          style={{ opacity: isConnected ? 1 : 0.5, cursor: isConnected ? 'pointer' : 'not-allowed' }}
        >
          Stats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bulksync' ? 'active' : ''}`}
          onClick={() => isConnected && setActiveTab('bulksync')}
          disabled={!isConnected}
          style={{ opacity: isConnected ? 1 : 0.5, cursor: isConnected ? 'pointer' : 'not-allowed' }}
        >
          Bulk Sync
        </button>
        <button 
          className={`tab-btn ${activeTab === 'github' ? 'active' : ''}`}
          onClick={() => setActiveTab('github')}
        >
          GitHub
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="view-container">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'stats' && <StatsView />}
        {activeTab === 'bulksync' && <BulkSyncView />}
        {activeTab === 'github' && <GitHubView onConnectionChange={handleConnectionChange} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default App;
