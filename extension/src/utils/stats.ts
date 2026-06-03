// Stats Utility - Storage Schema & Calculations

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
