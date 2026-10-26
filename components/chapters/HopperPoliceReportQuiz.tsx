import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useGame } from "@/lib/store";
import { QuizQuestion, STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";
import { subscribe } from "@/lib/realtime";
import QuestionTypeRenderer from "./QuestionTypeRenderer";

interface HopperPoliceReportQuizProps {
  chapterNumber?: number;
  chapterTitle?: string;
  sectionTitle?: string;
  formDocket?: string;
  questions?: QuizQuestion[];
  // Backwards compatible single question props
  options?: { id: string; text: string }[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onSubmit?: () => void;
  onSubmitAll?: (answers: Record<number, string>) => void;
  error?: boolean;
  onOpenLore: () => void;
  points?: number;
  onExitFullScreen?: () => void;
}

export default function HopperPoliceReportQuiz({
  chapterNumber = 1,
  chapterTitle,
  sectionTitle,
  formDocket,
  questions: passedQuestions,
  options: legacyOptions,
  selectedId: legacySelectedId,
  onSelect: legacyOnSelect,
  onSubmit: legacyOnSubmit,
  onSubmitAll,
  error = false,
  onOpenLore,
  points = 200,
  onExitFullScreen,
}: HopperPoliceReportQuizProps) {
  const stageConfig = STAGE_QUIZ_CONFIGS[chapterNumber] || STAGE_QUIZ_CONFIGS[1];

  const questions: QuizQuestion[] =
    passedQuestions ||
    stageConfig?.questions || [
      {
        id: "default-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: SUBLEVEL 04 ANOMALY",
        question:
          "During the covert November 1983 incident at Hawkins National Laboratory, which classified Department of Energy project resulted in the initial psychokinetic rift and the escape of test subjects?",
        options: legacyOptions || [
          { id: "A", text: "Project MKUltra / Sublevel 04" },
          { id: "B", text: "Operation Paperclip / Echo Division" },
          { id: "C", text: "Stargate Surveillance Protocol" },
          { id: "D", text: "Project Blue Book Sub-Archive" },
        ],
        correctAnswerId: "A",
      },
    ];

  const totalQuestions = questions.length;
  const [currentIdx, setCurrentIdx] = useState(0);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestResultsRef = useRef<Record<number, any>>({});
  const { s, unlockHint, isHintUnlocked, score, isPaused, say, showAlert, showConfirm, submitTask } = useGame();
  const teamId = s?.team?.id || "anon";

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`hawkins_quiz_answers_ch${chapterNumber}_${s?.team?.id || "anon"}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    if (legacySelectedId) {
      return { 0: legacySelectedId };
    }
    return {};
  });

  // Track attempts count per question (1st try, 2nd try)
  const [questionAttempts, setQuestionAttempts] = useState<Record<number, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`hawkins_quiz_attempts_ch${chapterNumber}_${s?.team?.id || "anon"}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`hawkins_quiz_answers_ch${chapterNumber}_${s?.team?.id || "anon"}`, JSON.stringify(selectedAnswers));
      } catch {}
    }
  }, [selectedAnswers, chapterNumber, s?.team?.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`hawkins_quiz_attempts_ch${chapterNumber}_${s?.team?.id || "anon"}`, JSON.stringify(questionAttempts));
      } catch {}
    }
  }, [questionAttempts, chapterNumber, s?.team?.id]);

  // Authoritatively restore submissions & locked states from server
  useEffect(() => {
    let active = true;
    const fetchSubmissions = async () => {
      try {
        let token = "";
        try {
          const stored = localStorage.getItem("hawkins-protocol:session");
          if (stored) token = JSON.parse(stored).token || "";
        } catch {}

        const res = await fetch("/api/me/submissions", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (active && data.success && Array.isArray(data.submissions)) {
          const sAnswers: Record<number, string> = {};
          const sAttempts: Record<number, number> = {};
          const sResults: Record<number, any> = {};

          data.submissions.forEach((sub: any) => {
            const subRound = Number(sub.roundId);
            if (subRound === chapterNumber) {
              const qCode = String(sub.questionCode || "").toLowerCase();
              let matchedIdx = -1;
              questions.forEach((q, qIdx) => {
                const alias1 = `ch${chapterNumber}-q${qIdx + 1}`.toLowerCase();
                const alias2 = (q.id || "").toLowerCase();
                if (qCode === alias1 || qCode === alias2 || qCode === String(q.itemNumber)) {
                  matchedIdx = qIdx;
                }
              });

              if (matchedIdx !== -1) {
                if (sub.submittedAnswer) {
                  sAnswers[matchedIdx] = sub.submittedAnswer;
                }
                const attCount = Number(sub.attempts || 1);
                sAttempts[matchedIdx] = attCount;
                const isCorrect = Boolean(sub.isCorrect);
                const isLocked = Boolean(sub.isLocked ?? (isCorrect || attCount >= 2));
                sResults[matchedIdx] = {
                  isCorrect,
                  isLocked,
                  pointsAwarded: Number(sub.pointsAwarded) || 0,
                  attempts: attCount,
                  message: isCorrect
                    ? (attCount <= 1 ? "TELEMETRY VERIFIED · DOCKET ITEM ACCURATE [+20 PTS]" : "TELEMETRY VERIFIED ON SECOND ATTEMPT [+10 PTS]")
                    : (isLocked ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]" : "EVIDENCE DISCREPANCY DETECTED · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)"),
                };
              }
            }
          });

          if (Object.keys(sAnswers).length > 0) {
            setSelectedAnswers((prev) => ({ ...prev, ...sAnswers }));
          } else {
            setSelectedAnswers({});
            try {
              localStorage.removeItem(`hawkins_quiz_answers_ch${chapterNumber}_${s?.team?.id || "anon"}`);
            } catch {}
          }
          if (Object.keys(sAttempts).length > 0) {
            setQuestionAttempts((prev) => ({ ...prev, ...sAttempts }));
          } else {
            setQuestionAttempts({});
            try {
              localStorage.removeItem(`hawkins_quiz_attempts_ch${chapterNumber}_${s?.team?.id || "anon"}`);
            } catch {}
          }
          if (Object.keys(sResults).length > 0) {
            setQuestionResults((prev) => ({ ...prev, ...sResults }));
          } else {
            setQuestionResults({});
            try {
              localStorage.removeItem(`hawkins_quiz_results_ch${chapterNumber}_${s?.team?.id || "anon"}`);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[SUBMISSIONS RESTORE ERROR]", err);
      }
    };

    fetchSubmissions();
    const unsub = subscribe((m: any) => {
      if (m.type === "event_reset") {
        setSelectedAnswers({});
        setQuestionAttempts({});
        setQuestionResults({});
        setCurrentIdx(0);
        try {
          localStorage.removeItem(`hawkins_quiz_answers_ch${chapterNumber}_${s?.team?.id || "anon"}`);
          localStorage.removeItem(`hawkins_quiz_attempts_ch${chapterNumber}_${s?.team?.id || "anon"}`);
          localStorage.removeItem(`hawkins_quiz_results_ch${chapterNumber}_${s?.team?.id || "anon"}`);
        } catch {}
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, [chapterNumber, questions, s?.team?.id]);
  const [unlockingHintKey, setUnlockingHintKey] = useState<string | null>(null);

  const [unansweredPrompt, setUnansweredPrompt] = useState(false);

  const handleExit = () => {
    sfx("click");
    if (allQuestionsDone) {
      handleFinalSubmit();
    }
    if (onExitFullScreen) {
      onExitFullScreen();
    }
  };

  const currentQ = questions[currentIdx] || questions[0];
  const currentSelectedOption = selectedAnswers[currentIdx] || (currentIdx === 0 ? legacySelectedId : null);

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => Boolean(selectedAnswers[Number(k)]?.trim())
  ).length;
  const allQuestionsDone = answeredCount === totalQuestions;
  const isCurrentDone = isPaused;

  const [questionResults, setQuestionResults] = useState<
    Record<number, { isCorrect: boolean; isLocked?: boolean; message: string; pointsAwarded: number; attempts?: number }>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`hawkins_quiz_results_ch${chapterNumber}_${s?.team?.id || "anon"}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  const currentResult = questionResults[currentIdx];
  const currentAttempts = questionAttempts[currentIdx] || 0;

  useEffect(() => {
    latestResultsRef.current = questionResults;
  }, [questionResults]);
  const isCurrentVerified = Boolean(currentResult?.isCorrect);
  const isCurrentLocked = Boolean(
    currentResult?.isLocked ||
    isCurrentVerified ||
    currentAttempts >= 2
  );

  const [isCheckingQuestion, setIsCheckingQuestion] = useState(false);

  const handleOptionClick = useCallback((optId: string, silent = false) => {
    if (isPaused || isCurrentLocked) return;
    if (!silent) sfx("type");
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optId,
    }));
    if (currentIdx === 0 && legacyOnSelect) {
      legacyOnSelect(optId);
    }
    setUnansweredPrompt(false);
  }, [isPaused, isCurrentLocked, currentIdx, legacyOnSelect]);

  // Ensure verified questions are reflected in global score and navigation bar
  useEffect(() => {
    if (!submitTask) return;
    Object.entries(questionResults).forEach(([idxStr, res]) => {
      const idx = Number(idxStr);
      if (res?.isCorrect) {
        const qTaskId = `ch${chapterNumber}-q${idx + 1}`;
        const earned = typeof res.pointsAwarded === "number" ? res.pointsAwarded : 10;
        if (earned > 0 && (!s.taskScores || !s.taskScores[qTaskId])) {
          submitTask(
            qTaskId,
            earned,
            `Chapter ${chapterNumber} Item ${idx + 1} Telemetry Solved`,
            true
          );
        }
      }
    });
  }, [chapterNumber, questionResults, s.taskScores, submitTask]);

  const handleCheckCurrentQuestion = async () => {
    if (isPaused) {
      say?.("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    if (isCurrentLocked) {
      sfx("err");
      return;
    }
    const chosen = selectedAnswers[currentIdx];
    if (!chosen || !chosen.trim()) {
      sfx("err");
      setUnansweredPrompt(true);
      return;
    }

    const priorAttempts = questionAttempts[currentIdx] || 0;
    const thisAttemptNumber = priorAttempts + 1;

    setIsCheckingQuestion(true);
    setUnansweredPrompt(false);

    const qCode = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
    try {
      let token = "";
      try {
        const stored = localStorage.getItem("hawkins-protocol:session");
        if (stored) token = JSON.parse(stored).token || "";
      } catch {}

      const res = await fetch(`/api/questions/${encodeURIComponent(qCode)}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          answer: chosen,
          teamId,
          attemptNumber: thisAttemptNumber,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const isCorrect = Boolean(data.isCorrect);
        const isLocked = Boolean(data.isLocked ?? (isCorrect || thisAttemptNumber >= 2));
        const pts = typeof data.pointsAwarded === "number"
          ? data.pointsAwarded
          : isCorrect
          ? (thisAttemptNumber === 1 ? 20 : 10)
          : 0;

        if (isCorrect) {
          sfx("ok");
        } else {
          sfx("err");
        }

        // Award and persist points immediately to navigation bar & backend
        if (isCorrect && pts > 0 && submitTask) {
          const questionTaskId = `ch${chapterNumber}-q${currentIdx + 1}`;
          submitTask(
            questionTaskId,
            pts,
            `Chapter ${chapterNumber} Item ${currentIdx + 1} Telemetry Solved`,
            true
          );
        }

        setQuestionAttempts((prev) => ({
          ...prev,
          [currentIdx]: thisAttemptNumber,
        }));

        // If all questions are now answered and verified, automatically submit report and close section
        const willBeAllDone = questions.every((_, idx) => {
          if (idx === currentIdx) return true;
          return Boolean(selectedAnswers[idx]?.trim());
        });
        const willBeAllChecked = questions.every((_, idx) => {
          if (idx === currentIdx) return isCorrect || isLocked || thisAttemptNumber >= 2;
          const r = questionResults[idx];
          const a = questionAttempts[idx] || 0;
          return r?.isCorrect || r?.isLocked || a >= 2;
        });

        setQuestionResults((prev) => {
          const updated = {
            ...prev,
            [currentIdx]: {
              isCorrect,
              isLocked,
              message: data.message || (
                isCorrect
                  ? (thisAttemptNumber === 1 ? "VERIFIED [+20 PTS]" : "VERIFIED [+10 PTS]")
                  : isLocked
                  ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                  : "INCORRECT · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)"
              ),
              pointsAwarded: pts,
              attempts: thisAttemptNumber,
            },
          };
          latestResultsRef.current = updated;
          try {
            localStorage.setItem(
              `hawkins_quiz_results_ch${chapterNumber}_${s?.team?.id || "anon"}`,
              JSON.stringify(updated)
            );
          } catch {}
          return updated;
        });

        // Auto-advance to next question if answered correctly or attempts are exhausted
        const isQuestionDone = isCorrect || isLocked || thisAttemptNumber >= 2;
        if (isQuestionDone) {
          if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
          }
          autoAdvanceTimerRef.current = setTimeout(() => {
            setCurrentIdx((prevIdx) => {
              if (prevIdx < totalQuestions - 1) {
                sfx("click");
                return prevIdx + 1;
              }
              // If currently at the last question, look for any earlier skipped or unfinished question
              const resultsSnapshot = latestResultsRef.current;
              const firstUnfinished = questions.findIndex((_, idx) => {
                if (idx === prevIdx) return false;
                const r = resultsSnapshot[idx];
                const a = (idx === currentIdx ? thisAttemptNumber : questionAttempts[idx]) || 0;
                return !(r?.isCorrect || r?.isLocked || a >= 2);
              });
              if (firstUnfinished !== -1) {
                sfx("click");
                return firstUnfinished;
              }
              return prevIdx;
            });
            setUnansweredPrompt(false);
          }, 1000);
        }
      } else {
        sfx("err");
        say?.(data.message || "COMMUNICATION FAILURE: Central server rejected submission.");
      }
    } catch (e) {
      sfx("err");
      say?.("TRANSMISSION ERROR: Central server unreachable.");
    } finally {
      setIsCheckingQuestion(false);
    }
  };

  const isTabUnlocked = (_idx: number) => true;

  const handleNext = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    sfx("click");
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((i) => i + 1);
      setUnansweredPrompt(false);
    }
  };

  const handlePrev = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    sfx("click");
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setUnansweredPrompt(false);
    }
  };

  const handleFinalSubmit = useCallback(() => {
    if (isPaused) {
      say?.("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    if (!allQuestionsDone) {
      sfx("err");
      setUnansweredPrompt(true);
      return;
    }
    sfx("ok");
    const completeAnswers: Record<number, string> = { ...selectedAnswers };
    for (let i = 0; i < totalQuestions; i++) {
      if (!completeAnswers[i]) {
        completeAnswers[i] = "";
      }
    }
    setSelectedAnswers(completeAnswers);

    if (onSubmitAll) {
      onSubmitAll(completeAnswers);
    } else if (legacyOnSubmit) {
      legacyOnSubmit();
    }
  }, [isPaused, allQuestionsDone, totalQuestions, selectedAnswers, onSubmitAll, legacyOnSubmit, say]);

  const activeDocket =
    formDocket ||
    stageConfig?.docketNumber ||
    `FORM HPD-0${chapterNumber}-83 // CLASSIFIED INCIDENT DOCKET`;

  const activeSectionTitle =
    sectionTitle ||
    stageConfig?.sectionHeader ||
    `SECTION 0${chapterNumber} ÔÇö FORMAL INQUIRY // HAWKINS ANOMALY`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 64px)",
        height: "auto",
        flex: "1 0 auto",
        flexShrink: 0,
        padding: 0,
        margin: 0,
        background: "#f4eedf",
        backgroundImage:
          "radial-gradient(#e4dac5 1px, transparent 1px), radial-gradient(#dcd0ba 1px, transparent 1px)",
        backgroundSize: "20px 20px, 40px 40px",
        backgroundPosition: "0 0, 20px 20px",
        backgroundAttachment: "fixed",
        backgroundRepeat: "repeat",
        fontFamily: "'Courier New', Courier, monospace",
        color: "#231e1a",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ÔöÇÔöÇÔöÇ THE PHYSICAL POLICE INCIDENT REPORT PAPER ÔöÇÔöÇÔöÇ */}
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.55 }}
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
        {/* ÔöÇÔöÇÔöÇ BOX TOP CONTROLS: CASE BRIEFING & CROSS EXIT BUTTON ÔöÇÔöÇÔöÇ */}
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
            onClick={onOpenLore}
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
            title="Open Chapter Dossier & Briefing"
          >
            <span>CASE BRIEFING</span>
          </button>

          {/* Cross Exit Button inside the box */}
          {onExitFullScreen && (
            <button
              type="button"
              onClick={handleExit}
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
              title="Return to Evidence Board"
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
          )}
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

        {/* ÔöÇÔöÇÔöÇ MULTI-QUESTION PAGING INDEX TABS ÔöÇÔöÇÔöÇ */}
        {totalQuestions > 1 && (
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
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const hasAnswer = Boolean(selectedAnswers[idx]?.trim());
                const res = questionResults[idx];
                const attempts = questionAttempts[idx] || 0;
                const isVerified = Boolean(res?.isCorrect);
                const isLocked = Boolean(res?.isLocked || (attempts >= 2 && res && !res.isCorrect));
                const isFailed = Boolean(res && !res.isCorrect && isLocked);
                const isAttempt1Wrong = Boolean(res && !res.isCorrect && !isLocked);

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => {
                      if (autoAdvanceTimerRef.current) {
                        clearTimeout(autoAdvanceTimerRef.current);
                        autoAdvanceTimerRef.current = null;
                      }
                      sfx("click");
                      setCurrentIdx(idx);
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
                    }}
                    title={`Item ${idx + 1}`}
                  >
                    <span>
                      ITEM {idx + 1}
                      {isVerified ? ` [+${res?.pointsAwarded || (attempts === 2 ? 5 : 10)}]` : isFailed ? " [0P]" : isAttempt1Wrong ? " [5P]" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ÔöÇÔöÇÔöÇ SECTION DYNAMIC: THE INCIDENT STATEMENT & QUERY ÔöÇÔöÇÔöÇ */}
        <div
          key={`question-${currentIdx}`}
          style={{ marginBottom: 12 }}
        >
            {/* Specialized Question Formation by Stage */}
            <QuestionTypeRenderer
              key={currentQ.id || `q-${currentIdx}`}
              question={currentQ}
              selectedAnswer={currentSelectedOption}
              onSelectOption={handleOptionClick}
              isVecnaMode={false}
              disabled={isCurrentDone || isCurrentLocked}
              questionIndex={currentIdx}
              isVerified={isCurrentVerified}
              isLocked={isCurrentLocked}
            />

            {/* In-Question Submit & Check Action Bar (Submits without going back) */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                padding: "8px 14px",
                background: isCurrentVerified
                  ? "rgba(38, 166, 91, 0.12)"
                  : isCurrentLocked
                  ? "rgba(184, 29, 36, 0.15)"
                  : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                  ? "rgba(217, 119, 6, 0.14)"
                  : "rgba(0, 0, 0, 0.04)",
                border: isCurrentVerified
                  ? "1.5px solid #27ae60"
                  : isCurrentLocked
                  ? "1.5px solid #b81d24"
                  : currentAttempts === 1 && currentResult && !currentResult.isCorrect
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
                    color: isCurrentVerified
                      ? "#1b7a41"
                      : isCurrentLocked
                      ? "#9e151b"
                      : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                      ? "#b45309"
                      : "#544638",
                  }}
                >
                  {isCurrentVerified
                    ? `VERIFIED [+${currentResult?.pointsAwarded || (currentAttempts === 2 ? 10 : 20)} PTS]`
                    : isCurrentLocked
                    ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                    : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                    ? "INCORRECT · VALUE REDUCED TO 10 PTS (1 ATTEMPT REMAINING)"
                    : selectedAnswers[currentIdx]
                    ? (currentAttempts === 1 ? "ANSWER RECORDED [10 PTS]" : "ANSWER RECORDED [20 PTS]")
                    : (currentAttempts === 1 ? "SELECT ANSWER [10 PTS]" : "SELECT ANSWER [20 PTS]")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckCurrentQuestion}
                disabled={isCheckingQuestion || !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked}
                style={{
                  padding: "8px 20px",
                  background: isCheckingQuestion
                    ? "#332219"
                    : isCurrentVerified
                    ? "#234d31"
                    : isCurrentLocked
                    ? "#2c1515"
                    : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                    ? "#5c330a"
                    : "#24130d",
                  color: "#ffffff",
                  border: isCurrentVerified
                    ? "1.5px solid #3d8053"
                    : isCurrentLocked
                    ? "1.5px solid #7d2a2a"
                    : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                    ? "1.5px solid #d97706"
                    : "1.5px solid #8f2d24",
                  borderRadius: 3,
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".12em",
                  cursor: isCheckingQuestion || !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked ? "not-allowed" : "pointer",
                  opacity: !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked ? 0.6 : 1,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                {isCheckingQuestion
                  ? "CHECKING..."
                  : isCurrentVerified
                  ? "VERIFIED"
                  : isCurrentLocked
                  ? "LOCKED"
                  : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                  ? "CHECK ANSWER (10 PTS - RETRY)"
                  : "CHECK ANSWER (20 PTS)"}
              </button>
            </div>

            {currentQ.hint && (() => {
              const currentHintKey = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
              const isCurrentHintUnlocked = isHintUnlocked(currentHintKey);
              const isUnlocking = unlockingHintKey === currentHintKey;

              const handleUnlockHint = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isUnlocking) return;
                if (score < 10) {
                  showAlert(
                    "You need at least 10 squad points to decrypt this classified Intel Clue. Complete tasks or submit accurate answers to earn points.",
                    {
                      title: "CLEARANCE RESTRICTED // INSUFFICIENT SCORE",
                      confirmLabel: "ACKNOWLEDGE",
                      type: "warning",
                    }
                  );
                  return;
                }
                showConfirm(
                  "Decrypt classified surveillance dossier? This action will deduct 10 points from your current squad score.",
                  () => {
                    setUnlockingHintKey(currentHintKey);
                    unlockHint(currentHintKey, 10);
                    setTimeout(() => {
                      setUnlockingHintKey(null);
                    }, 400);
                  },
                  {
                    title: "CLASSIFIED INTEL DOSSIER DECRYPTION",
                    confirmLabel: "DECRYPT CLUE (-10 PTS)",
                    cancelLabel: "ABORT",
                    type: "warning",
                  }
                );
              };

              return (
                <div
                  style={{
                    marginTop: 8,
                    background: isCurrentHintUnlocked ? "#fbf6ec" : "#ece3d0",
                    border: isCurrentHintUnlocked ? "1.5px solid #c49646" : "1.5px dashed #a8947c",
                    borderRadius: 3,
                    padding: "6px 12px",
                    boxShadow: isCurrentHintUnlocked
                      ? "0 2px 8px rgba(212, 167, 89, 0.2), inset 0 0 10px rgba(255,255,255,0.6)"
                      : "inset 0 0 8px rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isCurrentHintUnlocked ? (
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
                        <b>SURVEILLANCE CLUE:</b> &quot;{currentQ.hint}&quot;
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
                          ÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûêÔûê
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleUnlockHint}
                        disabled={isUnlocking}
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
                        title="Unlock classified dossier clue for 10 points (-10 PTS)"
                      >
                        <span>{isUnlocking ? "DECRYPTING..." : "UNLOCK CLUE"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>


        {/* ÔöÇÔöÇÔöÇ UNANSWERED WARNING PROMPT ÔöÇÔöÇÔöÇ */}
        <AnimatePresence>
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
              PLEASE RECORD AN ANSWER FOR ITEM {currentIdx + 1} BEFORE SUBMITTING REPORT
            </motion.div>
          )}
        </AnimatePresence>

        {/* ÔöÇÔöÇÔöÇ ERROR REJECTION STAMP ÔöÇÔöÇÔöÇ */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ scale: 1.15, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: -2 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: 18,
                padding: "12px 18px",
                background: "rgba(184, 29, 36, 0.12)",
                border: "3px dashed #b81d24",
                color: "#990f16",
                textAlign: "center",
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: ".14em",
                fontFamily: "'Benguiat Bold', serif",
                textTransform: "uppercase",
              }}
            >
              [REJECTED: INCONSISTENT TESTIMONY ┬À RECORD DOES NOT MATCH LAB SURVEILLANCE]
            </motion.div>
          )}
        </AnimatePresence>

        {/* ÔöÇÔöÇÔöÇ FOOTER NAVIGATION & SUBMIT BUTTONS ÔöÇÔöÇÔöÇ */}
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
          {/* Previous / Next Paging Controls */}
          {totalQuestions > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIdx === 0}
                style={{
                  padding: "10px 16px",
                  background: currentIdx === 0 ? "transparent" : "#e4dac4",
                  color: currentIdx === 0 ? "#a89d8d" : "#2a221a",
                  border: "1px solid #b5a48b",
                  borderRadius: 3,
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: 12,
                  letterSpacing: ".1em",
                  cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                PREVIOUS
              </button>

              {currentIdx < totalQuestions - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
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
                  title="Next question"
                >
                  NEXT
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Final Submit Button */}
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={!allQuestionsDone || isPaused}
            style={{
              padding: "10px 24px",
              background: isPaused ? "#443a34" : allQuestionsDone ? "#b81d24" : "#8c7b68",
              color: "#fff",
              border: isPaused ? "1.5px solid #665245" : allQuestionsDone ? "1.5px solid #8f1218" : "1px solid #776a5a",
              borderRadius: 3,
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontWeight: 900,
              fontSize: "clamp(13px, 1.4vw, 15px)",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              cursor: allQuestionsDone && !isPaused ? "pointer" : "not-allowed",
              opacity: allQuestionsDone && !isPaused ? 1 : 0.65,
              boxShadow: allQuestionsDone && !isPaused
                ? "0 6px 16px rgba(184, 29, 36, 0.5), inset 0 0 10px rgba(0,0,0,0.25)"
                : "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (allQuestionsDone && !isPaused) e.currentTarget.style.background = "#941319";
            }}
            onMouseLeave={(e) => {
              if (allQuestionsDone && !isPaused) e.currentTarget.style.background = "#b81d24";
            }}
          >
            {isPaused
              ? "PAUSED"
              : allQuestionsDone
              ? "SUBMIT REPORT"
              : `SUBMIT [${answeredCount}/${totalQuestions}]`}
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes spinReel {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
