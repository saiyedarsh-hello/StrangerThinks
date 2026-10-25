/**
 * THE HAWKINS PROTOCOL - REALTIME ADAPTER
 * 
 * Central event bus coordinating Player Laptops <-> Vecna Control <-> Admin Console.
 * Powered by Supabase Realtime Broadcast Channels (supports 70+ separate laptops simultaneously).
 */

import { CONFIG } from "./config";
import { StageId } from "./stages";
import { LocationId } from "./tasks";
import { io, Socket } from "socket.io-client";

export type SabKind =
  | "CORRUPT"
  | "TIME_FREEZE"
  | "LOCK"
  | "DISTORT"
  | "SIGNAL_JAM"
  | "WATCH"
  | "MESSAGE"
  | "GLITCH";

export type StoryEventType =
  | "gate_open"
  | "upsidedown_activate"
  | "vecna_appear"
  | "will_signal"
  | "final_stage";

export interface PresencePayload {
  type: "presence";
  team: string;
  teamId?: string;
  location?: LocationId | string;
  stageId?: number;
  viewMode?: string;
  storyProgress?: number;
  stage: StageId;
  score: number;
  timeLeft: number;
  solved: number;
  completedTasks?: string[];
  vecnaStatus?: string;
  radiometerPins?: number;
  radiometer?: {
    pins: (string | null)[];
    solved: boolean[];
    codeSolved?: boolean;
  };
  ts: number;
}

export interface SabotagePayload {
  type: "sabotage";
  id?: number;
  kind: SabKind | "GLITCH";
  target: string; // teamId or "all"
  targetTeamId?: string;
  targetTeamName?: string;
  pinIndex?: number;
  message?: string;
  duration?: number;
  durationSec?: number;
  operatorId?: string;
  operatorName?: string;
  teams?: string[];
  until?: number;
  ts?: number;
}

export interface StoryEventPayload {
  type: "story_event";
  event: StoryEventType;
  target: string; // teamId or "all"
  operatorId?: string;
  operatorName?: string;
  ts?: number;
}

export interface ChallengeLockPayload {
  type: "challenge_lock";
  challengeId: string;
  locked: boolean;
  target: string;
  operatorId?: string;
  operatorName?: string;
  ts?: number;
}

export interface AwardPayload {
  type: "award";
  target: string;
  points: number;
  operatorId?: string;
  operatorName?: string;
  ts?: number;
}

export interface ForceLogoutPayload {
  type: "force_logout";
  target: string; // teamId or "all"
  reason?: string;
  message?: string;
  ts?: number;
}

export interface ScoreUpdatePayload {
  type: "SCORE_UPDATE";
  teamId?: string;
  teamName?: string;
  newScore?: number;
  delta?: number;
  chapterId?: number;
  taskId?: string;
  source?: string;
  ts?: number;
}

export interface EventStatePayload {
  type: "event_state";
  status: string;
  isPaused: boolean;
  submissionsOpen: boolean;
  loginOpen?: boolean;
  unlockedStages?: number[];
  ts?: number;
}

export interface StageUnlockedPayload {
  type: "stage_unlocked";
  unlockedStages: number[];
  ts?: number;
}

export interface EventResetPayload {
  type: "event_reset";
  status?: string;
  startedAt?: string | null;
  unlockedStages?: number[];
  message?: string;
  ts?: number;
}

export interface EventEndedPayload {
  type: "event_ended";
  status?: string;
  endedAt?: string | null;
  message?: string;
  ts?: number;
}

export interface SessionSupersededPayload {
  type: "session_superseded";
  teamId?: string;
  message?: string;
  ts?: number;
}

export interface SabotageClearPayload {
  type: "sabotage:clear";
  target?: string;
  teamId?: string;
  clearedBy?: string;
  ts?: number;
}

export interface VecnaDispatchQuotaPayload {
  type: "vecna:dispatch_quota";
  remaining: number;
  used: number;
  max: number;
  ts?: number;
}

export interface PresenceUpdatePayload {
  type: "presence:update";
  teamId?: string;
  online?: boolean;
  status?: string;
  ts?: number;
}

export interface VecnaTacticalUpdatePayload {
  type: "vecna:tactical_update";
  ts?: number;
}

export type RealtimeMessage =
  | PresencePayload
  | SabotagePayload
  | StoryEventPayload
  | ChallengeLockPayload
  | AwardPayload
  | ForceLogoutPayload
  | ScoreUpdatePayload
  | EventStatePayload
  | StageUnlockedPayload
  | EventResetPayload
  | EventEndedPayload
  | SessionSupersededPayload
  | SabotageClearPayload
  | VecnaDispatchQuotaPayload
  | PresenceUpdatePayload
  | VecnaTacticalUpdatePayload;

type Handler = (msg: RealtimeMessage) => void;

const subscribers = new Set<Handler>();
const connectionSubscribers = new Set<(connected: boolean) => void>();
let isCurrentSocketConnected = false;

function notifyConnectionSubscribers(connected: boolean) {
  isCurrentSocketConnected = connected;
  connectionSubscribers.forEach((fn) => {
    try {
      fn(connected);
    } catch (e) {
      console.error("[Realtime] Connection subscriber error:", e);
    }
  });
}

export function isSocketConnected(): boolean {
  if (typeof window === "undefined") return false;
  return socketInstance ? socketInstance.connected : false;
}

export function subscribeToConnectionStatus(cb: (connected: boolean) => void): () => void {
  connectionSubscribers.add(cb);
  cb(isSocketConnected());
  initRealtime();
  return () => {
    connectionSubscribers.delete(cb);
  };
}

let localBroadcastChannel: BroadcastChannel | null = null;

let socketInstance: Socket | null = null;

export function resolveStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem("hawkins-protocol:session");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.token) return parsed.token;
    }
    const adminToken = localStorage.getItem("hawkins_admin_token") || sessionStorage.getItem("hawkins_admin_token");
    if (adminToken) return adminToken;
    const directToken = localStorage.getItem("token") || localStorage.getItem("hawkins_token");
    if (directToken) return directToken;
    if (typeof document !== "undefined") {
      const cookieMatch = document.cookie.match(/hawkins_session_token=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) return decodeURIComponent(cookieMatch[1]);
    }
  } catch {}
  return "";
}

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!socketInstance) {
    try {
      const host = window.location.hostname || "localhost";
      let backendUrl = `http://${host}:5000`;
      if (host === "localhost" || host === "127.0.0.1") {
        backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "") : "") ||
          `http://${host}:5000`;
      }

      const initialToken = resolveStoredToken();

      socketInstance = io(backendUrl, {
        auth: { token: initialToken },
        transports: ["websocket", "polling"],
        reconnectionAttempts: Infinity,   // Never give up – critical for 7-hour events
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,       // Cap backoff at 5 s so reconnect stays snappy
        timeout: 20000,
      });

      socketInstance.on("connect", () => {
        console.log(`[SOCKET.IO] Connected to Hawkins Security Mainframe at ${backendUrl}`);
        notifyConnectionSubscribers(true);
        const currentToken = resolveStoredToken();
        if (currentToken) {
          if (socketInstance) socketInstance.auth = { token: currentToken };
          socketInstance?.emit("authenticate", { token: currentToken });
        }
      });

      socketInstance.on("disconnect", () => {
        notifyConnectionSubscribers(false);
      });

      socketInstance.on("connect_error", () => {
        notifyConnectionSubscribers(false);
      });

      socketInstance.on("reconnect", () => {
        console.log("[SOCKET.IO] Reconnected to Hawkins Security Mainframe");
        notifyConnectionSubscribers(true);
        const currentToken = resolveStoredToken();
        if (currentToken) {
          if (socketInstance) socketInstance.auth = { token: currentToken };
          socketInstance?.emit("authenticate", { token: currentToken });
        }
      });

      // Re-attach latest auth token before every reconnect attempt
      socketInstance.on("reconnect_attempt", () => {
        const currentToken = resolveStoredToken();
        if (currentToken && socketInstance) {
          (socketInstance as any).auth = { token: currentToken };
        }
      });

      socketInstance.on("leaderboard:update", (data: any) => {
        dispatchToSubscribers({
          type: "leaderboard",
          source: "socketio",
          data,
        } as any);
      });

      socketInstance.on("score:update", (data: any) => {
        dispatchToSubscribers({
          type: "SCORE_UPDATE",
          source: data?.source || "socketio",
          ...data,
        });
      });

      socketInstance.on("event:state_changed", (data: any) => {
        dispatchToSubscribers({
          type: "event_state",
          status: data?.status || "active",
          isPaused: Boolean(data?.isPaused ?? (data?.status === "paused")),
          submissionsOpen: Boolean(data?.submissionsOpen),
          loginOpen: Boolean(data?.loginOpen),
          ts: Date.now(),
        });
      });

      socketInstance.on("session:superseded", (data: any) => {
        dispatchToSubscribers({
          type: "session_superseded",
          teamId: data?.teamId,
          message: data?.message || "TERMINAL SUPERSEDED: This squad has logged in from another active device or window.",
          ts: Date.now(),
        });
      });

      socketInstance.on("stage:unlocked", (data: any) => {
        dispatchToSubscribers({
          type: "stage_unlocked",
          unlockedStages: Array.isArray(data?.unlockedStages) ? data.unlockedStages : [1],
          ts: Date.now(),
        });
      });

      socketInstance.on("event:reset", (data: any) => {
        dispatchToSubscribers({
          type: "event_reset",
          ...data,
          ts: Date.now(),
        });
      });

      socketInstance.on("event:ended", (data: any) => {
        dispatchToSubscribers({
          type: "event_ended",
          message: data?.message || "The tournament has ended.",
          endedAt: data?.endedAt,
          ts: Date.now(),
        });
        dispatchToSubscribers({
          type: "force_logout",
          target: "all",
          reason: "event_ended",
          message: data?.message || "The tournament has ended.",
          ts: Date.now(),
        });
      });

      let lastSabotageId = 0;
      socketInstance.on("sabotage", (data: any) => {
        if (data?.id && data.id === lastSabotageId) return;
        if (data?.id) lastSabotageId = data.id;
        dispatchToSubscribers({
          type: "sabotage",
          ...data,
        });
      });

      socketInstance.on("story_event:received", (data: any) => {
        dispatchToSubscribers({
          type: "story_event",
          ...data,
        });
      });

      socketInstance.on("challenge_lock:received", (data: any) => {
        dispatchToSubscribers({
          type: "challenge_lock",
          ...data,
        });
      });

      socketInstance.on("award:received", (data: any) => {
        dispatchToSubscribers({
          type: "award",
          ...data,
        });
      });

      socketInstance.on("session:revoked", (data: any) => {
        dispatchToSubscribers({
          type: "force_logout",
          target: data?.teamId || "all",
          ts: data?.ts || Date.now(),
        });
      });

      socketInstance.on("team:session_terminated", (data: any) => {
        dispatchToSubscribers({
          type: "force_logout",
          target: data?.teamId || "all",
          ts: Date.now(),
        });
      });

      socketInstance.on("team:force_logged_out", (data: any) => {
        dispatchToSubscribers({
          type: "force_logout",
          target: data?.teamId || "all",
          ts: data?.ts || Date.now(),
        });
      });

      socketInstance.on("vecna:dispatch_quota", (data: any) => {
        dispatchToSubscribers({
          type: "vecna:dispatch_quota",
          ...data,
        } as any);
      });

      socketInstance.on("presence:update", (data: any) => {
        dispatchToSubscribers({
          type: "presence:update",
          ...data,
        } as any);
      });

      socketInstance.on("vecna:tactical_update", (data: any) => {
        dispatchToSubscribers({
          type: "vecna:tactical_update",
          ...data,
        } as any);
      });

      socketInstance.on("sabotage:clear", (data: any) => {
        dispatchToSubscribers({
          type: "sabotage:clear",
          ...data,
        } as any);
      });
    } catch (e) {
      console.warn("[SOCKET.IO] Connection error:", e);
    }
  }
  return socketInstance;
}

export function authenticateSocket(token: string): void {
  if (!token || typeof window === "undefined") return;
  const sock = getSocket();
  if (sock) {
    (sock as any).auth = { token };
    // If the socket is not connected (e.g. gave up after reconnect exhaustion or
    // the tab was backgrounded), explicitly re-initiate the connection so the team
    // shows as ONLINE on the admin dashboard.
    if (!sock.connected) {
      sock.connect();
    }
    // Always (re-)authenticate so the server room membership is current
    sock.emit("authenticate", { token });
  }
}

export function disconnectSocket(): void {
  if (socketInstance) {
    try {
      socketInstance.emit("team:logout");
      socketInstance.disconnect();
    } catch {}
    socketInstance = null;
  }
}

function initRealtime() {
  if (typeof window === "undefined") return;

  // 1. Initialize authoritative Socket.IO client (Port 5000)
  getSocket();

  // 2. Local HTML5 BroadcastChannel for intra-browser messaging
  if (!localBroadcastChannel && "BroadcastChannel" in window) {
    try {
      localBroadcastChannel = new BroadcastChannel(CONFIG.BROADCAST_CHANNEL);
      localBroadcastChannel.onmessage = (event) => {
        if (event.data) dispatchToSubscribers(event.data);
      };
    } catch {}
  }
}

function dispatchToSubscribers(msg: RealtimeMessage) {
  subscribers.forEach((fn) => {
    try {
      fn(msg);
    } catch (err) {
      console.error("[Realtime] Subscriber error:", err);
    }
  });
}

/**
 * Publish an event to all connected laptops
 */
export function publish(msg: RealtimeMessage): void {
  const stampedMsg = { ...msg, ts: msg.ts || Date.now() };

  // Dispatch locally in current window
  dispatchToSubscribers(stampedMsg);

  // Dispatch via Socket.IO to Express Backend (Port 5000)
  const sock = getSocket();
  if (sock) {
    // If the socket dropped (tab backgrounded, brief network glitch) reconnect
    // before trying to emit so the presence heartbeat keeps the team ONLINE.
    if (!sock.connected) {
      const currentToken = resolveStoredToken();
      if (currentToken) (sock as any).auth = { token: currentToken };
      sock.connect();
    }
    if (sock.connected) {
      try {
        if (msg.type === "presence") {
          sock.emit("presence", msg);
        } else if (msg.type === "sabotage") {
          sock.emit("sabotage", msg);
        } else if (msg.type === "story_event") {
          sock.emit("story_event", msg);
        } else if (msg.type === "challenge_lock") {
          sock.emit("challenge_lock", msg);
        } else if (msg.type === "award") {
          sock.emit("award", msg);
        } else if (msg.type === "force_logout") {
          sock.emit("force_logout", msg);
        }
      } catch (e) {
        console.warn("[SOCKET.IO] Emit error:", e);
      }
    }
  }

  // Dispatch via local BroadcastChannel
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage(stampedMsg);
    } catch {}
  }

}

/**
 * Subscribe to all events on the realtime bus
 */
export function subscribe(handler: Handler): () => void {
  subscribers.add(handler);
  initRealtime();
  return () => {
    subscribers.delete(handler);
  };
}

/**
 * Helper to emit team presence
 */
export function presence(data: Omit<PresencePayload, "type">): void {
  publish({
    type: "presence",
    ...data,
  });
}
