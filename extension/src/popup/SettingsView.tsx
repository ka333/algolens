import React, { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '../utils/storage';

export function SettingsView() {
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [optOut, setOptOut] = useState<boolean>(false);
  const [commitTemplate, setCommitTemplate] = useState<string>('solve: [{difficulty}] {title} ({language})');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

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

  return (
    <div className="card">
      <h3 className="card-title">Settings</h3>

      {saveSuccess && (
        <div className="notification-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
          <span>✓ Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave}>
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
    </div>
  );
}
