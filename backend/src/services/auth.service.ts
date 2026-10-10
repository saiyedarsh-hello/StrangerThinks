import jwt from "jsonwebtoken";
import { Role, TeamSession, TeamRecord } from "../types";
import { ENV, VECNA_CREDENTIAL } from "../config/env";
import { db } from "./db.service";

import { SessionService } from "./session.service";

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

    // 1. Check Vecna credentials
    if (
      normTeam === VECNA_CREDENTIAL.teamName.toLowerCase() &&
      normLeader === VECNA_CREDENTIAL.leaderName.toLowerCase()
    ) {
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

      const playerSession: TeamSession = {
        teamId: team.id,
        teamName: team.teamName,
        leaderName: team.leaderName,
        role: "PLAYER",
      };
      const token = this.generateToken(playerSession);

      return {
        success: true,
        token,
        session: playerSession,
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
  },

  /**
   * Authenticates Chief Admin passkey
   */
  adminLogin(passkey: string): AuthResult {
    if (passkey.trim() === ENV.ADMIN_PASSKEY) {
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
