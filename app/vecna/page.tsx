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
    title: "STAGE 2: HAWKINS LAB // CONNECTION MATRIX",
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
    title: "STAGE 4: CREEL HOUSE // CASE STUDY FORENSICS",
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
    title: "STAGE 6: THE UPSIDE DOWN // LAB SYSTEM CHALLENGES",
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
  const [isUnlockingClue, setIsUnlockingClue] = useState<boolean>(false);
  const [unansweredPrompt, setUnansweredPrompt] = useState<boolean>(false);

  // Intel Clue Confirmation / Clearance Modal
  const [intelModal, setIntelModal] = useState<{
    isOpen: boolean;
    type?: "warning" | "confirm";
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Keyboard shortcut listener for Intel Clue modal (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!intelModal?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (intelModal.onCancel) {
          intelModal.onCancel();
        } else if (intelModal.onConfirm) {
          intelModal.onConfirm();
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (intelModal.onConfirm) {
          intelModal.onConfirm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [intelModal]);

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
  const stageConfig = STAGE_QUIZ_CONFIGS[currentTrial.id] || STAGE_QUIZ_CONFIGS[1];
  const currentQuestions = stageConfig?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const totalQuestionsForTrial = currentQuestions.length;

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

  const currentHintKey = `${currentTrial.id}-${activeQuestionIdx}`;
  const isCurrentClueUnlocked = Boolean(unlockedHints[currentHintKey]);

  // Answered count across current trial (using trimmed text or verified state)
  const answeredCount = currentQuestions.filter((_, idx) => {
    const k = `${currentTrial.id}-${idx}`;
    return Boolean(selectedAnswers[k]?.trim()) || Boolean(solvedQuestions[k]) || Boolean(questionResults[k]?.isCorrect) || Boolean(questionResults[k]?.isLocked);
  }).length;

  const allQuestionsAnswered = answeredCount === totalQuestionsForTrial && totalQuestionsForTrial > 0;

  const handleSelectOption = (trialId: number, qIdx: number, optionId: string, silent = false) => {
    const key = `${trialId}-${qIdx}`;
    const itemRes = questionResults[key];
    const isLocked = Boolean(
      itemRes?.isLocked ||
      (questionAttempts[key] >= 2 && itemRes && !itemRes.isCorrect) ||
      failedQuestions[key] ||
      solvedQuestions[key]
    );
    if (isLocked) return;
    if (!silent) sfx("type");
    setSelectedAnswers((prev) => ({
      ...prev,
      [key]: optionId,
    }));
    setErrorMessage(null);
    setUnansweredPrompt(false);
  };

  const handleUnlockClueClick = () => {
    if (isCurrentClueUnlocked || isUnlockingClue) return;
    sfx("click");

    if (vecnaScore < 5) {
      sfx("err");
      setIntelModal({
        isOpen: true,
        type: "warning",
        title: "CLEARANCE RESTRICTED // INSUFFICIENT SCORE",
        message: "You need at least 5 squad points to decrypt this classified Intel Clue. Complete tasks or submit accurate answers to earn points.",
        confirmLabel: "ACKNOWLEDGE",
        onConfirm: () => setIntelModal(null),
      });
      return;
    }

    setIntelModal({
      isOpen: true,
      type: "confirm",
      title: "CLASSIFIED INTEL DOSSIER DECRYPTION",
      message: "Decrypt classified surveillance dossier? This action will deduct 5 points from your current squad score.",
      confirmLabel: "DECRYPT CLUE (-5 PTS)",
      cancelLabel: "ABORT",
      onConfirm: async () => {
        setIntelModal(null);
        await executeUnlockClue();
      },
      onCancel: () => setIntelModal(null),
    });
  };

  const executeUnlockClue = async () => {
    setIsUnlockingClue(true);
    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      let res = await fetch(`${API_BASE}/vecna/trials/${currentTrial.id}/questions/${activeQuestionIdx}/clue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      let data = await res.json().catch(() => ({}));

      // Resilient fallback if backend 500 or offline
      if (!res.ok && res.status >= 500) {
        const qCode = currentQuestion.id || `ch${currentTrial.id}-q${activeQuestionIdx + 1}`;
        const fallbackRes = await fetch(`/api/hints/use`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ questionId: qCode, hintNumber: 1 }),
        });
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
          res = fallbackRes;
        }
      }

      if (res.ok && data.success) {
        sfx("boom");
        setUnlockedHints((prev) => {
          const next = { ...prev, [currentHintKey]: true };
          try {
            localStorage.setItem("vecna_unlocked_hints", JSON.stringify(next));
          } catch {}
          return next;
        });
        const nextScore = typeof data.currentScore === "number" ? data.currentScore : Math.max(0, vecnaScore - 5);
        setVecnaScore(nextScore);
        try {
          localStorage.setItem("vecna_score", String(nextScore));
        } catch {}
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
    } finally {
      setIsUnlockingClue(false);
    }
  };

  const handleVerifyCurrentQuestion = async () => {
    if (!currentQuestion || isQuestionLocked || isCheckingQuestion) return;

    const chosen = selectedAnswers[currentKey];
    if (!chosen || !chosen.trim()) {
      setErrorMessage(`PLEASE RECORD AN ANSWER FOR ITEM ${activeQuestionIdx + 1} BEFORE CHECKING`);
      sfx("err");
      setUnansweredPrompt(true);
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    const priorAttempts = questionAttempts[currentKey] || 0;
    const thisAttemptNumber = priorAttempts + 1;

    setIsCheckingQuestion(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnansweredPrompt(false);

    try {
      const stored = getStoredSession();
      const token = (stored && (stored as any).token) || resolveStoredToken();
      let res = await fetch(`${API_BASE}/vecna/trials/${currentTrial.id}/questions/${activeQuestionIdx}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer: chosen, attemptNumber: thisAttemptNumber }),
      });

      let data = await res.json().catch(() => ({}));

      // Resilient fallback if vecna endpoint failed
      if (!res.ok && res.status >= 500) {
        const qCode = currentQuestion.id || `ch${currentTrial.id}-q${activeQuestionIdx + 1}`;
        const fallbackRes = await fetch(`/api/questions/${encodeURIComponent(qCode)}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer: chosen, teamId: "VECNA-001", attemptNumber: thisAttemptNumber }),
        });
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
          res = fallbackRes;
        }
      }

      if (res.ok && data.success) {
        const isCorrect = Boolean(data.isCorrect);
        const isLocked = Boolean(data.isLocked ?? (isCorrect || thisAttemptNumber >= 2));
        const points = typeof data.pointsAwarded === "number" ? data.pointsAwarded : (isCorrect ? (thisAttemptNumber === 1 ? 10 : 5) : 0);

        setQuestionAttempts((prev) => {
          const next = { ...prev, [currentKey]: thisAttemptNumber };
          try {
            localStorage.setItem("vecna_question_attempts", JSON.stringify(next));
          } catch {}
          return next;
        });

        setQuestionResults((prev) => {
          const next = {
            ...prev,
            [currentKey]: {
              isCorrect,
              isLocked,
              message: data.message || (
                isCorrect
                  ? (thisAttemptNumber === 1 ? "VERIFIED [+10 PTS]" : "VERIFIED [+5 PTS]")
                  : isLocked
                  ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                  : "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)"
              ),
              pointsAwarded: points,
              attempts: thisAttemptNumber,
            },
          };
          try {
            localStorage.setItem("vecna_question_results", JSON.stringify(next));
          } catch {}
          return next;
        });

        if (isCorrect) {
          sfx("ok");
          setSolvedQuestions((prev) => ({
            ...prev,
            [currentKey]: true,
          }));
          const newScore = typeof data.currentScore === "number" ? data.currentScore : (vecnaScore + points);
          setVecnaScore(newScore);
          try {
            localStorage.setItem("vecna_score", String(newScore));
          } catch {}
          setSuccessMessage(`ITEM ${activeQuestionIdx + 1} VERIFIED (+${points} PTS)`);
          setTimeout(() => setSuccessMessage(null), 2500);
        } else {
          sfx("err");
          if (isLocked) {
            setFailedQuestions((prev) => ({
              ...prev,
              [currentKey]: true,
            }));
            setErrorMessage("TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]");
          } else {
            setErrorMessage("INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)");
          }
          setTimeout(() => setErrorMessage(null), 3000);
        }
      } else {
        sfx("err");
        setErrorMessage(data.message || "COMMUNICATION FAILURE: Central server rejected submission.");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch {
      sfx("err");
      setErrorMessage("TRANSMISSION ERROR: Central server unreachable.");
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
      setUnansweredPrompt(false);
    }
  };

  const handleNextLevel = () => {
    sfx("click");
    if (activeQuestionIdx < totalQuestionsForTrial - 1) {
      setActiveQuestionIdx((i) => i + 1);
      setErrorMessage(null);
      setSuccessMessage(null);
      setUnansweredPrompt(false);
    }
  };

  const handleSubmitChapter = async () => {
    if (!allQuestionsAnswered) {
      sfx("err");
      setUnansweredPrompt(true);
      setErrorMessage(`CANNOT SUBMIT: PLEASE RECORD ANSWERS FOR ALL 10 ITEMS (${answeredCount}/10 RECORDED)`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setIsSubmittingChapter(true);
    sfx("ok");
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
          try {
            localStorage.setItem("vecna_score", String(data.currentScore));
          } catch {}
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

          {/* Docket Title and Valuation Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              borderBottom: "2px solid #231e1a",
              paddingBottom: 6,
              marginBottom: 8,
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                fontFamily: "'Courier New', Courier, monospace",
                color: "#231e1a",
              }}
            >
              {stageConfig?.docketNumber || `FORM HPD-0${currentTrial.id}-83 // CLASSIFIED INCIDENT DOCKET`}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: "#8a5818",
                letterSpacing: ".1em",
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              VALUED: {stageConfig?.points || 50} PTS (5-10 PTS PER ITEM)
            </div>
          </div>

          <div
            style={{
              fontSize: "clamp(12px, 1.2vw, 13px)",
              fontWeight: 900,
              color: "#b81d24",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              marginBottom: 14,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {stageConfig?.sectionHeader || `SECTION 0${currentTrial.id} — FORMAL INQUIRY // HAWKINS ANOMALY`}
          </div>

          {/* DOCKET ITEMS: [ ITEM 1 ] ... [ ITEM 10 ] (Screenshot 1 Tab Row) */}
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
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                DOCKET ITEMS:
              </span>
              {currentQuestions.map((q, idx) => {
                const isCurrent = idx === activeQuestionIdx;
                const itemKey = `${currentTrial.id}-${idx}`;
                const itemRes = questionResults[itemKey];
                const itemAttempts = questionAttempts[itemKey] || 0;
                const isVerified = Boolean(solvedQuestions[itemKey] || itemRes?.isCorrect);
                const isLocked = Boolean(itemRes?.isLocked || (itemAttempts >= 2 && itemRes && !itemRes.isCorrect) || failedQuestions[itemKey]);
                const isFailed = Boolean((itemRes && !itemRes.isCorrect && isLocked) || failedQuestions[itemKey]);
                const isAttempt1Wrong = Boolean(itemAttempts === 1 && itemRes && !itemRes.isCorrect && !isLocked);
                const hasAnswer = Boolean(selectedAnswers[itemKey]?.trim());

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => {
                      sfx("click");
                      setActiveQuestionIdx(idx);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setUnansweredPrompt(false);
                    }}
                    style={{
                      padding: "4px 10px",
                      background: isCurrent
                        ? "#b81d24"
                        : isVerified
                        ? "#234d31"
                        : isFailed
                        ? "#3d1414"
                        : isAttempt1Wrong
                        ? "#4d3314"
                        : hasAnswer
                        ? "#2e2118"
                        : "#ded6c4",
                      color: isCurrent || isVerified || isFailed || isAttempt1Wrong || hasAnswer ? "#fff" : "#2a221a",
                      border: isCurrent
                        ? "1.5px solid #8f1218"
                        : isVerified
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      transition: "all 0.12s ease",
                      fontFamily: "'Courier New', Courier, monospace",
                    }}
                    title={`Item ${idx + 1}`}
                  >
                    <span>
                      ITEM {idx + 1}
                      {isVerified ? ` [+${itemRes?.pointsAwarded || (itemAttempts === 2 ? 5 : 10)}]` : isFailed ? " [0P]" : isAttempt1Wrong ? " [5P]" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
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

            {unansweredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginBottom: 14,
                  padding: "8px 14px",
                  background: "rgba(255, 140, 0, 0.12)",
                  border: "1.5px solid #d46b08",
                  color: "#a85002",
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: ".1em",
                  fontFamily: "'Benguiat Bold', serif",
                }}
              >
                PLEASE RECORD AN ANSWER FOR ALL ITEMS BEFORE SUBMITTING REPORT
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action & Submit Answer Strip (Exact Hawkins 2-Attempt Answering Mech) */}
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
                  ? (currentAttempts === 1 ? "ANSWER RECORDED [5 PTS]" : "ANSWER RECORDED [10 PTS]")
                  : (currentAttempts === 1 ? "SELECT ANSWER [5 PTS]" : "SELECT ANSWER [10 PTS]")}
              </span>
            </div>

            <button
              id="vecna-check-answer-btn"
              type="button"
              onClick={handleVerifyCurrentQuestion}
              disabled={isCheckingQuestion || !selectedAnswers[currentKey]?.trim() || isQuestionLocked}
              style={{
                padding: "8px 20px",
                background: isCheckingQuestion
                  ? "#332219"
                  : isQuestionVerified
                  ? "#234d31"
                  : isQuestionLocked
                  ? "#2c1515"
                  : isAttempt1Wrong
                  ? "#5c330a"
                  : "#24130d",
                color: "#ffffff",
                border: isQuestionVerified
                  ? "1.5px solid #3d8053"
                  : isQuestionLocked
                  ? "1.5px solid #7d2a2a"
                  : isAttempt1Wrong
                  ? "1.5px solid #d97706"
                  : "1.5px solid #8f2d24",
                borderRadius: "3px",
                fontFamily: "'Benguiat Bold', serif",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                cursor: isCheckingQuestion || !selectedAnswers[currentKey]?.trim() || isQuestionLocked ? "not-allowed" : "pointer",
                opacity: !selectedAnswers[currentKey]?.trim() || isQuestionLocked ? 0.6 : 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                transition: "all 0.15s ease",
              }}
            >
              {isCheckingQuestion
                ? "CHECKING..."
                : isQuestionVerified
                ? "VERIFIED"
                : isQuestionLocked
                ? "LOCKED"
                : isAttempt1Wrong
                ? "SUBMIT ANSWER (5 PTS)"
                : "SUBMIT ANSWER"}
            </button>
          </div>

          {/* INTEL CLUE Strip (Exact Hawkins Intel Clue & -5 PTS Mechanism) */}
          {currentQuestion.hint && (
            <div
              style={{
                marginTop: "10px",
                background: isCurrentClueUnlocked ? "#fbf6ec" : "#ece3d0",
                border: isCurrentClueUnlocked ? "1.5px solid #c49646" : "1.5px dashed #a8947c",
                borderRadius: "3px",
                padding: "8px 14px",
                boxShadow: isCurrentClueUnlocked
                  ? "0 2px 8px rgba(212, 167, 89, 0.2), inset 0 0 10px rgba(255,255,255,0.6)"
                  : "inset 0 0 8px rgba(0,0,0,0.06)",
                transition: "all 0.2s ease",
              }}
            >
              {isCurrentClueUnlocked ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#8a5818",
                        letterSpacing: ".14em",
                        fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>DECRYPTED INTEL DOSSIER</span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        fontFamily: "'Courier New', monospace",
                        color: "#7a4808",
                        background: "rgba(212, 167, 89, 0.25)",
                        border: "1px solid rgba(138, 88, 24, 0.35)",
                        padding: "1px 6px",
                        borderRadius: 2,
                        letterSpacing: ".08em",
                      }}
                    >
                      CLEARANCE LEVEL 4 GRANTED
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "clamp(12.5px, 1.3vw, 14px)",
                      color: "#24180d",
                      lineHeight: 1.5,
                      fontFamily: "'Courier New', Courier, monospace",
                      fontWeight: 700,
                      borderLeft: "3px solid #c49646",
                      paddingLeft: 10,
                      background: "rgba(255,255,255,0.45)",
                      padding: "6px 10px",
                      borderRadius: "0 2px 2px 0",
                    }}
                  >
                    <b>SURVEILLANCE CLUE:</b> &quot;{currentQuestion.hint}&quot;
                  </div>
                </motion.div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200, flex: 1 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: ".14em",
                        fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                        color: "#b81d24",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <span>INTEL CLUE:</span>
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        letterSpacing: ".2em",
                        color: "rgba(70, 50, 35, 0.45)",
                        fontSize: 12,
                        userSelect: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ██████████████████████████████████████
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleUnlockClueClick}
                    disabled={isUnlockingClue}
                    style={{
                      padding: "6px 14px",
                      background: "#24130d",
                      color: "#ffd54f",
                      border: "1.5px solid #8f2d24",
                      borderRadius: 3,
                      fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".12em",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                      transition: "all 0.15s ease",
                      textTransform: "uppercase",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#8f1218";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#24130d";
                      e.currentTarget.style.color = "#ffd54f";
                    }}
                    title="Unlock classified dossier clue for 5 points (-5 PTS)"
                  >
                    <span>{isUnlockingClue ? "DECRYPTING..." : "UNLOCK CLUE"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Navigation & Submission Bar (Exact Hawkins Previous | Next | Submit Report) */}
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
            {/* Left: PREVIOUS and NEXT Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePrevLevel}
                disabled={activeQuestionIdx === 0}
                style={{
                  padding: "10px 16px",
                  background: activeQuestionIdx === 0 ? "transparent" : "#e4dac4",
                  border: "1px solid #b5a48b",
                  borderRadius: "3px",
                  color: activeQuestionIdx === 0 ? "rgba(42, 34, 26, 0.3)" : "#2a221a",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                }}
              >
                PREVIOUS
              </button>

              <button
                type="button"
                onClick={handleNextLevel}
                disabled={activeQuestionIdx === totalQuestionsForTrial - 1}
                style={{
                  padding: "10px 18px",
                  background: activeQuestionIdx === totalQuestionsForTrial - 1 ? "transparent" : "#2e2118",
                  border: "1px solid #573a2e",
                  borderRadius: "3px",
                  color: activeQuestionIdx === totalQuestionsForTrial - 1 ? "#a89d8d" : "#ffffff",
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  cursor: activeQuestionIdx === totalQuestionsForTrial - 1 ? "not-allowed" : "pointer",
                  opacity: activeQuestionIdx === totalQuestionsForTrial - 1 ? 0.6 : 1,
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Next item"
              >
                NEXT
              </button>
            </div>

            {/* Right: SUBMIT REPORT / SUBMIT [X/10] + PROCEED TO NEXT CHAPTER */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSubmitChapter}
                disabled={!allQuestionsAnswered || isSubmittingChapter}
                style={{
                  padding: "10px 24px",
                  background: isChapterSubmitted
                    ? "#234d31"
                    : allQuestionsAnswered
                    ? "#b81d24"
                    : "rgba(139, 126, 109, 0.4)",
                  color: "#ffffff",
                  border: isChapterSubmitted
                    ? "1.5px solid #3d8053"
                    : allQuestionsAnswered
                    ? "1.5px solid #8f1218"
                    : "1px solid #776a5a",
                  borderRadius: "3px",
                  fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                  fontSize: "clamp(12px, 1.3vw, 14px)",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: allQuestionsAnswered && !isSubmittingChapter ? "pointer" : "not-allowed",
                  boxShadow:
                    allQuestionsAnswered && !isChapterSubmitted
                      ? "0 6px 16px rgba(184, 29, 36, 0.5), inset 0 0 10px rgba(0,0,0,0.25)"
                      : "0 2px 6px rgba(0,0,0,0.2)",
                  opacity: allQuestionsAnswered ? 1 : 0.65,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (allQuestionsAnswered && !isChapterSubmitted) e.currentTarget.style.background = "#941319";
                }}
                onMouseLeave={(e) => {
                  if (allQuestionsAnswered && !isChapterSubmitted) e.currentTarget.style.background = "#b81d24";
                }}
              >
                {isSubmittingChapter
                  ? "SUBMITTING REPORT..."
                  : isChapterSubmitted
                  ? `SUBMITTED [${answeredCount}/${totalQuestionsForTrial}]`
                  : allQuestionsAnswered
                  ? "SUBMIT REPORT"
                  : `SUBMIT [${answeredCount}/${totalQuestionsForTrial}]`}
              </button>

              {/* Prominent Next Chapter Redirect Button (displayed when chapter is submitted) */}
              {isChapterSubmitted && (
                <button
                  type="button"
                  onClick={handleProceedNextChapter}
                  style={{
                    padding: "10px 24px",
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

      {/* Intel Clue Clearance & Decryption Modal (Exact Hawkins Style) */}
      <AnimatePresence>
        {intelModal && intelModal.isOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(8, 2, 5, 0.82)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => {
              if (intelModal.onCancel) {
                intelModal.onCancel();
              } else if (intelModal.onConfirm) {
                intelModal.onConfirm();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                background: "linear-gradient(180deg, #18070a 0%, #0c0305 100%)",
                border: `2px solid ${intelModal.type === "warning" ? "#f59e0b" : "#e61a28"}`,
                borderRadius: "6px",
                boxShadow: `${intelModal.type === "warning" ? "0 0 24px rgba(245, 158, 11, 0.4)" : "0 0 24px rgba(230, 26, 40, 0.35)"}, 0 20px 50px rgba(0, 0, 0, 0.9)`,
                padding: "20px 24px 22px",
                boxSizing: "border-box",
                color: "#f3e8dc",
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              {/* Subtle Top Red/Amber Accent Line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${intelModal.type === "warning" ? "#f59e0b" : "#e61a28"}, transparent)`,
                }}
              />

              {/* Subheader Header Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  borderBottom: "1px dashed rgba(255, 255, 255, 0.15)",
                  paddingBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 900,
                    letterSpacing: ".14em",
                    color: intelModal.type === "warning" ? "#f59e0b" : "#e61a28",
                    textTransform: "uppercase",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: intelModal.type === "warning" ? "#f59e0b" : "#e61a28",
                      boxShadow: `0 0 8px ${intelModal.type === "warning" ? "#f59e0b" : "#e61a28"}`,
                      display: "inline-block",
                    }}
                  />
                  <span>CLASSIFIED PROTOCOL // LEVEL 4</span>
                </div>

                <span
                  style={{
                    fontSize: 9.5,
                    color: "rgba(255, 255, 255, 0.4)",
                    fontFamily: "monospace",
                    letterSpacing: ".06em",
                  }}
                >
                  FORM HPD-83
                </span>
              </div>

              {/* Title */}
              <h3
                style={{
                  margin: "0 0 12px",
                  fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                  fontSize: "clamp(15px, 1.4vw, 17px)",
                  color: "#ffffff",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  lineHeight: 1.35,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                {intelModal.title}
              </h3>

              {/* Message Content */}
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13.5px",
                  lineHeight: 1.6,
                  color: "#ded2c4",
                  fontFamily: "'Courier New', Courier, monospace",
                  fontWeight: 600,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {intelModal.message}
              </p>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {intelModal.cancelLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx("click");
                      intelModal.onCancel?.();
                    }}
                    style={{
                      padding: "9px 18px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "#c9bda4",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 3,
                      fontFamily: "'Benguiat Bold', serif",
                      fontSize: 11.5,
                      fontWeight: 800,
                      letterSpacing: ".1em",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textTransform: "uppercase",
                    }}
                  >
                    {intelModal.cancelLabel}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sfx("ok");
                    intelModal.onConfirm?.();
                  }}
                  style={{
                    padding: "9px 22px",
                    background: intelModal.type === "warning" ? "#f59e0b" : "#e61a28",
                    color: intelModal.type === "warning" ? "#000000" : "#ffffff",
                    border: `1.5px solid ${intelModal.type === "warning" ? "#f59e0b" : "#e61a28"}`,
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: ".12em",
                    cursor: "pointer",
                    boxShadow: `0 2px 10px ${intelModal.type === "warning" ? "rgba(245, 158, 11, 0.35)" : "rgba(230, 26, 40, 0.35)"}`,
                    transition: "all 0.15s ease",
                    textTransform: "uppercase",
                  }}
                >
                  {intelModal.confirmLabel || (intelModal.cancelLabel ? "CONFIRM" : "ACKNOWLEDGE")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
