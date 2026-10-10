import { ScoreBreakdown } from "../types";
import { ENV } from "../config/env";

export const ScoreService = {
  /**
   * Computes the total weighted score
   */
  calculateTotalScore(breakdown: ScoreBreakdown, penalty = 0): number {
    const raw =
      breakdown.tech * ENV.WEIGHTS.tech +
      breakdown.puzzle * ENV.WEIGHTS.puzzle +
      breakdown.speed * ENV.WEIGHTS.speed +
      breakdown.clue * ENV.WEIGHTS.clue +
      breakdown.story * ENV.WEIGHTS.story +
      breakdown.teamwork * ENV.WEIGHTS.teamwork -
      penalty;

    return Math.max(0, Math.round(raw));
  },

  /**
   * Computes dynamic speed bonus based on elapsed time since startedAt
   */
  calculateSpeedBonus(basePoints: number, startedAt: string | null): number {
    if (!startedAt) return Math.round(basePoints * 0.2);
    const startMs = new Date(startedAt).getTime();
    const elapsedSec = Math.max(0, (Date.now() - startMs) / 1000);
    const remainingSec = Math.max(0, ENV.TOTAL_GAME_TIME - elapsedSec);
    const fraction = remainingSec / ENV.TOTAL_GAME_TIME;
    return Math.round(basePoints * 0.2 * fraction);
  },

  /**
   * Calculates remaining time in seconds
   */
  calculateTimeRemaining(startedAt: string | null): number {
    if (!startedAt) return ENV.TOTAL_GAME_TIME;
    const startMs = new Date(startedAt).getTime();
    const elapsedSec = Math.max(0, (Date.now() - startMs) / 1000);
    return Math.max(0, Math.floor(ENV.TOTAL_GAME_TIME - elapsedSec));
  },
};
