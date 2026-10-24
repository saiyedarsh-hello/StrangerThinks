import { tidb } from "../config/tidb";
import { EventRecord } from "../types";
import { socketService } from "./socket.service";

export class EventControlService {
  private static localEvent: EventRecord = {
    eventId: 1,
    eventCode: "HAWKINS_1983",
    eventName: "Stranger Things Hawkins Invitational 1983",
    status: "active",
    loginOpen: true,
    submissionsOpen: true,
    isPaused: false,
    startedAt: new Date().toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  public static async getEventState(): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>("SELECT * FROM events WHERE event_id = 1");
        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          return {
            eventId: r.event_id,
            eventCode: r.event_code,
            eventName: r.event_name,
            status: r.status,
            loginOpen: Boolean(r.login_open),
            submissionsOpen: Boolean(r.submissions_open),
            isPaused: Boolean(r.is_paused),
            startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
            endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null,
            createdAt: new Date(r.created_at).toISOString(),
            updatedAt: new Date(r.updated_at).toISOString(),
          };
        }
      } catch (err) {}
    }
    return this.localEvent;
  }

  public static async logAudit(
    adminId: number,
    actionType: string,
    targetType?: string,
    targetId?: string,
    details?: any
  ): Promise<void> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query(
          "INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details, occurred_at) VALUES (?, ?, ?, ?, ?, NOW(3))",
          [adminId, actionType, targetType || null, targetId || null, details ? JSON.stringify(details) : null]
        );
      } catch {}
    }
  }

  public static async startEvent(adminId: number = 1): Promise<EventRecord> {
    const { db } = await import("./db.service");
    const allTeams = db.getAllTeams();
    // Normalize any unassigned or Hawkins roles to standard PLAYER role
    for (const t of allTeams) {
      if ((t.role as string) === "HAWKINS") t.role = "PLAYER";
      if (!t.role || (t.role !== "PLAYER" && t.role !== "VECNA")) {
        t.role = "PLAYER";
      }
    }

    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query(
          "UPDATE events SET status = 'active', login_open = 1, submissions_open = 1, is_paused = 0, started_at = NOW(3), ended_at = NULL WHERE event_id = 1"
        );
      } catch {}
    }

    // Invalidate stale sessions from previous event
    const { SessionService } = await import("./session.service");
    await SessionService.resetAllSessions(adminId).catch(() => {});
    await SessionService.deleteVecnaSession(1).catch(() => {});
    await SessionService.deleteVecnaSession(2).catch(() => {});

    // Clear online tracking from stale connections
    socketService.clearAllOnlineTeams();

    // Initialize/reset all team scores to 0 upon event start while archiving past history
    await db.resetAllTeamScores();

    // Reset event-wide Vecna dispatch quota to 5/5
    const { VecnaService } = await import("./vecna.service");
    await VecnaService.resetDispatchQuota().catch(() => {});

    this.localEvent.status = "active";
    this.localEvent.loginOpen = true;
    this.localEvent.submissionsOpen = true;
    this.localEvent.isPaused = false;
    this.localEvent.startedAt = new Date().toISOString();
    this.localEvent.endedAt = null;
    await this.logAudit(adminId, "event_start");

    socketService.broadcast("event:state_changed", this.localEvent);
    socketService.broadcastLeaderboard();
    return this.getEventState();
  }

  public static async isGameplayAllowed(): Promise<boolean> {
    const state = await this.getEventState();
    return !state.isPaused && state.status === "active" && state.submissionsOpen;
  }

  public static isGameplayAllowedSync(): boolean {
    return !this.localEvent.isPaused && this.localEvent.status === "active" && this.localEvent.submissionsOpen;
  }

  public static async pauseEvent(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET is_paused = 1, status = 'paused', submissions_open = 0 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.isPaused = true;
    this.localEvent.status = "paused";
    this.localEvent.submissionsOpen = false;
    await this.logAudit(adminId, "event_pause");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async resumeEvent(adminId: number = 1): Promise<EventRecord> {
    const currentState = await this.getEventState();
    if (currentState.status === "ended") {
      throw new Error("Cannot resume an event that has permanently ended.");
    }

    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET is_paused = 0, status = 'active', submissions_open = 1 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.isPaused = false;
    this.localEvent.status = "active";
    this.localEvent.submissionsOpen = true;
    await this.logAudit(adminId, "event_resume");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async openLogin(adminId: number = 1): Promise<EventRecord> {
    const currentState = await this.getEventState();
    if (currentState.status === "ended") {
      throw new Error("Cannot open login for an event that has ended.");
    }

    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET login_open = 1 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.loginOpen = true;
    await this.logAudit(adminId, "open_login");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async closeLogin(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET login_open = 0 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.loginOpen = false;
    await this.logAudit(adminId, "close_login");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async openSubmissions(adminId: number = 1): Promise<EventRecord> {
    const currentState = await this.getEventState();
    if (currentState.status === "ended") {
      throw new Error("Cannot open submissions for an event that has ended.");
    }

    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET submissions_open = 1 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.submissionsOpen = true;
    await this.logAudit(adminId, "open_submissions");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async stopSubmissions(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET submissions_open = 0 WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.submissionsOpen = false;
    await this.logAudit(adminId, "stop_submissions");

    const state = await this.getEventState();
    socketService.broadcast("event:state_changed", state);
    return state;
  }

  public static async endEvent(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query(
          "UPDATE events SET status = 'ended', login_open = 0, submissions_open = 0, ended_at = NOW(3) WHERE event_id = 1"
        );
      } catch {}
    }
    this.localEvent.status = "ended";
    this.localEvent.loginOpen = false;
    this.localEvent.endedAt = new Date().toISOString();
    await this.logAudit(adminId, "event_end");

    // Archive final results for history
    const { db } = await import("./db.service");
    db.archiveCurrentEvent(this.localEvent.eventId, this.localEvent.eventCode);

    // Invalidate all active Hawkins team sessions and Vecna sessions
    const { SessionService } = await import("./session.service");
    await SessionService.resetAllSessions(adminId).catch(() => {});
    await SessionService.deleteVecnaSession(1).catch(() => {});
    await SessionService.deleteVecnaSession(2).catch(() => {});

    // Terminate all socket connections and clear presence
    socketService.clearAllOnlineTeams();
    socketService.broadcast("event:state_changed", this.localEvent);
    socketService.broadcast("event:ended", {
      status: "ended",
      message: "The tournament has officially ended. All active sessions are terminated.",
      endedAt: this.localEvent.endedAt,
    });

    return this.getEventState();
  }

  /**
   * Results queries computed authoritative from TiDB score ledger
   */
  public static async getOverallResults(): Promise<any[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT 
             t.team_id,
             t.team_name,
             t.squad_leader,
             COALESCE(l.ledger_sum, t.total_score) AS overall_score,
             COALESCE(s.questions_submitted, 0) AS questions_submitted,
             COALESCE(s.questions_correct, 0) AS questions_correct,
             COALESCE(h.hints_used, 0) AS hints_used,
             s.last_submission_at
           FROM teams t
           LEFT JOIN (
             SELECT team_id, SUM(points_delta) AS ledger_sum
             FROM score_ledger
             GROUP BY team_id
           ) l ON t.team_id = l.team_id
           LEFT JOIN (
             SELECT 
               team_id,
               COUNT(question_id) AS questions_submitted,
               SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS questions_correct,
               MAX(submitted_at) AS last_submission_at
             FROM question_submissions
             GROUP BY team_id
           ) s ON t.team_id = s.team_id
           LEFT JOIN (
             SELECT team_id, COUNT(hint_id) AS hints_used
             FROM team_hint_usages
             GROUP BY team_id
           ) h ON t.team_id = h.team_id
           WHERE t.role = 'PLAYER'
           ORDER BY overall_score DESC, last_submission_at ASC`
        );
        if (rows && rows.length > 0) return rows;
      } catch (err) {}
    }
    const { db } = await import("./db.service");
    return db
      .getAllTeams()
      .filter((t) => t.role === "PLAYER")
      .map((t) => ({
        team_id: t.id,
        team_name: t.teamName,
        squad_leader: t.leaderName,
        overall_score: t.totalScore || 0,
        questions_submitted: (t.solvedChapters || []).length,
        questions_correct: (t.solvedChapters || []).length,
        hints_used: Object.keys(t.unlockedHints || {}).length,
        last_submission_at: t.lastSolvedAt,
      }))
      .sort((a, b) => b.overall_score - a.overall_score);
  }

  public static async getRoundResults(): Promise<any[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT 
             t.team_id,
             t.team_name,
             r.round_id,
             r.round_name,
             COALESCE(SUM(l.points_delta), 0) AS round_score
           FROM teams t
           CROSS JOIN rounds r
           LEFT JOIN score_ledger l ON t.team_id = l.team_id AND r.round_id = l.round_id
           WHERE t.role = 'PLAYER'
           GROUP BY t.team_id, t.team_name, r.round_id, r.round_name
           ORDER BY t.team_id, r.round_id`
        );
        if (rows && rows.length > 0) return rows;
      } catch (err) {}
    }
    const { db } = await import("./db.service");
    const results: any[] = [];
    const rounds = [
      { round_id: 1, round_name: "Round 1: Hawkins Lab Breach" },
      { round_id: 2, round_name: "Round 2: The Void & Upside Down" },
      { round_id: 3, round_name: "Round 3: Creel House Finale" },
    ];
    for (const t of db.getAllTeams().filter((tm) => tm.role === "PLAYER")) {
      for (const r of rounds) {
        results.push({
          team_id: t.id,
          team_name: t.teamName,
          round_id: r.round_id,
          round_name: r.round_name,
          round_score: Math.round((t.totalScore || 0) / 3),
        });
      }
    }
    return results;
  }
}
