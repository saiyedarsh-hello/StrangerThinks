"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/lib/store";
import { mmss } from "@/lib/results";
import { sfx } from "@/lib/audio";
import Glitch from "./Glitch";

const CORRUPT_QUESTIONS = [
  { id: 1, prompt: "Convert hexadecimal 0x2A to decimal:", placeholder: "e.g. 42" },
  { id: 2, prompt: "Evaluate bitwise logic (12 & 10) in decimal:", placeholder: "e.g. 8" },
  { id: 3, prompt: "What is the standard TCP port for HTTPS?", placeholder: "e.g. 443" },
  { id: 4, prompt: "Evaluate modulo arithmetic: 100 mod 7 =", placeholder: "e.g. 2" },
];

const QS: [string, RegExp][] = [
  ["Binary of 5?", /^101$/],
  ["7 × 8 = ?", /^56$/],
  ["Letters in VECNA?", /^5$/],
  ["Hex of 255 (2 chars)?", /^ff$/i],
  ["15 mod 4 = ?", /^3$/],
  ["Decimal of binary 1100?", /^12$/],
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
  const { s, sabotage, clearSabotage } = useGame();
  const [val, setVal] = useState("");
  const [hide, setHide] = useState(false);
  const [left, setLeft] = useState(0);

  // 4-question state for System Corrupted (80s technical challenge)
  const [corruptAnswers, setCorruptAnswers] = useState<Record<number, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
  });
  const [corruptFeedback, setCorruptFeedback] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setVal("");
    setHide(false);
    setCorruptAnswers({ 1: "", 2: "", 3: "", 4: "" });
    setCorruptFeedback(null);

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
    const i = setInterval(() => {
      const remaining = Math.max(0, Math.round((sabotage.until - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        clearSabotage();
      }
    }, 250);
    return () => clearInterval(i);
  }, [sabotage, clearSabotage]);

  const handleCorruptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    setCorruptFeedback(null);

    try {
      const res = await fetch("/api/vecna/challenge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: s.team?.id || "T01",
          answers: corruptAnswers,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data && data.allCorrect) {
        sfx("boom");
        clearSabotage();
      } else {
        sfx("err");
        setCorruptFeedback(
          data?.message ||
            `${data?.correctCount || 0}/4 verification codes accurate. Complete all 4 to unlock early.`
        );
      }
    } catch {
      // Local fallback evaluation
      let correct = 0;
      if (corruptAnswers[1].trim().toLowerCase() === "42") correct++;
      if (corruptAnswers[2].trim().toLowerCase() === "8") correct++;
      if (corruptAnswers[3].trim().toLowerCase() === "443") correct++;
      if (corruptAnswers[4].trim().toLowerCase() === "2") correct++;

      if (correct === 4) {
        sfx("boom");
        clearSabotage();
      } else {
        sfx("err");
        setCorruptFeedback(`${correct}/4 verification codes accurate. Complete all 4 to unlock.`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

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

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          1. Dedicated 4-Question Blocking Modal for SYSTEM CORRUPTED (80s limit)
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sabotage && sabotage.kind === "CORRUPT" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "rgba(10, 2, 4, 0.96)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "min(680px, 94vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#0d0205",
                border: "2px solid #ff2d3a",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 0 60px rgba(255, 45, 58, 0.6)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1.5px solid rgba(255, 45, 58, 0.4)",
                  paddingBottom: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#ff2d3a",
                      fontFamily: "var(--font-title)",
                      fontSize: "20px",
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                    }}
                  >
                    SYSTEM CORRUPTED · RECOVERY OVERRIDE
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 180, 180, 0.75)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    Solve all 4 technical challenge vectors or remain locked out until the 80s countdown finishes.
                  </div>
                </div>

                {/* 80s Timer Badge */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.8)",
                    border: "1.5px solid #ff2d3a",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    textAlign: "center",
                    minWidth: "90px",
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255, 180, 180, 0.6)",
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    LOCKOUT
                  </div>
                  <div
                    style={{
                      color: left <= 15 ? "#ff2d3a" : "#00ffcc",
                      fontSize: "18px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "bold",
                    }}
                  >
                    {mmss(left)}
                  </div>
                </div>
              </div>

              {corruptFeedback && (
                <div
                  style={{
                    background: "rgba(150, 20, 30, 0.6)",
                    border: "1px solid #ff4d58",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    color: "#ffcdd2",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    textAlign: "center",
                  }}
                >
                  {corruptFeedback}
                </div>
              )}

              {/* 4 Technical Questions Form */}
              <form onSubmit={handleCorruptSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {CORRUPT_QUESTIONS.map((qItem, idx) => (
                  <div
                    key={qItem.id}
                    style={{
                      background: "rgba(0, 0, 0, 0.6)",
                      border: "1px solid rgba(255, 45, 58, 0.25)",
                      padding: "10px 14px",
                      borderRadius: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <label
                      style={{
                        color: "#ffffff",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "bold",
                      }}
                    >
                      VECTOR {idx + 1}: {qItem.prompt}
                    </label>
                    <input
                      type="text"
                      value={corruptAnswers[qItem.id] || ""}
                      onChange={(e) =>
                        setCorruptAnswers((prev) => ({ ...prev, [qItem.id]: e.target.value }))
                      }
                      placeholder={qItem.placeholder}
                      style={{
                        background: "#120306",
                        border: "1px solid rgba(255, 45, 58, 0.4)",
                        borderRadius: "3px",
                        padding: "7px 10px",
                        color: "#00ffcc",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={isVerifying}
                  style={{
                    marginTop: "6px",
                    padding: "12px",
                    background: "#ff2d3a",
                    border: "none",
                    borderRadius: "3px",
                    color: "#000000",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: "bold",
                    letterSpacing: "0.15em",
                    cursor: isVerifying ? "wait" : "pointer",
                    boxShadow: "0 0 16px rgba(255, 45, 58, 0.6)",
                  }}
                >
                  {isVerifying ? "VERIFYING CRYPTOGRAPHIC OVERRIDES..." : "SUBMIT & RESTORE TERMINAL INTEGRITY"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────
          2. Restrained Lock Location Banner (120s stage advance restriction)
          ───────────────────────────────────────────────────────────────── */}
      {sabotage && sabotage.kind === "LOCK" && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(18, 2, 4, 0.95)",
            border: "1.5px solid #ff2d3a",
            borderRadius: "4px",
            padding: "10px 20px",
            boxShadow: "0 0 25px rgba(255, 45, 58, 0.7)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#ff2d3a",
              boxShadow: "0 0 10px #ff2d3a",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "12px", letterSpacing: "0.1em" }}>
              VECNA INTERFERENCE — LOCATION LOCKED
            </span>
            <span style={{ color: "rgba(255, 180, 180, 0.8)", fontSize: "10.5px" }}>
              Stage movement restricted · Stage advance available in{" "}
              <strong style={{ color: "#ff2d3a" }}>{mmss(left)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          3. Generic Overlays for Other Minor Sabotages
          ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {overlay && sabotage.kind !== "MESSAGE" && sabotage.kind !== "CORRUPT" && sabotage.kind !== "LOCK" && (
          <motion.div className="sab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="sab-box" style={{ maxWidth: 620 }}>
              <div className="term" style={{ color: "var(--danger)", fontSize: 24, letterSpacing: ".3em" }}>
                [ALERT] SYSTEM COMPROMISED
              </div>

              <h2 className="title-xl" style={{ fontSize: 44, margin: "14px 0", color: "#ff2d3a" }}>
                <Glitch text={sabotage.message || "VECNA HAS FOUND YOU."} hard />
              </h2>

              <div className="eyebrow" style={{ marginBottom: 18 }}>
                {NAME[sabotage.kind]}
                {sabotage.operatorName && (
                  <span className="dim" style={{ marginLeft: 8 }}>
                    · DISPATCHED BY {sabotage.operatorName.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sabotage &&
        sabotage.kind !== "MESSAGE" &&
        sabotage.kind !== "LOCK" &&
        sabotage.kind !== "CORRUPT" &&
        (hide || sabotage.kind === "WATCH") && (
          <div className="sab-banner">
            [ALERT] {NAME[sabotage.kind]}
            {sabotage.operatorName ? ` [${sabotage.operatorName.toUpperCase()}]` : ""} · {mmss(left)}
          </div>
        )}
    </>
  );
}
