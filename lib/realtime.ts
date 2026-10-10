/**
 * THE HAWKINS PROTOCOL - REALTIME ADAPTER V2
 * 
 * Central bi-directional event bus coordinating Player Website <-> Vecna Control.
 * 
 * Multi-device Realtime Transport:
 * Uses Socket.io connected to our Express backend on port 5000 for zero-latency,
 * multi-laptop live tournaments. Automatically falls back to HTML5 BroadcastChannel
 * when running offline or in single-laptop environments.
 */

import { io, Socket } from "socket.io-client";
import { CONFIG } from "./config";
import { StageId } from "./stages";
import { LocationId } from "./tasks";
import { SabKind } from "./store";

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
  kind: SabKind | "GLITCH";
  target: string; // team name or "all"
  pinIndex?: number;
  message?: string;
  operatorId?: string;
  operatorName?: string;
  ts?: number;
}

export interface StoryEventPayload {
  type: "story_event";
  event: StoryEventType;
  target: string; // team name or "all"
  operatorId?: string;
  operatorName?: string;
  ts?: number;
}

export interface ChallengeLockPayload {
  type: "challenge_lock";
  challengeId: string;
  locked: boolean;
  target: string; // team name or "all"
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

export interface OperatorAssignmentPayload {
  type: "operator_assignment";
  assignments: Record<string, { active: boolean; teams: string[] }>;
  operatorName?: string;
  ts?: number;
}

export type RealtimeMessage =
  | PresencePayload
  | SabotagePayload
  | StoryEventPayload
  | ChallengeLockPayload
  | AwardPayload
  | OperatorAssignmentPayload;

type Handler = (msg: RealtimeMessage) => void;

let socketInstance: Socket | null = null;
let channelInstance: BroadcastChannel | null = null;
const subscribers = new Set<Handler>();

function getSocketUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:5000`;
  }
  return "http://localhost:5000";
}

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!socketInstance) {
    try {
      const url = getSocketUrl();
      socketInstance = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 10000,
      });

      socketInstance.on("connect", () => {
        console.log("[REALTIME] Connected to Hawkins Security Mainframe WebSocket via Socket.io");
      });

      // Bind all real-time events from server
      const events = ["presence", "sabotage", "story_event", "challenge_lock", "award", "operator_assignment"];
      events.forEach((evt) => {
        socketInstance?.on(evt, (payload: any) => {
          const msg = { type: evt, ...payload };
          subscribers.forEach((fn) => {
            try {
              fn(msg);
            } catch (err) {
              console.error(`[Realtime] Error handling ${evt}:`, err);
            }
          });
        });
      });
    } catch (err) {
      console.warn("[REALTIME] Could not connect to Socket.io, relying on BroadcastChannel fallback:", err);
    }
  }
  return socketInstance;
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channelInstance) {
    channelInstance = new BroadcastChannel(CONFIG.BROADCAST_CHANNEL);
    channelInstance.onmessage = (event) => {
      if (event.data) {
        subscribers.forEach((fn) => {
          try {
            fn(event.data);
          } catch (err) {
            console.error("[Realtime] Local channel error:", err);
          }
        });
      }
    };
  }
  return channelInstance;
}

/**
 * Publish an event to the realtime bus
 */
export function publish(msg: RealtimeMessage): void {
  const stampedMsg = { ...msg, ts: msg.ts || Date.now() };

  // 1. Socket.io dispatch
  const socket = getSocket();
  if (socket && socket.connected) {
    try {
      socket.emit(msg.type, stampedMsg);
    } catch (err) {
      console.error("[Realtime Socket] Emit error:", err);
    }
  }

  // 2. BroadcastChannel dispatch (for multi-tab / local fallback)
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(stampedMsg);
    } catch (err) {
      console.error("[Realtime BroadcastChannel] Publish error:", err);
    }
  }

  // 3. Local subscribers dispatch
  subscribers.forEach((fn) => {
    try {
      fn(stampedMsg);
    } catch (err) {
      console.error("[Realtime] Local subscriber error:", err);
    }
  });
}

/**
 * Subscribe to all events on the realtime bus
 */
export function subscribe(handler: Handler): () => void {
  subscribers.add(handler);
  getSocket(); // Ensure socket is initialized
  getBroadcastChannel(); // Ensure local channel is initialized
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
