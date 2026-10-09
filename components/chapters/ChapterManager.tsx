"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import CinematicBackground from "../CinematicBackground";
import Radiometer from "../Radiometer";
import { validateChapterOnServer } from "@/lib/api";
import { getCharacterForChapter } from "@/lib/characters";
import HopperPoliceReportQuiz from "./HopperPoliceReportQuiz";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";
import PushPin from "../PushPin";

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ChapterDef {
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
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
    points: 50,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Chapter Assigned Characters & In-Question Narrative Dispatch
   ───────────────────────────────────────────────────────────────────────────── */
const CHAPTER_CHARACTERS: Record<number, { name: string; role: string; sprite?: string; color: string; story: string }> = {
  1: {
    name: "DOT",
    role: "MUNICIPAL DISPATCHER · CIVIC DISTRICT",
    sprite: "/characters/dot.png",
    color: "#ffb454",
    story: "The town sleeps under a low autumn mist. Utility transmitters are broadcasting anomalous pulses across Roane County. Verify your classified security clearance to access emergency telemetry.",
  },
  2: {
    name: "CHIEF HOPPER",
    role: "CHIEF OF POLICE · PRECINCT 2",
    color: "#c28859",
    story: "Chief Hopper's office. Dispatch logs, eyewitness transcripts, and sensor telemetry have been recovered. Correlate the timestamps to pinpoint ground zero.",
  },
  3: {
    name: "JOYCE & WILL",
    role: "WALL COMMUNICATIONS · MIRKWOOD",
    color: "#ff5252",
    story: "Tangled strings of Christmas lights are illuminated on the living room wallpaper without power. Scrambled message fragments are strewn across the table. Reconstruct Will's urgent warning.",
  },
  4: {
    name: "DR. MARTIN BRENNER",
    role: "HAWKINS LAB · DIRECTOR OF RESEARCH",
    color: "#81c784",
    story: "Hawkins National Laboratory Sublevel 3. Telemetry packet router crashed due to unhandled parity logic. Trace the data loop to restore power grid communication.",
  },
  5: {
    name: "DUSTIN & LUCAS",
    role: "DEEP WOODS RECON · TRAIL 7",
    color: "#4fc3f7",
    story: "Deep woods near Trail 7. Flashlight beams reveal strange geometric runes carved into ancient pine trunks. Extract the three glowing pine digits left-to-right.",
  },
  6: {
    name: "PIP",
    role: "THE RADIO KID · EAST HILL TOWER",
    sprite: "/characters/radiokid.png",
    color: "#ffd54f",
    story: "East Hill Radio Tower sublevel. The emergency radiometer is scrambled by dimensional static. Calibrate carrier frequencies and lock all 5 pins.",
  },
  7: {
    name: "ELEVEN & VECNA",
    role: "THE GATE RIFT · HIVE MIND",
    sprite: "/characters/vecna.png",
    color: "#ff2d3a",
    story: "The dimensional boundary has collapsed. Spores drift through crimson skies. Decode Experiment 001's scrubbed identity (ROT13) to sever Vecna's psychic hold.",
  },
};

export function ChapterCharacterStoryBanner({ chapterId }: { chapterId: number }) {
  const char = CHAPTER_CHARACTERS[chapterId] || CHAPTER_CHARACTERS[1];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "rgba(18, 8, 12, 0.75)",
        border: `1px solid ${char.color}40`,
        borderRadius: "4px",
        padding: "10px 14px",
        marginBottom: "16px",
      }}
    >
      {char.sprite ? (
        <img
          src={char.sprite}
          alt={char.name}
          style={{ width: "42px", height: "42px", objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "3px",
            background: `${char.color}22`,
            border: `1.5px solid ${char.color}`,
            color: char.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 900,
            fontFamily: "var(--font-mono)",
            flexShrink: 0,
          }}
        >
          {char.name.slice(0, 2)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: char.color, letterSpacing: ".15em" }}>
            {char.name}
          </span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", letterSpacing: ".1em" }}>
            [{char.role}]
          </span>
        </div>
        <div style={{ fontSize: "12.5px", color: "rgba(255, 230, 235, 0.88)", lineHeight: "1.35", fontFamily: "var(--font-mono)" }}>
          {char.story}
        </div>
      </div>
    </div>
  );
}

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

  const { unlockHint, isHintUnlocked } = useGame();
  const dialogHintKey = `ch${chapter.id}-story-intel`;
  const isDialogUnlocked = isHintUnlocked(dialogHintKey);

  const handleAskHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    unlockHint(dialogHintKey, 10);
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

      {/* ── 2. BOTTOM STAGE ROW: GROUNDED CHARACTER ON LEFT + RETRO DIALOGUE BOX ON RIGHT ── */}
      <div
        style={{
          position: "relative",
          zIndex: 910,
          width: "min(1160px, 94vw)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: "clamp(14px, 2.5vw, 28px)",
          pointerEvents: "none",
        }}
      >
        {/* CHARACTER SPRITE / PIXEL ART ON LEFT */}
        <motion.div
          key={`story-character-${character.id}`}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={handleAdvance}
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            pointerEvents: "auto",
            cursor: "pointer",
            filter:
              character.id === "vecna"
                ? "drop-shadow(0 0 24px rgba(255, 45, 58, 0.85)) drop-shadow(0 14px 28px rgba(0,0,0,0.95))"
                : `drop-shadow(0 0 16px ${themeCol}90) drop-shadow(0 10px 22px rgba(0,0,0,0.95))`,
          }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            {character.sprite ? (
              <img
                src={character.sprite}
                alt={character.name}
                style={{
                  height:
                    character.id === "vecna"
                      ? "clamp(160px, 26vh, 230px)"
                      : "clamp(120px, 22vh, 195px)",
                  width: "auto",
                  imageRendering: "pixelated",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            ) : character.silhouetteSvg ? (
              <div
                style={{
                  height: "clamp(120px, 22vh, 195px)",
                  width: "clamp(80px, 15vw, 130px)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  lineHeight: 0,
                }}
                dangerouslySetInnerHTML={{
                  __html: character.silhouetteSvg,
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 100,
                  borderRadius: 4,
                  background: "rgba(0,0,0,0.8)",
                  border: `2px solid ${themeCol}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: themeCol,
                  fontWeight: 900,
                  fontSize: 24,
                  fontFamily: "var(--font-term)",
                }}
              >
                {character.name.slice(0, 2)}
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ── 3. AUTHENTIC POKEMON / 80S RETRO BOTTOM DIALOGUE BOX ── */}
        <motion.div
          key="retro-dialog-box"
          initial={{ y: 30, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={handleAdvance}
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            background: "#0d0408",
            border: `3px solid ${themeCol}`,
            borderRadius: 8,
            padding: "clamp(14px, 2vh, 20px) clamp(16px, 2.4vw, 24px)",
            boxShadow: `0 0 35px ${themeCol}45, 0 12px 35px rgba(0,0,0,0.95), inset 0 0 20px rgba(0,0,0,0.8)`,
            boxSizing: "border-box",
            pointerEvents: "auto",
            cursor: "pointer",
            userSelect: "none",
            zIndex: 915,
          }}
        >
          {/* Name Plate Tab */}
          <div
            style={{
              position: "absolute",
              top: -16,
              left: "clamp(16px, 2.8vw, 26px)",
              background: themeCol,
              color: "#000000",
              fontWeight: 900,
              fontSize: "clamp(12px, 1.4vw, 14px)",
              fontFamily: "var(--font-term)",
              letterSpacing: ".18em",
              padding: "3px 14px",
              borderRadius: "3px 3px 0 0",
              textTransform: "uppercase",
              boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {character.name.toUpperCase()}
          </div>

          {/* Top Meta Status Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 11,
              letterSpacing: ".16em",
              color: "rgba(255,255,255,0.45)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
            }}
          >
            <span>
              {mode === "completion"
                ? "STATUS: SECTOR CLEARED · TRANSMISSION DECRYPTED"
                : `ARCHIVE TRANSMISSION · ${chapter.archiveSector}`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 10.5,
                  fontFamily: "var(--font-mono)",
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
              minHeight: 52,
              fontSize: "clamp(15px, 2vh, 18.5px)",
              lineHeight: 1.5,
              color: "#ffffff",
              fontFamily: "var(--font-mono)",
              letterSpacing: ".04em",
            }}
          >
            {currentLine.slice(0, charCount)}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
                style={{ color: themeCol, fontWeight: "bold", marginLeft: 2 }}
              >
                █
              </motion.span>
            )}
          </div>

          {/* Bottom Right Advance Indicator */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                fontSize: 11,
                fontWeight: "bold",
                fontFamily: "var(--font-mono)",
                color: isTyping ? "rgba(255,255,255,0.3)" : themeCol,
                letterSpacing: ".12em",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isTyping ? "[TYPING...]" : isFinalLine ? (mode === "completion" ? "NEXT EPISODE" : "ENTER MISSION") : "[SPACE / CLICK]"}
            </motion.div>
          </div>
        </motion.div>
      </div>
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
            NEXT EPISODE
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
            background: "rgba(10, 3, 6, 0.95)",
            color: "#ffcdd2",
            fontSize: 13.5,
            letterSpacing: ".14em",
            padding: "13px 26px",
            border: "1.5px solid #d91e2b",
            borderRadius: 4,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontWeight: "bold",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s ease",
          }}
        >
          <PushPin size={18} angle={-6} />
          <span>RETURN TO EVIDENCE BOARD</span>
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Chapter Manager
   ───────────────────────────────────────────────────────────────────────────── */
interface ChapterManagerProps {
  onBackToBoard?: () => void;
}

export default function ChapterManager({ onBackToBoard }: ChapterManagerProps = {}) {
  const {
    s,
    submitTask,
    activeChapterId,
    setActiveChapterId,
    chapterModalOpen,
    setChapterModalOpen,
    radiometerPinCount,
    setViewMode,
  } = useGame();

  const handleBackToBoard = useCallback(() => {
    sfx("click");
    if (onBackToBoard) {
      onBackToBoard();
    } else {
      setViewMode("board");
    }
  }, [onBackToBoard, setViewMode]);

  // Solved states for all 7 chapters
  const ch1Solved = !!s.completedTasks?.includes("ch1-quiz") || !!s.solved?.["ch1-quiz"];
  const ch2Solved = !!s.completedTasks?.includes("ch2-police") || !!s.solved?.["ch2-police"] || !!s.completedTasks?.includes("ch3-case-study");
  const ch3Solved = !!s.completedTasks?.includes("ch3-byers") || !!s.solved?.["ch3-byers"];
  const ch4Solved = !!s.completedTasks?.includes("ch4-lab") || !!s.solved?.["ch4-lab"] || !!s.completedTasks?.includes("ch2-coding");
  const ch5Solved = !!s.completedTasks?.includes("ch5-forest") || !!s.solved?.["ch5-forest"] || !!s.completedTasks?.includes("forest-marks");
  const ch6Solved = radiometerPinCount === 5 || s.radiometer.codeSolved || !!s.completedTasks?.includes("ch6-radio-tower") || !!s.solved?.["ch6-radio-tower"];
  const ch7Solved = !!s.completedTasks?.includes("ch7-upsidedown") || !!s.solved?.["ch7-upsidedown"];

  // Active lore briefing state: pops up immediately upon opening a chapter!
  const [activeLoreChapterId, setActiveLoreChapterId] = useState<number | null>(() => activeChapterId);

  useEffect(() => {
    setActiveLoreChapterId(activeChapterId);
  }, [activeChapterId]);

  const [completionStoryChapterId, setCompletionStoryChapterId] = useState<number | null>(null);
  const isLoreActive = completionStoryChapterId !== null;

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

  const isCurrentSolved =
    currentChapter.id === 1
      ? ch1Solved
      : currentChapter.id === 2
      ? ch2Solved
      : currentChapter.id === 3
      ? ch3Solved
      : currentChapter.id === 4
      ? ch4Solved
      : currentChapter.id === 5
      ? ch5Solved
      : currentChapter.id === 6
      ? ch6Solved
      : ch7Solved;

  const [quizErrorMap, setQuizErrorMap] = useState<Record<number, boolean>>({});

  const handleQuizSubmitAll = async (chapterId: ChapterId, answers: Record<number, string>) => {
    const cfg = STAGE_QUIZ_CONFIGS[chapterId];
    if (!cfg) return;

    const taskId = CHAPTERS.find((c) => c.id === chapterId)?.taskId || `ch${chapterId}`;
    
    // Submit each question securely to server (Trusted validation against database)
    const questions = cfg.questions || [];
    let correctCount = 0;
    let totalPointsAwarded = 0;

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const chosen = answers[idx] || "A";
      try {
        const res = await fetch("/api/questions/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, answer: chosen }),
        });
        const data = await res.json();
        if (data.success && data.isCorrect) {
          correctCount++;
          totalPointsAwarded += (data.pointsAwarded !== undefined ? data.pointsAwarded : 5);
        }
      } catch (err) {
        console.warn("[SUBMIT FAILED]", err);
      }
    }

    sfx("ok");
    submitTask(taskId, totalPointsAwarded, `Chapter ${chapterId} Docket Verified (${correctCount}/${questions.length} Solved)`);
    setCompletionStoryChapterId(chapterId);
  };

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "94px",
        paddingBottom: "40px",
        paddingLeft: "clamp(10px, 2vw, 20px)",
        paddingRight: "clamp(10px, 2vw, 20px)",
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

      {/* Pokemon FireRed Style Bottom Dialogue Box (Pops up automatically on enter) */}
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
                    handleBackToBoard();
                  }
            }
          />
        )}
      </AnimatePresence>

      {/* Main Single Centered Challenge Console (Animated Elemental Box) */}
      <motion.div
        key={`task-${currentChapter.id}`}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "min(1240px, 96vw)",
          maxHeight: "calc(100vh - 94px)",
          height: "calc(100vh - 94px)",
          background: "rgba(10, 5, 10, 0.95)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "none",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
        }}
      >
        {isCurrentSolved ? (
          <ChapterCompletionView
            chapter={currentChapter}
            isLastEpisode={currentChapter.id === 7}
            onNextEpisode={() => {
              sfx("ok");
              if (currentChapter.id < 7) {
                setActiveChapterId((currentChapter.id + 1) as ChapterId);
              } else {
                handleBackToBoard();
              }
            }}
            onViewDossier={handleBackToBoard}
          />
        ) : (
          <HopperPoliceReportQuiz
            key={currentChapter.id}
            chapterNumber={currentChapter.id}
            chapterTitle={currentChapter.label}
            sectionTitle={STAGE_QUIZ_CONFIGS[currentChapter.id]?.sectionHeader}
            formDocket={STAGE_QUIZ_CONFIGS[currentChapter.id]?.docketNumber}
            questions={STAGE_QUIZ_CONFIGS[currentChapter.id]?.questions}
            points={STAGE_QUIZ_CONFIGS[currentChapter.id]?.points || currentChapter.points}
            error={quizErrorMap[currentChapter.id]}
            onSubmitAll={(ans) => handleQuizSubmitAll(currentChapter.id, ans)}
            onOpenLore={() => setActiveLoreChapterId(currentChapter.id)}
            onExitFullScreen={handleBackToBoard}
          />
        )}
      </motion.div>
    </div>
  );
}
