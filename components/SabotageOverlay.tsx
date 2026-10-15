"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/store";
import { mmss } from "@/lib/results";
import { sfx } from "@/lib/audio";
import Glitch from "./Glitch";

const QS: [string, RegExp][] = [
  ["Binary of 5?", /^101$/],
  ["7 × 8 = ?", /^56$/],
  ["Letters in VECNA?", /^5$/],
  ["Hex of 255 (2 chars)?", /^ff$/i],
  ["15 mod 4 = ?", /^3$/],
  ["Decimal of binary 1100?", /^12$/],
];

interface CorruptQuestion {
  id: string;
  title: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
}

const CORRUPTED_ANOMALY_QUESTIONS: CorruptQuestion[] = [
  {
    id: "corrupt-1",
    title: "VOID FREQUENCY DISTORTION",
    prompt: "A psychic anomaly has scrambled your Hawkins radio transceiver. To recalibrate the mainframe, determine: What channel was Mike's Realistic TRC-214 walkie-talkie tuned to when contacting Will?",
    options: [
      { id: "A", text: "Channel 11" },
      { id: "B", text: "Channel 14" },
      { id: "C", text: "Channel 9" },
      { id: "D", text: "Channel 20" },
    ],
    correctAnswer: "B",
  },
  {
    id: "corrupt-2",
    title: "HIVE MIND TELEMETRY INTRUSION",
    prompt: "Vecna has injected a false parity byte into the Hawkins Lab Sublevel 3 router. Which emergency code did the Party broadcast over the airwaves when under Demogorgon attack?",
    options: [
      { id: "A", text: "CODE RED" },
      { id: "B", text: "BLACKOUT" },
      { id: "C", text: "OPERATION ZERO" },
      { id: "D", text: "SHADOW MONSTER" },
    ],
    correctAnswer: "A",
  },
  {
    id: "corrupt-3",
    title: "PARITY OVERFLOW ERROR",
    prompt: "Dimensional reality corrupted: Convert decimal value 13 into standard 4-bit binary to unlock the terminal bypass circuit.",
    options: [
      { id: "A", text: "1011 (binary)" },
      { id: "B", text: "1110 (binary)" },
      { id: "C", text: "1101 (binary)" },
      { id: "D", text: "1001 (binary)" },
    ],
    correctAnswer: "C",
  },
  {
    id: "corrupt-4",
    title: "CEREBRO RADIO INTERFERENCE",
    prompt: "Dustin's Cerebro antenna received an anomalous harmonic interference. What song was broadcast across Roane County to transmit Planck's Constant (6.62607004)?",
    options: [
      { id: "A", text: "The NeverEnding Story" },
      { id: "B", text: "Should I Stay or Should I Go" },
      { id: "C", text: "Africa by Toto" },
      { id: "D", text: "Runnin' Up That Hill" },
    ],
    correctAnswer: "A",
  },
  {
    id: "corrupt-5",
    title: "SOTERIA CHIP CORRUPTION",
    prompt: "Experiment 001's inhibitor telemetry has leaked into your docket. What is the hexadecimal representation of decimal 255?",
    options: [
      { id: "A", text: "0xFF" },
      { id: "B", text: "0xEE" },
      { id: "C", text: "0xAA" },
      { id: "D", text: "0x100" },
    ],
    correctAnswer: "A",
  },
];

const NAME: Record<string, string> = {
  CORRUPT: "CHALLENGE CORRUPTED",
  TIME_FREEZE: "TIME FREEZE · -02:00",
  LOCK: "CHALLENGE LOCKED",
  DISTORT: "CLUE DISTORTED",
  SIGNAL_JAM: "SIGNAL JAMMED",
  WATCH: "VECNA IS WATCHING",
  MESSAGE: "INCOMING PSYCHIC TRANSMISSION",
  GLITCH: "DIMENSIONAL REALITY GLITCH",
};

export default function SabotageOverlay() {
  const { sabotage, clearSabotage } = useGame();
  const [val, setVal] = useState("");
  const [hide, setHide] = useState(false);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    setVal("");
    setHide(false);
    if (!sabotage) return;
    if (sabotage.kind === "MESSAGE") {
      try {
        sfx("vecnaCurse");
      } catch {}
    }
    const sticky = sabotage.kind === "LOCK" || sabotage.kind === "CORRUPT";
    const durMs =
      sabotage.kind === "GLITCH"
        ? 2400
        : sabotage.kind === "WATCH"
        ? 0
        : sabotage.kind === "MESSAGE"
        ? 7500
        : 4200;
    const t = setTimeout(() => {
      if (!sticky) {
        setHide(true);
        if (sabotage.kind === "GLITCH" || sabotage.kind === "MESSAGE") clearSabotage();
      }
    }, durMs);
    return () => clearTimeout(t);
  }, [sabotage?.id]); // eslint-disable-line

  useEffect(() => {
    if (!sabotage) return;
    const i = setInterval(() => setLeft(Math.max(0, Math.round((sabotage.until - Date.now()) / 1000))), 250);
    return () => clearInterval(i);
  }, [sabotage]);

  const q = sabotage ? QS[sabotage.id % QS.length] : null;
  const overlay = sabotage && !hide && sabotage.kind !== "WATCH";

  const isHawkinsOnly =
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/vecna") &&
    !window.location.pathname.startsWith("/admin");

  // Dedicated Top-Left Vecna Telepathic Message Popup (Requirement 7)
  if (sabotage && sabotage.kind === "MESSAGE" && !hide && isHawkinsOnly) {
    return (
      <AnimatePresence>
        {/* The Vecna Telepathic Card with Subtle Stranger Things Red Vines Decoration */}
        <motion.div
          key={sabotage.id}
          initial={{ opacity: 0, x: -70, y: -20, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.9, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: "28px",
            left: "28px",
            zIndex: 99999,
            width: "min(480px, 92vw)",
            pointerEvents: "auto",
          }}
        >
          {/* Subtle Red Vines Decorating Perimeter (Stranger Things Atmospheric Vines) */}
          <svg
            viewBox="0 0 500 240"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              top: "-8px",
              left: "-8px",
              width: "calc(100% + 16px)",
              height: "calc(100% + 16px)",
              pointerEvents: "none",
              zIndex: 1,
              overflow: "visible",
              filter: "drop-shadow(0 0 4px rgba(255, 45, 58, 0.4))",
            }}
          >
            <defs>
              <linearGradient id="vine-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8a0f18" />
                <stop offset="50%" stopColor="#c41c26" />
                <stop offset="100%" stopColor="#6e0b12" />
              </linearGradient>
              <linearGradient id="vine-grad-accent" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#54070c" />
                <stop offset="60%" stopColor="#a8151f" />
                <stop offset="100%" stopColor="#ff2d3a" />
              </linearGradient>
            </defs>

            {/* Top edge creeping vines */}
            <path
              d="M -4,12 Q 40,2 95,8 T 210,5 Q 310,12 410,4 T 504,10"
              fill="none"
              stroke="url(#vine-grad-main)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 60,6 Q 85,-4 110,4 M 180,5 Q 200,-3 225,3 M 360,6 Q 385,-2 405,5"
              fill="none"
              stroke="url(#vine-grad-accent)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* Bottom edge creeping vines */}
            <path
              d="M -4,228 Q 65,236 150,230 T 320,234 Q 415,228 504,232"
              fill="none"
              stroke="url(#vine-grad-main)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M 80,232 Q 105,242 130,234 M 250,233 Q 275,243 300,235 M 390,231 Q 415,241 440,233"
              fill="none"
              stroke="url(#vine-grad-accent)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* Left edge subtle curling vine */}
            <path
              d="M 8,-4 Q 2,60 7,120 T 4,244"
              fill="none"
              stroke="url(#vine-grad-main)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 6,45 Q -4,65 5,85 M 5,150 Q -3,170 6,190"
              fill="none"
              stroke="url(#vine-grad-accent)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* Right edge subtle curling vine */}
            <path
              d="M 492,-4 Q 498,60 493,120 T 496,244"
              fill="none"
              stroke="url(#vine-grad-main)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M 494,50 Q 504,70 495,90 M 495,155 Q 503,175 494,195"
              fill="none"
              stroke="url(#vine-grad-accent)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>

          {/* The Content Card Framed by Subtle Vines */}
          <div
            style={{
              background:
                "linear-gradient(145deg, rgba(14, 2, 5, 0.98) 0%, rgba(28, 3, 7, 0.98) 55%, rgba(10, 1, 3, 0.99) 100%)",
              border: "2px solid #ff2a3a",
              borderRadius: "8px",
              padding: "20px 22px",
              boxShadow:
                "0 0 35px rgba(255, 30, 45, 0.85), 0 0 75px rgba(180, 0, 20, 0.5), inset 0 0 25px rgba(255, 45, 58, 0.3)",
              position: "relative",
              overflow: "hidden",
              zIndex: 5,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Ambient Eldritch Pulse Overlay inside Card */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(255, 45, 58, 0.18) 0%, transparent 75%)",
                pointerEvents: "none",
              }}
            />

            {/* Header with Glowing Vecna Alarm & Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
                paddingBottom: "10px",
                marginBottom: "12px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ff2a3a",
                    boxShadow: "0 0 14px #ff2a3a, 0 0 24px #ff2a3a",
                    animation: "pulse 1.2s infinite",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#ff4d58",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      lineHeight: 1.1,
                      textShadow: "0 0 10px rgba(255, 77, 88, 0.8)",
                    }}
                  >
                    VECNA PSYCHIC TRANSMISSION
                  </div>
                  <div
                    style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "9.5px",
                      color: "#ff8a93",
                      letterSpacing: "0.14em",
                      marginTop: "2px",
                    }}
                  >
                    HENRY CREEL // DEMONIC TELEPATHY
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSabotage}
                style={{
                  background: "rgba(255, 45, 58, 0.15)",
                  border: "1px solid rgba(255, 45, 58, 0.45)",
                  color: "#ff99a0",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontFamily: '"Share Tech Mono", monospace',
                  letterSpacing: "0.08em",
                }}
              >
                ✕ DISMISS
              </button>
            </div>

            {/* Disturbing Transmission Message Body */}
            <div
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "15px",
                color: "#ffffff",
                lineHeight: 1.5,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textShadow: "0 0 10px rgba(255, 45, 58, 0.65), 0 0 20px rgba(255, 20, 30, 0.35)",
                wordBreak: "break-word",
                position: "relative",
                zIndex: 2,
                padding: "4px 2px",
                maxHeight: "55vh",
                overflowY: "auto",
              }}
            >
              &ldquo;{sabotage.message || "I KNOW WHERE YOU ARE."}&rdquo;
            </div>

            {/* Operator and Audio Status Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "12px",
                paddingTop: "8px",
                borderTop: "1px dashed rgba(255, 45, 58, 0.25)",
                fontSize: "10px",
                fontFamily: '"Share Tech Mono", monospace',
                color: "#ff8088",
                letterSpacing: "0.08em",
                position: "relative",
                zIndex: 2,
              }}
            >
              <span>🔊 DEEP SUB-FREQUENCY ACTIVE</span>
              <span>EXPIRES IN ~7S</span>
            </div>

            {/* Disappearing Progress Bar (7.5 seconds) */}
            <div
              style={{
                marginTop: "8px",
                height: "3px",
                background: "rgba(255, 45, 58, 0.25)",
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative",
                zIndex: 2,
              }}
            >
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 7.5, ease: "linear" }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #ff2a3a 0%, #ff6b76 100%)",
                  boxShadow: "0 0 12px #ff2a3a",
                }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Dedicated Visual Glitch Burst (Requirement 3)
  if (sabotage && sabotage.kind === "GLITCH" && !hide) {
    return (
      <div
        className="glitch-burst-screen"
        onClick={clearSabotage}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(20, 2, 4, 0.94)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        {/* Animated Chromatic Split Scanlines */}
        <div
          className="glitch-noise-layer"
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, rgba(255,45,58,0.2) 0px, transparent 2px, rgba(0,0,0,0.6) 4px)",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: 24, maxWidth: 640 }}>
          <div className="eyebrow" style={{ color: "var(--danger)", fontSize: 18, letterSpacing: ".3em", marginBottom: 12 }}>
            [ALERT] PSYCHIC TRANSMISSION INTERFERENCE
          </div>
          <h1
            className="title-xl glitch-text-burst"
            style={{
              fontSize: "clamp(42px, 8vw, 86px)",
              color: "#ff2d3a",
              lineHeight: 1.1,
            }}
          >
            <Glitch text="REALITY DISTORTION" hard />
          </h1>
          <div className="term" style={{ color: "#fff", fontSize: 20, letterSpacing: ".2em", marginTop: 16 }}>
            {sabotage.operatorName ? `DISPATCHED BY ${sabotage.operatorName.toUpperCase()}` : "VECNA'S MIND SURGE DETECTED"}
          </div>
          <div className="term dim" style={{ fontSize: 14, marginTop: 12 }}>
            [CLICK ANYWHERE TO RECALIBRATE FREQUENCY]
          </div>
        </div>
      </div>
    );
  }

  const corruptQ =
    sabotage && sabotage.kind === "CORRUPT"
      ? CORRUPTED_ANOMALY_QUESTIONS[Math.abs(sabotage.id || 0) % CORRUPTED_ANOMALY_QUESTIONS.length]
      : null;

  const [selectedCorruptOpt, setSelectedCorruptOpt] = useState<string>("");
  const [corruptError, setCorruptError] = useState<string | null>(null);
  const [corruptSuccess, setCorruptSuccess] = useState<boolean>(false);

  const handleSolveCorrupt = () => {
    if (!corruptQ || !selectedCorruptOpt) return;
    if (selectedCorruptOpt === corruptQ.correctAnswer) {
      sfx("boom");
      setCorruptSuccess(true);
      setCorruptError(null);
      setTimeout(() => {
        clearSabotage();
        setSelectedCorruptOpt("");
        setCorruptSuccess(false);
      }, 900);
    } else {
      sfx("err");
      setCorruptError("ANOMALY OVERRIDE FAILED · PARITY MISMATCH!");
      setTimeout(() => setCorruptError(null), 2500);
    }
  };

  return (
    <>
      <AnimatePresence>
        {overlay && sabotage.kind !== "MESSAGE" && (
          <motion.div className="sab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="sab-box" style={{ maxWidth: 660, padding: 24, border: "2px solid #ff2d3a", background: "#0a0306", boxShadow: "0 0 30px rgba(255, 45, 58, 0.4)" }}>
              <div className="term" style={{ color: "#ff2d3a", fontSize: 20, letterSpacing: ".25em", fontWeight: 900 }}>
                {sabotage.kind === "CORRUPT" ? "★ VECNA INTRUSION · SYSTEM CORRUPTED ★" : "[ALERT] SYSTEM COMPROMISED"}
              </div>

              <h2 className="title-xl" style={{ fontSize: sabotage.kind === "CORRUPT" ? 28 : 44, margin: "10px 0", color: "#ff2d3a" }}>
                <Glitch text={sabotage.message || (sabotage.kind === "CORRUPT" ? "ANOMALY INJECTED INTO INVESTIGATION TRACK" : "VECNA HAS FOUND YOU.")} hard />
              </h2>

              <div className="eyebrow" style={{ marginBottom: 16 }}>
                {sabotage.kind === "CORRUPT"
                  ? "CORRUPTED TELEMETRY DETECTED · SOLVE ANOMALY TO RETURN TO ORIGINAL TRACK"
                  : sabotage.kind === "LOCK" && sabotage.pinIndex !== undefined
                  ? `PIN ${sabotage.pinIndex + 1} LOCKED BY VECNA`
                  : NAME[sabotage.kind]}
                {sabotage.operatorName && (
                  <span className="dim" style={{ marginLeft: 8 }}>
                    · DISPATCHED BY {sabotage.operatorName.toUpperCase()}
                  </span>
                )}
              </div>

              {/* CORRUPT POWER: INJECTS 1 FAKE QUESTION HAWKINS MUST SOLVE (Requirement 6) */}
              {sabotage.kind === "CORRUPT" && corruptQ ? (
                <div style={{ textAlign: "left", width: "100%", marginTop: 8 }}>
                  <div
                    style={{
                      background: "rgba(255, 45, 58, 0.08)",
                      border: "1.5px solid rgba(255, 45, 58, 0.4)",
                      padding: "14px 16px",
                      borderRadius: 4,
                      marginBottom: 16,
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#ffd9db",
                    }}
                  >
                    <div style={{ color: "#ff2d3a", fontWeight: 900, marginBottom: 6, fontSize: 11, letterSpacing: ".1em" }}>
                      [CORRUPTED ANOMALY // {corruptQ.title}]
                    </div>
                    {corruptQ.prompt}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                    {corruptQ.options.map((opt) => {
                      const isSel = selectedCorruptOpt === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            sfx("click");
                            setSelectedCorruptOpt(opt.id);
                          }}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            background: isSel ? "rgba(255, 45, 58, 0.25)" : "rgba(20, 10, 14, 0.8)",
                            border: isSel ? "2px solid #ff2d3a" : "1px solid rgba(255, 45, 58, 0.3)",
                            borderRadius: 4,
                            color: isSel ? "#ffffff" : "#f1cfd2",
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: "'Courier New', Courier, monospace",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span style={{ fontWeight: 900, color: "#ff2d3a", background: "rgba(255, 45, 58, 0.2)", padding: "2px 6px", borderRadius: 2 }}>
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {corruptError && (
                    <div style={{ color: "#ff4d58", fontSize: 12, fontWeight: 900, marginBottom: 12, textAlign: "center", fontFamily: "'Courier New', Courier, monospace" }}>
                      {corruptError}
                    </div>
                  )}

                  {corruptSuccess && (
                    <div style={{ color: "#36e0c4", fontSize: 13, fontWeight: 900, marginBottom: 12, textAlign: "center", fontFamily: "'Courier New', Courier, monospace" }}>
                      ✓ CORRUPTION PURGED · RETURNING TO INVESTIGATION TRACK...
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSolveCorrupt}
                    disabled={!selectedCorruptOpt || corruptSuccess}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      background: selectedCorruptOpt ? "#ff2d3a" : "rgba(255, 45, 58, 0.3)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: 900,
                      fontFamily: "'Benguiat Bold', serif",
                      letterSpacing: ".12em",
                      cursor: selectedCorruptOpt ? "pointer" : "not-allowed",
                      boxShadow: selectedCorruptOpt ? "0 0 15px rgba(255, 45, 58, 0.6)" : "none",
                      textTransform: "uppercase",
                    }}
                  >
                    OVERRIDE CORRUPTION & RESUME TRACK
                  </button>
                </div>
              ) : (sabotage.kind === "LOCK" || sabotage.kind === "CORRUPT") && q ? (
                <>
                  <div className="term dim" style={{ marginBottom: 14 }}>
                    Solve the challenge to restore access.
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (q[1].test(val.trim())) clearSabotage();
                      else setVal("");
                    }}
                  >
                    <div className="term" style={{ marginBottom: 8 }}>
                      {q[0]}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input
                        className="field"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        autoFocus
                        placeholder="answer"
                      />
                      <button className="btn red sm" style={{ whiteSpace: "nowrap", flex: "0 0 auto" }}>
                        RESTORE
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sabotage && sabotage.kind !== "MESSAGE" && (hide || sabotage.kind === "WATCH") && (
        <div className="sab-banner">
          [ALERT]{" "}
          {sabotage.kind === "LOCK" && sabotage.pinIndex !== undefined
            ? `PIN ${sabotage.pinIndex + 1} LOCKED`
            : NAME[sabotage.kind]}
          {sabotage.operatorName ? ` [${sabotage.operatorName.toUpperCase()}]` : ""}{" "}
          · {mmss(left)}
        </div>
      )}
    </>
  );
}
