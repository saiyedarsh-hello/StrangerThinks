import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useGame } from "@/lib/store";
import { QuizQuestion, STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";
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
  points = 50,
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
  const { s, unlockHint, isHintUnlocked, score, isPaused, say, showAlert, showConfirm } = useGame();
  const teamId = s?.team?.id || "anon";

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
  const [unlockingHintKey, setUnlockingHintKey] = useState<string | null>(null);

  const [unansweredPrompt, setUnansweredPrompt] = useState(false);

  const handleExit = () => {
    sfx("click");
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
  const isCurrentVerified = Boolean(currentResult?.isCorrect);
  const isCurrentLocked = Boolean(
    currentResult?.isLocked ||
    isCurrentVerified ||
    (currentAttempts >= 2 && currentResult && !currentResult.isCorrect)
  );

  const [isCheckingQuestion, setIsCheckingQuestion] = useState(false);

  const handleOptionClick = (optId: string, silent = false) => {
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
  };

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
          ? (thisAttemptNumber === 1 ? 10 : 5)
          : 0;

        if (isCorrect) {
          sfx("ok");
        } else {
          sfx("err");
        }

        setQuestionAttempts((prev) => ({
          ...prev,
          [currentIdx]: thisAttemptNumber,
        }));

        setQuestionResults((prev) => {
          const updated = {
            ...prev,
            [currentIdx]: {
              isCorrect,
              isLocked,
              message: data.message || (
                isCorrect
                  ? (thisAttemptNumber === 1 ? "VERIFIED [+10 PTS]" : "VERIFIED [+5 PTS]")
                  : isLocked
                  ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                  : "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)"
              ),
              pointsAwarded: pts,
              attempts: thisAttemptNumber,
            },
          };
          try {
            localStorage.setItem(
              `hawkins_quiz_results_ch${chapterNumber}_${s?.team?.id || "anon"}`,
              JSON.stringify(updated)
            );
          } catch {}
          return updated;
        });
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
    sfx("click");
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((i) => i + 1);
      setUnansweredPrompt(false);
    }
  };

  const handlePrev = () => {
    sfx("click");
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setUnansweredPrompt(false);
    }
  };

  const handleFinalSubmit = () => {
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
  };

  const activeDocket =
    formDocket ||
    stageConfig?.docketNumber ||
    `FORM HPD-0${chapterNumber}-83 // CLASSIFIED INCIDENT DOCKET`;

  const activeSectionTitle =
    sectionTitle ||
    stageConfig?.sectionHeader ||
    `SECTION 0${chapterNumber} — FORMAL INQUIRY // HAWKINS ANOMALY`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 64px)",
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
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
      {/* ─── THE PHYSICAL POLICE INCIDENT REPORT PAPER ─── */}
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
          padding: "8px clamp(12px, 2.5vw, 24px) 12px",
          position: "relative",
          boxSizing: "border-box",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ─── BOX TOP CONTROLS: CASE BRIEFING & CROSS EXIT BUTTON ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
            paddingBottom: 4,
            borderBottom: "1.5px dashed #c9bda4",
            gap: 10,
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Manila Case Briefing Button inside the box */}
          <button
            type="button"
            onClick={onOpenLore}
            style={{
              padding: "4px 10px",
              background: "#d4a759",
              color: "#1a0f05",
              border: "1.5px solid #946f29",
              borderRadius: 3,
              fontFamily: "'Benguiat Bold', serif",
              fontWeight: 800,
              fontSize: 10.5,
              letterSpacing: ".1em",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
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

        {/* ─── MULTI-QUESTION PAGING INDEX TABS ─── */}
        {totalQuestions > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
              padding: "3px 8px",
              background: "#e4dac5",
              border: "1px solid #c9bda4",
              borderRadius: 3,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "nowrap",
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: 2,
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
                      sfx("click");
                      setCurrentIdx(idx);
                      setUnansweredPrompt(false);
                    }}
                    style={{
                      padding: "2px 7px",
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

        {/* ─── SECTION DYNAMIC: THE INCIDENT STATEMENT & QUERY ─── */}
        <div
          key={`question-${currentIdx}`}
          style={{ marginBottom: 6 }}
        >
            {/* Specialized Question Formation by Stage */}
            <QuestionTypeRenderer
              key={currentQ.id || `q-${currentIdx}`}
              question={currentQ}
              selectedAnswer={currentSelectedOption}
              onSelectOption={(optId, silent) => handleOptionClick(optId, silent)}
              isVecnaMode={false}
              disabled={isCurrentDone || isCurrentLocked}
              questionIndex={currentIdx}
              isVerified={isCurrentVerified}
              isLocked={isCurrentLocked}
            />

            {/* In-Question Submit & Check Action Bar (Submits without going back) */}
            <div
              style={{
                marginTop: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 6,
                padding: "5px 12px",
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
                    ? `VERIFIED [+${currentResult?.pointsAwarded || (currentAttempts === 2 ? 5 : 10)} PTS]`
                    : isCurrentLocked
                    ? "TERMINAL LOCKED · 2/2 ATTEMPTS EXHAUSTED [0 PTS]"
                    : currentAttempts === 1 && currentResult && !currentResult.isCorrect
                    ? "INCORRECT · VALUE REDUCED TO 5 PTS (1 ATTEMPT REMAINING)"
                    : selectedAnswers[currentIdx]
                    ? (currentAttempts === 1 ? "ANSWER RECORDED [5 PTS]" : "ANSWER RECORDED [10 PTS]")
                    : (currentAttempts === 1 ? "SELECT ANSWER [5 PTS]" : "SELECT ANSWER [10 PTS]")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckCurrentQuestion}
                disabled={isCheckingQuestion || !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked}
                style={{
                  padding: "5px 14px",
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
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".1em",
                  cursor: isCheckingQuestion || !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked ? "not-allowed" : "pointer",
                  opacity: !selectedAnswers[currentIdx]?.trim() || isPaused || isCurrentLocked ? 0.6 : 1,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
                  ? "CHECK ANSWER (5 PTS)"
                  : "CHECK ANSWER"}
              </button>
            </div>

            {currentQ.hint && (() => {
              const currentHintKey = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
              const isCurrentHintUnlocked = isHintUnlocked(currentHintKey);
              const isUnlocking = unlockingHintKey === currentHintKey;

              const handleUnlockHint = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isUnlocking) return;
                if (score < 5) {
                  showAlert(
                    "You need at least 5 squad points to decrypt this classified Intel Clue. Complete tasks or submit accurate answers to earn points.",
                    {
                      title: "CLEARANCE RESTRICTED // INSUFFICIENT SCORE",
                      confirmLabel: "ACKNOWLEDGE",
                      type: "warning",
                    }
                  );
                  return;
                }
                showConfirm(
                  "Decrypt classified surveillance dossier? This action will deduct 5 points from your current squad score.",
                  () => {
                    setUnlockingHintKey(currentHintKey);
                    unlockHint(currentHintKey, 5);
                    setTimeout(() => {
                      setUnlockingHintKey(null);
                    }, 400);
                  },
                  {
                    title: "CLASSIFIED INTEL DOSSIER DECRYPTION",
                    confirmLabel: "DECRYPT CLUE (-5 PTS)",
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
                          ██████████████████████████████████████
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
                        title="Unlock classified dossier clue for 5 points (-5 PTS)"
                      >
                        <span>{isUnlocking ? "DECRYPTING..." : "UNLOCK CLUE"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>


        {/* ─── UNANSWERED WARNING PROMPT ─── */}
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

        {/* ─── ERROR REJECTION STAMP ─── */}
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
              [REJECTED: INCONSISTENT TESTIMONY · RECORD DOES NOT MATCH LAB SURVEILLANCE]
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── FOOTER NAVIGATION & SUBMIT BUTTONS ─── */}
        <div
          style={{
            borderTop: "1.5px solid #2a221a",
            paddingTop: 6,
            paddingBottom: 2,
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Previous / Next Paging Controls */}
          {totalQuestions > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIdx === 0}
                style={{
                  padding: "6px 12px",
                  background: currentIdx === 0 ? "transparent" : "#e4dac4",
                  color: currentIdx === 0 ? "#a89d8d" : "#2a221a",
                  border: "1px solid #b5a48b",
                  borderRadius: 3,
                  fontFamily: "'Benguiat Bold', serif",
                  fontSize: 11,
                  letterSpacing: ".08em",
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
                    padding: "6px 14px",
                    background: "#2e2118",
                    color: "#fff",
                    border: "1px solid #573a2e",
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: 11,
                    letterSpacing: ".08em",
                    cursor: "pointer",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
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
              padding: "6px 18px",
              background: isPaused ? "#443a34" : allQuestionsDone ? "#b81d24" : "#8c7b68",
              color: "#fff",
              border: isPaused ? "1.5px solid #665245" : allQuestionsDone ? "1.5px solid #8f1218" : "1px solid #776a5a",
              borderRadius: 3,
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              cursor: allQuestionsDone && !isPaused ? "pointer" : "not-allowed",
              opacity: allQuestionsDone && !isPaused ? 1 : 0.65,
              boxShadow: allQuestionsDone && !isPaused
                ? "0 4px 12px rgba(184, 29, 36, 0.4), inset 0 0 8px rgba(0,0,0,0.2)"
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
