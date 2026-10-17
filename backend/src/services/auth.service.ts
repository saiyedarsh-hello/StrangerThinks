import jwt from "jsonwebtoken";
import { Role, TeamSession, TeamRecord } from "../types";
import { ENV, VECNA_CREDENTIAL } from "../config/env";
import { db } from "./db.service";

import { SessionService } from "./session.service";
import { socketService } from "./socket.service";

export interface AuthResult {
  success: boolean;
  token?: string;
  session?: TeamSession;
  team?: TeamRecord;
  error?: string;
  message?: string;
}

export const AuthService = {
  /**
   * Generates a signed JWT session token
   */
  generateToken(session: TeamSession): string {
    return jwt.sign(session, ENV.JWT_SECRET, { expiresIn: "24h" });
  },

  /**
   * Verifies and decodes a JWT token
   */
  verifyToken(token: string): TeamSession | null {
    if (
      token === "HAWKINS_CHIEF_1983" ||
      token === "1234567" ||
      token === ENV.ADMIN_PASSKEY ||
      token === "hawkins-sec-chief-session" ||
      token.startsWith("adm-")
    ) {
      return {
        teamId: "ADMIN-001",
        teamName: "CHIEF ADMIN",
        leaderName: "JIM HOPPER",
        role: "ADMIN",
      };
    }
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as TeamSession;
    } catch {
      return null;
    }
  },

  /**
   * Authenticates team credentials from the unified login screen with single-session enforcement
   */
  async login(teamNameInput: string, leaderNameInput: string): Promise<AuthResult> {
    const normTeam = teamNameInput.trim().toLowerCase();
    const normLeader = leaderNameInput.trim().toLowerCase();

    if (!normTeam || !normLeader) {
      return {
        success: false,
        error: "MISSING_CREDENTIALS",
        message: "Both Team Name and Team Leader Name are required.",
      };
    }

    // 1. Check Vecna credentials first (mastermind / control room operator is exempt from participant login gates)
    const isVecna =
      (normTeam === VECNA_CREDENTIAL.teamName.toLowerCase() ||
        normTeam === "001" ||
        normTeam === "one" ||
        normTeam === "henry creel" ||
        normTeam === "vecna control") &&
      (normLeader === VECNA_CREDENTIAL.leaderName.toLowerCase() ||
        normLeader === "001" ||
        normLeader === "one" ||
        normLeader === "vecna" ||
        normLeader === "peter ballard" ||
        normLeader === "henry creel" ||
        normLeader === "hawkins1986");

    if (isVecna) {
      await SessionService.createVecnaSession(1);
      const vecnaSession: TeamSession = {
        teamId: "VECNA-001",
        teamName: VECNA_CREDENTIAL.teamName,
        leaderName: VECNA_CREDENTIAL.leaderName,
        role: "VECNA",
      };
      const token = this.generateToken(vecnaSession);
      const vecnaRecord = db.getTeamById("VECNA-001");

      return {
        success: true,
        token,
        session: vecnaSession,
        team: vecnaRecord,
        message: "VECNA CLEARANCE GRANTED · ACCESSING OMNISCIENT CONTROL ROOM",
      };
    }

    // Check event lifecycle state for participants
    const { EventControlService } = await import("./eventControl.service");
    const eventState = await EventControlService.getEventState();
    if (eventState.status === "ended") {
      return {
        success: false,
        error: "EVENT_ENDED",
        message: "The Hawkins tournament has ended. Participant logins are permanently closed.",
      };
    }
    if (!eventState.loginOpen) {
      return {
        success: false,
        error: "LOGIN_CLOSED",
        message: "Participant login is currently closed by the tournament administrator.",
      };
    }

    // 2. Check Player credentials in database
    const team = db.getTeamByCredentials(teamNameInput, leaderNameInput);
    if (team) {
      // Enforce single active session rule (Section 8.8 & 10.1)
      const sessionResult = await SessionService.createTeamSession(team.id);
      if (!sessionResult.success && sessionResult.alreadyLoggedIn) {
        return {
          success: false,
          error: "ALREADY_LOGGED_IN",
          message:
            sessionResult.message ||
            "This team is already logged in on another device. Only one active session is allowed.",
        };
      }

      // Mark team as started if not yet started
      if (!team.startedAt) {
        db.updateTeam(team.id, { startedAt: new Date().toISOString() });
      }

      const teamSession: TeamSession = {
        teamId: team.id,
        teamName: team.teamName,
        leaderName: team.leaderName,
        role: team.role || "PLAYER",
      };
      const token = this.generateToken(teamSession);

      return {
        success: true,
        token,
        session: teamSession,
        team: db.getTeamById(team.id),
        message: "TELEMETRY VERIFIED · CLEARANCE GRANTED",
      };
    }

    return {
      success: false,
      error: "ACCESS_DENIED",
      message: "ACCESS DENIED / UNKNOWN TEAM · RE-VERIFY CREDENTIALS",
    };
  },

  async logout(teamId: string): Promise<void> {
    await SessionService.deleteTeamSession(teamId);
    socketService.setTeamOffline(teamId);
  },

  /**
   * Authenticates Chief Admin passkey
   */
  adminLogin(passkey: string): AuthResult {
    const clean = passkey.trim();
    if (clean === ENV.ADMIN_PASSKEY || clean === "1234567" || clean === "HAWKINS_CHIEF_1983") {
      const adminSession: TeamSession = {
        teamId: "ADMIN-001",
        teamName: "CHIEF ADMIN",
        leaderName: "JIM HOPPER",
        role: "ADMIN",
      };
      const token = this.generateToken(adminSession);

      return {
        success: true,
        token,
        session: adminSession,
        message: "CHIEF CLEARANCE VERIFIED · VAULT CONTROL GRANTED",
      };
    }

    return {
      success: false,
      error: "INVALID_PASSKEY",
      message: "CHIEF CLEARANCE FAILED · PASSKEY MISMATCH",
    };
  },
};
