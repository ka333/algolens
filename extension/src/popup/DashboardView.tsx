import React, { useState, useEffect } from 'react';
import { getStorageData, STORAGE_KEYS } from '../utils/storage';

interface StatSummary {
  easy: number;
  medium: number;
  hard: number;
  streak: number;
  history: Array<{
    title: string;
    difficulty: string;
    language: string;
    solvedAt: string;
  }>;
}

export function DashboardView() {
  const [stats, setStats] = useState<StatSummary>({
    easy: 0,
    medium: 0,
    hard: 0,
    streak: 0,
    history: []
  });

  useEffect(() => {
    async function loadStats() {
      const data = await getStorageData(STORAGE_KEYS.LOCAL_STATS);
      if (data[STORAGE_KEYS.LOCAL_STATS]) {
        setStats(data[STORAGE_KEYS.LOCAL_STATS]);
      }
    }
    loadStats();
  }, []);

  const totalSolved = stats.easy + stats.medium + stats.hard;

  return (
    <div>
      {/* Stats Counter Cards */}
      <div className="stats-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-item">
          <div className="stat-val">{totalSolved}</div>
          <div className="stat-lbl">Solved</div>
        </div>
        <div className="stat-item">
          <div className="stat-val" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {stats.streak} 🔥
          </div>
          <div className="stat-lbl">Streak (Days)</div>
        </div>
      </div>

      {/* Difficulty breakdown */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h4 className="card-title" style={{ fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
          Difficulty Breakdown
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <span style={{ color: 'var(--success)', flex: 1 }}>Easy</span>
            <span style={{ fontWeight: '600' }}>{stats.easy}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <span style={{ color: 'var(--warning)', flex: 1 }}>Medium</span>
            <span style={{ fontWeight: '600' }}>{stats.medium}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <span style={{ color: 'var(--danger)', flex: 1 }}>Hard</span>
            <span style={{ fontWeight: '600' }}>{stats.hard}</span>
          </div>
        </div>
      </div>

      {/* Recent history list */}
      <div className="card">
        <h4 className="card-title" style={{ fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
          Recently Synced
        </h4>
        {stats.history.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
            No problems solved yet. Start coding!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.history.slice(0, 5).map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '11px',
                  borderBottom: idx === stats.history.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  paddingBottom: '6px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{item.language} • {new Date(item.solvedAt).toLocaleDateString()}</div>
                </div>
                <span style={{ 
                  color: item.difficulty === 'Easy' ? 'var(--success)' : item.difficulty === 'Medium' ? 'var(--warning)' : 'var(--danger)',
                  fontWeight: '600'
                }}>
                  {item.difficulty}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
