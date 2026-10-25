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
  const [seenBriefings, setSeenBriefings] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("vecna_seen_briefings");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const openBriefingOnce = useCallback((trialId: number) => {
    setSeenBriefings((prev) => {
      if (!prev.includes(trialId)) {
        setIsStoryDialogOpen(true);
        const updated = [...prev, trialId];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("vecna_seen_briefings", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      }
      return prev;
    });
  }, []);

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
        setSeenBriefings([]);
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("vecna_seen_briefings");
          } catch {}
        }
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

  const isLevelUnlocked = (_trialId: number, _idx: number) => true;

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
        overflow: "hidden",
        background: "#080204",
        color: "#ffebee",
        fontFamily: '"Share Tech Mono", monospace',
        display: "flex",
        flexDirection: "column",
        scrollbarWidth: "thin",
        scrollbarColor: "#ff2d3a #120407",
      }}
    >
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

        {/* Right: Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            <span>LOGOUT</span>
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
                openBriefingOnce(trialId);
              }
            }}
            onEnterTrial={(trialId) => {
              setActiveTrialId(trialId);
              setActiveQuestionIdx(0);
              setViewMode("stage");
              const cleared = isTrialCleared(trialId);
              setShowStageSummary(cleared);
              if (!cleared) {
                openBriefingOnce(trialId);
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
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            scrollbarWidth: "thin",
            padding: 0,
            margin: 0,
            background: "#f4eedf",
            backgroundImage:
              "radial-gradient(#e4dac5 1px, transparent 1px), radial-gradient(#dcd0ba 1px, transparent 1px)",
            backgroundSize: "20px 20px, 40px 40px",
            backgroundPosition: "0 0, 20px 20px",
            fontFamily: "'Courier New', Courier, monospace",
            color: "#231e1a",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* THE PHYSICAL INCIDENT REPORT PAPER CONTAINER */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              width: "100%",
              maxWidth: "100%",
              minHeight: "100%",
              margin: 0,
              background: "transparent",
              border: "none",
              borderRadius: 0,
              boxShadow: "none",
              padding: "clamp(10px, 1.6vw, 16px) clamp(14px, 3vw, 36px) 20px",
              position: "relative",
              boxSizing: "border-box",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* BOX TOP CONTROLS: CASE BRIEFING & CROSS EXIT BUTTON */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: "1.5px dashed #c9bda4",
                gap: 12,
                position: "relative",
                zIndex: 10,
              }}
            >
              {/* Manila Case Briefing Button inside the box */}
              <button
                type="button"
                onClick={() => {
                  sfx("click");
                  setIsStoryDialogOpen(true);
                }}
                style={{
                  padding: "7px 14px",
                  background: "#d4a759",
                  color: "#1a0f05",
                  border: "1.5px solid #946f29",
                  borderRadius: 4,
                  fontFamily: "'Benguiat Bold', serif",
                  fontWeight: 800,
                  fontSize: 11.5,
                  letterSpacing: ".12em",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5ba6a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#d4a759";
                }}
                title="Open Sector Dossier & Briefing"
              >
                <span>CASE BRIEFING</span>
              </button>

              {/* Cross Exit Button inside the box */}
              <button
                type="button"
                onClick={() => {
                  sfx("click");
                  setViewMode("board");
                }}
                style={{
                  width: 32,
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#24130d",
                  color: "#ff945c",
                  border: "1.5px solid #733c20",
                  borderRadius: 4,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                  transition: "all 0.15s ease",
                }}
                title="Return to Chapter Map"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#8f1218";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#24130d";
                  e.currentTarget.style.color = "#ff945c";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </button>
            </div>

            {/* Coffee Mug Ring Stain Overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                right: 32,
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "4px solid rgba(139, 90, 43, 0.12)",
                boxShadow: "inset 0 0 10px rgba(139, 90, 43, 0.08)",
                pointerEvents: "none",
                transform: "rotate(24deg)",
              }}
            />

            {/* MULTI-QUESTION PAGING INDEX TABS (DOCKET ITEMS) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
                padding: "6px 12px",
                background: "#e4dac5",
                border: "1px solid #c9bda4",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  paddingBottom: 4,
                  scrollbarWidth: "thin",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#544638",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    marginRight: 6,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  DOCKET ITEMS:
                </span>
                {Array.from({ length: totalQuestionsForTrial }).map((_, idx) => {
                  const isCurrent = idx === activeQuestionIdx;
                  const isSolved = !!solvedQuestions[`${currentTrial.id}-${idx}`];
                  const isFailed = !!failedQuestions[`${currentTrial.id}-${idx}`];
                  const isAttempt1Wrong = !!attemptedQuestions[`${currentTrial.id}-${idx}`] && !isSolved && !isFailed;
                  const hasAnswer = Boolean(selectedAnswers[`${currentTrial.id}-${idx}`]);
                  const isUnlocked = isLevelUnlocked(currentTrial.id, idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        sfx("click");
                        setActiveQuestionIdx(idx);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      style={{
                        padding: "4px 10px",
                        background: isCurrent
                          ? "#b81d24"
                          : isSolved
                          ? "#234d31"
                          : isFailed
                          ? "#3d1414"
                          : isAttempt1Wrong
                          ? "#4d3314"
                          : hasAnswer
                          ? "#2e2118"
                          : "#ded6c4",
                        color: isCurrent || isSolved || isFailed || isAttempt1Wrong || hasAnswer ? "#fff" : "#2a221a",
                        border: isCurrent
                          ? "1.5px solid #8f1218"
                          : isSolved
                          ? "1px solid #3d8053"
                          : isFailed
                          ? "1px solid #8f2d24"
                          : isAttempt1Wrong
                          ? "1px solid #d97706"
                          : hasAnswer
                          ? "1px solid #573a2e"
                          : "1px solid #b5a48b",
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: ".08em",
                        cursor: "pointer",
                        opacity: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        transition: "all 0.12s ease",
                      }}
                      title={`Item ${idx + 1}`}
                    >
                      <span>
                        ITEM {idx + 1}
                        {isSolved ? " [+20]" : isFailed ? " [0P]" : isAttempt1Wrong ? " [10P]" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FORMAL INCIDENT DOCKET HEADER */}
            <div style={{ marginBottom: 10, borderBottom: "1.5px solid #c9bda4", paddingBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".14em", color: "#8d6e63", textTransform: "uppercase" }}>
                  FORM HPD-0{currentTrial.id}-83 // VECNA CONTROL PROTOCOL
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "#544638" }}>
                  HAWKINS NATIONAL LABORATORY · STAGE {currentTrial.id}
                </span>
              </div>
            </div>

            {/* SPECIALIZED QUESTION FORMATION */}
            <div key={`${currentTrial.id}-${activeQuestionIdx}`} style={{ marginBottom: 12 }}>
              <QuestionTypeRenderer
                key={`${currentTrial.id}-${activeQuestionIdx}`}
                question={currentQuestion}
                selectedAnswer={selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]}
                onSelectOption={(optId) => handleSelectOption(currentTrial.id, activeQuestionIdx, optId)}
                disabled={isQuestionSolved || isQuestionFailed || isSubmitting}
                isVecnaMode={false}
                questionIndex={activeQuestionIdx}
                isVerified={isQuestionSolved}
                isLocked={isQuestionFailed}
              />

              {/* IN-QUESTION SUBMIT & CHECK ACTION BAR */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  padding: "8px 14px",
                  background: isQuestionSolved
                    ? "rgba(38, 166, 91, 0.12)"
                    : isQuestionFailed
                    ? "rgba(184, 29, 36, 0.15)"
                    : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                    ? "rgba(217, 119, 6, 0.14)"
                    : "rgba(0, 0, 0, 0.04)",
                  border: isQuestionSolved
                    ? "1.5px solid #27ae60"
                    : isQuestionFailed
                    ? "1.5px solid #b81d24"
                    : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                    ? "1.5px solid #d97706"
                    : "1.5px dashed #c9bda4",
                  borderRadius: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: ".08em",
                      color: isQuestionSolved
                        ? "#1b7a41"
                        : isQuestionFailed
                        ? "#9e151b"
                        : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                        ? "#b45309"
                        : "#544638",
                    }}
                  >
                    {isQuestionSolved
                      ? "VERIFIED [+20 PTS RECORDED]"
                      : isQuestionFailed
                      ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                      : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                      ? "INCORRECT · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)"
                      : selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]
                      ? "ANSWER RECORDED [20 PTS]"
                      : "SELECT ANSWER [20 PTS]"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyCurrentQuestion}
                  disabled={isSubmitting || !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`] || isQuestionSolved || isQuestionFailed}
                  style={{
                    padding: "8px 20px",
                    background: isSubmitting
                      ? "#332219"
                      : isQuestionSolved
                      ? "#234d31"
                      : isQuestionFailed
                      ? "#2c1515"
                      : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                      ? "#5c330a"
                      : "#24130d",
                    color: "#ffffff",
                    border: isQuestionSolved
                      ? "1.5px solid #3d8053"
                      : isQuestionFailed
                      ? "1.5px solid #7d2a2a"
                      : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                      ? "1.5px solid #d97706"
                      : "1.5px solid #8f2d24",
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: ".12em",
                    cursor: isSubmitting || !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`] || isQuestionSolved || isQuestionFailed ? "not-allowed" : "pointer",
                    opacity: !selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`] || isQuestionSolved || isQuestionFailed ? 0.6 : 1,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting
                    ? "CHECKING..."
                    : isQuestionSolved
                    ? "VERIFIED"
                    : isQuestionFailed
                    ? "LOCKED"
                    : attemptedQuestions[`${currentTrial.id}-${activeQuestionIdx}`] && !isQuestionSolved && !isQuestionFailed
                    ? "CHECK ANSWER (10 PTS - RETRY)"
                    : "CHECK ANSWER (20 PTS)"}
                </button>
              </div>
            </div>

            {/* FEEDBACK STATUS ALERTS */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "rgba(184, 29, 36, 0.12)",
                    border: "2px dashed #b81d24",
                    color: "#9e151b",
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>[ALERT]</span>
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "rgba(38, 166, 91, 0.12)",
                    border: "2px dashed #27ae60",
                    color: "#1b7a41",
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>[VERIFIED]</span>
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FOOTER NAVIGATION & SUBMIT BUTTONS */}
            <div
              style={{
                borderTop: "2px solid #2a221a",
                paddingTop: 12,
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  disabled={activeQuestionIdx === 0}
                  onClick={handlePrevLevel}
                  style={{
                    padding: "10px 16px",
                    background: activeQuestionIdx === 0 ? "transparent" : "#e4dac4",
                    color: activeQuestionIdx === 0 ? "#a89d8d" : "#2a221a",
                    border: "1px solid #b5a48b",
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: 12,
                    letterSpacing: ".1em",
                    cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                    fontWeight: 800,
                  }}
                >
                  PREVIOUS
                </button>

                {activeQuestionIdx < totalQuestionsForTrial - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextLevel}
                    style={{
                      padding: "10px 18px",
                      background: "#2e2118",
                      color: "#fff",
                      border: "1px solid #573a2e",
                      borderRadius: 3,
                      fontFamily: "'Benguiat Bold', serif",
                      fontSize: 12,
                      letterSpacing: ".1em",
                      cursor: "pointer",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    NEXT
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sfx("boom");
                      setShowStageSummary(true);
                    }}
                    style={{
                      padding: "10px 18px",
                      background: "#b81d24",
                      color: "#fff",
                      border: "1px solid #8f1218",
                      borderRadius: 3,
                      fontFamily: "'Benguiat Bold', serif",
                      fontSize: 12,
                      letterSpacing: ".1em",
                      cursor: "pointer",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    CHAPTER SUMMARY
                  </button>
                )}
              </div>

              {isTrialCleared(currentTrial.id) && (
                <button
                  type="button"
                  onClick={() => {
                    sfx("boom");
                    setShowStageSummary(true);
                  }}
                  style={{
                    padding: "10px 24px",
                    background: "#b81d24",
                    color: "#fff",
                    border: "1.5px solid #8f1218",
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                    fontWeight: 900,
                    fontSize: "clamp(13px, 1.4vw, 15px)",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(184, 29, 36, 0.5), inset 0 0 10px rgba(0,0,0,0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#941319")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#b81d24")}
                >
                  <span>SUBMIT STAGE DOSSIER</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
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
