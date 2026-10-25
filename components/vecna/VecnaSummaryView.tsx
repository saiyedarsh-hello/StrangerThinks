"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { QuizQuestion } from "@/lib/chapterQuestions";
import { useGame } from "@/lib/store";

export interface VecnaSummaryViewProps {
  trial: {
    id: number;
    title: string;
    subtitle: string;
    powersGranted: string;
    points?: number;
  };
  questions: QuizQuestion[];
  solvedQuestions: Record<string, boolean>;
  failedQuestions: Record<string, boolean>;
  attemptedQuestions?: Record<string, boolean>;
  selectedAnswers: Record<string, string>;
  onBackToBoard: () => void;
  onReviewQuestions: () => void;
}

export default function VecnaSummaryView({
  trial,
  questions = [],
  solvedQuestions = {},
  failedQuestions = {},
  attemptedQuestions = {},
  selectedAnswers = {},
  onBackToBoard,
  onReviewQuestions,
}: VecnaSummaryViewProps) {
  const { s, session } = useGame();
  const [showLore, setShowLore] = useState(true);

  // Calculate statistics for this trial
  const totalQuestions = questions.length || 10;
  let solvedCount = 0;
  let totalPointsEarned = 0;

  questions.forEach((q, idx) => {
    const k = `${trial.id}-${idx}`;
    const isSolved = Boolean(solvedQuestions[k]);
    if (isSolved) {
      solvedCount += 1;
      const isSecondAttempt = Boolean(attemptedQuestions[k]);
      totalPointsEarned += isSecondAttempt ? 10 : 20;
    }
  });

  const maxPoints = trial.points || totalQuestions * 20;
  const accuracyPct = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 100;

  const handleReturn = () => {
    sfx("click");
    onBackToBoard();
  };

  const handleReview = () => {
    sfx("click");
    onReviewQuestions();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 65px)",
        padding: "clamp(16px, 3vw, 40px) clamp(14px, 4vw, 48px)",
        background: "transparent",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Dossier Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "100%",
          maxWidth: 960,
          background: "linear-gradient(180deg, #18090d 0%, #100508 100%)",
          border: "2px solid #b71c1c",
          borderRadius: 4,
          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.85), 0 0 40px rgba(183, 28, 28, 0.35), inset 0 0 30px rgba(80, 0, 10, 0.3)",
          padding: "clamp(20px, 3.5vw, 42px)",
          position: "relative",
          boxSizing: "border-box",
          color: "#f3e8e8",
          fontFamily: '"Share Tech Mono", monospace',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1.5px solid rgba(183, 28, 28, 0.6)",
            paddingBottom: 16,
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".22em",
                color: "#ff7961",
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              HAWKINS NATIONAL LABORATORY // UPSIDE DOWN SECTOR DOSSIER
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 900,
                color: "#ff3b30",
                letterSpacing: ".04em",
                textShadow: "0 0 14px rgba(255, 59, 48, 0.6)",
              }}
            >
              SECTOR 0{trial.id}: {trial.title}
            </h1>
            <div
              style={{
                fontSize: "12px",
                color: "#e0b0b0",
                letterSpacing: ".12em",
                marginTop: 6,
              }}
            >
              {trial.subtitle} // VECNA PROTOCOL // AGENT: {s.team?.name || session?.teamName || "HENRY CREEL"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReturn}
            title="Return to Sector Grid"
            style={{
              background: "rgba(183, 28, 28, 0.15)",
              border: "1.5px solid #b71c1c",
              borderRadius: 3,
              padding: "7px 16px",
              cursor: "pointer",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "13px",
              fontWeight: 900,
              color: "#ff8080",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              boxShadow: "0 0 10px rgba(183, 28, 28, 0.25)",
            }}
          >
            <span>✕</span>
            <span>CLOSE</span>
          </button>
        </div>

        {/* Big Stamped Summary Stats Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            background: "rgba(35, 10, 15, 0.6)",
            border: "1.5px dashed rgba(255, 60, 60, 0.5)",
            padding: "20px 24px",
            marginBottom: 28,
            position: "relative",
            borderRadius: 4,
          }}
        >
          {/* Status Stamp */}
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              border: "3px solid #ff3b30",
              color: "#ff3b30",
              padding: "4px 14px",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: ".18em",
              transform: "rotate(-4deg)",
              userSelect: "none",
              pointerEvents: "none",
              textShadow: "0 0 8px rgba(255, 59, 48, 0.8)",
              boxShadow: "0 0 12px rgba(255, 59, 48, 0.4)",
            }}
          >
            BREACH CONFIRMED
          </div>

          {/* Metric 1: Points */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#ff8a80",
                fontWeight: 900,
              }}
            >
              TELEMETRY HARVESTED
            </div>
            <div
              style={{
                fontSize: "clamp(26px, 3.5vw, 36px)",
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontWeight: 900,
                color: "#ff5252",
                marginTop: 4,
                textShadow: "0 0 14px rgba(255, 82, 82, 0.5)",
              }}
            >
              +{totalPointsEarned} <span style={{ fontSize: "16px", color: "#e0a0a0" }}>/ {maxPoints} PTS</span>
            </div>
          </div>

          {/* Metric 2: Accuracy */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#ff8a80",
                fontWeight: 900,
              }}
            >
              OVERRIDE ACCURACY
            </div>
            <div
              style={{
                fontSize: "clamp(22px, 3vw, 30px)",
                fontFamily: '"Share Tech Mono", monospace',
                fontWeight: 900,
                color: "#ffffff",
                marginTop: 4,
              }}
            >
              {solvedCount} / {totalQuestions} <span style={{ fontSize: "14px", color: "#ff8a80" }}>RESOLVED ({accuracyPct}%)</span>
            </div>
          </div>

          {/* Metric 3: Power Unlocked */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#ff8a80",
                fontWeight: 900,
              }}
            >
              POWER UNLOCKED
            </div>
            <div
              style={{
                fontSize: "16px",
                fontFamily: '"Share Tech Mono", monospace',
                fontWeight: 900,
                color: "#4ade80",
                marginTop: 8,
                letterSpacing: "0.08em",
                textShadow: "0 0 10px rgba(74, 222, 128, 0.4)",
              }}
            >
              {trial.powersGranted}
            </div>
          </div>
        </div>

        {/* Section: Question-by-Question Breakdown */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1.5px solid rgba(183, 28, 28, 0.5)",
              paddingBottom: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontWeight: 900,
                letterSpacing: ".15em",
                color: "#ff5252",
                textTransform: "uppercase",
              }}
            >
              SECTOR TELEMETRY LEDGER // OVERRIDE VERIFICATION
            </span>
            <span style={{ fontSize: "12px", color: "#ff8a80", letterSpacing: ".1em" }}>
              {solvedCount} SOLVED · {totalQuestions - solvedCount} FAILED
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, idx) => {
              const k = `${trial.id}-${idx}`;
              const isSolved = Boolean(solvedQuestions[k]);
              const isFailed = Boolean(failedQuestions[k]);
              const userAns = selectedAnswers[k];
              const isSecondAttempt = Boolean(attemptedQuestions[k]);
              const pointsEarned = isSolved ? (isSecondAttempt ? 10 : 20) : 0;

              let displayAnswer = userAns || "— NO VECTOR SELECTED —";
              if (q.options && q.options.length > 0 && userAns) {
                const matchedOption = q.options.find(
                  (opt) => String(opt.id).trim().toUpperCase() === String(userAns).trim().toUpperCase()
                );
                if (matchedOption) {
                  displayAnswer = `[OPTION ${matchedOption.id}] ${matchedOption.text}`;
                }
              }

              return (
                <div
                  key={q.id || idx}
                  style={{
                    background: isSolved
                      ? "rgba(16, 60, 24, 0.25)"
                      : isFailed
                      ? "rgba(80, 10, 16, 0.25)"
                      : "rgba(30, 10, 15, 0.2)",
                    border: isSolved
                      ? "1.5px solid #2e7d32"
                      : isFailed
                      ? "1.5px solid #b71c1c"
                      : "1.5px solid rgba(183, 28, 28, 0.3)",
                    borderRadius: 3,
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "13px",
                          letterSpacing: ".1em",
                          color: "#ff5252",
                        }}
                      >
                        LEVEL #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      {q.docketTag && (
                        <span
                          style={{
                            fontSize: "11px",
                            background: "rgba(183, 28, 28, 0.25)",
                            border: "1px solid rgba(183, 28, 28, 0.5)",
                            padding: "2px 8px",
                            borderRadius: 2,
                            color: "#ff8a80",
                            letterSpacing: ".08em",
                          }}
                        >
                          {q.docketTag}
                        </span>
                      )}
                    </div>

                    {/* Result Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 900,
                          color: isSolved ? "#4ade80" : "#ff5252",
                          letterSpacing: ".1em",
                        }}
                      >
                        {isSolved ? `+${pointsEarned} PTS` : "0 PTS"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          padding: "3px 10px",
                          borderRadius: 2,
                          letterSpacing: ".1em",
                          background: isSolved
                            ? "#1b5e20"
                            : isFailed
                            ? "#b71c1c"
                            : "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                        }}
                      >
                        {isSolved
                          ? isSecondAttempt
                            ? "✔ OVERRIDE (ATTEMPT 2)"
                            : "✔ OVERRIDE CONFIRMED"
                          : isFailed
                          ? "✖ VECTOR FAILED"
                          : "— UNATTEMPTED"}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#f5e8e8",
                      lineHeight: 1.5,
                      letterSpacing: ".02em",
                    }}
                  >
                    {q.question}
                  </div>

                  {/* User Answer Recorded */}
                  <div
                    style={{
                      fontSize: "12px",
                      color: isSolved ? "#a7f3d0" : "#fca5a5",
                      letterSpacing: ".04em",
                      background: "rgba(0, 0, 0, 0.3)",
                      padding: "6px 12px",
                      borderRadius: 2,
                      borderLeft: isSolved ? "3px solid #10b981" : "3px solid #ef4444",
                    }}
                  >
                    <span style={{ color: "#e0a0a0", fontWeight: "bold" }}>TELEMETRY TRANSMITTED: </span>
                    {displayAnswer}
                  </div>

                  {/* Hint / Explanation if available */}
                  {(isSolved || isFailed) && q.hint && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#fecdd3",
                        background: "rgba(183, 28, 28, 0.1)",
                        padding: "6px 12px",
                        borderRadius: 2,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ color: "#ff8a80", fontWeight: "bold" }}>INTEL RECORD: </span>
                      {q.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Return to Sector Grid or Review Questions */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            paddingTop: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleReturn}
            style={{
              background: "#b71c1c",
              color: "#ffffff",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "clamp(14px, 1.5vw, 16px)",
              fontWeight: 900,
              letterSpacing: ".16em",
              padding: "13px 36px",
              border: "2px solid #e53935",
              borderRadius: 3,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(183, 28, 28, 0.5)",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#d32f2f";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#b71c1c";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>◀</span>
            <span>RETURN TO SECTOR MAP</span>
          </button>

          <button
            type="button"
            onClick={handleReview}
            style={{
              background: "rgba(183, 28, 28, 0.2)",
              color: "#ffcdd2",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "clamp(14px, 1.5vw, 16px)",
              fontWeight: 900,
              letterSpacing: ".16em",
              padding: "13px 32px",
              border: "2px solid rgba(183, 28, 28, 0.6)",
              borderRadius: 3,
              cursor: "pointer",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(183, 28, 28, 0.4)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(183, 28, 28, 0.2)";
              e.currentTarget.style.color = "#ffcdd2";
            }}
          >
            <span>👁</span>
            <span>REVIEW QUESTIONS</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
