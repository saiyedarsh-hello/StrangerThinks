/**
 * THE HAWKINS PROTOCOL - REALTIME ADAPTER
 * 
 * Central event bus coordinating Player Laptops <-> Vecna Control <-> Admin Console.
 * Powered by Supabase Realtime Broadcast Channels (supports 70+ separate laptops simultaneously).
 */

import { CONFIG } from "./config";
import { StageId } from "./stages";
import { LocationId } from "./tasks";
import { SabKind } from "./store";
import { createClient } from "@supabase/supabase-js";

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
  id?: number;
  kind: SabKind | "GLITCH";
  target: string; // teamId or "all"
  pinIndex?: number;
  message?: string;
  duration?: number;
  operatorId?: string;
  operatorName?: string;
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

export type RealtimeMessage =
  | PresencePayload
  | SabotagePayload
  | StoryEventPayload
  | ChallengeLockPayload
  | AwardPayload
  | ForceLogoutPayload
  | ScoreUpdatePayload;

type Handler = (msg: RealtimeMessage) => void;

const subscribers = new Set<Handler>();

// Supabase Realtime Client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pxlbktdaldicbtrtbqxu.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGJrdGRhbGRpY2J0cnRicXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODc0MzgsImV4cCI6MjEwNjc2MzQzOH0.obE1WiSJyMPrZYYwtBSTL9mkxksK-yr5dP6pm53Ty9A";

let supabaseClient: any = null;
let realtimeChannel: any = null;
let localBroadcastChannel: BroadcastChannel | null = null;

export type RealtimeSocketLike = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit?: (event: string, payload: any) => void;
  connected?: boolean;
};

export function getSocket(): RealtimeSocketLike | null {
  return null;
}

function initRealtime() {
  if (typeof window === "undefined") return;

  // 1. Local HTML5 BroadcastChannel for intra-browser messaging
  if (!localBroadcastChannel && "BroadcastChannel" in window) {
    try {
      localBroadcastChannel = new BroadcastChannel(CONFIG.BROADCAST_CHANNEL);
      localBroadcastChannel.onmessage = (event) => {
        if (event.data) dispatchToSubscribers(event.data);
      };
    } catch {}
  }

  // 2. Supabase Realtime for cross-laptop messaging
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
      realtimeChannel = supabaseClient.channel("hawkins-protocol", {
        config: { broadcast: { ack: false, self: false } },
      });

      realtimeChannel
        .on("broadcast", { event: "message" }, ({ payload }: { payload: RealtimeMessage }) => {
          if (payload) dispatchToSubscribers(payload);
        })
        .on("broadcast", { event: "sabotage" }, ({ payload }: { payload: RealtimeMessage }) => {
          if (payload) dispatchToSubscribers(payload);
        })
        .on("broadcast", { event: "force_logout" }, ({ payload }: { payload: RealtimeMessage }) => {
          if (payload) dispatchToSubscribers(payload);
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            console.log("[Realtime] Connected to Hawkins Supabase Realtime mesh!");
          }
        });
    } catch (e) {
      console.warn("[Realtime] Supabase Realtime init error:", e);
    }
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

  // Dispatch via local BroadcastChannel
  if (localBroadcastChannel) {
    try {
      localBroadcastChannel.postMessage(stampedMsg);
    } catch {}
  }

  // Broadcast to other laptops via Supabase Realtime
  if (realtimeChannel) {
    try {
      realtimeChannel.send({
        type: "broadcast",
        event: "message",
        payload: stampedMsg,
      });
    } catch (err) {
      console.warn("[Realtime] Supabase broadcast error:", err);
    }
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
