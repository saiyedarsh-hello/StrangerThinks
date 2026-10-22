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
  const { s, unlockHint, isHintUnlocked, score, isPaused, say } = useGame();
  const teamId = s?.team?.id || "anon";

  const currentTeamId = s?.team?.id && s.team.id !== "anon" ? s.team.id : null;
  const currentEventId = (s?.team as any)?.eventId || 1;

  const getStorageKey = (kind: "answers" | "states") => {
    if (!currentTeamId) return null;
    return `hawkins_quiz_${kind}_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
  };

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(() => {
    if (typeof window !== "undefined" && currentTeamId) {
      try {
        const key = `hawkins_quiz_answers_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    if (legacySelectedId) {
      return { 0: legacySelectedId };
    }
    return {};
  });

  // Track attempts, completion status, and points awarded per question
  const [questionStates, setQuestionStates] = useState<
    Record<number, { attempts: number; status: "unanswered" | "wrong_first_try" | "solved" | "failed"; earnedPoints: number }>
  >(() => {
    if (typeof window !== "undefined" && currentTeamId) {
      try {
        const key = `hawkins_quiz_states_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  // Re-synchronize or clean state whenever team, event, or chapter changes (prevents answer leakage across teams)
  useEffect(() => {
    if (typeof window !== "undefined" && currentTeamId) {
      try {
        const ansKey = `hawkins_quiz_answers_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        const storedAns = localStorage.getItem(ansKey);
        setSelectedAnswers(storedAns ? JSON.parse(storedAns) : (legacySelectedId ? { 0: legacySelectedId } : {}));

        const statesKey = `hawkins_quiz_states_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        const storedStates = localStorage.getItem(statesKey);
        setQuestionStates(storedStates ? JSON.parse(storedStates) : {});
      } catch {
        setSelectedAnswers({});
        setQuestionStates({});
      }
    } else {
      setSelectedAnswers({});
      setQuestionStates({});
    }
  }, [currentTeamId, currentEventId, chapterNumber, legacySelectedId]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentTeamId) {
      try {
        const key = `hawkins_quiz_answers_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        localStorage.setItem(key, JSON.stringify(selectedAnswers));
      } catch {}
    }
  }, [selectedAnswers, chapterNumber, currentTeamId, currentEventId]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentTeamId) {
      try {
        const key = `hawkins_quiz_states_ev${currentEventId}_team_${currentTeamId}_ch${chapterNumber}`;
        localStorage.setItem(key, JSON.stringify(questionStates));
      } catch {}
    }
  }, [questionStates, chapterNumber, currentTeamId, currentEventId]);
  const [unlockingHintKey, setUnlockingHintKey] = useState<string | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unansweredPrompt, setUnansweredPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [networkErrorMsg, setNetworkErrorMsg] = useState<string | null>(null);

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

  const currentQState = questionStates[currentIdx] || {
    attempts: 0,
    status: "unanswered" as const,
    earnedPoints: 0,
  };
  const isCurrentDone = currentQState.status === "solved" || currentQState.status === "failed";

  const handleOptionClick = (optId: string) => {
    if (isCurrentDone) return; // Cannot modify once completed (solved or failed)
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

  // Verify answer against authoritative backend: locked permanently on submission
  const handleVerifyCurrentQuestion = async () => {
    if (isCurrentDone || isSubmitting) return; // Cannot re-submit once completed or currently in flight

    setNetworkErrorMsg(null);

    // Fast check for browser network connectivity
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      sfx("err");
      const offlineMsg = "OFFLINE: Internet connection lost. Reconnect before submitting.";
      setNetworkErrorMsg(offlineMsg);
      say(`NETWORK FAILURE: ${offlineMsg}`);
      return;
    }

    const chosen = selectedAnswers[currentIdx];
    if (!chosen || !chosen.trim()) {
      sfx("err");
      setUnansweredPrompt(true);
      return;
    }

    const qCode = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
    let isCorrect = false;
    let earnedPoints = 0;
    setIsSubmitting(true);

    try {
      let token = "";
      try {
        const stored = localStorage.getItem("hawkins-protocol:session");
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed.token || "";
        }
      } catch {}

      const res = await fetch(`/api/questions/${encodeURIComponent(qCode)}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer: chosen.trim(), teamId }),
      });

      if (res.ok) {
        const data = await res.json();
        isCorrect = Boolean(data.isCorrect);
        earnedPoints = typeof data.pointsAwarded === "number" ? data.pointsAwarded : (isCorrect ? 10 : 0);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.error === "EVENT_PAUSED") {
          say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        } else if (res.status === 403 && errData.error === "EVENT_ENDED") {
          say("HAWKINS COMMAND: TOURNAMENT CONCLUDED. SUBMISSIONS CLOSED.");
        } else {
          const msg = errData.message || "COMMUNICATION FAILURE: Mainframe rejected transmission.";
          setNetworkErrorMsg(msg);
          say(msg);
        }
        sfx("err");
        setIsSubmitting(false);
        return;
      }
    } catch (e: any) {
      const dropMsg = "TRANSMISSION FAILED: Central server unreachable (Wi-Fi/Network dropped). Please try again.";
      setNetworkErrorMsg(dropMsg);
      say(`TRANSMISSION ERROR: ${dropMsg}`);
      sfx("err");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);

    if (isCorrect) {
      sfx("ok");
      setQuestionStates((prev) => ({
        ...prev,
        [currentIdx]: {
          attempts: 1,
          status: "solved",
          earnedPoints: earnedPoints,
        },
      }));
    } else {
      sfx("err");
      setQuestionStates((prev) => ({
        ...prev,
        [currentIdx]: {
          attempts: 1,
          status: "failed",
          earnedPoints: 0,
        },
      }));
    }
  };

  // Tab unlock condition: cannot advance to tab N until 0..(N-1) are completed
  const isTabUnlocked = (idx: number) => {
    if (idx <= currentIdx) return true;
    for (let i = 0; i < idx; i++) {
      const qSt = questionStates[i];
      if (!qSt || (qSt.status !== "solved" && qSt.status !== "failed")) {
        return false;
      }
    }
    return true;
  };

  const verifiedScore =
    typeof score === "number"
      ? score
      : Object.values(questionStates).reduce((sum, q) => sum + (q.earnedPoints || 0), 0);
  const doneCount = Object.values(questionStates).filter((q) => q.status === "solved" || q.status === "failed").length;
  const allQuestionsDone = doneCount === totalQuestions;

  const handleNext = () => {
    if (!isCurrentDone) {
      sfx("err");
      return;
    }
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
    if (isPaused) {
      say?.("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    if (!allQuestionsDone) {
      sfx("err");
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
          maxWidth: "min(1560px, 98vw)",
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
        </div>
      </div>

      {/* ─── THE PHYSICAL POLICE INCIDENT REPORT PAPER ─── */}
      <motion.div
        animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.55 }}
        style={{
          maxWidth: "min(1560px, 98vw)",
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
                const qSt = questionStates[idx];
                const isSolved = qSt?.status === "solved";
                const isFailed = qSt?.status === "failed";
                const isUnlocked = isTabUnlocked(idx);

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (!isUnlocked) {
                        sfx("err");
                        return;
                      }
                      sfx("click");
                      setCurrentIdx(idx);
                      setUnansweredPrompt(false);
                    }}
                    style={{
                      padding: "4px 10px",
                      background: isCurrent
                        ? "#b81d24"
                        : isSolved
                        ? "#234d31"
                        : isFailed
                        ? "#4d2323"
                        : isUnlocked
                        ? "#f7f2e7"
                        : "#ded6c4",
                      color: isCurrent || isSolved || isFailed ? "#fff" : isUnlocked ? "#2a221a" : "#8c7e6c",
                      border: isCurrent
                        ? "1.5px solid #8f1218"
                        : isSolved
                        ? "1px solid #3d8053"
                        : isFailed
                        ? "1px solid #7d2a2a"
                        : "1px solid #b5a48b",
                      borderRadius: 2,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: ".08em",
                      cursor: isUnlocked ? "pointer" : "not-allowed",
                      opacity: isUnlocked ? 1 : 0.6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      transition: "all 0.12s ease",
                    }}
                    title={!isUnlocked ? "Locked until preceding question is completed" : `Item ${idx + 1}`}
                  >
                    <span>{isSolved ? "✔" : isFailed ? "✕" : !isUnlocked ? "🔒" : `[${idx + 1}]`}</span>
                    <span>ITEM {idx + 1}</span>
                  </button>
                );
              })}
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
              disabled={isCurrentDone}
            />

            {currentQ.hint && (() => {
              const currentHintKey = currentQ.id || `ch${chapterNumber}-q${currentIdx + 1}`;
              const isCurrentHintUnlocked = isHintUnlocked(currentHintKey);
              const isUnlocking = unlockingHintKey === currentHintKey;

              const handleUnlockHint = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (isUnlocking) return;
                if (score < 5) {
                  alert("INSUFFICIENT SCORE: You need at least 5 points to unlock an Intel Clue.");
                  return;
                }
                const confirmed = window.confirm(
                  "Use this Intel Clue? It will deduct 5 points from your current score."
                );
                if (!confirmed) return;
                setUnlockingHintKey(currentHintKey);
                unlockHint(currentHintKey, 5);
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
                        title="Unlock classified dossier clue for 5 points (-5 PTS)"
                      >
                        <span>{isUnlocking ? "⚡ DECRYPTING..." : "🔒 UNLOCK CLUE"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── ATTEMPTS & VERIFICATION CONSOLE (STRICT 2-TRY RULE) ─── */}
            <div
              style={{
                marginTop: 18,
                padding: "14px 18px",
                background:
                  currentQState.status === "solved"
                    ? "rgba(38, 166, 91, 0.12)"
                    : currentQState.status === "failed"
                    ? "rgba(184, 29, 36, 0.12)"
                    : currentQState.status === "wrong_first_try"
                    ? "rgba(255, 140, 0, 0.14)"
                    : "rgba(0, 0, 0, 0.05)",
                border:
                  currentQState.status === "solved"
                    ? "2px solid #27ae60"
                    : currentQState.status === "failed"
                    ? "2px solid #b81d24"
                    : currentQState.status === "wrong_first_try"
                    ? "2px dashed #d35400"
                    : "1.5px dashed #c9bda4",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* Status & Attempts Counter */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div
                  style={{
                    fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                    fontSize: 12.5,
                    fontWeight: 900,
                    letterSpacing: ".1em",
                    color:
                      currentQState.status === "solved"
                        ? "#1b7a41"
                        : currentQState.status === "failed"
                        ? "#9e151b"
                        : currentQState.status === "wrong_first_try"
                        ? "#b54900"
                        : "#544638",
                  }}
                >
                  {currentQState.status === "solved" && `✔ EVIDENCE VERIFIED ACCURATE · [+${currentQState.earnedPoints || 10} PTS AWARDED]`}
                  {currentQState.status === "failed" && "✕ TESTIMONY REJECTED · QUESTION LOCKED · [0 PTS]"}
                  {currentQState.status === "unanswered" && "ITEM PENDING CONFIRMATION"}
                </div>
                <div style={{ fontSize: 11, color: "#6e5d4d", fontFamily: "'Courier New', monospace" }}>
                  {!isCurrentDone
                    ? `Item pending: Question locked once verified`
                    : currentQState.status === "solved"
                    ? `Question completed: +${currentQState.earnedPoints || 10} PTS awarded. Next question unlocked.`
                    : "Question completed: 0 PTS awarded. Next question unlocked."}
                </div>
              </div>

              {/* Action Button */}
              {!isCurrentDone ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  {networkErrorMsg && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#b81d24",
                        fontFamily: "'Courier New', monospace",
                        fontWeight: 700,
                        background: "#ffebee",
                        border: "1px solid #ffcdd2",
                        padding: "3px 8px",
                        borderRadius: 2,
                      }}
                    >
                      ⚠ {networkErrorMsg}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleVerifyCurrentQuestion}
                    style={{
                      padding: "9px 22px",
                      background: isSubmitting ? "#544638" : "#24130d",
                      color: "#ffffff",
                      border: "1.5px solid #8f2d24",
                      borderRadius: 3,
                      fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: ".14em",
                      cursor: isSubmitting ? "wait" : "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      opacity: isSubmitting ? 0.75 : 1,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) e.currentTarget.style.background = "#8f1218";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) e.currentTarget.style.background = "#24130d";
                    }}
                  >
                    <span>{isSubmitting ? "⏳" : "🔒"}</span>
                    <span>{isSubmitting ? "TRANSMITTING..." : "SUBMIT LEVEL"}</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: ".1em",
                    color: currentQState.status === "solved" ? "#1b7a41" : "#9e151b",
                    fontFamily: "'Courier New', monospace",
                    border: `1.5px solid ${currentQState.status === "solved" ? "#27ae60" : "#b81d24"}`,
                    padding: "6px 14px",
                    borderRadius: 3,
                    background: currentQState.status === "solved" ? "#e8f5e9" : "#ffebee",
                  }}
                >
                  {currentQState.status === "solved" ? "✓ LEVEL CLEARED" : "✕ TESTIMONY REJECTED (0 PTS)"}
                </div>
              )}
            </div>
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
                  disabled={!isCurrentDone}
                  style={{
                    padding: "10px 18px",
                    background: isCurrentDone ? "#2e2118" : "#ded6c4",
                    color: isCurrentDone ? "#fff" : "#8c7e6c",
                    border: isCurrentDone ? "1px solid #573a2e" : "1px solid #b5a48b",
                    borderRadius: 3,
                    fontFamily: "'Benguiat Bold', serif",
                    fontSize: 12,
                    letterSpacing: ".1em",
                    cursor: isCurrentDone ? "pointer" : "not-allowed",
                    fontWeight: 800,
                    opacity: isCurrentDone ? 1 : 0.6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title={!isCurrentDone ? "Confirm your answer for this item first before moving to next item" : "Next docket item"}
                >
                  <span>NEXT ITEM</span>
                  <span>{isCurrentDone ? "➔" : "🔒"}</span>
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
              padding: "10px 26px",
              background: isPaused ? "#443a34" : allQuestionsDone ? "#b81d24" : "#8c7b68",
              color: "#fff",
              border: isPaused ? "1.5px solid #665245" : allQuestionsDone ? "1.5px solid #8f1218" : "1px solid #776a5a",
              borderRadius: 3,
              fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
              fontWeight: 900,
              fontSize: "clamp(13px, 1.4vw, 16px)",
              letterSpacing: ".16em",
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
              ? "TOURNAMENT PAUSED BY HAWKINS COMMAND"
              : allQuestionsDone
              ? "SUBMIT FINAL REPORT ➔"
              : `COMPLETE ALL ITEMS TO SUBMIT [${doneCount}/${totalQuestions}]`}
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
