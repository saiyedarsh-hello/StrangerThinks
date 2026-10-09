import fs from "fs";
import path from "path";
import { SanitizedChapter, ChapterVaultSecret, AdminChapterView, LeaderboardEntry, ChapterId } from "../types";
import { SANITIZED_CHAPTERS as DEFAULT_CHAPTERS, VAULT_SECRETS as DEFAULT_SECRETS } from "./vault";

const DATA_DIR = path.resolve(__dirname, "../../data");
const STORE_PATH = path.resolve(DATA_DIR, "vault-state.json");
const LEADERBOARD_PATH = path.resolve(DATA_DIR, "leaderboard-state.json");

interface VaultStoreState {
  chapters: SanitizedChapter[];
  secrets: Record<string, ChapterVaultSecret>;
}

// In-memory store
let state: VaultStoreState = {
  chapters: JSON.parse(JSON.stringify(DEFAULT_CHAPTERS)),
  secrets: JSON.parse(JSON.stringify(DEFAULT_SECRETS)),
};

// In-memory leaderboard
interface TeamRecord {
  teamId: string;
  teamName: string;
  leaderName: string;
  score: number;
  solvedTasks: Set<string>;
  lastSubmissionTime: string;
}

const teamsMap = new Map<string, TeamRecord>();

// Prepopulate mock/initial tournament teams
const INITIAL_TEAMS = [
  { teamId: "T01", teamName: "Stack Smashers", leaderName: "Maya Lin", score: 250, solved: ["ch1-quiz", "ch2-police", "ch3-byers", "ch4-lab", "ch5-forest"] },
  { teamId: "T02", teamName: "Null Pointers", leaderName: "Aarav Sharma", score: 200, solved: ["ch1-quiz", "ch2-police", "ch3-byers", "ch4-lab"] },
  { teamId: "T03", teamName: "Byte Busters", leaderName: "Lucas Sinclair", score: 150, solved: ["ch1-quiz", "ch2-police", "ch3-byers"] },
  { teamId: "T04", teamName: "Hawkins AV Club", leaderName: "Dustin Henderson", score: 100, solved: ["ch1-quiz", "ch2-police"] },
  { teamId: "T05", teamName: "Radio Static", leaderName: "Will Byers", score: 50, solved: ["ch1-quiz"] },
  { teamId: "T06", teamName: "Upside Down Recon", leaderName: "Jim Hopper", score: 0, solved: [] },
];

INITIAL_TEAMS.forEach((t) => {
  teamsMap.set(t.teamId, {
    teamId: t.teamId,
    teamName: t.teamName,
    leaderName: t.leaderName,
    score: t.score,
    solvedTasks: new Set(t.solved),
    lastSubmissionTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  });
});

/**
 * Initialize storage directory and load persisted state if present
 */
function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.chapters && parsed.secrets) {
        state = parsed;
        console.log(`[VAULT STORE] Loaded persisted state with ${state.chapters.length} chapters.`);
      }
    } else {
      saveState();
    }

    // Load persisted leaderboard from disk if present
    if (fs.existsSync(LEADERBOARD_PATH)) {
      const rawLb = fs.readFileSync(LEADERBOARD_PATH, "utf-8");
      const parsedLb = JSON.parse(rawLb);
      if (Array.isArray(parsedLb)) {
        parsedLb.forEach((t: any) => {
          teamsMap.set(t.teamId, {
            teamId: t.teamId,
            teamName: t.teamName,
            leaderName: t.leaderName,
            score: Number(t.score),
            solvedTasks: new Set(t.solvedTasks || t.completedTasks || []),
            lastSubmissionTime: t.lastSubmissionTime || new Date().toISOString(),
          });
        });
        console.log(`[VAULT STORE] Loaded persisted leaderboard with ${teamsMap.size} teams.`);
      }
    } else {
      saveLeaderboardState();
    }
  } catch (err) {
    console.error("[VAULT STORE ERROR] Failed to load store from disk:", err);
  }
}

function saveState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[VAULT STORE ERROR] Failed to save store to disk:", err);
  }
}

function saveLeaderboardState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(teamsMap.values()).map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      leaderName: t.leaderName,
      score: t.score,
      completedTasks: Array.from(t.solvedTasks),
      lastSubmissionTime: t.lastSubmissionTime,
    }));
    fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[VAULT STORE ERROR] Failed to save leaderboard to disk:", err);
  }
}

initStorage();

export const VaultStore = {
  // Public sanitized chapters (0 answers)
  getPublicChapters(): SanitizedChapter[] {
    return state.chapters;
  },

  getPublicChapterById(id: number): SanitizedChapter | undefined {
    return state.chapters.find((c) => c.id === id);
  },

  // Secret vault verification lookup
  getSecretForTask(taskId: string): ChapterVaultSecret | undefined {
    return state.secrets[taskId];
  },

  // Full admin chapter view (with answers & validation secrets)
  getAdminChapters(): AdminChapterView[] {
    return state.chapters.map((ch) => {
      const secret = state.secrets[ch.taskId];
      let correctAnswer = "";
      if (secret) {
        if (secret.validation.correctOptionId) {
          correctAnswer = secret.validation.correctOptionId;
        } else if (secret.validation.numericAnswer !== undefined) {
          correctAnswer = String(secret.validation.numericAnswer);
        } else if (secret.validation.codeAnswer) {
          correctAnswer = secret.validation.codeAnswer;
        } else if (secret.validation.correctPhrase) {
          correctAnswer = secret.validation.correctPhrase;
        } else if (secret.validation.acceptedAnswers?.length) {
          correctAnswer = secret.validation.acceptedAnswers[0];
        }
      }

      return {
        ...ch,
        type: secret?.type || "quiz",
        correctAnswer: correctAnswer || "A",
        completionLoreTitle: secret?.completionLore?.title,
        completionLoreText: secret?.completionLore?.text,
        completionLines: secret?.completionLore?.lines,
      };
    });
  },

  // Update a chapter's prompt, options, answer key, points, lore
  updateChapter(id: number, payload: Partial<AdminChapterView>): { success: boolean; chapter?: AdminChapterView; error?: string } {
    const chIndex = state.chapters.findIndex((c) => c.id === id);
    if (chIndex === -1) {
      return { success: false, error: "CHAPTER_NOT_FOUND" };
    }

    const currentCh = state.chapters[chIndex];
    const taskId = currentCh.taskId;
    const currentSecret = state.secrets[taskId];

    // Update sanitized chapter
    if (payload.archiveTitle) currentCh.archiveTitle = payload.archiveTitle;
    if (payload.archiveSector) currentCh.archiveSector = payload.archiveSector;
    if (payload.questionPrompt !== undefined) currentCh.questionPrompt = payload.questionPrompt;
    if (payload.points !== undefined) currentCh.points = Number(payload.points);
    if (payload.options) currentCh.options = payload.options;
    if (payload.archiveLines) currentCh.archiveLines = payload.archiveLines;
    if (payload.codeSnippet !== undefined) currentCh.codeSnippet = payload.codeSnippet;
    if (payload.bgSrc) currentCh.bgSrc = payload.bgSrc;

    // Update secret vault
    if (currentSecret) {
      if (payload.points !== undefined) currentSecret.points = Number(payload.points);
      if (payload.correctAnswer !== undefined) {
        const ans = String(payload.correctAnswer).trim();
        if (currentSecret.type === "quiz" || currentSecret.type === "case_study" || currentSecret.type === "final_quiz") {
          currentSecret.validation.correctOptionId = ans.toUpperCase();
          currentSecret.validation.acceptedAnswers = [ans.toUpperCase()];
        } else if (currentSecret.type === "code") {
          const num = parseInt(ans, 10);
          currentSecret.validation.numericAnswer = isNaN(num) ? 0 : num;
          currentSecret.validation.acceptedAnswers = [ans];
        } else if (currentSecret.type === "rearrange") {
          currentSecret.validation.correctPhrase = ans;
        } else {
          currentSecret.validation.codeAnswer = ans;
          currentSecret.validation.acceptedAnswers = [ans];
        }
      }

      if (payload.completionLoreTitle) currentSecret.completionLore.title = payload.completionLoreTitle;
      if (payload.completionLoreText) currentSecret.completionLore.text = payload.completionLoreText;
      if (payload.completionLines) currentSecret.completionLore.lines = payload.completionLines;
    }

    saveState();

    const updatedAdminView = this.getAdminChapters().find((c) => c.id === id);
    return { success: true, chapter: updatedAdminView };
  },

  // Delete a chapter
  deleteChapter(id: number): { success: boolean; error?: string } {
    const chIndex = state.chapters.findIndex((c) => c.id === id);
    if (chIndex === -1) {
      return { success: false, error: "CHAPTER_NOT_FOUND" };
    }
    const [removed] = state.chapters.splice(chIndex, 1);
    delete state.secrets[removed.taskId];
    saveState();
    return { success: true };
  },

  // Reset all to default canon Stranger Things questions
  resetToDefaults(): { success: boolean; chapters: AdminChapterView[] } {
    state = {
      chapters: JSON.parse(JSON.stringify(DEFAULT_CHAPTERS)),
      secrets: JSON.parse(JSON.stringify(DEFAULT_SECRETS)),
    };
    saveState();
    return { success: true, chapters: this.getAdminChapters() };
  },

  // Track team progress live
  recordTeamScore(teamId: string, teamName: string, leaderName: string, taskId: string, pointsAwarded: number) {
    if (!teamId) return;
    const existing = teamsMap.get(teamId) || {
      teamId,
      teamName: teamName || `Team ${teamId}`,
      leaderName: leaderName || "Operative",
      score: 0,
      solvedTasks: new Set<string>(),
      lastSubmissionTime: new Date().toISOString(),
    };

    if (!existing.solvedTasks.has(taskId)) {
      existing.solvedTasks.add(taskId);
      existing.score += pointsAwarded;
    }
    existing.lastSubmissionTime = new Date().toISOString();
    teamsMap.set(teamId, existing);
    saveLeaderboardState();
  },

  // Update team score directly (Admin override)
  updateTeamScore(teamId: string, newScore: number): { success: boolean; team?: any; error?: string } {
    if (!teamId) return { success: false, error: "TEAM_ID_REQUIRED" };

    let existing = teamsMap.get(teamId);
    if (!existing) {
      for (const [id, rec] of teamsMap.entries()) {
        if (id.toLowerCase() === teamId.toLowerCase() || rec.teamName.toLowerCase() === teamId.toLowerCase()) {
          existing = rec;
          break;
        }
      }
    }

    if (!existing) {
      existing = {
        teamId,
        teamName: `Team ${teamId}`,
        leaderName: "Squad Leader",
        score: Number(newScore),
        solvedTasks: new Set<string>(),
        lastSubmissionTime: new Date().toISOString(),
      };
      teamsMap.set(teamId, existing);
    } else {
      existing.score = Number(newScore);
      existing.lastSubmissionTime = new Date().toISOString();
    }

    saveLeaderboardState();
    return { success: true, team: existing };
  },

  // Return live leaderboard
  getLeaderboard(): LeaderboardEntry[] {
    const list = Array.from(teamsMap.values()).map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      leaderName: t.leaderName,
      score: t.score,
      solvedCount: t.solvedTasks.size,
      completedTasks: Array.from(t.solvedTasks),
      lastSubmissionTime: t.lastSubmissionTime,
      status: (t.solvedTasks.size >= 7 ? "COMPLETED" : t.solvedTasks.size > 0 ? "ACTIVE" : "IDLE") as "ACTIVE" | "COMPLETED" | "IDLE",
    }));

    // Sort by score descending, then by lastSubmissionTime ascending
    list.sort((a, b) => b.score - a.score || new Date(a.lastSubmissionTime).getTime() - new Date(b.lastSubmissionTime).getTime());

    return list.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  },
};
