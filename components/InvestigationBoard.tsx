"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";

interface InvestigationBoardProps {
  onSelectChapter?: (chapterId: number) => void;
  activeChapterId?: number;
}

interface CaseCardData {
  id: number;
  title: string;
  subtitle: string;
  imgSrc: string;
  checkpoints: string[];
  note?: string;
  noteColor?: "yellow" | "red" | "white";
  stageKey: string;
}

const CASE_CARDS: CaseCardData[] = [
  {
    id: 1,
    title: "HAWKINS TOWN",
    subtitle: "1. QUIZ QUESTIONS (SERIES LORE)",
    imgSrc: "/hawkins-town-bg.jpg",
    checkpoints: [
      "Enter Civic District",
      "Multiple-choice inquiry",
      "MKUltra & 1983 incident lore",
      "Municipal telemetry pulse",
    ],
    note: "Prepared by: Hala · Roshni · Pooja",
    noteColor: "yellow",
    stageKey: "hawkins",
  },
  {
    id: 2,
    title: "POLICE STATION",
    subtitle: "4. CASE STUDY QUESTIONS",
    imgSrc: "/hawkins-police-bg.jpg",
    checkpoints: [
      "Hopper's desk dossier",
      "Analyze incident reports",
      "Evidence & witness statements",
      "Epicenter correlation",
    ],
    note: "Prepared by: Bhagya · Tanuj · Apurv",
    noteColor: "yellow",
    stageKey: "lab",
  },
  {
    id: 3,
    title: "BYERS HOUSE",
    subtitle: "3. REARRANGE QUESTIONS",
    imgSrc: "/hawkins-bg.jpg",
    checkpoints: [
      "Living room wall interface",
      "Christmas lights alphabet",
      "Rearrange scrambled messages",
      "Will's warning: DO NOT OPEN",
    ],
    note: "Prepared by: Harisha · Vijay · Sonam",
    noteColor: "red",
    stageKey: "will",
  },
  {
    id: 4,
    title: "HAWKINS LAB",
    subtitle: "7. LAB-TYPE TASKS",
    imgSrc: "/hawkins-lab-bg.jpg",
    checkpoints: [
      "Sublevel 3 mainframe terminal",
      "Interactive technical routines",
      "Parity logic loop analysis",
      "Buffer overflow resolution",
    ],
    note: "Prepared by: Madhav · Nilotpal Deb · Yashas",
    noteColor: "yellow",
    stageKey: "forest",
  },
  {
    id: 5,
    title: "THE FOREST",
    subtitle: "2. CONNECTION QUESTIONS",
    imgSrc: "/creel-bg.jpg",
    checkpoints: [
      "Deep woods near Trail 7",
      "Match related clues & vectors",
      "Identify entity relationships",
      "Carved pine rune triangulation",
    ],
    note: "Prepared by: Ali · Ram · Khushi",
    noteColor: "yellow",
    stageKey: "gate",
  },
  {
    id: 6,
    title: "RADIO TOWER",
    subtitle: "6. RADIO TRANSMISSION",
    imgSrc: "/hawkins-gate-bg.jpg",
    checkpoints: [
      "East Hill radio tower sublevel",
      "Decode hidden signals & Morse",
      "Calibrate 5-pin radiometer",
      "Clear dimensional interference",
    ],
    note: "Prepared by: Aparna · Kushal · Chinmay",
    noteColor: "yellow",
    stageKey: "upsidedown",
  },
  {
    id: 7,
    title: "THE GATE RIFT",
    subtitle: "FINALE · VECNA'S MIND",
    imgSrc: "/upsidedown-bg.jpg",
    checkpoints: [
      "Parallel abyss threshold",
      "Decode Experiment 001 cipher",
      "Sever Vecna's psychic link",
      "Seal the dimensional tear",
    ],
    note: "★ GRAND FINALE · HAWKINS TOURNAMENT VICTORY",
    noteColor: "red",
    stageKey: "mind",
  },
];

/* 3D Realistic PushPin Component */
export function PushPin({ color = "#d32f2f", size = 18 }: { color?: string; size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        filter: "drop-shadow(2px 4px 3px rgba(0,0,0,0.65))",
        zIndex: 5,
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, #ff8a80 0%, ${color} 50%, #5d0000 100%)`,
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

export default function InvestigationBoard({
  onSelectChapter,
  activeChapterId = 1,
}: InvestigationBoardProps) {
  const { s, score } = useGame();
  const [selectedCardId, setSelectedCardId] = useState<number>(activeChapterId);

  // All chapters unlocked for immediate player and organizer access
  const isChapterUnlocked = (id: number) => {
    return true;
  };

  const handleCardClick = (card: CaseCardData) => {
    sfx("click");
    setSelectedCardId(card.id);
    if (isChapterUnlocked(card.id) && onSelectChapter) {
      onSelectChapter(card.id);
    }
  };

  return (
    <div
      className="investigation-board-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        maxHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        background: "radial-gradient(circle at 50% 40%, #362216 0%, #1e110a 70%, #0d0603 100%)",
        padding: "86px 28px 120px 28px",
        boxSizing: "border-box",
        fontFamily: '"Share Tech Mono", monospace',
        color: "#212121",
        scrollBehavior: "smooth",
      }}
    >
      {/* Realistic Corkboard Texture Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.2) 15%, transparent 16%), radial-gradient(rgba(0,0,0,0.15) 15%, transparent 16%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 8px 8px",
          opacity: 0.65,
          pointerEvents: "none",
        }}
      />

      {/* Atmospheric Vignette & Soft Dust */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.85)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1520px",
          margin: "0 auto",
        }}
      >
        {/* ───────────────────────────────────────────────────────────────────
            TOP ROW: HAWKINS PROTOCOL BANNER + POLAROID + STICKY NOTE + SCORECARD
            ─────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "flex-start",
            gap: "24px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          {/* Main Title Parchment */}
          <div
            style={{
              position: "relative",
              background: "#f4ede2",
              padding: "18px 36px 16px 36px",
              boxShadow: "2px 6px 18px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)",
              borderRadius: "2px",
              border: "1px solid #d5c8b5",
              transform: "rotate(-0.5deg)",
              minWidth: "340px",
            }}
          >
            <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)" }}>
              <PushPin />
            </div>
            <h1
              style={{
                fontFamily:
                  '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                fontSize: "clamp(26px, 3.2vw, 42px)",
                fontWeight: 900,
                color: "#d91e2b",
                letterSpacing: "0.06em",
                margin: 0,
                lineHeight: 1,
                textTransform: "uppercase",
                textShadow: "1px 1px 0 rgba(0,0,0,0.15)",
              }}
            >
              HAWKINS PROTOCOL
            </h1>
            <div
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "14px",
                letterSpacing: "0.32em",
                fontWeight: "bold",
                color: "#2a221b",
                marginTop: "6px",
                textTransform: "uppercase",
              }}
            >
              INVESTIGATION BOARD
            </div>
          </div>

          {/* Polaroid & Red Tape Cluster */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
              marginTop: "4px",
            }}
          >
            {/* Polaroid */}
            <div
              style={{
                position: "relative",
                background: "#ffffff",
                padding: "8px 8px 18px 8px",
                boxShadow: "2px 6px 14px rgba(0,0,0,0.55)",
                transform: "rotate(-2.5deg)",
                width: "115px",
                textAlign: "center",
              }}
            >
              <div style={{ position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)" }}>
                <PushPin />
              </div>
              <div
                style={{
                  width: "100%",
                  height: "75px",
                  background: "#080c10",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src="/hawkins-town-bg.jpg"
                  alt="Hawkins 1986"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: "#1a1a1a",
                  marginTop: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                HAWKINS 1986
              </div>
            </div>

            {/* Red Tape: EVERYTHING IS CONNECTED. */}
            <div
              style={{
                position: "relative",
                background: "#f7f1e5",
                padding: "8px 22px",
                boxShadow: "2px 4px 10px rgba(0,0,0,0.45)",
                transform: "rotate(1deg)",
                border: "1px solid #d5c8b5",
              }}
            >
              <div style={{ position: "absolute", top: "-8px", left: "14px" }}>
                <PushPin />
              </div>
              <span
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "13px",
                  fontWeight: 900,
                  color: "#d91e2b",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                EVERYTHING IS CONNECTED.
              </span>
            </div>
          </div>

          {/* Top-Right Yellow Sticky Note & Score Stamp */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
            {/* Yellow Sticky Note */}
            <div
              style={{
                position: "relative",
                background: "#fff9a6",
                padding: "16px 20px",
                boxShadow: "3px 6px 14px rgba(0,0,0,0.5)",
                transform: "rotate(1.2deg)",
                maxWidth: "340px",
                fontSize: "13px",
                lineHeight: "1.45",
                fontWeight: "bold",
                color: "#2b2510",
              }}
            >
              <div style={{ position: "absolute", top: "-8px", right: "20px" }}>
                <PushPin />
              </div>
              <div>SOMETHING STRANGE IS HAPPENING IN HAWKINS. FOLLOW THE CLUES. SOLVE THE TASKS. UNLOCK THE TRUTH.</div>
              <div
                style={{
                  color: "#d91e2b",
                  marginTop: "8px",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                }}
              >
                HAWKINS, INDIANA · 1986
              </div>
            </div>

          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────
            MAIN SECTION: CASE CARDS GRID (LEFT) + TIMELINE NOTEPAD (RIGHT)
            ─────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 310px",
            gap: "28px",
            alignItems: "flex-start",
          }}
        >
          {/* 8 Case Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {CASE_CARDS.map((card, idx) => {
              const unlocked = isChapterUnlocked(card.id);
              const isSelected = selectedCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => handleCardClick(card)}
                  style={{
                    position: "relative",
                    background: unlocked ? "#f7f1e5" : "#ded6c8",
                    borderRadius: "2px",
                    padding: "16px",
                    boxShadow: isSelected
                      ? "0 0 0 2px #d91e2b, 4px 8px 20px rgba(0,0,0,0.6)"
                      : "3px 6px 16px rgba(0,0,0,0.5)",
                    border: "1px solid #c9beae",
                    cursor: unlocked ? "pointer" : "not-allowed",
                    transform: `rotate(${idx % 2 === 0 ? "-0.8deg" : "0.8deg"})`,
                    transition: "box-shadow 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "380px",
                  }}
                >
                  {/* Top Pushpin */}
                  <div style={{ position: "absolute", top: "-10px", right: "16px" }}>
                    <PushPin color={unlocked ? "#d32f2f" : "#757575"} />
                  </div>

                  {/* Card Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                    <div
                      style={{
                        background: unlocked ? "#d91e2b" : "#7d6b63",
                        color: "#ffffff",
                        fontWeight: 900,
                        fontSize: "14px",
                        padding: "3px 8px",
                        borderRadius: "2px",
                        fontFamily: '"Share Tech Mono", monospace',
                      }}
                    >
                      {card.id}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: '"Share Tech Mono", monospace',
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#1c1814",
                          letterSpacing: "0.04em",
                          lineHeight: 1.1,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          color: "#7a6d63",
                          letterSpacing: "0.1em",
                          marginTop: "2px",
                        }}
                      >
                        {card.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Image Container with Lock Overlay */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "135px",
                      background: "#111",
                      borderRadius: "2px",
                      overflow: "hidden",
                      marginBottom: "14px",
                    }}
                  >
                    <img
                      src={card.imgSrc}
                      alt={card.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: unlocked ? "brightness(0.9) contrast(1.1)" : "brightness(0.4) grayscale(0.8)",
                      }}
                    />

                    {/* Locked Badge if not unlocked */}
                    {!unlocked && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(10, 5, 5, 0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          color: "#e09060",
                          fontFamily: '"Share Tech Mono", monospace',
                          fontSize: "14px",
                          fontWeight: "bold",
                          letterSpacing: "0.15em",
                        }}
                      >
                        <span>🔒</span> LOCKED
                      </div>
                    )}
                  </div>

                  {/* Checkpoints / Evidence List */}
                  <div
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      lineHeight: "1.6",
                      color: unlocked ? "#3a3028" : "#6a6058",
                      marginBottom: "14px",
                    }}
                  >
                    {card.checkpoints.map((item, cIdx) => (
                      <div key={cIdx} style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span style={{ color: unlocked ? "#d91e2b" : "#888" }}>•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Attached Sticky Note (if any) */}
                  {card.note && (
                    <div
                      style={{
                        background:
                          card.noteColor === "yellow"
                            ? "#fff9a6"
                            : card.noteColor === "red"
                            ? "#ffcdd2"
                            : "#ffffff",
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: card.noteColor === "red" ? "#b71c1c" : "#2b2510",
                        boxShadow: "1px 3px 6px rgba(0,0,0,0.25)",
                        transform: "rotate(-1.5deg)",
                        marginBottom: "12px",
                        borderLeft: `3px solid ${card.noteColor === "red" ? "#d32f2f" : "#fbc02d"}`,
                      }}
                    >
                      {card.note}
                    </div>
                  )}

                  {/* Action Button: [ ENTER CHAPTER → ] or [ LOCKED ] */}
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(card);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: unlocked ? "#d91e2b" : "#a39587",
                      color: "#ffffff",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "13px",
                      fontWeight: "bold",
                      letterSpacing: "0.15em",
                      border: "none",
                      borderRadius: "2px",
                      cursor: unlocked ? "pointer" : "not-allowed",
                      boxShadow: unlocked
                        ? "0 2px 8px rgba(217, 30, 43, 0.45)"
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {unlocked ? "ENTER CHAPTER →" : "LOCKED"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────────────
              RIGHT SIDEBAR: THE TIMELINE NOTEPAD
              ─────────────────────────────────────────────────────────────────── */}
          <div
            style={{
              position: "relative",
              background: "#ffffff",
              padding: "24px 20px",
              boxShadow: "3px 6px 18px rgba(0,0,0,0.55)",
              border: "1px solid #d5c8b5",
              transform: "rotate(0.8deg)",
              backgroundImage:
                "repeating-linear-gradient(#fff, #fff 24px, #e8f0fe 25px, #fff 26px)",
            }}
          >
            {/* Pushpin at top center */}
            <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)" }}>
              <PushPin />
            </div>

            {/* Red Timeline Header with decorative underline */}
            <h2
              style={{
                fontFamily:
                  '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                fontSize: "22px",
                fontWeight: 900,
                color: "#d91e2b",
                letterSpacing: "0.12em",
                margin: "0 0 16px 0",
                textAlign: "center",
                textTransform: "uppercase",
                borderBottom: "2px solid #d91e2b",
                paddingBottom: "8px",
              }}
            >
              THE TIMELINE
            </h2>

            {/* List of 1 through 8 chapters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {CASE_CARDS.map((card) => {
                const unlocked = isChapterUnlocked(card.id);
                const isCurrent = selectedCardId === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: unlocked ? "pointer" : "default",
                      padding: "4px 6px",
                      borderRadius: "2px",
                      background: isCurrent ? "rgba(217, 30, 43, 0.08)" : "transparent",
                    }}
                  >
                    {/* Circle Badge */}
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: unlocked ? "#d91e2b" : "#c4b8aa",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.id}
                    </div>

                    {/* Chapter Title & Status */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: unlocked ? "#1c1814" : "#8a8075",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: unlocked ? (card.id === 1 ? "#d91e2b" : "#558b2f") : "#a3988b",
                          fontWeight: "bold",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {unlocked ? (card.id === 1 ? "READY TO ACCESS" : "UNLOCKED") : "LOCKED"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
