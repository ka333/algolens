import React, { useState, useEffect } from 'react';
import { getStorageData, STORAGE_KEYS } from '../utils/storage';

interface GlobalComparison {
  slug: string;
  difficulty: string;
  avgSolveTime: number;
  avgAttempts: number;
  percentileEstimate: number;
}

export function StatsView() {
  const [comparison, setComparison] = useState<GlobalComparison | null>(null);
  const [userTime, setUserTime] = useState<number>(0);
  const [userAttempts, setUserAttempts] = useState<number>(0);
  const [problemTitle, setProblemTitle] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function fetchStatsComparison() {
      setIsLoading(true);
      setError('');

      try {
        const statsData = await getStorageData(STORAGE_KEYS.LOCAL_STATS);
        const history = statsData[STORAGE_KEYS.LOCAL_STATS]?.history || [];

        if (history.length === 0) {
          setError('Solve a problem first to see global benchmarking!');
          setIsLoading(false);
          return;
        }

        const latestSolve = history[0];
        setProblemTitle(latestSolve.title);
        setUserTime(latestSolve.solveTimeSeconds);
        setUserAttempts(latestSolve.attempts);

        // Fetch from live backend API
        const response = await fetch(
          `https://algolens-backend.onrender.com/api/stats/${latestSolve.slug}?solveTime=${latestSolve.solveTimeSeconds}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError(`No global benchmark data available yet for "${latestSolve.title}".`);
          } else {
            setError('Could not connect to telemetry server.');
          }
          return;
        }

        const data = await response.json();
        setComparison({
          slug: data.slug,
          difficulty: data.difficulty,
          avgSolveTime: data.avgSolveTime,
          avgAttempts: data.avgAttempts,
          percentileEstimate: data.percentileEstimate
        });
      } catch (err) {
        setError('Error retrieving analytics data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatsComparison();
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (isLoading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '24px 0' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Fetching global averages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="card-title">Benchmarking</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>{error}</p>
      </div>
    );
  }

  if (!comparison) return null;

  const userPercentileRank = 100.0 - comparison.percentileEstimate;

  return (
    <div>
      <div className="card" style={{ marginBottom: '14px' }}>
        <h3 className="card-title">Global Comparison</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Comparing your solve details for <strong style={{ color: 'var(--text-primary)' }}>{problemTitle}</strong>:
        </p>

        {/* Percentile Rank Banner */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Benchmarking Rank
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: '4px' }}>
            Top {userPercentileRank.toFixed(1)}% Speed ✨
          </div>
        </div>

        {/* Solve Time Comparison */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Your Solve Time</span>
            <span style={{ fontWeight: '600' }}>{formatDuration(userTime)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Global Average</span>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatDuration(comparison.avgSolveTime)}</span>
          </div>
          <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            {/* User time vs average visual bar */}
            <div style={{ 
              height: '100%', 
              width: `${Math.min((userTime / comparison.avgSolveTime) * 50, 100)}%`, 
              background: userTime <= comparison.avgSolveTime ? 'var(--success)' : 'var(--danger)',
              borderRadius: '2px' 
            }}></div>
          </div>
        </div>

        {/* Attempts Comparison */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Your Attempts</span>
            <span style={{ fontWeight: '600' }}>{userAttempts}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Global Average</span>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{comparison.avgAttempts.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
