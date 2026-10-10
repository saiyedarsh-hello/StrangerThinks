import {
  ValidationResponse,
  PinValidationResponse,
  TeamRecord,
} from "../types";
import {
  STORY_TASK_SECRETS,
  RADIOMETER_PIN_SECRETS,
  MASTER_KEYPAD_CODE,
} from "../config/vault";
import { db } from "./db.service";
import { ScoreService } from "./score.service";

export const ValidationService = {
  /**
   * Validates a chapter submission (either single choice, full docket answers map, or text cipher)
   */
  validateChapter(
    chapterId: number,
    taskId: string,
    answer: string | Record<number, string> | string[],
    teamId?: string
  ): ValidationResponse {
    const rawChapter = db.getRawChapterById(chapterId);
    if (!rawChapter) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "CHAPTER_NOT_FOUND",
        message: `Chapter ${chapterId} does not exist in the security vault.`,
      };
    }

    const team = teamId ? db.getTeamById(teamId) : undefined;
    const questions = rawChapter.questions || [];

    // Case A: Batch docket submission (Map of index -> choice: { 0: "A", 1: "B", ... })
    if (typeof answer === "object" && !Array.isArray(answer)) {
      let correctCount = 0;
      questions.forEach((q, idx) => {
        const chosen = (answer as Record<number, string>)[idx] || (answer as any)[q.id];
        if (chosen && chosen.trim().toUpperCase() === q.correctAnswerId.trim().toUpperCase()) {
          correctCount++;
        }
      });

      // 5 points per correct question (10 Qs * 5 = 50 pts)
      const basePoints = correctCount * 5;
      const speedBonus = team ? ScoreService.calculateSpeedBonus(basePoints, team.startedAt) : 0;
      const totalAwarded = basePoints + speedBonus;

      if (team) {
        const nextSolvedChapters = Array.from(new Set([...team.solvedChapters, chapterId]));
        const nextCompletedTasks = Array.from(new Set([...team.completedTasks, taskId]));

        // Determine next unlocked locations
        const nextUnlocked = { ...team.unlockedLocations };
        if (chapterId === 1) {
          nextUnlocked.policeStation = true;
          nextUnlocked.byersHouse = true;
          nextUnlocked.radioTower = true;
        } else if (chapterId === 2) {
          nextUnlocked.lab = true;
        } else if (chapterId === 3) {
          nextUnlocked.lab = true;
        } else if (chapterId === 4) {
          nextUnlocked.forest = true;
        } else if (chapterId === 5) {
          nextUnlocked.radioTower = true;
          nextUnlocked.gate = true;
        } else if (chapterId === 6) {
          nextUnlocked.gate = true;
          nextUnlocked.upsidedown = true;
        } else if (chapterId === 7) {
          nextUnlocked.mind = true;
        }

        const nextProgress = Math.min(100, Math.round((nextSolvedChapters.length / 7) * 100));

        db.updateTeam(team.id, {
          solvedChapters: nextSolvedChapters,
          completedTasks: nextCompletedTasks,
          unlockedLocations: nextUnlocked,
          storyProgress: Math.max(team.storyProgress, nextProgress),
          lastSolvedAt: new Date().toISOString(),
          breakdown: {
            ...team.breakdown,
            tech: team.breakdown.tech + basePoints,
            speed: team.breakdown.speed + speedBonus,
            story: team.breakdown.story + 10,
          },
        });
      }

      return {
        success: true,
        pointsAwarded: totalAwarded,
        speedBonus,
        correctCount,
        totalCount: questions.length,
        message: `TELEMETRY VERIFIED · ${correctCount}/${questions.length} DOCKET ITEMS ACCURATE`,
        completionLore: {
          title: rawChapter.completionLoreTitle,
          text: rawChapter.completionLoreText,
          lines: rawChapter.completionLines,
        },
      };
    }

    // Case B: Single answer string
    const candidateAnswer = (typeof answer === "string" ? answer : String(answer[0] || "")).trim();

    // Check against first question or secret pattern
    const firstQ = questions[0];
    const isMcqCorrect = firstQ && candidateAnswer.toUpperCase() === firstQ.correctAnswerId.toUpperCase();
    const taskSecret = STORY_TASK_SECRETS[taskId];
    const isTaskSecretCorrect = taskSecret && taskSecret.answerPattern.test(candidateAnswer);

    if (isMcqCorrect || isTaskSecretCorrect) {
      const basePoints = rawChapter.points || 50;
      const speedBonus = team ? ScoreService.calculateSpeedBonus(basePoints, team.startedAt) : 0;
      const totalAwarded = basePoints + speedBonus;

      if (team) {
        const nextSolvedChapters = Array.from(new Set([...team.solvedChapters, chapterId]));
        const nextCompletedTasks = Array.from(new Set([...team.completedTasks, taskId]));

        db.updateTeam(team.id, {
          solvedChapters: nextSolvedChapters,
          completedTasks: nextCompletedTasks,
          lastSolvedAt: new Date().toISOString(),
          breakdown: {
            ...team.breakdown,
            tech: team.breakdown.tech + basePoints,
            speed: team.breakdown.speed + speedBonus,
            story: team.breakdown.story + 10,
          },
        });
      }

      return {
        success: true,
        pointsAwarded: totalAwarded,
        speedBonus,
        correctCount: questions.length,
        totalCount: questions.length,
        message: "TELEMETRY VERIFIED · CLEARANCE GRANTED",
        completionLore: {
          title: rawChapter.completionLoreTitle,
          text: rawChapter.completionLoreText,
          lines: rawChapter.completionLines,
        },
      };
    }

    return {
      success: false,
      pointsAwarded: 0,
      error: "INVALID_TELEMETRY",
      message: "ACCESS DENIED · INCONSISTENT WITH VECTOR TELEMETRY",
    };
  },

  /**
   * Validates a story task submission
   */
  validateTask(taskId: string, candidateAnswer: string, teamId?: string): ValidationResponse {
    const secret = STORY_TASK_SECRETS[taskId];
    if (!secret) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "TASK_NOT_FOUND",
        message: `Task [${taskId}] not registered in vault.`,
      };
    }

    const isMatch = secret.answerPattern.test(candidateAnswer.trim());
    if (!isMatch) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "INVALID_SOLUTION",
        message: "ACCESS DENIED · TASK CIPHER MISMATCH",
      };
    }

    const team = teamId ? db.getTeamById(teamId) : undefined;
    const basePoints = secret.points;
    const speedBonus = team ? ScoreService.calculateSpeedBonus(basePoints, team.startedAt) : 0;
    const totalPoints = basePoints + speedBonus;

    if (team) {
      const nextCompleted = Array.from(new Set([...team.completedTasks, taskId]));
      const cat = secret.category as keyof TeamRecord["breakdown"];

      db.updateTeam(team.id, {
        completedTasks: nextCompleted,
        lastSolvedAt: new Date().toISOString(),
        breakdown: {
          ...team.breakdown,
          [cat]: (team.breakdown[cat] || 0) + basePoints,
          speed: team.breakdown.speed + speedBonus,
        },
      });
    }

    return {
      success: true,
      pointsAwarded: totalPoints,
      speedBonus,
      message: "TASK VERIFIED · INTEL ARCHIVED",
    };
  },

  /**
   * Validates a 5-pin radiometer calibration pin
   */
  validateRadiometerPin(pinIndex: number, answer: any, teamId?: string): PinValidationResponse {
    const pinSecret = RADIOMETER_PIN_SECRETS[pinIndex];
    if (!pinSecret) {
      return {
        success: false,
        error: "INVALID_PIN_INDEX",
        message: `Radiometer pin index ${pinIndex} is out of bounds (0-4).`,
      };
    }

    const candidate = String(answer || "").trim();
    // Verify candidate digit or answers matching pin
    const isCorrect = candidate === pinSecret.digit || candidate === "83479"[pinIndex];

    if (isCorrect) {
      const team = teamId ? db.getTeamById(teamId) : undefined;
      if (team) {
        const nextPins = [...team.radiometerPins];
        const nextSolved = [...team.radiometerSolved];
        nextPins[pinIndex] = pinSecret.digit;
        nextSolved[pinIndex] = true;

        db.updateTeam(team.id, {
          radiometerPins: nextPins,
          radiometerSolved: nextSolved,
          lastSolvedAt: new Date().toISOString(),
          breakdown: {
            ...team.breakdown,
            puzzle: team.breakdown.puzzle + pinSecret.points,
          },
        });
      }

      return {
        success: true,
        pinIndex,
        digit: pinSecret.digit,
        pointsAwarded: pinSecret.points,
        message: `PIN ${pinIndex + 1} HARMONICALLY CALIBRATED · DIGIT [${pinSecret.digit}]`,
      };
    }

    return {
      success: false,
      pinIndex,
      error: "FREQUENCY_MISMATCH",
      message: `PIN ${pinIndex + 1} CALIBRATION FAILED · STATIC OVERFLOW`,
    };
  },

  /**
   * Validates the 5-digit master keypad cipher
   */
  validateMasterKeypad(code: string, teamId?: string): ValidationResponse {
    const isMatch = code.trim() === MASTER_KEYPAD_CODE;
    if (!isMatch) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "INVALID_MASTER_CODE",
        message: "ACCESS DENIED · MASTER SECURITY CODE MISMATCH",
      };
    }

    const team = teamId ? db.getTeamById(teamId) : undefined;
    const basePoints = 200;
    const speedBonus = team ? ScoreService.calculateSpeedBonus(basePoints, team.startedAt) : 0;
    const totalPoints = basePoints + speedBonus;

    if (team) {
      db.updateTeam(team.id, {
        radiometerCodeSolved: true,
        unlockedLocations: { ...team.unlockedLocations, lab: true, gate: true },
        lastSolvedAt: new Date().toISOString(),
        breakdown: {
          ...team.breakdown,
          puzzle: team.breakdown.puzzle + basePoints,
          speed: team.breakdown.speed + speedBonus,
        },
      });
    }

    return {
      success: true,
      pointsAwarded: totalPoints,
      speedBonus,
      message: "MASTER CIPHER 8-3-4-7-9 ACCEPTED · HAWKINS LAB GATE OVERRIDE UNLOCKED",
    };
  },
};
