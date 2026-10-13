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
import { EventControlService } from "./eventControl.service";
import { SessionService } from "./session.service";
import { socketService } from "./socket.service";

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
    if (!EventControlService.isGameplayAllowedSync()) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "EVENT_PAUSED",
        message: "GAMEPLAY MUTATIONS SUSPENDED: Tournament is currently paused by Chief Administrator.",
      };
    }

    if (teamId && !SessionService.hasActiveSessionSync(teamId)) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "SESSION_REVOKED",
        message: "ACCESS DENIED: Team session has been invalidated or logged out.",
      };
    }

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
    if (team && team.role === "VECNA") {
      return {
        success: false,
        pointsAwarded: 0,
        error: "ROLE_UNAUTHORIZED",
        message: "ACCESS DENIED: Vecna squads cannot submit Hawkins investigation solutions.",
      };
    }
    const questions = rawChapter.questions || [];

    // Case A: Batch docket submission (Array or Object map of answers)
    if (Array.isArray(answer) || (typeof answer === "object" && answer !== null)) {
      let correctCount = 0;
      questions.forEach((q, idx) => {
        let chosen = "";
        if (Array.isArray(answer)) {
          chosen = String(answer[idx] || "");
        } else {
          chosen = String((answer as Record<number, string>)[idx] || (answer as any)[q.id] || "");
        }
        if (chosen && chosen.trim().toUpperCase() === q.correctAnswerId.trim().toUpperCase()) {
          correctCount++;
        }
      });

      // Questions are already individually evaluated and scored via QuestionService (+10 PTS per correct question).
      // Final docket submission completes the chapter milestone and must NOT double-award points (+20 glitch fix).
      const totalAwarded = 0;

      if (team) {
        const isAlreadySolved = team.solvedChapters?.includes(chapterId);
        if (isAlreadySolved) {
          return {
            success: true,
            pointsAwarded: 0,
            speedBonus: 0,
            correctCount,
            totalCount: questions.length,
            message: `TELEMETRY CONFIRMED · CHAPTER ${chapterId} ALREADY SOLVED`,
            completionLore: {
              title: rawChapter.completionLoreTitle,
              text: rawChapter.completionLoreText,
              lines: rawChapter.completionLines,
            },
          };
        }

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

        const updated = db.updateTeam(team.id, {
          solvedChapters: nextSolvedChapters,
          completedTasks: nextCompletedTasks,
          unlockedLocations: nextUnlocked,
          storyProgress: Math.max(team.storyProgress, nextProgress),
          lastSolvedAt: new Date().toISOString(),
        });

        // Record in TiDB chapter_solves
        db.recordChapterSolve(team.id, chapterId, 0).catch(() => {});

        if (updated) {
          socketService.broadcastLeaderboard();
        }
      }

      return {
        success: true,
        pointsAwarded: 0,
        speedBonus: 0,
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
    const isMcqCorrect = firstQ && candidateAnswer.trim().toUpperCase() === firstQ.correctAnswerId.trim().toUpperCase();
    const effectiveTaskId = taskId === "ch6-upsidedown" ? "ch7-upsidedown" : taskId;
    const taskSecret = STORY_TASK_SECRETS[taskId] || STORY_TASK_SECRETS[effectiveTaskId];
    const isTaskSecretCorrect = taskSecret && taskSecret.answerPattern.test(candidateAnswer.trim());

    if (isMcqCorrect || isTaskSecretCorrect) {
      // Unified scoring rules: Correct = +10 PTS, Wrong = 0 PTS
      const basePoints = 10;
      const speedBonus = 0;
      const totalAwarded = basePoints;

      if (team) {
        const isAlreadySolved = team.solvedChapters?.includes(chapterId);
        if (isAlreadySolved) {
          return {
            success: true,
            pointsAwarded: 0,
            speedBonus: 0,
            correctCount: questions.length,
            totalCount: questions.length,
            message: `TELEMETRY CONFIRMED · CHAPTER ${chapterId} ALREADY SOLVED`,
            completionLore: {
              title: rawChapter.completionLoreTitle,
              text: rawChapter.completionLoreText,
              lines: rawChapter.completionLines,
            },
          };
        }

        const nextSolvedChapters = Array.from(new Set([...team.solvedChapters, chapterId]));
        const nextCompletedTasks = Array.from(new Set([...team.completedTasks, taskId]));

        const updated = db.updateTeam(team.id, {
          solvedChapters: nextSolvedChapters,
          completedTasks: nextCompletedTasks,
          lastSolvedAt: new Date().toISOString(),
          breakdown: {
            ...team.breakdown,
            tech: team.breakdown.tech + basePoints,
          },
        });

        if (updated) {
          const scorePayload = {
            type: "SCORE_UPDATE",
            teamId: team.id,
            teamName: team.teamName,
            newScore: updated.totalScore,
            delta: totalAwarded,
            chapterId,
            taskId,
            breakdown: updated.breakdown,
            source: "CHAPTER_SOLVED",
            ts: Date.now(),
          };
          socketService.emitToTeam(team.id, "score:update", scorePayload);
          socketService.broadcast("score:update", scorePayload);
        }
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
    if (!EventControlService.isGameplayAllowedSync()) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "EVENT_PAUSED",
        message: "GAMEPLAY MUTATIONS SUSPENDED: Tournament is currently paused by Chief Administrator.",
      };
    }

    if (teamId && !SessionService.hasActiveSessionSync(teamId)) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "SESSION_REVOKED",
        message: "ACCESS DENIED: Team session has been invalidated or logged out.",
      };
    }

    const effectiveTaskId = taskId === "ch6-upsidedown" ? "ch7-upsidedown" : taskId;
    const secret = STORY_TASK_SECRETS[taskId] || STORY_TASK_SECRETS[effectiveTaskId];
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
    if (team && team.role === "VECNA") {
      return {
        success: false,
        pointsAwarded: 0,
        error: "ROLE_UNAUTHORIZED",
        message: "ACCESS DENIED: Vecna squads cannot submit Hawkins tasks.",
      };
    }
    const basePoints = secret.points;
    const speedBonus = team ? ScoreService.calculateSpeedBonus(basePoints, team.startedAt) : 0;
    const totalPoints = basePoints + speedBonus;

    if (team) {
      if (team.completedTasks?.includes(taskId)) {
        return {
          success: true,
          pointsAwarded: 0,
          speedBonus: 0,
          message: `TASK ALREADY ARCHIVED · [${taskId}] PREVIOUSLY VERIFIED`,
        };
      }

      const nextCompleted = Array.from(new Set([...team.completedTasks, taskId]));
      const cat = secret.category as keyof TeamRecord["breakdown"];

      const updated = db.updateTeam(team.id, {
        completedTasks: nextCompleted,
        lastSolvedAt: new Date().toISOString(),
        breakdown: {
          ...team.breakdown,
          [cat]: (team.breakdown[cat] || 0) + basePoints,
          speed: team.breakdown.speed + speedBonus,
        },
      });

      if (updated) {
        const scorePayload = {
          type: "SCORE_UPDATE",
          teamId: team.id,
          teamName: team.teamName,
          newScore: updated.totalScore,
          delta: totalPoints,
          taskId,
          breakdown: updated.breakdown,
          source: "TASK_SOLVED",
          ts: Date.now(),
        };
        socketService.emitToTeam(team.id, "score:update", scorePayload);
        socketService.broadcast("score:update", scorePayload);
      }
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
    if (!EventControlService.isGameplayAllowedSync()) {
      return {
        success: false,
        error: "EVENT_PAUSED",
        message: "GAMEPLAY MUTATIONS SUSPENDED: Tournament is currently paused by Chief Administrator.",
      };
    }

    if (teamId && !SessionService.hasActiveSessionSync(teamId)) {
      return {
        success: false,
        error: "SESSION_REVOKED",
        message: "ACCESS DENIED: Team session has been invalidated or logged out.",
      };
    }

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
        if (team.radiometerSolved?.[pinIndex]) {
          return {
            success: true,
            pinIndex,
            digit: pinSecret.digit,
            pointsAwarded: 0,
            message: `PIN ${pinIndex + 1} ALREADY CALIBRATED · DIGIT [${pinSecret.digit}]`,
          };
        }

        const nextPins = [...team.radiometerPins];
        const nextSolved = [...team.radiometerSolved];
        nextPins[pinIndex] = pinSecret.digit;
        nextSolved[pinIndex] = true;

        const updated = db.updateTeam(team.id, {
          radiometerPins: nextPins,
          radiometerSolved: nextSolved,
          lastSolvedAt: new Date().toISOString(),
          breakdown: {
            ...team.breakdown,
            puzzle: team.breakdown.puzzle + pinSecret.points,
          },
        });

        if (updated) {
          const scorePayload = {
            type: "SCORE_UPDATE",
            teamId: team.id,
            teamName: team.teamName,
            newScore: updated.totalScore,
            delta: pinSecret.points,
            breakdown: updated.breakdown,
            source: "RADIOMETER_PIN",
            ts: Date.now(),
          };
          socketService.emitToTeam(team.id, "score:update", scorePayload);
          socketService.broadcast("score:update", scorePayload);
        }
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
    if (!EventControlService.isGameplayAllowedSync()) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "EVENT_PAUSED",
        message: "GAMEPLAY MUTATIONS SUSPENDED: Tournament is currently paused by Chief Administrator.",
      };
    }

    if (teamId && !SessionService.hasActiveSessionSync(teamId)) {
      return {
        success: false,
        pointsAwarded: 0,
        error: "SESSION_REVOKED",
        message: "ACCESS DENIED: Team session has been invalidated or logged out.",
      };
    }

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
      if (team.radiometerCodeSolved) {
        return {
          success: true,
          pointsAwarded: 0,
          speedBonus: 0,
          message: "MASTER CIPHER ALREADY ACCEPTED · PREVIOUSLY UNLOCKED",
        };
      }

      const updated = db.updateTeam(team.id, {
        radiometerCodeSolved: true,
        unlockedLocations: { ...team.unlockedLocations, lab: true, gate: true },
        lastSolvedAt: new Date().toISOString(),
        breakdown: {
          ...team.breakdown,
          puzzle: team.breakdown.puzzle + basePoints,
          speed: team.breakdown.speed + speedBonus,
        },
      });

      if (updated) {
        const scorePayload = {
          type: "SCORE_UPDATE",
          teamId: team.id,
          teamName: team.teamName,
          newScore: updated.totalScore,
          delta: totalPoints,
          breakdown: updated.breakdown,
          source: "MASTER_KEYPAD",
          ts: Date.now(),
        };
        socketService.emitToTeam(team.id, "score:update", scorePayload);
        socketService.broadcast("score:update", scorePayload);
      }
    }

    return {
      success: true,
      pointsAwarded: totalPoints,
      speedBonus,
      message: "MASTER CIPHER 8-3-4-7-9 ACCEPTED · HAWKINS LAB GATE OVERRIDE UNLOCKED",
    };
  },
};
