"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Category, ITEMS, STAGES, STAGE_ORDER, StageId, TOTAL_TIME } from "./stages";
import { FINAL_CODE, RADIOMETER_PINS } from "./radiometer";
import { STORY_TASKS, LocationId, StoryTask } from "./tasks";
import { CONFIG, AuthSession, getStoredSession, saveSession, clearSession } from "./config";
import { usePathname } from "next/navigation";
import { setDroneTheme, sfx } from "./audio";
import { subscribe, presence, RealtimeMessage, StoryEventType } from "./realtime";

export type SabKind = "CORRUPT" | "TIME_FREEZE" | "LOCK" | "DISTORT" | "SIGNAL_JAM" | "WATCH" | "MESSAGE" | "GLITCH";

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
  powers: PowerId[];
  powerCharges: Record<PowerId, number>;
  completedTasks: string[];
  clues: Record<string, string>;
  inventory: string[];
  timeRemaining: number;
  vecnaStatus: "INACTIVE" | "ACTIVE";
  unlocked: Record<string, boolean>;
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
};

const KEY = CONFIG.STORAGE_KEY;

export const stageIndex = (s: StageId) => STAGE_ORDER.indexOf(s);

export const totalScore = (b: Breakdown, penalty = 0) =>
  Math.max(0, b.tech + b.puzzle + b.clue + b.speed + b.story + b.teamwork - penalty);

interface Ctx {
  s: GameState;
  hydrated: boolean;
  session: AuthSession | null;
  score: number;
  sabotage: Sabotage | null;
  cutscene: StageId | null;
  endCutscene: () => void;
  start: () => void;
  loginPlayer: (team: { id: string; teamName: string; leaderName: string }) => void;
  register: (name: string, members: string[]) => void;
  logout: () => void;
  submit: (challengeId: string, text: string) => boolean;
  submitTask: (taskId: string, points: number, answerText: string) => void;
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
  submitRadiometerCode: (code: string) => boolean;
  radiometerPinCount: number;
  activeChapterId: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  setActiveChapterId: (id: 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  chapterModalOpen: boolean;
  setChapterModalOpen: (open: boolean) => void;
  unlockedHints: Record<string, boolean>;
  unlockHint: (hintKey: string, cost?: number) => boolean;
  isHintUnlocked: (hintKey: string) => boolean;
  spendPoints: (points: number, reason?: string) => void;
}

const GameCtx = createContext<Ctx | null>(null);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hawkins_active_chapter", String(activeChapterId));
      } catch {}
    }
  }, [activeChapterId]);

  const sRef = useRef(s);
  sRef.current = s;

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
        setS((p) => ({
          ...p,
          phase: "play",
          team: {
            id: currentSession.teamId || "T01",
            name: currentSession.teamName,
            leaderName: currentSession.leaderName,
            members: [currentSession.leaderName],
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
          },
        }));
      } else {
        setS((p) => ({ ...p, phase: "login" }));
      }
    } catch {}
    setHydrated(true);
  }, [isGame]);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated || !isGame) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, hydrated, isGame]);

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

  // Clock
  useEffect(() => {
    if (!isGame || s.phase !== "play" || s.stage === "ending") return;
    const t = setInterval(() => {
      setS((p) => (p.timeLeft <= 0 ? p : { ...p, timeLeft: p.timeLeft - 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [s.phase, s.stage, isGame]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  }, []);

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

      if ("target" in m && m.target && m.target !== "all") {
        if (!mine || m.target.trim().toLowerCase() !== mine.trim().toLowerCase()) {
          return;
        }
      }

      if (m.type === "sabotage") {
        if (cur.stage === "ending") return;
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
    });

    const beat = setInterval(() => {
      const cur = sRef.current;
      if (cur.phase !== "play" || !cur.team) return;
      presence({
        team: cur.team.name,
        teamId: cur.team.id,
        location: cur.location,
        viewMode: cur.viewMode,
        storyProgress: cur.storyProgress,
        stage: cur.stage,
        score: totalScore(cur.breakdown, cur.penalty),
        timeLeft: cur.timeLeft,
        solved: Object.keys(cur.solved).length,
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
      MESSAGE: 15,
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

  const loginPlayer = useCallback((team: { id: string; teamName: string; leaderName: string }) => {
    const sessionData: AuthSession = {
      role: "PLAYER",
      teamName: team.teamName,
      leaderName: team.leaderName,
      teamId: team.id,
    };
    saveSession(sessionData);
    setSession(sessionData);

    const teamObj: TeamInfo = {
      id: team.id,
      name: team.teamName,
      leaderName: team.leaderName,
      members: [team.leaderName],
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
      introSeen: false, // ensures cinematic typewriter intro runs on fresh login
    }));
    setCutscene("hawkins");
    sfx("boom");
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
    if (ITEMS[id]) say(`ITEM ACQUIRED — ${ITEMS[id].name.toUpperCase()}`);
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
  const submitTask = useCallback((taskId: string, points: number, answerText: string) => {
    sfx("ok");
    setS((p) => {
      if (p.completedTasks.includes(taskId)) return p;
      const taskDef = STORY_TASKS[taskId];
      const category = taskDef?.category || "puzzle";
      const speedBonus = Math.round(points * 0.2 * (p.timeLeft / TOTAL_TIME));
      const nextCompleted = [...p.completedTasks, taskId];
      const nextClues = { ...p.clues };

      if (taskDef?.storyClue) {
        nextClues[taskId] = taskDef.storyClue;
      }

      // Automatically unlock locations according to story milestones
      const nextUnlocked = { ...p.unlocked };
      if (taskId === "town-1") {
        nextUnlocked.policeStation = true;
        nextUnlocked.radioTower = true;
        nextUnlocked.byersHouse = true;
      }
      if (taskId === "lab-terminal") {
        nextUnlocked.forest = true;
      }
      if (taskId === "forest-marks") {
        nextUnlocked.gate = true;
      }
      if (taskId === "gate-unlock") {
        nextUnlocked.upsidedown = true;
        nextUnlocked.mind = true;
      }

      // Check if reward item granted
      const nextInv = [...p.inventory];
      if (taskDef?.rewardItem && !nextInv.includes(taskDef.rewardItem)) {
        nextInv.push(taskDef.rewardItem);
      }

      const progressGain = Math.round(90 / Object.keys(STORY_TASKS).length);
      const newProgress = Math.min(100, p.storyProgress + progressGain);

      return {
        ...p,
        completedTasks: nextCompleted,
        clues: nextClues,
        inventory: nextInv,
        unlocked: nextUnlocked,
        storyProgress: newProgress,
        solved: { ...p.solved, [taskId]: true },
        breakdown: {
          ...p.breakdown,
          [category]: p.breakdown[category] + points,
        },
      };
    });
  }, []);

  const submit = useCallback((cid: string, text: string) => {
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
      if (!powerUnlocked(p)) return null;
      if (sabotage && sabotage.kind === "SIGNAL_JAM") {
        sfx("err");
        say("SIGNAL JAMMED — POWERS OFFLINE");
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

  const submitRadiometerCode = useCallback((code: string): boolean => {
    if (code.trim() !== FINAL_CODE) {
      sfx("err");
      return false;
    }
    setS((p) => ({
      ...p,
      radiometer: { ...p.radiometer, codeSolved: true },
      unlocked: { ...p.unlocked, lab: true },
      breakdown: { ...p.breakdown, puzzle: p.breakdown.puzzle + 200 },
    }));
    sfx("power");
    return true;
  }, []);

  const reset = useCallback(() => {
    setS({ ...INITIAL });
    setSabotage(null);
    setCutscene(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    reset();
    setS({ ...INITIAL, phase: "login", introSeen: false });
    sfx("click");
  }, [reset]);

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
    (hintKey: string, cost = 10): boolean => {
      const cur = sRef.current;
      if (cur.unlockedHints?.[hintKey]) return true;

      sfx("clue");
      setS((p) => ({
        ...p,
        penalty: p.penalty + cost,
        unlockedHints: {
          ...(p.unlockedHints || {}),
          [hintKey]: true,
        },
      }));
      say(`CLASSIFIED INTEL DECRYPTED (-${cost} PTS)`);
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
      session,
      score: totalScore(s.breakdown, s.penalty),
      sabotage,
      cutscene,
      endCutscene,
      start,
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
      setActiveChapterId,
      chapterModalOpen,
      setChapterModalOpen,
      unlockedHints: s.unlockedHints || {},
      unlockHint,
      isHintUnlocked,
      spendPoints,
    }),
    [
      s,
      hydrated,
      session,
      sabotage,
      cutscene,
      endCutscene,
      start,
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
      chapterModalOpen,
      unlockHint,
      isHintUnlocked,
      spendPoints,
    ]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
