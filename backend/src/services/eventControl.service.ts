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
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query(
          "UPDATE events SET status = 'active', login_open = 1, submissions_open = 1, is_paused = 0, started_at = COALESCE(started_at, NOW(3)) WHERE event_id = 1"
        );
      } catch {}
    }
    this.localEvent.status = "active";
    this.localEvent.loginOpen = true;
    this.localEvent.submissionsOpen = true;
    this.localEvent.isPaused = false;
    await this.logAudit(adminId, "event_start");

    socketService.broadcast("event:state_changed", this.localEvent);
    return this.getEventState();
  }

  public static async pauseEvent(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET is_paused = 1, status = 'paused' WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.isPaused = true;
    this.localEvent.status = "paused";
    await this.logAudit(adminId, "event_pause");

    socketService.broadcast("event:state_changed", this.localEvent);
    return this.getEventState();
  }

  public static async resumeEvent(adminId: number = 1): Promise<EventRecord> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("UPDATE events SET is_paused = 0, status = 'active' WHERE event_id = 1");
      } catch {}
    }
    this.localEvent.isPaused = false;
    this.localEvent.status = "active";
    await this.logAudit(adminId, "event_resume");

    socketService.broadcast("event:state_changed", this.localEvent);
    return this.getEventState();
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

    socketService.broadcast("event:state_changed", this.localEvent);
    return this.getEventState();
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

    socketService.broadcast("event:state_changed", this.localEvent);
    return this.getEventState();
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
    this.localEvent.submissionsOpen = false;
    this.localEvent.endedAt = new Date().toISOString();
    await this.logAudit(adminId, "event_end");

    socketService.broadcast("event:state_changed", this.localEvent);
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
             COALESCE(SUM(l.points_delta), t.total_score) AS overall_score,
             COUNT(DISTINCT s.question_id) AS questions_submitted,
             COUNT(DISTINCT CASE WHEN s.is_correct = 1 THEN s.question_id END) AS questions_correct,
             COUNT(DISTINCT h.hint_id) AS hints_used,
             MAX(s.submitted_at) AS last_submission_at
           FROM teams t
           LEFT JOIN score_ledger l ON t.team_id = l.team_id
           LEFT JOIN question_submissions s ON t.team_id = s.team_id
           LEFT JOIN team_hint_usages h ON t.team_id = h.team_id
           WHERE t.role = 'PLAYER'
           GROUP BY t.team_id, t.team_name, t.squad_leader, t.total_score
           ORDER BY overall_score DESC, last_submission_at ASC`
        );
        return rows;
      } catch (err) {}
    }
    return [];
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
        return rows;
      } catch (err) {}
    }
    return [];
  }
}
