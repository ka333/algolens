import React, { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, getStorageData, setStorageData, removeStorageData, STORAGE_KEYS } from '../utils/storage';
import { INITIAL_STATS } from '../utils/stats';

export function SettingsView() {
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [optOut, setOptOut] = useState<boolean>(false);
  const [commitTemplate, setCommitTemplate] = useState<string>('solve: [{difficulty}] {title} ({language})');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Data management states
  const [backupMessage, setBackupMessage] = useState<string>('');

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await getAppSettings();
      setAutoSync(settings.autoSync);
      setOptOut(settings.optOutTelemetry);
      setCommitTemplate(settings.commitTemplate);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await saveAppSettings({
        autoSync,
        optOutTelemetry: optOut,
        commitTemplate: commitTemplate.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Export local statistics as a JSON file (Commit 24)
  const handleExportData = async () => {
    try {
      const data = await getStorageData(STORAGE_KEYS.LOCAL_STATS);
      const stats = data[STORAGE_KEYS.LOCAL_STATS] || INITIAL_STATS;
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(stats, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', 'algolens_stats_backup.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      setBackupMessage('✓ Stats exported successfully!');
      setTimeout(() => setBackupMessage(''), 3000);
    } catch (err) {
      setBackupMessage('❌ Failed to export data.');
    }
  };

  // Reset local statistics back to zero (Commit 24)
  const handleResetData = async () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset all local statistics and solve history? This action cannot be undone.'
    );
    if (!confirmReset) return;

    try {
      await setStorageData({ [STORAGE_KEYS.LOCAL_STATS]: INITIAL_STATS });
      setBackupMessage('✓ Local statistics reset to zero.');
      setTimeout(() => setBackupMessage(''), 3000);
    } catch (err) {
      setBackupMessage('❌ Failed to reset data.');
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">Settings</h3>

      {saveSuccess && (
        <div className="notification-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
          <span>✓ Settings saved successfully!</span>
        </div>
      )}

      {backupMessage && (
        <div className="notification-banner" style={{ 
          background: backupMessage.includes('✓') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          border: backupMessage.includes('✓') ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', 
          color: backupMessage.includes('✓') ? 'var(--success)' : 'var(--danger)' 
        }}>
          <span>{backupMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ marginBottom: '18px' }}>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input 
            type="checkbox" 
            id="autoSync"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="autoSync" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', textTransform: 'none', fontSize: '13px', fontWeight: 'normal', color: 'var(--text-primary)' }}>
            Enable Auto-Sync to GitHub
          </label>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="checkbox" 
            id="optOut"
            checked={optOut}
            onChange={(e) => setOptOut(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="optOut" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', textTransform: 'none', fontSize: '13px', fontWeight: 'normal', color: 'var(--text-primary)' }}>
            Opt-out of Global Telemetry
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Commit Message Template</label>
          <input 
            type="text" 
            className="form-input"
            value={commitTemplate}
            onChange={(e) => setCommitTemplate(e.target.value)}
            placeholder="solve: [{difficulty}] {title} ({language})"
            required
          />
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <p><strong>Supported Placeholders:</strong></p>
            <ul style={{ listStyleType: 'none', paddingLeft: '4px', marginTop: '2px' }}>
              <li>• <code>{`{title}`}</code>: problem title (e.g. Two Sum)</li>
              <li>• <code>{`{difficulty}`}</code>: difficulty (e.g. Easy)</li>
              <li>• <code>{`{language}`}</code>: language (e.g. JavaScript)</li>
              <li>• <code>{`{slug}`}</code>: URL slug (e.g. two-sum)</li>
            </ul>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSaving}
          style={{ marginTop: '10px' }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Data management backup and resetting (Commit 24) */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
        <h4 className="card-title" style={{ fontSize: '13px', marginBottom: '12px' }}>
          Data Management
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleExportData}
            style={{ padding: '8px', fontSize: '12px', flex: 1 }}
          >
            Export Backup
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleResetData}
            style={{ padding: '8px', fontSize: '12px', flex: 1, border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
          >
            Reset History
          </button>
        </div>
      </div>
    </div>
  );
}
