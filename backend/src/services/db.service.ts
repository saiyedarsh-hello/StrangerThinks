import fs from "fs";
import path from "path";
import {
  TeamRecord,
  ChapterDef,
  SanitizedChapter,
  ActiveSabotage,
  LeaderboardEntry,
  ScoreBreakdown,
} from "../types";
import { ENV, INITIAL_REGISTERED_TEAMS, VECNA_CREDENTIAL } from "../config/env";
import { buildDefaultChapters, sanitizeChapter } from "../config/vault";
import { ScoreService } from "./score.service";
import { tidb } from "../config/tidb";

const DATA_DIR = path.resolve(__dirname, "../../data");
const STATE_FILE = path.resolve(DATA_DIR, "db-state.json");

interface DatabaseSnapshot {
  teams: Record<string, TeamRecord>;
  chapters: ChapterDef[];
  activeSabotages: Record<string, ActiveSabotage>; // key = sabotageId
}

class DatabaseService {
  private teams = new Map<string, TeamRecord>();
  private chapters: ChapterDef[] = [];
  private activeSabotages = new Map<string, ActiveSabotage>();
  private isTiDBOnline = false;

  constructor() {
    this.initStorage();
    this.ensureSeedData();
    this.initTiDB();
  }

  private async initTiDB() {
    try {
      const conn = await tidb.testConnection();
      if (conn.connected) {
        this.isTiDBOnline = true;
        await this.syncWithTiDB();
      }
    } catch (err: any) {
      this.isTiDBOnline = false;
      console.warn("[TIDB] Initial connection attempt deferred:", err.message);
    }
  }

  private async syncWithTiDB() {
    const pool = tidb.pool;
    if (!pool) return;

    try {
      // 1. Sync teams from TiDB if existing
      const [rows] = await pool.query<any[]>("SELECT * FROM teams");
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach((r: any) => {
          let breakdown = { tech: 0, puzzle: 0, speed: 0, clue: 0, story: 0, teamwork: 0 };
          try {
            if (r.breakdown_json) {
              breakdown = typeof r.breakdown_json === "string" ? JSON.parse(r.breakdown_json) : r.breakdown_json;
            }
          } catch {}

          const team: TeamRecord = {
            id: r.team_id,
            teamName: r.team_name,
            leaderName: r.squad_leader,
            role: r.role || "PLAYER",
            status: r.status || "ACTIVE",
            totalScore: r.total_score || 0,
            breakdown,
            penalty: r.penalty || 0,
            startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
            finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
            lastSolvedAt: r.last_solved_at ? new Date(r.last_solved_at).toISOString() : null,
            location: r.location || "town",
            stage: r.stage || "hawkins",
            storyProgress: r.story_progress || 5,
            completedTasks: r.completed_tasks ? (typeof r.completed_tasks === "string" ? JSON.parse(r.completed_tasks) : r.completed_tasks) : [],
            solvedChapters: r.solved_chapters ? (typeof r.solved_chapters === "string" ? JSON.parse(r.solved_chapters) : r.solved_chapters) : [],
            unlockedLocations: r.unlocked_locations ? (typeof r.unlocked_locations === "string" ? JSON.parse(r.unlocked_locations) : r.unlocked_locations) : {
              town: true,
              policeStation: true,
              byersHouse: true,
              radioTower: true,
              lab: false,
              forest: false,
              gate: false,
              upsidedown: false,
              mind: false,
            },
            radiometerPins: r.radiometer_pins ? (typeof r.radiometer_pins === "string" ? JSON.parse(r.radiometer_pins) : r.radiometer_pins) : [null, null, null, null, null],
            radiometerSolved: r.radiometer_solved ? (typeof r.radiometer_solved === "string" ? JSON.parse(r.radiometer_solved) : r.radiometer_solved) : [false, false, false, false, false],
            radiometerCodeSolved: !!r.radiometer_code_solved,
            unlockedHints: r.unlocked_hints ? (typeof r.unlocked_hints === "string" ? JSON.parse(r.unlocked_hints) : r.unlocked_hints) : {},
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          };
          this.teams.set(team.id, team);
        });
        console.log(`[TIDB SYNC] Hydrated ${rows.length} teams from TiDB cluster.`);
      } else {
        // Push in-memory teams to TiDB cluster
        for (const team of this.teams.values()) {
          await this.persistTeamToTiDB(team);
        }
      }
    } catch (err: any) {
      console.warn("[TIDB SYNC] Could not complete initial table sync (tables may need init):", err.message);
    }
  }

  private initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, "utf-8");
        const parsed: DatabaseSnapshot = JSON.parse(raw);

        if (parsed.teams) {
          Object.values(parsed.teams).forEach((t) => this.teams.set(t.id, t));
        }
        if (parsed.chapters && parsed.chapters.length > 0) {
          this.chapters = parsed.chapters;
        } else {
          this.chapters = buildDefaultChapters();
        }
        if (parsed.activeSabotages) {
          Object.entries(parsed.activeSabotages).forEach(([k, v]) =>
            this.activeSabotages.set(k, v)
          );
        }
        console.log(
          `[DATABASE] Loaded snapshot: ${this.teams.size} teams, ${this.chapters.length} chapters.`
        );
      } else {
        this.chapters = buildDefaultChapters();
        this.saveSnapshot();
      }
    } catch (err) {
      console.error("[DATABASE ERROR] Failed to load snapshot from disk:", err);
      this.chapters = buildDefaultChapters();
    }
  }

  public saveSnapshot() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const teamsObj: Record<string, TeamRecord> = {};
      this.teams.forEach((t, k) => (teamsObj[k] = t));

      const sabotagesObj: Record<string, ActiveSabotage> = {};
      this.activeSabotages.forEach((s, k) => (sabotagesObj[k] = s));

      const snapshot: DatabaseSnapshot = {
        teams: teamsObj,
        chapters: this.chapters,
        activeSabotages: sabotagesObj,
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
    } catch (err) {
      console.error("[DATABASE ERROR] Failed to save snapshot to disk:", err);
    }
  }

  private ensureSeedData() {
    const emptyBreakdown: ScoreBreakdown = {
      tech: 0,
      puzzle: 0,
      speed: 0,
      clue: 0,
      story: 0,
      teamwork: 0,
    };

    const initialUnlocked = {
      town: true,
      policeStation: true,
      byersHouse: true,
      radioTower: true,
      lab: false,
      forest: false,
      gate: false,
      upsidedown: false,
      mind: false,
    };

    // Seed default 8 teams
    INITIAL_REGISTERED_TEAMS.forEach((team) => {
      if (!this.teams.has(team.id)) {
        const now = new Date().toISOString();
        const record: TeamRecord = {
          id: team.id,
          teamName: team.teamName,
          leaderName: team.leaderName,
          role: "PLAYER",
          status: "ACTIVE",
          totalScore: 0,
          breakdown: { ...emptyBreakdown },
          penalty: 0,
          startedAt: null,
          finishedAt: null,
          lastSolvedAt: null,
          location: "town",
          stage: "hawkins",
          storyProgress: 5,
          completedTasks: [],
          solvedChapters: [],
          unlockedLocations: { ...initialUnlocked },
          radiometerPins: [null, null, null, null, null],
          radiometerSolved: [false, false, false, false, false],
          radiometerCodeSolved: false,
          unlockedHints: {},
          createdAt: now,
          updatedAt: now,
        };
        this.teams.set(team.id, record);
      }
    });

    // Seed Vecna account
    if (!this.teams.has("VECNA-001")) {
      const now = new Date().toISOString();
      const vecnaRecord: TeamRecord = {
        id: "VECNA-001",
        teamName: VECNA_CREDENTIAL.teamName,
        leaderName: VECNA_CREDENTIAL.leaderName,
        role: "VECNA",
        status: "ACTIVE",
        totalScore: 0,
        breakdown: { ...emptyBreakdown },
        penalty: 0,
        startedAt: null,
        finishedAt: null,
        lastSolvedAt: null,
        location: "mind",
        stage: "mind",
        storyProgress: 100,
        completedTasks: [],
        solvedChapters: [],
        unlockedLocations: { ...initialUnlocked, lab: true, forest: true, gate: true, upsidedown: true, mind: true },
        radiometerPins: ["8", "3", "4", "7", "9"],
        radiometerSolved: [true, true, true, true, true],
        radiometerCodeSolved: true,
        unlockedHints: {},
        createdAt: now,
        updatedAt: now,
      };
      this.teams.set("VECNA-001", vecnaRecord);
    }

    this.saveSnapshot();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TiDB Distributed Async Persistence
  // ─────────────────────────────────────────────────────────────────────────────

  public async persistTeamToTiDB(t: TeamRecord): Promise<void> {
    const pool = tidb.pool;
    if (!pool) return;

    try {
      const query = `
        INSERT INTO teams (
          team_id, team_name, squad_leader, role, access_passcode, total_score, penalty,
          status, location, stage, story_progress, started_at, finished_at, last_solved_at,
          breakdown_json, radiometer_pins, radiometer_solved, radiometer_code_solved,
          unlocked_locations, unlocked_hints, completed_tasks, solved_chapters, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          team_name = VALUES(team_name),
          squad_leader = VALUES(squad_leader),
          total_score = VALUES(total_score),
          penalty = VALUES(penalty),
          status = VALUES(status),
          location = VALUES(location),
          stage = VALUES(stage),
          story_progress = VALUES(story_progress),
          started_at = VALUES(started_at),
          finished_at = VALUES(finished_at),
          last_solved_at = VALUES(last_solved_at),
          breakdown_json = VALUES(breakdown_json),
          radiometer_pins = VALUES(radiometer_pins),
          radiometer_solved = VALUES(radiometer_solved),
          radiometer_code_solved = VALUES(radiometer_code_solved),
          unlocked_locations = VALUES(unlocked_locations),
          unlocked_hints = VALUES(unlocked_hints),
          completed_tasks = VALUES(completed_tasks),
          solved_chapters = VALUES(solved_chapters),
          updated_at = VALUES(updated_at);
      `;

      await pool.query(query, [
        t.id,
        t.teamName,
        t.leaderName,
        t.role,
        "salt_pass_player",
        t.totalScore,
        t.penalty,
        t.status,
        t.location,
        t.stage,
        t.storyProgress,
        t.startedAt ? new Date(t.startedAt) : null,
        t.finishedAt ? new Date(t.finishedAt) : null,
        t.lastSolvedAt ? new Date(t.lastSolvedAt) : null,
        JSON.stringify(t.breakdown),
        JSON.stringify(t.radiometerPins),
        JSON.stringify(t.radiometerSolved),
        t.radiometerCodeSolved ? 1 : 0,
        JSON.stringify(t.unlockedLocations),
        JSON.stringify(t.unlockedHints),
        JSON.stringify(t.completedTasks),
        JSON.stringify(t.solvedChapters),
        new Date(),
      ]);
    } catch (err: any) {
      // Non-blocking background persistence failure
      // console.warn(`[TIDB PERSISTENCE NOTICE] Team ${t.id} sync postponed:`, err.message);
    }
  }

  public async recordSubmissionLog(
    teamId: string,
    chapterId: number,
    attemptedValue: string,
    isCorrect: boolean,
    ipAddress?: string,
    responseTimeMs?: number
  ): Promise<void> {
    const pool = tidb.pool;
    if (!pool) return;

    try {
      await pool.query(
        `INSERT INTO submission_logs (team_id, chapter_id, attempted_value, is_correct, ip_address, response_time_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [teamId, chapterId, attemptedValue, isCorrect ? 1 : 0, ipAddress || null, responseTimeMs || null]
      );
    } catch {}
  }

  public async recordChapterSolve(teamId: string, chapterId: number, points: number): Promise<void> {
    const pool = tidb.pool;
    if (!pool) return;

    try {
      await pool.query(
        `INSERT INTO chapter_solves (team_id, chapter_id, points_awarded, attempts_count)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE points_awarded = VALUES(points_awarded), attempts_count = attempts_count + 1`,
        [teamId, chapterId, points]
      );
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Team CRUD & Retrieval
  // ─────────────────────────────────────────────────────────────────────────────

  public getTeamById(teamId: string): TeamRecord | undefined {
    return this.teams.get(teamId);
  }

  public getTeamByCredentials(teamName: string, leaderName: string): TeamRecord | undefined {
    const normTeam = teamName.trim().toLowerCase();
    const normLeader = leaderName.trim().toLowerCase();

    for (const team of this.teams.values()) {
      if (
        team.teamName.trim().toLowerCase() === normTeam &&
        team.leaderName.trim().toLowerCase() === normLeader
      ) {
        return team;
      }
    }
    return undefined;
  }

  public getAllTeams(): TeamRecord[] {
    return Array.from(this.teams.values()).filter((t) => t.role === "PLAYER");
  }

  public createTeam(teamName: string, leaderName: string, customId?: string, initialScore = 0): TeamRecord {
    const id = customId || `T${String(this.teams.size + 1).padStart(2, "0")}`;
    const now = new Date().toISOString();

    const emptyBreakdown: ScoreBreakdown = {
      tech: 0,
      puzzle: 0,
      speed: 0,
      clue: 0,
      story: 0,
      teamwork: initialScore,
    };

    const newTeam: TeamRecord = {
      id,
      teamName,
      leaderName,
      role: "PLAYER",
      status: "ACTIVE",
      totalScore: initialScore,
      breakdown: emptyBreakdown,
      penalty: 0,
      startedAt: now,
      finishedAt: null,
      lastSolvedAt: null,
      location: "town",
      stage: "hawkins",
      storyProgress: 5,
      completedTasks: [],
      solvedChapters: [],
      unlockedLocations: {
        town: true,
        policeStation: true,
        byersHouse: true,
        radioTower: true,
        lab: false,
        forest: false,
        gate: false,
        upsidedown: false,
        mind: false,
      },
      radiometerPins: [null, null, null, null, null],
      radiometerSolved: [false, false, false, false, false],
      radiometerCodeSolved: false,
      unlockedHints: {},
      createdAt: now,
      updatedAt: now,
    };

    this.teams.set(id, newTeam);
    this.saveSnapshot();
    this.persistTeamToTiDB(newTeam);
    return newTeam;
  }

  public updateTeam(teamId: string, updates: Partial<TeamRecord>): TeamRecord | undefined {
    const existing = this.teams.get(teamId);
    if (!existing) return undefined;

    const updated: TeamRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recompute total score if breakdown or penalty changed
    if (updates.breakdown || updates.penalty !== undefined) {
      updated.totalScore = ScoreService.calculateTotalScore(updated.breakdown, updated.penalty);
    }

    this.teams.set(teamId, updated);
    this.saveSnapshot();
    this.persistTeamToTiDB(updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Chapters & Questions Management
  // ─────────────────────────────────────────────────────────────────────────────

  public getRawChapters(): ChapterDef[] {
    return this.chapters;
  }

  public getSanitizedChapters(): SanitizedChapter[] {
    return this.chapters.map((c) => sanitizeChapter(c));
  }

  public getRawChapterById(id: number): ChapterDef | undefined {
    return this.chapters.find((c) => c.id === id);
  }

  public getSanitizedChapterById(id: number): SanitizedChapter | undefined {
    const ch = this.getRawChapterById(id);
    return ch ? sanitizeChapter(ch) : undefined;
  }

  public updateChapter(id: number, updates: Partial<ChapterDef>): ChapterDef | undefined {
    const idx = this.chapters.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;

    this.chapters[idx] = {
      ...this.chapters[idx],
      ...updates,
    };
    this.saveSnapshot();

    // Async TiDB persist
    const pool = tidb.pool;
    if (pool) {
      const ch = this.chapters[idx];
      pool.query(
        `UPDATE chapters SET points = ?, title = ?, subtitle = ? WHERE chapter_id = ?`,
        [ch.points, ch.archiveTitle, ch.archiveSubtitle, id]
      ).catch(() => {});

      if (ch.questions?.[0]) {
        pool.query(
          `UPDATE chapter_questions SET prompt = ?, correct_answer = ? WHERE chapter_id = ?`,
          [ch.questions[0].question, ch.questions[0].correctAnswerId, id]
        ).catch(() => {});
      }
    }

    return this.chapters[idx];
  }

  public deleteChapter(id: number): boolean {
    const idx = this.chapters.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.chapters.splice(idx, 1);
    this.saveSnapshot();

    const pool = tidb.pool;
    if (pool) {
      pool.query(`UPDATE chapters SET is_active = FALSE WHERE chapter_id = ?`, [id]).catch(() => {});
    }

    return true;
  }

  public resetChaptersToDefault(): ChapterDef[] {
    this.chapters = buildDefaultChapters();
    this.saveSnapshot();
    return this.chapters;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Leaderboard Calculation
  // ─────────────────────────────────────────────────────────────────────────────

  public getLeaderboard(): LeaderboardEntry[] {
    const playerTeams = this.getAllTeams();

    playerTeams.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // Tie-breaker: earlier last solve timestamp wins
      if (a.lastSolvedAt && b.lastSolvedAt) {
        return new Date(a.lastSolvedAt).getTime() - new Date(b.lastSolvedAt).getTime();
      }
      if (a.lastSolvedAt) return -1;
      if (b.lastSolvedAt) return 1;
      return a.teamName.localeCompare(b.teamName);
    });

    return playerTeams.map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      teamName: t.teamName,
      leaderName: t.leaderName,
      score: t.totalScore,
      breakdown: t.breakdown,
      solvedCount: t.solvedChapters.length + t.completedTasks.length,
      completedTasks: [
        ...t.solvedChapters.map((cid) => `ch${cid}`),
        ...t.completedTasks,
      ],
      lastSubmissionTime: t.lastSolvedAt || t.updatedAt,
      status: t.status,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sabotage Management
  // ─────────────────────────────────────────────────────────────────────────────

  public addSabotage(sabotage: ActiveSabotage): void {
    this.activeSabotages.set(String(sabotage.id), sabotage);
    this.saveSnapshot();

    const pool = tidb.pool;
    if (pool) {
      pool.query(
        `INSERT INTO active_sabotages (sabotage_id, source_team, target_team, kind, pin_index, message, duration_ms, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sabotage.id,
          sabotage.operatorName || "VECNA",
          sabotage.target,
          sabotage.kind,
          sabotage.pinIndex || null,
          sabotage.message || null,
          45000,
          sabotage.expiresAt,
        ]
      ).catch(() => {});
    }
  }

  public removeSabotage(id: number): void {
    this.activeSabotages.delete(String(id));
    this.saveSnapshot();

    const pool = tidb.pool;
    if (pool) {
      pool.query(`DELETE FROM active_sabotages WHERE sabotage_id = ?`, [id]).catch(() => {});
    }
  }

  public getActiveSabotages(): ActiveSabotage[] {
    const now = Date.now();
    const active: ActiveSabotage[] = [];
    this.activeSabotages.forEach((s, k) => {
      if (s.expiresAt > now) {
        active.push(s);
      } else {
        this.activeSabotages.delete(k);
      }
    });
    return active;
  }
}

export const db = new DatabaseService();
