import crypto from "crypto";
import { ENV } from "../config/env";
import { tidb } from "../config/tidb";
import { socketService } from "./socket.service";

export interface SessionResult {
  success: boolean;
  code?: string;
  message?: string;
  sessionId?: string;
  token?: string;
  alreadyLoggedIn?: boolean;
}

export class SessionService {
  private static localTeamSessions = new Map<
    string,
    { sessionId: string; tokenHash: string; createdAt: string; lastSeenAt: string }
  >();

  private static localVecnaSessions = new Map<
    number,
    { sessionId: string; tokenHash: string; createdAt: string; expiresAt: string }
  >();

  public static hashToken(token: string): string {
    return crypto
      .createHmac("sha256", ENV.SESSION_TOKEN_PEPPER)
      .update(token)
      .digest("hex");
  }

  /**
   * Enforces single active session per team.
   * A second login attempt will be rejected if an active session already exists.
   */
  public static async createTeamSession(teamId: string): Promise<SessionResult> {
    const pool = tidb.pool;

    // 1. Check if active session already exists in TiDB or local state
    if (pool) {
      try {
        const [existing] = await pool.query<any[]>(
          "SELECT session_id, last_seen_at FROM team_active_sessions WHERE team_id = ?",
          [teamId]
        );
        if (Array.isArray(existing) && existing.length > 0) {
          // Record blocked login audit
          await pool.query(
            "INSERT INTO team_session_audit (team_id, action_type, reason) VALUES (?, 'login_blocked_already_active', 'Active session already exists')",
            [teamId]
          ).catch(() => {});

          return {
            success: false,
            code: "ALREADY_LOGGED_IN",
            alreadyLoggedIn: true,
            message:
              "This team is already logged in on another device. Only one active session is allowed per team.",
          };
        }
      } catch (err) {
        console.warn("[SESSION SERVICE] TiDB active session lookup fallback:", err);
      }
    }

    // Check local fallback cache
    if (this.localTeamSessions.has(teamId)) {
      return {
        success: false,
        code: "ALREADY_LOGGED_IN",
        alreadyLoggedIn: true,
        message:
          "This team is already logged in on another device. Only one active session is allowed per team.",
      };
    }

    // 2. Generate random opaque session token and session ID
    const rawToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date().toISOString();

    // 3. Insert into TiDB team_active_sessions
    if (pool) {
      try {
        await pool.query(
          "INSERT INTO team_active_sessions (team_id, session_id, session_token_hash, created_at, last_seen_at) VALUES (?, ?, ?, NOW(3), NOW(3))",
          [teamId, sessionId, tokenHash]
        );

        await pool.query(
          "INSERT INTO team_session_audit (team_id, session_id, action_type, reason) VALUES (?, ?, 'login_success', 'Normal login')",
          [teamId, sessionId]
        ).catch(() => {});
      } catch (err: any) {
        // If primary key collision occurred concurrently
        if (err.code === "ER_DUP_ENTRY") {
          return {
            success: false,
            code: "ALREADY_LOGGED_IN",
            alreadyLoggedIn: true,
            message:
              "This team is already logged in on another device. Only one active session is allowed per team.",
          };
        }
        console.warn("[SESSION SERVICE] TiDB session insert fallback:", err.message);
      }
    }

    // Cache locally
    this.localTeamSessions.set(teamId, {
      sessionId,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
    });

    return {
      success: true,
      sessionId,
      token: rawToken,
      message: "Session established successfully.",
    };
  }

  /**
   * Validates if the team's session token is currently valid and active
   */
  public static async isTeamSessionActive(teamId: string, token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const pool = tidb.pool;

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT session_id FROM team_active_sessions WHERE team_id = ? AND session_token_hash = ?",
          [teamId, tokenHash]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          // Touch last_seen_at
          pool.query(
            "UPDATE team_active_sessions SET last_seen_at = NOW(3) WHERE team_id = ?",
            [teamId]
          ).catch(() => {});
          return true;
        }
      } catch (err) {
        // Fall back to local
      }
    }

    const local = this.localTeamSessions.get(teamId);
    return !!local && local.tokenHash === tokenHash;
  }

  /**
   * Deletes a team's active session (logout)
   */
  public static async deleteTeamSession(
    teamId: string,
    actionType: string = "logout",
    reason?: string,
    actorAdminId?: number
  ): Promise<void> {
    const pool = tidb.pool;
    const local = this.localTeamSessions.get(teamId);
    const sessionId = local?.sessionId || null;

    if (pool) {
      try {
        await pool.query("DELETE FROM team_active_sessions WHERE team_id = ?", [teamId]);
        await pool.query(
          "INSERT INTO team_session_audit (team_id, session_id, action_type, reason, actor_admin_id) VALUES (?, ?, ?, ?, ?)",
          [teamId, sessionId, actionType, reason || null, actorAdminId || null]
        ).catch(() => {});
      } catch (err) {
        console.warn("[SESSION SERVICE] Delete TiDB session error:", err);
      }
    }

    this.localTeamSessions.delete(teamId);
  }

  /**
   * Administrator force logout: invalidates the active session and disconnects sockets
   */
  public static async forceLogoutTeam(teamId: string, adminId: number = 1): Promise<boolean> {
    await this.deleteTeamSession(teamId, "admin_force_logout", "Admin forced session termination", adminId);

    // Notify connected sockets in team room and revoke session immediately
    socketService.emitToTeam(teamId, "session:revoked", {
      reason: "admin_force_logout",
      message: "An administrator has terminated your active session.",
      ts: Date.now(),
    });

    return true;
  }

  /**
   * Vecna sender session management
   */
  public static async createVecnaSession(senderId: number): Promise<SessionResult> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const pool = tidb.pool;

    if (pool) {
      try {
        // Upsert active sender session
        await pool.query(
          `INSERT INTO vecna_sender_sessions (vecna_sender_id, session_id, session_token_hash, created_at, last_seen_at, expires_at)
           VALUES (?, ?, ?, NOW(3), NOW(3), DATE_ADD(NOW(3), INTERVAL 24 HOUR))
           ON DUPLICATE KEY UPDATE session_id = VALUES(session_id), session_token_hash = VALUES(session_token_hash), last_seen_at = NOW(3)`,
          [senderId, sessionId, tokenHash]
        );
      } catch (err) {
        console.warn("[SESSION SERVICE] Vecna session insert error:", err);
      }
    }

    this.localVecnaSessions.set(senderId, {
      sessionId,
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt,
    });

    return {
      success: true,
      sessionId,
      token: rawToken,
      message: "Vecna sender session established.",
    };
  }

  public static async isVecnaSessionActive(senderId: number, token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const pool = tidb.pool;

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT session_id FROM vecna_sender_sessions WHERE vecna_sender_id = ? AND session_token_hash = ? AND (revoked_at IS NULL)",
          [senderId, tokenHash]
        );
        if (Array.isArray(rows) && rows.length > 0) return true;
      } catch (err) {
        // Fall back
      }
    }

    const local = this.localVecnaSessions.get(senderId);
    return !!local && local.tokenHash === tokenHash;
  }

  public static async deleteVecnaSession(senderId: number): Promise<void> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query("DELETE FROM vecna_sender_sessions WHERE vecna_sender_id = ?", [senderId]);
      } catch {}
    }
    this.localVecnaSessions.delete(senderId);
  }
}
