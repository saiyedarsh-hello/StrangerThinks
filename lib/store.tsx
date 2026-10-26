"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Category, ITEMS, STAGES, STAGE_ORDER, StageId, TOTAL_TIME } from "./stages";
import { FINAL_CODE, RADIOMETER_PINS } from "./radiometer";
import { STORY_TASKS, LocationId, StoryTask } from "./tasks";
import { CONFIG, AuthSession, getStoredSession, saveSession, clearSession } from "./config";
import { usePathname } from "next/navigation";
import { setDroneTheme, sfx } from "./audio";
import { subscribe, presence, RealtimeMessage, StoryEventType, SabKind, disconnectSocket, authenticateSocket } from "./realtime";
import { API_BASE, validateMasterKeypadOnServer, validateRadiometerPinOnServer, saveTeamProgressToServer, unlockHintOnServer } from "./api";

export type { SabKind };

export interface Sabotage {
  id: number;
  kind: SabKind;
  pinIndex?: number;
  message?: string;
  operatorName?: string;
  until: number; // epoch ms
}

export type PowerId = "eleven" | "will" | "vision";

export const POWERS: Record<PowerId, { name: string; theme: string; unlock: StageId; max: number; field: "force" | "signal" | "vision"; blurb: string }> = {
  vision: { name: "VISION", theme: "SEEING BEYOND", unlock: "lab", max: 3, field: "vision", blurb: "Reveal a hidden piece of information." },
  will: { name: "WILL'S POWER", theme: "CONNECTION", unlock: "forest", max: 2, field: "signal", blurb: "Detect a hidden signal or clue." },
  eleven: { name: "ELEVEN'S POWER", theme: "FORCE", unlock: "upsidedown", max: 2, field: "force", blurb: "Receive one special clue." },
};

export interface Breakdown {
  tech: number;
  puzzle: number;
  clue: number;
  speed: number;
  story: number;
  teamwork: number;
}

export interface RadiometerState {
  pins: (string | null)[];
  solved: boolean[];
  pinsSolved: boolean[];
  codeSolved: boolean;
  distortion: number; // 5=fully distorted, 0=clean
}

export interface TeamInfo {
  id: string;
  name: string;
  leaderName?: string;
  members: string[];
  location: LocationId;
  currentTask: string;
  storyProgress: number; // 0-100
  score: number;
  totalScore?: number;
  powers: PowerId[];
  powerCharges: Record<PowerId, number>;
  completedTasks: string[];
  clues: Record<string, string>;
  inventory: string[];
  timeRemaining: number;
  vecnaStatus: "INACTIVE" | "ACTIVE";
  unlocked: Record<string, boolean>;
  solvedChapters?: number[];
  penalty?: number;
  unlockedHints?: Record<string, boolean>;
}

export interface GameState {
  phase: "intro" | "title" | "login" | "play";
  team: TeamInfo | null;
  location: LocationId;
  viewMode: "map" | "location" | "board";
  stage: StageId;
  solved: Record<string, boolean>;
  completedTasks: string[];
  clues: Record<string, string>;
  unlocked: Record<string, boolean>;
  lockedChallenges: Record<string, boolean>;
  vecnaStatus: "INACTIVE" | "ACTIVE";
  storyProgress: number; // 0-100
  breakdown: Breakdown;
  penalty: number;
  inventory: string[];
  gateKeys: string[];
  marks: number[];
  powerUses: Record<PowerId, number>;
  revealed: Record<string, Partial<Record<PowerId, boolean>>>;
  timeLeft: number;
  finishedAt: number | null;
  attempts: number;
  introSeen: boolean;
  vecnaCutscene: boolean;
  radiometer: RadiometerState;
  unlockedHints: Record<string, boolean>;
  taskScores?: Record<string, number>;
  isPaused?: boolean;
  unlockedStages?: number[];
}

const EMPTY_BREAKDOWN: Breakdown = { tech: 0, puzzle: 0, clue: 0, speed: 0, story: 0, teamwork: 0 };

const INITIAL_RADIOMETER: RadiometerState = {
  pins: [null, null, null, null, null],
  solved: [false, false, false, false, false],
  pinsSolved: [false, false, false, false, false],
  codeSolved: false,
  distortion: 5,
};

const INITIAL_UNLOCKED: Record<string, boolean> = {
  town: true,
  policeStation: true,
  byersHouse: true,
  radioTower: true,
  lab: false,
  forest: false,
  gate: false,
  upsidedown: false,
  mind: false,
};

const INITIAL: GameState = {
  phase: "title",
  team: null,
  location: "town",
  viewMode: "board",
  stage: "hawkins",
  solved: {},
  completedTasks: [],
  clues: {},
  unlocked: INITIAL_UNLOCKED,
  lockedChallenges: {},
  vecnaStatus: "INACTIVE",
  storyProgress: 5,
  breakdown: EMPTY_BREAKDOWN,
  penalty: 0,
  inventory: [],
  gateKeys: [],
  marks: [],
  powerUses: { eleven: 0, will: 0, vision: 0 },
  revealed: {},
  timeLeft: TOTAL_TIME,
  finishedAt: null,
  attempts: 0,
  introSeen: false,
  vecnaCutscene: false,
  radiometer: INITIAL_RADIOMETER,
  unlockedHints: {},
  taskScores: {},
  isPaused: false,
  unlockedStages: [1],
};

const KEY = CONFIG.STORAGE_KEY;

export const stageIndex = (s: StageId) => STAGE_ORDER.indexOf(s);

export const totalScore = (b: Breakdown, penalty = 0) =>
  Math.round(b.tech + b.puzzle + b.clue + b.speed + b.story + b.teamwork - penalty);

export function computeAggregatedTaskScore(taskScores: Record<string, number> = {}): number {
  const chapterSubScores: Record<number, number> = {};
  const chapterMainScores: Record<number, number> = {};
  let otherTasksScore = 0;

  for (const [key, val] of Object.entries(taskScores)) {
    const pts = typeof val === "number" ? val : 0;
    // Check if subquestion: ch1-q1, ch2-q3, etc.
    const subMatch = key.match(/^(?:ch|chapter)[\-_]?(\d+)[\-_]q(\d+)/i);
    if (subMatch) {
      const chId = Number(subMatch[1]);
      chapterSubScores[chId] = (chapterSubScores[chId] || 0) + pts;
      continue;
    }

    // Check if chapter completion task: ch1-quiz, ch2-police, ch1, etc.
    const chMatch = key.match(/^(?:ch|chapter)[\-_]?(\d+)(?:-(?:quiz|police|byers|lab|radio-tower|upsidedown|case-study|coding))?$/i);
    if (chMatch) {
      const chId = Number(chMatch[1]);
      chapterMainScores[chId] = Math.max(chapterMainScores[chId] || 0, pts);
      continue;
    }

    // Other tasks (radiometer, mini-games, etc.)
    otherTasksScore += pts;
  }

  // Combine chapters using max(subScores, mainScore)
  const allChapterIds = new Set([
    ...Object.keys(chapterSubScores).map(Number),
    ...Object.keys(chapterMainScores).map(Number),
  ]);

  let chaptersScore = 0;
  for (const chId of allChapterIds) {
    const sub = chapterSubScores[chId] || 0;
    const main = chapterMainScores[chId] || 0;
    chaptersScore += Math.max(sub, main);
  }

  return chaptersScore + otherTasksScore;
}

export interface InGameModalConfig {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "info" | "warning" | "danger" | "confirm";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface Ctx {
  s: GameState;
  hydrated: boolean;
  sessionVerified: boolean;
  session: AuthSession | null;
  score: number;
  sabotage: Sabotage | null;
  isPaused: boolean;
  isLocationLocked: boolean;
  cutscene: StageId | null;
  endCutscene: () => void;
  start: () => void;
  loginSession: (sessionData: AuthSession) => void;
  loginPlayer: (team: {
    id: string;
    teamName: string;
    leaderName: string;
    token?: string;
    totalScore?: number;
    score?: number;
    breakdown?: Breakdown;
    penalty?: number;
    completedTasks?: string[];
    solvedChapters?: number[];
    taskScores?: Record<string, number>;
    unlockedLocations?: Record<string, boolean>;
    storyProgress?: number;
  }) => void;
  register: (name: string, members: string[]) => void;
  logout: () => void;
  submit: (challengeId: string, text: string) => boolean;
  submitTask: (taskId: string, points: number, answerText: string, alreadyAwarded?: boolean) => void;
  castPower: (p: PowerId, challengeId: string) => string | null;
  powerUnlocked: (p: PowerId) => boolean;
  stageComplete: (id?: StageId) => boolean;
  advance: () => void;
  jump: (id: StageId) => void;
  grantItem: (id: string) => void;
  findMark: (n: number) => void;
  insertKey: (id: string) => void;
  clearSabotage: () => void;
  reset: () => void;
  soundOn: boolean;
  setSoundOn: (b: boolean) => void;
  toast: string | null;
  say: (msg: string) => void;
  active: string | null;
  setActive: (id: string | null) => void;
  travelTo: (loc: LocationId) => void;
  viewMode: "map" | "location" | "board";
  setViewMode: (m: "map" | "location" | "board") => void;
  introSeen: boolean;
  setIntroSeen: (seen: boolean) => void;
  vecnaCutscene: boolean;
  triggerVecnaArrival: () => void;
  dismissVecnaCutscene: () => void;
  solveRadiometerPin: (pinIndex: number, points: number) => void;
  submitRadiometerCode: (code: string) => Promise<boolean> | boolean;
  radiometerPinCount: number;
  activeChapterId: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  setActiveChapterId: (id: 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  chapterModalOpen: boolean;
  setChapterModalOpen: (open: boolean) => void;
  unlockedHints: Record<string, boolean>;
  unlockHint: (hintKey: string, cost?: number) => boolean;
  isHintUnlocked: (hintKey: string) => boolean;
  spendPoints: (points: number, reason?: string) => void;
  modal: InGameModalConfig | null;
  showAlert: (
    message: string,
    options?: { title?: string; confirmLabel?: string; type?: "info" | "warning" | "danger" }
  ) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    options?: { title?: string; confirmLabel?: string; cancelLabel?: string; type?: "warning" | "danger" | "confirm" }
  ) => void;
  closeModal: () => void;
}

const GameCtx = createContext<Ctx | null>(null);
export function purgeTeamGameplayCache(teamId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;

      const isTeamSpecific =
        k.startsWith("hawkins_quiz_answers_") ||
        k.startsWith("hawkins_quiz_attempts_") ||
        k.startsWith("hawkins_quiz_results_") ||
        k.startsWith("hawkins_rearrange_") ||
        k.startsWith("hawkins_connections_") ||
        k.startsWith("hawkins_team_save_") ||
        k.startsWith("vecna_");

      const isGlobalGameplay =
        k === CONFIG.STORAGE_KEY ||
        k === "hawkins_seen_briefings" ||
        k === "hawkins_corrupt_answers" ||
        k === "hawkins_active_chapter" ||
        k === "hawkins_live_score_sync" ||
        k === "hawkins_persisted_leaderboard";

      if (isGlobalGameplay) {
        keysToRemove.push(k);
      } else if (isTeamSpecific) {
        if (!teamId || k.includes(teamId)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}

export const useGame = () => {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isGame = path === "/";
  const [s, setS] = useState<GameState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sabotage, setSabotage] = useState<Sabotage | null>(null);
  const [cutscene, setCutscene] = useState<StageId | null>(null);
  const [soundOn, setSoundOnState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hawkins_active_chapter");
        if (saved) {
          const num = parseInt(saved, 10);
          if ([1, 2, 3, 4, 5, 6, 7].includes(num)) return num as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        }
      } catch {}
    }
    return 1;
  });
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [modal, setModal] = useState<InGameModalConfig | null>(null);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const showAlert = useCallback(
    (message: string, options?: { title?: string; confirmLabel?: string; type?: "info" | "warning" | "danger" }) => {
      sfx(options?.type === "warning" || options?.type === "danger" ? "err" : "click");
      setModal({
        message,
        title: options?.title || "HAWKINS TELEMETRY // NOTICE",
        type: options?.type || "info",
        confirmLabel: options?.confirmLabel || "ACKNOWLEDGE",
        onConfirm: () => setModal(null),
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      message: string,
      onConfirm: () => void,
      options?: { title?: string; confirmLabel?: string; cancelLabel?: string; type?: "warning" | "danger" | "confirm" }
    ) => {
      sfx("type");
      setModal({
        message,
        title: options?.title || "SECURITY PROTOCOL CONFIRMATION",
        type: options?.type || "confirm",
        confirmLabel: options?.confirmLabel || "CONFIRM",
        cancelLabel: options?.cancelLabel || "CANCEL",
        onConfirm: () => {
          setModal(null);
          onConfirm();
        },
        onCancel: () => {
          setModal(null);
        },
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hawkins_active_chapter", String(activeChapterId));
      } catch {}
    }
  }, [activeChapterId]);

  const sRef = useRef(s);
  sRef.current = s;

  // Guard: if current activeChapterId is not unlocked by admin, fall back to 1
  useEffect(() => {
    if (s.unlockedStages && Array.isArray(s.unlockedStages) && s.unlockedStages.length > 0) {
      if (activeChapterId > 1 && !s.unlockedStages.includes(activeChapterId)) {
        setActiveChapterId(1);
      }
    }
  }, [s.unlockedStages, activeChapterId]);

  // Hydrate from localStorage
  useEffect(() => {
    if (!isGame) {
      setHydrated(false);
      return;
    }
    const currentSession = getStoredSession();
    setSession(currentSession);

    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const rm = parsed.radiometer || {};
        const pinsSolved = rm.pinsSolved || [false, false, false, false, false];
        const solved = rm.solved || [...pinsSolved];
        const pins = rm.pins || pinsSolved.map((ok: boolean, i: number) => (ok ? RADIOMETER_PINS[i]?.digit ?? null : null));

        const isPlayerSession = currentSession && currentSession.role === "PLAYER";
        const teamData = isPlayerSession
          ? {
              ...(parsed.team || {}),
              id: currentSession.teamId || parsed.team?.id || "T01",
              name: currentSession.teamName,
              leaderName: currentSession.leaderName,
            }
          : parsed.team;

        setS({
          ...INITIAL,
          ...parsed,
          team: teamData,
          phase: isPlayerSession ? (parsed.phase === "play" ? "play" : "play") : "login",
          breakdown: { ...EMPTY_BREAKDOWN, ...(parsed.breakdown || {}) },
          completedTasks: parsed.completedTasks || [],
          clues: parsed.clues || {},
          taskScores: parsed.taskScores || {},
          unlocked: { ...INITIAL_UNLOCKED, ...(parsed.unlocked || {}) },
          unlockedHints: parsed.unlockedHints || {},
          lockedChallenges: parsed.lockedChallenges || {},
          radiometer: {
            ...INITIAL_RADIOMETER,
            ...rm,
            pins,
            solved,
            pinsSolved,
          },
        });
      } else if (currentSession && currentSession.role === "PLAYER") {
        let localSave: any = null;
        try {
          const raw = localStorage.getItem(`hawkins_team_save_${currentSession.teamId}`);
          if (raw) localSave = JSON.parse(raw);
        } catch {}

        const teamScore = localSave?.totalScore ?? localSave?.score ?? 0;
        const teamSolvedChapters = localSave?.solvedChapters || [];
        const teamCompleted = localSave?.completedTasks || [];
        const teamUnlocked = { ...INITIAL_UNLOCKED, ...(localSave?.unlockedLocations || {}) };
        const teamProgress = localSave?.storyProgress ?? 10;
        const teamBreakdown = localSave?.breakdown || {
          tech: 0,
          puzzle: teamScore,
          clue: 0,
          speed: 0,
          story: 0,
          teamwork: 0,
        };

        setS((p) => ({
          ...p,
          phase: "play",
          breakdown: teamBreakdown,
          penalty: localSave?.penalty || 0,
          taskScores: localSave?.taskScores || {},
          completedTasks: teamCompleted,
          unlocked: teamUnlocked,
          storyProgress: teamProgress,
          solved: {
            ...p.solved,
            ...(localSave?.solved || {}),
            ...teamCompleted.reduce((acc: any, t: string) => ({ ...acc, [t]: true }), {}),
          },
          team: {
            id: currentSession.teamId || "T01",
            name: currentSession.teamName,
            leaderName: currentSession.leaderName,
            members: [currentSession.leaderName],
            location: "town",
            currentTask: "town-1",
            storyProgress: teamProgress,
            score: teamScore,
            totalScore: teamScore,
            solvedChapters: teamSolvedChapters,
            powers: ["vision"],
            powerCharges: { vision: 3, will: 2, eleven: 2 },
            completedTasks: teamCompleted,
            clues: {},
            inventory: [],
            timeRemaining: TOTAL_TIME,
            vecnaStatus: "INACTIVE",
            unlocked: teamUnlocked,
          },
        }));
      } else {
        setS((p) => ({ ...p, phase: "login" }));
      }
    } catch {}
    setHydrated(true);

    // Fetch current tournament event state & unlocked stages from server
    fetch("/api/admin/event/state")
      .then((r) => r.json())
      .then((evData) => {
        const ev = evData?.eventState;
        if (ev) {
          const hwk = ev.unlockedStagesHawkins || ev.unlockedStages;
          setS((prev) => ({
            ...prev,
            isPaused: Boolean(ev.isPaused ?? (ev.status === "paused")),
            ...(Array.isArray(hwk) && hwk.length > 0 ? { unlockedStages: hwk } : {}),
          }));
        }
      })
      .catch(() => {});

    // Validate live session with server if token available
    const sessionToken = (currentSession as any)?.token;
    if (!sessionToken) {
      setSessionVerified(true);
    } else {
      fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            const serverRole: AuthSession["role"] =
              data.role === "ADMIN" || data.role === "VECNA" ? data.role : "PLAYER";
            const sData: AuthSession = {
              role: serverRole,
              teamName: data.session?.teamName || data.team?.teamName || "",
              leaderName: data.session?.leaderName || data.team?.squadLeader || "",
              teamId: data.session?.teamId || data.team?.id || "",
              ...(data.session?.adminId ? { adminId: data.session.adminId } : {}),
              ...(sessionToken ? { token: sessionToken } : {}),
            };
            saveSession(sData);
            setSession(sData);
            setSessionVerified(true);

            if (serverRole !== "PLAYER") {
              authenticateSocket(sessionToken);
              return;
            }

            let localSave: any = null;
            try {
              const raw = localStorage.getItem(`hawkins_team_save_${sData.teamId}`);
              if (raw) localSave = JSON.parse(raw);
            } catch {}

            const sTotalScore = typeof data.team?.totalScore === "number" ? data.team.totalScore : (typeof data.team?.score === "number" ? data.team.score : 0);
            const sSolvedChapters = Array.isArray(data.team?.solvedChapters) ? data.team.solvedChapters : [];
            const sCompletedTasks = Array.isArray(data.team?.completedTasks) ? data.team.completedTasks : [];

            if (sTotalScore === 0 && sCompletedTasks.length === 0) {
              purgeTeamGameplayCache(sData.teamId);
              localSave = null;
            }

            const teamScore = sTotalScore;
            const teamSolvedChapters = sSolvedChapters;
            const teamCompleted = sCompletedTasks;
            const sBreakdown: Breakdown = data.team?.breakdown || localSave?.breakdown || {
              tech: 0,
              puzzle: teamScore,
              clue: 0,
              speed: 0,
              story: 0,
              teamwork: 0,
            };

            const teamTaskScores: Record<string, number> = {
              ...(localSave?.taskScores || {}),
              ...(data.team?.taskScores || {}),
            };
            if (Object.keys(teamTaskScores).length === 0 && teamCompleted.length > 0 && teamScore > 0) {
              const perTask = Math.floor(teamScore / teamCompleted.length);
              teamCompleted.forEach((tid: string, idx: number) => {
                teamTaskScores[tid] = idx === 0 ? teamScore - perTask * (teamCompleted.length - 1) : perTask;
              });
            }
            const teamUnlocked = {
              ...INITIAL_UNLOCKED,
              ...(localSave?.unlockedLocations || {}),
              ...(data.team?.unlockedLocations || {}),
            };
            const teamStoryProg = data.team?.storyProgress ?? localSave?.storyProgress ?? 10;
            setS((prev) => ({
              ...prev,
              phase: "play",
              breakdown: sBreakdown,
              penalty: data.team?.penalty ?? localSave?.penalty ?? prev.penalty,
              taskScores: Object.keys(teamTaskScores).length > 0 ? teamTaskScores : prev.taskScores,
              completedTasks: teamCompleted.length > 0 ? teamCompleted : prev.completedTasks,
              unlocked: teamUnlocked,
              storyProgress: teamStoryProg,
              isPaused: Boolean(data.event?.isPaused),
              solved: {
                ...prev.solved,
                ...(localSave?.solved || {}),
                ...teamCompleted.reduce((acc: any, t: string) => ({ ...acc, [t]: true }), {}),
              },
              team: {
                ...prev.team,
                id: data.team?.id || sData.teamId || prev.team.id,
                name: data.team?.teamName || prev.team.name,
                leaderName: data.team?.squadLeader || prev.team.leaderName,
                members: [data.team?.squadLeader || prev.team.leaderName || ""],
                score: teamScore,
                totalScore: teamScore,
                solvedChapters: teamSolvedChapters,
              },
            }));

            authenticateSocket(sessionToken);
          } else {
            clearSession();
            setSession(null);
            setSessionVerified(true);
          }
        })
        .catch(() => {
          setSessionVerified(true);
        });
    }
  }, [isGame]);

  // Persist to localStorage: debounce game state changes to prevent 1-second storage thrashing
  const lastSavedJsonRef = useRef<string>("");
  useEffect(() => {
    if (!hydrated || !isGame) return;
    const timeout = setTimeout(() => {
      try {
        const serialized = JSON.stringify(s);
        if (serialized !== lastSavedJsonRef.current) {
          lastSavedJsonRef.current = serialized;
          localStorage.setItem(KEY, serialized);
        }
      } catch {}
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    s.breakdown,
    s.completedTasks,
    s.solved,
    s.unlocked,
    s.taskScores,
    s.radiometer,
    s.unlockedHints,
    s.penalty,
    s.stage,
    s.phase,
    s.team,
    s.unlockedStages,
    s.isPaused,
    hydrated,
    isGame,
  ]);

  // Ensure state is flushed before window unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hydrated && isGame && sRef.current) {
        try {
          localStorage.setItem(KEY, JSON.stringify(sRef.current));
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hydrated, isGame]);

  // Theme on <html>
  useEffect(() => {
    const isMind = s.location === "upsidedown" || s.stage === "mind" || s.stage === "final";
    const theme = path?.startsWith("/vecna")
      ? "upside"
      : isGame && s.phase === "play"
      ? (s.stage === "mind" || s.location === "upsidedown" ? "upside" : STAGES[s.stage]?.theme || "normal")
      : "normal";
    document.documentElement.dataset.theme = theme;
    setDroneTheme(isMind ? "mind" : theme);
  }, [s.stage, s.phase, s.location, path, isGame]);

  // Clock: freezes cleanly when paused
  useEffect(() => {
    if (!isGame || s.phase !== "play" || s.stage === "ending" || s.isPaused) return;
    const t = setInterval(() => {
      setS((p) => {
        if (p.isPaused) return p;
        return p.timeLeft <= 0 ? p : { ...p, timeLeft: p.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [s.phase, s.stage, s.isPaused, isGame]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  }, []);

  const setGuardedActiveChapterId = useCallback(
    (target: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
      const allowedStages = sRef.current.unlockedStages || [1];
      if (target > 1 && !allowedStages.includes(target)) {
        sfx("err");
        say(`SECTOR ${target} RESTRICTED: Awaiting broadcast authorization from Command.`);
        return;
      }
      setActiveChapterId(target);
    },
    [say]
  );

  // Sabotage expiry
  useEffect(() => {
    if (!sabotage) return;
    const ms = sabotage.until - Date.now();
    if (ms <= 0) {
      setSabotage(null);
      return;
    }
    const t = setTimeout(() => setSabotage(null), ms);
    return () => clearTimeout(t);
  }, [sabotage]);

  // Realtime Adapter Subscription & Presence Heartbeat
  useEffect(() => {
    if (!isGame) return;

    const unsub = subscribe((m: RealtimeMessage) => {
      const cur = sRef.current;
      if (cur.phase !== "play") return;
      const mine = cur.team?.name;
      const myId = cur.team?.id;

      if ("target" in m && m.target && m.target !== "all") {
        const targetStr = String(m.target).trim().toLowerCase();
        const matchesName = mine && targetStr === mine.trim().toLowerCase();
        const matchesId = myId && targetStr === myId.trim().toLowerCase();
        const matchesTargetTeamId =
          (m as any).targetTeamId && myId && String((m as any).targetTeamId).trim().toLowerCase() === myId.trim().toLowerCase();
        const matchesTargetTeamName =
          (m as any).targetTeamName && mine && String((m as any).targetTeamName).trim().toLowerCase() === mine.trim().toLowerCase();

        if (!matchesName && !matchesId && !matchesTargetTeamId && !matchesTargetTeamName) {
          return;
        }
      }

      if (m.type === "sabotage") {
        if (cur.stage === "ending") return;
        if (m.kind === "MESSAGE") {
          sfx("vecnaCurse");
        }
        applySabotage(m.kind as SabKind, m.pinIndex, m.message, m.operatorName);
      }

      if (m.type === "story_event") {
        handleStoryEvent(m.event, m.operatorName);
      }

      if (m.type === "challenge_lock") {
        setS((p) => ({
          ...p,
          lockedChallenges: {
            ...p.lockedChallenges,
            [m.challengeId]: m.locked,
          },
        }));
        if (m.locked) {
          sfx("err");
          say(`CONTROL: CHALLENGE [${m.challengeId.toUpperCase()}] LOCKED`);
        } else {
          sfx("ok");
          say(`CONTROL: CHALLENGE [${m.challengeId.toUpperCase()}] UNLOCKED`);
        }
      }

      if (m.type === "award") {
        setS((p) => ({
          ...p,
          breakdown: { ...p.breakdown, teamwork: p.breakdown.teamwork + (m.points || 0) },
        }));
        sfx("ok");
        say(`AWARDED +${m.points} TEAMWORK BY ${m.operatorName || "ORGANIZER"}`);
      }

      if (m.type === "stage_unlocked") {
        const target = (m as any).target || "all";
        if (target === "vecna") return; // Hawkins players ignore Vecna-only stage unlocks
        const stages = (m as any).unlockedStagesHawkins || (m as any).unlockedStages;
        if (Array.isArray(stages) && stages.length > 0) {
          setS((p) => ({
            ...p,
            unlockedStages: stages,
          }));
        }
      }

      if (m.type === "SCORE_UPDATE") {
        const myTeamId = sRef.current.team?.id;
        const myTeamName = sRef.current.team?.name;
        const normalize = (val?: string) => (val || "").trim().toLowerCase().replace(/^team[\s\-_]*/i, "").replace(/^0+/, "");
        const normMyId = normalize(myTeamId);
        const normMsgId = normalize(m.teamId);
        const normMyName = (myTeamName || "").trim().toLowerCase();
        const normMsgName = (m.teamName || "").trim().toLowerCase();

        const isMyTeam =
          (m.teamId && (m.teamId === myTeamId || (normMyId && normMyId === normMsgId))) ||
          (normMsgName && normMyName && normMsgName === normMyName);

        if (isMyTeam) {
          setS((p) => {
            const authoritativeTotal =
              m.newScore !== undefined
                ? m.newScore
                : (m as any).score !== undefined
                ? (m as any).score
                : undefined;

            let nextBreakdown = { ...p.breakdown };
            if ((m as any).breakdown) {
              nextBreakdown = { ...(m as any).breakdown };
            } else if (authoritativeTotal !== undefined) {
              const currentTotal = totalScore(p.breakdown, p.penalty);
              const diff = authoritativeTotal - currentTotal;
              nextBreakdown.tech += diff;
            } else if (m.delta) {
              nextBreakdown.tech += m.delta;
            }

            const nextCompletedTasks =
              m.taskId && !p.completedTasks.includes(m.taskId)
                ? [...p.completedTasks, m.taskId]
                : p.completedTasks;

            const finalTeamScore =
              authoritativeTotal !== undefined
                ? authoritativeTotal
                : totalScore(nextBreakdown, p.penalty);

            return {
              ...p,
              breakdown: nextBreakdown,
              completedTasks: nextCompletedTasks,
              team: p.team
                ? {
                    ...p.team,
                    score: finalTeamScore,
                    totalScore: finalTeamScore,
                    completedTasks: nextCompletedTasks,
                  }
                : p.team,
            };
          });
        }
      }

      if (m.type === "event_state") {
        const newHawkinsStages = (m as any).unlockedStagesHawkins || (m as any).unlockedStages;
        setS((p) => ({
          ...p,
          isPaused: Boolean(m.isPaused),
          ...(Array.isArray(newHawkinsStages) && newHawkinsStages.length > 0 ? { unlockedStages: newHawkinsStages } : {}),
        }));
        if (m.isPaused) {
          say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
          sfx("err");
        } else {
          say("HAWKINS COMMAND: TOURNAMENT RESUMED");
          sfx("ok");
        }
      }

      if (m.type === "event_reset") {
        purgeTeamGameplayCache();
        sfx("boom");
        say("HAWKINS COMMAND: FRESH TOURNAMENT EVENT INITIATED · All scores and stages reset to 0.");
        setS((p) => ({
          ...INITIAL,
          phase: p.phase === "play" ? "play" : p.phase,
          team: p.team
            ? {
                ...p.team,
                score: 0,
                totalScore: 0,
                solvedChapters: [],
                completedTasks: [],
                storyProgress: 0,
              }
            : null,
          unlockedStages: (m as any).unlockedStagesHawkins || (m as any).unlockedStages || [1],
          timeLeft: TOTAL_TIME,
          isPaused: false,
        }));
        setActiveChapterId(1);
        try {
          window.dispatchEvent(new CustomEvent("hawkins:event_reset"));
        } catch {}
      }

      if (m.type === "event_ended") {
        sfx("err");
        say("HAWKINS COMMAND: TOURNAMENT CONCLUDED BY ADMINISTRATOR");
        setS((p) => ({
          ...p,
          stage: "ending",
          isPaused: false,
        }));
      }

      if (m.type === "force_logout") {
        const myTeamId = sRef.current.team?.id;
        const myTeamName = sRef.current.team?.name;
        const tgt = String(m.target || "").trim().toLowerCase();
        const isMatch =
          !m.target ||
          tgt === "all" ||
          (myTeamId && tgt === myTeamId.toLowerCase()) ||
          (myTeamName && tgt === myTeamName.toLowerCase()) ||
          ((m as any).teamId && myTeamId && String((m as any).teamId).toLowerCase() === myTeamId.toLowerCase());
        if (isMatch) {
          say("HAWKINS COMMAND: SESSION TERMINATED BY ADMINISTRATOR");
          sfx("err");
          logout();
        }
      }
    });

    const beat = setInterval(() => {
      const cur = sRef.current;
      if (cur.phase !== "play" || !cur.team) return;

      const distinctStages = new Set<number>();
      (cur.completedTasks || []).forEach((t) => {
        const match = String(t).match(/^(?:ch|chapter)[\-_]?(\d+)/i);
        if (match) {
          const num = Number(match[1]);
          if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
        }
      });

      presence({
        team: cur.team.name,
        teamId: cur.team.id,
        location: cur.location,
        viewMode: cur.viewMode,
        storyProgress: cur.storyProgress,
        stage: cur.stage,
        score: totalScore(cur.breakdown, cur.penalty),
        timeLeft: cur.timeLeft,
        solved: distinctStages.size,
        completedTasks: cur.completedTasks,
        vecnaStatus: cur.vecnaStatus,
        radiometerPins: cur.radiometer.pinsSolved.filter(Boolean).length,
        radiometer: {
          pins: cur.radiometer.pins,
          solved: cur.radiometer.solved,
          codeSolved: cur.radiometer.codeSolved,
        },
        ts: Date.now(),
      });
    }, 2000);

    return () => {
      clearInterval(beat);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGame]);

  const handleStoryEvent = (event: StoryEventType, operatorName?: string) => {
    const op = operatorName ? `[${operatorName}] ` : "";
    if (event === "gate_open") {
      setS((p) => ({
        ...p,
        gateKeys: ["key-alpha", "key-beta", "key-gamma"],
        unlocked: { ...p.unlocked, gate: true },
        location: "gate",
        viewMode: "location",
        storyProgress: Math.max(p.storyProgress, 60),
      }));
      sfx("gate");
      say(`${op}STORY EVENT: THE GATE HAS OPENED`);
    } else if (event === "upsidedown_activate") {
      setS((p) => ({
        ...p,
        unlocked: { ...p.unlocked, upsidedown: true, mind: true },
        location: "upsidedown",
        stage: "upsidedown",
        viewMode: "location",
        storyProgress: Math.max(p.storyProgress, 75),
      }));
      sfx("boom");
      sfx("alarm");
      say(`${op}STORY EVENT: ENTERING THE UPSIDE DOWN`);
    } else if (event === "vecna_appear") {
      setS((p) => ({
        ...p,
        vecnaStatus: "ACTIVE",
        vecnaCutscene: true,
      }));
      sfx("alarm");
      sfx("heartbeat");
    } else if (event === "will_signal") {
      setS((p) => ({
        ...p,
        clues: { ...p.clues, "will-signal": "Will's transmission detected across repeater radio." },
        location: "byersHouse",
        viewMode: "location",
      }));
      sfx("morseDot");
      sfx("clue");
      say(`${op}STORY EVENT: INCOMING TRANSMISSION FROM WILL`);
    } else if (event === "final_stage") {
      setS((p) => ({
        ...p,
        stage: "mind",
        location: "mind",
        vecnaStatus: "ACTIVE",
        viewMode: "location",
        storyProgress: 90,
      }));
      sfx("clockChime");
      say(`${op}STORY EVENT: FINAL SHOWDOWN IN VECNA'S MIND`);
    }
  };

  const applySabotage = (kind: SabKind, pinIndex?: number, message?: string, operatorName?: string) => {
    const dur: Record<SabKind, number> = {
      CORRUPT: 30,
      TIME_FREEZE: 5,
      LOCK: 20,
      DISTORT: 40,
      SIGNAL_JAM: 30,
      WATCH: 8,
      MESSAGE: 8,
      GLITCH: 3,
    };

    if (kind === "GLITCH") {
      sfx("staticBurst");
      sfx("glitch");
    } else if (kind === "WATCH") {
      sfx("glitch");
    } else {
      sfx("alarm");
    }

    if (kind === "TIME_FREEZE") {
      setS((p) => ({ ...p, timeLeft: Math.max(0, p.timeLeft - 120) }));
    }

    setSabotage({
      id: Date.now(),
      kind,
      pinIndex,
      message,
      operatorName,
      until: Date.now() + (dur[kind] || 20) * 1000,
    });
  };

  const stageComplete = useCallback(
    (id?: StageId) => {
      const sid = id ?? s.stage;
      const st = STAGES[sid];
      if (sid === "gate") return s.gateKeys.length >= 3;
      if (sid === "ending") return true;
      return st?.challenges ? st.challenges.every((c) => s.solved[c.id]) : true;
    },
    [s.stage, s.solved, s.gateKeys]
  );

  const start = useCallback(() => {
    setS((p) => ({ ...p, phase: "login" }));
  }, []);

  const loginPlayer = useCallback(
    (team: {
      id: string;
      teamName: string;
      leaderName: string;
      token?: string;
      totalScore?: number;
      score?: number;
      breakdown?: Breakdown;
      penalty?: number;
      completedTasks?: string[];
      solvedChapters?: number[];
      taskScores?: Record<string, number>;
      unlockedLocations?: Record<string, boolean>;
      storyProgress?: number;
    }) => {
      const sessionData: AuthSession = {
        role: "PLAYER",
        teamName: team.teamName,
        leaderName: team.leaderName,
        teamId: team.id,
        ...(team.token ? { token: team.token } : {}),
      };
      saveSession(sessionData);
      setSession(sessionData);
      setSessionVerified(true);

      if (typeof document !== "undefined" && team.token) {
        document.cookie = `hawkins_session_token=${team.token}; path=/; max-age=86400; SameSite=Lax`;
      }

      if (team.token) {
        authenticateSocket(team.token);
      }

      let localSave: any = null;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`hawkins_team_save_${team.id}`);
          if (raw) localSave = JSON.parse(raw);
        } catch {}
      }

      const sTotalScore = typeof team.totalScore === "number" ? team.totalScore : (typeof team.score === "number" ? team.score : 0);
      const sSolvedChapters = Array.isArray(team.solvedChapters) ? team.solvedChapters : [];
      const sCompletedTasks = Array.isArray(team.completedTasks) ? team.completedTasks : [];

      if (sTotalScore === 0 && sCompletedTasks.length === 0) {
        purgeTeamGameplayCache(team.id);
        localSave = null;
      }

      const teamScore = sTotalScore;
      const teamSolvedChapters = sSolvedChapters;
      const teamCompleted = sCompletedTasks;
      const teamBreakdown: Breakdown = team.breakdown || localSave?.breakdown || {
        tech: teamScore,
        puzzle: 0,
        clue: 0,
        speed: 0,
        story: 0,
        teamwork: 0,
      };
      const teamUnlocked = { ...INITIAL_UNLOCKED, ...(localSave?.unlockedLocations || {}), ...(team.unlockedLocations || {}) };
      const teamProgress = team.storyProgress ?? localSave?.storyProgress ?? 10;

      let teamTaskScores: Record<string, number> = { ...(localSave?.taskScores || {}), ...(team.taskScores || {}) };
      if (Object.keys(teamTaskScores).length === 0 && teamCompleted.length > 0 && teamScore > 0) {
        const perTask = Math.floor(teamScore / teamCompleted.length);
        teamCompleted.forEach((tid, idx) => {
          teamTaskScores[tid] = idx === 0 ? teamScore - perTask * (teamCompleted.length - 1) : perTask;
        });
      }

      const teamObj: TeamInfo = {
        id: team.id,
        name: team.teamName,
        leaderName: team.leaderName,
        members: [team.leaderName],
        location: "town",
        currentTask: "town-1",
        storyProgress: teamProgress,
        score: teamScore,
        totalScore: teamScore,
        solvedChapters: teamSolvedChapters,
        powers: ["vision"],
        powerCharges: { vision: 3, will: 2, eleven: 2 },
        completedTasks: teamCompleted,
        clues: {},
        inventory: [],
        timeRemaining: TOTAL_TIME,
        vecnaStatus: "INACTIVE",
        unlocked: teamUnlocked,
      };

      setS((p) => ({
        ...p,
        team: teamObj,
        phase: "play",
        location: "town",
        viewMode: "board",
        breakdown: teamBreakdown,
        penalty: team.penalty || localSave?.penalty || 0,
        taskScores: teamTaskScores,
        completedTasks: teamCompleted,
        unlocked: teamUnlocked,
        storyProgress: teamProgress,
        introSeen: false, // ensures cinematic typewriter intro runs on fresh login
        solved: {
          ...p.solved,
          ...(localSave?.solved || {}),
          ...teamCompleted.reduce((acc: any, t: string) => ({ ...acc, [t]: true }), {}),
        },
      }));
      setCutscene("hawkins");
      sfx("boom");
    },
    []
  );

  const loginSession = useCallback((sessionData: AuthSession) => {
    saveSession(sessionData);
    setSession(sessionData);
    setSessionVerified(true);

    if (typeof document !== "undefined" && sessionData.token) {
      document.cookie = `hawkins_session_token=${sessionData.token}; path=/; max-age=86400; SameSite=Lax`;
      if (sessionData.role === "ADMIN") {
        document.cookie = `hawkins_admin_token=${sessionData.token}; path=/; max-age=86400; SameSite=Lax`;
      }
    }

    if (sessionData.token) {
      authenticateSocket(sessionData.token);
    }
  }, []);

  const register = useCallback((name: string, members: string[]) => {
    const randomId = `HP-${Math.floor(1000 + Math.random() * 9000)}`;
    const teamObj: TeamInfo = {
      id: randomId,
      name,
      leaderName: members[0] || name,
      members,
      location: "town",
      currentTask: "town-1",
      storyProgress: 10,
      score: 0,
      powers: ["vision"],
      powerCharges: { vision: 3, will: 2, eleven: 2 },
      completedTasks: [],
      clues: {},
      inventory: [],
      timeRemaining: TOTAL_TIME,
      vecnaStatus: "INACTIVE",
      unlocked: { ...INITIAL_UNLOCKED },
    };
    setS((p) => ({
      ...p,
      team: teamObj,
      phase: "play",
      location: "town",
      viewMode: "board",
      storyProgress: 10,
    }));
    setCutscene("hawkins");
    sfx("boom");
  }, []);



  const grantItem = useCallback((id: string) => {
    setS((p) => (p.inventory.includes(id) ? p : { ...p, inventory: [...p.inventory, id] }));
    sfx("clue");
    if (ITEMS[id]) say(`ITEM ACQUIRED ÔÇö ${ITEMS[id].name.toUpperCase()}`);
  }, [say]);

  // Fast Travel between locations on Hawkins Map
  const travelTo = useCallback((loc: LocationId) => {
    sfx("click");
    setS((p) => {
      const updatedProgress = Math.max(p.storyProgress, loc === "upsidedown" ? 75 : loc === "lab" ? 45 : p.storyProgress);
      return {
        ...p,
        location: loc,
        viewMode: "location",
        storyProgress: updatedProgress,
      };
    });
    // Trigger chapter card
    const stageMap: Record<LocationId, StageId> = {
      town: "hawkins",
      policeStation: "hawkins",
      byersHouse: "will",
      radioTower: "hawkins",
      lab: "lab",
      forest: "forest",
      gate: "gate",
      upsidedown: "upsidedown",
      mind: "mind",
    };
    setCutscene(stageMap[loc] || "hawkins");
  }, []);

  // Submit task from Task Engine
  const submitTask = useCallback((taskId: string, points: number, answerText: string, alreadyAwarded = false) => {
    if (sRef.current.isPaused) {
      say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    sfx("ok");
    setS((p) => {
      const prevPoints = p.taskScores?.[taskId] ?? 0;
      // Idempotency: if already completed and recorded with equal or higher score, skip
      if (p.completedTasks.includes(taskId) && prevPoints >= points && points > 0) {
        return p;
      }

      const pointDelta = points - prevPoints;

      const taskDef = STORY_TASKS[taskId];
      const category = taskDef?.category || "puzzle";
      const nextCompleted = p.completedTasks.includes(taskId) ? p.completedTasks : [...p.completedTasks, taskId];
      const nextClues = { ...p.clues };

      if (taskDef?.storyClue) {
        nextClues[taskId] = taskDef.storyClue;
      }

      // Automatically unlock locations according to story milestones
      const nextUnlocked = { ...p.unlocked };
      if (taskId === "town-1" || taskId.startsWith("ch1")) {
        nextUnlocked.policeStation = true;
        nextUnlocked.radioTower = true;
        nextUnlocked.byersHouse = true;
      }
      if (taskId === "lab-terminal" || taskId.startsWith("ch2") || taskId.startsWith("ch3")) {
        nextUnlocked.lab = true;
        nextUnlocked.forest = true;
      }
      if (taskId === "forest-marks" || taskId.startsWith("ch4")) {
        nextUnlocked.radioTower = true;
        nextUnlocked.gate = true;
      }
      if (taskId === "gate-unlock" || taskId.startsWith("ch5") || taskId.startsWith("ch6")) {
        nextUnlocked.upsidedown = true;
        nextUnlocked.mind = true;
      }

      // Check if reward item granted
      const nextInv = [...p.inventory];
      if (taskDef?.rewardItem && !nextInv.includes(taskDef.rewardItem)) {
        nextInv.push(taskDef.rewardItem);
      }

      const progressGain = Math.round(90 / Math.max(1, Object.keys(STORY_TASKS).length));
      const newProgress = Math.min(100, p.storyProgress + progressGain);

      const nextTaskScores = { ...(p.taskScores || {}), [taskId]: points };
      const taskScoresSum = computeAggregatedTaskScore(nextTaskScores);
      const computedTotalScore = taskScoresSum > 0 ? taskScoresSum : (p.team?.totalScore ?? p.team?.score ?? 0);
      const netTotalScore = Math.max(0, computedTotalScore - (p.penalty || 0));
      const nextBreakdown: Breakdown = {
        tech: 0,
        puzzle: netTotalScore,
        clue: p.breakdown?.clue || 0,
        speed: p.breakdown?.speed || 0,
        story: p.breakdown?.story || 0,
        teamwork: p.breakdown?.teamwork || 0,
      };

      // Extract chapter number if applicable (Only whole chapter tasks, NOT individual subquestions)
      const isChapterCompletionTask = (id: string) => {
        if (/[-_]q\d+/i.test(id) || /item/i.test(id)) return null;
        const m = id.match(/^(?:ch|chapter)[\-_]?(\d+)(?:-(?:quiz|police|byers|lab|radio-tower|upsidedown|case-study|coding))?$/i);
        return m ? Number(m[1]) : null;
      };
      const chNum = isChapterCompletionTask(taskId);
      const solvedChapters = p.team?.id
        ? Array.from(
            new Set([
              ...(p.team.solvedChapters || []),
              ...nextCompleted
                .map((t) => isChapterCompletionTask(t))
                .filter((n): n is number => typeof n === "number" && n > 0),
              chNum ? chNum : 0,
            ].filter((n) => n > 0))
          )
        : [];

      const nextTeam = p.team
        ? {
            ...p.team,
            score: netTotalScore,
            totalScore: netTotalScore,
            penalty: p.penalty || 0,
            completedTasks: nextCompleted,
            solvedChapters,
          }
        : p.team;

      // Persist to Express backend immediately and save locally per team
      if (p.team?.id) {
        try {
          const teamSave = {
            teamId: p.team.id,
            completedTasks: nextCompleted,
            solvedChapters,
            taskScores: nextTaskScores,
            unlockedLocations: nextUnlocked,
            storyProgress: newProgress,
            breakdown: nextBreakdown,
            totalScore: netTotalScore,
            penalty: p.penalty || 0,
            solved: { ...p.solved, [taskId]: true },
          };
          localStorage.setItem(`hawkins_team_save_${p.team.id}`, JSON.stringify(teamSave));
        } catch {}

        saveTeamProgressToServer({
          teamId: p.team.id,
          completedTasks: nextCompleted,
          solvedChapters,
          taskScores: nextTaskScores,
          unlockedLocations: nextUnlocked,
          storyProgress: newProgress,
          breakdown: nextBreakdown,
          totalScore: netTotalScore,
          penalty: p.penalty || 0,
        }).catch((err) => console.warn("[PROGRESS PERSISTENCE NOTICE]", err));
      }

      return {
        ...p,
        completedTasks: nextCompleted,
        clues: nextClues,
        inventory: nextInv,
        unlocked: nextUnlocked,
        storyProgress: newProgress,
        solved: { ...p.solved, [taskId]: true },
        taskScores: nextTaskScores,
        breakdown: nextBreakdown,
        team: nextTeam,
      };
    });
  }, [say]);

  const submit = useCallback((cid: string, text: string) => {
    if (sRef.current.isPaused) {
      say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return false;
    }
    let ch: any = null;
    for (const st of Object.values(STAGES)) {
      const f = st.challenges.find((c) => c.id === cid);
      if (f) ch = f;
    }
    if (!ch) return false;
    const ok = ch.answer.test(text.trim());
    setS((p) => ({ ...p, attempts: p.attempts + 1 }));
    if (!ok) {
      sfx("err");
      return false;
    }
    sfx("ok");
    setS((p) => {
      if (p.solved[cid]) return p;
      const cat = ch.category as Category;
      const speedBonus = Math.round(ch.points * 0.2 * (p.timeLeft / TOTAL_TIME));
      return {
        ...p,
        solved: { ...p.solved, [cid]: true },
        completedTasks: Array.from(new Set([...p.completedTasks, cid])),
        breakdown: {
          ...p.breakdown,
          [cat]: p.breakdown[cat] + ch.points,
          speed: p.breakdown.speed + speedBonus,
        },
      };
    });
    return true;
  }, []);

  const powerUnlocked = useCallback(
    (p: PowerId) => stageIndex(s.stage) >= stageIndex(POWERS[p].unlock),
    [s.stage]
  );

  const castPower = useCallback(
    (p: PowerId, cid: string) => {
      const cur = sRef.current;
      if (cur.isPaused) {
        say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        sfx("err");
        return null;
      }
      if (!powerUnlocked(p)) return null;
      if (sabotage && sabotage.kind === "SIGNAL_JAM") {
        sfx("err");
        say("SIGNAL JAMMED ÔÇö POWERS OFFLINE");
        return null;
      }
      if (cur.revealed[cid]?.[p]) return "ALREADY";
      if (cur.powerUses[p] >= POWERS[p].max) {
        sfx("err");
        say("NO CHARGES LEFT");
        return null;
      }
      let hintText = "";
      if (STORY_TASKS[cid]) {
        hintText = STORY_TASKS[cid].hints[p];
      } else {
        for (const st of Object.values(STAGES)) {
          const f = st.challenges.find((c) => c.id === cid);
          if (f) hintText = f[POWERS[p].field];
        }
      }
      if (!hintText) return null;

      sfx("power");
      setS((q) => ({
        ...q,
        powerUses: { ...q.powerUses, [p]: q.powerUses[p] + 1 },
        penalty: q.penalty + 10,
        revealed: { ...q.revealed, [cid]: { ...(q.revealed[cid] || {}), [p]: true } },
      }));
      return hintText;
    },
    [powerUnlocked, sabotage, say]
  );

  const advance = useCallback(() => {
    const cur = sRef.current;
    const st = STAGES[cur.stage];
    const i = stageIndex(cur.stage);
    if (i >= STAGE_ORDER.length - 1) return;
    const next = STAGE_ORDER[i + 1];
    setS((p) => {
      const rewarded = st.reward && !p.inventory.includes(st.reward) ? [...p.inventory, st.reward] : p.inventory;
      return {
        ...p,
        inventory: rewarded,
        breakdown: { ...p.breakdown, story: p.breakdown.story + 50 },
        stage: next,
        storyProgress: Math.min(100, Math.round(((i + 1) / (STAGE_ORDER.length - 1)) * 100)),
        finishedAt: next === "ending" ? TOTAL_TIME - p.timeLeft : p.finishedAt,
      };
    });
    if (st.reward) sfx("clue");
    setCutscene(next);
    setSabotage(null);
  }, []);

  const jump = useCallback((id: StageId) => {
    setS((p) => {
      const idx = stageIndex(id);
      const rewards = STAGE_ORDER.slice(0, idx).map((x) => STAGES[x].reward).filter(Boolean) as string[];
      return {
        ...p,
        stage: id,
        phase: "play",
        team: p.team ?? {
          id: "HP-DEV",
          name: "DEV TEAM",
          members: [],
          location: "town",
          currentTask: "town-1",
          storyProgress: Math.round((idx / 9) * 100),
          score: 1200,
          powers: ["vision", "will", "eleven"],
          powerCharges: { vision: 3, will: 2, eleven: 2 },
          completedTasks: [],
          clues: {},
          inventory: rewards,
          timeRemaining: TOTAL_TIME,
          vecnaStatus: idx >= 5 ? "ACTIVE" : "INACTIVE",
          unlocked: { ...INITIAL_UNLOCKED, lab: true, forest: true, gate: true, upsidedown: true },
        },
        inventory: Array.from(new Set([...p.inventory, ...rewards])),
        storyProgress: Math.round((idx / 9) * 100),
        finishedAt: id === "ending" ? TOTAL_TIME - p.timeLeft : p.finishedAt,
      };
    });
    setCutscene(id);
  }, []);

  const findMark = useCallback((n: number) => {
    setS((p) => {
      if (p.marks.includes(n)) return p;
      const marks = [...p.marks, n];
      return {
        ...p,
        marks,
        inventory: marks.length === 3 && !p.inventory.includes("note-forest") ? [...p.inventory, "note-forest"] : p.inventory,
      };
    });
    sfx("clue");
  }, []);

  const insertKey = useCallback((id: string) => {
    setS((p) => (p.gateKeys.includes(id) ? p : { ...p, gateKeys: [...p.gateKeys, id] }));
    sfx("boom");
  }, []);

  const clearSabotage = useCallback(() => {
    setSabotage(null);
    sfx("ok");
  }, []);

  const solveRadiometerPin = useCallback((pinIndex: number, points: number) => {
    if (sRef.current.isPaused) {
      say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    // Notify server of pin calibration
    try {
      validateRadiometerPinOnServer(pinIndex, RADIOMETER_PINS[pinIndex]?.digit).catch(() => {});
    } catch {}

    setS((p) => {
      if (p.radiometer.pinsSolved[pinIndex] || p.radiometer.solved[pinIndex]) return p;
      const pins = [...(p.radiometer.pins || [null, null, null, null, null])];
      const solved = [...(p.radiometer.solved || [false, false, false, false, false])];
      const pinsSolved = [...(p.radiometer.pinsSolved || [false, false, false, false, false])];
      pins[pinIndex] = RADIOMETER_PINS[pinIndex]?.digit ?? null;
      solved[pinIndex] = true;
      pinsSolved[pinIndex] = true;
      const numSolved = solved.filter(Boolean).length;
      return {
        ...p,
        radiometer: {
          ...p.radiometer,
          pins,
          solved,
          pinsSolved,
          distortion: 5 - numSolved,
        },
        breakdown: { ...p.breakdown, puzzle: p.breakdown.puzzle + points },
      };
    });
    sfx("clue");
  }, []);

  const submitRadiometerCode = useCallback(async (code: string): Promise<boolean> => {
    if (sRef.current.isPaused) {
      say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return false;
    }
    try {
      const res = await validateMasterKeypadOnServer(code);
      if (res.success) {
        setS((p) => ({
          ...p,
          radiometer: { ...p.radiometer, codeSolved: true },
          unlocked: { ...p.unlocked, lab: true },
          breakdown: { ...p.breakdown, puzzle: p.breakdown.puzzle + (res.pointsAwarded || 200) },
        }));
        sfx("power");
        return true;
      }
    } catch {}

    // Fallback if backend is offline
    if (FINAL_CODE && code.trim() === FINAL_CODE) {
      setS((p) => ({
        ...p,
        radiometer: { ...p.radiometer, codeSolved: true },
        unlocked: { ...p.unlocked, lab: true },
        breakdown: { ...p.breakdown, puzzle: p.breakdown.puzzle + 200 },
      }));
      sfx("power");
      return true;
    }

    sfx("err");
    return false;
  }, []);

  const reset = useCallback(() => {
    setS({ ...INITIAL });
    setSabotage(null);
    setCutscene(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    try {
      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const teamId = (stored as any)?.teamId || s.team?.id;
      if (teamId) {
        purgeTeamGameplayCache(teamId);
      }
      if (token || teamId) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ teamId }),
        }).catch(() => {});
      }
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      }).catch(() => {});
    } catch {}
    disconnectSocket();
    if (typeof document !== "undefined") {
      document.cookie = "hawkins_session_token=; path=/; max-age=0";
    }
    clearSession();
    setSession(null);
    setSessionVerified(true);
    reset();
    setS({ ...INITIAL, phase: "login", introSeen: false });
    sfx("click");
  }, [reset, s.team?.id]);

  // Periodic session heartbeat & presence refresh
  useEffect(() => {
    if (!session || session.role !== "PLAYER") return;

    const interval = setInterval(() => {
      const token = (session as any)?.token;
      fetch("/api/auth/session", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (res.status === 401) {
            res.json().then((data) => {
              if (data && data.forceLoggedOut) {
                say("HAWKINS COMMAND: SESSION TERMINATED BY ADMINISTRATOR");
                sfx("err");
                logout();
              }
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [session, logout, say]);

  const endCutscene = useCallback(() => setCutscene(null), []);
  const setSoundOn = useCallback((b: boolean) => setSoundOnState(b), []);
  const setViewMode = useCallback((m: "map" | "location" | "board") => {
    sfx("click");
    setS((p) => ({ ...p, viewMode: m }));
  }, []);
  const setIntroSeen = useCallback((seen: boolean) => setS((p) => ({ ...p, introSeen: seen })), []);
  const triggerVecnaArrival = useCallback(() => {
    setS((p) => ({ ...p, vecnaStatus: "ACTIVE", vecnaCutscene: true }));
  }, []);
  const dismissVecnaCutscene = useCallback(() => {
    setS((p) => ({ ...p, vecnaCutscene: false }));
  }, []);

  const radiometerPinCount = s.radiometer.pinsSolved.filter(Boolean).length;

  const unlockHint = useCallback(
    (hintKey: string, cost = 5): boolean => {
      const cur = sRef.current;
      if (cur.isPaused) {
        say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        sfx("err");
        return false;
      }
      if (cur.unlockedHints?.[hintKey]) return true;

      const currentScore = typeof cur.team?.totalScore === "number"
        ? cur.team.totalScore
        : Math.max(0, computeAggregatedTaskScore(cur.taskScores || {}) - (cur.penalty || 0));

      if (currentScore < cost) {
        say(`INSUFFICIENT SCORE: You need at least ${cost} points to unlock an Intel Clue.`);
        sfx("err");
        return false;
      }

      sfx("clue");
      const nextPenalty = (cur.penalty || 0) + cost;
      const nextScore = Math.max(0, currentScore - cost);

      setS((p) => {
        const updatedTeam = p.team
          ? {
              ...p.team,
              totalScore: nextScore,
              score: nextScore,
              penalty: (p.team.penalty || 0) + cost,
              unlockedHints: {
                ...(p.team.unlockedHints || {}),
                [hintKey]: true,
              },
            }
          : p.team;

        return {
          ...p,
          penalty: nextPenalty,
          team: updatedTeam,
          unlockedHints: {
            ...(p.unlockedHints || {}),
            [hintKey]: true,
          },
        };
      });

      say(`CLASSIFIED INTEL DECRYPTED (-${cost} PTS)`);

      // Authoritatively persist Intel Clue unlock and score deduction to backend
      unlockHintOnServer(hintKey, cur.team?.id, cost)
        .then((res) => {
          if (res.success && typeof res.currentScore === "number") {
            setS((p) => ({
              ...p,
              team: p.team
                ? {
                    ...p.team,
                    totalScore: res.currentScore,
                    score: res.currentScore,
                  }
                : p.team,
            }));
          } else if (!res.success && res.error === "INSUFFICIENT_BALANCE") {
            setS((p) => {
              const restoredTeam = p.team
                ? {
                    ...p.team,
                    totalScore: (p.team.totalScore ?? 0) + cost,
                    score: (p.team.score ?? 0) + cost,
                    penalty: Math.max(0, (p.team.penalty || 0) - cost),
                    unlockedHints: {
                      ...(p.team.unlockedHints || {}),
                      [hintKey]: false,
                    },
                  }
                : p.team;

              return {
                ...p,
                penalty: Math.max(0, p.penalty - cost),
                team: restoredTeam,
                unlockedHints: {
                  ...(p.unlockedHints || {}),
                  [hintKey]: false,
                },
              };
            });
            say(`INSUFFICIENT SCORE: You need at least ${cost} points to unlock an Intel Clue.`);
            sfx("err");
          }
        })
        .catch(() => {});

      return true;
    },
    [say]
  );

  const isHintUnlocked = useCallback(
    (hintKey: string): boolean => {
      return !!s.unlockedHints?.[hintKey];
    },
    [s.unlockedHints]
  );

  const spendPoints = useCallback(
    (points: number, reason?: string) => {
      if (sRef.current.isPaused) {
        say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        sfx("err");
        return;
      }
      setS((p) => ({
        ...p,
        penalty: p.penalty + points,
      }));
      if (reason) {
        say(`${reason} (-${points} PTS)`);
      }
    },
    [say]
  );

  const value: Ctx = useMemo(
    () => ({
      s,
      hydrated,
      sessionVerified,
      session,
      score: typeof s.team?.totalScore === "number"
        ? s.team.totalScore
        : Math.max(0, computeAggregatedTaskScore(s.taskScores || {}) - (s.penalty || 0)),
      isPaused: Boolean(s.isPaused),
      isLocationLocked: Boolean(
        sabotage &&
        sabotage.kind === "LOCK" &&
        sabotage.until &&
        sabotage.until > Date.now()
      ),
      sabotage,
      cutscene,
      endCutscene,
      start,
      loginSession,
      loginPlayer,
      register,
      logout,
      submit,
      submitTask,
      castPower,
      powerUnlocked,
      stageComplete,
      advance,
      jump,
      grantItem,
      findMark,
      insertKey,
      clearSabotage,
      reset,
      soundOn,
      setSoundOn,
      toast,
      say,
      active,
      setActive,
      travelTo,
      viewMode: s.viewMode,
      setViewMode,
      introSeen: s.introSeen,
      setIntroSeen,
      vecnaCutscene: s.vecnaCutscene,
      triggerVecnaArrival,
      dismissVecnaCutscene,
      solveRadiometerPin,
      submitRadiometerCode,
      radiometerPinCount,
      activeChapterId,
      setActiveChapterId: setGuardedActiveChapterId,
      chapterModalOpen,
      setChapterModalOpen,
      unlockedHints: s.unlockedHints || {},
      unlockHint,
      isHintUnlocked,
      spendPoints,
      modal,
      showAlert,
      showConfirm,
      closeModal,
    }),
    [
      s,
      hydrated,
      sessionVerified,
      session,
      sabotage,
      cutscene,
      endCutscene,
      start,
      loginSession,
      loginPlayer,
      register,
      logout,
      submit,
      submitTask,
      castPower,
      powerUnlocked,
      stageComplete,
      advance,
      jump,
      grantItem,
      findMark,
      insertKey,
      clearSabotage,
      reset,
      soundOn,
      setSoundOn,
      toast,
      say,
      active,
      travelTo,
      setViewMode,
      setIntroSeen,
      triggerVecnaArrival,
      dismissVecnaCutscene,
      solveRadiometerPin,
      submitRadiometerCode,
      radiometerPinCount,
      activeChapterId,
      setGuardedActiveChapterId,
      chapterModalOpen,
      unlockHint,
      isHintUnlocked,
      spendPoints,
      modal,
      showAlert,
      showConfirm,
      closeModal,
    ]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
