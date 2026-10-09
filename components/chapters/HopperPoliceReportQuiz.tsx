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
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(() => {
    if (legacySelectedId) {
      return { 0: legacySelectedId };
    }
    return {};
  });

  const { unlockHint, isHintUnlocked, score } = useGame();
  const [unlockingHintKey, setUnlockingHintKey] = useState<string | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unansweredPrompt, setUnansweredPrompt] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    sfx("click");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleExit = () => {
    sfx("click");
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    if (onExitFullScreen) {
      onExitFullScreen();
    }
  };

  const handlePlayDictaphone = () => {
    sfx("staticBurst");
    setIsPlayingAudio(true);
    setTimeout(() => {
      sfx("type");
    }, 400);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4500);
  };

  const currentQ = questions[currentIdx] || questions[0];
  const currentSelectedOption = selectedAnswers[currentIdx] || (currentIdx === 0 ? legacySelectedId : null);

  const handleOptionClick = (optId: string) => {
    sfx("type");
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optId,
    }));
    if (currentIdx === 0 && legacyOnSelect) {
      legacyOnSelect(optId);
    }
    setUnansweredPrompt(false);
  };

  const answeredCount = Object.keys(selectedAnswers).filter((k) => !!selectedAnswers[Number(k)]).length;
  const allAnswered = answeredCount === totalQuestions;

  const handleNext = () => {
    sfx("click");
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    sfx("click");
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
    }
  };

  const handleFinalSubmit = () => {
    sfx("ok");
    const completeAnswers: Record<number, string> = { ...selectedAnswers };
    for (let i = 0; i < totalQuestions; i++) {
      if (!completeAnswers[i]) {
        completeAnswers[i] = questions[i]?.correctAnswerId || "A";
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
        padding: "12px 20px 20px",
        background: "radial-gradient(ellipse at 50% 30%, #2a1810 0%, #170d08 60%, #0d0604 100%)",
        boxShadow: "inset 0 0 100px rgba(0,0,0,0.85)",
        fontFamily: "'Courier New', Courier, monospace",
        color: "#231e1a",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ─── DESK ACCESSORIES (TOP ACTIONS TOOLBAR) ─── */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Left Side: Navigation Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Exit / Back to Board Button */}
          {onExitFullScreen && (
            <button
              type="button"
              onClick={handleExit}
              style={{
                padding: "8px 14px",
                background: "#24130d",
                color: "#ff945c",
                border: "1.5px solid #733c20",
                borderRadius: 4,
                fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".12em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                transition: "all 0.15s ease",
              }}
              title="Exit questions and return to Evidence Board"
            >
              <span>✕</span>
              <span>EXIT / BOARD</span>
            </button>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: "8px 12px",
              background: isFullscreen ? "#4a1215" : "rgba(0,0,0,0.65)",
              color: "#e2d5c5",
              border: isFullscreen ? "1.5px solid #ff2d3a" : "1px solid rgba(255,255,255,0.22)",
              borderRadius: 4,
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontSize: 11,
              letterSpacing: ".12em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              transition: "all 0.15s ease",
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <span>{isFullscreen ? "✖" : "⛶"}</span>
            <span>{isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}</span>
          </button>
        </div>

        {/* Right Side: Investigation Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Hopper's Dictaphone Cassette Player */}
          <button
            type="button"
            onClick={handlePlayDictaphone}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: isPlayingAudio ? "#2e0f12" : "#1a1311",
              border: isPlayingAudio ? "1.5px solid #ff2d3a" : "1.5px solid #573a2e",
              borderRadius: 4,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
              transition: "all 0.2s",
            }}
            title="Play Chief Hopper's recorded tape memo"
          >
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px dashed #ff8a4c",
                animation: isPlayingAudio ? "spinReel 1.2s linear infinite" : "none",
              }}
            />
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isPlayingAudio ? "#ff2438" : "#66181e",
                boxShadow: isPlayingAudio ? "0 0 8px #ff2438" : "none",
              }}
            />
            <span
              style={{
                fontFamily: "'Benguiat Bold', monospace",
                fontSize: 10.5,
                letterSpacing: ".12em",
                color: isPlayingAudio ? "#ff8a4c" : "#d9c5b2",
                textTransform: "uppercase",
              }}
            >
              {isPlayingAudio ? "PLAYING..." : "AUDIO LOG"}
            </span>
          </button>

          {/* Lore Briefing Manila Tab */}
          <button
            type="button"
            onClick={onOpenLore}
            style={{
              padding: "8px 12px",
              background: "#d4a759",
              color: "#1a0f05",
              border: "1.5px solid #946f29",
              borderRadius: 4,
              fontFamily: "'Benguiat Bold', serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".12em",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📁</span>
            <span>CASE BRIEFING</span>
          </button>

          {/* Case Points Badge */}
          <div
            style={{
              padding: "6px 12px",
              background: "rgba(0,0,0,0.65)",
              border: "1.5px solid rgba(255,180,84,0.4)",
              borderRadius: 4,
              color: "#ffb454",
              fontFamily: "'Benguiat Bold', serif",
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: ".14em",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>+{points} PTS</span>
            <span style={{ fontSize: 9.5, opacity: 0.75, fontFamily: "'Courier New', monospace" }}>[5 PTS/Q]</span>
          </div>
        </div>
      </div>

      {/* ─── THE PHYSICAL POLICE INCIDENT REPORT PAPER ─── */}
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.55 }}
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "#f4eedf",
          backgroundImage:
            "radial-gradient(#e4dac5 1px, transparent 1px), radial-gradient(#dcd0ba 1px, transparent 1px)",
          backgroundSize: "20px 20px, 40px 40px",
          backgroundPosition: "0 0, 20px 20px",
          border: "1px solid #d4c4a8",
          borderRadius: 2,
          boxShadow:
            "0 14px 35px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.4), inset 0 0 35px rgba(180,150,110,0.2)",
          padding: "18px 26px 20px",
          position: "relative",
          boxSizing: "border-box",
        }}
      >

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
                const isDone = !!selectedAnswers[idx];
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
                      padding: "4px 10px",
                      background: isCurrent ? "#b81d24" : isDone ? "#3e2f23" : "#f7f2e7",
                      color: isCurrent || isDone ? "#fff" : "#2a221a",
                      border: isCurrent ? "1.5px solid #8f1218" : "1px solid #b5a48b",
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
                  >
                    <span>{isDone ? "✓" : `[${idx + 1}]`}</span>
                    <span>ITEM {idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#544638",
                fontWeight: 800,
                letterSpacing: ".08em",
                flexShrink: 0,
                whiteSpace: "nowrap",
                marginLeft: 8,
              }}
            >
              COMPLETED: <b>{answeredCount}</b> / {totalQuestions} · <b>{answeredCount * 5}</b> / 50 PTS
            </div>
          </div>
        )}

        {/* ─── SECTION 01: HOPPER'S DICTAPHONE AUDIO TRANSCRIPT ─── */}
        <AnimatePresence>
          {isPlayingAudio && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "#e4dac4",
                borderLeft: "4px solid #b81d24",
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: 11.5,
                color: "#38291b",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              <b>[DICTAPHONE LOG TRANSCRIPTION — CHIEF HOPPER]:</b>
              <br />
              &quot;It&apos;s past two in the morning. Sirens went off near the woods outside the DOE fence.
              Brenner&apos;s people swear it was an electrical surge, but that tear in the concrete didn&apos;t come from a transformer.
              Check the 1983 Department of Energy project files immediately.&quot;
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── SECTION DYNAMIC: THE INCIDENT STATEMENT & QUERY ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`question-${currentIdx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ marginBottom: 14 }}
          >
            {/* Specialized Question Formation by Stage */}
            <QuestionTypeRenderer
              question={currentQ}
              selectedAnswer={currentSelectedOption}
              onSelectOption={(optId) => handleOptionClick(optId)}
              isVecnaMode={false}
            />

            {currentQ.hint && (() => {
              const currentHintKey = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
              const isCurrentHintUnlocked = isHintUnlocked(currentHintKey);
              const isUnlocking = unlockingHintKey === currentHintKey;

              const handleUnlockHint = (e: React.MouseEvent) => {
                e.stopPropagation();
                setUnlockingHintKey(currentHintKey);
                unlockHint(currentHintKey, 10);
                setTimeout(() => {
                  setUnlockingHintKey(null);
                }, 400);
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
                          <span>🔓</span>
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
                        💡 <b>SURVEILLANCE CLUE:</b> &quot;{currentQ.hint}&quot;
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
                          <span>🔒</span>
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
                        title="Unlock classified dossier clue for 10 points"
                      >
                        <span>{isUnlocking ? "⚡ DECRYPTING..." : "🔒 UNLOCK CLUE"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>


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
              ⚠ PLEASE RECORD AN ANSWER FOR ITEM {currentIdx + 1} BEFORE SUBMITTING FULL REPORT
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
              [✕ REJECTED: INCONSISTENT TESTIMONY · RECORD DOES NOT MATCH LAB SURVEILLANCE]
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── FOOTER NAVIGATION & SUBMIT BUTTONS ─── */}
        <div
          style={{
            borderTop: "2px solid #2a221a",
            paddingTop: 12,
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
                ⇦ PREVIOUS
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
                  }}
                >
                  NEXT ITEM ➔
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
            style={{
              padding: "10px 26px",
              background: "#b81d24",
              color: "#fff",
              border: "1.5px solid #8f1218",
              borderRadius: 3,
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontWeight: 900,
              fontSize: "clamp(13px, 1.4vw, 16px)",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(184, 29, 36, 0.5), inset 0 0 10px rgba(0,0,0,0.25)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#941319";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#b81d24";
            }}
          >
            {allAnswered
              ? "SUBMIT REPORT (+50 PTS) ➔"
              : `SUBMIT REPORT [${answeredCount}/${totalQuestions} · +${answeredCount * 5} PTS] ➔`}
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
