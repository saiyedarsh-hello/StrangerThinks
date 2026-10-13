import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import {
  ActiveSabotage,
  SabotageKind,
  StoryEventType,
  TelemetryPayload,
} from "../types";
import { AuthService } from "./auth.service";
import { db } from "./db.service";

class SocketService {
  private io: SocketIOServer | null = null;
  private onlineTeams = new Set<string>();
  private teamSockets = new Map<string, Set<string>>();

  private isCanonicalMatch(a: string, b: string): boolean {
    const cleanA = (a || "").trim().toUpperCase();
    const cleanB = (b || "").trim().toUpperCase();
    if (cleanA === cleanB) return true;
    if ((cleanA === "VECNA" && cleanB === "VECNA-001") || (cleanA === "VECNA-001" && cleanB === "VECNA")) {
      return true;
    }
    // Only match standard team identifiers: T01, T1, TEAM01, TEAM1, TEAM-01
    // Do NOT match arbitrary strings like TEAM_R1 or VECNA-001 to T01!
    const mA = cleanA.match(/^(?:T|TEAM)-?0*(\d+)$/);
    const mB = cleanB.match(/^(?:T|TEAM)-?0*(\d+)$/);
    if (mA && mB && parseInt(mA[1], 10) === parseInt(mB[1], 10)) {
      return true;
    }
    return false;
  }

  public init(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: (_origin, callback) => callback(null, true),
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });

    console.log("[SOCKET.IO] Realtime WebSocket engine online.");
  }

  public isTeamOnline(teamId: string): boolean {
    if (!teamId) return false;
    if (this.onlineTeams.has(teamId)) return true;

    for (const id of this.onlineTeams) {
      if (this.isCanonicalMatch(id, teamId)) return true;
    }
    return false;
  }

  public getOnlineTeams(): string[] {
    return Array.from(this.onlineTeams);
  }

  public setTeamOffline(teamId: string) {
    this.onlineTeams.delete(teamId);
    this.teamSockets.delete(teamId);
    for (const key of Array.from(this.teamSockets.keys())) {
      if (this.isCanonicalMatch(key, teamId)) {
        this.teamSockets.delete(key);
        this.onlineTeams.delete(key);
      }
    }
    if (this.io) {
      // 1. Emit revocation notices across team room and public broadcast
      const revocationPayload = {
        teamId,
        target: teamId,
        reason: "admin_force_logout",
        message: "An administrator has terminated your active session.",
        ts: Date.now(),
      };
      this.io.to(`team:${teamId}`).emit("session:revoked", revocationPayload);
      this.io.to(`team:${teamId}`).emit("team:force_logged_out", revocationPayload);
      this.io.to("public:broadcast").emit("session:revoked", revocationPayload);
      this.io.to("public:broadcast").emit("team:force_logged_out", revocationPayload);
      this.io.to(`team:${teamId}`).emit("team:session_terminated", { teamId, reason: "LOGOUT" });

      const room = this.io.sockets.adapter.rooms.get(`team:${teamId}`);
      if (room) {
        for (const socketId of Array.from(room)) {
          const s = this.io.sockets.sockets.get(socketId);
          if (s) {
            s.emit("session:revoked", revocationPayload);
            s.emit("team:force_logged_out", revocationPayload);
            s.leave(`team:${teamId}`);
            s.disconnect(true);
          }
        }
      }
      this.broadcastLeaderboard();
      this.io.to("admins").emit("presence:update", { teamId, isOnline: false });
      this.io.to("public:broadcast").emit("presence:update", { teamId, isOnline: false });
    }
  }

  public clearAllOnlineTeams() {
    this.onlineTeams.clear();
    this.teamSockets.clear();
    if (this.io) {
      const revocationPayload = {
        teamId: "all",
        target: "all",
        reason: "admin_reset_all_sessions",
        message: "All active participant sessions have been terminated by tournament command.",
        ts: Date.now(),
      };
      this.io.to("public:broadcast").emit("session:revoked", revocationPayload);
      this.io.to("public:broadcast").emit("team:force_logged_out", revocationPayload);
      this.broadcastLeaderboard();
      this.io.to("admins").emit("presence:update", { all: true, isOnline: false });
    }
  }

  private handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    let session = token ? AuthService.verifyToken(token) : null;

    const requestedRole = socket.handshake.query?.role as string;
    const requestedTeamId = socket.handshake.query?.teamId as string;
    const requestedSenderId = socket.handshake.query?.senderId as string;

    const joinSessionRooms = (sess: typeof session) => {
      if (!sess || !sess.teamId) return;

      if (!this.teamSockets.has(sess.teamId)) {
        this.teamSockets.set(sess.teamId, new Set<string>());
      }
      const existingSockets = this.teamSockets.get(sess.teamId)!;

      // Multi-device / multi-tab management:
      // If another active socket exists for this squad, notify it that a newer terminal has taken control
      if (sess.role !== "ADMIN" && existingSockets.size > 0) {
        for (const oldSocketId of existingSockets) {
          if (oldSocketId !== socket.id) {
            this.io?.to(oldSocketId).emit("session:superseded", {
              teamId: sess.teamId,
              message: "TERMINAL SUPERSEDED: This squad has logged in from another active device or window.",
              ts: Date.now(),
            });
          }
        }
      }

      existingSockets.add(socket.id);

      const wasOnline = this.onlineTeams.has(sess.teamId);
      this.onlineTeams.add(sess.teamId);

      if (sess.role === "VECNA") {
        socket.join("role:vecna");
        socket.join(`vecna-sender:${sess.teamId}`);
        socket.join(`team:${sess.teamId}`);
      } else if (sess.role === "ADMIN") {
        socket.join("role:admin");
        socket.join("admins");
        // Push currently online teams to this newly authenticated admin immediately
        for (const onlineId of this.onlineTeams) {
          socket.emit("presence:update", { teamId: onlineId, isOnline: true });
        }
      } else if (sess.role === "PLAYER") {
        socket.join(`team:${sess.teamId}`);
      }

      if (sess.role !== "ADMIN") {
        this.io?.to("admins").emit("presence:update", { teamId: sess.teamId, isOnline: true });
        this.io?.to("public:broadcast").emit("presence:update", { teamId: sess.teamId, isOnline: true });
        this.broadcastLeaderboard();
      }
    };

    if (session) {
      joinSessionRooms(session);
    }

    // Dynamic post-handshake authentication for seamless login without reload
    socket.on("authenticate", (authData: { token?: string }) => {
      if (!authData?.token) return;
      const verified = AuthService.verifyToken(authData.token);
      if (verified) {
        session = verified;
        joinSessionRooms(session);
        socket.emit("authenticated", { success: true, role: session.role, teamId: session.teamId });
      } else {
        socket.emit("authenticated", { success: false, error: "INVALID_TOKEN" });
      }
    });

    // Provide full presence list upon admin request
    socket.on("presence:sync", () => {
      const list = Array.from(this.onlineTeams);
      socket.emit("presence:all", { onlineTeams: list });
      for (const onlineId of this.onlineTeams) {
        socket.emit("presence:update", { teamId: onlineId, isOnline: true });
      }
    });

    // Explicit client logout event
    socket.on("team:logout", () => {
      if (session && session.teamId) {
        this.setTeamOffline(session.teamId);
      }
    });

    socket.on("disconnect", () => {
      if (session && session.teamId) {
        const teamSet = this.teamSockets.get(session.teamId);
        if (teamSet) {
          teamSet.delete(socket.id);
          if (teamSet.size === 0) {
            this.teamSockets.delete(session.teamId);
            this.onlineTeams.delete(session.teamId);
            for (const key of Array.from(this.onlineTeams)) {
              if (this.isCanonicalMatch(key, session.teamId)) {
                this.onlineTeams.delete(key);
              }
            }
            this.broadcastLeaderboard();
            this.io?.to("admins").emit("presence:update", { teamId: session.teamId, isOnline: false });
            this.io?.to("public:broadcast").emit("presence:update", { teamId: session.teamId, isOnline: false });
          }
        }
      }
    });

    // Always join public room for live leaderboard and presence broadcast
    socket.join("public:broadcast");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Telemetry Heartbeat (Player -> Server -> Vecna & Admin)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("presence", (payload: TelemetryPayload) => {
      if (!payload || !session || !session.teamId) return;

      const targetTeamId = session.teamId;
      const teamSet = this.teamSockets.get(targetTeamId);
      if (!teamSet || !teamSet.has(socket.id)) return;

      const wasOnline = this.onlineTeams.has(targetTeamId);
      this.onlineTeams.add(targetTeamId);
      if (!wasOnline) {
        this.io?.to("admins").emit("presence:update", { teamId: targetTeamId, isOnline: true });
        this.io?.to("public:broadcast").emit("presence:update", { teamId: targetTeamId, isOnline: true });
      }

      // Update state in db
      if (payload.teamId) {
        db.updateTeam(payload.teamId, {
          location: payload.location || "town",
          stage: payload.stage || "hawkins",
          storyProgress: payload.storyProgress || 5,
        });
      }

      // Broadcast to Vecna operators
      this.io?.to("role:vecna").emit("presence", {
        ...payload,
        ts: Date.now(),
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Real-Time Sabotage (Vecna / Admin -> Server -> Target / All)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "sabotage",
      (data: {
        kind: SabotageKind;
        target: string; // teamId, teamName, or "all"
        pinIndex?: number;
        message?: string;
        operatorName?: string;
        durationSec?: number;
      }) => {
        if (!session) {
          const authTok = socket.handshake.auth?.token;
          if (authTok) {
            session = AuthService.verifyToken(authTok);
          }
        }
        const isAuthorized = session && (session.role === "VECNA" || session.role === "ADMIN");
        if (!isAuthorized) {
          console.warn("[SOCKET] Unauthorized sabotage attempt blocked from socket:", socket.id);
          return;
        }

        const durationSec = data.durationSec || 30;

        // Map team name to team ID if necessary
        let targetTeamId = data.target;
        const allTeams = db.getAllTeams();
        const matched = allTeams.find(
          (t) =>
            t.teamName.trim().toLowerCase() === String(data.target || "").trim().toLowerCase() ||
            t.id.trim().toLowerCase() === String(data.target || "").trim().toLowerCase()
        );
        if (matched) {
          targetTeamId = matched.id;
        }

        const sabotageRecord: ActiveSabotage = {
          id: Date.now(),
          kind: data.kind,
          target: data.target,
          pinIndex: data.pinIndex,
          message: data.message,
          operatorName: data.operatorName || (session?.role === "VECNA" ? "HENRY CREEL" : "CHIEF ADMIN"),
          expiresAt: Date.now() + durationSec * 1000,
        };

        db.addSabotage(sabotageRecord);

        const eventPayload = {
          type: "sabotage",
          ...sabotageRecord,
          targetTeamId,
          targetTeamName: matched ? matched.teamName : undefined,
          ts: Date.now(),
        };

        // Dispatch single sabotage event cleanly
        if (targetTeamId && targetTeamId !== "all") {
          this.io?.to(`team:${targetTeamId}`).emit("sabotage", eventPayload);
          this.io?.to("role:vecna").emit("sabotage", eventPayload);
          this.io?.to("admins").emit("sabotage", eventPayload);
        } else {
          this.io?.to("public:broadcast").emit("sabotage", eventPayload);
        }

        console.log(
          `[SABOTAGE DISPATCHED] ${data.kind} -> Target: ${data.target} (${targetTeamId}) (${durationSec}s)`
        );
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Story Events (Vecna / Admin -> Server -> Broadcast)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "story_event",
      (data: {
        event: StoryEventType;
        target?: string;
        operatorName?: string;
      }) => {
        if (!session || (session.role !== "VECNA" && session.role !== "ADMIN")) {
          console.warn("[SOCKET] Unauthorized story_event attempt blocked from socket:", socket.id);
          return;
        }

        const payload = {
          type: "story_event",
          event: data.event,
          target: data.target || "all",
          operatorName: data.operatorName || "HENRY CREEL",
          ts: Date.now(),
        };

        this.io?.to("public:broadcast").emit("story_event", payload);
        console.log(`[STORY EVENT DISPATCHED] ${data.event}`);
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Challenge Locks (Vecna / Admin -> Server -> Broadcast)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "challenge_lock",
      (data: {
        challengeId: string;
        locked: boolean;
        target?: string;
        operatorName?: string;
      }) => {
        if (!session || (session.role !== "VECNA" && session.role !== "ADMIN")) {
          console.warn("[SOCKET] Unauthorized challenge_lock attempt blocked from socket:", socket.id);
          return;
        }

        const payload = {
          type: "challenge_lock",
          challengeId: data.challengeId,
          locked: data.locked,
          target: data.target || "all",
          operatorName: data.operatorName || "HENRY CREEL",
          ts: Date.now(),
        };

        this.io?.to("public:broadcast").emit("challenge_lock", payload);
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Teamwork Point Awards (Admin Only)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "award",
      (data: {
        target: string; // teamId or teamName
        points: number;
        operatorName?: string;
      }) => {
        if (!session || session.role !== "ADMIN") {
          console.warn("[SOCKET] Unauthorized award attempt blocked from socket:", socket.id);
          return;
        }

        const targetTeam = db.getTeamById(data.target) || db.getTeamByCredentials(data.target, "");
        if (targetTeam) {
          db.updateTeam(targetTeam.id, {
            breakdown: {
              ...targetTeam.breakdown,
              teamwork: targetTeam.breakdown.teamwork + data.points,
            },
          });
          this.broadcastLeaderboard();
        }

        const payload = {
          type: "award",
          target: data.target,
          points: data.points,
          operatorName: data.operatorName || "ORGANIZER",
          ts: Date.now(),
        };

        this.io?.to("public:broadcast").emit("award", payload);
      }
    );
  }

  /**
   * Broadcasts updated leaderboard to all connected sockets
   */
  public broadcastLeaderboard() {
    const leaderboard = db.getLeaderboard();
    this.io?.to("public:broadcast").emit("leaderboard:update", leaderboard);
  }

  /**
   * Dispatches a direct message or event to a specific team
   */
  public emitToTeam(teamId: string, event: string, data: any) {
    this.io?.to(`team:${teamId}`).emit(event, data);
  }

  /**
   * Broadcasts to all connected clients
   */
  public broadcast(event: string, data: any) {
    this.io?.to("public:broadcast").emit(event, data);
  }

  public broadcastEvent(event: string, data: any) {
    this.broadcast(event, data);
  }

  /**
   * Emits an event specifically to the authenticated admin room
   */
  public broadcastToAdmins(event: string, data: any) {
    this.io?.to("admins").emit(event, data);
    this.io?.to("role:admin").emit(event, data);
  }

  /**
   * Emits a status event to the originating Vecna sender room
   */
  public emitToVecnaSender(senderId: number | string, event: string, data: any) {
    this.io?.to(`vecna-sender:${senderId}`).emit(event, data);
    this.io?.to("role:vecna").emit(event, data);
  }

  /**
   * Forces disconnection of all sockets joined to a team room
   */
  public disconnectTeamSockets(teamId: string) {
    if (!this.io) return;
    const revocationPayload = {
      teamId,
      reason: "admin_force_logout",
      message: "An administrator has terminated your active session.",
      ts: Date.now(),
    };
    this.io.to(`team:${teamId}`).emit("session:revoked", revocationPayload);
    this.io.to(`team:${teamId}`).emit("team:force_logged_out", revocationPayload);
    this.io.in(`team:${teamId}`).disconnectSockets(true);
  }
}

export const socketService = new SocketService();
