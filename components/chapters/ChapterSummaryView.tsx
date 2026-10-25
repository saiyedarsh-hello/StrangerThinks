"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { ChapterDef } from "./ChapterManager";
import { QuizQuestion } from "@/lib/chapterQuestions";

interface ChapterSummaryViewProps {
  chapter: ChapterDef;
  questions: QuizQuestion[];
  onBackToBoard: () => void;
}

interface SavedResult {
  isCorrect?: boolean;
  isLocked?: boolean;
  message?: string;
  pointsAwarded?: number;
  attempts?: number;
}

export default function ChapterSummaryView({
  chapter,
  questions = [],
  onBackToBoard,
}: ChapterSummaryViewProps) {
  const { s, session } = useGame();
  const teamId = s.team?.id || session?.teamId || "anon";
  const [showLore, setShowLore] = useState(true);

  // Retrieve stored question results and answers for this chapter
  const [savedResults] = useState<Record<number, SavedResult>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`hawkins_quiz_results_ch${chapter.id}_${teamId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const [savedAnswers] = useState<Record<number, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`hawkins_quiz_answers_ch${chapter.id}_${teamId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Merge unlocked hints from game state, team record, and local backup
  const [localHints] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`hawkins_team_save_${teamId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.unlockedHints || {};
      }
    } catch {}
    return {};
  });

  const hintsMap: Record<string, boolean> = {
    ...localHints,
    ...(s.unlockedHints || {}),
    ...(s.team?.unlockedHints || {}),
  };

  // Check each question for unlocked clues in this chapter
  const questionCluesUsed: Record<number, boolean> = {};
  let chapterCluesUsed = 0;
  let chapterCluePenalty = 0;

  questions.forEach((q, idx) => {
    const qKey1 = q.id ? q.id.toLowerCase() : "";
    const qKey2 = `ch${chapter.id}-q${idx + 1}`.toLowerCase();
    const isUsed = Boolean(
      (q.id && hintsMap[q.id]) ||
      (qKey1 && hintsMap[qKey1]) ||
      hintsMap[`ch${chapter.id}-q${idx + 1}`] ||
      hintsMap[qKey2]
    );

    if (isUsed) {
      questionCluesUsed[idx] = true;
      chapterCluesUsed += 1;
      chapterCluePenalty += 10;
    }
  });

  // Also check if chapter story-intel hint was unlocked (costs 5)
  const storyIntelKey = `ch${chapter.id}-story-intel`;
  if (hintsMap[storyIntelKey] || hintsMap[storyIntelKey.toLowerCase()]) {
    chapterCluesUsed += 1;
    chapterCluePenalty += 5;
  }

  // Calculate statistics
  const totalQuestions = questions.length;
  let correctCount = 0;
  let totalPointsEarned = 0;

  questions.forEach((q, idx) => {
    const res = savedResults[idx];
    const userAns = savedAnswers[idx];
    const isCorrect = Boolean(
      res?.isCorrect ||
      (userAns && q.correctAnswerId && String(userAns).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase())
    );

    const taskScore = s.taskScores?.[q.id || `ch${chapter.id}-q${idx + 1}`];

    if (isCorrect) {
      correctCount += 1;
      const pts = typeof taskScore === "number"
        ? taskScore
        : typeof res?.pointsAwarded === "number"
        ? res.pointsAwarded
        : (res?.attempts === 2 ? 10 : 20);
      totalPointsEarned += pts;
    }
  });

  // Net Stage Score = Gross Points Earned minus Chapter Clue Penalty (minimum 0)
  const netStageScore = Math.max(0, totalPointsEarned - chapterCluePenalty);

  // If points are capped or defined by chapter:
  const maxPoints = chapter.points || totalQuestions * 20 || 200;
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

  const handleReturn = () => {
    sfx("click");
    onBackToBoard();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 64px)",
        padding: "clamp(16px, 3vw, 40px) clamp(14px, 4vw, 48px)",
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
          maxWidth: 920,
          background: "#faf6ee",
          border: "2px solid #3c3228",
          borderRadius: 2,
          boxShadow:
            "0 18px 45px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25), inset 0 0 40px rgba(180, 160, 130, 0.25)",
          padding: "clamp(20px, 3.5vw, 42px)",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header Bar with Close (✕) */}
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
              HAWKINS POLICE DEPT · EVIDENCE DOSSIER SUMMARY
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
              {chapter.label}: {chapter.archiveTitle || chapter.tag}
            </h1>
            <div
              style={{
                fontSize: "12px",
                color: "#5c4e40",
                letterSpacing: ".12em",
                marginTop: 4,
              }}
            >
              STATION DOCKET: FORM HPD-0{chapter.id}-83 // SQUAD: {s.team?.name || session?.teamName || "RECON SQUAD"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleReturn}
            title="Return to Evidence Board"
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
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
            CASE CLOSED
          </div>

          {/* Metric 1: Net Stage Score */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              NET STAGE SCORE
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
              +{netStageScore} <span style={{ fontSize: "16px", color: "#5c4e40" }}>/ {maxPoints} PTS</span>
            </div>
            {chapterCluePenalty > 0 ? (
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#8b2500",
                  marginTop: 4,
                  fontWeight: "bold",
                  letterSpacing: ".06em",
                }}
              >
                GROSS: +{totalPointsEarned} PTS · CLUES: -{chapterCluePenalty} PTS
              </div>
            ) : (
              <div
                style={{
                  fontSize: "11px",
                  color: "#2e7d32",
                  marginTop: 4,
                  fontWeight: "bold",
                  letterSpacing: ".06em",
                }}
              >
                FULL GROSS AWARD (0 CLUE DEDUCTIONS)
              </div>
            )}
          </div>

          {/* Metric 2: Intel Clues Penalty */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              INTEL CLUES PENALTY
            </div>
            <div
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontFamily: "'Courier New', Courier, monospace",
                fontWeight: "bold",
                color: chapterCluePenalty > 0 ? "#b81d24" : "#2e7d32",
                marginTop: 4,
              }}
            >
              {chapterCluePenalty > 0 ? `-${chapterCluePenalty} PTS` : "0 PTS"}
              <span style={{ fontSize: "14px", color: "#6a5c4e", marginLeft: 8, fontWeight: 700 }}>
                ({chapterCluesUsed} {chapterCluesUsed === 1 ? "CLUE" : "CLUES"} USED)
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#7a6a58", marginTop: 4 }}>
              {chapterCluesUsed > 0
                ? "Deducted authoritatively from total squad score"
                : "Zero hint deductions applied"}
            </div>
          </div>

          {/* Metric 3: Accuracy */}
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#7a6a58",
                fontWeight: "bold",
              }}
            >
              INQUIRY ACCURACY
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
              {correctCount} / {totalQuestions} <span style={{ fontSize: "15px", color: "#6a5c4e" }}>VERIFIED ({accuracyPct}%)</span>
            </div>
            <div style={{ fontSize: "11px", color: "#7a6a58", marginTop: 4 }}>
              {correctCount === totalQuestions ? "All questions verified successfully" : `${totalQuestions - correctCount} discrepancies recorded`}
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
              borderBottom: "1.5px solid #3c3228",
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
                color: "#1a120c",
                textTransform: "uppercase",
              }}
            >
              STAGE QUESTION LEDGER // FINDINGS
            </span>
            <span style={{ fontSize: "11px", color: "#6a5c4e", letterSpacing: ".1em" }}>
              {correctCount} CORRECT · {totalQuestions - correctCount} INCORRECT
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((q, idx) => {
              const res = savedResults[idx];
              const userAns = savedAnswers[idx];
              const isCorrect = Boolean(
                res?.isCorrect ||
                (userAns && q.correctAnswerId && String(userAns).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase())
              );
              const attempts = res?.attempts || (userAns ? 1 : 0);
              const pointsEarned = isCorrect ? (typeof res?.pointsAwarded === "number" ? res.pointsAwarded : (attempts === 2 ? 10 : 20)) : 0;

              // Find option text if multiple choice
              let displayAnswer = userAns || "— NO ANSWER RECORDED —";
              if (q.options && q.options.length > 0 && userAns) {
                const matchedOption = q.options.find(
                  (opt) => String(opt.id).trim().toLowerCase() === String(userAns).trim().toLowerCase()
                );
                if (matchedOption) {
                  displayAnswer = `[OPTION ${matchedOption.id}] ${matchedOption.text}`;
                }
              }

              return (
                <div
                  key={q.id || idx}
                  style={{
                    background: isCorrect ? "rgba(35, 110, 50, 0.06)" : "rgba(184, 29, 36, 0.06)",
                    border: isCorrect ? "1.5px solid #2e7d32" : "1.5px solid #b81d24",
                    borderRadius: 2,
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Question header row */}
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
                        ITEM #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      {q.docketTag && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "#dcd0ba",
                            padding: "2px 6px",
                            borderRadius: 2,
                            color: "#4a3c2e",
                            letterSpacing: ".08em",
                          }}
                        >
                          {q.docketTag}
                        </span>
                      )}
                    </div>

                    {/* Result Badge & Clue Penalty Indicator */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {questionCluesUsed[idx] && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 900,
                            letterSpacing: ".08em",
                            color: "#8b2500",
                            background: "rgba(184, 29, 36, 0.12)",
                            border: "1px solid rgba(184, 29, 36, 0.4)",
                            padding: "2px 7px",
                            borderRadius: 2,
                            textTransform: "uppercase",
                          }}
                        >
                          CLUE USED (-10 PTS)
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          letterSpacing: ".1em",
                          color: isCorrect ? "#1b5e20" : "#b81d24",
                          background: isCorrect ? "rgba(46, 125, 50, 0.15)" : "rgba(184, 29, 36, 0.15)",
                          border: isCorrect ? "1px solid #2e7d32" : "1px solid #b81d24",
                          padding: "2px 8px",
                          borderRadius: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {isCorrect ? "✓ RIGHT" : "✗ WRONG"}
                      </span>
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "12px",
                          color: isCorrect ? "#1b5e20" : "#7a6a58",
                        }}
                      >
                        {isCorrect
                          ? questionCluesUsed[idx]
                            ? `+${pointsEarned} PTS (NET +${Math.max(0, pointsEarned - 10)})`
                            : `+${pointsEarned} PTS`
                          : questionCluesUsed[idx]
                          ? "0 PTS (-10 CLUE)"
                          : "0 PTS"}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.45,
                      color: "#2a2016",
                      fontWeight: 600,
                    }}
                  >
                    {q.question}
                  </div>

                  {/* Team's Submitted Answer */}
                  <div
                    style={{
                      fontSize: "12px",
                      background: "rgba(0, 0, 0, 0.04)",
                      padding: "6px 10px",
                      borderRadius: 2,
                      borderLeft: isCorrect ? "3px solid #2e7d32" : "3px solid #b81d24",
                      color: "#3d3226",
                    }}
                  >
                    <span style={{ fontWeight: "bold", letterSpacing: ".05em" }}>SUBMITTED RESPONSE: </span>
                    <span>{displayAnswer}</span>
                    {attempts > 0 && (
                      <span style={{ marginLeft: 10, color: "#7a6a58", fontSize: "11px" }}>
                        ({attempts} {attempts === 1 ? "attempt" : "attempts"})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Decrypted Story Lore Intel */}
        {chapter.completionLoreTitle && (
          <div
            style={{
              background: "#ede5d0",
              border: "1.5px solid #5c4e40",
              padding: "18px 20px",
              marginBottom: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setShowLore(!showLore)}
            >
              <div
                style={{
                  fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: ".15em",
                  color: "#b81d24",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>DECRYPTED INCIDENT DOSSIER</span>
                <span style={{ fontSize: "11px", color: "#7a6a58" }}>({showLore ? "HIDE" : "SHOW"})</span>
              </div>
              <span style={{ fontSize: "12px", color: "#5c4e40" }}>{showLore ? "▲" : "▼"}</span>
            </div>

            {showLore && (
              <div style={{ marginTop: 12, borderTop: "1px dashed #7a6a58", paddingTop: 12 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#1a120c",
                    marginBottom: 6,
                    letterSpacing: ".08em",
                  }}
                >
                  {chapter.completionLoreTitle}
                </div>
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "#3a2e22",
                    margin: 0,
                  }}
                >
                  {chapter.completionLoreText}
                </p>
                {chapter.completionLines && chapter.completionLines.length > 0 && (
                  <ul style={{ margin: "10px 0 0 0", paddingLeft: 20, fontSize: "12px", color: "#5c4e40", lineHeight: 1.5 }}>
                    {chapter.completionLines.map((line, lIdx) => (
                      <li key={lIdx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button: Return to Evidence Board */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <button
            type="button"
            onClick={handleReturn}
            style={{
              background: "#b81d24",
              color: "#ffffff",
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontSize: "clamp(15px, 1.6vw, 18px)",
              fontWeight: 900,
              letterSpacing: ".18em",
              padding: "14px 44px",
              border: "2px solid #8f1218",
              borderRadius: 3,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(184, 29, 36, 0.4)",
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
              e.currentTarget.style.background = "#b81d24";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>←</span>
            <span>RETURN TO EVIDENCE BOARD</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
