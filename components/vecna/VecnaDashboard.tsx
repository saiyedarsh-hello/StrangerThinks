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

import VecnaTacticalMap, { MapTeamInfo } from "@/components/vecna/VecnaTacticalMap";
import VecnaTriggerPanel, { TriggerAction, TargetSquadItem } from "@/components/vecna/VecnaTriggerPanel";
import VecnaMessagePanel from "@/components/vecna/VecnaMessagePanel";
import VecnaStoryDialog from "@/components/vecna/VecnaStoryDialog";
import VecnaChaptersModal from "@/components/vecna/VecnaChaptersModal";
import QuestionTypeRenderer from "@/components/chapters/QuestionTypeRenderer";
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
    powersGranted: "GRANDFATHER CLOCK · GATE MASTERY",
  },
];

export default function VecnaDashboard() {
  const router = useRouter();
  const { logout } = useGame();
  const [session, setSession] = useState<AuthSession | null>(null);

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
  const [trialResults, setTrialResults] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isPowersOpen, setIsPowersOpen] = useState(false);
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Selected team state for targeting
  const [selectedLocation, setSelectedLocation] = useState("town");
  const [selectedTeamName, setSelectedTeamName] = useState<string | undefined>("Null Pointers");

  // Live Tactical Map state for 6 canonical tournament stages
  const [tacticalMapData, setTacticalMapData] = useState<Record<string, MapTeamInfo[]>>({
    town: [],
    police: [],
    byers: [],
    lab: [],
    radioTower: [],
    gate: [],
  });
  const [availableSquads, setAvailableSquads] = useState<TargetSquadItem[]>([]);

  const refreshTacticalMap = useCallback(async () => {
    try {
      const stored = getStoredSession();
      const token = stored && (stored as any).token ? (stored as any).token : "";
      const res = await fetch(`${API_BASE}/vecna/tactical-map`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.stages)) {
        const nextMap: Record<string, MapTeamInfo[]> = {
          town: [],
          police: [],
          byers: [],
          lab: [],
          radioTower: [],
          gate: [],
        };
        const uniqueMap = new Map<string, TargetSquadItem>();
        data.stages.forEach((stg: any) => {
          const locKey =
            stg.slug ||
            (stg.id === 1
              ? "town"
              : stg.id === 2
              ? "police"
              : stg.id === 3
              ? "byers"
              : stg.id === 4
              ? "lab"
              : stg.id === 5
              ? "radioTower"
              : "gate");
          const teamList: MapTeamInfo[] = Array.isArray(stg.teams)
            ? stg.teams.map((t: any) => ({
                id: t.id,
                name: t.name,
                leader: t.leader,
                status: t.status || "Online",
              }))
            : [];
          nextMap[locKey] = teamList;
          teamList.forEach((t) => {
            if (!uniqueMap.has(t.id)) {
              uniqueMap.set(t.id, {
                id: t.id,
                name: t.name,
                leader: t.leader,
                status: t.status,
              });
            }
          });
        });
        const squads = Array.from(uniqueMap.values());
        setTacticalMapData(nextMap);
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
    refreshTacticalMap();
    const interval = setInterval(refreshTacticalMap, 10000);
    const unsub = subscribe((msg: any) => {
      if (
        msg.type === "presence" ||
        msg.type === "presence:update" ||
        msg.type === "vecna:tactical_update" ||
        msg.type === "event_state" ||
        msg.type === "SCORE_UPDATE"
      ) {
        refreshTacticalMap();
      }
    });
    const sock = getSocket();
    const onUpdate = () => refreshTacticalMap();
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
  }, [refreshTacticalMap]);

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

  // Keep Vecna authenticated and online in Security Mainframe
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

  // Realtime logout & event termination handler (Issue 4 & 5)
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === "force_logout" || (msg.type === "event_state" && msg.status === "ended")) {
        handleLogout();
      }
    });
    return () => unsub();
  }, [handleLogout]);

  // Eagerly fetch progress for ALL 6 trials on mount so totalVecnaSolved is accurate on reload
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

  // Fetch authoritative trial progress from backend to enforce sequential progression
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

  // Unified scoring rules: 1 question solved = +10 PTS across all questions
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
      // Guard against foreign squad score contamination (e.g. Hawkins teams playing concurrently)
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
  const computedVecnaScore = Math.max(0, totalVecnaSolved * 10 - spentPowerPoints);
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
      // Simulate authentic transmitting delay (~1.2s) matching Hawkins terminal
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
        // General server or auth failure: report cleanly without failing question
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
        setSuccessMessage(`LEVEL ${activeQuestionIdx + 1} OVERRIDE CONFIRMED (+10 PTS)`);
        setErrorMessage(null);

        // Check if all questions in this trial will be cleared
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

        // Auto advance to next question after brief delay
        if (activeQuestionIdx < totalQuestionsForTrial - 1) {
          setTimeout(() => {
            setActiveQuestionIdx((i) => i + 1);
            setSuccessMessage(null);
          }, 650);
        } else {
          setTimeout(() => setSuccessMessage(null), 2500);
        }
      } else {
        sfx("err");
        setFailedQuestions((prev) => ({
          ...prev,
          [`${currentTrial.id}-${activeQuestionIdx}`]: true,
        }));
        setErrorMessage(`INCORRECT VECTOR · LEVEL ${activeQuestionIdx + 1} RECORDED (0 PTS)`);
        setSuccessMessage(null);
        // Auto advance to next question on wrong answer
        if (activeQuestionIdx < totalQuestionsForTrial - 1) {
          setTimeout(() => {
            setActiveQuestionIdx((i) => i + 1);
            setErrorMessage(null);
          }, 650);
        } else {
          setTimeout(() => setErrorMessage(null), 3000);
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

      // Realtime publication for local preview and immediate delivery
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

      setIsMessageOpen(false);
      return true;
    } catch (err: any) {
      console.error("[VECNA DISPATCH ERROR]", err);
      throw err;
    }
  };

  const handleExecuteTrigger = async (action: TriggerAction) => {
    sfx("boom");
    const kind = action.id; // "LOCK" | "CORRUPT"
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

      // Local publication for immediate UI response
      const duration = kind === "LOCK" ? 120 : 80;
      publish({
        type: "sabotage",
        kind,
        target: selectedLocation,
        teams: targetTeams,
        duration,
        ts: Date.now(),
      });

      setIsPowersOpen(false);
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
        overflowY: "auto",
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
      <CinematicBackground
        src="/upsidedown-bg.jpg"
        particles="embers"
        vignette="heavy"
        overlayOpacity={0.82}
      />

      {/* ───────────────────────────────────────────────────────────────────
          TOP VECNA HEADER & ACTIONS (MATCHING SCREENSHOT)
          ─────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          background: "rgba(10, 2, 5, 0.94)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Left: VECNA Brand + CONTROL PROTOCOL + HIVE MIND ACTIVE */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
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
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                  fontSize: "26px",
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
                fontSize: "9px",
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
                fontSize: "9px",
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

        {/* Center: 3 Action Popups */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Tactical Map */}
          <button
            id="vecna-map-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              refreshTacticalMap();
              setIsMapOpen(true);
            }}
            style={{
              background: isMapOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isMapOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            TACTICAL MAP
          </button>

          {/* Team Dispatch */}
          <button
            id="vecna-message-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMessageOpen(true);
            }}
            style={{
              background: isMessageOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isMessageOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            TEAM DISPATCH
          </button>

          {/* Vecna Powers */}
          <button
            id="vecna-powers-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              refreshTacticalMap();
              setIsPowersOpen(true);
            }}
            style={{
              background: isPowersOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isPowersOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            VECNA POWERS
          </button>
        </div>

        {/* Right: Chapters Button + Exit Vecna Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            id="vecna-chapters-modal-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsChaptersModalOpen(true);
            }}
            style={{
              background: isChaptersModalOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isChaptersModalOpen ? "#000000" : "#ff8a80",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.15em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: isChaptersModalOpen ? "#000" : "#ff2d3a" }}>◈</span>
            <span>CHAPTERS</span>
          </button>

          <button
            id="vecna-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
            style={{
              background: isFullscreen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isFullscreen ? "#000000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
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
              padding: "8px 16px",
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
          MAIN AREA: 7 TRIAL TABS (WITH HOVER DROPDOWNS) & CONSOLE CARD
          ─────────────────────────────────────────────────────────────────── */}
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
                setIsChaptersModalOpen(true);
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
              <span style={{ fontSize: "9px", opacity: 0.65 }}>▼</span>
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

        {/* ─── MAIN CONSOLE CARD (OLD CLASSIC PAPER DOSSIER — VECNA THEMED) ─── */}
        <motion.div
          key={`${currentTrial.id}-${activeQuestionIdx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: "#f4eedf",
            backgroundImage: "radial-gradient(#e4dac2 1.2px, transparent 1.2px)",
            backgroundSize: "16px 16px",
            border: "2.5px solid #8f231e",
            borderRadius: "4px",
            boxShadow:
              "0 14px 44px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(140, 35, 30, 0.1)",
            padding: "26px 30px",
            color: "#1c140e",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* Card Header: Trial Index, Title, Subtitle & Bounty */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              borderBottom: "2px solid #8f231e",
              paddingBottom: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Left Header Section */}
            <div style={{ flex: 1, minWidth: "260px" }}>
              <h2
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                  fontSize: "clamp(22px, 2.4vw, 32px)",
                  fontWeight: 900,
                  color: "#8f231e",
                  letterSpacing: "0.05em",
                  margin: "2px 0 4px 0",
                  textTransform: "uppercase",
                }}
              >
                {currentTrial.title}
              </h2>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  color: "#544336",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {currentTrial.subtitle}
              </div>
            </div>

            {/* Right Header Section: Psychic Bounty */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                textAlign: "right",
                borderLeft: "2px solid #8f231e",
                paddingLeft: "20px",
                minWidth: "160px",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#8f231e",
                  letterSpacing: "0.15em",
                  fontWeight: 900,
                  fontFamily: "'Courier New', monospace",
                  textTransform: "uppercase",
                }}
              >
                PSYCHIC BOUNTY
              </div>
              <div
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", Georgia, serif',
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#8f231e",
                  marginTop: "1px",
                  letterSpacing: "0.04em",
                }}
              >
                +10 PTS
              </div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px",
                  color: "#47382d",
                  fontWeight: 700,
                  marginTop: "3px",
                  letterSpacing: "0.06em",
                }}
              >
                TRIAL: {currentTrialScore} PTS · TOTAL: {effectiveVecnaScore} PTS
              </div>
            </div>
          </div>

          {/* Specialized Interactive Question Formation */}
          <div style={{ marginBottom: "22px" }}>
            <QuestionTypeRenderer
              question={currentQuestion}
              selectedAnswer={selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]}
              onSelectOption={(optId) => handleSelectOption(currentTrial.id, activeQuestionIdx, optId)}
              isVecnaMode={true}
              questionIndex={activeQuestionIdx}
            />
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(184, 29, 36, 0.12)",
                  border: "1.5px solid #8f231e",
                  borderRadius: "3px",
                  color: "#8f231e",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "18px",
                }}
              >
                {errorMessage}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(46, 105, 48, 0.12)",
                  border: "1.5px solid #2e6930",
                  borderRadius: "3px",
                  color: "#2e6930",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "18px",
                }}
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action & Navigation Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              paddingTop: "16px",
              borderTop: "1.5px solid #c9bda4",
            }}
          >
            {/* Level Stepper Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePrevLevel}
                disabled={activeQuestionIdx === 0}
                style={{
                  padding: "8px 14px",
                  background: activeQuestionIdx === 0 ? "rgba(0,0,0,0.06)" : "#e6dcc6",
                  color: activeQuestionIdx === 0 ? "rgba(0,0,0,0.3)" : "#2a1e15",
                  border: "1.5px solid #9c8973",
                  borderRadius: "3px",
                  cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                ◀ PREV LVL
              </button>

              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'Courier New', monospace",
                  color: "#47382d",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                LVL <b>{activeQuestionIdx + 1}</b> / {totalQuestionsForTrial}
              </span>

              <button
                type="button"
                onClick={handleNextLevel}
                disabled={activeQuestionIdx === totalQuestionsForTrial - 1 || !isLevelAttempted(currentTrial.id, activeQuestionIdx)}
                style={{
                  padding: "8px 14px",
                  background:
                    activeQuestionIdx === totalQuestionsForTrial - 1 || !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                      ? "rgba(0,0,0,0.06)"
                      : "#e6dcc6",
                  color:
                    activeQuestionIdx === totalQuestionsForTrial - 1 || !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                      ? "rgba(0,0,0,0.3)"
                      : "#2a1e15",
                  border: "1.5px solid #9c8973",
                  borderRadius: "3px",
                  cursor:
                    activeQuestionIdx === totalQuestionsForTrial - 1 || !isLevelAttempted(currentTrial.id, activeQuestionIdx)
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
                title={!isLevelAttempted(currentTrial.id, activeQuestionIdx) ? "Complete current level before moving to next" : "Next level"}
              >
                NEXT LVL ▶
              </button>
            </div>

            {/* Right: Dedicated Submit Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                id="vecna-override-submit-btn"
                type="button"
                onClick={handleVerifyCurrentQuestion}
                disabled={isQuestionAttempted || isSubmitting}
                style={{
                  background: isQuestionSolved
                    ? "#2e6930"
                    : isQuestionFailed
                    ? "#66181b"
                    : isSubmitting
                    ? "#4a1215"
                    : "#8f231e",
                  color: "#ffffff",
                  fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                  fontSize: "13.5px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  padding: "12px 26px",
                  border: "none",
                  borderRadius: "3px",
                  cursor: isQuestionAttempted ? "default" : isSubmitting ? "wait" : "pointer",
                  boxShadow: isQuestionSolved
                    ? "0 3px 12px rgba(46, 105, 48, 0.45)"
                    : isQuestionFailed
                    ? "0 3px 12px rgba(102, 24, 27, 0.45)"
                    : "0 3px 12px rgba(143, 35, 30, 0.45)",
                  transition: "all 0.2s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  textTransform: "uppercase",
                  opacity: isQuestionAttempted ? 0.9 : isSubmitting ? 0.75 : 1,
                }}
              >
                {isQuestionSolved ? (
                  <span>✓ LEVEL CLEARED (+10 PTS)</span>
                ) : isQuestionFailed ? (
                  <span>✕ VECTOR RECORDED (0 PTS)</span>
                ) : isSubmitting ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙</span>
                    <span>TRANSMITTING OVERRIDE TELEMETRY...</span>
                  </>
                ) : (
                  <span>SUBMIT LEVEL (+10 PTS)</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 1: 🗺️ TACTICAL VECTOR MAP MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsMapOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(1200px, 96vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "20px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    HAWKINS TACTICAL VECTOR MAP
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    LIVE GPS TELEMETRY & ACTIVE RECON TEAM COORDINATES
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMapOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE MAP]
                </button>
              </div>

              <VecnaTacticalMap
                selectedLocationId={selectedLocation}
                onSelectLocation={(locId) => setSelectedLocation(locId)}
                teamsAtLocation={tacticalMapData}
                onInspectTeam={(tId) => {
                  setSelectedTeamName(tId);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 2: ✉️ TEAM DISPATCH & MESSAGING MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMessageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsMessageOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(640px, 94vw)",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    DISPATCH TRANSMISSION TO TEAMS
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    BROADCAST EERIE TELEPATHIC MESSAGES ACROSS GAMESPACE
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMessageOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE]
                </button>
              </div>

              <VecnaMessagePanel
                onSendMessage={handleSendMessage}
                selectedTeamName={selectedTeamName}
                availableSquads={availableSquads}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 3: ⚡ VECNA POWERS & SABOTAGE MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPowersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsPowersOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(780px, 94vw)",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    VECNA POWERS & SABOTAGE COCKPIT
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    CORRUPT, LOCK, JAM, GLITCH, DISTORT, OR FREEZE TARGET TEAMS
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPowersOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE]
                </button>
              </div>

              <VecnaTriggerPanel
                selectedLocation={selectedLocation}
                onSelectLocation={(locId) => setSelectedLocation(locId)}
                onTriggerAction={handleExecuteTrigger}
                currentVecnaScore={effectiveVecnaScore}
                availableSquads={availableSquads}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters Modal (Square mode with pictures) */}
      <VecnaChaptersModal
        isOpen={isChaptersModalOpen}
        activeTrialId={activeTrialId}
        solvedQuestions={solvedQuestions}
        onSelectTrial={(trialId) => {
          setActiveTrialId(trialId);
          setActiveQuestionIdx(0);
          setErrorMessage(null);
          setSuccessMessage(null);
          setIsStoryDialogOpen(true);
        }}
        onClose={() => setIsChaptersModalOpen(false)}
      />

      {/* Vecna Story Dialogue (Pokemon FireRed bottom style with Vecna sprite) */}
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
