"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import CinematicBackground from "../CinematicBackground";
import Radiometer from "../Radiometer";
import { validateChapterOnServer } from "@/lib/api";
import { getCharacterForChapter, CHARACTERS } from "@/lib/characters";

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface ChapterDef {
  id: ChapterId;
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  completionLoreTitle: string;
  completionLoreText: string;
  completionLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    label: "CHAPTER 1",
    tag: "TOWN TELEMETRY",
    archiveSector: "CIVIC DISTRICT",
    archiveTitle: "HAWKINS TOWN",
    archiveSubtitle: "1986 · EMERGENCY TELEMETRY PULSE",
    archiveLines: [
      "The town sleeps under a low autumn mist.",
      "Public utility transmitters are broadcasting anomalous pulses across Roane County.",
      "Verify your classified security clearance to access the emergency telemetry network.",
    ],
    completionLoreTitle: "SECURITY CLEARANCE VERIFIED · RECORDS DECRYPTED",
    completionLoreText:
      "Project MKUltra records confirmed: psychic trials breached the dimensional veil beneath Hawkins Lab. Officer Callahan directs your team to Chief Hopper's evidence dossier.",
    completionLines: [
      "CLEARANCE CONFIRMED. Access granted to municipal dispatch telemetry.",
      "Project MKUltra records confirm psychic trials breached the dimensional veil in November 1983.",
      "Proceed to the Hawkins Police Department to examine Chief Hopper's incident board.",
    ],
    bgSrc: "/hawkins-town-bg.jpg",
    taskId: "ch1-quiz",
    points: 100,
  },
  {
    id: 2,
    label: "CHAPTER 2",
    tag: "PRECINCT DOSSIER",
    archiveSector: "POLICE DEPT",
    archiveTitle: "POLIC STATION",
    archiveSubtitle: "CHIEF'S DESK EVIDENCE DOSSIER",
    archiveLines: [
      "Chief Hopper's office, Hawkins Police Department.",
      "Eyewitness reports, dispatch audio logs, and sensor telemetry have been recovered.",
      "Correlate the timestamps and radio recordings to identify the epicenter of the breach.",
    ],
    completionLoreTitle: "ANOMALY EPICENTER CONFIRMED",
    completionLoreText:
      "All field reports and sensor vectors converge directly on Hawkins National Laboratory Sublevel 4. But first, urgent dispatches report lights communicating at the Byers residence.",
    completionLines: [
      "ANOMALY EPICENTER CONFIRMED · GROUND ZERO IDENTIFIED.",
      "All telemetry vectors and field reports converge on Hawkins National Laboratory Sublevel 4.",
      "Investigate the Byers residence where lights have begun communicating through the walls.",
    ],
    bgSrc: "/hawkins-police-bg.jpg",
    taskId: "ch2-police",
    points: 150,
  },
  {
    id: 3,
    label: "CHAPTER 3",
    tag: "CHRISTMAS LIGHTS",
    archiveSector: "MIRKWOOD",
    archiveTitle: "BYERS HOUSE",
    archiveSubtitle: "WALL COMMUNICATIONS & SCRAMBLED NOTES",
    archiveLines: [
      "The Byers house stands isolated along the edge of Mirkwood.",
      "Tangled strings of Christmas lights are illuminated on the living room wallpaper without any power connection.",
      "Scrambled message fragments are strewn across the table. Reconstruct Will's urgent warning.",
    ],
    completionLoreTitle: "WILL'S WARNING DECODED · 'DO NOT OPEN THE GATE'",
    completionLoreText:
      "The message is assembled: 'DO NOT OPEN THE GATE'. The lights flicker violently toward Hawkins National Laboratory. The Sublevel 3 mainframe has suffered telemetry parity overflow.",
    completionLines: [
      "WILL'S WARNING RESTORED: 'DO NOT OPEN THE GATE'.",
      "Electromagnetic surge tracks directly toward the government facility.",
      "Sublevel 3 mainframe has suffered telemetry parity overflow. Stabilize the routine.",
    ],
    bgSrc: "/hawkins-bg.jpg",
    taskId: "ch3-byers",
    points: 150,
  },
  {
    id: 4,
    label: "CHAPTER 4",
    tag: "MAINFRAME ROUTINE",
    archiveSector: "GRID MAINFRAME",
    archiveTitle: "HAWKINS LAB",
    archiveSubtitle: "TELEMETRY BUFFER OVERFLOW & LOGIC",
    archiveLines: [
      "Hawkins National Laboratory. Sublevel 3 automated relay terminal accessed.",
      "The telemetry packet router crashed due to an unhandled parity logic routine.",
      "Inspect the routine, trace the data loop, and enter the output integer to restore transmission.",
    ],
    completionLoreTitle: "MAINFRAME TELEMETRY BUFFER RESTORED",
    completionLoreText:
      "Parity logic routine stabilized! Intercepted Department of Energy logs reveal anomalous coordinates carved into ancient pine trees along Deep Woods Trail 7.",
    completionLines: [
      "TELEMETRY BUFFER RESTORED · ROUTINE EXECUTION SUCCESSFUL.",
      "Sublevel 3 parity routine stabilized. Grid telemetry active.",
      "Follow the signal vector into the deep forest to find the carved trail markers.",
    ],
    bgSrc: "/hawkins-lab-bg.jpg",
    taskId: "ch4-lab",
    points: 200,
  },
  {
    id: 5,
    label: "CHAPTER 5",
    tag: "CARVED RUNES",
    archiveSector: "ROANE COUNTY WOODS",
    archiveTitle: "FOREST",
    archiveSubtitle: "DEEP WOODS · TRAIL 7 COORDINATE RUNES",
    archiveLines: [
      "Deep woods near Trail 7. Autumn fog hangs thick among towering pines.",
      "Flashlight beams reveal strange geometric runes carved into ancient tree trunks.",
      "Extract the three glowing pine digits left-to-right to lock the vector coordinates.",
    ],
    completionLoreTitle: "FOREST COORDINATES LOCKED · VECTOR 4-1-7",
    completionLoreText:
      "Trail coordinates 4 · 1 · 7 verified! The harmonic vector points directly to the high-altitude East Hill Radio Tower. Pip is waiting on frequency 14.3 MHz.",
    completionLines: [
      "FOREST RUNES DECODED: VECTOR 4 · 1 · 7.",
      "Coordinates align with East Hill Radio Tower sublevel.",
      "Ascend to the Radio Tower to calibrate the scrambled 5-pin radiometer.",
    ],
    bgSrc: "/creel-bg.jpg",
    taskId: "ch5-forest",
    points: 200,
  },
  {
    id: 6,
    label: "CHAPTER 6",
    tag: "5-PIN RADIOMETER",
    archiveSector: "EAST HILL",
    archiveTitle: "RADIO TOWER",
    archiveSubtitle: "HARMONIC OSCILLATION & LAB CIPHER",
    archiveLines: [
      "East Hill Radio Tower sublevel accessed.",
      "The tower's emergency radiometer is scrambled by dimensional static.",
      "Calibrate the carrier frequencies, align the waveform, and restore all 5 pins with Pip.",
    ],
    completionLoreTitle: "RADIOMETER CALIBRATED · MASTER CIPHER RECOVERED",
    completionLoreText:
      "All 5 pins locked into harmonic resonance! The master security code 8-3-4-7-9 has been recovered, unlocking the Gate rift leading into the Upside Down.",
    completionLines: [
      "ALL 5 PINS RESTORED. Master code 8-3-4-7-9 decoded.",
      "Dimensional rift threshold stabilized across Roane County.",
      "The threshold into the Upside Down is open. Prepare for Vecna.",
    ],
    bgSrc: "/hawkins-gate-bg.jpg",
    taskId: "ch6-radio-tower",
    points: 300,
  },
  {
    id: 7,
    label: "CHAPTER 7",
    tag: "THE GATE RIFT",
    archiveSector: "PARALLEL ABYSS",
    archiveTitle: "UPSIDE DOWN",
    archiveSubtitle: "THE GATEWAY RIFT & VECNA'S MIND",
    archiveLines: [
      "The dimensional boundary has collapsed. Spores drift through crimson skies.",
      "The ticking grandfather clock echoes across corrupted Hawkins.",
      "Decode Experiment 001's scrubbed identity to sever Vecna's psychic hold on Hawkins.",
    ],
    completionLoreTitle: "HAWKINS PROTOCOL COMPLETE · THE GATE SEALED",
    completionLoreText:
      "Henry Creel's identity confirmed! The psychic feedback loop fractures Vecna's link. The dimensional gate seals shut. Hawkins is saved.",
    completionLines: [
      "HENRY CREEL IDENTIFIED. Subject 001 psychic link severed.",
      "The Gate is sealed. Grandfather clock silenced.",
      "CONGRATULATIONS, RECON TEAM · TOURNAMENT VICTORY!",
    ],
    bgSrc: "/upsidedown-bg.jpg",
    taskId: "ch7-upsidedown",
    points: 500,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Pokemon FireRed Style Bottom Dialogue Box with Character Sprite
   ───────────────────────────────────────────────────────────────────────────── */
const CHAPTER_HINTS: Record<number, string> = {
  1: "Callahan logged unusual psychokinetic activity near Sublevel 4 under Project MKUltra.",
  2: "All field vectors and radio recordings converge directly on Hawkins Lab.",
  3: "Rearrange Will's wall message: 'DO NOT OPEN THE GATE'.",
  4: "Trace the parity routine: evens double (* 2), odds add 1 (+ 1). Sum them up.",
  5: "Extract the glowing red pine runes left-to-right to find vector 4-1-7.",
  6: "Tune frequencies and calibrate all 5 pins on the tower radiometer!",
  7: "Apply the ROT13 cipher decryption on 'URAEL PERRY' to reveal Experiment 001's name.",
};

function PokemonFireRedBottomDialog({
  chapter,
  mode = "intro",
  onComplete,
  onNextEpisode,
}: {
  chapter: ChapterDef;
  mode?: "intro" | "completion";
  onComplete: () => void;
  onNextEpisode?: () => void;
}) {
  const character = getCharacterForChapter(chapter.id);
  const themeCol = character.themeColor || "#ff2d3a";

  const initialLines = mode === "completion" ? chapter.completionLines : chapter.archiveLines;
  const [lines, setLines] = useState<string[]>(initialLines);
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = lines[lineIdx] || "";

  useEffect(() => {
    const fresh = mode === "completion" ? chapter.completionLines : chapter.archiveLines;
    setLines(fresh);
    setLineIdx(0);
    setCharCount(0);
    setIsTyping(true);
  }, [chapter.id, mode]);

  useEffect(() => {
    setCharCount(0);
    setIsTyping(true);
  }, [lineIdx]);

  useEffect(() => {
    if (!isTyping) return;
    if (charCount < currentLine.length) {
      const timer = setTimeout(() => {
        setCharCount((c) => c + 1);
        if (Math.random() > 0.45) sfx("type");
      }, 20);
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
        if (mode === "completion" && onNextEpisode) {
          sfx("ok");
          onNextEpisode();
        } else {
          sfx("ok");
          onComplete();
        }
      }
    }
  }, [isTyping, lineIdx, lines.length, currentLine.length, mode, onNextEpisode, onComplete]);

  const handleAskHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx("clue");
    const hintText = `${character.nameTag || character.name.toUpperCase()} INTEL: "${CHAPTER_HINTS[chapter.id] || "Investigate the facility telemetry carefully."}"`;
    setLines((prev) => [...prev, hintText]);
    setLineIdx((prev) => prev + 1);
    setCharCount(0);
    setIsTyping(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (e.key === "Escape") {
        onComplete();
      } else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAdvance, onComplete]);

  const isFinalLine = lineIdx === lines.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "clamp(10px, 1.8vh, 20px)",
        boxSizing: "border-box",
      }}
    >
      {/* ── 1. FULLSCREEN BLUR BACKDROP ── */}
      <motion.div
        key="lore-blur-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleAdvance}
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(4, 2, 6, 0.85)",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      />

      {/* ── 2. CHARACTER SPRITE + RETRO DIALOGUE STRIP ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 10,
          pointerEvents: "none",
          width: "min(1180px, 96vw)",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          gap: "clamp(10px, 1.8vw, 22px)",
          padding: "0 clamp(6px, 1.2vw, 16px)",
          boxSizing: "border-box",
        }}
      >
        {/* CHARACTER SPRITE ANCHORED AT BOTTOM-LEFT */}
        <div
          onClick={handleAdvance}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            lineHeight: 0,
            pointerEvents: "auto",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {character.sprite ? (
            <motion.img
              src={character.sprite}
              alt={character.name}
              style={{
                height: "clamp(120px, 22vh, 210px)",
                width: "auto",
                display: "block",
                objectFit: "contain",
                objectPosition: "bottom left",
                marginBottom: 0,
                verticalAlign: "bottom",
                imageRendering: "pixelated",
                filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.95))",
              }}
            />
          ) : (
            <motion.div
              style={{
                height: "clamp(120px, 22vh, 210px)",
                width: "clamp(75px, 14vh, 130px)",
                color: themeCol,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                marginBottom: 0,
                lineHeight: 0,
                filter: `drop-shadow(0 0 16px ${themeCol}44)`,
                background: "radial-gradient(ellipse at bottom, rgba(0,0,0,0.5) 0%, transparent 70%)",
              }}
              dangerouslySetInnerHTML={{
                __html:
                  character.silhouetteSvg ||
                  `<svg viewBox="0 0 32 48" fill="currentColor" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
                    <rect x="10" y="6" width="12" height="12" />
                    <rect x="8" y="18" width="16" height="16" />
                    <rect x="6" y="20" width="2" height="10" />
                    <rect x="24" y="20" width="2" height="10" />
                    <rect x="9" y="34" width="6" height="14" />
                    <rect x="17" y="34" width="6" height="14" />
                  </svg>`,
              }}
            />
          )}
        </div>

        {/* RETRO DIALOGUE BOX (RIGHT OF SPRITE) */}
        <div
          onClick={handleAdvance}
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            pointerEvents: "auto",
            cursor: "pointer",
            background: "linear-gradient(180deg, rgba(14, 5, 9, 0.97) 0%, rgba(6, 2, 4, 0.99) 100%)",
            border: `3px double ${themeCol}`,
            borderRadius: 6,
            boxShadow: `0 8px 30px rgba(0, 0, 0, 0.95), inset 0 0 16px rgba(0, 0, 0, 0.8), 0 0 12px ${themeCol}28`,
            padding: "clamp(12px, 1.6vh, 18px) clamp(16px, 2vw, 24px)",
            boxSizing: "border-box",
            userSelect: "none",
          }}
        >
          {/* Character Name Tag Tab on Top-Left Edge */}
          <div
            style={{
              position: "absolute",
              top: -14,
              left: 14,
              background: themeCol,
              color: "#000000",
              fontFamily: "var(--font-term), 'VT323', monospace",
              fontWeight: "bold",
              fontSize: "clamp(13px, 1.6vh, 16px)",
              letterSpacing: ".15em",
              padding: "2px 12px",
              borderRadius: "4px 4px 0 0",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              borderBottom: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{character.nameTag || character.name.toUpperCase()}</span>
          </div>

          {/* Top-Right Status & Controls */}
          <div
            style={{
              position: "absolute",
              top: -12,
              right: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              className="term dim"
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: isTyping ? "#36e0c4" : "rgba(255,255,255,0.4)",
                letterSpacing: ".1em",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(0,0,0,0.85)",
                padding: "2px 7px",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isTyping ? "#36e0c4" : "#888",
                  animation: isTyping ? "flicker 0.4s infinite" : "none",
                }}
              />
              {isTyping ? "TRANSMITTING" : "READY"}
            </span>

            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "rgba(255,255,255,0.55)",
                background: "rgba(0,0,0,0.85)",
                padding: "2px 7px",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              LOG {lineIdx + 1} / {lines.length}
            </span>

            <button
              type="button"
              onClick={handleAskHint}
              className="btn sm ghost"
              style={{
                fontSize: 10,
                padding: "2px 8px",
                letterSpacing: ".1em",
                borderColor: `${themeCol}88`,
                color: themeCol,
                background: "rgba(0,0,0,0.85)",
                borderRadius: 3,
                cursor: "pointer",
              }}
              title="Request character Intel"
            >
              💡 INTEL
            </button>

            {mode === "completion" && onNextEpisode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx("ok");
                  onNextEpisode();
                }}
                style={{
                  fontSize: 11,
                  padding: "2px 10px",
                  letterSpacing: ".12em",
                  borderRadius: 3,
                  border: `1px solid ${themeCol}`,
                  background: themeCol,
                  color: "#000000",
                  fontWeight: "bold",
                  fontFamily: "var(--font-term)",
                  cursor: "pointer",
                }}
              >
                NEXT EPISODE →
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sfx("click");
                onComplete();
              }}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                letterSpacing: ".1em",
                borderColor: "rgba(255, 255, 255, 0.3)",
                color: "rgba(255, 255, 255, 0.7)",
                background: "rgba(0,0,0,0.85)",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}
              title="Close and begin challenge"
            >
              [ESC / SKIP]
            </button>
          </div>

          {/* Subtitle / Archive Sector Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: `1px solid ${themeCol}33`,
              paddingBottom: 6,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                color: themeCol,
                fontFamily: "var(--font-term)",
                fontWeight: "bold",
              }}
            >
              {mode === "completion"
                ? `EPILOGUE LORE ARCHIVE · ${chapter.archiveSector}`
                : `ARCHIVE TRANSMISSION · ${chapter.archiveSector} · ${character.title}`}
            </span>
          </div>

          {/* Dialogue Text */}
          <div
            className="character-dialogue-text"
            style={{
              fontFamily: "var(--font-term), 'VT323', monospace",
              fontSize: "clamp(18px, 2.3vh, 24px)",
              lineHeight: 1.42,
              color: "#ffffff",
              letterSpacing: ".04em",
              wordBreak: "break-word",
              minHeight: "clamp(38px, 4.8vh, 54px)",
              paddingRight: 80,
            }}
          >
            <span>{currentLine.slice(0, charCount)}</span>
            {isTyping && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 16,
                  background: themeCol,
                  marginLeft: 4,
                  verticalAlign: "middle",
                  animation: "flicker 0.4s infinite",
                }}
              />
            )}
          </div>

          {/* Bottom-Right Skip / Advance Info */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-term)",
                color: "rgba(255, 255, 255, 0.45)",
                letterSpacing: ".1em",
              }}
            >
              {isTyping ? "[CLICK / SPACE TO SKIP]" : isFinalLine ? "[CLICK / SPACE TO BEGIN]" : "[SPACE / CLICK]"}
            </span>

            {!isTyping && (
              <motion.div
                animate={{
                  opacity: [1, 0.2, 1],
                  y: [0, 2, 0],
                }}
                transition={{ repeat: Infinity, duration: 0.65, ease: "easeInOut" }}
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: `8px solid ${themeCol}`,
                }}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Chapter Completion View
   ───────────────────────────────────────────────────────────────────────────── */
function ChapterCompletionView({
  chapter,
  onNextEpisode,
  isLastEpisode,
  onViewDossier,
}: {
  chapter: ChapterDef;
  onNextEpisode: () => void;
  isLastEpisode?: boolean;
  onViewDossier: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "42px 46px",
        background: "linear-gradient(180deg, #0d0306 0%, #050103 100%)",
        color: "#ffffff",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 45, 58, 0.3)",
          paddingBottom: 16,
          marginBottom: 26,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#ff2d3a",
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontFamily: "var(--font-term)",
              letterSpacing: ".22em",
              color: "#ff2d3a",
              fontWeight: "bold",
            }}
          >
            CHAPTER {chapter.id} COMPLETED
          </span>
        </div>

        <span
          style={{
            background: "#ff2d3a",
            color: "#000000",
            fontWeight: "bold",
            fontSize: 13,
            padding: "4px 12px",
            borderRadius: 3,
            fontFamily: "var(--font-mono)",
            letterSpacing: ".15em",
          }}
        >
          +{chapter.points} PTS
        </span>
      </div>

      <div
        style={{
          background: "#080204",
          border: "2px solid #ff2d3a",
          borderRadius: 4,
          padding: "26px 28px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            fontFamily: "var(--font-term)",
            letterSpacing: ".2em",
            color: "#ff2d3a",
            fontWeight: "bold",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {chapter.completionLoreTitle}
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(16px, 2.1vw, 18.5px)",
            lineHeight: 1.65,
            color: "#ffffff",
            margin: 0,
            letterSpacing: ".02em",
          }}
        >
          {chapter.completionLoreText}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        {!isLastEpisode ? (
          <button
            type="button"
            onClick={() => {
              sfx("ok");
              onNextEpisode();
            }}
            style={{
              background: "#ff2d3a",
              color: "#000000",
              fontWeight: 900,
              fontSize: 17,
              letterSpacing: ".18em",
              padding: "14px 40px",
              border: "2px solid #ff2d3a",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "var(--font-term)",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            NEXT EPISODE →
          </button>
        ) : (
          <div
            style={{
              padding: "12px 22px",
              border: "1px dashed #ff2d3a",
              background: "rgba(255, 45, 58, 0.15)",
              color: "#ff2d3a",
              fontSize: 15,
              letterSpacing: ".15em",
              fontFamily: "var(--font-term)",
              borderRadius: 4,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ★ TOURNAMENT CAMPAIGN COMPLETE · HAWKINS PROTOCOL CONQUERED ★
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            sfx("click");
            onViewDossier();
          }}
          style={{
            background: "#050103",
            color: "#ffffff",
            fontSize: 14,
            letterSpacing: ".14em",
            padding: "13px 26px",
            border: "1px solid rgba(255, 45, 58, 0.5)",
            borderRadius: 4,
            cursor: "pointer",
            fontFamily: "var(--font-term)",
            textTransform: "uppercase",
            transition: "all 0.15s ease",
          }}
        >
          [VIEW ALL CHAPTERS]
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Chapter Manager
   ───────────────────────────────────────────────────────────────────────────── */
export default function ChapterManager() {
  const {
    s,
    submitTask,
    activeChapterId,
    setActiveChapterId,
    chapterModalOpen,
    setChapterModalOpen,
    radiometerPinCount,
  } = useGame();

  // Solved states for all 7 chapters
  const ch1Solved = !!s.completedTasks?.includes("ch1-quiz") || !!s.solved?.["ch1-quiz"];
  const ch2Solved = !!s.completedTasks?.includes("ch2-police") || !!s.solved?.["ch2-police"] || !!s.completedTasks?.includes("ch3-case-study");
  const ch3Solved = !!s.completedTasks?.includes("ch3-byers") || !!s.solved?.["ch3-byers"];
  const ch4Solved = !!s.completedTasks?.includes("ch4-lab") || !!s.solved?.["ch4-lab"] || !!s.completedTasks?.includes("ch2-coding");
  const ch5Solved = !!s.completedTasks?.includes("ch5-forest") || !!s.solved?.["ch5-forest"] || !!s.completedTasks?.includes("forest-marks");
  const ch6Solved = radiometerPinCount === 5 || s.radiometer.codeSolved;
  const ch7Solved = !!s.completedTasks?.includes("ch7-upsidedown") || !!s.solved?.["ch7-upsidedown"];

  // Active lore briefing state: triggers at start of every chapter and section
  const [activeLoreChapterId, setActiveLoreChapterId] = useState<number | null>(activeChapterId);

  // Automatically trigger the lore briefing & character on every chapter switch!
  useEffect(() => {
    setActiveLoreChapterId(activeChapterId);
  }, [activeChapterId]);

  const [completionStoryChapterId, setCompletionStoryChapterId] = useState<number | null>(null);
  const isLoreActive = activeLoreChapterId !== null || completionStoryChapterId !== null;

  // All chapters unlocked for organizer and tester access
  const isChapterUnlocked = useCallback((id: ChapterId) => {
    return true;
  }, []);

  // Check URL query parameters (e.g. ?chapter=6) to directly open requested chapter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const chParam = parseInt(p.get("chapter") || "", 10);
      if ([1, 2, 3, 4, 5, 6, 7].includes(chParam)) {
        setActiveChapterId(chParam as ChapterId);
      }
    }
  }, [setActiveChapterId]);

  const currentChapter = CHAPTERS.find((c) => c.id === activeChapterId) || CHAPTERS[0];

  // ── CHAPTER 1: QUIZ STATE ──
  const [q1Selected, setQ1Selected] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hawkins_q1_selected") || null;
    }
    return null;
  });
  const [q1Error, setQ1Error] = useState(false);

  useEffect(() => {
    if (q1Selected) {
      localStorage.setItem("hawkins_q1_selected", q1Selected);
    }
  }, [q1Selected]);

  const Q1_OPTIONS = [
    { id: "A", text: "Project MKUltra / Sublevel 04" },
    { id: "B", text: "Operation Paperclip / Echo Division" },
    { id: "C", text: "Stargate Surveillance Protocol" },
    { id: "D", text: "Project Blue Book Sub-Archive" },
  ];

  const handleQ1Submit = async () => {
    if (!q1Selected || ch1Solved) return;
    const opt = Q1_OPTIONS.find((o) => o.id === q1Selected);
    const res = await validateChapterOnServer(1, "ch1-quiz", q1Selected);
    if (res.success) {
      sfx("ok");
      setQ1Error(false);
      submitTask("ch1-quiz", res.pointsAwarded || 100, opt?.text || q1Selected);
      setCompletionStoryChapterId(1);
    } else {
      sfx("err");
      setQ1Error(true);
      setTimeout(() => setQ1Error(false), 900);
    }
  };

  // ── CHAPTER 2: POLICE STATION EVIDENCE DOSSIER STATE ──
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<number>(0);
  const [caseSelected, setCaseSelected] = useState<string | null>(null);
  const [caseError, setCaseError] = useState(false);

  const EVIDENCE_LOGS = [
    {
      title: "DISPATCH LOG 22:42",
      badge: "AUDIO TRANSCRIPT",
      time: "22:42:15",
      content:
        "Deputies report high-voltage transformers blew along North Elm. An anomalous 3.5 GHz harmonic wave was detected traveling northeast toward the Department of Energy perimeter line.",
    },
    {
      title: "WITNESS 22:58",
      badge: "BENNY'S DINER",
      time: "22:58:00",
      content:
        "Individual in hospital gown spotted fleeing south from woods bordering the government facility. Witness reported lights flickered violently when subject walked near electrical lines.",
    },
    {
      title: "RF SENSOR 23:15",
      badge: "EAST HILL REPEATER",
      time: "23:15:30",
      content:
        "Electromagnetic radiation spike registered at 14.8 MHz. Triangulated vector points directly at Hawkins National Laboratory Sublevel 4 Containment Zone.",
    },
  ];

  const CASE_OPTIONS = [
    { id: "A", text: "Hawkins National Laboratory (Sublevel 4)" },
    { id: "B", text: "Cornwallis Municipal Substation" },
    { id: "C", text: "Roane County Water Tower Reservoir" },
    { id: "D", text: "Sattler Quarry Abandoned Basin" },
  ];

  const handleCaseSubmit = async () => {
    if (!caseSelected || ch2Solved) return;
    const opt = CASE_OPTIONS.find((o) => o.id === caseSelected);
    const res = await validateChapterOnServer(2, "ch2-police", caseSelected);
    if (res.success) {
      sfx("ok");
      setCaseError(false);
      submitTask("ch2-police", res.pointsAwarded || 150, opt?.text || caseSelected);
      setCompletionStoryChapterId(2);
    } else {
      sfx("err");
      setCaseError(true);
      setTimeout(() => setCaseError(false), 900);
    }
  };

  // ── CHAPTER 3: BYERS HOUSE TILE REARRANGE STATE ──
  const [byersTiles, setByersTiles] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hawkins_byers_tiles");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return ["THE", "OPEN", "GATE", "NOT", "DO"];
  });
  const [selectedTileIdx, setSelectedTileIdx] = useState<number | null>(null);

  const swapByersTiles = async (idx1: number, idx2: number) => {
    const next = [...byersTiles];
    const temp = next[idx1];
    next[idx1] = next[idx2];
    next[idx2] = temp;
    setByersTiles(next);
    localStorage.setItem("hawkins_byers_tiles", JSON.stringify(next));

    const res = await validateChapterOnServer(3, "ch3-byers", next);
    if (res.success) {
      sfx("ok");
      submitTask("ch3-byers", res.pointsAwarded || 150, next.join(" "));
      setCompletionStoryChapterId(3);
    } else {
      sfx("click");
    }
    setSelectedTileIdx(null);
  };

  // ── CHAPTER 4: HAWKINS LAB CODING LOGIC STATE ──
  const [codeAnswer, setCodeAnswer] = useState<string>("");
  const [codeError, setCodeError] = useState(false);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeAnswer.trim() || ch4Solved) return;
    const res = await validateChapterOnServer(4, "ch4-lab", codeAnswer.trim());
    if (res.success) {
      sfx("ok");
      setCodeError(false);
      submitTask("ch4-lab", res.pointsAwarded || 200, codeAnswer.trim());
      setCompletionStoryChapterId(4);
    } else {
      sfx("err");
      setCodeError(true);
      setTimeout(() => setCodeError(false), 900);
    }
  };

  // ── CHAPTER 5: FOREST CARVED RUNES STATE ──
  const [forestRuneInput, setForestRuneInput] = useState<string>("");
  const [forestError, setForestError] = useState(false);

  const handleForestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forestRuneInput.trim() || ch5Solved) return;
    const res = await validateChapterOnServer(5, "ch5-forest", forestRuneInput.trim());
    if (res.success) {
      sfx("ok");
      setForestError(false);
      submitTask("ch5-forest", res.pointsAwarded || 200, forestRuneInput.trim());
      setCompletionStoryChapterId(5);
    } else {
      sfx("err");
      setForestError(true);
      setTimeout(() => setForestError(false), 900);
    }
  };

  // ── CHAPTER 7: UPSIDE DOWN EXPERIMENT 001 STATE ──
  const [udSelected, setUdSelected] = useState<string | null>(null);
  const [udError, setUdError] = useState(false);

  const UD_OPTIONS = [
    { id: "A", text: "Dr. Martin Brenner" },
    { id: "B", text: "Henry Creel (Subject 001)" },
    { id: "C", text: "Edward Munson" },
    { id: "D", text: "Peter Ballard" },
  ];

  const handleUdSubmit = async () => {
    if (!udSelected || ch7Solved) return;
    const opt = UD_OPTIONS.find((o) => o.id === udSelected);
    const res = await validateChapterOnServer(7, "ch7-upsidedown", udSelected);
    if (res.success) {
      sfx("boom");
      setUdError(false);
      submitTask("ch7-upsidedown", res.pointsAwarded || 500, opt?.text || udSelected);
      setCompletionStoryChapterId(7);
    } else {
      sfx("err");
      setUdError(true);
      setTimeout(() => setUdError(false), 900);
    }
  };

  return (
    <div
      className="screen"
      style={{
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 84,
        paddingBottom: 24,
        paddingLeft: "clamp(12px, 2.5vw, 32px)",
        paddingRight: "clamp(12px, 2.5vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      <CinematicBackground
        key={`bg-${currentChapter.id}`}
        src={currentChapter.bgSrc}
        particles="spores"
        vignette="heavy"
        overlayOpacity={0.65}
      />

      {/* Pokemon FireRed Style Bottom Overlay Dialog (On bottom overlay on question) */}
      {/* Pokemon FireRed Style Bottom Overlay Dialog with Character */}
      <AnimatePresence>
        {activeLoreChapterId !== null && (
          <PokemonFireRedBottomDialog
            key={`dialog-${activeLoreChapterId}`}
            chapter={CHAPTERS.find((c) => c.id === activeLoreChapterId) || currentChapter}
            mode="intro"
            onComplete={() => {
              setActiveLoreChapterId(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Completion Epilogue Dialogue */}
      <AnimatePresence>
        {completionStoryChapterId !== null && (
          <PokemonFireRedBottomDialog
            key={`completion-dialog-${completionStoryChapterId}`}
            chapter={CHAPTERS.find((c) => c.id === completionStoryChapterId) || CHAPTERS[0]}
            mode="completion"
            onComplete={() => setCompletionStoryChapterId(null)}
            onNextEpisode={
              completionStoryChapterId < 7
                ? () => {
                    const nextId = (completionStoryChapterId + 1) as ChapterId;
                    setCompletionStoryChapterId(null);
                    setActiveChapterId(nextId);
                  }
                : () => {
                    setCompletionStoryChapterId(null);
                    setChapterModalOpen(true);
                  }
            }
          />
        )}
      </AnimatePresence>

      {/* Chapters Gallery Modal */}
      <AnimatePresence>
        {chapterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(3, 1, 4, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setChapterModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              style={{
                width: "min(1200px, 96vw)",
                maxHeight: "88vh",
                overflowY: "auto",
                background: "linear-gradient(180deg, #100508 0%, #060103 100%)",
                border: "2px solid #ff2d3a",
                borderRadius: 8,
                padding: "28px 32px",
                boxShadow: "0 0 50px rgba(0, 0, 0, 0.95)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255, 45, 58, 0.3)",
                  paddingBottom: 16,
                  marginBottom: 24,
                }}
              >
                <div>
                  <h3
                    className="title-xl"
                    style={{
                      fontSize: "clamp(20px, 3.2vw, 30px)",
                      color: "#fff",
                      letterSpacing: ".08em",
                      margin: 0,
                    }}
                  >
                    HAWKINS PROTOCOL : CHAPTER DOSSIER
                  </h3>
                  <div
                    className="term dim"
                    style={{
                      fontSize: 12,
                      letterSpacing: ".15em",
                      color: "var(--accent)",
                      marginTop: 4,
                    }}
                  >
                    SELECT ANY UNLOCKED SECTOR TO INVESTIGATE (7 CHAPTERS)
                  </div>
                </div>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setChapterModalOpen(false)}
                  style={{
                    fontSize: 13,
                    padding: "6px 14px",
                    letterSpacing: ".12em",
                  }}
                >
                  [CLOSE]
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 18,
                }}
              >
                {CHAPTERS.map((ch) => {
                  const unlocked = isChapterUnlocked(ch.id);
                  const isCurrent = ch.id === activeChapterId;
                  const isSolved =
                    (ch.id === 1 && ch1Solved) ||
                    (ch.id === 2 && ch2Solved) ||
                    (ch.id === 3 && ch3Solved) ||
                    (ch.id === 4 && ch4Solved) ||
                    (ch.id === 5 && ch5Solved) ||
                    (ch.id === 6 && ch6Solved) ||
                    (ch.id === 7 && ch7Solved);

                  return (
                    <div
                      key={ch.id}
                      style={{
                        background: isCurrent
                          ? "rgba(255, 180, 84, 0.12)"
                          : "rgba(20, 10, 20, 0.8)",
                        border: isCurrent
                          ? "2px solid var(--accent)"
                          : unlocked
                          ? "1px solid rgba(255, 255, 255, 0.18)"
                          : "1px dashed rgba(255, 45, 58, 0.3)",
                        borderRadius: 6,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        opacity: 1,
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          height: 120,
                          width: "100%",
                          backgroundImage: `url(${ch.bgSrc})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          position: "relative",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(to top, rgba(10,5,10,0.95) 0%, rgba(10,5,10,0.2) 100%)",
                          }}
                        />

                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            fontSize: 10,
                            letterSpacing: ".15em",
                            fontWeight: "bold",
                            background: isSolved ? "#ff2d3a" : "#ff8a4c",
                            border: isSolved ? "1px solid #ff2d3a" : "1px solid #ff8a4c",
                            color: "#000000",
                          }}
                        >
                          {isSolved ? "[COMPLETE]" : "[UNLOCKED]"}
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            bottom: 8,
                            left: 10,
                            fontSize: 12,
                            fontFamily: "var(--font-term)",
                            color: "var(--accent)",
                            letterSpacing: ".2em",
                            fontWeight: "bold",
                          }}
                        >
                          {ch.label}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "16px 14px",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            letterSpacing: ".15em",
                            color: "var(--accent)",
                            fontWeight: "bold",
                            marginBottom: 4,
                          }}
                        >
                          [{ch.tag}]
                        </div>

                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: "#fff",
                            marginBottom: 6,
                            fontFamily: "var(--font-term)",
                            letterSpacing: ".06em",
                          }}
                        >
                          {ch.archiveTitle}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--dim)",
                            marginBottom: 14,
                            lineHeight: 1.4,
                            flex: 1,
                          }}
                        >
                          {ch.archiveSubtitle}
                        </div>

                        <button
                          type="button"
                          className={`btn sm ${isCurrent ? "" : "ghost"}`}
                          onClick={() => {
                            setActiveChapterId(ch.id);
                            setChapterModalOpen(false);
                            sfx("ok");
                          }}
                          style={{
                            width: "100%",
                            fontSize: 13,
                            padding: "8px 12px",
                            letterSpacing: ".12em",
                            borderRadius: 4,
                          }}
                        >
                          {isCurrent ? "[CURRENT SECTOR]" : "ACCESS SECTOR →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Single Centered Challenge Console */}
      <motion.div
        key={`task-${currentChapter.id}`}
        className="panel"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "min(1160px, 94vw)",
          maxHeight: "calc(100vh - 110px)",
          background: "rgba(10, 5, 10, 0.95)",
          backdropFilter: isLoreActive ? "none" : "blur(14px)",
          WebkitBackdropFilter: isLoreActive ? "none" : "blur(14px)",
          filter: isLoreActive ? "blur(14px)" : "none",
          opacity: isLoreActive ? 0.22 : 1,
          pointerEvents: isLoreActive ? "none" : "auto",
          userSelect: isLoreActive ? "none" : "auto",
          transition: "filter 0.35s ease, opacity 0.35s ease",
          border: "1px solid rgba(255, 45, 58, 0.35)",
          boxShadow: "0 0 45px rgba(0,0,0,0.92)",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* CHAPTER 1: HAWKINS TOWN (QUIZ) */}
        {currentChapter.id === 1 && (
          ch1Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[0]}
              onNextEpisode={() => {
                sfx("ok");
                setActiveChapterId(2);
              }}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#ff3b45" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em" }}>CHAPTER 1 : HAWKINS TOWN [QUIZ]</span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +100 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    fontSize: "clamp(15px, 1.8vh, 17px)",
                    lineHeight: 1.5,
                    marginBottom: 12,
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  During the covert November 1983 incident at Hawkins National Laboratory, which
                  classified Department of Energy project resulted in the initial psychokinetic rift
                  and the escape of test subjects?
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
                  {Q1_OPTIONS.map((opt) => {
                    const isSelected = q1Selected === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          sfx("click");
                          setQ1Selected(opt.id);
                        }}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          background: isSelected
                            ? "rgba(255, 45, 58, 0.18)"
                            : "rgba(0, 0, 0, 0.6)",
                          border: isSelected
                            ? "1px solid #ff2d3a"
                            : "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: isSelected ? "#ff2d3a" : "rgba(255,255,255,0.85)",
                          fontSize: 14.5,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: ".05em",
                          transition: "all 0.18s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 3,
                            border: isSelected
                              ? "2px solid #ff2d3a"
                              : "1px solid rgba(255,255,255,0.3)",
                            background: isSelected ? "#ff2d3a" : "transparent",
                            color: isSelected ? "#000" : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: "bold",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {q1Error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        background: "rgba(255, 45, 58, 0.15)",
                        border: "1px solid var(--danger)",
                        borderRadius: 4,
                        color: "var(--danger)",
                        fontSize: 12.5,
                        letterSpacing: ".1em",
                        textAlign: "center",
                        fontFamily: "var(--font-term)",
                      }}
                    >
                      [SECURITY CLEARANCE REJECTED] RECORD CLASSIFIED · TRY AGAIN
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  className="btn"
                  onClick={handleQ1Submit}
                  disabled={!q1Selected}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    fontSize: 15,
                    padding: "10px 18px",
                    letterSpacing: ".15em",
                    borderRadius: 4,
                  }}
                >
                  VERIFY SECURITY CLEARANCE →
                </button>
              </div>
            </>
          )
        )}

        {/* CHAPTER 2: POLIC STATION (CASE STUDY) */}
        {currentChapter.id === 2 && (
          ch2Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[1]}
              onNextEpisode={() => {
                sfx("ok");
                setActiveChapterId(3);
              }}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#ff3b45" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em" }}>CHAPTER 2 : POLIC STATION [CASE DOSSIER]</span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +150 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                    gap: 26,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div
                      className="eyebrow"
                      style={{ color: "#ff2d3a", fontSize: 12, letterSpacing: ".2em", marginBottom: 10, fontWeight: "bold" }}
                    >
                      CHIEF'S DESK EVIDENCE DOSSIER
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      {EVIDENCE_LOGS.map((item, idx) => {
                        const isActive = activeEvidenceTab === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              sfx("click");
                              setActiveEvidenceTab(idx);
                            }}
                            style={{
                              padding: "6px 12px",
                              fontSize: 12,
                              letterSpacing: ".1em",
                              background: isActive ? "#ff2d3a" : "rgba(0,0,0,0.6)",
                              color: isActive ? "#000" : "rgba(255,255,255,0.75)",
                              border: isActive ? "1px solid #ff2d3a" : "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontFamily: "var(--font-term)",
                              fontWeight: "bold",
                            }}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        background: "rgba(0,0,0,0.75)",
                        border: "1px solid rgba(255,45,58,0.3)",
                        borderRadius: 4,
                        padding: "16px 18px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                          TIMESTAMP: {EVIDENCE_LOGS[activeEvidenceTab].time}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            background: "rgba(255,45,58,0.2)",
                            color: "#ff2d3a",
                            borderRadius: 2,
                            fontWeight: "bold",
                            fontFamily: "var(--font-term)",
                          }}
                        >
                          {EVIDENCE_LOGS[activeEvidenceTab].badge}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 14.5,
                          lineHeight: 1.6,
                          color: "rgba(255,255,255,0.9)",
                          fontFamily: "var(--font-mono)",
                          margin: 0,
                        }}
                      >
                        {EVIDENCE_LOGS[activeEvidenceTab].content}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(194, 136, 89, 0.12)",
                        border: "1px solid rgba(194, 136, 89, 0.35)",
                        borderRadius: 4,
                        padding: "8px 12px",
                        marginTop: 10,
                      }}
                    >
                      <div
                        style={{ width: 28, height: 28, flexShrink: 0 }}
                        dangerouslySetInnerHTML={{ __html: CHARACTERS.hopper.silhouetteSvg }}
                      />
                      <div style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", color: "#c28859", lineHeight: 1.4 }}>
                        <strong>HOPPER:</strong> {
                          activeEvidenceTab === 0
                            ? '"Compare that dispatch recording with the high-voltage lab lines."'
                            : activeEvidenceTab === 1
                            ? '"The eyewitness was near the quarry, but the lights were pointing northwest."'
                            : '"Sensor spike hit 14.3 MHz right when Sublevel 4 breached."'
                        }
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      className="eyebrow"
                      style={{ color: "#ff2d3a", fontSize: 12, letterSpacing: ".2em", marginBottom: 10, fontWeight: "bold" }}
                    >
                      CHIEF'S INCIDENT BOARD DEDUCTION
                    </div>
                    <div style={{ fontSize: 15.5, lineHeight: 1.55, color: "#fff", marginBottom: 14, fontFamily: "var(--font-mono)" }}>
                      Based on the high-frequency harmonic propagation vectors and witness reports,
                      which facility represents the primary anomaly epicenter?
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {CASE_OPTIONS.map((opt) => {
                        const isSelected = caseSelected === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isLoreActive}
                            onClick={() => {
                              if (isLoreActive) return;
                              sfx("click");
                              setCaseSelected(opt.id);
                            }}
                            style={{
                              padding: "12px 14px",
                              textAlign: "left",
                              background: isSelected ? "rgba(255,45,58,0.18)" : "rgba(0,0,0,0.6)",
                              border: isSelected ? "1px solid #ff2d3a" : "1px solid rgba(255,255,255,0.12)",
                              borderRadius: 4,
                              cursor: "pointer",
                              color: isSelected ? "#ff2d3a" : "rgba(255,255,255,0.85)",
                              fontSize: 14,
                              fontFamily: "var(--font-mono)",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 3,
                                border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255,255,255,0.3)",
                                background: isSelected ? "#ff2d3a" : "transparent",
                                color: isSelected ? "#000" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: "bold",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {caseError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          style={{
                            marginTop: 12,
                            padding: "10px 14px",
                            background: "rgba(255, 45, 58, 0.15)",
                            border: "1px solid var(--danger)",
                            borderRadius: 4,
                            color: "var(--danger)",
                            fontSize: 13,
                            letterSpacing: ".1em",
                            textAlign: "center",
                            fontFamily: "var(--font-term)",
                          }}
                        >
                          [DEDUCTION REJECTED] INCONSISTENT WITH VECTOR TELEMETRY
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="button"
                      className="btn big"
                      onClick={handleCaseSubmit}
                      disabled={isLoreActive || !caseSelected}
                      style={{
                        marginTop: 16,
                        width: "100%",
                        fontSize: 16.5,
                        padding: "14px 22px",
                        letterSpacing: ".15em",
                        borderRadius: 4,
                      }}
                    >
                      SUBMIT CASE DEDUCTION →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* CHAPTER 3: BYERS HOUSE (CHRISTMAS LIGHTS & SCRAMBLED NOTES) */}
        {currentChapter.id === 3 && (
          ch3Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[2]}
              onNextEpisode={() => {
                sfx("ok");
                setActiveChapterId(4);
              }}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#e6a15c" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em", color: "#e6a15c" }}>
                  CHAPTER 3 : BYERS HOUSE [WALL COMMUNICATIONS]
                </span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +150 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div
                    className="eyebrow"
                    style={{ color: "#e6a15c", fontSize: 12, letterSpacing: ".2em", marginBottom: 8, fontWeight: "bold" }}
                  >
                    CHRISTMAS LIGHTS ALPHABET WALL
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                    {[
                      { color: "#ff4d4d", label: "RED: A-H", text: "DO" },
                      { color: "#4da6ff", label: "BLUE: I-Q", text: "NOT" },
                      { color: "#ffe066", label: "YELLOW: R-Z", text: "OPEN" },
                      { color: "#5cd65c", label: "GREEN: FLASH", text: "THE GATE" },
                    ].map((bulb, bi) => (
                      <motion.div
                        key={bi}
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.03, 0.97] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: bi * 0.3 }}
                        style={{
                          background: "rgba(0,0,0,0.6)",
                          border: `2px solid ${bulb.color}`,
                          padding: "6px 14px",
                          borderRadius: 20,
                          fontSize: 12,
                          color: bulb.color,
                          fontWeight: "bold",
                          fontFamily: "var(--font-mono)",
                          boxShadow: `0 0 12px ${bulb.color}40`,
                        }}
                      >
                        ● {bulb.label}
                      </motion.div>
                    ))}
                  </div>

                  <p style={{ fontSize: 16, color: "#fff", fontFamily: "var(--font-mono)", maxWidth: 720, margin: "0 auto 16px" }}>
                    Will's torn drawing fragments are scattered on the floor. Click two fragments to swap their positions
                    until his urgent warning message is assembled in correct grammatical order!
                  </p>
                </div>

                {/* Scrambled Tiles */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 26,
                  }}
                >
                  {byersTiles.map((tile, tidx) => {
                    const isSelected = selectedTileIdx === tidx;
                    return (
                      <motion.button
                        key={tidx}
                        type="button"
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (selectedTileIdx === null) {
                            sfx("click");
                            setSelectedTileIdx(tidx);
                          } else if (selectedTileIdx === tidx) {
                            setSelectedTileIdx(null);
                          } else {
                            swapByersTiles(selectedTileIdx, tidx);
                          }
                        }}
                        style={{
                          padding: "16px 24px",
                          fontSize: 22,
                          fontWeight: "bold",
                          fontFamily: "var(--font-term)",
                          letterSpacing: ".15em",
                          background: isSelected ? "#e6a15c" : "rgba(20, 10, 15, 0.9)",
                          color: isSelected ? "#000" : "#fff",
                          border: isSelected ? "2px solid #fff" : "2px solid #e6a15c",
                          borderRadius: 6,
                          cursor: "pointer",
                          boxShadow: isSelected ? "0 0 20px rgba(230,161,92,0.8)" : "0 4px 15px rgba(0,0,0,0.6)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {tile}
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{ textAlign: "center", fontSize: 13, color: "var(--dim)", fontFamily: "var(--font-mono)" }}>
                  CURRENT ARRANGEMENT: <strong style={{ color: "#fff", letterSpacing: ".1em" }}>"{byersTiles.join(" ")}"</strong>
                </div>
              </div>
            </>
          )
        )}

        {/* CHAPTER 4: HAWKINS LAB (CODING LOGIC) */}
        {currentChapter.id === 4 && (
          ch4Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[3]}
              onNextEpisode={() => {
                sfx("ok");
                setActiveChapterId(5);
              }}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#26a69a" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em", color: "#26a69a" }}>
                  CHAPTER 4 : HAWKINS LAB [MAINFRAME LOGIC]
                </span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +200 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                    gap: 28,
                    alignItems: "stretch",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      className="eyebrow"
                      style={{ color: "#26a69a", fontSize: 12, letterSpacing: ".2em", marginBottom: 8, fontWeight: "bold" }}
                    >
                      SUBLEVEL 3 TELEMETRY ROUTINE
                    </div>

                    <div
                      style={{
                        background: "rgba(5, 5, 8, 0.95)",
                        border: "1px solid rgba(38, 166, 154, 0.4)",
                        borderRadius: 4,
                        padding: "16px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-mono)",
                          fontSize: 14.5,
                          lineHeight: 1.6,
                          color: "#36e0c4",
                        }}
                      >
{`function stabilizeTelemetry(buffer) {
  let parity = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] % 2 === 0) {
      parity += buffer[i] * 2;
    } else {
      parity += buffer[i] + 1;
    }
  }
  return parity;
}

const packet = [4, 7, 12, 9, 2];
console.log(stabilizeTelemetry(packet));`}
                      </pre>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div
                        className="eyebrow"
                        style={{ color: "#26a69a", fontSize: 12, letterSpacing: ".2em", marginBottom: 8, fontWeight: "bold" }}
                      >
                        LOGIC EXECUTION &amp; PARITY OUTPUT
                      </div>

                      <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "#fff", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
                        Trace the execution of <code style={{ color: "#36e0c4" }}>stabilizeTelemetry(packet)</code> with the input array{" "}
                        <code style={{ color: "#ff8a4c" }}>[4, 7, 12, 9, 2]</code>. Enter the final integer output printed by the console.
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "rgba(0,0,0,0.6)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 4,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: "var(--font-mono)",
                          lineHeight: 1.5,
                          marginBottom: 18,
                        }}
                      >
                        💡 <strong>Hint:</strong> Even numbers multiply by 2 (e.g. 4*2=8). Odd numbers add 1 (e.g. 7+1=8). Sum all results.
                      </div>
                    </div>

                    <form onSubmit={handleCodeSubmit} style={{ marginTop: "auto" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          color: "#26a69a",
                          letterSpacing: ".15em",
                          marginBottom: 6,
                        }}
                      >
                        ENTER CONSOLE OUTPUT INTEGER:
                      </label>

                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          type="text"
                          className="field"
                          placeholder="e.g. 42"
                          value={codeAnswer}
                          onChange={(e) => setCodeAnswer(e.target.value)}
                          disabled={isLoreActive}
                          style={{
                            fontSize: 16,
                            letterSpacing: ".1em",
                            padding: "12px 14px",
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                        <button
                          type="submit"
                          className="btn"
                          disabled={isLoreActive || !codeAnswer.trim()}
                          style={{ padding: "0 26px", fontSize: 14, letterSpacing: ".12em" }}
                        >
                          RESTORE →
                        </button>
                      </div>

                      <AnimatePresence>
                        {codeError && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                              marginTop: 10,
                              padding: "8px 12px",
                              background: "rgba(255, 45, 58, 0.15)",
                              border: "1px solid var(--danger)",
                              borderRadius: 4,
                              color: "var(--danger)",
                              fontSize: 12.5,
                              letterSpacing: ".1em",
                              textAlign: "center",
                              fontFamily: "var(--font-term)",
                            }}
                          >
                            [EXECUTION ERROR] INCORRECT PARITY CHECKSUM · RECALCULATE
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* CHAPTER 5: FOREST (CARVED RUNES) */}
        {currentChapter.id === 5 && (
          ch5Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[4]}
              onNextEpisode={() => {
                sfx("ok");
                setActiveChapterId(6);
              }}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#81c784" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em", color: "#81c784" }}>
                  CHAPTER 5 : FOREST [TRAIL 7 RUNES]
                </span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +200 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div
                    className="eyebrow"
                    style={{ color: "#81c784", fontSize: 12, letterSpacing: ".2em", marginBottom: 8, fontWeight: "bold" }}
                  >
                    DEEP WOODS · TRAIL 7 CARVED PINE TRUNKS
                  </div>
                  <p style={{ fontSize: 16, color: "#fff", fontFamily: "var(--font-mono)", maxWidth: 720, margin: "0 auto 16px" }}>
                    Your flashlight sweeps through the thick autumn mist. Three towering pine trunks reveal
                    glowing geometric runes carved deep into the bark. Read the 3 digits left to right.
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                    {[
                      { tree: "NORTH PINE", rune: "4", desc: "CARVED AT 6 FT" },
                      { tree: "CENTER PINE", rune: "1", desc: "CARVED AT 4 FT" },
                      { tree: "EAST PINE", rune: "7", desc: "CARVED AT 5 FT" },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        animate={{ boxShadow: ["0 0 10px #81c78440", "0 0 25px #81c78480", "0 0 10px #81c78440"] }}
                        transition={{ repeat: Infinity, duration: 2, delay: idx * 0.4 }}
                        style={{
                          background: "rgba(10, 20, 15, 0.85)",
                          border: "2px solid #81c784",
                          borderRadius: 8,
                          padding: "20px 28px",
                          textAlign: "center",
                          minWidth: 140,
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                          {item.tree}
                        </div>
                        <div
                          style={{
                            fontSize: 48,
                            fontWeight: "bold",
                            color: "#81c784",
                            fontFamily: "var(--font-term)",
                            textShadow: "0 0 15px #81c784",
                          }}
                        >
                          {item.rune}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
                          {item.desc}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleForestSubmit} style={{ maxWidth: 460, margin: "0 auto" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "#81c784",
                      letterSpacing: ".15em",
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    ENTER 3-DIGIT COORDINATE VECTOR:
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      className="field"
                      placeholder="e.g. 000"
                      maxLength={3}
                      value={forestRuneInput}
                      onChange={(e) => setForestRuneInput(e.target.value.replace(/\D/g, ""))}
                      disabled={isLoreActive}
                      style={{
                        fontSize: 22,
                        letterSpacing: ".3em",
                        textAlign: "center",
                        padding: "10px 14px",
                        fontFamily: "var(--font-term)",
                      }}
                    />
                    <button
                      type="submit"
                      className="btn"
                      disabled={isLoreActive || forestRuneInput.length < 3}
                      style={{ padding: "0 24px", fontSize: 14, letterSpacing: ".12em" }}
                    >
                      LOCK VECTOR →
                    </button>
                  </div>

                  <AnimatePresence>
                    {forestError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          marginTop: 10,
                          padding: "8px 12px",
                          background: "rgba(255, 45, 58, 0.15)",
                          border: "1px solid var(--danger)",
                          borderRadius: 4,
                          color: "var(--danger)",
                          fontSize: 12.5,
                          letterSpacing: ".1em",
                          textAlign: "center",
                          fontFamily: "var(--font-term)",
                        }}
                      >
                        [VECTOR MISMATCH] COORDINATES DO NOT ALIGN WITH RADIO TOWER
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </>
          )
        )}

        {/* CHAPTER 6: RADIO TOWER (PIP & 5-PIN RADIOMETER) */}
        {currentChapter.id === 6 && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", width: "100%" }}>
            <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
              <span className="dot" style={{ width: 9, height: 9, background: "#ff7c85" }} />
              <span style={{ fontSize: 16, letterSpacing: ".16em", color: "#ff7c85" }}>
                CHAPTER 6 : RADIO TOWER [5-PIN RADIOMETER]
              </span>

              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setActiveLoreChapterId(6)}
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  padding: "5px 12px",
                  letterSpacing: ".1em",
                  borderRadius: 3,
                }}
                title="Replay Pip's radio tower lore"
              >
                [LORE BRIEFING]
              </button>

              <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                +250 PTS
              </span>
            </div>
            <div style={{ padding: "14px 22px", flex: 1, overflowY: "auto" }}>
              <Radiometer />
            </div>
          </div>
        )}

        {/* CHAPTER 7: UPSIDE DOWN (VECNA & THE GATE) */}
        {currentChapter.id === 7 && (
          ch7Solved ? (
            <ChapterCompletionView
              chapter={CHAPTERS[6]}
              isLastEpisode
              onNextEpisode={() => setChapterModalOpen(true)}
              onViewDossier={() => setChapterModalOpen(true)}
            />
          ) : (
            <>
              <div className="panel-head" style={{ padding: "16px 26px", display: "flex", alignItems: "center" }}>
                <span className="dot" style={{ width: 9, height: 9, background: "#ff2d3a" }} />
                <span style={{ fontSize: 16, letterSpacing: ".16em", color: "#ff2d3a" }}>
                  CHAPTER 7 : UPSIDE DOWN [EXPERIMENT 001]
                </span>

                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => setActiveLoreChapterId(currentChapter.id)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    padding: "5px 12px",
                    letterSpacing: ".1em",
                    borderRadius: 3,
                  }}
                  title="Replay chapter intro story"
                >
                  [LORE BRIEFING]
                </button>

                <span className="term dim" style={{ marginLeft: 16, fontSize: 14, color: "var(--accent)" }}>
                  +500 PTS
                </span>
              </div>

              <div className="panel-body" style={{ padding: "18px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>

                <div
                  style={{
                    fontSize: 18,
                    lineHeight: 1.6,
                    marginBottom: 20,
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  A decaying Department of Energy record was recovered from the corrupted red soil.
                  The true identity of Subject 001 was scrubbed using a ROT13 cipher:{" "}
                  <strong style={{ color: "#ff2d3a", letterSpacing: ".1em" }}>"URAEL PERRY"</strong>.
                  Identify his true name to sever the psychic link before the grandfather clock strikes four!
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
                  {UD_OPTIONS.map((opt) => {
                    const isSelected = udSelected === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isLoreActive}
                        onClick={() => {
                          if (isLoreActive) return;
                          sfx("click");
                          setUdSelected(opt.id);
                        }}
                        style={{
                          padding: "15px 18px",
                          textAlign: "left",
                          background: isSelected ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.6)",
                          border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: isSelected ? "#ff2d3a" : "rgba(255,255,255,0.85)",
                          fontSize: 15.5,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: ".05em",
                          transition: "all 0.18s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 3,
                            border: isSelected ? "2px solid #ff2d3a" : "1px solid rgba(255,255,255,0.3)",
                            background: isSelected ? "#ff2d3a" : "transparent",
                            color: isSelected ? "#000" : "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: "bold",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {udError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginTop: 14,
                        padding: "10px 14px",
                        background: "rgba(255, 45, 58, 0.2)",
                        border: "1px solid var(--danger)",
                        borderRadius: 4,
                        color: "var(--danger)",
                        fontSize: 13,
                        letterSpacing: ".1em",
                        textAlign: "center",
                        fontFamily: "var(--font-term)",
                      }}
                    >
                      [CIPHER DECRYPTION FAILED] ROT13 CHECK FAILED · CLOCK CONTINUES TICKING
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  className="btn big"
                  onClick={handleUdSubmit}
                  disabled={isLoreActive || !udSelected}
                  style={{
                    marginTop: 20,
                    width: "100%",
                    fontSize: 16.5,
                    padding: "14px 22px",
                    letterSpacing: ".15em",
                    borderRadius: 4,
                    background: "#ff2d3a",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                >
                  SEAL THE GATE RIFT →
                </button>
              </div>
            </>
          )
        )}
      </motion.div>
    </div>
  );
}
