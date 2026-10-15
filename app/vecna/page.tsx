"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CONFIG,
  PLAYER_TEAMS,
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
  resolveStoredToken,
} from "@/lib/realtime";
import { API_BASE } from "@/lib/api";
import CinematicBackground from "@/components/CinematicBackground";
import { sfx } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";

import VecnaTacticalMap, { MapTeamInfo } from "@/components/vecna/VecnaTacticalMap";
import VecnaTriggerPanel, { TriggerAction } from "@/components/vecna/VecnaTriggerPanel";
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
}

const VECNA_TRIALS: VecnaTrial[] = [
  {
    id: 1,
    shortName: "STAGE 1",
    title: "STAGE 1: HAWKINS TOWN // SERIES LORE & LOGIC",
    subtitle: "HAWKINS CHRONICLES // SERIES LORE & TIMELINE INQUIRY",
    category: "SERIES KNOWLEDGE",
    description: "Multiple-choice questions testing lore, logic, and timeline understanding across the Hawkins dimension.",
    points: 50,
    powersGranted: "GLITCH · CRT FREAKOUT",
  },
  {
    id: 2,
    shortName: "STAGE 2",
    title: "STAGE 2: POLICE STATION // CONNECTION MATRIX",
    subtitle: "RELATIONSHIP CORRELATION // MATCH CLUES & ARTIFACTS",
    category: "RELATIONSHIP MAPPING",
    description: "Match related clues, characters, locations, objects, or concepts by identifying their deep relationships.",
    points: 50,
    powersGranted: "SIGNAL JAM · RADIO DISTORTION",
  },
  {
    id: 3,
    shortName: "STAGE 3",
    title: "STAGE 3: BYERS HOUSE // SEQUENCE RESTORATION",
    subtitle: "SEQUENCE RESTORATION // SCRAMBLED WORDS, STATEMENTS & CODE",
    category: "SEQUENCE RESTORATION",
    description: "Arrange scrambled words, sentences, codes, steps, or clues in the correct order to reveal hidden intelligence.",
    points: 50,
    powersGranted: "DISTORT · CLUE OBFUSCATION",
  },
  {
    id: 4,
    shortName: "STAGE 4",
    title: "STAGE 4: HAWKINS LAB // CASE STUDY FORENSICS",
    subtitle: "INVESTIGATIVE FORENSICS // SITUATION ANALYSIS",
    category: "INVESTIGATIVE ANALYSIS",
    description: "Analyze a given situation report or set of clues, examine evidence logs, and draw forensic conclusions.",
    points: 50,
    powersGranted: "LOCK · ACCESS DENIED",
  },
  {
    id: 5,
    shortName: "STAGE 5",
    title: "STAGE 5: RADIO TOWER // SIGNAL DECODING",
    subtitle: "SIGNAL INTELLIGENCE // MORSE, BINARY & CIPHERS",
    category: "SIGNAL DECODING",
    description: "Decode hidden messages or signals using methods such as Morse code, binary sequences, or audio ciphers.",
    points: 50,
    powersGranted: "FREQUENCY SHIFT · STATIC SURGE",
  },
  {
    id: 6,
    shortName: "STAGE 6",
    title: "STAGE 6: THE GATE RIFT // LAB SYSTEM CHALLENGES",
    subtitle: "HAWKINS LAB EXPERIMENTAL TERMINAL // SYSTEM CHALLENGES",
    category: "TECHNICAL EXPERIMENTS",
    description: "Interactive technical challenges involving logical sequences, system operations, bug fixing, and data analysis.",
    points: 50,
    powersGranted: "GRANDFATHER CLOCK · GATE MASTERY",
  },
];

export default function VecnaPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  // Active Trial & Question Selection
  const [activeTrialId, setActiveTrialId] = useState<number>(1);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);

  // Selected Answers: keyed by `${trialId}-${qIdx}`
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // Solved status: keyed by `${trialId}-${qIdx}`
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, boolean>>({});
  // Failed status: keyed by `${trialId}-${qIdx}` (permanently locked with 0 pts)
  const [failedQuestions, setFailedQuestions] = useState<Record<string, boolean>>({});

  // Question Attempts (1st try, 2nd try): keyed by `${trialId}-${qIdx}`
  const [questionAttempts, setQuestionAttempts] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_question_attempts");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Question Results: keyed by `${trialId}-${qIdx}`
  const [questionResults, setQuestionResults] = useState<
    Record<string, { isCorrect: boolean; isLocked?: boolean; message?: string; pointsAwarded?: number; attempts?: number }>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_question_results");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Unlocked clues: keyed by `${trialId}-${qIdx}`
  const [unlockedHints, setUnlockedHints] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_unlocked_hints");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Chapter submission state
  const [isChapterSubmitted, setIsChapterSubmitted] = useState<boolean>(false);
  const [isSubmittingChapter, setIsSubmittingChapter] = useState<boolean>(false);
  const [isCheckingQuestion, setIsCheckingQuestion] = useState<boolean>(false);

  // Authoritative Vecna score (10 PTS per solved question)
  const [vecnaScore, setVecnaScore] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_score");
        if (saved) return parseInt(saved, 10) || 0;
      } catch {}
    }
    return 0;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isPowersOpen, setIsPowersOpen] = useState(false);
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(true);

  // Selected team state for targeting
  const [selectedLocation, setSelectedLocation] = useState("town");
  const [selectedTeamName, setSelectedTeamName] = useState<string | undefined>("Null Pointers");

  // Dynamic live teams telemetry for Tactical Vector Map & Powers/Dispatch targeting
  const [liveTeams, setLiveTeams] = useState<any[]>([]);
  const [teamsAtLocation, setTeamsAtLocation] = useState<Record<string, MapTeamInfo[]>>({
    town: [],
    police: [],
    byers: [],
    lab: [],
    radioTower: [],
    forest: [],
    upsideDown: [],
  });

  // Persist score to local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vecna_score", String(vecnaScore));
      } catch {}
    }
  }, [vecnaScore]);

  // Persist question attempts and results
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vecna_question_attempts", JSON.stringify(questionAttempts));
        localStorage.setItem("vecna_question_results", JSON.stringify(questionResults));
      } catch {}
    }
  }, [questionAttempts, questionResults]);

  // Authenticate session
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

  // Keep Vecna authenticated with REAL authoritative score in heartbeat
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
        stage: `trial-${activeTrialId}` as any,
        score: vecnaScore,
        timeLeft: 0,
        solved: Object.values(solvedQuestions).filter(Boolean).length,
        ts: Date.now(),
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [session, vecnaScore, activeTrialId, solvedQuestions]);

  // Realtime subscriber for score updates, leaderboard, and logouts
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === "force_logout" || (msg.type === "event_state" && msg.status === "ended")) {
        clearSession();
        router.push("/");
      }
      if (msg.type === "score:update" && msg.teamId === "VECNA-001" && typeof msg.score === "number") {
        setVecnaScore(msg.score);
      }
      if (msg.type === "leaderboard:update") {
        fetchTeamsTelemetry();
      }
    });
    return () => unsub();
  }, [router]);

  // Fetch live teams and aggregate per location
  const fetchTeamsTelemetry = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.leaderboard)) {
          const squads = data.leaderboard.filter(
            (t: any) => t.teamId !== "VECNA-001" && !t.teamName.toLowerCase().includes("vecna")
          );
          setLiveTeams(squads);

          // Update active selected team if available
          if (squads.length > 0 && (!selectedTeamName || !squads.some((sq: any) => sq.teamName === selectedTeamName))) {
            setSelectedTeamName(squads[0].teamName);
          }

          // Aggregate teams per map location
          const locMap: Record<string, MapTeamInfo[]> = {
            town: [],
            police: [],
            byers: [],
            lab: [],
            radioTower: [],
            forest: [],
            upsideDown: [],
          };

          squads.forEach((t: any) => {
            let locKey = "town";
            if (t.location && locMap[t.location]) {
              locKey = t.location;
            } else {
              const solved = Number(t.solvedCount || 0);
              if (solved === 0) locKey = "town";
              else if (solved === 1) locKey = "police";
              else if (solved === 2) locKey = "byers";
              else if (solved === 3) locKey = "lab";
              else if (solved === 4) locKey = "radioTower";
              else if (solved === 5) locKey = "forest";
              else locKey = "upsideDown";
            }

            const status = t.status === "ACTIVE" ? "Online" : t.status === "LOCKED" ? "Stuck" : "Offline";
            locMap[locKey].push({
              id: t.teamId,
              name: t.teamName,
              status,
            });
          });

          setTeamsAtLocation(locMap);
        }
      }
    } catch {}
  }, [selectedTeamName]);

  useEffect(() => {
    fetchTeamsTelemetry();
    const t = setInterval(fetchTeamsTelemetry, 8000);
    return () => clearInterval(t);
  }, [fetchTeamsTelemetry]);

  // Fetch authoritative trial progress from backend
  useEffect(() => {
    let isCancelled = false;
    const fetchProgress = async () => {
      try {
        const stored = getStoredSession();
        const token = (stored && (stored as any).token) || resolveStoredToken();
        const res = await fetch(`${API_BASE}/vecna/trials/${activeTrialId}/progress`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.success && data.progress) {
            Object.entries(data.progress).forEach(([idxStr, att]: [string, any]) => {
              const idx = parseInt(idxStr, 10);
              const key = `${activeTrialId}-${idx}`;
              const isCor = att.status === "solved";
              const isFail = att.status === "failed";
              const isLocked = Boolean(att.isLocked ?? (isCor || isFail));
              const attemptsCount = att.attempts || (isFail ? 2 : 1);
              const pts = typeof att.earnedPoints === "number" ? att.earnedPoints : (isCor ? (attemptsCount === 2 ? 5 : 10) : 0);

              if (isCor) {
                setSolvedQuestions((prev) => ({ ...prev, [key]: true }));
              } else if (isFail) {
                setFailedQuestions((prev) => ({ ...prev, [key]: true }));
              }

              setQuestionAttempts((prev) => ({ ...prev, [key]: attemptsCount }));
              setQuestionResults((prev) => ({
                ...prev,
                [key]: {
                  isCorrect: isCor,
                  isLocked,
                  pointsAwarded: pts,
                  attempts: attemptsCount,
                  message: isCor
                    ? `VERIFIED [+${pts} PTS]`
                    : isFail
                    ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                    : "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)",
                },
              }));

              if (att.clueUnlocked) {
                setUnlockedHints((prev) => ({ ...prev, [key]: true }));
              }
              if (att.chosenAnswer) {
                setSelectedAnswers((prev) => ({ ...prev, [key]: att.chosenAnswer }));
              }
            });
            if (typeof data.maxUnlockedIdx === "number") {
              setActiveQuestionIdx((curr) => Math.min(curr, data.maxUnlockedIdx));
            }
            if (typeof data.currentScore === "number") {
              setVecnaScore(data.currentScore);
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

  const handleLogout = () => {
    sfx("click");
    try {
      getSocket()?.emit("team:logout");
    } catch {}
    clearSession();
    router.push("/");
  };

  const currentTrial = VECNA_TRIALS.find((t) => t.id === activeTrialId) || VECNA_TRIALS[0];
  const currentQuestions = STAGE_QUIZ_CONFIGS[currentTrial.id]?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const totalQuestionsForTrial = currentQuestions.length;

  const isLevelCompleted = (trialId: number, idx: number) => {
    const key = `${trialId}-${idx}`;
    return Boolean(
      solvedQuestions[key] ||
      failedQuestions[key] ||
      questionResults[key]?.isCorrect ||
      questionResults[key]?.isLocked
    );
  };

  const isLevelUnlocked = (trialId: number, idx: number) => {
    if (idx === 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!isLevelCompleted(trialId, i)) return false;
    }
    return true;
  };

  const currentKey = `${currentTrial.id}-${activeQuestionIdx}`;
  const currentResult = questionResults[currentKey];
  const currentAttempts = questionAttempts[currentKey] || 0;

  // A question is verified ONLY if it was answered correctly
  const isQuestionVerified = Boolean(currentResult?.isCorrect || solvedQuestions[currentKey]);
  
  // A question is permanently locked if verified OR if 2 attempts failed
  const isQuestionLocked = Boolean(
    currentResult?.isLocked ||
    failedQuestions[currentKey] ||
    isQuestionVerified ||
    (currentAttempts >= 2 && currentResult && !currentResult.isCorrect)
  );

  const isAttempt1Wrong = currentAttempts === 1 && currentResult && !currentResult.isCorrect && !isQuestionLocked;

  // Question is completed (eligible for proceeding) ONLY if verified OR locked with 2 failed attempts
  const isQuestionCompleted = isQuestionVerified || isQuestionLocked;

  const currentHintKey = `${currentTrial.id}-${activeQuestionIdx}`;
  const isCurrentClueUnlocked = Boolean(unlockedHints[currentHintKey]);

  // Counts for current chapter docket
  const answeredCount = currentQuestions.filter((_, idx) =>
    Boolean(selectedAnswers[`${currentTrial.id}-${idx}`]) || isLevelCompleted(currentTrial.id, idx)
  ).length;

  const solvedInCurrentTrial = currentQuestions.filter((_, idx) =>
    Boolean(solvedQuestions[`${currentTrial.id}-${idx}`] || questionResults[`${currentTrial.id}-${idx}`]?.isCorrect)
  ).length;

  const completedInCurrentTrial = currentQuestions.filter((_, idx) =>
    isLevelCompleted(currentTrial.id, idx)
  ).length;

  const allCompleted = completedInCurrentTrial === totalQuestionsForTrial && totalQuestionsForTrial === 10;

  const handleSelectOption = (trialId: number, qIdx: number, optionId: string) => {
    const key = `${trialId}-${qIdx}`;
    if (isLevelCompleted(trialId, qIdx) || questionResults[key]?.isLocked) return;
    sfx("click");
    setSelectedAnswers((prev) => ({
      ...prev,
      [key]: optionId,
    }));
    setErrorMessage(null);
  };

  const handleUnlockClue = async () => {
    if (isCurrentClueUnlocked) return;
    sfx("click");

    if (vecnaScore < 5) {
      setErrorMessage("INSUFFICIENT PSYCHIC POINTS (-5 PTS REQUIRED TO DECRYPT CLUE)");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      const res = await fetch(`${API_BASE}/vecna/trials/${currentTrial.id}/questions/${activeQuestionIdx}/clue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        sfx("boom");
        setUnlockedHints((prev) => {
          const next = { ...prev, [currentHintKey]: true };
          try {
            localStorage.setItem("vecna_unlocked_hints", JSON.stringify(next));
          } catch {}
          return next;
        });
        if (typeof data.currentScore === "number") {
          setVecnaScore(data.currentScore);
        } else {
          setVecnaScore((prev) => Math.max(0, prev - 5));
        }
        setSuccessMessage("INTEL CLUE DECRYPTED (-5 PTS DEDUCTED)");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        sfx("err");
        setErrorMessage(data.message || "FAILED TO DECRYPT INTEL CLUE.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch {
      sfx("err");
      setErrorMessage("FAILED TO CONTACT CENTRAL INTELLIGENCE VAULT.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleVerifyCurrentQuestion = async () => {
    if (!currentQuestion || isQuestionLocked || isCheckingQuestion) return;

    const chosen = selectedAnswers[currentKey];
    if (!chosen || !chosen.trim()) {
      setErrorMessage("SELECT AN ANSWER ENTRY BEFORE EVALUATION.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    setIsCheckingQuestion(true);
    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
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
          setIsCheckingQuestion(false);
          return;
        }
        if (data.error === "EVENT_PAUSED" || data.error === "SUBMISSIONS_CLOSED") {
          setErrorMessage(data.message || "TOURNAMENT ACTIONS SUSPENDED.");
          sfx("err");
          setTimeout(() => setErrorMessage(null), 3000);
          setIsCheckingQuestion(false);
          return;
        }
      }

      const isCorrect = Boolean(data.isCorrect);
      const isLocked = Boolean(data.isLocked);
      const attemptsCount = typeof data.attempts === "number" ? data.attempts : (currentAttempts + 1);
      const points = typeof data.pointsAwarded === "number" ? data.pointsAwarded : (isCorrect ? (attemptsCount === 1 ? 10 : 5) : 0);

      setQuestionAttempts((prev) => ({
        ...prev,
        [currentKey]: attemptsCount,
      }));

      setQuestionResults((prev) => ({
        ...prev,
        [currentKey]: {
          isCorrect,
          isLocked,
          message: data.message,
          pointsAwarded: points,
          attempts: attemptsCount,
        },
      }));

      if (isCorrect) {
        sfx("boom");
        setSolvedQuestions((prev) => ({
          ...prev,
          [currentKey]: true,
        }));
        if (typeof data.currentScore === "number") {
          setVecnaScore(data.currentScore);
        } else {
          setVecnaScore((prev) => prev + points);
        }
        setSuccessMessage(`ITEM ${activeQuestionIdx + 1} VERIFIED (+${points} PTS)`);
        setErrorMessage(null);

        // Auto advance to next question
        if (activeQuestionIdx < totalQuestionsForTrial - 1) {
          setTimeout(() => {
            setActiveQuestionIdx((i) => i + 1);
            setSuccessMessage(null);
          }, 800);
        } else {
          setTimeout(() => setSuccessMessage(null), 2500);
        }
      } else {
        sfx("err");
        if (isLocked) {
          // 2 attempts exhausted
          setFailedQuestions((prev) => ({
            ...prev,
            [currentKey]: true,
          }));
          setErrorMessage("TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED (0 PTS)");
          setSuccessMessage(null);
          if (activeQuestionIdx < totalQuestionsForTrial - 1) {
            setTimeout(() => {
              setActiveQuestionIdx((i) => i + 1);
              setErrorMessage(null);
            }, 1000);
          } else {
            setTimeout(() => setErrorMessage(null), 3000);
          }
        } else {
          // Attempt 1 failed
          setErrorMessage("INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)");
          setSuccessMessage(null);
          setTimeout(() => setErrorMessage(null), 3500);
        }
      }
    } catch {
      setErrorMessage("VECNA TELEMETRY DISCONNECTED: Central server unreachable.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsCheckingQuestion(false);
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
    if (!isQuestionCompleted) {
      sfx("err");
      setErrorMessage("ACCESS DENIED: ANSWER CURRENT ITEM BEFORE PROCEEDING.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    if (activeQuestionIdx < totalQuestionsForTrial - 1) {
      setActiveQuestionIdx((i) => i + 1);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleSubmitChapter = async () => {
    if (completedInCurrentTrial < totalQuestionsForTrial || totalQuestionsForTrial !== 10 || isSubmittingChapter) {
      setErrorMessage(`CANNOT SUBMIT: COMPLETE ALL 10 ITEMS FIRST (${completedInCurrentTrial}/10 COMPLETED)`);
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsSubmittingChapter(true);
    sfx("boom");
    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      const res = await fetch(`${API_BASE}/vecna/trials/${currentTrial.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setIsChapterSubmitted(true);
        if (typeof data.currentScore === "number") {
          setVecnaScore(data.currentScore);
        }
        setSuccessMessage(data.message || `CHAPTER ${currentTrial.id} DOSSIER SUBMITTED`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.message || "FAILED TO SUBMIT CHAPTER DOSSIER.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch {
      setErrorMessage("FAILED TO COMMUNICATE WITH CENTRAL MAINFRAME.");
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsSubmittingChapter(false);
    }
  };

  const handleProceedNextChapter = () => {
    sfx("boom");
    const nextId = currentTrial.id < 6 ? currentTrial.id + 1 : 1;
    setActiveTrialId(nextId);
    setActiveQuestionIdx(0);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsChapterSubmitted(false);
    setIsStoryDialogOpen(true);
  };

  const handleSendMessage = async (target: "all" | string, message: string) => {
    sfx("boom");

    const targetTeams = target === "all" ? [] : [target];

    publish({
      type: "sabotage",
      kind: "MESSAGE",
      target,
      teams: targetTeams,
      targetTeamName: target === "all" ? undefined : target,
      message,
      duration: 12,
      durationSec: 12,
      ts: Date.now(),
    });

    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      await fetch(`${API_BASE}/vecna/sabotage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target,
          teams: targetTeams,
          kind: "MESSAGE",
          message: message.slice(0, 150),
          duration: 12,
          cost: 0,
        }),
      });
      setSuccessMessage(`TELEPATHIC DISPATCH TRANSMITTED TO [${target.toUpperCase()}]`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch {}

    setIsMessageOpen(false);
  };

  const handleExecuteTrigger = async (action: TriggerAction) => {
    sfx("boom");
    const cost = action.totalCost || (action.targetTeams && action.targetTeams.length > 0 ? action.targetTeams.length * 10 : 10);
    if (vecnaScore < cost || vecnaScore <= 0) {
      setErrorMessage("INSUFFICIENT PSYCHIC POINTS. COMPLETE DOCKET ITEMS TO GAIN POINTS.");
      sfx("err");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const kind = action.id;
    const duration = action.id === "LOCK" ? 120 : 45;
    const targetTeams = action.targetTeams || [];
    const target = targetTeams.length === 1 ? targetTeams[0] : (targetTeams.length > 1 ? "teams" : selectedLocation);

    publish({
      type: "sabotage",
      kind,
      target,
      teams: targetTeams,
      duration,
      durationSec: duration,
      ts: Date.now(),
    });

    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      const res = await fetch(`${API_BASE}/vecna/sabotage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target,
          kind,
          duration,
          teams: targetTeams,
          cost,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.currentScore === "number") {
        setVecnaScore(data.currentScore);
        setSuccessMessage(`VECNA POWER [${kind}] UNLEASHED (-${cost} PTS)`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.message || "FAILED TO UNLEASH VECNA POWER.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch {
      setErrorMessage("TRANSMISSION ERROR: Could not reach central server.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
    setIsPowersOpen(false);
  };

  const liveTeamNames = liveTeams.map((t) => t.teamName);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
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
          TOP VECNA HEADER (STRANGER THINGS GLOW & DIGITAL NIXIE COUNTER)
          ─────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          background: "rgba(10, 2, 5, 0.94)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Left: VECNA Brand + CONTROL PROTOCOL */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
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
                V E C N A
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
              CONTROL PROTOCOL // 1986
            </div>
          </div>
        </div>

        {/* Center: Command Panels Popups */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Tactical Map */}
          <button
            id="vecna-map-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMapOpen(true);
            }}
            style={{
              background: isMapOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isMapOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "7px 16px",
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
              padding: "7px 16px",
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
              setIsPowersOpen(true);
            }}
            style={{
              background: isPowersOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isPowersOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "7px 16px",
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

          {/* Chapters Selector */}
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
              padding: "7px 16px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: isChaptersModalOpen ? "#000" : "#ff2d3a" }}>◈</span>
            <span>CHAPTERS</span>
          </button>
        </div>

        {/* Right: SQUAD | SCORE COUNTER | LOGOUT */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          {/* SQUAD MODULE */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9.5,
                fontWeight: 800,
                color: "#e61a28",
                letterSpacing: ".24em",
                textTransform: "uppercase",
                marginBottom: 2,
                lineHeight: 1,
              }}
            >
              SQUAD
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 12,
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: ".1em",
                lineHeight: 1,
              }}
            >
              VECNA // 001
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "rgba(220, 24, 38, 0.45)" }} />

          {/* DIGITAL NIXIE SCORE MODULE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9.5,
                fontWeight: 800,
                color: "#e61a28",
                letterSpacing: ".24em",
                textTransform: "uppercase",
                marginBottom: 2,
                lineHeight: 1,
              }}
            >
              SCORE
            </span>
            <span
              style={{
                fontFamily: "var(--font-term), 'VT323', monospace",
                fontSize: "22px",
                fontWeight: "bold",
                color: "#ff2a3a",
                letterSpacing: ".2em",
                lineHeight: 1,
                textShadow: "0 0 10px rgba(255, 42, 58, 0.85), 0 0 20px rgba(255, 42, 58, 0.4)",
              }}
            >
              {String(vecnaScore).padStart(5, "0")}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "rgba(220, 24, 38, 0.45)" }} />

          {/* Exit Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "rgba(18, 4, 7, 0.85)",
              color: "#ff3a48",
              border: "1.5px solid #ff2d3a",
              padding: "7px 14px",
              borderRadius: "3px",
              fontSize: "11px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          MAIN AREA: HAWKINS DOCKET BOARD (MATCHING USER SCREENSHOT 1)
          ─────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1400px",
          width: "100%",
          margin: "18px auto 40px auto",
          padding: "0 18px",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        <motion.div
          key={`${currentTrial.id}-${activeQuestionIdx}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: "#f4eedf",
            backgroundImage: "radial-gradient(#d3c6ab 1.2px, transparent 1.2px)",
            backgroundSize: "16px 16px",
            border: "2px solid #8f231e",
            borderRadius: "4px",
            boxShadow:
              "0 14px 44px rgba(0, 0, 0, 0.85), inset 0 0 50px rgba(140, 35, 30, 0.08)",
            padding: "20px 24px",
            color: "#2a221a",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* Top Row: [ CASE BRIEFING ] on Left, [ ✕ ] on Right */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                sfx("click");
                setIsStoryDialogOpen(true);
              }}
              style={{
                background: "linear-gradient(180deg, #caa356 0%, #b88a38 100%)",
                color: "#1c140e",
                border: "1.5px solid #8f6222",
                borderRadius: "3px",
                padding: "7px 16px",
                fontFamily: "'Benguiat Bold', serif",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>CASE BRIEFING</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx("click");
                setIsStoryDialogOpen(true);
              }}
              style={{
                width: "28px",
                height: "28px",
                background: "#24130d",
                border: "1.5px solid #8f2d24",
                color: "#ffffff",
                borderRadius: "3px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "bold",
              }}
              title="View Case Briefing"
            >
              ✕
            </button>
          </div>

          {/* DOCKET ITEMS: [ ITEM 1 ] ... [ ITEM 10 ] (Screenshot 1 Tab Row) */}
          <div
            style={{
              background: "#ded4c1",
              border: "1px solid #b8a992",
              borderRadius: "3px",
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <span
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "11px",
                fontWeight: 900,
                color: "#3a2c20",
                letterSpacing: "0.1em",
                marginRight: "4px",
              }}
            >
              DOCKET ITEMS:
            </span>

            {currentQuestions.map((q, idx) => {
              const isCurrent = idx === activeQuestionIdx;
              const itemKey = `${currentTrial.id}-${idx}`;
              const itemRes = questionResults[itemKey];
              const itemAttempts = questionAttempts[itemKey] || 0;
              const isSolved = Boolean(solvedQuestions[itemKey] || itemRes?.isCorrect);
              const isFailed = Boolean(failedQuestions[itemKey] || (itemRes && !itemRes.isCorrect && itemRes.isLocked));
              const isAttempt1Wrong = itemAttempts === 1 && itemRes && !itemRes.isCorrect && !itemRes.isLocked;
              const hasAnswer = Boolean(selectedAnswers[itemKey]);
              const isUnlocked = isLevelUnlocked(currentTrial.id, idx);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (!isUnlocked) {
                      sfx("err");
                      setErrorMessage(`ITEM ${idx + 1} LOCKED · COMPLETE PRECEDING LEVEL FIRST`);
                      setTimeout(() => setErrorMessage(null), 2500);
                      return;
                    }
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
                      ? "#593c12"
                      : hasAnswer
                      ? "#2e2118"
                      : "#ded6c4",
                    color: isCurrent || isSolved || isFailed || isAttempt1Wrong || hasAnswer ? "#ffffff" : "#2a221a",
                    border: isCurrent
                      ? "1.5px solid #8f1218"
                      : isSolved
                      ? "1px solid #3d8053"
                      : isFailed
                      ? "1px solid #8f2d24"
                      : isAttempt1Wrong
                      ? "1px solid #9c6c21"
                      : hasAnswer
                      ? "1px solid #573a2e"
                      : "1px solid #b5a48b",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontWeight: 900,
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: "0.08em",
                    cursor: isUnlocked ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: isUnlocked ? 1 : 0.45,
                    boxShadow: isCurrent ? "0 0 8px rgba(184, 29, 36, 0.4)" : "none",
                    transition: "all 0.12s ease",
                  }}
                  title={!isUnlocked ? "Locked until preceding item is completed" : `Item ${idx + 1}`}
                >
                  ITEM {idx + 1}
                  {isSolved
                    ? ` [+${itemRes?.pointsAwarded || (itemAttempts === 2 ? 5 : 10)}]`
                    : isFailed
                    ? " [0P]"
                    : isAttempt1Wrong
                    ? " [5P]"
                    : ""}
                </button>
              );
            })}
          </div>

          {/* Question Body: Typewriter Monospace Card & 2x2 Option Grid via QuestionTypeRenderer */}
          <div style={{ marginBottom: "14px" }}>
            <QuestionTypeRenderer
              key={`${currentTrial.id}-${activeQuestionIdx}`}
              question={currentQuestion}
              selectedAnswer={selectedAnswers[currentKey]}
              onSelectOption={(optId) => handleSelectOption(currentTrial.id, activeQuestionIdx, optId)}
              isVecnaMode={false}
              questionIndex={activeQuestionIdx}
              disabled={isQuestionLocked}
              isVerified={isQuestionVerified}
              isLocked={isQuestionLocked}
            />
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "8px 14px",
                  background: "rgba(184, 29, 36, 0.12)",
                  border: "1.5px solid #8f231e",
                  borderRadius: "3px",
                  color: "#8f231e",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "12px",
                }}
              >
                {errorMessage}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "8px 14px",
                  background: "rgba(46, 105, 48, 0.12)",
                  border: "1.5px solid #2e6930",
                  borderRadius: "3px",
                  color: "#2e6930",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "12px",
                }}
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action & Submit Answer Strip (Renamed from Check Answer to Submit Answer) */}
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              padding: "9px 16px",
              background: isQuestionVerified
                ? "rgba(38, 166, 91, 0.12)"
                : isQuestionLocked
                ? "rgba(184, 29, 36, 0.12)"
                : isAttempt1Wrong
                ? "rgba(184, 115, 29, 0.12)"
                : "rgba(0, 0, 0, 0.04)",
              border: isQuestionVerified
                ? "1.5px solid #27ae60"
                : isQuestionLocked
                ? "1.5px solid #b81d24"
                : isAttempt1Wrong
                ? "1.5px solid #b8731d"
                : "1.5px dashed #c9bda4",
              borderRadius: "3px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: isQuestionVerified
                    ? "#1b7a41"
                    : isQuestionLocked
                    ? "#9e151b"
                    : isAttempt1Wrong
                    ? "#8c5614"
                    : selectedAnswers[currentKey]
                    ? "#2a221a"
                    : "#544638",
                }}
              >
                {isQuestionVerified
                  ? `VERIFIED [+${currentResult?.pointsAwarded || (currentAttempts === 2 ? 5 : 10)} PTS]`
                  : isQuestionLocked
                  ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                  : isAttempt1Wrong
                  ? "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)"
                  : selectedAnswers[currentKey]
                  ? "ANSWER ENTRY READY [10 PTS]"
                  : "SELECT ANSWER ENTRY [10 PTS]"}
              </span>
            </div>

            <button
              id="vecna-submit-answer-btn"
              type="button"
              onClick={handleVerifyCurrentQuestion}
              disabled={isQuestionLocked || !selectedAnswers[currentKey] || isCheckingQuestion}
              style={{
                padding: "8px 22px",
                background: isCheckingQuestion
                  ? "#332219"
                  : isQuestionVerified
                  ? "#234d31"
                  : isQuestionLocked
                  ? "#2c1515"
                  : isAttempt1Wrong
                  ? "#593c12"
                  : "#24130d",
                color: "#ffffff",
                border: isQuestionVerified
                  ? "1.5px solid #3d8053"
                  : isQuestionLocked
                  ? "1.5px solid #7d2a2a"
                  : isAttempt1Wrong
                  ? "1.5px solid #9c6c21"
                  : "1.5px solid #8f2d24",
                borderRadius: "3px",
                fontFamily: "'Benguiat Bold', serif",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                cursor:
                  isQuestionLocked || !selectedAnswers[currentKey] || isCheckingQuestion
                    ? "not-allowed"
                    : "pointer",
                opacity: !selectedAnswers[currentKey] || isQuestionLocked ? 0.65 : 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                transition: "all 0.15s ease",
              }}
            >
              {isCheckingQuestion
                ? "SUBMITTING..."
                : isQuestionVerified
                ? "VERIFIED"
                : isQuestionLocked
                ? "LOCKED"
                : isAttempt1Wrong
                ? "SUBMIT ANSWER (5 PTS)"
                : "SUBMIT ANSWER"}
            </button>
          </div>

          {/* INTEL CLUE Strip (-5 PTS deduction) */}
          <div
            style={{
              marginTop: "10px",
              background: isCurrentClueUnlocked ? "#fbf6ec" : "#ece3d0",
              border: isCurrentClueUnlocked ? "1.5px solid #c49646" : "1.5px dashed #a8947c",
              borderRadius: "3px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#8f231e",
                  letterSpacing: "0.1em",
                }}
              >
                INTEL CLUE:
              </span>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11.5px",
                  color: isCurrentClueUnlocked ? "#2a221a" : "#7c6c59",
                  fontWeight: isCurrentClueUnlocked ? 700 : "normal",
                }}
              >
                {isCurrentClueUnlocked
                  ? currentQuestion.hint || "Review the covert Hawkins frequency logs."
                  : "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░"}
              </span>
            </div>

            {!isCurrentClueUnlocked && (
              <button
                type="button"
                onClick={handleUnlockClue}
                disabled={vecnaScore < 5}
                style={{
                  background: vecnaScore < 5 ? "#1a120e" : "#24130d",
                  border: vecnaScore < 5 ? "1.5px solid #57432e" : "1.5px solid #c49646",
                  color: vecnaScore < 5 ? "#7a6a57" : "#e8c374",
                  padding: "6px 14px",
                  borderRadius: "2px",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  cursor: vecnaScore < 5 ? "not-allowed" : "pointer",
                  boxShadow: vecnaScore < 5 ? "none" : "0 2px 6px rgba(0,0,0,0.25)",
                  transition: "all 0.15s ease",
                }}
                title={vecnaScore < 5 ? "Requires at least 5 PTS to unlock" : "Unlock clue (-5 PTS)"}
              >
                UNLOCK CLUE (-5 PTS)
              </button>
            )}
          </div>

          {/* Bottom Navigation & Submission Bar (PREVIOUS | NEXT | COMPLETE ALL 10 / SUBMIT) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1.5px solid #2a221a",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            {/* Left: PREVIOUS and NEXT (Sequence Enforced) */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePrevLevel}
                disabled={activeQuestionIdx === 0}
                style={{
                  padding: "8px 18px",
                  background: "transparent",
                  border: "1.5px solid #2a221a",
                  borderRadius: "2px",
                  color: activeQuestionIdx === 0 ? "rgba(42, 34, 26, 0.3)" : "#2a221a",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                }}
              >
                PREVIOUS
              </button>

              <button
                type="button"
                onClick={handleNextLevel}
                disabled={!isQuestionCompleted || activeQuestionIdx === totalQuestionsForTrial - 1}
                style={{
                  padding: "8px 22px",
                  background: !isQuestionCompleted || activeQuestionIdx === totalQuestionsForTrial - 1 ? "#332219" : "#24130d",
                  border: "1.5px solid #24130d",
                  borderRadius: "2px",
                  color: !isQuestionCompleted || activeQuestionIdx === totalQuestionsForTrial - 1 ? "#7c6c59" : "#ffffff",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  cursor: !isQuestionCompleted || activeQuestionIdx === totalQuestionsForTrial - 1 ? "not-allowed" : "pointer",
                  opacity: !isQuestionCompleted ? 0.6 : 1,
                  transition: "all 0.15s ease",
                }}
                title={!isQuestionCompleted ? "Complete current item before proceeding" : "Next item"}
              >
                NEXT
              </button>
            </div>

            {/* Right: SUBMIT [X/10] + PROCEED TO NEXT CHAPTER */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Submit Chapter Button (Disabled until ALL 10 items completed) */}
              <button
                type="button"
                onClick={handleSubmitChapter}
                disabled={completedInCurrentTrial < totalQuestionsForTrial || totalQuestionsForTrial !== 10 || isSubmittingChapter}
                style={{
                  padding: "9px 22px",
                  background: isChapterSubmitted
                    ? "#234d31"
                    : completedInCurrentTrial === totalQuestionsForTrial && totalQuestionsForTrial === 10
                    ? "#8f231e"
                    : "rgba(139, 126, 109, 0.4)",
                  color: "#ffffff",
                  border: isChapterSubmitted ? "1.5px solid #3d8053" : "none",
                  borderRadius: "3px",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  cursor:
                    completedInCurrentTrial < totalQuestionsForTrial || totalQuestionsForTrial !== 10 || isSubmittingChapter
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    completedInCurrentTrial === totalQuestionsForTrial && !isChapterSubmitted
                      ? "0 0 12px rgba(184, 29, 36, 0.5)"
                      : "0 2px 6px rgba(0,0,0,0.2)",
                  opacity: completedInCurrentTrial < totalQuestionsForTrial ? 0.65 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                {isSubmittingChapter
                  ? "SUBMITTING DOSSIER..."
                  : isChapterSubmitted
                  ? `SUBMITTED [${completedInCurrentTrial}/${totalQuestionsForTrial}]`
                  : completedInCurrentTrial < totalQuestionsForTrial
                  ? `COMPLETE ALL 10 ITEMS [${completedInCurrentTrial}/${totalQuestionsForTrial}]`
                  : `SUBMIT CHAPTER [${completedInCurrentTrial}/${totalQuestionsForTrial}]`}
              </button>

              {/* Prominent Next Chapter Redirect Button (ONLY displayed when all 10 completed AND chapter submitted) */}
              {allCompleted && isChapterSubmitted && (
                <button
                  type="button"
                  onClick={handleProceedNextChapter}
                  style={{
                    padding: "9px 24px",
                    background: "linear-gradient(135deg, #b81d24 0%, #8f1218 100%)",
                    color: "#ffffff",
                    border: "1.5px solid #ff4d58",
                    borderRadius: "3px",
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    cursor: "pointer",
                    boxShadow: "0 0 16px rgba(255, 45, 58, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>PROCEED TO CHAPTER {currentTrial.id < 6 ? currentTrial.id + 1 : 1} ▶</span>
                </button>
              )}
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
                    LIVE GPS TELEMETRY & REAL-TIME SQUAD COORDINATES
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
                teamsAtLocation={teamsAtLocation}
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
                    ALL TEAMS (3 CHANCES · 3 MIN CD) | INDIVIDUAL (5 MSGS · 1 MIN CD)
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
                teams={liveTeamNames}
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
                    10 PTS DEDUCTED PER TARGET SQUAD · BLOCKED AT 0 PTS
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
                currentVecnaScore={vecnaScore}
                teams={liveTeamNames}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters Modal */}
      <VecnaChaptersModal
        isOpen={isChaptersModalOpen}
        activeTrialId={activeTrialId}
        solvedQuestions={solvedQuestions}
        onSelectTrial={(trialId) => {
          setActiveTrialId(trialId);
          setActiveQuestionIdx(0);
          setErrorMessage(null);
          setSuccessMessage(null);
          setIsChapterSubmitted(false);
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
