"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";

interface VecnaStoryDialogProps {
  trialId: number;
  trialTitle: string;
  trialShortName: string;
  onComplete: () => void;
}

const VECNA_LORE_LINES: Record<number, string[]> = {
  1: [
    "Hawkins is blind to the rot beneath its foundation.",
    "The Department of Energy opened the initial psychokinetic tear in November 1983, foolishly believing they could contain our power.",
    "Intercept their municipal transformer frequencies across Roane County. Correlate the telemetry pulses and begin our reckoning.",
  ],
  2: [
    "Chief Hopper sits in his smoky precinct, pinning frantic dispatch logs to the corkboard.",
    "The police radar and emergency calls converged on ground zero at 22:42.",
    "Triangulate the precinct vectors and bend the radio static to blind the deputies before they discover our presence.",
  ],
  3: [
    "Young Will Byers believes colored bulbs and alphabet wallpaper will keep him tethered to his home.",
    "He spells frantic warnings through the living room wall... but the electrical current belongs to the Mind Flayer now.",
    "Decode his scrambled letters, overwhelm the carrier signals, and smother his broadcast.",
  ],
  4: [
    "Deep within Hawkins Lab Sublevel 3, Dr. Brenner's mainframe router reached catastrophic parity overflow.",
    "Their automated routing algorithms are fragile, easily fractured by mental distortion.",
    "Trace the accumulator loop, overload their logic gates, and lock their scientists out of the terminal.",
  ],
  5: [
    "The ancient pines along Deep Woods Trail 7 bear the deep scars of our realm.",
    "The glowing carved glyphs guide our spores through the autumn fog toward the East Hill ridge.",
    "Extract the three glowing pine runes in sequence to lock our harmonic coordinates.",
  ],
  6: [
    "The emergency radiometer at the East Hill transmission tower resists our dimensional corruption.",
    "Five frequency pins emit harmonic shielding across the county.",
    "Overpower each channel, shatter the resonance, and decrypt their master security code.",
  ],
  7: [
    "The hour is at hand. The grandfather clock chimes four times.",
    "They sought to scrub Henry Creel... Experiment 001... from human history, but the Upside Down cannot be contained.",
    "Decode the final ROT13 cipher, shatter the Gate threshold, and claim eternal dominion over Hawkins.",
  ],
};

export default function VecnaStoryDialog({
  trialId,
  trialTitle,
  trialShortName,
  onComplete,
}: VecnaStoryDialogProps) {
  const lines = VECNA_LORE_LINES[trialId] || VECNA_LORE_LINES[1];
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = lines[lineIdx] || "";
  const isFinalLine = lineIdx === lines.length - 1;

  useEffect(() => {
    setLineIdx(0);
    setCharCount(0);
    setIsTyping(true);
  }, [trialId]);

  useEffect(() => {
    setCharCount(0);
    setIsTyping(true);
  }, [lineIdx]);

  useEffect(() => {
    if (!isTyping) return;
    if (charCount < currentLine.length) {
      const timer = setTimeout(() => {
        setCharCount((c) => c + 1);
        if (Math.random() > 0.5) sfx("type");
      }, 18);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [charCount, isTyping, currentLine]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
      setCharCount(currentLine.length);
      setIsTyping(false);
      sfx("type");
    } else {
      if (lineIdx < lines.length - 1) {
        setLineIdx((i) => i + 1);
        sfx("click");
      } else {
        sfx("boom");
        onComplete();
      }
    }
  }, [isTyping, lineIdx, lines.length, currentLine.length, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (e.key === "Escape") {
        sfx("click");
        onComplete();
      } else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAdvance, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "clamp(12px, 2vh, 24px)",
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      {/* ── 1. Fullscreen Dark Crimson Blur Backdrop ── */}
      <motion.div
        key="vecna-dialog-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={handleAdvance}
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "radial-gradient(circle at 50% 50%, rgba(25, 4, 8, 0.88) 0%, rgba(6, 1, 3, 0.96) 100%)",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      />

      {/* ── 2. Bottom Stage Row: Vecna Sprite on Left + Dialogue Box on Right ── */}
      <div
        style={{
          position: "relative",
          zIndex: 960,
          width: "min(1160px, 94vw)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: "clamp(14px, 2.5vw, 28px)",
          pointerEvents: "none",
        }}
      >
        {/* VECNA PIXEL SPRITE ON LEFT */}
        <motion.div
          key="vecna-character-sprite"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          onClick={handleAdvance}
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            pointerEvents: "auto",
            cursor: "pointer",
            filter: "drop-shadow(0 0 24px rgba(255, 45, 58, 0.85)) drop-shadow(0 14px 28px rgba(0,0,0,0.95))",
          }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <img
              src="/characters/vecna.png"
              alt="Vecna"
              style={{
                height: "clamp(160px, 26vh, 230px)",
                width: "auto",
                imageRendering: "pixelated",
                display: "block",
                objectFit: "contain",
              }}
            />
          </motion.div>
        </motion.div>

        {/* ── 3. RETRO DIALOGUE BOX ON RIGHT (MATCHING IMAGE 2 DESIGN) ── */}
        <motion.div
          key="vecna-dialog-box"
          initial={{ y: 30, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={handleAdvance}
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            background: "#0c0205",
            border: "3px solid #ff2d3a",
            borderRadius: 8,
            padding: "clamp(16px, 2.2vh, 22px) clamp(18px, 2.4vw, 26px)",
            boxShadow:
              "0 0 35px rgba(255, 45, 58, 0.45), 0 12px 35px rgba(0,0,0,0.95), inset 0 0 24px rgba(0,0,0,0.85)",
            boxSizing: "border-box",
            pointerEvents: "auto",
            cursor: "pointer",
            userSelect: "none",
            zIndex: 965,
          }}
        >
          {/* Name Plate Tab */}
          <div
            style={{
              position: "absolute",
              top: -16,
              left: "clamp(16px, 2.8vw, 26px)",
              background: "#ff2d3a",
              color: "#000000",
              fontWeight: 900,
              fontSize: "clamp(12px, 1.4vw, 14px)",
              fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
              letterSpacing: ".18em",
              padding: "3px 16px",
              borderRadius: "3px 3px 0 0",
              textTransform: "uppercase",
              boxShadow: "0 2px 10px rgba(255, 45, 58, 0.5)",
            }}
          >
            VECNA
          </div>

          {/* Top Meta Status Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              fontSize: 11,
              letterSpacing: ".16em",
              color: "rgba(255, 180, 180, 0.65)",
              fontFamily: '"Share Tech Mono", monospace',
              textTransform: "uppercase",
            }}
          >
            <span>
              MIND TRANSMISSION // HIVE FREQUENCY · [TRIAL {trialId}: {trialShortName}]
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx("click");
                  onComplete();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 180, 180, 0.5)",
                  fontSize: 10.5,
                  fontFamily: '"Share Tech Mono", monospace',
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                [ESC / SKIP]
              </button>
            </div>
          </div>

          {/* Main Typed Line */}
          <div
            style={{
              minHeight: 56,
              fontSize: "clamp(15px, 2vh, 18.5px)",
              lineHeight: 1.5,
              color: "#ffffff",
              fontFamily: '"Share Tech Mono", monospace',
              letterSpacing: ".04em",
              textShadow: "0 0 8px rgba(255, 45, 58, 0.4)",
            }}
          >
            {currentLine.slice(0, charCount)}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.35 }}
                style={{ color: "#ff2d3a", fontWeight: "bold", marginLeft: 2 }}
              >
                █
              </motion.span>
            )}
          </div>

          {/* Bottom Controls / Prompt Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid rgba(255, 45, 58, 0.2)",
              fontSize: 11,
              fontFamily: '"Share Tech Mono", monospace',
              letterSpacing: ".12em",
            }}
          >
            <div style={{ color: "rgba(255, 180, 180, 0.4)" }}>
              <span>PROMPT {lineIdx + 1} OF {lines.length}</span>
            </div>

            <div
              style={{
                color: "#ff5260",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: "bold",
              }}
            >
              {isFinalLine ? (
                <span style={{ color: "#81c784" }}>[ENTER CONSOLE ➔]</span>
              ) : (
                <span>[SPACE / CLICK TO ADVANCE ▶]</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
