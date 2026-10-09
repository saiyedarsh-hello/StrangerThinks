import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import PushPin from "./PushPin";

interface InvestigationBoardProps {
  onSelectChapter?: (chapterId: number) => void;
  activeChapterId?: number;
}

interface CaseCardData {
  id: number;
  title: string;
  subtitle?: string;
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
    imgSrc: "/hawkins-town-bg.jpg",
    checkpoints: [
      "Enter Civic District",
      "Multiple-choice inquiry",
      "MKUltra & 1983 incident lore",
      "Municipal telemetry pulse",
    ],
    stageKey: "hawkins",
  },
  {
    id: 2,
    title: "POLICE STATION",
    imgSrc: "/hawkins-police-bg.jpg",
    checkpoints: [
      "Hopper's desk dossier",
      "Analyze incident reports",
      "Evidence & witness statements",
      "Epicenter correlation",
    ],
    stageKey: "lab",
  },
  {
    id: 3,
    title: "BYERS HOUSE",
    imgSrc: "/hawkins-bg.jpg",
    checkpoints: [
      "Living room wall interface",
      "Christmas lights alphabet",
      "Rearrange scrambled messages",
      "Will's warning: DO NOT OPEN",
    ],
    stageKey: "will",
  },
  {
    id: 4,
    title: "HAWKINS LAB",
    imgSrc: "/hawkins-lab-bg.jpg",
    checkpoints: [
      "Sublevel 3 mainframe terminal",
      "Interactive technical routines",
      "Parity logic loop analysis",
      "Buffer overflow resolution",
    ],
    stageKey: "forest",
  },
  {
    id: 5,
    title: "THE FOREST",
    imgSrc: "/creel-bg.jpg",
    checkpoints: [
      "Deep woods near Trail 7",
      "Match related clues & vectors",
      "Identify entity relationships",
      "Carved pine rune triangulation",
    ],
    stageKey: "gate",
  },
  {
    id: 6,
    title: "RADIO TOWER",
    imgSrc: "/hawkins-gate-bg.jpg",
    checkpoints: [
      "East Hill radio tower sublevel",
      "Decode hidden signals & Morse",
      "Calibrate 5-pin radiometer",
      "Clear dimensional interference",
    ],
    stageKey: "upsidedown",
  },
  {
    id: 7,
    title: "THE GATE RIFT",
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

export { PushPin };

export default function InvestigationBoard({
  onSelectChapter,
  activeChapterId = 1,
}: InvestigationBoardProps) {
  const { s, score } = useGame();
  const [selectedCardId, setSelectedCardId] = useState<number>(activeChapterId);

  // Refs for measuring card positions for the red string overlay
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [pinPoints, setPinPoints] = useState<{ x: number; y: number }[]>([]);

  // Compute pin anchor positions relative to the grid container
  const updatePinPoints = useCallback(() => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const pts = cardRefs.current.map((el) => {
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      // Pin is at top-right of the card: right=16px from right edge, top=-13px
      return {
        x: r.right - gridRect.left - 16 - 12, // ~12px = half pin size
        y: r.top - gridRect.top + 0,           // pin is -13px above card top
      };
    });
    setPinPoints(pts);
  }, []);

  useEffect(() => {
    updatePinPoints();
    window.addEventListener("resize", updatePinPoints);
    return () => window.removeEventListener("resize", updatePinPoints);
  }, [updatePinPoints]);

  // Check if a chapter is cleared
  const isChapterCleared = useCallback(
    (chapterId: number) => {
      const taskIds = [
        `ch${chapterId}`,
        `ch${chapterId}-quiz`,
        `ch${chapterId}-police`,
        `ch${chapterId}-byers`,
        `ch${chapterId}-lab`,
        `ch${chapterId}-forest`,
        `ch${chapterId}-radio-tower`,
        `ch${chapterId}-gate`,
      ];
      if (chapterId === 1 && (s.completedTasks.includes("town-1") || s.solved["town-1"])) return true;
      if (chapterId === 4 && (s.completedTasks.includes("lab-terminal") || s.solved["lab-terminal"])) return true;
      if (chapterId === 5 && (s.completedTasks.includes("forest-marks") || s.solved["forest-marks"])) return true;
      if (chapterId === 6 && (s.completedTasks.includes("tower-pins") || s.solved["tower-pins"] || s.radiometer?.pinsSolved?.every(Boolean))) return true;
      if (chapterId === 7 && (s.completedTasks.includes("gate-unlock") || s.solved["gate-unlock"])) return true;

      return taskIds.some((tid) => s.completedTasks.includes(tid) || !!s.solved[tid]);
    },
    [s.completedTasks, s.solved, s.radiometer]
  );

  // Check if a chapter is unlocked:
  // First, only Stage 1 is unlocked. Subsequent stages (2..7) only unlock when the previous stage is cleared.
  const isChapterUnlocked = useCallback(
    (chapterId: number) => {
      if (chapterId === 1) return true;
      return isChapterCleared(chapterId - 1);
    },
    [isChapterCleared]
  );

  const handleCardClick = (card: CaseCardData) => {
    if (!isChapterUnlocked(card.id)) return;
    sfx("click");
    setSelectedCardId(card.id);
    if (onSelectChapter) {
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
        padding: "114px 28px 120px 28px",
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
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)" }}>
              <PushPin size={28} angle={-6} />
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
              <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)" }}>
                <PushPin size={24} angle={12} color="#e53935" />
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
              <div style={{ position: "absolute", top: "-11px", left: "12px" }}>
                <PushPin size={22} angle={-10} color="#d32f2f" />
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
              <div style={{ position: "absolute", top: "-12px", right: "20px" }}>
                <PushPin size={24} angle={8} color="#fbc02d" />
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
          {/* 7 Case Cards Grid */}
          <div
            ref={gridRef}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              position: "relative",
            }}
          >
            {/* ── Red String Thread SVG Overlay ── */}
            {pinPoints.length === CASE_CARDS.length && (
              <svg
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 20,
                  overflow: "visible",
                }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="string-glow">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Draw thread between consecutive pins with slight sag */}
                {pinPoints.map((pt, i) => {
                  if (i === 0) return null;
                  const prev = pinPoints[i - 1];
                  // Control point: midpoint dropped down slightly for string sag
                  const mx = (prev.x + pt.x) / 2;
                  const my = (prev.y + pt.y) / 2 + 22;
                  return (
                    <g key={`thread-${i}`}>
                      {/* Shadow/depth string */}
                      <path
                        d={`M ${prev.x} ${prev.y} Q ${mx} ${my} ${pt.x} ${pt.y}`}
                        stroke="rgba(80,0,0,0.45)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Main red string */}
                      <path
                        d={`M ${prev.x} ${prev.y} Q ${mx} ${my} ${pt.x} ${pt.y}`}
                        stroke="#cc1111"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                        filter="url(#string-glow)"
                        opacity="0.92"
                      />
                      {/* Highlight thread fiber */}
                      <path
                        d={`M ${prev.x} ${prev.y} Q ${mx} ${my - 1} ${pt.x} ${pt.y}`}
                        stroke="rgba(255,120,120,0.35)"
                        strokeWidth="0.7"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
                {/* Cross-thread: card 1 → 3, card 2 → 4, card 3 → 5 (web effect) */}
                {[
                  [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
                ].map(([a, b]) => {
                  if (!pinPoints[a] || !pinPoints[b]) return null;
                  const pa = pinPoints[a];
                  const pb = pinPoints[b];
                  const mx = (pa.x + pb.x) / 2;
                  const my = (pa.y + pb.y) / 2 + 14;
                  return (
                    <g key={`cross-${a}-${b}`}>
                      <path
                        d={`M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`}
                        stroke="rgba(80,0,0,0.3)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <path
                        d={`M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`}
                        stroke="#aa0000"
                        strokeWidth="1.2"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.65"
                        strokeDasharray="none"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {CASE_CARDS.map((card, idx) => {
              const unlocked = isChapterUnlocked(card.id);
              const isSelected = selectedCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el as HTMLDivElement | null;
                    // Re-measure after each card mounts
                    if (el) requestAnimationFrame(updatePinPoints);
                  }}
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
                  <div style={{ position: "absolute", top: "-13px", right: "16px" }}>
                    <PushPin
                      color={unlocked ? (idx % 3 === 0 ? "#d32f2f" : idx % 3 === 1 ? "#c62828" : "#b71c1c") : "#607d8b"}
                      size={25}
                      angle={idx % 2 === 0 ? -12 : 10}
                    />
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
                      {card.subtitle && (
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
                      )}
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

                  {/* Action Button: [ ENTER CHAPTER → ] or [ REVISIT (CLEARED) ] or [ LOCKED ] */}
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
                      background: isChapterCleared(card.id)
                        ? "#2e7d32"
                        : unlocked
                        ? "#d91e2b"
                        : "#8f8275",
                      color: "#ffffff",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "13px",
                      fontWeight: "bold",
                      letterSpacing: "0.15em",
                      border: "none",
                      borderRadius: "2px",
                      cursor: unlocked ? "pointer" : "not-allowed",
                      boxShadow: unlocked
                        ? "0 2px 8px rgba(0, 0, 0, 0.35)"
                        : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isChapterCleared(card.id)
                      ? "✓ REVISIT (CLEARED)"
                      : unlocked
                      ? "ENTER CHAPTER"
                      : `🔒 LOCKED (STAGE ${card.id - 1})`}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────────────
              RIGHT SIDEBAR: THE TIMELINE NOTEPAD (NON-CLICKABLE PROGRESSION READOUT)
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
              pointerEvents: "none",
              userSelect: "none",
              cursor: "default",
            }}
          >
            {/* Pushpin at top center */}
            <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)" }}>
              <PushPin size={26} angle={-6} />
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

            {/* List of 1 through 7 stages */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {CASE_CARDS.map((card) => {
                const cleared = isChapterCleared(card.id);
                const unlocked = isChapterUnlocked(card.id);

                return (
                  <div
                    key={card.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "4px 6px",
                      borderRadius: "2px",
                      cursor: "default",
                    }}
                  >
                    {/* Circle Badge */}
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: cleared ? "#2e7d32" : unlocked ? "#d91e2b" : "#c4b8aa",
                        color: "#ffffff",
                        fontSize: cleared ? "13px" : "12px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {cleared ? "✓" : card.id}
                    </div>

                    {/* Chapter Title & Status */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: cleared ? "#1b5e20" : unlocked ? "#1c1814" : "#8a8075",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          textDecoration: cleared ? "line-through" : "none",
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: cleared
                            ? "#2e7d32"
                            : unlocked
                            ? "#d91e2b"
                            : "#a3988b",
                          fontWeight: "bold",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {cleared
                          ? "✓ CLEARED (+50 PTS)"
                          : unlocked
                          ? "READY TO ACCESS"
                          : `LOCKED [STAGE ${card.id - 1} REQ]`}
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
