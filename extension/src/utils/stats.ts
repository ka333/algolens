// Stats Utility - Storage Schema & Calculations
import { getStorageData, setStorageData, STORAGE_KEYS } from './storage';

export interface ProblemRecord {
  slug: string;
  title: string;
  difficulty: string;
  language: string;
  runtime: string;
  memory: string;
  solveTimeSeconds: number;
  attempts: number;
  solvedAt: string;
}

export interface LocalStatsSummary {
  easy: number;
  medium: number;
  hard: number;
  streak: number;
  lastSolvedDate: string | null;
  solvedSlugs: string[];
  history: ProblemRecord[];
}

export const INITIAL_STATS: LocalStatsSummary = {
  easy: 0,
  medium: 0,
  hard: 0,
  streak: 0,
  lastSolvedDate: null,
  solvedSlugs: [],
  history: []
};

// Formats a Date object to YYYY-MM-DD local string
function getLocalDateString(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Check difference in days between two date strings (YYYY-MM-DD)
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function recordSubmissionStats(record: ProblemRecord): Promise<LocalStatsSummary> {
  const storageData = await getStorageData(STORAGE_KEYS.LOCAL_STATS);
  const currentStats: LocalStatsSummary = {
    ...INITIAL_STATS,
    ...(storageData[STORAGE_KEYS.LOCAL_STATS] || {})
  };

  const isAlreadySolved = currentStats.solvedSlugs.includes(record.slug);
  const todayStr = getLocalDateString(record.solvedAt);

  // 1. Increment difficulty counter if first time solved
  if (!isAlreadySolved) {
    const diff = record.difficulty.toLowerCase();
    if (diff === 'easy') currentStats.easy++;
    else if (diff === 'medium') currentStats.medium++;
    else if (diff === 'hard') currentStats.hard++;
    
    currentStats.solvedSlugs.push(record.slug);
  }

  // 2. Streak calculations
  if (!currentStats.lastSolvedDate) {
    currentStats.streak = 1;
  } else {
    const lastSolvedStr = getLocalDateString(currentStats.lastSolvedDate);
    const dayDiff = getDaysDifference(lastSolvedStr, todayStr);

    if (dayDiff === 1) {
      // Solved yesterday, increment streak
      currentStats.streak++;
    } else if (dayDiff > 1) {
      // Broke streak
      currentStats.streak = 1;
    }
    // If dayDiff === 0 (already solved today), streak remains unchanged
  }

  currentStats.lastSolvedDate = record.solvedAt;

  // 3. Update history list
  // Remove if already in history list to avoid duplication and add latest solved to top
  currentStats.history = currentStats.history.filter(item => item.slug !== record.slug);
  currentStats.history.unshift(record);

  // Cap history list at 50 logs
  if (currentStats.history.length > 50) {
    currentStats.history = currentStats.history.slice(0, 50);
  }

  // Save back to storage
  await setStorageData({ [STORAGE_KEYS.LOCAL_STATS]: currentStats });
  return currentStats;
}
