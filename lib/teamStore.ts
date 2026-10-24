/**
 * HAWKINS PROTOCOL - IN-MEMORY TEAM PROGRESS STORE (SERVER-SIDE)
 * Preserves solved chapters, completed tasks, scores, and breakdowns across
 * participant sessions and logouts when running in local or offline mode.
 */

export interface SavedTeamProgress {
  teamId: string;
  completedTasks: string[];
  solvedChapters: number[];
  taskScores: Record<string, number>;
  unlockedLocations: Record<string, boolean>;
  storyProgress: number;
  breakdown: any;
  totalScore: number;
  penalty: number;
  updatedAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __hawkins_team_progress_store: Record<string, SavedTeamProgress> | undefined;
}

if (!globalThis.__hawkins_team_progress_store) {
  globalThis.__hawkins_team_progress_store = {};
}

export function saveTeamProgress(progress: {
  teamId: string;
  completedTasks?: string[];
  solvedChapters?: number[];
  taskScores?: Record<string, number>;
  unlockedLocations?: Record<string, boolean>;
  storyProgress?: number;
  breakdown?: any;
  totalScore?: number;
  penalty?: number;
}): SavedTeamProgress {
  const store = globalThis.__hawkins_team_progress_store!;
  const existing = store[progress.teamId] || {
    teamId: progress.teamId,
    completedTasks: [],
    solvedChapters: [],
    taskScores: {},
    unlockedLocations: {},
    storyProgress: 10,
    breakdown: { tech: 0, puzzle: 0, clue: 0, speed: 0, story: 0, teamwork: 0 },
    totalScore: 0,
    penalty: 0,
    updatedAt: Date.now(),
  };

  const updated: SavedTeamProgress = {
    teamId: progress.teamId,
    completedTasks: Array.from(
      new Set([...(existing.completedTasks || []), ...(progress.completedTasks || [])])
    ),
    solvedChapters: Array.from(
      new Set([...(existing.solvedChapters || []), ...(progress.solvedChapters || [])])
    ),
    taskScores: { ...(existing.taskScores || {}), ...(progress.taskScores || {}) },
    unlockedLocations: {
      ...(existing.unlockedLocations || {}),
      ...(progress.unlockedLocations || {}),
    },
    storyProgress: progress.storyProgress ?? existing.storyProgress ?? 10,
    breakdown: progress.breakdown || existing.breakdown,
    totalScore:
      typeof progress.totalScore === "number"
        ? Math.max(progress.totalScore, existing.totalScore || 0)
        : existing.totalScore || 0,
    penalty: progress.penalty ?? existing.penalty ?? 0,
    updatedAt: Date.now(),
  };

  store[progress.teamId] = updated;
  return updated;
}

export function getTeamProgress(teamId: string): SavedTeamProgress | null {
  const store = globalThis.__hawkins_team_progress_store;
  if (!store || !store[teamId]) return null;
  return store[teamId];
}
