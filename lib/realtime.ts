/**
 * THE HAWKINS PROTOCOL - REALTIME ADAPTER
 * 
 * Central event bus coordinating Player Website <-> Vecna Control.
 * 
 * Default Implementation: HTML5 BroadcastChannel ("hawkins-protocol").
 * Works instantly across browser tabs on the same origin without external servers.
 * 
 * Running the real event across separate laptops:
 * When running an in-person tournament where players and organizers are on different laptops,
 * switch the adapter backend below to Firebase Realtime Database or Supabase Realtime
 * using the provided stubs.
 */

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

export interface ScoreUpdatePayload {
  type: "SCORE_UPDATE";
  teamId: string;
  teamName?: string;
  newScore: number;
  delta?: number;
  chapterId?: number | string;
  taskId?: string;
  source?: "PLAYER" | "ADMIN";
  operatorName?: string;
  ts?: number;
}

export type RealtimeMessage =
  | PresencePayload
  | SabotagePayload
  | StoryEventPayload
  | ChallengeLockPayload
  | AwardPayload
  | OperatorAssignmentPayload
  | ScoreUpdatePayload;

type Handler = (msg: RealtimeMessage) => void;

let channelInstance: BroadcastChannel | null = null;
const subscribers = new Set<Handler>();

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
            console.error("[Realtime] Handler error:", err);
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

  // 1. BroadcastChannel dispatch
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(stampedMsg);
    } catch (err) {
      console.error("[Realtime] Publish error:", err);
    }
  }

  // Also dispatch locally to subscribers in the same window context
  subscribers.forEach((fn) => {
    try {
      fn(stampedMsg);
    } catch (err) {
      console.error("[Realtime] Local subscriber error:", err);
    }
  });

  // 2. External Provider Hook (e.g. Firebase or Supabase):
  // publishToExternalBackend(stampedMsg);
}

/**
 * Subscribe to all events on the realtime bus
 */
export function subscribe(handler: Handler): () => void {
  subscribers.add(handler);
  getBroadcastChannel(); // Ensure channel is listening
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

/* =========================================================================
 * BACKEND ADAPTER STUBS FOR MULTI-DEVICE TOURNAMENTS
 * =========================================================================
 * When running across separate laptops, configure one of the options below:
 *
 * OPTION A: SUPABASE REALTIME
 * -------------------------------------------------------------------------
 * 1. npm install @supabase/supabase-js
 * 2. Create a Supabase project at https://supabase.com
 * 3. Initialize:
 *
 *    import { createClient } from "@supabase/supabase-js";
 *    const supabase = createClient("https://XYZ.supabase.co", "ANON_KEY");
 *    const room = supabase.channel("hawkins-protocol");
 *    room.on("broadcast", { event: "event" }, ({ payload }) => {
 *      subscribers.forEach(fn => fn(payload));
 *    }).subscribe();
 *
 *    function publishToExternalBackend(msg) {
 *      room.send({ type: "broadcast", event: "event", payload: msg });
 *    }
 *
 * OPTION B: FIREBASE REALTIME DATABASE
 * -------------------------------------------------------------------------
 * 1. npm install firebase
 * 2. Create a Firebase project at https://console.firebase.google.com
 * 3. Initialize:
 *
 *    import { initializeApp } from "firebase/app";
 *    import { getDatabase, ref, push, onChildAdded } from "firebase/database";
 *    const app = initializeApp({ databaseURL: "https://XYZ.firebaseio.com" });
 *    const db = getDatabase(app);
 *    const eventsRef = ref(db, "events");
 *    onChildAdded(eventsRef, (snapshot) => {
 *      const data = snapshot.val();
 *      subscribers.forEach(fn => fn(data));
 *    });
 *
 *    function publishToExternalBackend(msg) {
 *      push(eventsRef, msg);
 *    }
 * ========================================================================= */
