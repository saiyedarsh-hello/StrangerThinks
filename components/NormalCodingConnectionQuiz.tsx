"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useGame } from "@/lib/store";
import PushPin from "./PushPin";
import {
  fetchNormalQuestions,
  NormalCodingQuestionItem,
  CANON_NORMAL_QUESTIONS,
  checkSupabaseQuestionsStatus,
} from "@/lib/supabaseService";

interface NormalCodingConnectionQuizProps {
  onClose?: () => void;
  initialQuestionIndex?: number;
}

export default function NormalCodingConnectionQuiz({
  onClose,
  initialQuestionIndex = 0,
}: NormalCodingConnectionQuizProps) {
  const { submitTask, unlockHint, isHintUnlocked, s } = useGame();

  // Dynamic Questions State
  const [questions, setQuestions] = useState<NormalCodingQuestionItem[]>(CANON_NORMAL_QUESTIONS);
  const [questionsSource, setQuestionsSource] = useState<"supabase" | "canonical">("canonical");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active Question
  const [activeIdx, setActiveIdx] = useState(initialQuestionIndex);

  // Matching selections: for matching questions, maps column A id -> column B id (e.g. { 1: "c", 2: "a", ... })
  const [matches, setMatches] = useState<Record<string, Record<string | number, string>>>({});
  // For multiple-choice / text questions, maps question id -> chosen option id or text
  const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>({});

  // Solved state and feedback
  const [solvedMap, setSolvedMap] = useState<Record<string, boolean>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { type: "success" | "error"; message: string } | null>>({});

  // Load questions from Supabase
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchNormalQuestions();
      if (res && res.length > 0) {
        setQuestions(res);
        // Check source
        const status = await checkSupabaseQuestionsStatus();
        if (status.connected && status.rowCount > 0 && !status.rlsBlocked) {
          setQuestionsSource("supabase");
          setStatusMessage(`SUPABASE DB CONNECTED (${res.length} QUESTIONS)`);
        } else {
          setQuestionsSource("canonical");
          setStatusMessage(`CANONICAL VAULT (${res.length} QUESTIONS)`);
        }
      }
    } catch (e: any) {
      console.warn("Failed to load normal questions:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQ = questions[activeIdx] || questions[0];
  const qId = currentQ.id;
  const isCurrentSolved = !!solvedMap[qId] || !!s.completedTasks?.includes(`task-${qId}`);
  const currentMatches = matches[qId] || {};
  const currentSingleAnswer = singleAnswers[qId] || "";
  const currentFeedback = feedbackMap[qId];

  // Helper for matching selection
  const handleSelectPair = (itemAId: number | string, itemBId: string) => {
    sfx("type");
    setMatches((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [itemAId]: itemBId,
      },
    }));
    setFeedbackMap((prev) => ({ ...prev, [qId]: null }));
  };

  // Helper for multiple-choice option
  const handleSelectOption = (optId: string) => {
    sfx("type");
    setSingleAnswers((prev) => ({
      ...prev,
      [qId]: optId,
    }));
    setFeedbackMap((prev) => ({ ...prev, [qId]: null }));
  };

  // Validate answer
  const handleSubmitAnswer = () => {
    const isMatching = currentQ.questionType === "MATCHING" || (currentQ.columnA && currentQ.columnA.length > 0);

    let isCorrect = false;
    let submittedRepr = "";

    if (isMatching) {
      // Build string like "1-c, 2-a, 3-d, 4-b"
      const colA = currentQ.columnA || [];
      const userPairs = colA
        .map((item) => `${item.id}-${(currentMatches[item.id] || "").toLowerCase()}`)
        .join(", ");
      submittedRepr = userPairs;

      // Check if all are paired
      const isComplete = colA.every((item) => !!currentMatches[item.id]);
      if (!isComplete) {
        sfx("err");
        setFeedbackMap((prev) => ({
          ...prev,
          [qId]: { type: "error", message: "Incomplete pairs! Please assign every item from Column A." },
        }));
        return;
      }

      // Format comparison
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .replace(/\s+/g, "")
          .split(",")
          .sort()
          .join(",");

      const expected = normalize(currentQ.correctAnswer);
      const actual = normalize(userPairs);

      isCorrect = expected === actual;
    } else {
      // Find the link / Multiple choice
      const chosen = currentSingleAnswer.trim().toUpperCase();
      const expected = (currentQ.correctAnswer || "").trim().toUpperCase();
      const matchedOption = currentQ.options?.find((o) => o.id.toUpperCase() === expected);

      isCorrect =
        chosen === expected ||
        (matchedOption && chosen === matchedOption.text.trim().toUpperCase()) ||
        (currentQ.options?.find((o) => o.id === chosen)?.text?.toUpperCase().includes(expected) ?? false) ||
        expected.includes(chosen);
    }

    if (isCorrect) {
      sfx("boom");
      setSolvedMap((prev) => ({ ...prev, [qId]: true }));
      setFeedbackMap((prev) => ({
        ...prev,
        [qId]: { type: "success", message: `VERIFIED! +${currentQ.points} PTS AWARDED TO SQUAD.` },
      }));
      submitTask(`task-${qId}`, currentQ.points, `Solved ${currentQ.title}`);
    } else {
      sfx("err");
      setFeedbackMap((prev) => ({
        ...prev,
        [qId]: { type: "error", message: "VECTOR MISMATCH! Telemetry checksum failed. Check clues & re-align." },
      }));
    }
  };

  const hintKey = `hint-${qId}`;
  const isHintOpen = isHintUnlocked(hintKey);

  const handleUnlockHint = () => {
    sfx("click");
    unlockHint(hintKey, 10);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(6, 3, 5, 0.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "24px 20px 20px 20px",
        boxSizing: "border-box",
        overflowY: "auto",
        fontFamily: '"Share Tech Mono", monospace',
        color: "#ffffff",
      }}
    >
      {/* Top Floating Control Bar */}
      <div
        style={{
          width: "min(1280px, 98vw)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
          background: "rgba(20, 8, 12, 0.9)",
          border: "1.5px solid #d91e2b",
          borderRadius: "4px",
          padding: "10px 18px",
          boxShadow: "0 0 20px rgba(217, 30, 43, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <PushPin size={24} angle={-6} color="#d91e2b" />
          <div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ff4d5a", letterSpacing: "0.1em" }}>
              HAWKINS CODING ANOMALY PROTOCOL
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
              12 CONNECTION & LOGIC DOSSIERS · UPSIDE DOWN FREQUENCY
            </div>
          </div>
        </div>

        {/* Supabase Status Chip & Sync Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(0,0,0,0.5)",
              border: questionsSource === "supabase" ? "1px solid #81c784" : "1px solid #ffd54f",
              padding: "5px 12px",
              borderRadius: "3px",
              fontSize: "11.5px",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: questionsSource === "supabase" ? "#81c784" : "#ffd54f",
                boxShadow: `0 0 8px ${questionsSource === "supabase" ? "#81c784" : "#ffd54f"}`,
              }}
            />
            <span style={{ color: questionsSource === "supabase" ? "#81c784" : "#ffd54f" }}>
              {questionsSource === "supabase"
                ? `SUPABASE LIVE DB · ${questions.length} QUESTIONS`
                : `CANONICAL CACHE · ${questions.length} QUESTIONS`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sfx("click");
              loadQuestions();
            }}
            disabled={isLoading}
            style={{
              background: "rgba(255, 45, 58, 0.15)",
              color: "#ffcdd2",
              border: "1px solid rgba(255, 45, 58, 0.4)",
              padding: "5px 12px",
              borderRadius: "3px",
              fontSize: "11px",
              fontFamily: '"Share Tech Mono", monospace',
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "⟳ SYNCING..." : "⟳ RE-SYNC SUPABASE"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                sfx("click");
                onClose();
              }}
              style={{
                background: "#d91e2b",
                color: "#000",
                fontWeight: "bold",
                border: "none",
                padding: "6px 16px",
                borderRadius: "3px",
                fontSize: "12px",
                fontFamily: '"Share Tech Mono", monospace',
                cursor: "pointer",
                letterSpacing: "0.1em",
              }}
            >
              [✕ CLOSE DOSSIER]
            </button>
          )}
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div
        style={{
          width: "min(1280px, 98vw)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
          gap: "8px",
          marginBottom: "18px",
        }}
      >
        {questions.map((q, idx) => {
          const isSelected = activeIdx === idx;
          const isSolved = !!solvedMap[q.id] || !!s.completedTasks?.includes(`task-${q.id}`);

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                sfx("click");
                setActiveIdx(idx);
              }}
              style={{
                background: isSelected
                  ? "rgba(217, 30, 43, 0.35)"
                  : "rgba(15, 6, 10, 0.8)",
                border: isSelected
                  ? "2px solid #ff2d3a"
                  : isSolved
                  ? "1px solid #4caf50"
                  : "1px solid rgba(255, 45, 58, 0.25)",
                padding: "8px 6px",
                borderRadius: "3px",
                color: isSelected ? "#ff4d5a" : isSolved ? "#81c784" : "#ffffff",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "11.5px",
                fontWeight: "bold",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              <div>{q.id}</div>
              <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {q.category.split(" ")[0]}
              </div>
              {isSolved && (
                <span style={{ fontSize: "9px", color: "#81c784", display: "block" }}>✓ SOLVED</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Active Question Console */}
      <motion.div
        key={currentQ.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          width: "min(1280px, 98vw)",
          background: "rgba(14, 5, 8, 0.95)",
          border: "2px solid #d91e2b",
          boxShadow: "0 0 35px rgba(217, 30, 43, 0.35), inset 0 0 25px rgba(0,0,0,0.85)",
          borderRadius: "6px",
          padding: "28px 32px",
          boxSizing: "border-box",
          marginBottom: "20px",
        }}
      >
        {/* Question Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 45, 58, 0.3)",
            paddingBottom: "16px",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#ff8a80", letterSpacing: "0.2em", fontWeight: "bold" }}>
              [{currentQ.category}] · {currentQ.id} OF 12 ANOMALIES
            </div>
            <h2
              style={{
                fontFamily:
                  '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                fontSize: "clamp(20px, 2.3vw, 28px)",
                fontWeight: 900,
                color: "#ff2d3a",
                letterSpacing: "0.05em",
                margin: "4px 0 0 0",
              }}
            >
              {currentQ.title}
            </h2>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10.5px", color: "rgba(255,200,200,0.5)", letterSpacing: "0.15em" }}>
              BOUNTY
            </div>
            <div style={{ fontSize: "18px", color: "#ffd54f", fontWeight: "bold", marginTop: "2px" }}>
              +{currentQ.points} PTS
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div
          style={{
            fontSize: "15px",
            lineHeight: 1.55,
            color: "#ffffff",
            marginBottom: "24px",
            background: "rgba(255, 45, 58, 0.08)",
            borderLeft: "3px solid #ff2d3a",
            padding: "12px 18px",
            borderRadius: "0 4px 4px 0",
          }}
        >
          {currentQ.prompt}
        </div>

        {/* Clues list if present (e.g. Q14 / Q15) */}
        {currentQ.clues && currentQ.clues.length > 0 && (
          <div
            style={{
              background: "#080305",
              border: "1px solid rgba(255, 45, 58, 0.25)",
              padding: "14px 18px",
              borderRadius: "4px",
              marginBottom: "22px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#ff8a80", fontWeight: "bold", marginBottom: "8px" }}>
              EVIDENCE DOSSIER CLUES:
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", lineHeight: "1.6", color: "#ffcdd2" }}>
              {currentQ.clues.map((clue, cIdx) => (
                <li key={cIdx}>{clue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── RENDERING TYPE 1: MATCHING (COLUMN A -> COLUMN B) ─── */}
        {currentQ.columnA && currentQ.columnA.length > 0 && (
          <div style={{ marginBottom: "26px" }}>
            <div style={{ fontSize: "12px", color: "#ff8a80", letterSpacing: "0.15em", marginBottom: "14px", fontWeight: "bold" }}>
              CONNECT ITEMS: SELECT CORRESPONDING CONCEPT FOR EACH ITEM (1 to 4)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
              {/* Column A Items with inline target selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "6px" }}>
                  COLUMN A — HAWKINS OBSERVATIONS
                </div>
                {currentQ.columnA.map((itemA) => {
                  const assignedB = currentMatches[itemA.id];
                  return (
                    <div
                      key={itemA.id}
                      style={{
                        background: assignedB ? "rgba(255, 45, 58, 0.12)" : "rgba(10, 4, 7, 0.8)",
                        border: assignedB ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "4px",
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <span
                          style={{
                            background: "#d91e2b",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "bold",
                            width: "22px",
                            height: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "3px",
                            flexShrink: 0,
                          }}
                        >
                          {itemA.id}
                        </span>
                        <span style={{ fontSize: "13.5px", lineHeight: "1.4", color: "#ffffff" }}>
                          {itemA.text}
                        </span>
                      </div>

                      {/* Matching Target Selector */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>CONNECT TO:</span>
                        {currentQ.columnB?.map((itemB) => {
                          const isPicked = assignedB === itemB.id;
                          return (
                            <button
                              key={itemB.id}
                              type="button"
                              onClick={() => handleSelectPair(itemA.id, itemB.id)}
                              style={{
                                background: isPicked ? "#ff2d3a" : "rgba(255,255,255,0.06)",
                                color: isPicked ? "#000" : "#ffcdd2",
                                border: isPicked ? "1px solid #ff2d3a" : "1px solid rgba(255,255,255,0.2)",
                                padding: "3px 9px",
                                borderRadius: "3px",
                                fontSize: "11px",
                                fontWeight: isPicked ? "bold" : "normal",
                                fontFamily: '"Share Tech Mono", monospace',
                                cursor: "pointer",
                                transition: "all 0.12s ease",
                              }}
                            >
                              ({itemB.id.toUpperCase()})
                            </button>
                          );
                        })}
                        {assignedB && (
                          <span style={{ fontSize: "11px", color: "#81c784", fontWeight: "bold", marginLeft: "4px" }}>
                            ➔ {currentQ.columnB?.find((b) => b.id === assignedB)?.text}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column B Reference Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "6px" }}>
                  COLUMN B — COMPUTER SCIENCE / LOGIC CONCEPTS
                </div>
                {currentQ.columnB?.map((itemB) => (
                  <div
                    key={itemB.id}
                    style={{
                      background: "rgba(10, 4, 7, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "4px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(255, 45, 58, 0.2)",
                        color: "#ff8a80",
                        fontSize: "12px",
                        fontWeight: "bold",
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "3px",
                        flexShrink: 0,
                      }}
                    >
                      {itemB.id.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "13px", color: "#ffcdd2" }}>{itemB.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── RENDERING TYPE 2: OPTIONS (FIND THE LINK / MULTIPLE CHOICE) ─── */}
        {currentQ.options && currentQ.options.length > 0 && (!currentQ.columnA || currentQ.columnA.length === 0) && (
          <div style={{ marginBottom: "26px" }}>
            <div style={{ fontSize: "12px", color: "#ff8a80", letterSpacing: "0.15em", marginBottom: "14px", fontWeight: "bold" }}>
              SELECT THE UNIFYING SYSTEM CONCEPT / SOLUTION:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
              {currentQ.options.map((opt) => {
                const isSelected = currentSingleAnswer === opt.id || currentSingleAnswer === opt.text;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    style={{
                      padding: "14px 18px",
                      textAlign: "left",
                      background: isSelected ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.65)",
                      border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: isSelected ? "#ff2d3a" : "rgba(255, 255, 255, 0.85)",
                      fontSize: "14px",
                      fontFamily: '"Share Tech Mono", monospace',
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "3px",
                        background: isSelected ? "#ff2d3a" : "transparent",
                        color: isSelected ? "#000" : "#fff",
                        border: isSelected ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Message */}
        <AnimatePresence>
          {currentFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: "12px 18px",
                borderRadius: "4px",
                marginBottom: "20px",
                background: currentFeedback.type === "success" ? "rgba(76, 175, 80, 0.15)" : "rgba(217, 30, 43, 0.18)",
                border: currentFeedback.type === "success" ? "1.5px solid #4caf50" : "1.5px solid #d91e2b",
                color: currentFeedback.type === "success" ? "#a5d6a7" : "#ff8a80",
                fontSize: "13.5px",
                fontWeight: "bold",
                letterSpacing: "0.06em",
              }}
            >
              {currentFeedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint Disclosure */}
        {isHintOpen ? (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(255, 213, 79, 0.1)",
              border: "1px dashed #ffd54f",
              borderRadius: "4px",
              color: "#ffe082",
              fontSize: "12.5px",
              marginBottom: "20px",
            }}
          >
            💡 DECRYPTED INTEL: {currentQ.hint}
          </div>
        ) : (
          currentQ.hint && (
            <div style={{ marginBottom: "20px" }}>
              <button
                type="button"
                onClick={handleUnlockHint}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 213, 79, 0.4)",
                  color: "#ffd54f",
                  padding: "4px 12px",
                  borderRadius: "3px",
                  fontSize: "11px",
                  fontFamily: '"Share Tech Mono", monospace',
                  cursor: "pointer",
                }}
              >
                🔒 UNLOCK CLUE HINT (-10 PTS)
              </button>
            </div>
          )
        )}

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => {
                sfx("click");
                setActiveIdx((i) => Math.max(0, i - 1));
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: activeIdx === 0 ? "rgba(255,255,255,0.2)" : "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 20px",
                borderRadius: "3px",
                fontSize: "12px",
                fontFamily: '"Share Tech Mono", monospace',
                cursor: activeIdx === 0 ? "not-allowed" : "pointer",
              }}
            >
              ◀ PREVIOUS ANOMALY
            </button>
            <button
              type="button"
              disabled={activeIdx === questions.length - 1}
              onClick={() => {
                sfx("click");
                setActiveIdx((i) => Math.min(questions.length - 1, i + 1));
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: activeIdx === questions.length - 1 ? "rgba(255,255,255,0.2)" : "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 20px",
                borderRadius: "3px",
                fontSize: "12px",
                fontFamily: '"Share Tech Mono", monospace',
                cursor: activeIdx === questions.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              NEXT ANOMALY ▶
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmitAnswer}
            style={{
              background: "#d91e2b",
              color: "#000000",
              fontWeight: 900,
              fontSize: "15px",
              letterSpacing: "0.14em",
              padding: "12px 34px",
              border: "2px solid #ff2d3a",
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(217, 30, 43, 0.4)",
              fontFamily: '"Share Tech Mono", monospace',
              transition: "all 0.15s ease",
            }}
          >
            {isCurrentSolved ? "✓ RESUBMIT CHECKSUM" : "TRANSMIT VERIFICATION CHECKSUM ➔"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
