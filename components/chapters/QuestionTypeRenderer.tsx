"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { QuizQuestion, StageQuestionType } from "@/lib/chapterQuestions";

interface QuestionTypeRendererProps {
  question: QuizQuestion;
  selectedAnswer: string | undefined;
  onSelectOption: (optionId: string) => void;
  isVecnaMode?: boolean;
}

export default function QuestionTypeRenderer({
  question,
  selectedAnswer,
  onSelectOption,
  isVecnaMode = false,
}: QuestionTypeRendererProps) {
  const stageType: StageQuestionType = question.stageType || "quiz";

  // Reorder state for Stage 3
  const [reorderedTokens, setReorderedTokens] = useState<string[]>([]);
  // Connection state for Stage 2
  const [activeConnections, setActiveConnections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (question.rearrangeData) {
      setReorderedTokens([...question.rearrangeData.tokens]);
    }
    setActiveConnections({});
  }, [question.id]);

  // Handle quick demo solve for any stage
  const handleDemoSolve = () => {
    sfx("click");
    onSelectOption(question.correctAnswerId);
    if (question.rearrangeData) {
      setReorderedTokens([...question.rearrangeData.correctOrder]);
    }
    if (question.connectionData) {
      const solvedMap: Record<string, string> = {};
      question.connectionData.pairs.forEach((p) => {
        solvedMap[p.leftId] = p.rightId;
      });
      setActiveConnections(solvedMap);
    }
  };

  // Move token up/down in rearrange
  const handleMoveToken = (index: number, direction: "up" | "down") => {
    sfx("click");
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= reorderedTokens.length) return;
    const updated = [...reorderedTokens];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setReorderedTokens(updated);
  };

  // Theme tokens for Old Classic Paper
  const paperBorder = isVecnaMode ? "1.5px solid #a82028" : "1.5px solid #c9bda4";
  const paperAccent = isVecnaMode ? "#b81d24" : "#8b2500";
  const textColor = "#1f1812";
  const mutedText = "#5c4f42";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ──────────────────────────────────────────────────────────
          STAGE 1: QUIZ-TYPE QUESTIONS (SERIES TRIVIA)
          ────────────────────────────────────────────────────────── */}
      {stageType === "quiz" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              background: "rgba(184, 29, 36, 0.08)",
              border: "1px dashed #b81d24",
              borderRadius: "2px",
              alignSelf: "flex-start",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              color: paperAccent,
              letterSpacing: ".1em",
            }}
          >
            <span>★</span>
            <span>STAGE 01 · QUIZ-TYPE SERIES INQUIRY</span>
          </div>

          <div
            style={{
              fontSize: "clamp(14px, 1.35vw, 16px)",
              lineHeight: 1.6,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
              background: "rgba(255, 255, 255, 0.55)",
              padding: "14px 18px",
              border: paperBorder,
              borderRadius: "2px",
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            &quot;{question.question}&quot;
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 2: CONNECTION QUESTIONS (MATCHING RELATIONSHIPS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "connection" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: "rgba(30, 80, 140, 0.08)",
                border: "1px dashed #205080",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 800,
                color: "#184070",
                letterSpacing: ".1em",
              }}
            >
              <span>◈</span>
              <span>STAGE 02 · CONNECTION MATRIX // MATCH THE CORRELATIONS</span>
            </div>

            <button
              type="button"
              onClick={handleDemoSolve}
              style={{
                padding: "4px 12px",
                background: "#241810",
                color: "#ffc107",
                border: "1px solid #c49646",
                borderRadius: "3px",
                fontSize: "10.5px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              ⚡ DEMO AUTO-CONNECT
            </button>
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
              marginBottom: "4px",
            }}
          >
            {question.question}
          </div>

          {/* Dual Column Matching Board */}
          {question.connectionData && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px",
                padding: "14px",
                background: "rgba(255, 255, 255, 0.45)",
                border: paperBorder,
                borderRadius: "3px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".14em",
                    color: paperAccent,
                    borderBottom: "1px solid #d4c4a8",
                    paddingBottom: "4px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  COLUMN A (SCENARIO / TELEMETRY)
                </div>
                {question.connectionData.pairs.map((p, idx) => (
                  <div
                    key={p.leftId}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "#fff",
                      border: "1px solid #d4c4a8",
                      borderRadius: "2px",
                      fontSize: "12px",
                      fontFamily: "'Courier New', monospace",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 900,
                        color: paperAccent,
                        flexShrink: 0,
                      }}
                    >
                      [{idx + 1}]
                    </span>
                    <span style={{ color: textColor }}>{p.leftText}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".14em",
                    color: paperAccent,
                    borderBottom: "1px solid #d4c4a8",
                    paddingBottom: "4px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  COLUMN B (MATCH TARGETS)
                </div>
                {question.connectionData.pairs.map((p) => (
                  <div
                    key={p.rightId}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "#fdfbf7",
                      border: "1px solid #c9bda4",
                      borderRadius: "2px",
                      fontSize: "12px",
                      fontFamily: "'Courier New', monospace",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 900,
                        color: "#184070",
                        flexShrink: 0,
                      }}
                    >
                      ({p.rightId})
                    </span>
                    <span style={{ color: textColor }}>{p.rightText}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 3: REARRANGE QUESTIONS (WORDS, STATEMENTS, CODE & STEPS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "rearrange" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: "rgba(140, 70, 20, 0.08)",
                border: "1px dashed #8c4614",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 800,
                color: "#8c4614",
                letterSpacing: ".1em",
              }}
            >
              <span>⇄</span>
              <span>STAGE 03 · REARRANGE ARTIFACTS // REORDER SEQUENCE</span>
            </div>

            <button
              type="button"
              onClick={handleDemoSolve}
              style={{
                padding: "4px 12px",
                background: "#241810",
                color: "#ffc107",
                border: "1px solid #c49646",
                borderRadius: "3px",
                fontSize: "10.5px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              ⚡ DEMO AUTO-ORDER
            </button>
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {question.question}
          </div>

          {/* Interactive Reordering Workbench */}
          {question.rearrangeData && (
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(255, 255, 255, 0.55)",
                border: paperBorder,
                borderRadius: "3px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: mutedText,
                  letterSpacing: ".1em",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                TARGET: {question.rearrangeData.targetDescription.toUpperCase()}
              </div>

              {/* Scrambled Tokens List */}
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    question.rearrangeData.category === "code" ||
                    question.rearrangeData.category === "steps"
                      ? "column"
                      : "row",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {reorderedTokens.map((tok, idx) => (
                  <div
                    key={`${tok}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 10px",
                      background: "#fff",
                      border: "1.5px solid #c9bda4",
                      borderRadius: "2px",
                      fontSize: "12px",
                      fontFamily: "'Courier New', Courier, monospace",
                      fontWeight: 700,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <span style={{ color: textColor }}>{tok}</span>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <button
                        type="button"
                        onClick={() => handleMoveToken(idx, "up")}
                        disabled={idx === 0}
                        style={{
                          background: "#e4dac5",
                          border: "none",
                          borderRadius: "2px",
                          cursor: idx === 0 ? "default" : "pointer",
                          opacity: idx === 0 ? 0.3 : 1,
                          padding: "2px 5px",
                          fontSize: "10px",
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveToken(idx, "down")}
                        disabled={idx === reorderedTokens.length - 1}
                        style={{
                          background: "#e4dac5",
                          border: "none",
                          borderRadius: "2px",
                          cursor:
                            idx === reorderedTokens.length - 1
                              ? "default"
                              : "pointer",
                          opacity:
                            idx === reorderedTokens.length - 1 ? 0.3 : 1,
                          padding: "2px 5px",
                          fontSize: "10px",
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Assembled Preview */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "#e9dfcb",
                  borderRadius: "2px",
                  borderLeft: `3px solid ${paperAccent}`,
                  fontSize: "12px",
                  fontFamily: "'Courier New', Courier, monospace",
                  color: "#2b1c11",
                }}
              >
                <b>ASSEMBLED:</b>{" "}
                {question.rearrangeData.category === "words"
                  ? reorderedTokens.join(" ")
                  : reorderedTokens.join(" → ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 4: CASE STUDY QUESTIONS (EVIDENCE REPORTS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "case_study" && question.caseStudyData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              background: "rgba(184, 29, 36, 0.08)",
              border: "1px dashed #b81d24",
              borderRadius: "2px",
              alignSelf: "flex-start",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              color: paperAccent,
              letterSpacing: ".1em",
            }}
          >
            <span>📁</span>
            <span>STAGE 04 · CASE STUDY INVESTIGATION // INCIDENT ANALYSIS</span>
          </div>

          {/* Forensic Case Dossier Box */}
          <div
            style={{
              padding: "16px 18px",
              background: "#faf4e8",
              border: "2px solid #b81d24",
              borderRadius: "2px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #d4c4a8",
                paddingBottom: "6px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Benguiat Bold', Georgia, serif",
                  fontSize: "13px",
                  color: "#b81d24",
                  fontWeight: 900,
                  letterSpacing: ".1em",
                }}
              >
                {question.caseStudyData.caseTitle}
              </span>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px",
                  color: mutedText,
                  fontWeight: 800,
                }}
              >
                [{question.caseStudyData.caseDocket}]
              </span>
            </div>

            <div
              style={{
                fontSize: "12.5px",
                lineHeight: 1.55,
                color: textColor,
                fontFamily: "'Courier New', Courier, monospace",
                fontStyle: "italic",
                background: "rgba(255,255,255,0.7)",
                padding: "8px 12px",
                borderLeft: "3px solid #8b2500",
              }}
            >
              &quot;{question.caseStudyData.incidentBrief}&quot;
            </div>

            <div style={{ marginTop: "4px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: paperAccent,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                LOGGED FIELD EVIDENCE:
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "18px",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  color: textColor,
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                {question.caseStudyData.evidence.map((ev, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.5,
              color: textColor,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {question.question}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 5: STANDARD (AS-IS CHAPTER 5)
          ────────────────────────────────────────────────────────── */}
      {stageType === "standard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              background: "rgba(40, 120, 50, 0.08)",
              border: "1px dashed #287832",
              borderRadius: "2px",
              alignSelf: "flex-start",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              color: "#206028",
              letterSpacing: ".1em",
            }}
          >
            <span>🌲</span>
            <span>STAGE 05 · FIELD RECON // DEEP WOODS RUNIC VECTORS</span>
          </div>

          <div
            style={{
              fontSize: "clamp(14px, 1.35vw, 16px)",
              lineHeight: 1.6,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
              background: "rgba(255, 255, 255, 0.55)",
              padding: "14px 18px",
              border: paperBorder,
              borderRadius: "2px",
            }}
          >
            &quot;{question.question}&quot;
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 6: RADIO TRANSMISSION (DECIPHERS, CIPHERS, MORSE, SIGNALS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "radio" && question.radioData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: "rgba(180, 40, 20, 0.08)",
                border: "1px dashed #b42814",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 800,
                color: "#b42814",
                letterSpacing: ".1em",
              }}
            >
              <span>📻</span>
              <span>STAGE 06 · RADIO TRANSMISSION // DECODE AIRWAVE CIPHERS</span>
            </div>

            <button
              type="button"
              onClick={handleDemoSolve}
              style={{
                padding: "4px 12px",
                background: "#241810",
                color: "#ffc107",
                border: "1px solid #c49646",
                borderRadius: "3px",
                fontSize: "10.5px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              ⚡ DECODE SIGNAL
            </button>
          </div>

          {/* Retro Receiver Console Box */}
          <div
            style={{
              padding: "14px 18px",
              background: "#181410",
              color: "#e6c387",
              border: "2px solid #5a422a",
              borderRadius: "3px",
              boxShadow:
                "inset 0 0 15px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontFamily: "'Courier New', monospace",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(230, 195, 135, 0.3)",
                paddingBottom: "6px",
                fontSize: "11.5px",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <span style={{ color: "#ff8a4c", fontWeight: 900 }}>
                ● FREQ: {question.radioData.frequency}
              </span>
              <span style={{ color: "#a8947c" }}>
                CALLSIGN: {question.radioData.callsign}
              </span>
              <span style={{ color: "#81c784" }}>[CARRIER LOCKED]</span>
            </div>

            <div
              style={{
                padding: "12px",
                background: "#0d0a07",
                border: "1px solid #3d2d1d",
                borderRadius: "2px",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: ".15em",
                color: "#ffca28",
                textAlign: "center",
                textShadow: "0 0 8px rgba(255, 202, 40, 0.5)",
              }}
            >
              {question.radioData.rawSignal}
            </div>

            {question.radioData.cipherHint && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#d9c5b2",
                  lineHeight: 1.4,
                  opacity: 0.85,
                }}
              >
                💡 <b>DECRYPTION NOTE:</b> {question.radioData.cipherHint}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {question.question}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 7: LAB-TYPE TASKS (TECHNICAL CHALLENGES)
          ────────────────────────────────────────────────────────── */}
      {stageType === "lab_task" && question.labTaskData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                background: "rgba(184, 29, 36, 0.08)",
                border: "1px dashed #b81d24",
                borderRadius: "2px",
                fontSize: "11px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 800,
                color: paperAccent,
                letterSpacing: ".1em",
              }}
            >
              <span>🔬</span>
              <span>
                STAGE 07 · LAB TASK //{" "}
                {question.labTaskData.labCategory.toUpperCase()} CHALLENGE
              </span>
            </div>

            <button
              type="button"
              onClick={handleDemoSolve}
              style={{
                padding: "4px 12px",
                background: "#241810",
                color: "#ffc107",
                border: "1px solid #c49646",
                borderRadius: "3px",
                fontSize: "10.5px",
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              ⚡ DEMO SOLVE TASK
            </button>
          </div>

          {/* Terminal / Code / Simulation Box */}
          <div
            style={{
              padding: "14px 16px",
              background: "#121417",
              color: "#a4e6a8",
              border: "1.5px solid #2d3e33",
              borderRadius: "3px",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12.5px",
              lineHeight: 1.5,
              boxShadow: "inset 0 0 12px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#7e9683",
                borderBottom: "1px solid #233428",
                paddingBottom: "4px",
                marginBottom: "8px",
                fontSize: "10.5px",
              }}
            >
              <span>HAWKINS LAB EXPERIMENTAL TERMINAL [SUBLEVEL 04]</span>
              <span>ONLINE</span>
            </div>

            {question.labTaskData.terminalPrompt && (
              <div style={{ color: "#ffb74d", marginBottom: "6px" }}>
                {question.labTaskData.terminalPrompt}
              </div>
            )}

            {question.labTaskData.codeSnippet && (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  color: "#e8f5e9",
                  background: "rgba(0,0,0,0.35)",
                  padding: "8px 10px",
                  borderRadius: "2px",
                }}
              >
                {question.labTaskData.codeSnippet}
              </pre>
            )}

            {question.labTaskData.labHint && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  color: "#b0bec5",
                  borderTop: "1px dashed #2a3a30",
                  paddingTop: "6px",
                }}
              >
                <b>CALCULATION GUIDE:</b> {question.labTaskData.labHint}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {question.question}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          UNIVERSAL OPTIONS GRID (CLASSIC PAPER POLICE CHECKBOXES)
          ────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: "4px" }}>
        <div
          style={{
            fontSize: "11px",
            color: mutedText,
            letterSpacing: ".12em",
            marginBottom: "10px",
            fontFamily: "'Courier New', monospace",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          [SELECT DIAGNOSTIC ANSWER ENTRY BELOW]:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {question.options.map((opt) => {
            const isSelected = selectedAnswer === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  sfx("click");
                  onSelectOption(opt.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 16px",
                  background: isSelected
                    ? isVecnaMode
                      ? "rgba(184, 29, 36, 0.15)"
                      : "rgba(220, 180, 130, 0.35)"
                    : "rgba(255, 255, 255, 0.7)",
                  border: isSelected
                    ? `2px solid ${paperAccent}`
                    : "1.5px solid #d4c4a8",
                  borderRadius: "3px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  boxSizing: "border-box",
                  boxShadow: isSelected
                    ? "0 2px 8px rgba(0,0,0,0.12)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.12s ease",
                }}
              >
                {/* Stamp Checkbox */}
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isSelected ? paperAccent : "#faf6ee",
                    border: `1.5px solid ${isSelected ? paperAccent : "#8c7b68"}`,
                    color: isSelected ? "#fff" : "#4a3c2c",
                    fontFamily: "'Courier New', monospace",
                    fontSize: "12px",
                    fontWeight: 900,
                    flexShrink: 0,
                    borderRadius: "2px",
                    marginTop: "1px",
                  }}
                >
                  {isSelected ? "X" : opt.id}
                </span>

                {/* Option Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: "clamp(12.5px, 1.25vw, 14.5px)",
                      color: isSelected ? "#000" : textColor,
                      fontWeight: isSelected ? 800 : 600,
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}
                  >
                    {opt.text}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
