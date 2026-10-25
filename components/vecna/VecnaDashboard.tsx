"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CONFIG,
  getStoredSession,
  clearSession,
  AuthSession,
} from "@/lib/config";
import {
  publish,
  subscribe,
  RealtimeMessage,
  getSocket,
  authenticateSocket,
  presence,
} from "@/lib/realtime";
import { API_BASE } from "@/lib/api";
import CinematicBackground from "@/components/CinematicBackground";
import { sfx } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";

import VecnaTriggerPanel, { TriggerAction, TargetSquadItem } from "@/components/vecna/VecnaTriggerPanel";
import VecnaMessagePanel from "@/components/vecna/VecnaMessagePanel";
import VecnaStoryDialog from "@/components/vecna/VecnaStoryDialog";
import VecnaChaptersBoard from "@/components/vecna/VecnaChaptersBoard";
import QuestionTypeRenderer from "@/components/chapters/QuestionTypeRenderer";
import VecnaSummaryView from "@/components/vecna/VecnaSummaryView";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

interface VecnaTrial {
  id: number;
  shortName: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  points: number;
  powersGranted: string;
  codeSnippet?: string;
}

const VECNA_TRIALS: VecnaTrial[] = [
  {
    id: 1,
    shortName: "STAGE 1",
    title: "STAGE 1: QUIZ-TYPE QUESTIONS",
    subtitle: "HAWKINS CHRONICLES // SERIES LORE & LOGIC",
    category: "SERIES KNOWLEDGE",
    description:
      "Multiple-choice questions testing lore, logic, and timeline understanding across the Hawkins dimension.",
    points: 200,
    powersGranted: "GLITCH · CRT FREAKOUT",
  },
  {
    id: 2,
    shortName: "STAGE 2",
    title: "STAGE 2: CONNECTION QUESTIONS",
    subtitle: "RELATIONSHIP CORRELATION // MATCH CLUES & ARTIFACTS",
    category: "RELATIONSHIP MAPPING",
    description:
      "Match related clues, characters, locations, objects, or concepts by identifying their deep relationships.",
    points: 200,
    powersGranted: "SIGNAL JAM · RADIO DISTORTION",
  },
  {
    id: 3,
    shortName: "STAGE 3",
    title: "STAGE 3: REARRANGE QUESTIONS",
    subtitle: "SEQUENCE RESTORATION // SCRAMBLED WORDS, STATEMENTS & CODE",
    category: "SEQUENCE RESTORATION",
    description:
      "Arrange scrambled words, sentences, codes, steps, or clues in the correct order to reveal hidden intelligence.",
    points: 200,
    powersGranted: "DISTORT · CLUE OBFUSCATION",
  },
  {
    id: 4,
    shortName: "STAGE 4",
    title: "STAGE 4: CASE STUDY QUESTIONS",
    subtitle: "INVESTIGATIVE FORENSICS // SITUATION ANALYSIS",
    category: "INVESTIGATIVE ANALYSIS",
    description:
      "Analyze a given situation report or set of clues, examine evidence logs, and draw forensic conclusions.",
    points: 200,
    powersGranted: "LOCK · ACCESS DENIED",
  },
  {
    id: 5,
    shortName: "STAGE 5",
    title: "STAGE 5: RADIO TRANSMISSION",
    subtitle: "SIGNAL INTELLIGENCE // MORSE, BINARY & CIPHERS",
    category: "SIGNAL DECODING",
    description:
      "Decode hidden messages or signals using methods such as Morse code, binary sequences, or audio ciphers.",
    points: 200,
    powersGranted: "FREQUENCY SHIFT · STATIC SURGE",
  },
  {
    id: 6,
    shortName: "STAGE 6",
    title: "STAGE 6: LAB-TYPE TASKS",
    subtitle: "HAWKINS LAB EXPERIMENTAL TERMINAL // SYSTEM CHALLENGES",
    category: "TECHNICAL EXPERIMENTS",
    description:
      "Interactive technical challenges involving logical sequences, system operations, bug fixing, and data analysis.",
    points: 200,
    powersGranted: "GRANDFATHER CLOCK · GATE MASTERY",
  },
];

export default function VecnaDashboard() {
  const router = useRouter();
  const { logout } = useGame();
  const [session, setSession] = useState<AuthSession | null>(null);

  // Default Landing View is "board" (Horizontal Evidence Board)
  const [viewMode, setViewMode] = useState<"board" | "stage">("board");
  const [showStageSummary, setShowStageSummary] = useState<boolean>(false);

  // Active Trial & Question Selection
  const [activeTrialId, setActiveTrialId] = useState<number>(1);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [hoveredTrialId, setHoveredTrialId] = useState<number | null>(null);

  // Selected Answers: keyed by `${trialId}-${qIdx}`
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // Solved status: keyed by `${trialId}-${qIdx}`
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, boolean>>({});
  // Failed status: keyed by `${trialId}-${qIdx}` (wrong answers, permanently locked with 0 pts)
  const [failedQuestions, setFailedQuestions] = useState<Record<string, boolean>>({});
  const [attemptedQuestions, setAttemptedQuestions] = useState<Record<string, boolean>>({});
  const [unlockedStages, setUnlockedStages] = useState<number[]>([1]);

  // Google Meet Style Side Drawer State: "none" | "powers" | "dispatch"
  const [activeSideDrawer, setActiveSideDrawer] = useState<"none" | "powers" | "dispatch">("none");
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync tournament stage access switchboard with Admin
  useEffect(() => {
    let active = true;
    const fetchStages = async () => {
      try {
        const res = await fetch("/api/admin/stages");
        const data = await res.json();
        if (active && data.success && Array.isArray(data.unlockedStages)) {
          setUnlockedStages(data.unlockedStages);
        }
      } catch {}
    };
    fetchStages();

    const sock = getSocket();
    const handleStageUnlocked = (d: any) => {
      if (d?.unlockedStages && Array.isArray(d.unlockedStages)) {
        setUnlockedStages(d.unlockedStages);
      }
    };
    sock?.on("stage:unlocked", handleStageUnlocked);

    const unsubRealtime = subscribe((m: any) => {
      if (m.type === "stage_unlocked" && Array.isArray(m.unlockedStages)) {
        setUnlockedStages(m.unlockedStages);
      }
      if (m.type === "event_reset") {
        setUnlockedStages([1]);
        setSolvedQuestions({});
        setFailedQuestions({});
        setAttemptedQuestions({});
        setSelectedAnswers({});
        setServerVecnaScore(0);
        setActiveTrialId(1);
        setActiveQuestionIdx(0);
        setShowStageSummary(false);
        setViewMode("board");
      }
    });

    return () => {
      active = false;
      sock?.off("stage:unlocked", handleStageUnlocked);
      unsubRealtime();
    };
  }, []);

  const [trialResults, setTrialResults] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(typeof document !== "undefined" && document.fullscreenElement));
    handleFs();
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  const toggleFullscreen = () => {
    sfx("click");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Target team state
  const [selectedLocation, setSelectedLocation] = useState("town");
  const [selectedTeamName, setSelectedTeamName] = useState<string | undefined>("Null Pointers");
  const [availableSquads, setAvailableSquads] = useState<TargetSquadItem[]>([]);

  // Fetch online squads for targeting in Powers & Team Dispatch
  const refreshSquads = useCallback(async () => {
    try {
      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const res = await fetch(`${API_BASE}/vecna/tactical-map`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.stages)) {
        const uniqueMap = new Map<string, TargetSquadItem>();
        data.stages.forEach((stg: any) => {
          if (Array.isArray(stg.teams)) {
            stg.teams.forEach((t: any) => {
              if (t.id && !uniqueMap.has(t.id)) {
                uniqueMap.set(t.id, {
                  id: t.id,
                  name: t.name,
                  leader: t.leader,
                  status: t.status || "Online",
                });
              }
            });
          }
        });
        const squads = Array.from(uniqueMap.values());
        setAvailableSquads(squads);
        if (squads.length > 0 && (!selectedTeamName || !squads.some((s) => s.name === selectedTeamName))) {
          setSelectedTeamName(squads[0].name);
        }
      }
    } catch (err) {
      // Ignore transient fetch errors
    }
  }, [selectedTeamName]);

  useEffect(() => {
    refreshSquads();
    const interval = setInterval(refreshSquads, 10000);
    const unsub = subscribe((msg: any) => {
      if (
        msg.type === "presence" ||
        msg.type === "presence:update" ||
        msg.type === "vecna:tactical_update" ||
        msg.type === "event_state" ||
        msg.type === "SCORE_UPDATE"
      ) {
        refreshSquads();
      }
    });
    const sock = getSocket();
    const onUpdate = () => refreshSquads();
    sock?.on("presence:update", onUpdate);
    sock?.on("vecna:tactical_update", onUpdate);
    sock?.on("event:state_changed", onUpdate);

    return () => {
      clearInterval(interval);
      unsub();
      sock?.off("presence:update", onUpdate);
      sock?.off("vecna:tactical_update", onUpdate);
      sock?.off("event:state_changed", onUpdate);
    };
  }, [refreshSquads]);

  useEffect(() => {
    const s = getStoredSession();
    if (!s || s.role !== "VECNA") {
      router.push("/");
      return;
    }
    setSession(s);
    if ((s as any).token) {
      authenticateSocket((s as any).token);
    }
  }, [router]);

  // Keep Vecna authenticated and online
  useEffect(() => {
    if (!session || session.role !== "VECNA") return;
    const token = (session as any)?.token;
    if (token) {
      authenticateSocket(token);
    }

    const interval = setInterval(() => {
      const currentToken = (session as any)?.token;
      if (currentToken) {
        authenticateSocket(currentToken);
      }
      presence({
        team: session.teamName || "Vecna",
        teamId: session.teamId || "VECNA-001",
        stage: "final" as any,
        score: 0,
        timeLeft: 0,
        solved: 0,
        ts: Date.now(),
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [session]);

  const handleLogout = useCallback(async () => {
    sfx("click");
    try {
      getSocket()?.emit("team:logout");
    } catch {}
    try {
      if (logout) {
        await logout();
      }
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try {
      const stored = getStoredSession();
      const token = (stored as any)?.token;
      if (token) {
        await fetch(`${API_BASE}/vecna/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch {}
    clearSession();
    if (typeof document !== "undefined") {
      document.cookie = "hawkins_session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "hawkins_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("hawkins_admin_token");
      localStorage.removeItem("hawkins_admin_leader");
      localStorage.removeItem("hawkins-protocol:session");
      sessionStorage.clear();
      window.location.href = "/";
    }
  }, [logout]);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === "force_logout" || (msg.type === "event_state" && msg.status === "ended")) {
        handleLogout();
      }
    });
    return () => unsub();
  }, [handleLogout]);

  // Eagerly fetch progress for ALL 6 trials on mount
  useEffect(() => {
    let isCancelled = false;
    const fetchAllProgress = async () => {
      try {
        const stored = getStoredSession();
        const token = stored && (stored as any).token ? (stored as any).token : "";
        if (!token) return;
        const trialIds = [1, 2, 3, 4, 5, 6];
        const responses = await Promise.all(
          trialIds.map((tId) =>
            fetch(`${API_BASE}/vecna/trials/${tId}/progress`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );

        if (isCancelled) return;

        responses.forEach((data, i) => {
          const tId = trialIds[i];
          if (data && data.success && data.progress) {
            Object.entries(data.progress).forEach(([idxStr, att]: [string, any]) => {
              const idx = parseInt(idxStr, 10);
              if (att.status === "solved") {
                setSolvedQuestions((prev) => ({ ...prev, [`${tId}-${idx}`]: true }));
              } else if (att.status === "failed") {
                setFailedQuestions((prev) => ({ ...prev, [`${tId}-${idx}`]: true }));
              } else if (att.status === "attempted") {
                setAttemptedQuestions((prev) => ({ ...prev, [`${tId}-${idx}`]: true }));
              }
              if (att.chosenAnswer) {
                setSelectedAnswers((prev) => ({ ...prev, [`${tId}-${idx}`]: att.chosenAnswer }));
              }
            });
            if (tId === activeTrialId && typeof data.maxUnlockedIdx === "number") {
              setActiveQuestionIdx((curr) => Math.min(curr, data.maxUnlockedIdx));
            }
          }
        });
      } catch {}
    };
    fetchAllProgress();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Fetch progress when activeTrialId changes
  useEffect(() => {
    let isCancelled = false;
    const fetchProgress = async () => {
      try {
        const stored = getStoredSession();
        const token = stored && (stored as any).token ? (stored as any).token : "";
        const res = await fetch(`${API_BASE}/vecna/trials/${activeTrialId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.success && data.progress) {
            Object.entries(data.progress).forEach(([idxStr, att]: [string, any]) => {
              const idx = parseInt(idxStr, 10);
              if (att.status === "solved") {
                setSolvedQuestions((prev) => ({ ...prev, [`${activeTrialId}-${idx}`]: true }));
              } else if (att.status === "failed") {
                setFailedQuestions((prev) => ({ ...prev, [`${activeTrialId}-${idx}`]: true }));
              } else if (att.status === "attempted") {
                setAttemptedQuestions((prev) => ({ ...prev, [`${activeTrialId}-${idx}`]: true }));
              }
              if (att.chosenAnswer) {
                setSelectedAnswers((prev) => ({ ...prev, [`${activeTrialId}-${idx}`]: att.chosenAnswer }));
              }
            });
            if (typeof data.maxUnlockedIdx === "number") {
              setActiveQuestionIdx((curr) => Math.min(curr, data.maxUnlockedIdx));
            }
          }
        }
      } catch {}
    };
    fetchProgress();
    return () => {
      isCancelled = true;
    };
  }, [activeTrialId]);

  const handleSelectOption = (trialId: number, qIdx: number, optionId: string) => {
    if (isLevelAttempted(trialId, qIdx)) return;
    sfx("click");
    setSelectedAnswers((prev) => ({
      ...prev,
      [`${trialId}-${qIdx}`]: optionId,
    }));
    setErrorMessage(null);
  };

  const currentTrial = VECNA_TRIALS.find((t) => t.id === activeTrialId) || VECNA_TRIALS[0];
  const currentQuestions = STAGE_QUIZ_CONFIGS[currentTrial.id]?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const totalQuestionsForTrial = currentQuestions.length;

  const isTrialCleared = useCallback(
    (trialId: number) => {
      const qs = STAGE_QUIZ_CONFIGS[trialId]?.questions || [];
      return (
        qs.length > 0 &&
        qs.every((_, idx) => !!solvedQuestions[`${trialId}-${idx}`] || !!failedQuestions[`${trialId}-${idx}`])
      );
    },
    [solvedQuestions, failedQuestions]
  );

  const isTrialUnlocked = useCallback(
    (trialId: number) => {
      const adminUnlocked = unlockedStages.includes(trialId);
      if (trialId === 1) return adminUnlocked;
      const priorCleared = isTrialCleared(trialId - 1);
      return priorCleared && adminUnlocked;
    },
    [unlockedStages, isTrialCleared]
  );

  const isLevelAttempted = (trialId: number, idx: number) =>
    Boolean(solvedQuestions[`${trialId}-${idx}`] || failedQuestions[`${trialId}-${idx}`]);

  const isLevelUnlocked = (trialId: number, idx: number) => {
    if (idx === 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!isLevelAttempted(trialId, i)) return false;
    }
    return true;
  };

  const isQuestionSolved = !!solvedQuestions[`${currentTrial.id}-${activeQuestionIdx}`];
  const isQuestionFailed = !!failedQuestions[`${currentTrial.id}-${activeQuestionIdx}`];
  const isQuestionAttempted = isQuestionSolved || isQuestionFailed;

  const [spentPowerPoints, setSpentPowerPoints] = useState(0);
  const [serverVecnaScore, setServerVecnaScore] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchMe = async () => {
      try {
        const stored = getStoredSession();
        const token = stored && (stored as any).token ? (stored as any).token : "";
        if (!token) return;
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data && data.team && typeof data.team.score === "number") {
            setServerVecnaScore(data.team.score);
          }
        }
      } catch {}
    };
    fetchMe();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScore = (data: any) => {
      const targetTeamId = (data?.teamId || data?.team || "").toString().trim().toUpperCase();
      const myTeamId = (session?.teamId || "").toString().trim().toUpperCase();
      const isForVecna =
        !targetTeamId ||
        targetTeamId === myTeamId ||
        targetTeamId === "VECNA" ||
        targetTeamId === "VECNA-001" ||
        targetTeamId === "VECNA-1" ||
        data?.role === "VECNA";

      if (!isForVecna) return;

      const s =
        typeof data?.score === "number"
          ? data.score
          : typeof data?.totalScore === "number"
          ? data.totalScore
          : typeof data?.newScore === "number"
          ? data.newScore
          : null;
      if (s !== null) {
        setServerVecnaScore(s);
      }
    };
    const unsub = subscribe((data: any) => {
      if (data && (data.type === "SCORE_UPDATE" || data.type === "score:update")) {
        handleScore(data);
      }
    });
    const sock = getSocket();
    sock?.on("score:update", handleScore);
    return () => {
      unsub();
      sock?.off("score:update", handleScore);
    };
  }, [session?.teamId]);

  const totalVecnaSolved = Object.values(solvedQuestions).filter(Boolean).length;
  const computedVecnaScore = Math.max(0, totalVecnaSolved * 20 - spentPowerPoints);
  const effectiveVecnaScore = serverVecnaScore !== null ? serverVecnaScore : computedVecnaScore;
  const currentTrialSolvedCount = currentQuestions.filter((_, idx) => !!solvedQuestions[`${currentTrial.id}-${idx}`]).length;
  const currentTrialScore = currentTrialSolvedCount * 10;

  const handleVerifyCurrentQuestion = async () => {
    if (!currentQuestion || isQuestionAttempted || isSubmitting) return;

    let chosen = selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`];
    if (!chosen) {
      setErrorMessage("COMPLETE THE QUESTION BEFORE SUBMITTING.");
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const res = await fetch(`${API_BASE}/vecna/trials/${currentTrial.id}/questions/${activeQuestionIdx}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer: chosen }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "SEQUENTIAL_PROGRESSION_REQUIRED") {
          setErrorMessage(data.message || "COMPLETE PRECEDING LEVEL FIRST.");
          sfx("err");
          setTimeout(() => setErrorMessage(null), 3000);
          return;
        }
        if (data.error === "EVENT_PAUSED" || data.error === "SUBMISSIONS_CLOSED") {
          setErrorMessage(data.message || "TOURNAMENT ACTIONS SUSPENDED.");
          sfx("err");
          setTimeout(() => setErrorMessage(null), 3000);
          return;
        }
        setErrorMessage(data.message || `TRANSMISSION FAILED (${res.status}): Central server rejected override telemetry.`);
        sfx("err");
        setTimeout(() => setErrorMessage(null), 3500);
        return;
      }

      const isCorrect = Boolean(data.isCorrect);

      if (isCorrect) {
        sfx("boom");
        setSolvedQuestions((prev) => ({
          ...prev,
          [`${currentTrial.id}-${activeQuestionIdx}`]: true,
        }));
        if (typeof data.totalScore === "number" || typeof data.newScore === "number") {
          setServerVecnaScore(data.totalScore ?? data.newScore);
        }
        const awarded = typeof data.pointsAwarded === "number" ? data.pointsAwarded : 20;
        setSuccessMessage(`LEVEL ${activeQuestionIdx + 1} OVERRIDE CONFIRMED (+${awarded} PTS)`);
        setErrorMessage(null);

        const willBeAllCleared = currentQuestions.every((_, idx) =>
          idx === activeQuestionIdx ? true : !!solvedQuestions[`${currentTrial.id}-${idx}`]
        );
        if (willBeAllCleared) {
          setTrialResults((prev) => ({ ...prev, [currentTrial.id]: true }));
          publish({
            type: "sabotage",
            kind: "MESSAGE",
            target: "all",
            message: `VECNA PROTOCOL: TRIAL ${currentTrial.id} FULLY BREACHED. POWER UNLOCKED: ${currentTrial.powersGranted}`,
            ts: Date.now(),
          });
        }

        if (activeQuestionIdx < totalQuestionsForTrial - 1) {
          setTimeout(() => {
            setActiveQuestionIdx((i) => i + 1);
            setSuccessMessage(null);
          }, 650);
        } else {
          setTimeout(() => {
            setSuccessMessage(null);
            setShowStageSummary(true);
          }, 1800);
        }
      } else {
        if (!data.isLocked && data.status === "attempted") {
          sfx("err");
          setAttemptedQuestions((prev) => ({
            ...prev,
            [`${currentTrial.id}-${activeQuestionIdx}`]: true,
          }));
          setErrorMessage(`INCORRECT VECTOR · ATTEMPT 1 FAILED (RETRY FOR +10 PTS)`);
          setSuccessMessage(null);
          return;
        }

        sfx("err");
        setFailedQuestions((prev) => ({
          ...prev,
          [`${currentTrial.id}-${activeQuestionIdx}`]: true,
        }));
        setErrorMessage(`INCORRECT VECTOR · LEVEL ${activeQuestionIdx + 1} RECORDED (0 PTS)`);
        setSuccessMessage(null);
        if (activeQuestionIdx < totalQuestionsForTrial - 1) {
          setTimeout(() => {
            setActiveQuestionIdx((i) => i + 1);
            setErrorMessage(null);
          }, 650);
        } else {
          setTimeout(() => {
            setErrorMessage(null);
            setShowStageSummary(true);
          }, 1800);
        }
      }
    } catch (e) {
      setErrorMessage("VECNA TELEMETRY DISCONNECTED: Central server unreachable. Solutions cannot be evaluated offline.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevLevel = () => {
    sfx("click");
    if (activeQuestionIdx > 0) {
      setActiveQuestionIdx((i) => i - 1);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleNextLevel = () => {
    sfx("click");
    if (!isLevelAttempted(currentTrial.id, activeQuestionIdx)) {
      setErrorMessage("COMPLETE CURRENT LEVEL BEFORE ADVANCING.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }
    if (activeQuestionIdx < totalQuestionsForTrial - 1) {
      setActiveQuestionIdx((i) => i + 1);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleSendMessage = async (target: "all" | string, message: string): Promise<boolean> => {
    sfx("boom");

    const matchedSquad = availableSquads.find(
      (s) => s.name.toLowerCase() === target.toLowerCase() || s.id.toLowerCase() === target.toLowerCase()
    );
    const targetTeamId = target === "all" ? undefined : (matchedSquad ? matchedSquad.id : target);
    const targetTeamName = target === "all" ? undefined : (matchedSquad ? matchedSquad.name : target);

    try {
      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const clientRequestId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch(`${API_BASE}/vecna/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sourceType: "custom",
          recipientScope: target === "all" ? "all_teams" : "selected_teams",
          selectedTeamIds: target === "all" ? undefined : [targetTeamId || target],
          bodyText: message.slice(0, 150),
          clientRequestId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "DISPATCH_LIMIT_REACHED" || res.status === 429) {
          return false;
        }
        throw new Error(data.message || data.error || "Failed to dispatch message.");
      }

      publish({
        type: "sabotage",
        kind: "MESSAGE",
        target,
        targetTeamId,
        targetTeamName,
        message,
        duration: 10,
        durationSec: 10,
        ts: Date.now(),
      });

      setActiveSideDrawer("none");
      return true;
    } catch (err: any) {
      console.error("[VECNA DISPATCH ERROR]", err);
      throw err;
    }
  };

  const handleExecuteTrigger = async (action: TriggerAction) => {
    sfx("boom");
    const kind = action.id;
    const targetTeams = action.targetTeams && action.targetTeams.length > 0 ? action.targetTeams : [];
    const clientRequestId = `power-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const res = await fetch(`${API_BASE}/vecna/powers/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          power: kind,
          targetTeams: targetTeams.length > 0 ? targetTeams : undefined,
          targetScope: targetTeams.length > 0 ? "selected" : "all",
          location: selectedLocation,
          clientRequestId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.message || data.error || "Failed to unleash power.");
        sfx("err");
        setTimeout(() => setErrorMessage(null), 3500);
        return;
      }

      if (typeof data.newScore === "number") {
        setServerVecnaScore(data.newScore);
      }

      setSuccessMessage(data.message || `POWER ACTIVATED: ${action.label}`);
      sfx("boom");
      setTimeout(() => setSuccessMessage(null), 3000);

      const duration = kind === "LOCK" ? 120 : 80;
      publish({
        type: "sabotage",
        kind,
        target: selectedLocation,
        teams: targetTeams,
        duration,
        ts: Date.now(),
      });

      setActiveSideDrawer("none");
    } catch (err: any) {
      console.error("[EXECUTE TRIGGER ERROR]", err);
      setErrorMessage(err?.message || "Network error while unleashing power.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        maxHeight: "100vh",
        overflowY: viewMode === "stage" ? "auto" : "hidden",
        overflowX: "hidden",
        background: "#080204",
        color: "#ffebee",
        fontFamily: '"Share Tech Mono", monospace',
        display: "flex",
        flexDirection: "column",
        scrollbarWidth: "thin",
        scrollbarColor: "#ff2d3a #120407",
      }}
    >
      {viewMode === "stage" && (
        <CinematicBackground
          src="/upsidedown-bg.jpg"
          particles="embers"
          vignette="heavy"
          overlayOpacity={0.82}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────
          TOP VECNA HEADER & CONTROLS
          ─────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          background: "rgba(10, 2, 5, 0.95)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Left: VECNA Brand + SCORE */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "inline-block",
                borderTop: "2px solid #ff2d3a",
                borderBottom: "2px solid #ff2d3a",
                padding: "1px 4px",
                lineHeight: "1",
                boxShadow: "0 0 10px rgba(255, 45, 58, 0.45)",
              }}
            >
              <span
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", Georgia, serif',
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#ff2d3a",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textShadow: "0 0 12px rgba(255, 45, 58, 0.8)",
                  display: "inline-block",
                }}
              >
                VECNA
              </span>
            </div>
            <div
              style={{
                fontSize: "8.5px",
                letterSpacing: "0.26em",
                color: "#ff3a48",
                fontFamily: '"Share Tech Mono", monospace',
                textTransform: "uppercase",
                marginTop: "3px",
                paddingLeft: "2px",
              }}
            >
              CONTROL PROTOCOL
            </div>
          </div>

          {/* Score Counter Module */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.75)",
              border: "1px solid rgba(255, 45, 58, 0.35)",
              padding: "3px 14px",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                fontSize: "8.5px",
                fontFamily: '"Share Tech Mono", monospace',
                letterSpacing: "0.22em",
                color: "rgba(255, 120, 120, 0.8)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontFamily: "var(--font-term), 'VT323', monospace",
                fontSize: "19px",
                color: "#ff2d3a",
                letterSpacing: "0.15em",
                lineHeight: 1,
                marginTop: "2px",
                textShadow: "0 0 10px rgba(255, 45, 58, 0.8)",
              }}
            >
              {effectiveVecnaScore}
            </div>
          </div>
        </div>

        {/* Center / Navigation Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {viewMode === "stage" && (
            <button
              id="vecna-return-to-map-btn"
              type="button"
              onClick={() => {
                sfx("click");
                setViewMode("board");
              }}
              style={{
                background: "rgba(255, 45, 58, 0.2)",
                color: "#ffffff",
                border: "1.5px solid #ff2d3a",
                padding: "8px 18px",
                borderRadius: "3px",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "0.14em",
                cursor: "pointer",
                boxShadow: "0 0 14px rgba(255, 45, 58, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <span>◀</span>
              <span>RETURN TO SECTOR MAP</span>
            </button>
          )}

          {/* Google Meet Style Side Option: VECNA POWERS */}
          <button
            id="vecna-powers-btn"
            type="button"
            onClick={() => {
              sfx("click");
              refreshSquads();
              setActiveSideDrawer((prev) => (prev === "powers" ? "none" : "powers"));
            }}
            title="Open Vecna Powers Side Drawer"
            style={{
              background: activeSideDrawer === "powers" ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: activeSideDrawer === "powers" ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: activeSideDrawer === "powers" ? "0 0 15px rgba(255, 45, 58, 0.55)" : "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <span>VECNA POWERS</span>
          </button>

          {/* Google Meet Style Side Option: TEAM DISPATCH */}
          <button
            id="vecna-dispatch-btn"
            type="button"
            onClick={() => {
              sfx("click");
              refreshSquads();
              setActiveSideDrawer((prev) => (prev === "dispatch" ? "none" : "dispatch"));
            }}
            title="Open Team Dispatch Side Drawer"
            style={{
              background: activeSideDrawer === "dispatch" ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: activeSideDrawer === "dispatch" ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: activeSideDrawer === "dispatch" ? "0 0 15px rgba(255, 45, 58, 0.55)" : "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <span>TEAM DISPATCH</span>
          </button>
        </div>

        {/* Right: Fullscreen + Exit Vecna */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            id="vecna-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
            style={{
              background: isFullscreen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isFullscreen ? "#000000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 14px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.15em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "12px" }}>{isFullscreen ? "✖" : "⛶"}</span>
            <span>{isFullscreen ? "EXIT FS" : "FULLSCREEN"}</span>
          </button>

          <button
            id="vecna-logout-btn"
            type="button"
            onClick={handleLogout}
            style={{
              background: "rgba(18, 4, 7, 0.85)",
              color: "#ff3a48",
              border: "1.5px solid #ff2d3a",
              padding: "8px 14px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.15em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: "#ff2d3a" }}>◆</span>
            <span>EXIT VECNA</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          MAIN VIEW CONTAINER: BOARD (DEFAULT) OR STAGE QUESTION SOLVER
          ─────────────────────────────────────────────────────────────────── */}
      {viewMode === "board" ? (
        <div style={{ flex: 1, position: "relative", width: "100%", height: "calc(100vh - 65px)", overflow: "hidden" }}>
          <VecnaChaptersBoard
            activeTrialId={activeTrialId}
            solvedQuestions={solvedQuestions}
            failedQuestions={failedQuestions}
            unlockedStages={unlockedStages}
            isStageUnlocked={isTrialUnlocked}
            isStageCleared={isTrialCleared}
            effectiveScore={effectiveVecnaScore}
            onSelectTrial={(trialId) => {
              setActiveTrialId(trialId);
              setActiveQuestionIdx(0);
              setViewMode("stage");
              const cleared = isTrialCleared(trialId);
              setShowStageSummary(cleared);
              if (!cleared) {
                setIsStoryDialogOpen(true);
              }
            }}
            onEnterTrial={(trialId) => {
              setActiveTrialId(trialId);
              setActiveQuestionIdx(0);
              setViewMode("stage");
              const cleared = isTrialCleared(trialId);
              setShowStageSummary(cleared);
              if (!cleared) {
                setIsStoryDialogOpen(true);
              }
            }}
          />
        </div>
      ) : showStageSummary ? (
        <VecnaSummaryView
          trial={currentTrial}
          questions={currentQuestions}
          solvedQuestions={solvedQuestions}
          failedQuestions={failedQuestions}
          attemptedQuestions={attemptedQuestions}
          selectedAnswers={selectedAnswers}
          onBackToBoard={() => {
            setViewMode("board");
            setShowStageSummary(false);
          }}
          onReviewQuestions={() => {
            setShowStageSummary(false);
          }}
        />
      ) : (
        <main
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "min(1600px, 98vw)",
            width: "100%",
            margin: "0 auto",
            padding: "20px 16px 140px 16px",
            boxSizing: "border-box",
            flex: 1,
          }}
        >
          {/* Minimal Sector Header & Level Pager Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* Active Sector Tag + Lore Replay Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  sfx("click");
                  setViewMode("board");
                }}
                style={{
                  background: "rgba(20, 4, 8, 0.9)",
                  border: "1.5px solid #ff2d3a",
                  borderRadius: "3px",
                  padding: "8px 16px",
                  color: "#ff8a80",
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "12px",
                  fontWeight: "bold",
                  letterSpacing: "0.14em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
                }}
              >
                <span style={{ color: "#ff2d3a" }}>◈</span>
                <span>TRIAL {currentTrial.id} // {currentTrial.shortName}</span>
                <span style={{ fontSize: "10px", opacity: 0.8 }}>[◀ RETURN TO MAP]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sfx("click");
                  setIsStoryDialogOpen(true);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 45, 58, 0.4)",
                  borderRadius: "3px",
                  padding: "8px 14px",
                  color: "rgba(255, 200, 200, 0.8)",
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "11.5px",
                  letterSpacing: "0.12em",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>👁</span>
                <span>VECNA TRANSMISSION</span>
              </button>

              {isTrialCleared(currentTrial.id) && (
                <button
                  type="button"
                  onClick={() => {
                    sfx("boom");
                    setShowStageSummary(true);
                  }}
                  style={{
                    background: "#b71c1c",
                    border: "1.5px solid #ff3b30",
                    borderRadius: "3px",
                    padding: "8px 16px",
                    color: "#ffffff",
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 0 14px rgba(255, 45, 58, 0.5)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d32f2f")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#b71c1c")}
                >
                  <span style={{ color: "#ffffff" }}>◈</span>
                  <span>SUBMIT STAGE DOSSIER</span>
                </button>
              )}
            </div>

            {/* Quick Level Navigator (Levels 1 to 10) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "11.5px",
                letterSpacing: "0.12em",
              }}
            >
              <span style={{ color: "rgba(255, 180, 180, 0.7)", marginRight: "4px" }}>LEVEL:</span>
              {Array.from({ length: 10 }).map((_, idx) => {
                const isCurr = activeQuestionIdx === idx;
                const isSolved = !!solvedQuestions[`${currentTrial.id}-${idx}`];
                const isFailed = !!failedQuestions[`${currentTrial.id}-${idx}`];
                const isUnlocked = isLevelUnlocked(currentTrial.id, idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (!isUnlocked) {
                        sfx("err");
                        setErrorMessage(`LEVEL ${idx + 1} LOCKED · COMPLETE PRECEDING LEVEL FIRST`);
                        setTimeout(() => setErrorMessage(null), 2500);
                        return;
                      }
                      sfx("click");
                      setActiveQuestionIdx(idx);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={{
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "3px",
                      border: isCurr
                        ? "1.5px solid #ff2d3a"
                        : isSolved
                        ? "1px solid #81c784"
                        : isFailed
                        ? "1px solid #e57373"
                        : isUnlocked
                        ? "1px solid rgba(255, 45, 58, 0.35)"
                        : "1px solid rgba(255, 45, 58, 0.15)",
                      background: isCurr
                        ? "#ff2d3a"
                        : isSolved
                        ? "rgba(129, 199, 132, 0.15)"
                        : isFailed
                        ? "rgba(229, 115, 115, 0.15)"
                        : isUnlocked
                        ? "rgba(15, 3, 6, 0.7)"
                        : "rgba(10, 2, 4, 0.4)",
                      color: isCurr ? "#000000" : isSolved ? "#81c784" : isFailed ? "#e57373" : isUnlocked ? "#ffb3ba" : "rgba(255, 179, 186, 0.3)",
                      fontWeight: isCurr ? 900 : "normal",
                      fontSize: "11px",
                      cursor: isUnlocked ? "pointer" : "not-allowed",
                      boxShadow: isCurr ? "0 0 10px #ff2d3a" : "none",
                      opacity: isUnlocked ? 1 : 0.45,
                      transition: "all 0.12s ease",
                    }}
                    title={!isUnlocked ? "Locked until preceding question is completed" : `Level ${idx + 1}`}
                  >
                    {isSolved ? "✔" : isFailed ? "✕" : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── MAIN CONSOLE CARD ─── */}
          <motion.div
            key={`${currentTrial.id}-${activeQuestionIdx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: "#ece5d8",
              color: "#1a1614",
              border: "2px solid #3d352e",
              borderRadius: "4px",
              padding: "24px 28px",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 0, 0, 0.08)",
              position: "relative",
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(220, 210, 195, 0.25) 100%)",
            }}
          >
            {/* Top Red Classification Stripe */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "2px solid #b71c1c",
                paddingBottom: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    background: "#b71c1c",
                    color: "#ffffff",
                    fontSize: "10.5px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    padding: "3px 8px",
                    borderRadius: "2px",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  CLASSIFIED // LEVEL {activeQuestionIdx + 1} OF {totalQuestionsForTrial}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: '"Share Tech Mono", monospace',
                    letterSpacing: "0.14em",
                    color: "#5d4037",
                    fontWeight: "bold",
                  }}
                >
                  VECNA TELEMETRY NODE · STAGE {currentTrial.id}
                </span>
              </div>

              {/* Solved / Locked Status Tag */}
              <div>
                {isQuestionSolved ? (
                  <span
                    style={{
                      background: "rgba(46, 125, 50, 0.15)",
                      border: "1.5px solid #2e7d32",
                      color: "#1b5e20",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                    }}
                  >
                    ✔ SYSTEM OVERRIDDEN (+20 PTS)
                  </span>
                ) : isQuestionFailed ? (
                  <span
                    style={{
                      background: "rgba(183, 28, 28, 0.15)",
                      border: "1.5px solid #b71c1c",
                      color: "#b71c1c",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                    }}
                  >
                    ✕ VECTOR COMPROMISED (0 PTS)
                  </span>
                ) : (
                  <span
                    style={{
                      background: "rgba(230, 81, 0, 0.15)",
                      border: "1.5px solid #e65100",
                      color: "#bf360c",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      letterSpacing: "0.14em",
                    }}
                  >
                    ● READY FOR BREACH
                  </span>
                )}
              </div>
            </div>

            {/* Dossier Header Info */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "11.5px",
                  letterSpacing: "0.18em",
                  color: "#8d6e63",
                  fontFamily: '"Share Tech Mono", monospace',
                  textTransform: "uppercase",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {currentQuestion?.subHeader || currentTrial.subtitle}
              </div>
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", Georgia, serif',
                  fontSize: "22px",
                  fontWeight: 900,
                  color: "#1a120b",
                  letterSpacing: "0.06em",
                  lineHeight: "1.3",
                }}
              >
                {currentQuestion?.question}
              </h2>
            </div>

            {/* Specialized Question Type Renderer */}
            <div style={{ marginBottom: "20px" }}>
              <QuestionTypeRenderer
                question={currentQuestion}
                selectedAnswer={selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]}
                onSelectOption={(optId) => handleSelectOption(currentTrial.id, activeQuestionIdx, optId)}
                disabled={isQuestionAttempted || isSubmitting}
                isVecnaMode={true}
              />
            </div>

            {/* Status / Feedback Alerts */}
            {errorMessage && (
              <div
                style={{
                  background: "rgba(183, 28, 28, 0.12)",
                  border: "1.5px solid #b71c1c",
                  color: "#b71c1c",
                  padding: "10px 14px",
                  borderRadius: "3px",
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "12px",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>⚠</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: "rgba(46, 125, 50, 0.12)",
                  border: "1.5px solid #2e7d32",
                  color: "#1b5e20",
                  padding: "10px 14px",
                  borderRadius: "3px",
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "12px",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✔</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1.5px solid rgba(61, 53, 46, 0.3)",
                paddingTop: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  disabled={activeQuestionIdx === 0}
                  onClick={handlePrevLevel}
                  style={{
                    background: activeQuestionIdx === 0 ? "rgba(0,0,0,0.06)" : "#2c221e",
                    color: activeQuestionIdx === 0 ? "rgba(0,0,0,0.3)" : "#ffffff",
                    border: "1px solid #2c221e",
                    padding: "8px 16px",
                    borderRadius: "3px",
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: "11.5px",
                    fontWeight: "bold",
                    letterSpacing: "0.12em",
                    cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ◀ PREV LEVEL
                </button>

                <button
                  type="button"
                  disabled={
                    activeQuestionIdx >= totalQuestionsForTrial - 1 ||
                    !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                  }
                  onClick={handleNextLevel}
                  style={{
                    background:
                      activeQuestionIdx >= totalQuestionsForTrial - 1 ||
                      !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                        ? "rgba(0,0,0,0.06)"
                        : "#2c221e",
                    color:
                      activeQuestionIdx >= totalQuestionsForTrial - 1 ||
                      !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                        ? "rgba(0,0,0,0.3)"
                        : "#ffffff",
                    border: "1px solid #2c221e",
                    padding: "8px 16px",
                    borderRadius: "3px",
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: "11.5px",
                    fontWeight: "bold",
                    letterSpacing: "0.12em",
                    cursor:
                      activeQuestionIdx >= totalQuestionsForTrial - 1 ||
                      !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  NEXT LEVEL ▶
                </button>
              </div>

              {/* Submit / Verification Button */}
              <div>
                {!isQuestionAttempted ? (
                  <button
                    type="button"
                    disabled={isSubmitting || !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]}
                    onClick={handleVerifyCurrentQuestion}
                    style={{
                      background:
                        isSubmitting || !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]
                          ? "rgba(183, 28, 28, 0.4)"
                          : "#b71c1c",
                      color: "#ffffff",
                      border: "1.5px solid #b71c1c",
                      padding: "10px 26px",
                      borderRadius: "3px",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "13px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      cursor:
                        isSubmitting || !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]
                          ? "not-allowed"
                          : "pointer",
                      boxShadow: "0 0 16px rgba(183, 28, 28, 0.45)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{isSubmitting ? "CHECKING ANSWER..." : "CHECK ANSWER"}</span>
                  </button>
                ) : isQuestionSolved ? (
                  <div
                    style={{
                      background: "#2e7d32",
                      color: "#ffffff",
                      padding: "8px 18px",
                      borderRadius: "3px",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                    }}
                  >
                    ✔ LEVEL SOLVED (+20 PTS RECORDED)
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#b71c1c",
                      color: "#ffffff",
                      padding: "8px 18px",
                      borderRadius: "3px",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                    }}
                  >
                    ✕ LEVEL RECORDED (0 PTS)
                  </div>
                )}

                {isTrialCleared(currentTrial.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx("boom");
                      setShowStageSummary(true);
                    }}
                    style={{
                      background: "#b71c1c",
                      color: "#ffffff",
                      border: "1.5px solid #ff3b30",
                      padding: "9px 22px",
                      borderRadius: "3px",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.14em",
                      cursor: "pointer",
                      boxShadow: "0 0 16px rgba(255, 59, 48, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      textTransform: "uppercase",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#d32f2f")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#b71c1c")}
                  >
                    <span>◈</span>
                    <span>SUBMIT STAGE DOSSIER · VIEW SUMMARY</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          GOOGLE MEET STYLE SLIDE-OVER DRAWER (POWERS & TEAM DISPATCH)
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeSideDrawer !== "none" && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 998,
                background: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(5px)",
                WebkitBackdropFilter: "blur(5px)",
              }}
              onClick={() => setActiveSideDrawer("none")}
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              style={{
                position: "fixed",
                top: 0,
                bottom: 0,
                right: 0,
                width: "min(460px, 94vw)",
                zIndex: 999,
                background: "#0c0408",
                borderLeft: "2px solid #ff2d3a",
                boxShadow: "-12px 0 45px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 45, 58, 0.2)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Top Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "rgba(20, 5, 10, 0.95)",
                  borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#ff2d3a",
                      fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                      fontSize: 17,
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                    }}
                  >
                    <span>
                      {activeSideDrawer === "powers"
                        ? "VECNA POWERS & SABOTAGE"
                        : "TEAM DISPATCH TRANSMISSION"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255, 200, 200, 0.65)",
                      fontFamily: '"Share Tech Mono", monospace',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {activeSideDrawer === "powers"
                      ? "Deploy hive-mind disruptions against Hawkins squads. Spend points earned from solving sectors to trigger Lockouts, Cipher Corruptions, Signal Jams, or Freezes."
                      : "Broadcast telepathic transmissions and psychological terror messages directly into the terminals of specific Hawkins squads or all squads simultaneously."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSideDrawer("none")}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "4px 10px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body with Panels */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 18px",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#ff2d3a #120407",
                }}
              >
                {activeSideDrawer === "powers" ? (
                  <VecnaTriggerPanel
                    selectedLocation={selectedLocation}
                    onSelectLocation={(locId) => setSelectedLocation(locId)}
                    onTriggerAction={handleExecuteTrigger}
                    currentVecnaScore={effectiveVecnaScore}
                    availableSquads={availableSquads}
                  />
                ) : (
                  <VecnaMessagePanel
                    onSendMessage={handleSendMessage}
                    selectedTeamName={selectedTeamName}
                    availableSquads={availableSquads}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Vecna Story Dialogue */}
      <AnimatePresence>
        {isStoryDialogOpen && (
          <VecnaStoryDialog
            trialId={currentTrial.id}
            trialTitle={currentTrial.title}
            trialShortName={currentTrial.shortName}
            onComplete={() => setIsStoryDialogOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
