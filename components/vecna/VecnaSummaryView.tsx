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

  const safeTrial = trial || {
    id: 1,
    title: "STAGE 1",
    subtitle: "HAWKINS CHRONICLES",
    powersGranted: "GLITCH · CRT FREAKOUT",
    points: 200,
  };

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const totalQuestions = safeQuestions.length || 10;
  let solvedCount = 0;
  let totalPointsEarned = 0;

  safeQuestions.forEach((_, idx) => {
    const k = `${safeTrial.id}-${idx}`;
    const isSolved = Boolean(solvedQuestions[k]);
    if (isSolved) {
      solvedCount += 1;
      const isSecondAttempt = Boolean(attemptedQuestions[k]);
      totalPointsEarned += isSecondAttempt ? 10 : 20;
    }
  });

  const maxPoints = safeTrial.points || totalQuestions * 20;
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
        zIndex: 10,
        width: "100%",
        minHeight: "calc(100vh - 65px)",
        maxHeight: "calc(100vh - 65px)",
        overflowY: "auto",
        scrollbarWidth: "thin",
        padding: "16px 14px 28px",
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
          maxWidth: 900,
          background: "#faf6ee",
          border: "2px solid #3c3228",
          borderRadius: 2,
          boxShadow:
            "0 18px 45px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25), inset 0 0 40px rgba(180, 160, 130, 0.25)",
          padding: "18px 24px 20px",
          position: "relative",
          boxSizing: "border-box",
          color: "#231e1a",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "2px solid #2d241e",
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
                color: "#7a6a58",
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              HAWKINS NATIONAL LABORATORY // VECNA CONTROL PROTOCOL
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 900,
                color: "#1a120c",
                letterSpacing: ".02em",
              }}
            >
              CHAPTER 0{safeTrial.id}: {safeTrial.title}
            </h1>
            <div
              style={{
                fontSize: "12px",
                color: "#5c4e40",
                letterSpacing: ".12em",
                marginTop: 4,
              }}
            >
              DOSSIER: FORM HPD-0{safeTrial.id}-83 // AGENT: {s?.team?.name || session?.teamName || "VECNA PROTOCOL"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReturn}
            title="Return to Chapter Map"
            style={{
              background: "transparent",
              border: "1.5px solid #7a6a58",
              borderRadius: 2,
              padding: "6px 14px",
              cursor: "pointer",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#3a2f26",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
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
            background: "#f0e8d6",
            border: "1.5px dashed #5c4e40",
            padding: "20px 24px",
            marginBottom: 28,
            position: "relative",
          }}
        >
          {/* Status Stamp */}
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              border: "3px solid #b81d24",
              color: "#b81d24",
              padding: "4px 14px",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: ".18em",
              transform: "rotate(-4deg)",
              userSelect: "none",
              pointerEvents: "none",
              opacity: 0.9,
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
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              TELEMETRY HARVESTED
            </div>
            <div
              style={{
                fontSize: "clamp(26px, 3.5vw, 36px)",
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontWeight: 900,
                color: "#b81d24",
                marginTop: 4,
              }}
            >
              +{totalPointsEarned} <span style={{ fontSize: "16px", color: "#5c4e40" }}>/ {maxPoints} PTS</span>
            </div>
            <div style={{ fontSize: "11px", color: "#2e7d32", marginTop: 4, fontWeight: "bold" }}>
              TELEMETRY LOGGED TO PROTOCOL
            </div>
          </div>

          {/* Metric 2: Accuracy */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              OVERRIDE ACCURACY
            </div>
            <div
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontFamily: "'Courier New', Courier, monospace",
                fontWeight: "bold",
                color: "#1a120c",
                marginTop: 4,
              }}
            >
              {solvedCount} / {totalQuestions} <span style={{ fontSize: "15px", color: "#6a5c4e" }}>RESOLVED ({accuracyPct}%)</span>
            </div>
            <div style={{ fontSize: "11px", color: "#7a6a58", marginTop: 4 }}>
              {solvedCount === totalQuestions ? "All vectors breached successfully" : `${totalQuestions - solvedCount} vectors compromised`}
            </div>
          </div>

          {/* Metric 3: Power Unlocked */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              POWER UNLOCKED
            </div>
            <div
              style={{
                fontSize: "15px",
                fontFamily: "'Courier New', Courier, monospace",
                fontWeight: 900,
                color: "#1a120c",
                marginTop: 8,
                letterSpacing: "0.06em",
              }}
            >
              {safeTrial.powersGranted}
            </div>
            <div style={{ fontSize: "11px", color: "#2e7d32", marginTop: 4, fontWeight: "bold" }}>
              ACTIVE IN ARSENAL
            </div>
          </div>
        </div>

        {/* Section: Question-by-Question Breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1.5px solid #3c3228",
              paddingBottom: 6,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontWeight: 900,
                letterSpacing: ".15em",
                color: "#1a120c",
                textTransform: "uppercase",
              }}
            >
              STAGE QUESTION LEDGER // FINDINGS
            </span>
            <span style={{ fontSize: "11px", color: "#6a5c4e", letterSpacing: ".1em" }}>
              {solvedCount} SOLVED · {totalQuestions - solvedCount} FAILED
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: "340px",
              overflowY: "auto",
              paddingRight: "6px",
              scrollbarWidth: "thin",
            }}
          >
            {safeQuestions.map((q, idx) => {
              const k = `${safeTrial.id}-${idx}`;
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
                    background: isSolved ? "rgba(35, 110, 50, 0.06)" : "rgba(184, 29, 36, 0.06)",
                    border: isSolved ? "1.5px solid #3d8053" : "1.5px solid #8f2d24",
                    borderRadius: 2,
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
                          color: "#1a120c",
                        }}
                      >
                        LEVEL #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      {q.docketTag && (
                        <span
                          style={{
                            fontSize: "11px",
                            background: "#e4dac4",
                            border: "1px solid #b5a48b",
                            padding: "2px 8px",
                            borderRadius: 2,
                            color: "#544638",
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
                          color: isSolved ? "#1b7a41" : "#9e151b",
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
                            ? "#234d31"
                            : isFailed
                            ? "#3d1414"
                            : "#e4dac4",
                          color: isSolved || isFailed ? "#ffffff" : "#2a221a",
                        }}
                      >
                        {isSolved
                          ? isSecondAttempt
                            ? "OVERRIDE (ATTEMPT 2)"
                            : "OVERRIDE CONFIRMED"
                          : isFailed
                          ? "✕ VECTOR FAILED"
                          : "— UNATTEMPTED"}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#231e1a",
                      lineHeight: 1.5,
                      letterSpacing: ".02em",
                      fontWeight: 600,
                    }}
                  >
                    {q.question}
                  </div>

                  {/* User Answer Recorded */}
                  <div
                    style={{
                      fontSize: "12px",
                      color: isSolved ? "#1b5e20" : "#b71c1c",
                      letterSpacing: ".04em",
                      background: "#f0e8d6",
                      padding: "6px 12px",
                      borderRadius: 2,
                      borderLeft: isSolved ? "3px solid #2e7d32" : "3px solid #b71c1c",
                    }}
                  >
                    <span style={{ color: "#544638", fontWeight: "bold" }}>TELEMETRY TRANSMITTED: </span>
                    {displayAnswer}
                  </div>

                  {/* Hint / Explanation if available */}
                  {(isSolved || isFailed) && q.hint && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#544638",
                        background: "#e4dac4",
                        padding: "6px 12px",
                        borderRadius: 2,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ color: "#1a0f05", fontWeight: "bold" }}>INTEL RECORD: </span>
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
              background: "#b81d24",
              color: "#ffffff",
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontSize: "clamp(13px, 1.4vw, 15px)",
              fontWeight: 900,
              letterSpacing: ".14em",
              padding: "12px 32px",
              border: "1.5px solid #8f1218",
              borderRadius: 3,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(184, 29, 36, 0.4)",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#941319";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#b81d24";
            }}
          >
            <span>◀</span>
            <span>RETURN TO CHAPTER MAP</span>
          </button>

          <button
            type="button"
            onClick={handleReview}
            style={{
              background: "#2e2118",
              color: "#ffffff",
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontSize: "clamp(13px, 1.4vw, 15px)",
              fontWeight: 900,
              letterSpacing: ".14em",
              padding: "12px 30px",
              border: "1px solid #573a2e",
              borderRadius: 3,
              cursor: "pointer",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#4a3528";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2e2118";
            }}
          >
            <span>REVIEW QUESTIONS</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
