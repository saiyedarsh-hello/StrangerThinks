"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { QuizQuestion, StageQuestionType } from "@/lib/chapterQuestions";

interface QuestionTypeRendererProps {
  question: QuizQuestion;
  selectedAnswer: string | undefined;
  onSelectOption: (optionId: string, silent?: boolean) => void;
  isVecnaMode?: boolean;
  disabled?: boolean;
  questionIndex?: number;
  isFirstQuestion?: boolean;
  isVerified?: boolean;
  isLocked?: boolean;
}

export default function QuestionTypeRenderer({
  question,
  selectedAnswer,
  onSelectOption,
  isVecnaMode = false,
  disabled = false,
  questionIndex,
  isFirstQuestion: isFirstQuestionProp,
  isVerified = false,
  isLocked = false,
}: QuestionTypeRendererProps) {
  const stageType: StageQuestionType = question.stageType || "quiz";
  const isFirstQuestion =
    isFirstQuestionProp !== undefined
      ? isFirstQuestionProp
      : questionIndex !== undefined
      ? questionIndex === 0
      : false;

  // Reorder state for Stage 3 (Initialized with saved tokens if available)
  const [reorderedTokens, setReorderedTokens] = useState<string[]>(() => {
    if (typeof window !== "undefined" && question.rearrangeData && question.id) {
      try {
        const saved = localStorage.getItem(`hawkins_rearrange_${question.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === question.rearrangeData.tokens.length) {
            return parsed;
          }
        }
      } catch {}
    }
    return question.rearrangeData ? [...question.rearrangeData.tokens] : [];
  });
  const [draggedTokenIdx, setDraggedTokenIdx] = useState<number | null>(null);
  const [dragOverTokenIdx, setDragOverTokenIdx] = useState<number | null>(null);
  const [selectedTokenIdx, setSelectedTokenIdx] = useState<number | null>(null);

  // Connection state for Stage 2: leftId -> rightId
  const [activeConnections, setActiveConnections] = useState<Record<string, string>>({});
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);

  // Ghost tutorial state for Stage 2 & Stage 3
  const [hasInteracted, setHasInteracted] = useState(false);
  const [ghostCoords, setGhostCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [reorderGhostCoords, setReorderGhostCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // SVG String rendering coordinates
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftPinsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPinsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>>([]);

  // Stage 3 Reorder container and tile refs
  const reorderContainerRef = useRef<HTMLDivElement | null>(null);
  const reorderTilesRef = useRef<Record<number, HTMLDivElement | null>>({});

  // Helper to persist rearrange order
  const saveTokensToStorage = useCallback((tokens: string[]) => {
    if (typeof window !== "undefined" && question.id) {
      try {
        localStorage.setItem(`hawkins_rearrange_${question.id}`, JSON.stringify(tokens));
      } catch {}
    }
  }, [question.id]);

  // Initialize/sync state when question changes
  useEffect(() => {
    if (question.rearrangeData) {
      let initialTokens = [...question.rearrangeData.tokens];
      if (typeof window !== "undefined" && question.id) {
        try {
          const saved = localStorage.getItem(`hawkins_rearrange_${question.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === question.rearrangeData.tokens.length) {
              initialTokens = parsed;
            }
          }
        } catch {}
      }
      setReorderedTokens(initialTokens);
      // Silently set option if sequence already matches correct order
      const isMatch =
        initialTokens.length === question.rearrangeData.correctOrder.length &&
        initialTokens.every((tok, idx) => tok === question.rearrangeData!.correctOrder[idx]);
      if (isMatch) {
        onSelectOption(question.correctAnswerId, true);
      }
    }
    setActiveConnections({});
    setSelectedLeftId(null);
    setHasInteracted(false);
    setDraggedTokenIdx(null);
    setDragOverTokenIdx(null);
    setSelectedTokenIdx(null);
    setReorderGhostCoords(null);
  }, [question.id, question.correctAnswerId]);

  // Recalculate ghost tutorial coordinates for Stage 2 (First question only)
  useEffect(() => {
    if (stageType !== "connection" || !isFirstQuestion || hasInteracted) {
      setGhostCoords(null);
      return;
    }
    const calcGhost = () => {
      if (!containerRef.current) return;
      const firstPair = question.connectionData?.pairs[0];
      if (!firstPair) return;
      const leftEl = leftPinsRef.current[firstPair.leftId];
      const rightEl = rightPinsRef.current[firstPair.rightId] || Object.values(rightPinsRef.current)[0];
      if (leftEl && rightEl) {
        const cRect = containerRef.current.getBoundingClientRect();
        const lRect = leftEl.getBoundingClientRect();
        const rRect = rightEl.getBoundingClientRect();
        setGhostCoords({
          x1: lRect.left + lRect.width / 2 - cRect.left,
          y1: lRect.top + lRect.height / 2 - cRect.top,
          x2: rRect.left + rRect.width / 2 - cRect.left,
          y2: rRect.top + rRect.height / 2 - cRect.top,
        });
      }
    };
    const t = setTimeout(calcGhost, 160);
    window.addEventListener("resize", calcGhost);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calcGhost);
    };
  }, [stageType, hasInteracted, isFirstQuestion, question.id, question.connectionData]);

  // Recalculate ghost tutorial coordinates for Stage 3 (First question only)
  useEffect(() => {
    if (stageType !== "rearrange" || !isFirstQuestion || hasInteracted) {
      setReorderGhostCoords(null);
      return;
    }
    const calcReorderGhost = () => {
      if (!reorderContainerRef.current) return;
      const el0 = reorderTilesRef.current[0];
      const el1 = reorderTilesRef.current[2] || reorderTilesRef.current[1];
      if (el0 && el1) {
        const cRect = reorderContainerRef.current.getBoundingClientRect();
        const r0 = el0.getBoundingClientRect();
        const r1 = el1.getBoundingClientRect();
        setReorderGhostCoords({
          x1: r0.left + r0.width / 2 - cRect.left,
          y1: r0.top + r0.height / 2 - cRect.top,
          x2: r1.left + r1.width / 2 - cRect.left,
          y2: r1.top + r1.height / 2 - cRect.top,
        });
      }
    };
    const t = setTimeout(calcReorderGhost, 200);
    window.addEventListener("resize", calcReorderGhost);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", calcReorderGhost);
    };
  }, [stageType, hasInteracted, isFirstQuestion, question.id, reorderedTokens.length]);

  // Recalculate SVG string coordinates for Stage 2
  const updateStringCoordinates = useCallback(() => {
    if (!containerRef.current || stageType !== "connection") return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }> = [];

    Object.entries(activeConnections).forEach(([leftId, rightId]) => {
      const leftEl = leftPinsRef.current[leftId];
      const rightEl = rightPinsRef.current[rightId];
      if (leftEl && rightEl) {
        const lRect = leftEl.getBoundingClientRect();
        const rRect = rightEl.getBoundingClientRect();
        newLines.push({
          key: `${leftId}-${rightId}`,
          x1: lRect.left + lRect.width / 2 - containerRect.left,
          y1: lRect.top + lRect.height / 2 - containerRect.top,
          x2: rRect.left + rRect.width / 2 - containerRect.left,
          y2: rRect.top + rRect.height / 2 - containerRect.top,
        });
      }
    });

    setLines(newLines);
  }, [activeConnections, stageType]);

  useEffect(() => {
    updateStringCoordinates();
    window.addEventListener("resize", updateStringCoordinates);
    const timer = setTimeout(updateStringCoordinates, 60);
    return () => {
      window.removeEventListener("resize", updateStringCoordinates);
      clearTimeout(timer);
    };
  }, [updateStringCoordinates, activeConnections]);

  // Handle Stage 2 Connection logic
  const handleConnect = (leftId: string, rightId: string) => {
    if (disabled) return;
    setHasInteracted(true);
    sfx("click");
    const updated = { ...activeConnections, [leftId]: rightId };
    setActiveConnections(updated);
    setSelectedLeftId(null);

    // Verify answers if all pairs connected
    const totalPairs = question.connectionData?.pairs.length || 0;
    if (Object.keys(updated).length === totalPairs && totalPairs > 0) {
      const isAllCorrect = question.connectionData!.pairs.every(
        (p) => updated[p.leftId]?.toLowerCase() === p.rightId.toLowerCase()
      );
      if (isAllCorrect) {
        onSelectOption(question.correctAnswerId);
      } else {
        onSelectOption("__WRONG_CONNECTION__");
      }
    } else {
      onSelectOption("");
    }
  };

  const handleResetConnections = () => {
    if (disabled) return;
    setHasInteracted(true);
    sfx("click");
    setActiveConnections({});
    setSelectedLeftId(null);
    onSelectOption("");
  };

  // Stage 3 Reorder Logic
  const checkReorderMatch = useCallback((tokens: string[]) => {
    if (question.rearrangeData) {
      const isMatch =
        tokens.length === question.rearrangeData.correctOrder.length &&
        tokens.every((tok, idx) => tok === question.rearrangeData!.correctOrder[idx]);
      if (isMatch) {
        // Do NOT play sfx("clue") - keep it silent so user must check their answer!
        onSelectOption(question.correctAnswerId, true);
      } else {
        onSelectOption("__WRONG_REARRANGE__", true);
      }
    }
  }, [question.rearrangeData, question.correctAnswerId, onSelectOption]);

  const handleMoveToken = (index: number, direction: "up" | "down" | "left" | "right") => {
    if (disabled) return;
    setHasInteracted(true);
    sfx("click");
    const targetIdx = direction === "up" || direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= reorderedTokens.length) return;
    const updated = [...reorderedTokens];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setReorderedTokens(updated);
    saveTokensToStorage(updated);
    setSelectedTokenIdx(null);
    checkReorderMatch(updated);
  };

  const handleDropToken = (targetIndex: number) => {
    setHasInteracted(true);
    if (disabled || draggedTokenIdx === null || draggedTokenIdx === targetIndex) {
      setDraggedTokenIdx(null);
      setDragOverTokenIdx(null);
      return;
    }
    sfx("click");
    const updated = [...reorderedTokens];
    const [moved] = updated.splice(draggedTokenIdx, 1);
    updated.splice(targetIndex, 0, moved);
    setReorderedTokens(updated);
    saveTokensToStorage(updated);
    setDraggedTokenIdx(null);
    setDragOverTokenIdx(null);
    setSelectedTokenIdx(null);
    checkReorderMatch(updated);
  };

  const handleSelectToken = (index: number) => {
    if (disabled) return;
    setHasInteracted(true);
    sfx("click");
    if (selectedTokenIdx === null) {
      setSelectedTokenIdx(index);
    } else if (selectedTokenIdx === index) {
      setSelectedTokenIdx(null);
    } else {
      // Swap the two tokens
      const updated = [...reorderedTokens];
      const temp = updated[selectedTokenIdx];
      updated[selectedTokenIdx] = updated[index];
      updated[index] = temp;
      setReorderedTokens(updated);
      saveTokensToStorage(updated);
      setSelectedTokenIdx(null);
      checkReorderMatch(updated);
    }
  };

  const handleResetRearrange = () => {
    if (disabled || !question.rearrangeData) return;
    setHasInteracted(true);
    sfx("click");
    const initialTokens = [...question.rearrangeData.tokens];
    setReorderedTokens(initialTokens);
    if (typeof window !== "undefined" && question.id) {
      try {
        localStorage.removeItem(`hawkins_rearrange_${question.id}`);
      } catch {}
    }
    setSelectedTokenIdx(null);
    setDraggedTokenIdx(null);
    setDragOverTokenIdx(null);
    checkReorderMatch(initialTokens);
  };

  // Theme tokens for Old Classic Paper
  const paperBorder = isVecnaMode ? "1.5px solid #a82028" : "1.5px solid #c9bda4";
  const paperAccent = isVecnaMode ? "#b81d24" : "#8b2500";
  const textColor = "#1f1812";
  const mutedText = "#5c4f42";

  // Only reveal verified styling if the user actually clicked check and verified the answer
  const showVerifiedState = Boolean(isVerified);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
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
          STAGE 2: CONNECTION QUESTIONS (DRAG-AND-DROP & RED STRINGS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "connection" && question.connectionData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div
            style={{
              fontSize: "12px",
              lineHeight: 1.25,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {question.question}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "10px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              color: mutedText,
              letterSpacing: ".08em",
            }}
          >
            <span>DRAG OR CLICK ITEMS IN COLUMN A TO CONNECT WITH COLUMN B:</span>
            {Object.keys(activeConnections).length > 0 && (
              <button
                type="button"
                onClick={handleResetConnections}
                style={{
                  background: "#e4dac4",
                  border: "1px solid #b8a691",
                  borderRadius: "2px",
                  padding: "1px 5px",
                  cursor: "pointer",
                  fontSize: "9.5px",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 900,
                  color: "#8f231e",
                }}
              >
                RESET STRINGS
              </button>
            )}
          </div>

          {/* Interactive Dual-Column Connection Board with SVG Strings (Shorter Answer Boxes & Centered) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              margin: "1px auto 2px",
            }}
          >
            <div
              ref={containerRef}
              onClick={() => setHasInteracted(true)}
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "minmax(240px, 340px) minmax(240px, 340px)",
                gap: "clamp(10px, 1.5vw, 20px)",
                padding: "4px 10px",
                background: "rgba(255, 255, 255, 0.65)",
                border: paperBorder,
                borderRadius: "4px",
                boxShadow: "inset 0 1px 6px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)",
                boxSizing: "border-box",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              {/* Ghost Cursor Interactive Tutorial Overlay (First question only) */}
              {isFirstQuestion && ghostCoords && !hasInteracted && Object.keys(activeConnections).length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 25,
                    overflow: "visible",
                  }}
                >
                  <svg
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  >
                    {/* Animated dotted tutorial string */}
                    <motion.path
                      d={`M ${ghostCoords.x1} ${ghostCoords.y1} C ${(ghostCoords.x1 + ghostCoords.x2) / 2} ${ghostCoords.y1 + 10}, ${(ghostCoords.x1 + ghostCoords.x2) / 2} ${ghostCoords.y2 + 10}, ${ghostCoords.x2} ${ghostCoords.y2}`}
                      stroke="#c41e24"
                      strokeWidth="2.5"
                      strokeDasharray="5 4"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 0, 1, 1, 0],
                        opacity: [0, 0.9, 0.9, 0, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        times: [0, 0.2, 0.7, 0.9, 1],
                        ease: "easeInOut",
                      }}
                    />
                    {/* Pulsing beacon on source pin */}
                    <motion.circle
                      cx={ghostCoords.x1}
                      cy={ghostCoords.y1}
                      r="8"
                      fill="none"
                      stroke="#c41e24"
                      strokeWidth="2"
                      animate={{
                        scale: [1, 2, 1],
                        opacity: [0.8, 0, 0.8],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  </svg>

                  {/* Animated Ghost Pointer Cursor */}
                  <motion.div
                    initial={{ x: ghostCoords.x1, y: ghostCoords.y1, opacity: 0 }}
                    animate={{
                      x: [ghostCoords.x1, ghostCoords.x1, ghostCoords.x2, ghostCoords.x2, ghostCoords.x1],
                      y: [ghostCoords.y1, ghostCoords.y1, ghostCoords.y2, ghostCoords.y2, ghostCoords.y1],
                      opacity: [0, 1, 1, 0, 0],
                      scale: [0.9, 1.15, 1, 0.9, 0.9],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      times: [0, 0.2, 0.7, 0.9, 1],
                      ease: "easeInOut",
                    }}
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5.5 3.2L18.5 12.8L12.2 14.1L15.5 20.8L12.5 22.2L9.2 15.5L4.8 19.2V3.2Z"
                        fill="#c41e24"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span
                      style={{
                        background: "#24130d",
                        color: "#ffcbb6",
                        border: "1px solid #8f2d24",
                        padding: "2px 7px",
                        borderRadius: 3,
                        fontSize: 9.5,
                        fontFamily: "'Courier New', monospace",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        letterSpacing: ".08em",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                      }}
                    >
                      DRAG TO MATCH
                    </span>
                  </motion.div>
                </div>
              )}

              {/* SVG Overlay for Red Investigation Strings */}
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                {lines.map((line) => {
                  const midX = (line.x1 + line.x2) / 2;
                  return (
                    <g key={line.key}>
                      {/* Shadow / Glow */}
                      <path
                        d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1 + 14}, ${midX} ${line.y2 + 14}, ${line.x2} ${line.y2}`}
                        stroke="rgba(255, 45, 58, 0.4)"
                        strokeWidth="6"
                        fill="none"
                      />
                      {/* Main Red String */}
                      <path
                        d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1 + 14}, ${midX} ${line.y2 + 14}, ${line.x2} ${line.y2}`}
                        stroke="#c41e24"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Anchor Pin Knots */}
                      <circle cx={line.x1} cy={line.y1} r="5" fill="#8f1218" stroke="#fff" strokeWidth="1.5" />
                      <circle cx={line.x2} cy={line.y2} r="5" fill="#8f1218" stroke="#fff" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>

              {/* Left Column (Column A) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", zIndex: 12 }}>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 900,
                    letterSpacing: ".1em",
                    color: paperAccent,
                    borderBottom: "1px solid #d4c4a8",
                    paddingBottom: "2px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  COLUMN A (SCENARIOS & VALUES)
                </div>
                {question.connectionData.pairs.map((p, idx) => {
                  const isSelected = selectedLeftId === p.leftId;
                  const isConnected = !!activeConnections[p.leftId];
                  const connectedRight = activeConnections[p.leftId];

                  return (
                    <div
                      key={p.leftId}
                      draggable={!disabled}
                      onDragStart={(e) => {
                        setHasInteracted(true);
                        e.dataTransfer.setData("text/plain", p.leftId);
                        setSelectedLeftId(p.leftId);
                      }}
                      onClick={() => {
                        if (disabled) return;
                        setHasInteracted(true);
                        sfx("click");
                        setSelectedLeftId(isSelected ? null : p.leftId);
                      }}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        padding: "3px 8px",
                        minHeight: "30px",
                        background: isSelected
                          ? "rgba(184, 29, 36, 0.12)"
                          : isConnected
                          ? "#fdf7f4"
                          : "#ffffff",
                        border: isSelected
                          ? "1.5px solid #b81d24"
                          : isConnected
                          ? "1.5px solid #c48a80"
                          : "1px solid #d4c4a8",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontFamily: "'Courier New', monospace",
                        lineHeight: 1.3,
                        cursor: "grab",
                        boxShadow: isSelected
                          ? "0 2px 6px rgba(184, 29, 36, 0.2)"
                          : "0 1px 2px rgba(0,0,0,0.04)",
                        transition: "background 0.15s ease, border-color 0.15s ease",
                        userSelect: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 900,
                            color: paperAccent,
                            flexShrink: 0,
                          }}
                        >
                          [{idx + 1}]
                        </span>
                        <span style={{ color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.leftText}
                        </span>
                        {connectedRight && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              color: "#8f1218",
                              fontWeight: 800,
                              marginLeft: "auto",
                              marginRight: "2px",
                              padding: "1px 4px",
                              background: "rgba(184, 29, 36, 0.1)",
                              borderRadius: "2px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            → {connectedRight}
                          </span>
                        )}
                      </div>

                      {/* Right Connection Pin Socket */}
                      <div
                        ref={(el) => {
                          leftPinsRef.current[p.leftId] = el;
                        }}
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: isConnected ? "#c41e24" : isSelected ? "#ff2d3a" : "#d4c4a8",
                          border: "2px solid #fff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          flexShrink: 0,
                        }}
                        title="Drag from here to Column B"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Right Column (Column B) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", zIndex: 12 }}>
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 900,
                    letterSpacing: ".1em",
                    color: "#184070",
                    borderBottom: "1px solid #d4c4a8",
                    paddingBottom: "2px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  COLUMN B (MATCH TARGETS)
                </div>
                {question.connectionData.pairs.map((p) => {
                  // Find if any left item connects to this right item
                  const connectedFromLeft = Object.entries(activeConnections).find(
                    ([, rId]) => rId === p.rightId
                  )?.[0];

                  return (
                    <div
                      key={p.rightId}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setHasInteracted(true);
                        const leftId = e.dataTransfer.getData("text/plain") || selectedLeftId;
                        if (leftId) handleConnect(leftId, p.rightId);
                      }}
                      onClick={() => {
                        setHasInteracted(true);
                        if (selectedLeftId) {
                          handleConnect(selectedLeftId, p.rightId);
                        }
                      }}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "3px 8px",
                        minHeight: "30px",
                        background: connectedFromLeft ? "#fdf7f4" : "#fdfbf7",
                        border: connectedFromLeft
                          ? "1.5px solid #c48a80"
                          : selectedLeftId
                          ? "1.5px dashed #205080"
                          : "1px solid #c9bda4",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontFamily: "'Courier New', monospace",
                        lineHeight: 1.3,
                        cursor: selectedLeftId ? "pointer" : "default",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        transition: "background 0.15s ease, border-color 0.15s ease",
                        userSelect: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Left Connection Pin Socket */}
                      <div
                        ref={(el) => {
                          rightPinsRef.current[p.rightId] = el;
                        }}
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: connectedFromLeft ? "#c41e24" : "#c9bda4",
                          border: "2px solid #fff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          flexShrink: 0,
                        }}
                        title="Drop target socket"
                      />

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: 900,
                            color: "#184070",
                            flexShrink: 0,
                          }}
                        >
                          ({p.rightId})
                        </span>
                        <span style={{ color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.rightText}
                        </span>
                        {connectedFromLeft && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              color: "#8f1218",
                              fontWeight: 800,
                              marginLeft: "auto",
                              padding: "1px 4px",
                              background: "rgba(184, 29, 36, 0.1)",
                              borderRadius: "2px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            ← [{connectedFromLeft}]
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Connection Summary Bar */}
          <div
            style={{
              padding: "4px 8px",
              background: "#e9dfcb",
              borderRadius: "2px",
              borderLeft: `3px solid ${paperAccent}`,
              fontSize: "10px",
              fontFamily: "'Courier New', Courier, monospace",
              color: "#2b1c11",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <div>
              <b>CONNECTED STRINGS:</b>{" "}
              {Object.keys(activeConnections).length === 0
                ? "NONE (CONNECT ALL 4 PAIRS BEFORE SUBMITTING)"
                : Object.entries(activeConnections)
                    .map(([l, r]) => `${l}–${r}`)
                    .join("  |  ")}
            </div>
            <div>
              [{Object.keys(activeConnections).length} / {question.connectionData.pairs.length} STRINGS TIED]
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 3: REARRANGE QUESTIONS (BYERS CIPHER WORKBENCH WITH DRAG & DROP)
          ────────────────────────────────────────────────────────── */}
      {stageType === "rearrange" && question.rearrangeData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%" }}>
          <div
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: textColor,
              fontWeight: 700,
              fontFamily: "'Courier New', Courier, monospace",
              background: "rgba(255, 255, 255, 0.55)",
              padding: "14px 18px",
              border: paperBorder,
              borderRadius: "2px",
            }}
          >
            {question.question}
          </div>

          {/* Interactive Reordering Workbench */}
          <div
            ref={reorderContainerRef}
            onClick={() => setHasInteracted(true)}
            style={{
              position: "relative",
              padding: "14px 16px",
              background: isVecnaMode
                ? "linear-gradient(180deg, rgba(38, 16, 18, 0.75), rgba(24, 10, 12, 0.85))"
                : "linear-gradient(180deg, rgba(253, 249, 240, 0.95), rgba(246, 238, 222, 0.92))",
              border: showVerifiedState
                ? "2px solid #27ae60"
                : isLocked && !showVerifiedState
                ? "2px solid #b81d24"
                : paperBorder,
              borderRadius: "4px",
              boxShadow: showVerifiedState
                ? "0 0 16px rgba(39, 174, 96, 0.25)"
                : isLocked && !showVerifiedState
                ? "0 0 16px rgba(184, 29, 36, 0.25)"
                : "0 2px 10px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Ghost Cursor Interactive Tutorial Overlay for Stage 3 (First question only) */}
            {isFirstQuestion && reorderGhostCoords && !hasInteracted && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 30,
                  overflow: "visible",
                }}
              >
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  {/* Animated curved drag path */}
                  <motion.path
                    d={`M ${reorderGhostCoords.x1} ${reorderGhostCoords.y1} Q ${(reorderGhostCoords.x1 + reorderGhostCoords.x2) / 2} ${Math.min(reorderGhostCoords.y1, reorderGhostCoords.y2) - 28}, ${reorderGhostCoords.x2} ${reorderGhostCoords.y2}`}
                    stroke="#c41e24"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: [0, 0, 1, 1, 0],
                      opacity: [0, 0.9, 0.9, 0, 0],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      times: [0, 0.2, 0.7, 0.9, 1],
                      ease: "easeInOut",
                    }}
                  />
                  {/* Pulsing beacon on source tile */}
                  <motion.circle
                    cx={reorderGhostCoords.x1}
                    cy={reorderGhostCoords.y1}
                    r="12"
                    fill="none"
                    stroke="#c41e24"
                    strokeWidth="2"
                    animate={{
                      scale: [1, 1.8, 1],
                      opacity: [0.8, 0, 0.8],
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                  {/* Target drop slot marker */}
                  <motion.circle
                    cx={reorderGhostCoords.x2}
                    cy={reorderGhostCoords.y2}
                    r="10"
                    fill="none"
                    stroke="#b81d24"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    animate={{
                      opacity: [0, 0.2, 0.8, 0.2, 0],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      times: [0, 0.3, 0.7, 0.9, 1],
                    }}
                  />
                </svg>

                {/* Animated Ghost Pointer Cursor */}
                <motion.div
                  initial={{ x: reorderGhostCoords.x1, y: reorderGhostCoords.y1, opacity: 0 }}
                  animate={{
                    x: [reorderGhostCoords.x1, reorderGhostCoords.x1, reorderGhostCoords.x2, reorderGhostCoords.x2, reorderGhostCoords.x1],
                    y: [reorderGhostCoords.y1, reorderGhostCoords.y1, reorderGhostCoords.y2, reorderGhostCoords.y2, reorderGhostCoords.y1],
                    opacity: [0, 1, 1, 0, 0],
                    scale: [0.9, 1.15, 1, 0.9, 0.9],
                  }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    times: [0, 0.2, 0.7, 0.9, 1],
                    ease: "easeInOut",
                  }}
                  style={{
                    position: "absolute",
                    top: -6,
                    left: -6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5.5 3.2L18.5 12.8L12.2 14.1L15.5 20.8L12.5 22.2L9.2 15.5L4.8 19.2V3.2Z"
                      fill="#c41e24"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span
                    style={{
                      background: "#24130d",
                      color: "#ffcbb6",
                      border: "1px solid #8f2d24",
                      padding: "2px 7px",
                      borderRadius: 3,
                      fontSize: 9.5,
                      fontFamily: "'Courier New', monospace",
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                      letterSpacing: ".08em",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                    }}
                  >
                    DRAG TO RE-ARRANGE
                  </span>
                </motion.div>
              </div>
            )}

            {/* Header: Target description & Action toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                borderBottom: "1px solid #dcd2be",
                paddingBottom: "10px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: ".12em",
                    color: paperAccent,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  TARGET:
                </span>{" "}
                <span
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: textColor,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {question.rearrangeData.targetDescription.toUpperCase()}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 800,
                    letterSpacing: ".06em",
                    color: "#6b5e50",
                    background: "rgba(0,0,0,0.05)",
                    padding: "3px 8px",
                    borderRadius: "2px",
                  }}
                >
                  DRAG & DROP TILES TO RE-ORDER
                </span>
                <button
                  type="button"
                  onClick={handleResetRearrange}
                  disabled={disabled}
                  style={{
                    background: "#ece2ce",
                    border: "1px solid #c9bda4",
                    borderRadius: "2px",
                    padding: "4px 8px",
                    cursor: disabled ? "default" : "pointer",
                    fontSize: "10.5px",
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 900,
                    color: "#8f231e",
                  }}
                >
                  RESET ORDER
                </button>
              </div>
            </div>

            {/* Christmas Lights Garland (for Words / Scrambled Letters) */}
            {question.rearrangeData.category === "words" && (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  marginBottom: "-6px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "clamp(6px, 1.2vw, 14px)",
                    width: "100%",
                    maxWidth: "680px",
                    position: "relative",
                  }}
                >
                  {/* Garland black wire */}
                  <svg
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 0,
                      width: "100%",
                      height: "18px",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  >
                    <path
                      d="M 10 8 Q 200 18, 400 8 T 800 8"
                      stroke="#42362b"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>

                  {/* Miniature Christmas Bulbs */}
                  {reorderedTokens.map((_, idx) => {
                    const bulbColors = ["#ff3344", "#10b981", "#f59e0b", "#38bdf8", "#ec4899"];
                    const bulbColor = showVerifiedState ? "#10b981" : bulbColors[idx % bulbColors.length];
                    return (
                      <div
                        key={`bulb-${idx}`}
                        style={{
                          width: "clamp(38px, 4.5vw, 54px)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          zIndex: 2,
                        }}
                      >
                        {/* Socket Cap */}
                        <div
                          style={{
                            width: "8px",
                            height: "5px",
                            background: "#26201a",
                            borderRadius: "1px 1px 0 0",
                          }}
                        />
                        {/* Glowing Bulb */}
                        <div
                          style={{
                            width: "10px",
                            height: "14px",
                            borderRadius: "50% 50% 45% 45%",
                            background: bulbColor,
                            boxShadow: `0 0 8px ${bulbColor}, inset -1px -1px 2px rgba(0,0,0,0.35)`,
                            border: "1px solid rgba(255,255,255,0.4)",
                            transition: "all 0.3s ease",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Letter Tiles Tray (category: "words") */}
            {question.rearrangeData.category === "words" ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "clamp(6px, 1.2vw, 14px)",
                  padding: "10px 4px",
                }}
              >
                {reorderedTokens.map((tok, idx) => {
                  const isSelected = selectedTokenIdx === idx;
                  const isDragged = draggedTokenIdx === idx;
                  const isDragOver = dragOverTokenIdx === idx;

                  return (
                    <motion.div
                      layout
                      key={`${tok}-${idx}`}
                      ref={(el) => {
                        reorderTilesRef.current[idx] = el;
                      }}
                      draggable={!disabled}
                      onDragStart={(e: any) => {
                        if (disabled) return;
                        setDraggedTokenIdx(idx);
                        e.dataTransfer?.setData("text/plain", String(idx));
                        sfx("click");
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDragEnter={() => {
                        if (draggedTokenIdx !== null && draggedTokenIdx !== idx) {
                          setDragOverTokenIdx(idx);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverTokenIdx === idx) {
                          setDragOverTokenIdx(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropToken(idx);
                      }}
                      onDragEnd={() => {
                        setDraggedTokenIdx(null);
                        setDragOverTokenIdx(null);
                      }}
                      onClick={() => handleSelectToken(idx)}
                      whileHover={{ y: -3, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      style={{
                        position: "relative",
                        width: "clamp(38px, 4.5vw, 54px)",
                        height: "clamp(52px, 6vw, 68px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isSelected
                          ? "#ffe8e6"
                          : isDragOver
                          ? "#fff3d4"
                          : "#fdfaf3",
                        border: isSelected
                          ? "2px solid #b81d24"
                          : isDragOver
                          ? "2px dashed #b81d24"
                          : "2px solid #a89478",
                        borderRadius: "4px",
                        boxShadow: isSelected
                          ? "0 0 0 2px rgba(184, 29, 36, 0.4), 0 4px 10px rgba(0,0,0,0.15)"
                          : isDragOver
                          ? "0 4px 12px rgba(184, 29, 36, 0.3)"
                          : "0 4px 0 #9e896d, 0 6px 12px rgba(0,0,0,0.12)",
                        cursor: disabled ? "default" : "grab",
                        opacity: isDragged ? 0.35 : 1,
                        userSelect: "none",
                        transition: "border 0.15s, background 0.15s, box-shadow 0.15s",
                      }}
                      title="Drag to reorder, or click two letters to swap"
                    >
                      {/* Slot position marker */}
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: "4px",
                          fontSize: "8.5px",
                          fontWeight: 900,
                          color: "#96816a",
                          fontFamily: "'Courier New', monospace",
                        }}
                      >
                        {idx + 1}
                      </span>

                      {/* Letter Glyph */}
                      <span
                        style={{
                          fontSize: "clamp(20px, 2.4vw, 28px)",
                          fontWeight: 900,
                          color: isSelected ? "#b81d24" : "#1a120b",
                          fontFamily: "'Courier New', Courier, monospace",
                          marginTop: "2px",
                        }}
                      >
                        {tok}
                      </span>

                      {/* Tactile drag grip indicator */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: "2px",
                          fontSize: "8px",
                          letterSpacing: "1px",
                          color: "#ab9880",
                          lineHeight: 1,
                        }}
                      >
                        :::
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Statement / Code / Steps Tiles Tray */
              (() => {
                const isShortTokens = reorderedTokens.every((t) => t.length <= 16);

                if (isShortTokens) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        padding: "6px 2px",
                        alignItems: "center",
                      }}
                    >
                      {reorderedTokens.map((tok, idx) => {
                        const isSelected = selectedTokenIdx === idx;
                        const isDragged = draggedTokenIdx === idx;
                        const isDragOver = dragOverTokenIdx === idx;

                        return (
                          <motion.div
                            layout
                            key={`${tok}-${idx}`}
                            ref={(el) => {
                              reorderTilesRef.current[idx] = el;
                            }}
                            draggable={!disabled}
                            onDragStart={(e: any) => {
                              if (disabled) return;
                              setDraggedTokenIdx(idx);
                              e.dataTransfer?.setData("text/plain", String(idx));
                              sfx("click");
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={() => {
                              if (draggedTokenIdx !== null && draggedTokenIdx !== idx) {
                                setDragOverTokenIdx(idx);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverTokenIdx === idx) {
                                setDragOverTokenIdx(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropToken(idx);
                            }}
                            onDragEnd={() => {
                              setDraggedTokenIdx(null);
                              setDragOverTokenIdx(null);
                            }}
                            onClick={() => handleSelectToken(idx)}
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "6px 12px",
                              background: isSelected
                                ? "#ffeae8"
                                : isDragOver
                                ? "#fff3d4"
                                : "#ffffff",
                              border: isSelected
                                ? "2px solid #b81d24"
                                : isDragOver
                                ? "2px dashed #b81d24"
                                : "1.5px solid #c9bda4",
                              borderRadius: "3px",
                              boxShadow: isSelected
                                ? "0 2px 8px rgba(184, 29, 36, 0.25)"
                                : "0 1px 3px rgba(0,0,0,0.06)",
                              cursor: disabled ? "default" : "grab",
                              opacity: isDragged ? 0.35 : 1,
                              userSelect: "none",
                              transition: "background 0.15s, border 0.15s",
                            }}
                            title="Drag to reorder or click two items to swap"
                          >
                            <span
                              style={{
                                color: "#96816a",
                                fontWeight: 900,
                                fontSize: "11px",
                                cursor: "grab",
                                lineHeight: 1,
                              }}
                            >
                              ⋮⋮
                            </span>

                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 900,
                                color: paperAccent,
                                fontFamily: "'Courier New', monospace",
                              }}
                            >
                              [{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}]
                            </span>

                            <span
                              style={{
                                color: textColor,
                                fontFamily: "'Courier New', Courier, monospace",
                                fontSize: "13px",
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tok}
                            </span>

                            {/* Inline Nudge Arrows (Left / Right) */}
                            <div
                              style={{ display: "inline-flex", gap: "2px", marginLeft: "4px" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleMoveToken(idx, "left")}
                                disabled={idx === 0 || disabled}
                                style={{
                                  background: "#e4dac5",
                                  border: "none",
                                  borderRadius: "2px",
                                  cursor: idx === 0 || disabled ? "default" : "pointer",
                                  opacity: idx === 0 || disabled ? 0.3 : 1,
                                  padding: "2px 5px",
                                  fontSize: "9px",
                                  fontWeight: 900,
                                  lineHeight: 1,
                                }}
                                title="Move left"
                              >
                                ◄
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveToken(idx, "right")}
                                disabled={idx === reorderedTokens.length - 1 || disabled}
                                style={{
                                  background: "#e4dac5",
                                  border: "none",
                                  borderRadius: "2px",
                                  cursor: idx === reorderedTokens.length - 1 || disabled ? "default" : "pointer",
                                  opacity: idx === reorderedTokens.length - 1 || disabled ? 0.3 : 1,
                                  padding: "2px 5px",
                                  fontSize: "9px",
                                  fontWeight: 900,
                                  lineHeight: 1,
                                }}
                                title="Move right"
                              >
                                ►
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      maxHeight: "clamp(180px, 28vh, 270px)",
                      overflowY: "auto",
                      paddingRight: "6px",
                      padding: "2px 0",
                      scrollbarWidth: "thin",
                    }}
                  >
                    {reorderedTokens.map((tok, idx) => {
                      const isSelected = selectedTokenIdx === idx;
                      const isDragged = draggedTokenIdx === idx;
                      const isDragOver = dragOverTokenIdx === idx;

                      return (
                        <motion.div
                          layout
                          key={`${tok}-${idx}`}
                          ref={(el) => {
                            reorderTilesRef.current[idx] = el;
                          }}
                          draggable={!disabled}
                          onDragStart={(e: any) => {
                            if (disabled) return;
                            setDraggedTokenIdx(idx);
                            e.dataTransfer?.setData("text/plain", String(idx));
                            sfx("click");
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={() => {
                            if (draggedTokenIdx !== null && draggedTokenIdx !== idx) {
                              setDragOverTokenIdx(idx);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverTokenIdx === idx) {
                              setDragOverTokenIdx(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropToken(idx);
                          }}
                          onDragEnd={() => {
                            setDraggedTokenIdx(null);
                            setDragOverTokenIdx(null);
                          }}
                          onClick={() => handleSelectToken(idx)}
                          whileHover={{ x: 2 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            padding: "7px 12px",
                            background: isSelected
                              ? "#ffeae8"
                              : isDragOver
                              ? "#fff3d4"
                              : "#ffffff",
                            border: isSelected
                              ? "2px solid #b81d24"
                              : isDragOver
                              ? "2px dashed #b81d24"
                              : "1.5px solid #c9bda4",
                            borderRadius: "3px",
                            boxShadow: isSelected
                              ? "0 2px 8px rgba(184, 29, 36, 0.25)"
                              : "0 1px 3px rgba(0,0,0,0.06)",
                            cursor: disabled ? "default" : "grab",
                            opacity: isDragged ? 0.35 : 1,
                            userSelect: "none",
                            transition: "background 0.15s, border 0.15s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                            {/* Drag Handle Icon */}
                            <span
                              style={{
                                color: "#96816a",
                                fontWeight: 900,
                                fontSize: "11px",
                                cursor: "grab",
                                lineHeight: 1,
                              }}
                              title="Drag to reorder"
                            >
                              ⋮⋮
                            </span>

                            {/* Step index */}
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 900,
                                color: paperAccent,
                                fontFamily: "'Courier New', monospace",
                              }}
                            >
                              [{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}]
                            </span>

                            <span
                              style={{
                                color: textColor,
                                fontFamily: "'Courier New', Courier, monospace",
                                fontSize: "12.5px",
                                fontWeight: 700,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {tok}
                            </span>
                          </div>

                          {/* Nudge Arrows (Up / Down) */}
                          <div
                            style={{ display: "flex", gap: "4px", flexShrink: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveToken(idx, "up")}
                              disabled={idx === 0 || disabled}
                              style={{
                                background: "#e4dac5",
                                border: "none",
                                borderRadius: "2px",
                                cursor: idx === 0 || disabled ? "default" : "pointer",
                                opacity: idx === 0 || disabled ? 0.3 : 1,
                                padding: "3px 6px",
                                fontSize: "9px",
                                fontWeight: 900,
                              }}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveToken(idx, "down")}
                              disabled={idx === reorderedTokens.length - 1 || disabled}
                              style={{
                                background: "#e4dac5",
                                border: "none",
                                borderRadius: "2px",
                                cursor: idx === reorderedTokens.length - 1 || disabled ? "default" : "pointer",
                                opacity: idx === reorderedTokens.length - 1 || disabled ? 0.3 : 1,
                                padding: "3px 6px",
                                fontSize: "9px",
                                fontWeight: 900,
                              }}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()
            )}

            {/* Assembled Readout Banner */}
            <div
              style={{
                padding: "8px 12px",
                background: showVerifiedState
                  ? "rgba(39, 174, 96, 0.12)"
                  : isLocked && !showVerifiedState
                  ? "rgba(184, 29, 36, 0.12)"
                  : "#e9dfcb",
                border: showVerifiedState
                  ? "1.5px solid #27ae60"
                  : isLocked && !showVerifiedState
                  ? "1.5px solid #b81d24"
                  : "1px solid #d4c5a9",
                borderRadius: "3px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "'Courier New', Courier, monospace",
                  color: "#2b1c11",
                }}
              >
                <b>ASSEMBLED SEQUENCE:</b>{" "}
                <span
                  style={{
                    fontWeight: 900,
                    color: showVerifiedState
                      ? "#15652f"
                      : isLocked && !showVerifiedState
                      ? "#990f16"
                      : "#1a120b",
                    letterSpacing: question.rearrangeData.category === "words" ? ".15em" : "normal",
                  }}
                >
                  {question.rearrangeData.category === "words"
                    ? reorderedTokens.join("")
                    : reorderedTokens.join(" → ")}
                </span>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  color: showVerifiedState
                    ? "#1b7a41"
                    : isLocked && !showVerifiedState
                    ? "#990f16"
                    : "#755f4c",
                }}
              >
                {showVerifiedState
                  ? "DECRYPTED // MATCH VERIFIED"
                  : isLocked
                  ? "TERMINAL LOCKED // SEQUENCE REJECTED"
                  : reorderedTokens.length > 0
                  ? "SEQUENCE RECORDED"
                  : "ORDER PENDING"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          STAGE 4: CASE STUDY QUESTIONS (EVIDENCE REPORTS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "case_study" && question.caseStudyData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
          {/* Forensic Case Dossier Section */}
          <div
            style={{
              padding: "20px 24px",
              background: "#faf4e8",
              border: "2px solid #b81d24",
              borderRadius: "4px",
              boxShadow: "0 4px 16px rgba(184, 29, 36, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid #d4c4a8",
                paddingBottom: "8px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Benguiat Bold', Georgia, serif",
                  fontSize: "14px",
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
                  background: "rgba(184, 29, 36, 0.08)",
                  padding: "2px 8px",
                  borderRadius: "2px",
                  border: "1px solid rgba(184, 29, 36, 0.2)",
                }}
              >
                [{question.caseStudyData.caseDocket}]
              </span>
            </div>

            <div
              style={{
                fontSize: "13px",
                lineHeight: 1.6,
                color: textColor,
                fontFamily: "'Courier New', Courier, monospace",
                fontStyle: "italic",
                background: "rgba(255,255,255,0.75)",
                padding: "10px 14px",
                borderLeft: "3.5px solid #8b2500",
                borderRadius: "2px",
              }}
            >
              &quot;{question.caseStudyData.incidentBrief}&quot;
            </div>

            <div style={{ marginTop: "6px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: paperAccent,
                  letterSpacing: ".1em",
                  marginBottom: "6px",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                LOGGED FIELD EVIDENCE:
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "20px",
                  fontSize: "12.5px",
                  lineHeight: 1.6,
                  color: textColor,
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                {question.caseStudyData.evidence.map((ev, i) => (
                  <li key={i} style={{ marginBottom: "6px" }}>
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
          STAGE 5: RADIO TRANSMISSION (DECIPHERS & CIPHERS)
          ────────────────────────────────────────────────────────── */}
      {stageType === "radio" && question.radioData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Retro Receiver Console Box */}
          <div
            style={{
              padding: "14px 18px",
              background: "#181410",
              color: "#f0e6d2",
              border: "2px solid #5a483a",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #3d2f25",
                paddingBottom: "4px",
                fontSize: "11px",
                color: "#ff8a80",
                fontFamily: "'Courier New', monospace",
                fontWeight: 900,
              }}
            >
              <span>HAWKINS RADIO RELAY // {question.radioData.frequency}</span>
              <span>TUNED</span>
            </div>

            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "13px",
                letterSpacing: ".12em",
                color: "#ffcc80",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.5)",
                border: "1px dashed #7a5e4a",
                borderRadius: "2px",
              }}
            >
              SIGNAL PAYLOAD: <b>{question.radioData.rawSignal}</b>
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#d7ccc8",
                fontFamily: "'Courier New', monospace",
              }}
            >
              <b>CIPHER METHOD:</b> {question.radioData.cipherHint || question.radioData.signalType.toUpperCase()}
            </div>
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
          STAGE 6: LAB-TYPE TASKS (SYSTEM OPS, LOGIC & CODE)
          ────────────────────────────────────────────────────────── */}
      {stageType === "lab_task" && question.labTaskData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
          UNIVERSAL OPTIONS GRID (ONLY FOR STAGES 1, 4, 5, 6)
          REMOVED FOR CHAPTER 2 (CONNECTIONS) AND CHAPTER 3 (REARRANGE)
          ────────────────────────────────────────────────────────── */}
      {stageType !== "connection" && stageType !== "rearrange" && (
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))",
              gap: "12px",
              width: "100%",
            }}
          >
            {question.options.map((opt) => {
              const isSelected = selectedAnswer === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    sfx("click");
                    onSelectOption(opt.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    padding: "14px 18px",
                    background: isSelected
                      ? isVecnaMode
                        ? "rgba(184, 29, 36, 0.15)"
                        : "rgba(220, 180, 130, 0.35)"
                      : "rgba(255, 255, 255, 0.75)",
                    border: isSelected
                      ? `2px solid ${paperAccent}`
                      : "1.5px solid #d4c4a8",
                    borderRadius: "4px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.8 : 1,
                    textAlign: "left",
                    width: "100%",
                    boxSizing: "border-box",
                    boxShadow: isSelected
                      ? "0 4px 12px rgba(0,0,0,0.12)"
                      : "0 1px 4px rgba(0,0,0,0.04)",
                    transition: "all 0.15s ease",
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
      )}
    </div>
  );
}
