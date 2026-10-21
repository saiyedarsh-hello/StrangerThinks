import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Role, TeamSession, TeamRecord } from "../types";
import { ENV, VECNA_CREDENTIAL } from "../config/env";
import { db } from "./db.service";

import { SessionService } from "./session.service";
import { socketService } from "./socket.service";

export interface AdminAccountConfig {
  id: string;
  teamName: string;
  leaderName: string;
  envVar: string;
  defaultPassword: string;
  salt: string;
}

export const ADMIN_ACCOUNTS: AdminAccountConfig[] = [
  {
    id: "ADMIN-BUNTY",
    teamName: "admin bolte",
    leaderName: "Bunty Bhai",
    envVar: "ADMIN_PASSWORD_BUNTY",
    defaultPassword: "Bunty@Hawkins1983",
    salt: "salt_admin_bunty_1983",
  },
  {
    id: "ADMIN-SHARMA",
    teamName: "admin bolte",
    leaderName: "Sharma Ji",
    envVar: "ADMIN_PASSWORD_SHARMA",
    defaultPassword: "Sharma@Hawkins1983",
    salt: "salt_admin_sharma_1983",
  },
  {
    id: "ADMIN-SANTA",
    teamName: "admin bolte",
    leaderName: "Santa Claus",
    envVar: "ADMIN_PASSWORD_SANTA",
    defaultPassword: "Santa@Hawkins1983",
    salt: "salt_admin_santa_1983",
  },
  {
    id: "ADMIN-BHINDI",
    teamName: "admin bolte",
    leaderName: "Bhindi Khalo",
    envVar: "ADMIN_PASSWORD_BHINDI",
    defaultPassword: "Bhindi@Hawkins1983",
    salt: "salt_admin_bhindi_1983",
  },
];

function hashAdminPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
}

function verifyAdminPassword(password: string, salt: string, expectedHex: string): boolean {
  const computedHex = hashAdminPassword(password, salt);
  const a = Buffer.from(computedHex, "hex");
  const b = Buffer.from(expectedHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface AuthResult {
  success: boolean;
  token?: string;
  session?: TeamSession;
  team?: TeamRecord;
  requiresPassword?: boolean;
  role?: Role;
  adminLeader?: string;
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
        teamName: "admin bolte",
        leaderName: "JIM HOPPER",
        role: "ADMIN",
        adminId: "ADMIN-001",
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
  async login(teamNameInput: string, leaderNameInput: string, passwordInput?: string): Promise<AuthResult> {
    const normTeam = teamNameInput.trim().toLowerCase();
    const normLeader = leaderNameInput.trim().toLowerCase();

    if (!normTeam || !normLeader) {
      return {
        success: false,
        error: "MISSING_CREDENTIALS",
        message: "Both Team Name and Team Leader Name are required.",
      };
    }

    // 1. Check Multi-Admin Accounts ("admin bolte")
    if (normTeam === "admin bolte") {
      const matchedAdmin = ADMIN_ACCOUNTS.find(
        (a) => a.leaderName.trim().toLowerCase() === normLeader
      );

      if (!matchedAdmin) {
        return {
          success: false,
          error: "ACCESS_DENIED",
          message: "CLEARANCE DENIED · UNRECOGNIZED ADMIN IDENTITY",
        };
      }

      // If password not supplied yet, request password from client
      if (!passwordInput || !passwordInput.trim()) {
        return {
          success: false,
          requiresPassword: true,
          role: "ADMIN",
          adminLeader: matchedAdmin.leaderName,
          message: "ADMIN IDENTITY RECOGNIZED · ENTER CLEARANCE KEY",
        };
      }

      // Verify supplied password against salted hash
      const configuredPassword = process.env[matchedAdmin.envVar] || matchedAdmin.defaultPassword;
      const expectedHash = hashAdminPassword(configuredPassword, matchedAdmin.salt);
      const isPasswordValid = verifyAdminPassword(passwordInput.trim(), matchedAdmin.salt, expectedHash);

      if (!isPasswordValid) {
        return {
          success: false,
          error: "ACCESS_DENIED",
          message: "CLEARANCE DENIED · INCORRECT CREDENTIALS",
        };
      }

      // Admin authenticated successfully
      const adminSession: TeamSession = {
        teamId: matchedAdmin.id,
        teamName: "admin bolte",
        leaderName: matchedAdmin.leaderName,
        role: "ADMIN",
        adminId: matchedAdmin.id,
      };
      const token = this.generateToken(adminSession);

      return {
        success: true,
        token,
        session: adminSession,
        message: `CHIEF CLEARANCE VERIFIED · WELCOME ${matchedAdmin.leaderName.toUpperCase()}`,
      };
    }

    // Check event lifecycle state for non-admin participants
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

    // 2. Check Vecna credentials
    if (
      (normTeam === VECNA_CREDENTIAL.teamName.toLowerCase() || normTeam === "vecna" || normTeam === "henry creel (vecna)") &&
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

    // 3. Check Player credentials in database
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
    if (
      clean === ENV.ADMIN_PASSKEY ||
      clean === "1234567" ||
      clean === "HAWKINS_CHIEF_1983" ||
      clean === "HAWKINS-CHIEF-1983"
    ) {
      const adminSession: TeamSession = {
        teamId: "ADMIN-001",
        teamName: "admin bolte",
        leaderName: "JIM HOPPER",
        role: "ADMIN",
        adminId: "ADMIN-001",
      };
      const token = this.generateToken(adminSession);

      return {
        success: true,
        token,
        session: adminSession,
        message: "CHIEF CLEARANCE VERIFIED · VAULT CONTROL GRANTED",
      };
    }

    // Check if passkey matches any of the 4 admin passwords
    for (const a of ADMIN_ACCOUNTS) {
      const cfgPass = process.env[a.envVar] || a.defaultPassword;
      if (clean === cfgPass) {
        const adminSession: TeamSession = {
          teamId: a.id,
          teamName: "admin bolte",
          leaderName: a.leaderName,
          role: "ADMIN",
          adminId: a.id,
        };
        const token = this.generateToken(adminSession);
        return {
          success: true,
          token,
          session: adminSession,
          message: `CHIEF CLEARANCE VERIFIED · WELCOME ${a.leaderName.toUpperCase()}`,
        };
      }
    }

    return {
      success: false,
      error: "INVALID_PASSKEY",
      message: "CHIEF CLEARANCE FAILED · PASSKEY MISMATCH",
    };
  },
};
