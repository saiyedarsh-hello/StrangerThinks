"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES, StageId } from "@/lib/stages";
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

interface VecnaTrial {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  question: string;
  codeSnippet?: string;
  options?: { id: string; text: string }[];
  correctAnswer: string;
  points: number;
  powersGranted: string;
}

const VECNA_TRIALS: VecnaTrial[] = [
  {
    id: 1,
    title: "TRIAL I: MUNICIPAL TELEMETRY & MKULTRA",
    subtitle: "CIVIC DISTRICT · POWER SURGE FREQUENCY",
    category: "TELEMETRY BREACH",
    description:
      "Department of Energy covert psychokinetic trials caused the initial 1983 tear beneath Hawkins. Intercepted power grid telemetry pulses are broadcasting across municipal transformers.",
    question:
      "Which classified Department of Energy project resulted in the initial psychokinetic rift and the escape of Subject 011?",
    options: [
      { id: "A", text: "Project MKUltra / Sublevel 04" },
      { id: "B", text: "Operation Paperclip / Echo Division" },
      { id: "C", text: "Stargate Surveillance Protocol" },
      { id: "D", text: "Project Blue Book Sub-Archive" },
    ],
    correctAnswer: "A",
    points: 100,
    powersGranted: "GLITCH · CRT FREAKOUT",
  },
  {
    id: 2,
    title: "TRIAL II: PRECINCT RF VECTOR TRIANGULATION",
    subtitle: "HAWKINS POLICE DEPT · CHIEF'S DOSSIER",
    category: "VECTOR CORRELATION",
    description:
      "Police dispatch logs at 22:42, Benny's Diner witness statements at 22:58, and East Hill RF sensor readings at 14.8 MHz confirm an electromagnetic anomaly ground zero.",
    question:
      "Triangulate the directional telemetry recordings: what is the epicenter of the electromagnetic breach?",
    options: [
      { id: "A", text: "Hawkins National Laboratory (Sublevel 4)" },
      { id: "B", text: "Cornwallis Municipal Substation" },
      { id: "C", text: "Roane County Water Tower Reservoir" },
      { id: "D", text: "Sattler Quarry Abandoned Basin" },
    ],
    correctAnswer: "A",
    points: 150,
    powersGranted: "SIGNAL JAM · RADIO DISTORTION",
  },
  {
    id: 3,
    title: "TRIAL III: WALL FREQUENCY COMMUNICATION",
    subtitle: "BYERS HOUSE · CHRISTMAS LIGHTS ENCODING",
    category: "ELECTROMAGNETIC ENCODING",
    description:
      "Christmas lights arranged across the alphabet wallpaper at the Byers residence pulse without power. Will is transmitting urgent warnings through the wall.",
    question:
      "Reconstruct the 5-word scrambled signal into Will's decoded warning message:",
    options: [
      { id: "A", text: "DO NOT OPEN THE GATE" },
      { id: "B", text: "RUN FROM THE SHADOWS" },
      { id: "C", text: "HE IS HERE WITH US" },
      { id: "D", text: "CLOSE THE PORTAL NOW" },
    ],
    correctAnswer: "A",
    points: 150,
    powersGranted: "DISTORT · CLUE OBFUSCATION",
  },
  {
    id: 4,
    title: "TRIAL IV: LAB MAINFRAME PARITY OVERFLOW",
    subtitle: "HAWKINS LAB · SUBLEVEL 3 GRID ROUTINE",
    category: "LOGIC EXECUTION",
    description:
      "Hawkins Lab Sublevel 3 telemetry router crashed on an unhandled parity routine. Trace the loop execution: evens double (* 2), odds add 1 (+ 1) for the array [2, 3, 5, 8].",
    question:
      "What is the final sum integer output of the parity routine for array [2, 3, 5, 8]?",
    codeSnippet: `function traceParity(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) total += arr[i] * 2;
    else total += arr[i] + 1;
  }
  return total;
}
console.log(traceParity([2, 3, 5, 8])); // -> 4 + 4 + 6 + 16 = 30`,
    options: [
      { id: "A", text: "30" },
      { id: "B", text: "26" },
      { id: "C", text: "36" },
      { id: "D", text: "28" },
    ],
    correctAnswer: "A",
    points: 200,
    powersGranted: "LOCK · ACCESS DENIED",
  },
  {
    id: 5,
    title: "TRIAL V: DEEP WOODS PINE RUNES",
    subtitle: "ROANE COUNTY WOODS · TRAIL 7 HARMONICS",
    category: "COORDINATE CIPHER",
    description:
      "Glowing geometric pine runes are carved into ancient pine tree trunks along Deep Woods Trail 7 leading toward the high-altitude East Hill repeater tower.",
    question:
      "Extract the three glowing pine digits left-to-right to lock the harmonic vector coordinates:",
    options: [
      { id: "A", text: "Vector 4 · 1 · 7" },
      { id: "B", text: "Vector 8 · 3 · 4" },
      { id: "C", text: "Vector 2 · 9 · 5" },
      { id: "D", text: "Vector 6 · 0 · 1" },
    ],
    correctAnswer: "A",
    points: 200,
    powersGranted: "TIME FREEZE · DEDUCT 2 MINS",
  },
  {
    id: 6,
    title: "TRIAL VI: EAST HILL RADIOMETER STATIC",
    subtitle: "RADIO TOWER · 5-PIN HARMONIC RESONANCE",
    category: "FREQUENCY ALIGNMENT",
    description:
      "The tower's emergency radiometer is scrambled by dimensional static across all 5 frequency channels (Pins 1-5: Alpha, Beta, Gamma, Delta, Epsilon).",
    question:
      "What is the 5-digit master override cipher sequence decoded when all 5 radiometer pins resonate at harmony?",
    options: [
      { id: "A", text: "8 - 3 - 4 - 7 - 9" },
      { id: "B", text: "1 - 9 - 8 - 4 - 2" },
      { id: "C", text: "5 - 7 - 3 - 1 - 9" },
      { id: "D", text: "4 - 8 - 2 - 6 - 0" },
    ],
    correctAnswer: "A",
    points: 300,
    powersGranted: "CORRUPT · SYSTEM TAKEOVER",
  },
  {
    id: 7,
    title: "TRIAL VII: HIVE MIND CONFRONTATION",
    subtitle: "THE UPSIDE DOWN · SUBJECT 001 REVELATION",
    category: "ROT13 MIND DECRYPTION",
    description:
      "A scrubbed Department of Energy record was recovered from the corrupted red soil. The true identity of Subject 001 was masked using a ROT13 cipher: 'URAEL PERRY'.",
    question:
      "Apply the ROT13 decryption on 'URAEL PERRY' to reveal the human origin of Vecna:",
    options: [
      { id: "A", text: "HENRY CREEL" },
      { id: "B", text: "PETER BALLARD" },
      { id: "C", text: "MARTIN BRENNER" },
      { id: "D", text: "VICTOR CREEL" },
    ],
    correctAnswer: "A",
    points: 500,
    powersGranted: "GRANDFATHER CLOCK · GATE MASTERY",
  },
];

export default function VecnaPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  // Active Trial Selection
  const [activeTrialId, setActiveTrialId] = useState<number>(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [trialResults, setTrialResults] = useState<Record<number, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isPowersOpen, setIsPowersOpen] = useState(false);

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

  const handleSelectOption = (trialId: number, optionId: string) => {
    sfx("click");
    setSelectedAnswers((prev) => ({ ...prev, [trialId]: optionId }));
    setErrorMessage(null);
  };

  const handleVerifyTrial = (trial: VecnaTrial) => {
    const chosen = selectedAnswers[trial.id];
    if (!chosen) {
      setErrorMessage("SELECT A PSYCHIC VECTOR FIRST");
      sfx("err");
      return;
    }

    if (chosen === trial.correctAnswer) {
      sfx("boom");
      setTrialResults((prev) => ({ ...prev, [trial.id]: true }));
      setErrorMessage(null);
    } else {
      sfx("err");
      setErrorMessage("[CORRUPTION ANOMALY] INCORRECT VECTOR CHECKSUM");
      setTimeout(() => setErrorMessage(null), 1200);
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
    setIsMessageOpen(false);
  };

  const handleExecuteTrigger = (action: TriggerAction) => {
    sfx("boom");
    publish({
      type: "sabotage",
      kind: (action.id === "RADIO_DISTORTION" ? "SIGNAL_JAM" : action.id) as any,
      target: selectedLocation,
      ts: Date.now(),
    });
    setIsPowersOpen(false);
  };

  const currentTrial = VECNA_TRIALS.find((t) => t.id === activeTrialId) || VECNA_TRIALS[0];
  const isSolved = !!trialResults[currentTrial.id];

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#080204",
        color: "#ffebee",
        fontFamily: '"Share Tech Mono", monospace',
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      <CinematicBackground
        src="/upsidedown-bg.jpg"
        particles="embers"
        vignette="heavy"
        overlayOpacity={0.78}
      />

      {/* ───────────────────────────────────────────────────────────────────
          TOP VECNA HEADER & ACTION POPUPS BAR
          ─────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          background: "rgba(14, 3, 6, 0.92)",
          borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Left: Vecna Title & Mind Sync */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontFamily:
                '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
              fontSize: "clamp(18px, 2.2vw, 24px)",
              fontWeight: 900,
              color: "#ff2d3a",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textShadow: "0 0 10px rgba(255, 45, 58, 0.7)",
            }}
          >
            VECNA MIND CONTROL <span style={{ color: "#ffffff", fontSize: "14px", fontFamily: '"Share Tech Mono", monospace' }}>· 1986</span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "rgba(255, 45, 58, 0.15)",
              border: "1px solid rgba(255, 45, 58, 0.4)",
              borderRadius: "3px",
              fontSize: "11px",
              color: "#ff8a80",
              fontWeight: "bold",
              letterSpacing: "0.1em",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff2d3a", boxShadow: "0 0 8px #ff2d3a" }} />
            HIVE MIND ACTIVE
          </div>
        </div>

        {/* Center: 3 Action Popups */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Popup 1: Tactical Map */}
          <button
            id="vecna-map-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMapOpen(true);
            }}
            style={{
              background: isMapOpen ? "#ff2d3a" : "rgba(25, 6, 10, 0.8)",
              color: isMapOpen ? "#000" : "#ffcdd2",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              cursor: "pointer",
              boxShadow: "0 0 12px rgba(255, 45, 58, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "15px" }}>🗺️</span> TACTICAL MAP
          </button>

          {/* Popup 2: Message Dispatch */}
          <button
            id="vecna-message-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsMessageOpen(true);
            }}
            style={{
              background: isMessageOpen ? "#ff2d3a" : "rgba(25, 6, 10, 0.8)",
              color: isMessageOpen ? "#000" : "#ffcdd2",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              cursor: "pointer",
              boxShadow: "0 0 12px rgba(255, 45, 58, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "15px" }}>✉️</span> TEAM DISPATCH
          </button>

          {/* Popup 3: Vecna Powers */}
          <button
            id="vecna-powers-popup-btn"
            type="button"
            onClick={() => {
              sfx("click");
              setIsPowersOpen(true);
            }}
            style={{
              background: isPowersOpen ? "#ff2d3a" : "rgba(25, 6, 10, 0.8)",
              color: isPowersOpen ? "#000" : "#ffcdd2",
              border: "1.5px solid #ff2d3a",
              padding: "8px 16px",
              borderRadius: "3px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              cursor: "pointer",
              boxShadow: "0 0 12px rgba(255, 45, 58, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "15px" }}>⚡</span> VECNA POWERS
          </button>
        </div>

        {/* Right: Exit / Logout */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: "transparent",
            color: "rgba(255, 200, 200, 0.6)",
            border: "1px solid rgba(255, 45, 58, 0.3)",
            padding: "6px 14px",
            borderRadius: "3px",
            fontSize: "12px",
            fontFamily: '"Share Tech Mono", monospace',
            letterSpacing: "0.15em",
            cursor: "pointer",
          }}
        >
          [⎋ EXIT VECNA]
        </button>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          MAIN AREA: VECNA MASTER TRIALS & QUESTIONNAIRE CONSOLE
          ─────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
          padding: "28px 24px 80px 24px",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        {/* Trial Tabs Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          {VECNA_TRIALS.map((trial) => {
            const isCurrent = activeTrialId === trial.id;
            const isCompleted = !!trialResults[trial.id];

            return (
              <button
                key={trial.id}
                type="button"
                onClick={() => {
                  sfx("click");
                  setActiveTrialId(trial.id);
                  setErrorMessage(null);
                }}
                style={{
                  background: isCurrent
                    ? "rgba(255, 45, 58, 0.25)"
                    : "rgba(18, 5, 8, 0.8)",
                  border: isCurrent
                    ? "2px solid #ff2d3a"
                    : "1px solid rgba(255, 45, 58, 0.25)",
                  borderRadius: "3px",
                  padding: "10px 8px",
                  color: isCurrent ? "#ff2d3a" : isCompleted ? "#81c784" : "#ffffff",
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "12px",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow: isCurrent ? "0 0 14px rgba(255, 45, 58, 0.4)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <div style={{ fontSize: "10px", color: isCurrent ? "#ff8a80" : "rgba(255,255,255,0.4)" }}>
                  TRIAL {trial.id}
                </div>
                <div style={{ marginTop: "3px", textTransform: "uppercase" }}>
                  {trial.category.split(" ")[0]}
                </div>
                {isCompleted && (
                  <span style={{ fontSize: "9px", color: "#81c784", marginTop: "2px", display: "block" }}>
                    ✓ CLEARED
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Trial Question Panel */}
        <motion.div
          key={currentTrial.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "rgba(14, 4, 7, 0.95)",
            border: "1.5px solid rgba(255, 45, 58, 0.45)",
            borderRadius: "6px",
            boxShadow: "0 0 40px rgba(0,0,0,0.9), 0 0 20px rgba(255, 45, 58, 0.2)",
            padding: "28px 32px",
          }}
        >
          {/* Trial Head */}
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
              <div style={{ fontSize: "12px", color: "#ff8a80", letterSpacing: "0.2em", fontWeight: "bold" }}>
                [{currentTrial.category}] · {currentTrial.subtitle}
              </div>
              <h2
                style={{
                  fontFamily:
                    '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                  fontSize: "clamp(22px, 2.5vw, 32px)",
                  fontWeight: 900,
                  color: "#ff2d3a",
                  letterSpacing: "0.06em",
                  margin: "6px 0 0 0",
                  textShadow: "0 0 10px rgba(255, 45, 58, 0.5)",
                }}
              >
                {currentTrial.title}
              </h2>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,200,200,0.5)", letterSpacing: "0.15em" }}>
                PSYCHIC BOUNTY
              </div>
              <div style={{ fontSize: "18px", color: "var(--accent)", fontWeight: "bold", marginTop: "2px" }}>
                +{currentTrial.points} PTS
              </div>
            </div>
          </div>

          {/* Trial Lore Description */}
          <div
            style={{
              background: "rgba(255, 45, 58, 0.08)",
              borderLeft: "3px solid #ff2d3a",
              padding: "12px 18px",
              marginBottom: "22px",
              fontSize: "14px",
              lineHeight: "1.55",
              color: "rgba(255, 225, 230, 0.9)",
            }}
          >
            {currentTrial.description}
          </div>

          {/* Question Text */}
          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: "#ffffff",
              marginBottom: "16px",
              lineHeight: "1.4",
            }}
          >
            {currentTrial.question}
          </div>

          {/* Code Snippet (if any) */}
          {currentTrial.codeSnippet && (
            <div
              style={{
                background: "#050103",
                border: "1px solid rgba(255, 45, 58, 0.3)",
                padding: "16px",
                borderRadius: "4px",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "13.5px",
                color: "#ffcdd2",
                whiteSpace: "pre-wrap",
                marginBottom: "20px",
                lineHeight: "1.45",
              }}
            >
              {currentTrial.codeSnippet}
            </div>
          )}

          {/* Multiple Choice Options */}
          {currentTrial.options && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {currentTrial.options.map((opt) => {
                const isSelected = selectedAnswers[currentTrial.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentTrial.id, opt.id)}
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
                      transition: "all 0.18s ease",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "3px",
                        border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.3)",
                        background: isSelected ? "#ff2d3a" : "transparent",
                        color: isSelected ? "#000" : "#fff",
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
          )}

          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255, 45, 58, 0.2)",
                  border: "1px solid #ff2d3a",
                  borderRadius: "4px",
                  color: "#ff2d3a",
                  fontSize: "13px",
                  textAlign: "center",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  marginBottom: "16px",
                }}
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
            <div style={{ fontSize: "12px", color: "rgba(255,200,200,0.6)", letterSpacing: "0.1em" }}>
              UNLOCKED POWER: <strong style={{ color: "#ff8a80" }}>{currentTrial.powersGranted}</strong>
            </div>

            <button
              type="button"
              onClick={() => handleVerifyTrial(currentTrial)}
              style={{
                background: isSolved ? "#81c784" : "#ff2d3a",
                color: "#000000",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "14px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                padding: "12px 32px",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(255, 45, 58, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              {isSolved ? "✓ TRIAL CLEARED" : "TRANSMIT VECNA OVERRIDE →"}
            </button>
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
                    🗺️ HAWKINS TACTICAL VECTOR MAP
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
                    ✉️ DISPATCH TRANSMISSION TO TEAMS
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
                    ⚡ VECNA POWERS & SABOTAGE COCKPIT
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
    </div>
  );
}
