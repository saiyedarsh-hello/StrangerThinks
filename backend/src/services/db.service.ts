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
  vecnaProgress?: Record<string, Record<string, any>>;
  eventHistory?: any[];
}

class DatabaseService {
  private teams = new Map<string, TeamRecord>();
  private chapters: ChapterDef[] = [];
  private activeSabotages = new Map<string, ActiveSabotage>();
  private vecnaQuestionProgress = new Map<string, Record<string, any>>();
  private eventHistory: any[] = [];
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

  public async syncWithTiDB() {
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
        // Authoritative security vault questions must always take precedence to ensure accurate answers
        this.chapters = buildDefaultChapters();
        if (parsed.activeSabotages) {
          Object.entries(parsed.activeSabotages).forEach(([k, v]) =>
            this.activeSabotages.set(k, v)
          );
        }
        if (parsed.vecnaProgress) {
          Object.entries(parsed.vecnaProgress).forEach(([k, v]) =>
            this.vecnaQuestionProgress.set(k, v)
          );
        }
        if (parsed.eventHistory && Array.isArray(parsed.eventHistory)) {
          this.eventHistory = parsed.eventHistory;
        }
        console.log(
          `[DATABASE] Loaded snapshot: ${this.teams.size} teams, ${this.chapters.length} chapters, ${this.eventHistory.length} historical events.`
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

      const vecnaProgObj: Record<string, Record<string, any>> = {};
      this.vecnaQuestionProgress.forEach((p, k) => (vecnaProgObj[k] = p));

      const snapshot: DatabaseSnapshot = {
        teams: teamsObj,
        chapters: this.chapters,
        activeSabotages: sabotagesObj,
        vecnaProgress: vecnaProgObj,
        eventHistory: this.eventHistory,
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
          role = VALUES(role),
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
    if (!teamId) return undefined;
    const direct = this.teams.get(teamId);
    if (direct) return direct;

    const clean = teamId.trim().toUpperCase();
    for (const [id, team] of this.teams.entries()) {
      if (id.toUpperCase() === clean) return team;
      const numA = id.replace(/\D/g, "");
      const numB = clean.replace(/\D/g, "");
      if (numA && numB && parseInt(numA, 10) === parseInt(numB, 10)) {
        if ((id.startsWith("T") || id.startsWith("TEAM")) && (clean.startsWith("T") || clean.startsWith("TEAM"))) {
          return team;
        }
        if (id.startsWith("VECNA") && clean.startsWith("VECNA")) {
          return team;
        }
      }
    }
    return undefined;
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
    return Array.from(this.teams.values()).filter((t) => t.role === "PLAYER" || t.role === "VECNA");
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

  public archiveCurrentEvent(eventId = 1, eventCode = "HAWKINS_1983"): void {
    const results = Array.from(this.teams.values())
      .filter((t) => t.role === "PLAYER" || t.role === "VECNA")
      .map((t) => ({
        teamId: t.id,
        teamName: t.teamName,
        leaderName: t.leaderName,
        role: t.role,
        score: t.totalScore,
        penalty: t.penalty,
        solvedChapters: [...(t.solvedChapters || [])],
        completedTasks: [...(t.completedTasks || [])],
        lastSolvedAt: t.lastSolvedAt,
      }));

    this.eventHistory.push({
      eventId,
      eventCode,
      archivedAt: new Date().toISOString(),
      results,
    });
    this.saveSnapshot();
  }

  public getEventHistory(): any[] {
    return this.eventHistory;
  }

  public async resetAllTeamScores(): Promise<void> {
    if (this.eventHistory.length === 0) {
      this.archiveCurrentEvent();
    }
    for (const team of this.teams.values()) {
      team.totalScore = 0;
      team.penalty = 0;
      team.lastSolvedAt = null;
      team.solvedChapters = [];
      team.completedTasks = [];
      team.taskScores = {};
      team.unlockedHints = {};
      team.radiometerPins = ["-", "-", "-", "-", "-"];
      team.radiometerSolved = [false, false, false, false, false];
      team.breakdown = { tech: 0, puzzle: 0, speed: 0, clue: 0, story: 0, teamwork: 0 };
    }
    this.vecnaQuestionProgress.clear();
    this.activeSabotages.clear();
    this.saveSnapshot();
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE teams SET total_score = 0, penalty = 0, last_solved_at = NULL");
        // Backup historical tables before preparing clean workspace for next event
        await pool.query("CREATE TABLE IF NOT EXISTS historical_score_ledger LIKE score_ledger").catch(() => {});
        await pool.query("INSERT IGNORE INTO historical_score_ledger SELECT * FROM score_ledger").catch(() => {});
        await pool.query("CREATE TABLE IF NOT EXISTS historical_question_submissions LIKE question_submissions").catch(() => {});
        await pool.query("INSERT IGNORE INTO historical_question_submissions SELECT * FROM question_submissions").catch(() => {});
        await pool.query("CREATE TABLE IF NOT EXISTS historical_team_hint_usages LIKE team_hint_usages").catch(() => {});
        await pool.query("INSERT IGNORE INTO historical_team_hint_usages SELECT * FROM team_hint_usages").catch(() => {});
        await pool.query("DELETE FROM score_ledger WHERE 1=1").catch(() => {});
        await pool.query("DELETE FROM question_submissions WHERE 1=1").catch(() => {});
        await pool.query("DELETE FROM team_hint_usages WHERE 1=1").catch(() => {});
      } catch {}
    }
  }

  public updateTeam(teamId: string, updates: Partial<TeamRecord>): TeamRecord | undefined {
    const existing = this.teams.get(teamId);
    if (!existing) return undefined;

    const updated: TeamRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.taskScores) {
      updated.taskScores = {
        ...(existing.taskScores || {}),
        ...updates.taskScores,
      };
    }

    // Authoritative totalScore calculation:
    // 1. Explicit totalScore update has highest precedence
    if (updates.totalScore !== undefined) {
      updated.totalScore = Number(updates.totalScore);
    } else if (updates.breakdown) {
      // 2. Explicit breakdown provided: compute from breakdown and penalty
      updated.totalScore = ScoreService.calculateTotalScore(updated.breakdown, updated.penalty);
    } else if (updates.penalty !== undefined) {
      // 3. Penalty changed alone without breakdown: deduct delta penalty from existing totalScore
      // DO NOT recompute from empty breakdown!
      const deltaPenalty = (Number(updates.penalty) || 0) - (Number(existing.penalty) || 0);
      updated.totalScore = Math.max(0, (Number(existing.totalScore) || 0) - deltaPenalty);
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

    return playerTeams.map((t, i) => {
      const distinctStages = new Set<number>();
      (t.solvedChapters || []).forEach((c) => {
        const num = Number(c);
        if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
      });
      (t.completedTasks || []).forEach((task) => {
        const m = String(task).match(/^(?:ch|chapter)[\-_]?(\d+)/i);
        if (m) {
          const num = Number(m[1]);
          if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
        }
      });
      const distinctCompleted = Array.from(new Set([
        ...(t.solvedChapters || []).map((cid) => `ch${cid}`),
        ...(t.completedTasks || []),
      ]));

      return {
        rank: i + 1,
        teamId: t.id,
        teamName: t.teamName,
        leaderName: t.leaderName,
        score: t.totalScore,
        breakdown: t.breakdown,
        solvedCount: distinctStages.size,
        completedTasks: distinctCompleted,
        lastSubmissionTime: t.lastSolvedAt || t.updatedAt,
        status: t.status,
      };
    });
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Vecna Question Progression & Sequential Access
  // ─────────────────────────────────────────────────────────────────────────────

  public getVecnaProgress(
    teamId: string,
    trialId: number
  ): Record<
    number,
    {
      status: "solved" | "failed" | "attempt_1_failed";
      earnedPoints: number;
      chosenAnswer: string;
      attempts: number;
      isLocked: boolean;
      clueUnlocked?: boolean;
      submittedAt: string;
    }
  > {
    const teamMap = this.vecnaQuestionProgress.get(teamId) || {};
    const trialProgress: Record<
      number,
      {
        status: "solved" | "failed" | "attempt_1_failed";
        earnedPoints: number;
        chosenAnswer: string;
        attempts: number;
        isLocked: boolean;
        clueUnlocked?: boolean;
        submittedAt: string;
      }
    > = {};
    for (let i = 0; i < 10; i++) {
      const key = `${trialId}-${i}`;
      if (teamMap[key]) {
        trialProgress[i] = teamMap[key];
      }
    }
    return trialProgress;
  }

  public recordVecnaAttempt(
    teamId: string,
    trialId: number,
    questionIdx: number,
    status: "solved" | "failed" | "attempt_1_failed",
    earnedPoints: number,
    chosenAnswer: string,
    attempts: number = 1,
    isLocked: boolean = false
  ): void {
    const key = `${trialId}-${questionIdx}`;
    const teamMap = this.vecnaQuestionProgress.get(teamId) || {};
    const existing = teamMap[key] || {};
    teamMap[key] = {
      ...existing,
      status,
      earnedPoints,
      chosenAnswer,
      attempts,
      isLocked,
      submittedAt: new Date().toISOString(),
    };
    this.vecnaQuestionProgress.set(teamId, teamMap);
    this.saveSnapshot();
  }

  public unlockVecnaClue(teamId: string, trialId: number, questionIdx: number): void {
    const key = `${trialId}-${questionIdx}`;
    const teamMap = this.vecnaQuestionProgress.get(teamId) || {};
    const existing = teamMap[key] || {
      status: "unanswered",
      earnedPoints: 0,
      chosenAnswer: "",
      attempts: 0,
      isLocked: false,
    };
    teamMap[key] = {
      ...existing,
      clueUnlocked: true,
      clueUnlockedAt: new Date().toISOString(),
    };
    this.vecnaQuestionProgress.set(teamId, teamMap);
    this.saveSnapshot();
  }
}

export const db = new DatabaseService();
