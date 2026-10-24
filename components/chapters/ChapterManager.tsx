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
    taskId: "ch5-radio-tower",
    points: 50,
  },
  {
    id: 6,
    label: "CHAPTER 6",
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
    taskId: "ch6-upsidedown",
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

  const { unlockHint, isHintUnlocked, score, showAlert, showConfirm } = useGame();
  const dialogHintKey = `ch${chapter.id}-story-intel`;
  const isDialogUnlocked = isHintUnlocked(dialogHintKey);
  const [isUnlockingIntel, setIsUnlockingIntel] = useState(false);

  const handleAskHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlockingIntel) return;
    if (score < 5) {
      showAlert(
        "You need at least 5 squad points to unlock an Intel Clue. Complete tasks or submit accurate answers to earn points.",
        {
          title: "CLEARANCE RESTRICTED // INSUFFICIENT SCORE",
          confirmLabel: "ACKNOWLEDGE",
          type: "warning",
        }
      );
      return;
    }
    showConfirm(
      "Decrypt classified surveillance dossier? This action will deduct 5 points from your current squad score.",
      () => {
        setIsUnlockingIntel(true);
        unlockHint(dialogHintKey, 5);
        const hintText = `${character.nameTag || character.name.toUpperCase()} INTEL: "${CHAPTER_HINTS[chapter.id] || "Investigate the facility telemetry carefully."}"`;
        setLines((prev) => [...prev, hintText]);
        setLineIdx((prev) => prev + 1);
        setCharCount(0);
        setIsTyping(true);
        setTimeout(() => {
          setIsUnlockingIntel(false);
        }, 400);
      },
      {
        title: "CLASSIFIED INTEL DOSSIER DECRYPTION",
        confirmLabel: "DECRYPT CLUE (-5 PTS)",
        cancelLabel: "ABORT",
        type: "warning",
      }
    );
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
  const { s } = useGame();
  const teamId = s?.team?.id || "anon";

  const cfg = STAGE_QUIZ_CONFIGS[chapter.id];
  const questions = cfg?.questions || [];

  const [report, setReport] = useState<{
    items: { num: number; isCorrect: boolean }[];
    correctNums: number[];
    wrongNums: number[];
  }>(() => {
    if (typeof window === "undefined" || !questions.length) {
      return { items: [], correctNums: [], wrongNums: [] };
    }

    let storedResults: Record<number, any> = {};
    let storedAnswers: Record<number, string> = {};

    try {
      const teamKey = `hawkins_quiz_results_ch${chapter.id}_${teamId}`;
      const anonKey = `hawkins_quiz_results_ch${chapter.id}_anon`;
      let resRaw = localStorage.getItem(teamKey) || localStorage.getItem(anonKey);
      if (!resRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`hawkins_quiz_results_ch${chapter.id}_`)) {
            resRaw = localStorage.getItem(k);
            if (resRaw) break;
          }
        }
      }
      if (resRaw) storedResults = JSON.parse(resRaw);
    } catch {}

    try {
      const teamKey = `hawkins_quiz_answers_ch${chapter.id}_${teamId}`;
      const anonKey = `hawkins_quiz_answers_ch${chapter.id}_anon`;
      let ansRaw = localStorage.getItem(teamKey) || localStorage.getItem(anonKey);
      if (!ansRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`hawkins_quiz_answers_ch${chapter.id}_`)) {
            ansRaw = localStorage.getItem(k);
            if (ansRaw) break;
          }
        }
      }
      if (ansRaw) storedAnswers = JSON.parse(ansRaw);
    } catch {}

    const hasStoredResults = Object.keys(storedResults).length > 0;
    const hasStoredAnswers = Object.keys(storedAnswers).length > 0;

    const correctNums: number[] = [];
    const wrongNums: number[] = [];
    const items = questions.map((q, idx) => {
      const num = q.itemNumber || idx + 1;
      let isCorrect = false;

      if (storedResults[idx] && typeof storedResults[idx].isCorrect === "boolean") {
        isCorrect = Boolean(storedResults[idx].isCorrect);
      } else if (storedAnswers[idx] !== undefined && q.correctAnswerId) {
        isCorrect = String(storedAnswers[idx]).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase();
      } else if (!hasStoredResults && !hasStoredAnswers) {
        // Fallback for solved chapters without local question cache
        isCorrect = true;
      } else {
        isCorrect = false;
      }

      if (isCorrect) {
        correctNums.push(num);
      } else {
        wrongNums.push(num);
      }

      return { num, isCorrect };
    });

    return { items, correctNums, wrongNums };
  });

  useEffect(() => {
    if (!questions.length) return;

    let storedResults: Record<number, any> = {};
    let storedAnswers: Record<number, string> = {};

    try {
      const teamKey = `hawkins_quiz_results_ch${chapter.id}_${teamId}`;
      const anonKey = `hawkins_quiz_results_ch${chapter.id}_anon`;
      let resRaw = localStorage.getItem(teamKey) || localStorage.getItem(anonKey);
      if (!resRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`hawkins_quiz_results_ch${chapter.id}_`)) {
            resRaw = localStorage.getItem(k);
            if (resRaw) break;
          }
        }
      }
      if (resRaw) storedResults = JSON.parse(resRaw);
    } catch {}

    try {
      const teamKey = `hawkins_quiz_answers_ch${chapter.id}_${teamId}`;
      const anonKey = `hawkins_quiz_answers_ch${chapter.id}_anon`;
      let ansRaw = localStorage.getItem(teamKey) || localStorage.getItem(anonKey);
      if (!ansRaw) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`hawkins_quiz_answers_ch${chapter.id}_`)) {
            ansRaw = localStorage.getItem(k);
            if (ansRaw) break;
          }
        }
      }
      if (ansRaw) storedAnswers = JSON.parse(ansRaw);
    } catch {}

    const hasStoredResults = Object.keys(storedResults).length > 0;
    const hasStoredAnswers = Object.keys(storedAnswers).length > 0;

    const correctNums: number[] = [];
    const wrongNums: number[] = [];
    const items = questions.map((q, idx) => {
      const num = q.itemNumber || idx + 1;
      let isCorrect = false;

      if (storedResults[idx] && typeof storedResults[idx].isCorrect === "boolean") {
        isCorrect = Boolean(storedResults[idx].isCorrect);
      } else if (storedAnswers[idx] !== undefined && q.correctAnswerId) {
        isCorrect = String(storedAnswers[idx]).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase();
      } else if (!hasStoredResults && !hasStoredAnswers) {
        isCorrect = true;
      } else {
        isCorrect = false;
      }

      if (isCorrect) {
        correctNums.push(num);
      } else {
        wrongNums.push(num);
      }

      return { num, isCorrect };
    });

    setReport({ items, correctNums, wrongNums });
  }, [chapter.id, teamId, questions]);

  const totalQuestions = questions.length;
  const accuracyPct = totalQuestions > 0 ? Math.round((report.correctNums.length / totalQuestions) * 100) : 100;

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
          marginBottom: 28,
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

      {/* ── QUESTIONS AUDIT REPORT (CORRECT VS WRONG NUMBERS) ── */}
      {totalQuestions > 0 && (
        <div
          style={{
            background: "#080204",
            border: "1.5px solid #ff2d3a",
            borderRadius: 4,
            padding: "24px 28px",
            marginBottom: 32,
            boxShadow: "0 0 20px rgba(255, 45, 58, 0.12), inset 0 0 16px rgba(0,0,0,0.85)",
          }}
        >
          {/* Report Top Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px dashed rgba(255, 45, 58, 0.35)",
              paddingBottom: 14,
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".22em",
                  color: "#ff858d",
                  fontFamily: "var(--font-term)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                MISSION DEBRIEF // TELEMETRY AUDIT
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: ".14em",
                  fontFamily: "var(--font-term)",
                  textTransform: "uppercase",
                }}
              >
                CHAPTER {chapter.id} QUESTIONS REPORT
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0, 0, 0, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "6px 14px",
                borderRadius: 3,
                fontFamily: "var(--font-mono)",
                letterSpacing: ".1em",
              }}
            >
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>
                ACCURACY:
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: accuracyPct === 100 ? "#4ade80" : accuracyPct >= 50 ? "#ffd54f" : "#f87171",
                }}
              >
                {report.correctNums.length} / {totalQuestions} ({accuracyPct}%)
              </span>
            </div>
          </div>

          {/* Sequential Question Status Overview */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.55)",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                marginBottom: 10,
                fontFamily: "var(--font-mono)",
              }}
            >
              QUESTION STATUS OVERVIEW:
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {report.items.map((item) => (
                <div
                  key={item.num}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 3,
                    background: item.isCorrect
                      ? "rgba(34, 197, 94, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                    border: item.isCorrect
                      ? "1.5px solid #22c55e"
                      : "1.5px solid #ef4444",
                    boxShadow: item.isCorrect
                      ? "0 0 8px rgba(34, 197, 94, 0.25)"
                      : "0 0 8px rgba(239, 68, 68, 0.25)",
                    fontFamily: "var(--font-mono)",
                  }}
                  title={`Question ${item.num}: ${item.isCorrect ? "Correct" : "Incorrect"}`}
                >
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: "bold",
                      color: item.isCorrect ? "#86efac" : "#fca5a5",
                      letterSpacing: ".06em",
                    }}
                  >
                    Q{item.num < 10 ? `0${item.num}` : item.num}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: item.isCorrect ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {item.isCorrect ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Correct vs Wrong Breakdown Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* CORRECT QUESTIONS CARD */}
            <div
              style={{
                background: "rgba(20, 83, 45, 0.18)",
                border: "1.5px solid rgba(34, 197, 94, 0.5)",
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".14em",
                  color: "#4ade80",
                  fontFamily: "var(--font-term)",
                  textTransform: "uppercase",
                }}
              >
                <span>✓</span>
                <span>CORRECT QUESTIONS ({report.correctNums.length})</span>
              </div>

              {report.correctNums.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {report.correctNums.map((num) => (
                    <span
                      key={num}
                      style={{
                        background: "#15803d",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: 12.5,
                        padding: "4px 10px",
                        borderRadius: 3,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: ".08em",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                      }}
                    >
                      Question {num}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.45)",
                    fontFamily: "var(--font-mono)",
                    fontStyle: "italic",
                  }}
                >
                  None
                </div>
              )}
            </div>

            {/* WRONG QUESTIONS CARD */}
            <div
              style={{
                background: "rgba(127, 29, 29, 0.18)",
                border: "1.5px solid rgba(239, 68, 68, 0.5)",
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: ".14em",
                  color: "#f87171",
                  fontFamily: "var(--font-term)",
                  textTransform: "uppercase",
                }}
              >
                <span>✗</span>
                <span>WRONG QUESTIONS ({report.wrongNums.length})</span>
              </div>

              {report.wrongNums.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {report.wrongNums.map((num) => (
                    <span
                      key={num}
                      style={{
                        background: "#b91c1c",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: 12.5,
                        padding: "4px 10px",
                        borderRadius: 3,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: ".08em",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                      }}
                    >
                      Question {num}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 12,
                    color: "#4ade80",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "bold",
                    letterSpacing: ".08em",
                  }}
                >
                  ★ PERFECT SCORE · ALL QUESTIONS CORRECT
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    isPaused,
    say,
    sabotage,
    submitTask,
    activeChapterId,
    setActiveChapterId,
    chapterModalOpen,
    setChapterModalOpen,
    radiometerPinCount,
    setViewMode,
  } = useGame();

  const isLocationLocked = Boolean(
    sabotage &&
    sabotage.kind === "LOCK" &&
    sabotage.until &&
    sabotage.until > Date.now()
  );

  const handleBackToBoard = useCallback(() => {
    if (isLocationLocked) {
      sfx("err");
      say("VECNA INTERFERENCE — LOCATION LOCKED · Stage movement restricted.");
      return;
    }
    sfx("click");
    if (onBackToBoard) {
      onBackToBoard();
    } else {
      setViewMode("board");
    }
  }, [isLocationLocked, onBackToBoard, say, setViewMode]);

  const isChapterAllQuestionsGiven = useCallback((chId: number) => {
    const cfg = STAGE_QUIZ_CONFIGS[chId];
    if (!cfg?.questions || cfg.questions.length === 0) return false;
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(`hawkins_quiz_answers_ch${chId}_${s.team?.id || "anon"}`)
        : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        return cfg.questions.every((_, idx) => Boolean(parsed[idx]?.trim()));
      }
    } catch {}
    return false;
  }, [s.team?.id]);

  // Solved states for all 6 chapters (Marked solved if submitted OR if all questions in section are given)
  const ch1Solved = !!s.completedTasks?.includes("ch1-quiz") || !!s.solved?.["ch1-quiz"] || !!s.team?.solvedChapters?.includes(1) || isChapterAllQuestionsGiven(1);
  const ch2Solved = !!s.completedTasks?.includes("ch2-police") || !!s.solved?.["ch2-police"] || !!s.completedTasks?.includes("ch3-case-study") || !!s.team?.solvedChapters?.includes(2) || isChapterAllQuestionsGiven(2);
  const ch3Solved = !!s.completedTasks?.includes("ch3-byers") || !!s.solved?.["ch3-byers"] || !!s.team?.solvedChapters?.includes(3) || isChapterAllQuestionsGiven(3);
  const ch4Solved = !!s.completedTasks?.includes("ch4-lab") || !!s.solved?.["ch4-lab"] || !!s.completedTasks?.includes("ch2-coding") || !!s.team?.solvedChapters?.includes(4) || isChapterAllQuestionsGiven(4);
  const ch5Solved = radiometerPinCount === 5 || s.radiometer.codeSolved || !!s.completedTasks?.includes("ch5-radio-tower") || !!s.solved?.["ch5-radio-tower"] || !!s.completedTasks?.includes("ch6-radio-tower") || !!s.team?.solvedChapters?.includes(5) || isChapterAllQuestionsGiven(5);
  const ch6Solved = !!s.completedTasks?.includes("ch6-upsidedown") || !!s.solved?.["ch6-upsidedown"] || !!s.completedTasks?.includes("ch7-upsidedown") || !!s.team?.solvedChapters?.includes(6) || isChapterAllQuestionsGiven(6);

  // Track chapters whose intro case briefing has already been shown once
  const [seenBriefings, setSeenBriefings] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hawkins_seen_briefings");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const [activeLoreChapterId, setActiveLoreChapterId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("hawkins_seen_briefings");
        const list: number[] = stored ? JSON.parse(stored) : [];
        if (list.includes(activeChapterId)) return null;
      } catch {}
    }
    return activeChapterId;
  });

  useEffect(() => {
    if (!seenBriefings.includes(activeChapterId)) {
      setActiveLoreChapterId(activeChapterId);
      setSeenBriefings((prev) => {
        if (prev.includes(activeChapterId)) return prev;
        const next = [...prev, activeChapterId];
        try {
          localStorage.setItem("hawkins_seen_briefings", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [activeChapterId, seenBriefings]);

  const [completionStoryChapterId, setCompletionStoryChapterId] = useState<number | null>(null);
  const isLoreActive = completionStoryChapterId !== null;

  // Check URL query parameters (e.g. ?chapter=6) to directly open requested chapter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const chParam = parseInt(p.get("chapter") || "", 10);
      if ([1, 2, 3, 4, 5, 6].includes(chParam)) {
        setActiveChapterId(chParam as ChapterId);
      }
    }
  }, [setActiveChapterId]);

  const currentChapter = CHAPTERS.find((c) => c.id === activeChapterId) || CHAPTERS[0];

  const isCurrentSolved =
    Boolean(s.team?.solvedChapters?.includes(currentChapter.id)) ||
    (currentChapter.id === 1
      ? ch1Solved
      : currentChapter.id === 2
      ? ch2Solved
      : currentChapter.id === 3
      ? ch3Solved
      : currentChapter.id === 4
      ? ch4Solved
      : currentChapter.id === 5
      ? ch5Solved
      : ch6Solved);

  const [quizErrorMap, setQuizErrorMap] = useState<Record<number, boolean>>({});

  const handleQuizSubmitAll = async (chapterId: ChapterId, answers: Record<number, string>) => {
    if (s.isPaused || isPaused) {
      say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
      sfx("err");
      return;
    }
    const cfg = STAGE_QUIZ_CONFIGS[chapterId];
    if (!cfg) return;

    const taskId = CHAPTERS.find((c) => c.id === chapterId)?.taskId || `ch${chapterId}`;
    
    // Submit each question securely to server (Trusted validation against database)
    const questions = cfg.questions || [];
    let correctCount = 0;
    let totalPointsAwarded = 0;
    let serverResponded = false;

    // First attempt authoritative validation on Express backend (Port 5000)
    const answersArray = questions.map((_, idx) => answers[idx] || "");
    try {
      const valRes = await validateChapterOnServer(chapterId, taskId, answersArray, s.team?.id);
      if (valRes && valRes.success) {
        serverResponded = true;
        correctCount = typeof (valRes as any).correctCount === "number" ? (valRes as any).correctCount : 0;
        totalPointsAwarded = typeof valRes.pointsAwarded === "number" ? valRes.pointsAwarded : 0;
      } else if (valRes && (valRes.error === "EVENT_PAUSED" || (valRes as any).status === 403)) {
        say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        sfx("err");
        return;
      }
    } catch (e: any) {
      if (e?.response?.status === 403 || e?.status === 403 || e?.message?.includes("EVENT_PAUSED")) {
        say("HAWKINS COMMAND: TOURNAMENT PAUSED BY ADMINISTRATOR");
        sfx("err");
        return;
      }
      console.warn("[CHAPTER BACKEND VALIDATION FALLBACK]", e);
    }

    // Authoritative backend validation enforcement: reject offline local evaluation
    if (!serverResponded) {
      say("HAWKINS MAINFRAME OFFLINE: Central server unreachable. Solutions cannot be evaluated offline.");
      sfx("err");
      return;
    }

    // Calculate actual points earned from this chapter's questions (respecting 10 vs 5 pts per attempt)
    let sectionPointsEarned = 0;
    const teamId = s.team?.id || "anon";

    // Ensure submitted answers are stored
    try {
      localStorage.setItem(`hawkins_quiz_answers_ch${chapterId}_${teamId}`, JSON.stringify(answers));
    } catch {}

    // Evaluate and persist question results so Chapter Completion report has complete accurate data
    try {
      let currentResults: Record<number, any> = {};
      const stored = localStorage.getItem(`hawkins_quiz_results_ch${chapterId}_${teamId}`);
      if (stored) {
        try {
          currentResults = JSON.parse(stored);
        } catch {}
      }
      questions.forEach((q, idx) => {
        if (!currentResults[idx] || typeof currentResults[idx].isCorrect !== "boolean") {
          const userAns = answers[idx];
          const isCorrect = Boolean(
            userAns &&
            q.correctAnswerId &&
            String(userAns).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase()
          );
          currentResults[idx] = {
            isCorrect,
            isLocked: true,
            pointsAwarded: isCorrect ? 10 : 0,
            message: isCorrect ? "VERIFIED [+10 PTS]" : "INCORRECT [0 PTS]",
          };
        }
      });
      localStorage.setItem(`hawkins_quiz_results_ch${chapterId}_${teamId}`, JSON.stringify(currentResults));
    } catch {}

    try {
      const stored = localStorage.getItem(`hawkins_quiz_results_ch${chapterId}_${teamId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        questions.forEach((_, idx) => {
          if (parsed[idx]?.isCorrect) {
            sectionPointsEarned += typeof parsed[idx].pointsAwarded === "number" ? parsed[idx].pointsAwarded : 10;
          }
        });
      }
    } catch {}

    if (sectionPointsEarned === 0) {
      questions.forEach((q, idx) => {
        const ans = answers[idx];
        if (ans && q.correctAnswerId && String(ans).trim().toLowerCase() === String(q.correctAnswerId).trim().toLowerCase()) {
          sectionPointsEarned += 10;
        }
      });
    }

    const finalPoints = totalPointsAwarded > 0 ? totalPointsAwarded : sectionPointsEarned;

    sfx("ok");
    submitTask(
      taskId,
      finalPoints,
      `Chapter ${chapterId} Docket Verified (${correctCount}/${questions.length} Solved)`,
      true
    );
    // Stay on chapter without abruptly going back
  };

  // Automatically submit report to server and store when all questions in the active section are given
  useEffect(() => {
    if (isChapterAllQuestionsGiven(currentChapter.id)) {
      const isAlreadySubmitted =
        Boolean(s.team?.solvedChapters?.includes(currentChapter.id)) ||
        Boolean(s.completedTasks?.includes(`ch${currentChapter.id}-quiz`)) ||
        Boolean(s.completedTasks?.includes(currentChapter.taskId));
      if (!isAlreadySubmitted) {
        try {
          const raw = localStorage.getItem(`hawkins_quiz_answers_ch${currentChapter.id}_${s.team?.id || "anon"}`);
          const answers = raw ? JSON.parse(raw) : {};
          handleQuizSubmitAll(currentChapter.id, answers);
        } catch {}
      }
    }
  }, [currentChapter.id, currentChapter.taskId, isChapterAllQuestionsGiven, s.team?.solvedChapters, s.completedTasks, s.team?.id]);

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        paddingTop: "64px",
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
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
                    if (isLocationLocked) {
                      sfx("err");
                      say("VECNA INTERFERENCE — LOCATION LOCKED · Stage movement restricted.");
                      return;
                    }
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

      {/* Main Single Challenge Section (Full-width section instead of a window) */}
      <motion.div
        key={`task-${currentChapter.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          width: "100%",
          minHeight: "calc(100vh - 64px)",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          boxSizing: "border-box",
        }}
      >
        {isCurrentSolved ? (
          <ChapterCompletionView
            chapter={currentChapter}
            isLastEpisode={currentChapter.id >= CHAPTERS[CHAPTERS.length - 1].id}
            onNextEpisode={() => {
              if (isLocationLocked) {
                sfx("err");
                say("VECNA INTERFERENCE — LOCATION LOCKED · Stage movement restricted.");
                return;
              }
              sfx("ok");
              if (currentChapter.id < CHAPTERS[CHAPTERS.length - 1].id) {
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
