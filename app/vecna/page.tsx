"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONFIG,
  PLAYER_TEAMS,
  getStoredSession,
  clearSession,
  AuthSession,
} from "@/lib/config";
import {
  publish,
  subscribe,
  RealtimeMessage,
} from "@/lib/realtime";
import CinematicBackground from "@/components/CinematicBackground";
import { sfx } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";

import VecnaTacticalMap, { MapTeamInfo } from "@/components/vecna/VecnaTacticalMap";
import VecnaTriggerPanel, { TriggerAction } from "@/components/vecna/VecnaTriggerPanel";
import VecnaMessagePanel from "@/components/vecna/VecnaMessagePanel";
import VecnaStoryDialog from "@/components/vecna/VecnaStoryDialog";
import VecnaChaptersModal from "@/components/vecna/VecnaChaptersModal";
import QuestionTypeRenderer from "@/components/chapters/QuestionTypeRenderer";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

interface VecnaTrial {
  id: number;
  shortName: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  points: number;
  powersGranted: string;
  codeSnippet?: string;
}

const VECNA_TRIALS: VecnaTrial[] = [
  {
    id: 1,
    shortName: "STAGE 1",
    title: "STAGE 1: QUIZ-TYPE QUESTIONS",
    subtitle: "HAWKINS CHRONICLES // SERIES LORE & LOGIC",
    category: "SERIES KNOWLEDGE",
    description:
      "Multiple-choice questions testing lore, logic, and timeline understanding across the Hawkins dimension.",
    points: 50,
    powersGranted: "GLITCH · CRT FREAKOUT",
  },
  {
    id: 2,
    shortName: "STAGE 2",
    title: "STAGE 2: CONNECTION QUESTIONS",
    subtitle: "RELATIONSHIP CORRELATION // MATCH CLUES & ARTIFACTS",
    category: "RELATIONSHIP MAPPING",
    description:
      "Match related clues, characters, locations, objects, or concepts by identifying their deep relationships.",
    points: 50,
    powersGranted: "SIGNAL JAM · RADIO DISTORTION",
  },
  {
    id: 3,
    shortName: "STAGE 3",
    title: "STAGE 3: REARRANGE QUESTIONS",
    subtitle: "SEQUENCE RESTORATION // SCRAMBLED WORDS, STATEMENTS & CODE",
    category: "SEQUENCE RESTORATION",
    description:
      "Arrange scrambled words, sentences, codes, steps, or clues in the correct order to reveal hidden intelligence.",
    points: 50,
    powersGranted: "DISTORT · CLUE OBFUSCATION",
  },
  {
    id: 4,
    shortName: "STAGE 4",
    title: "STAGE 4: CASE STUDY QUESTIONS",
    subtitle: "INVESTIGATIVE FORENSICS // SITUATION ANALYSIS",
    category: "INVESTIGATIVE ANALYSIS",
    description:
      "Analyze a given situation report or set of clues, examine evidence logs, and draw forensic conclusions.",
    points: 50,
    powersGranted: "LOCK · ACCESS DENIED",
  },
  {
    id: 5,
    shortName: "STAGE 5",
    title: "STAGE 5: DEEP WOODS RECON",
    subtitle: "ROANE COUNTY WOODS // PINE RUNES",
    category: "FIELD INVESTIGATION",
    description:
      "Field investigation into deep woods anomalies, coordinate markers, and dimensional boundaries.",
    points: 50,
    powersGranted: "TIME FREEZE · DEDUCT 2 MINS",
  },
  {
    id: 6,
    shortName: "STAGE 6",
    title: "STAGE 6: RADIO TRANSMISSION",
    subtitle: "SIGNAL INTELLIGENCE // MORSE, BINARY & CIPHERS",
    category: "SIGNAL DECODING",
    description:
      "Decode hidden messages or signals using methods such as Morse code, binary sequences, or audio ciphers.",
    points: 50,
    powersGranted: "FREQUENCY SHIFT · STATIC SURGE",
  },
  {
    id: 7,
    shortName: "STAGE 7",
    title: "STAGE 7: LAB-TYPE TASKS",
    subtitle: "HAWKINS LAB EXPERIMENTAL TERMINAL // SYSTEM CHALLENGES",
    category: "TECHNICAL EXPERIMENTS",
    description:
      "Interactive technical challenges involving logical sequences, system operations, bug fixing, and data analysis.",
    points: 50,
    powersGranted: "GRANDFATHER CLOCK · GATE MASTERY",
  },
];

export default function VecnaPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  // Active Trial & Question Selection
  const [activeTrialId, setActiveTrialId] = useState<number>(1);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [hoveredTrialId, setHoveredTrialId] = useState<number | null>(null);

  // Selected Answers: keyed by `${trialId}-${qIdx}`
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // Solved status: keyed by `${trialId}-${qIdx}`
  const [solvedQuestions, setSolvedQuestions] = useState<Record<string, boolean>>({});
  const [trialResults, setTrialResults] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isPowersOpen, setIsPowersOpen] = useState(false);
  const [isChaptersModalOpen, setIsChaptersModalOpen] = useState(false);
  const [isStoryDialogOpen, setIsStoryDialogOpen] = useState(true);

  // Selected team state for targeting
  const [selectedLocation, setSelectedLocation] = useState("town");
  const [selectedTeamName, setSelectedTeamName] = useState<string | undefined>("Null Pointers");

  // Fallback Teams for simulation
  const teamsAtLocation: Record<string, MapTeamInfo[]> = {
    town: [{ id: "T01", name: "Null Pointers", status: "Online" }],
    lab: [{ id: "T02", name: "Stack Smashers", status: "Stuck" }],
    police: [{ id: "T03", name: "Rift Runners", status: "Online" }],
    forest: [{ id: "T04", name: "Byte Byters", status: "Online" }],
    radioTower: [{ id: "T05", name: "Signal Seekers", status: "Online" }],
    upsideDown: [{ id: "T06", name: "Hellfire Club", status: "Stuck" }],
  };

  useEffect(() => {
    const s = getStoredSession();
    if (!s || s.role !== "VECNA") {
      router.push("/");
      return;
    }
    setSession(s);
  }, [router]);

  const handleLogout = () => {
    sfx("click");
    clearSession();
    router.push("/");
  };

  const handleSelectOption = (trialId: number, qIdx: number, optionId: string) => {
    sfx("click");
    setSelectedAnswers((prev) => ({
      ...prev,
      [`${trialId}-${qIdx}`]: optionId,
    }));
    setErrorMessage(null);
  };

  const currentTrial = VECNA_TRIALS.find((t) => t.id === activeTrialId) || VECNA_TRIALS[0];
  const currentQuestions = STAGE_QUIZ_CONFIGS[currentTrial.id]?.questions || [];
  const currentQuestion = currentQuestions[activeQuestionIdx] || currentQuestions[0];
  const totalQuestionsForTrial = currentQuestions.length;
  const isQuestionSolved = !!solvedQuestions[`${currentTrial.id}-${activeQuestionIdx}`];

  // Scoring logic: 1 question solved = 5 points across all 70 questions (350 points max)
  const totalVecnaSolved = Object.values(solvedQuestions).filter(Boolean).length;
  const totalVecnaScore = totalVecnaSolved * 5;
  const currentTrialSolvedCount = currentQuestions.filter((_, idx) => !!solvedQuestions[`${currentTrial.id}-${idx}`]).length;
  const currentTrialScore = currentTrialSolvedCount * 5;

  const handleVerifyCurrentQuestion = () => {
    if (!currentQuestion) return;

    // If already solved, advance to next question
    if (isQuestionSolved) {
      if (activeQuestionIdx < totalQuestionsForTrial - 1) {
        handleNextLevel();
      } else {
        sfx("boom");
        setSuccessMessage("ALL 10 LEVELS CLEARED · 50/50 PTS UNLOCKED!");
        setTimeout(() => setSuccessMessage(null), 2500);
      }
      return;
    }

    let chosen = selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`];
    if (!chosen) {
      // In demo mode: auto-select correct answer if user clicks verify without clicking option
      chosen = currentQuestion.correctAnswerId;
      setSelectedAnswers((prev) => ({
        ...prev,
        [`${currentTrial.id}-${activeQuestionIdx}`]: currentQuestion.correctAnswerId,
      }));
    }

    if (chosen === currentQuestion.correctAnswerId) {
      sfx("boom");
      setSolvedQuestions((prev) => ({
        ...prev,
        [`${currentTrial.id}-${activeQuestionIdx}`]: true,
      }));
      setSuccessMessage(`LEVEL ${activeQuestionIdx + 1} OVERRIDE CONFIRMED (+5 PTS)`);
      setErrorMessage(null);

      // Check if all questions in this trial will be cleared
      const willBeAllCleared = currentQuestions.every((_, idx) =>
        idx === activeQuestionIdx ? true : !!solvedQuestions[`${currentTrial.id}-${idx}`]
      );
      if (willBeAllCleared) {
        setTrialResults((prev) => ({ ...prev, [currentTrial.id]: true }));
        publish({
          type: "sabotage",
          kind: "MESSAGE",
          target: "all",
          message: `VECNA PROTOCOL: TRIAL ${currentTrial.id} FULLY BREACHED. POWER UNLOCKED: ${currentTrial.powersGranted}`,
          ts: Date.now(),
        });
      }

      // Auto advance to next question after brief delay
      if (activeQuestionIdx < totalQuestionsForTrial - 1) {
        setTimeout(() => {
          setActiveQuestionIdx((i) => i + 1);
          setSuccessMessage(null);
        }, 650);
      } else {
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } else {
      sfx("err");
      setErrorMessage(
        `[ANOMALY] INCORRECT VECTOR. DEMO CORRECT ANSWER: OPTION ${currentQuestion.correctAnswerId}`
      );
      setTimeout(() => setErrorMessage(null), 2500);
    }
  };

  const handlePrevLevel = () => {
    sfx("click");
    if (activeQuestionIdx > 0) {
      setActiveQuestionIdx((i) => i - 1);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleNextLevel = () => {
    sfx("click");
    if (activeQuestionIdx < totalQuestionsForTrial - 1) {
      setActiveQuestionIdx((i) => i + 1);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleSendMessage = (target: "all" | string, message: string) => {
    sfx("boom");
    publish({
      type: "sabotage",
      kind: "MESSAGE",
      target,
      message,
      ts: Date.now(),
    });
    // Persist in database
    fetch("/api/vecna/sabotage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, kind: "MESSAGE", message, duration: 45 }),
    }).catch(() => {});
    setIsMessageOpen(false);
  };

  const handleExecuteTrigger = (action: TriggerAction) => {
    sfx("boom");
    const kind = (action.id === "RADIO_DISTORTION" ? "SIGNAL_JAM" : action.id) as any;
    publish({
      type: "sabotage",
      kind,
      target: selectedLocation,
      ts: Date.now(),
    });
    // Persist in database
    fetch("/api/vecna/sabotage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: selectedLocation, kind, duration: 45 }),
    }).catch(() => {});
    setIsPowersOpen(false);
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        maxHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background: "#080204",
        color: "#ffebee",
        fontFamily: '"Share Tech Mono", monospace',
        display: "flex",
        flexDirection: "column",
        scrollbarWidth: "thin",
        scrollbarColor: "#ff2d3a #120407",
      }}
    >
      <CinematicBackground
        src="/upsidedown-bg.jpg"
        particles="embers"
        vignette="heavy"
        overlayOpacity={0.82}
      />

      {/* ───────────────────────────────────────────────────────────────────
          TOP VECNA HEADER & ACTIONS (MATCHING SCREENSHOT)
          ─────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          background: "rgba(10, 2, 5, 0.94)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Left: VECNA Brand + CONTROL PROTOCOL + HIVE MIND ACTIVE */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "inline-block",
                borderTop: "2px solid #ff2d3a",
                borderBottom: "2px solid #ff2d3a",
                padding: "1px 4px",
                lineHeight: "1",
                boxShadow: "0 0 10px rgba(255, 45, 58, 0.45)",
              }}
            >
              <span
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#ff2d3a",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textShadow: "0 0 12px rgba(255, 45, 58, 0.8)",
                  display: "inline-block",
                }}
              >
                VECNA
              </span>
            </div>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.26em",
                color: "#ff3a48",
                fontFamily: '"Share Tech Mono", monospace',
                textTransform: "uppercase",
                marginTop: "3px",
                paddingLeft: "2px",
              }}
            >
              CONTROL PROTOCOL
            </div>
          </div>

          {/* Score Counter Module */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.75)",
              border: "1px solid rgba(255, 45, 58, 0.35)",
              padding: "3px 14px",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontFamily: '"Share Tech Mono", monospace',
                letterSpacing: "0.22em",
                color: "rgba(255, 120, 120, 0.8)",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              SCORE
            </div>
            <div
              style={{
                fontFamily: "var(--font-term), 'VT323', monospace",
                fontSize: "19px",
                color: "#ff2d3a",
                letterSpacing: "0.15em",
                lineHeight: 1,
                marginTop: "2px",
                textShadow: "0 0 10px rgba(255, 45, 58, 0.8)",
              }}
            >
              {String(totalVecnaScore).padStart(3, "0")} / 350
            </div>
          </div>
        </div>

        {/* Center: 3 Action Popups */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Tactical Map */}
          <button
            id="vecna-map-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMapOpen(true);
            }}
            style={{
              background: isMapOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isMapOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            TACTICAL MAP
          </button>

          {/* Team Dispatch */}
          <button
            id="vecna-message-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMessageOpen(true);
            }}
            style={{
              background: isMessageOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isMessageOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            TEAM DISPATCH
          </button>

          {/* Vecna Powers */}
          <button
            id="vecna-powers-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsPowersOpen(true);
            }}
            style={{
              background: isPowersOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isPowersOpen ? "#000" : "#ffb3ba",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.14em",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            VECNA POWERS
          </button>
        </div>

        {/* Right: Chapters Button + Exit Vecna Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            id="vecna-chapters-modal-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsChaptersModalOpen(true);
            }}
            style={{
              background: isChaptersModalOpen ? "#ff2d3a" : "rgba(18, 4, 7, 0.85)",
              color: isChaptersModalOpen ? "#000000" : "#ff8a80",
              border: "1.5px solid #ff2d3a",
              padding: "8px 18px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.15em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: isChaptersModalOpen ? "#000" : "#ff2d3a" }}>◈</span>
            <span>CHAPTERS</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "rgba(18, 4, 7, 0.85)",
              color: "#ff3a48",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontSize: "12px",
              fontFamily: '"Share Tech Mono", monospace',
              fontWeight: "bold",
              letterSpacing: "0.15em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: "#ff2d3a" }}>◆</span>
            <span>EXIT VECNA</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          MAIN AREA: 7 TRIAL TABS (WITH HOVER DROPDOWNS) & CONSOLE CARD
          ─────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1240px",
          width: "100%",
          margin: "0 auto",
          padding: "26px 20px 140px 20px",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        {/* Minimal Sector Header & Level Pager Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Active Sector Tag + Lore Replay Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                sfx("click");
                setIsChaptersModalOpen(true);
              }}
              style={{
                background: "rgba(20, 4, 8, 0.9)",
                border: "1.5px solid #ff2d3a",
                borderRadius: "3px",
                padding: "8px 16px",
                color: "#ff8a80",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "0.14em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: "0 0 10px rgba(255, 45, 58, 0.25)",
              }}
            >
              <span style={{ color: "#ff2d3a" }}>◈</span>
              <span>TRIAL {currentTrial.id} // {currentTrial.shortName}</span>
              <span style={{ fontSize: "9px", opacity: 0.65 }}>▼</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sfx("click");
                setIsStoryDialogOpen(true);
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 45, 58, 0.4)",
                borderRadius: "3px",
                padding: "8px 14px",
                color: "rgba(255, 200, 200, 0.8)",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "11.5px",
                letterSpacing: "0.12em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>👁</span>
              <span>VECNA TRANSMISSION</span>
            </button>
          </div>

          {/* Quick Level Navigator (Levels 1 to 10) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "11.5px",
              letterSpacing: "0.12em",
            }}
          >
            <span style={{ color: "rgba(255, 180, 180, 0.7)", marginRight: "4px" }}>LEVEL:</span>
            {Array.from({ length: 10 }).map((_, idx) => {
              const isCurr = activeQuestionIdx === idx;
              const isSolved = !!solvedQuestions[`${currentTrial.id}-${idx}`];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sfx("click");
                    setActiveQuestionIdx(idx);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "3px",
                    border: isCurr
                      ? "1.5px solid #ff2d3a"
                      : isSolved
                      ? "1px solid #81c784"
                      : "1px solid rgba(255, 45, 58, 0.25)",
                    background: isCurr
                      ? "#ff2d3a"
                      : isSolved
                      ? "rgba(129, 199, 132, 0.15)"
                      : "rgba(15, 3, 6, 0.7)",
                    color: isCurr ? "#000000" : isSolved ? "#81c784" : "#ffb3ba",
                    fontWeight: isCurr ? 900 : "normal",
                    fontSize: "11px",
                    cursor: "pointer",
                    boxShadow: isCurr ? "0 0 10px #ff2d3a" : "none",
                    transition: "all 0.12s ease",
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── MAIN CONSOLE CARD (OLD CLASSIC PAPER DOSSIER — VECNA THEMED) ─── */}
        <motion.div
          key={`${currentTrial.id}-${activeQuestionIdx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: "#f4eedf",
            backgroundImage: "radial-gradient(#e4dac2 1.2px, transparent 1.2px)",
            backgroundSize: "16px 16px",
            border: "2.5px solid #8f231e",
            borderRadius: "4px",
            boxShadow:
              "0 14px 44px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(140, 35, 30, 0.1)",
            padding: "26px 30px",
            color: "#1c140e",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* Card Header: Trial Index, Title, Subtitle & Bounty */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              borderBottom: "2px solid #8f231e",
              paddingBottom: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            {/* Left Header Section */}
            <div style={{ flex: 1, minWidth: "260px" }}>
              <div
                style={{
                  display: "inline-block",
                  fontSize: "10px",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 900,
                  color: "#8f231e",
                  letterSpacing: ".15em",
                  marginBottom: "4px",
                  borderBottom: "1px dashed #8f231e",
                  paddingBottom: "2px",
                }}
              >
                [VECNA PROTOCOL DOSSIER // STAGE {currentTrial.id} OF 7 · LEVEL {activeQuestionIdx + 1} OF 10]
              </div>
              <h2
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                  fontSize: "clamp(22px, 2.4vw, 32px)",
                  fontWeight: 900,
                  color: "#8f231e",
                  letterSpacing: "0.05em",
                  margin: "2px 0 4px 0",
                  textTransform: "uppercase",
                }}
              >
                {currentTrial.title}
              </h2>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  color: "#544336",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {currentTrial.subtitle}
              </div>
            </div>

            {/* Right Header Section: Psychic Bounty */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                textAlign: "right",
                borderLeft: "2px solid #8f231e",
                paddingLeft: "20px",
                minWidth: "160px",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#8f231e",
                  letterSpacing: "0.15em",
                  fontWeight: 900,
                  fontFamily: "'Courier New', monospace",
                  textTransform: "uppercase",
                }}
              >
                PSYCHIC BOUNTY
              </div>
              <div
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", Georgia, serif',
                  fontSize: "26px",
                  fontWeight: 900,
                  color: "#8f231e",
                  marginTop: "1px",
                  letterSpacing: "0.04em",
                }}
              >
                +5 PTS
              </div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px",
                  color: "#47382d",
                  fontWeight: 700,
                  marginTop: "3px",
                  letterSpacing: "0.06em",
                }}
              >
                TRIAL: {currentTrialScore}/50 PTS · TOTAL: {totalVecnaScore}/350 PTS
              </div>
            </div>
          </div>

          {/* Specialized Interactive Question Formation */}
          <div style={{ marginBottom: "22px" }}>
            <QuestionTypeRenderer
              question={currentQuestion}
              selectedAnswer={selectedAnswers[`${currentTrial.id}-${activeQuestionIdx}`]}
              onSelectOption={(optId) => handleSelectOption(currentTrial.id, activeQuestionIdx, optId)}
              isVecnaMode={true}
            />
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(184, 29, 36, 0.12)",
                  border: "1.5px solid #8f231e",
                  borderRadius: "3px",
                  color: "#8f231e",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "18px",
                }}
              >
                {errorMessage}
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(46, 105, 48, 0.12)",
                  border: "1.5px solid #2e6930",
                  borderRadius: "3px",
                  color: "#2e6930",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  marginBottom: "18px",
                }}
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action & Navigation Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              paddingTop: "16px",
              borderTop: "1.5px solid #c9bda4",
            }}
          >
            {/* Level Stepper Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePrevLevel}
                disabled={activeQuestionIdx === 0}
                style={{
                  padding: "8px 14px",
                  background: activeQuestionIdx === 0 ? "rgba(0,0,0,0.06)" : "#e6dcc6",
                  color: activeQuestionIdx === 0 ? "rgba(0,0,0,0.3)" : "#2a1e15",
                  border: "1.5px solid #9c8973",
                  borderRadius: "3px",
                  cursor: activeQuestionIdx === 0 ? "not-allowed" : "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                ◀ PREV LVL
              </button>

              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'Courier New', monospace",
                  color: "#47382d",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                LVL <b>{activeQuestionIdx + 1}</b> / {totalQuestionsForTrial}
              </span>

              <button
                type="button"
                onClick={handleNextLevel}
                disabled={activeQuestionIdx === totalQuestionsForTrial - 1}
                style={{
                  padding: "8px 14px",
                  background:
                    activeQuestionIdx === totalQuestionsForTrial - 1
                      ? "rgba(0,0,0,0.06)"
                      : "#e6dcc6",
                  color:
                    activeQuestionIdx === totalQuestionsForTrial - 1
                      ? "rgba(0,0,0,0.3)"
                      : "#2a1e15",
                  border: "1.5px solid #9c8973",
                  borderRadius: "3px",
                  cursor:
                    activeQuestionIdx === totalQuestionsForTrial - 1
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                }}
              >
                NEXT LVL ▶
              </button>
            </div>

            {/* Right: Submit Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                id="vecna-override-submit-btn"
                type="button"
                onClick={handleVerifyCurrentQuestion}
                style={{
                  background: isQuestionSolved ? "#2e6930" : "#8f231e",
                  color: "#ffffff",
                  fontFamily: "'Benguiat Bold', 'ITC Benguiat', serif",
                  fontSize: "13.5px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  padding: "12px 26px",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  boxShadow: isQuestionSolved
                    ? "0 3px 12px rgba(46, 105, 48, 0.45)"
                    : "0 3px 12px rgba(143, 35, 30, 0.45)",
                  transition: "all 0.2s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  textTransform: "uppercase",
                }}
              >
                {isQuestionSolved ? (
                  activeQuestionIdx < totalQuestionsForTrial - 1 ? (
                    <>
                      <span>✓ LVL {activeQuestionIdx + 1} CLEARED (+5 PTS)</span>
                      <span>—</span>
                      <span>NEXT LVL ▶</span>
                    </>
                  ) : (
                    <span>✓ ALL 10 LEVELS CLEARED (50/50 PTS)</span>
                  )
                ) : (
                  <>
                    <span>⚡ VERIFY LEVEL OVERRIDE (+5 PTS)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 1: 🗺️ TACTICAL VECTOR MAP MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsMapOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(1200px, 96vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "20px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    HAWKINS TACTICAL VECTOR MAP
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    LIVE GPS TELEMETRY & ACTIVE RECON TEAM COORDINATES
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMapOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE MAP]
                </button>
              </div>

              <VecnaTacticalMap
                selectedLocationId={selectedLocation}
                onSelectLocation={(locId) => setSelectedLocation(locId)}
                teamsAtLocation={teamsAtLocation}
                onInspectTeam={(tId) => {
                  setSelectedTeamName(tId);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 2: ✉️ TEAM DISPATCH & MESSAGING MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMessageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsMessageOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(640px, 94vw)",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    DISPATCH TRANSMISSION TO TEAMS
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    BROADCAST EERIE TELEPATHIC MESSAGES ACROSS GAMESPACE
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMessageOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE]
                </button>
              </div>

              <VecnaMessagePanel
                onSendMessage={handleSendMessage}
                selectedTeamName={selectedTeamName}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────
          POPUP MODAL 3: ⚡ VECNA POWERS & SABOTAGE MODAL
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPowersOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(4, 1, 3, 0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsPowersOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              style={{
                width: "min(780px, 94vw)",
                background: "#0a0306",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#ff2d3a", fontSize: "18px", fontWeight: "bold", letterSpacing: "0.1em" }}>
                    VECNA POWERS & SABOTAGE COCKPIT
                  </h3>
                  <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", marginTop: "2px" }}>
                    CORRUPT, LOCK, JAM, GLITCH, DISTORT, OR FREEZE TARGET TEAMS
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPowersOpen(false)}
                  style={{
                    background: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff8a80",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontFamily: '"Share Tech Mono", monospace',
                  }}
                >
                  [✕ CLOSE]
                </button>
              </div>

              <VecnaTriggerPanel
                selectedLocation={selectedLocation}
                onSelectLocation={(locId) => setSelectedLocation(locId)}
                onTriggerAction={handleExecuteTrigger}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters Modal (Square mode with pictures) */}
      <VecnaChaptersModal
        isOpen={isChaptersModalOpen}
        activeTrialId={activeTrialId}
        solvedQuestions={solvedQuestions}
        onSelectTrial={(trialId) => {
          setActiveTrialId(trialId);
          setActiveQuestionIdx(0);
          setErrorMessage(null);
          setSuccessMessage(null);
          setIsStoryDialogOpen(true);
        }}
        onClose={() => setIsChaptersModalOpen(false)}
      />

      {/* Vecna Story Dialogue (Pokemon FireRed bottom style with Vecna sprite) */}
      <AnimatePresence>
        {isStoryDialogOpen && (
          <VecnaStoryDialog
            trialId={currentTrial.id}
            trialTitle={currentTrial.title}
            trialShortName={currentTrial.shortName}
            onComplete={() => setIsStoryDialogOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
