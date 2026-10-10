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

  public init(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
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

  private handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
    let session = token ? AuthService.verifyToken(token) : null;

    const requestedRole = socket.handshake.query?.role as string;
    const requestedTeamId = socket.handshake.query?.teamId as string;
    const requestedSenderId = socket.handshake.query?.senderId as string;

    if (session) {
      if (session.role === "VECNA") {
        socket.join("role:vecna");
        socket.join(`vecna-sender:${session.teamId}`);
      } else if (session.role === "ADMIN") {
        socket.join("role:admin");
        socket.join("admins");
      } else if (session.role === "PLAYER") {
        socket.join(`team:${session.teamId}`);
      }
    } else if (requestedRole === "VECNA") {
      socket.join("role:vecna");
      if (requestedSenderId) {
        socket.join(`vecna-sender:${requestedSenderId}`);
      }
    } else if (requestedRole === "ADMIN") {
      socket.join("role:admin");
      socket.join("admins");
    } else if (requestedTeamId) {
      socket.join(`team:${requestedTeamId}`);
    }

    // Always join public room for live leaderboard and presence broadcast
    socket.join("public:broadcast");

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Telemetry Heartbeat (Player -> Server -> Vecna)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on("presence", (payload: TelemetryPayload) => {
      if (!payload || !payload.team) return;

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
    // 2. Real-Time Sabotage (Vecna -> Server -> Target / All)
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
        const durationSec = data.durationSec || 30;
        const sabotageRecord: ActiveSabotage = {
          id: Date.now(),
          kind: data.kind,
          target: data.target,
          pinIndex: data.pinIndex,
          message: data.message,
          operatorName: data.operatorName || "HENRY CREEL",
          expiresAt: Date.now() + durationSec * 1000,
        };

        db.addSabotage(sabotageRecord);

        const eventPayload = {
          type: "sabotage",
          ...sabotageRecord,
          ts: Date.now(),
        };

        if (!data.target || data.target === "all") {
          this.io?.to("public:broadcast").emit("sabotage", eventPayload);
        } else {
          // Send to specific team room and to public for local name matching
          this.io?.to(`team:${data.target}`).emit("sabotage", eventPayload);
          this.io?.to("public:broadcast").emit("sabotage", eventPayload);
        }

        console.log(
          `[SABOTAGE DISPATCHED] ${data.kind} -> Target: ${data.target} (${durationSec}s)`
        );
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Story Events (Vecna -> Server -> Broadcast)
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "story_event",
      (data: {
        event: StoryEventType;
        target?: string;
        operatorName?: string;
      }) => {
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
    // 4. Challenge Locks
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "challenge_lock",
      (data: {
        challengeId: string;
        locked: boolean;
        target?: string;
        operatorName?: string;
      }) => {
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
    // 5. Teamwork Point Awards
    // ─────────────────────────────────────────────────────────────────────────
    socket.on(
      "award",
      (data: {
        target: string; // teamId or teamName
        points: number;
        operatorName?: string;
      }) => {
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
    this.io.in(`team:${teamId}`).disconnectSockets(true);
  }
}

export const socketService = new SocketService();
