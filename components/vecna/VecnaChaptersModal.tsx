"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import PushPin from "@/components/PushPin";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

export interface VecnaChapterCardData {
  id: number;
  shortName: string;
  title: string;
  subtitle: string;
  category: string;
  points: number;
  bgSrc: string;
  surveillanceSector: string;
  briefing: string;
  annotation: string;
  pinColor: string;
  rotation: number;
  verticalOffset: number;
  xPos: number;
  yPos: number;
}

export const VECNA_CHAPTER_DATA: VecnaChapterCardData[] = [
  {
    id: 1,
    shortName: "QUIZ // SECTOR-01",
    title: "HAWKINS NATIONAL LABORATORY",
    subtitle: "SUBLEVEL 04 // SERIES LORE & LOGIC",
    category: "SERIES KNOWLEDGE",
    points: 200,
    bgSrc: "/hawkins-lab-bg.jpg",
    surveillanceSector: "HAWKINS LAB — U.S. DEPT OF ENERGY // RESTRICTED",
    briefing:
      "Sublevel 04 isolation facility. Ground zero for psionic amplification and sensory deprivation protocols. Complete initial intelligence diagnostics to map the breach.",
    annotation: '"heavy electromagnetic disturbance detected near isolation tank"',
    pinColor: "#d32f2f",
    rotation: -1.8,
    verticalOffset: 25,
    xPos: 160,
    yPos: 140,
  },
  {
    id: 2,
    shortName: "CONNECTION // SECTOR-02",
    title: "BYERS RESIDENCE & SHADOW WOODS",
    subtitle: "PERIMETER GRID // MATCH CLUES & ARTIFACTS",
    category: "RELATIONSHIP MAPPING",
    points: 200,
    bgSrc: "/hawkins-police-bg.jpg",
    surveillanceSector: "BYERS RESIDENCE — MIRCLE ST. // ANOMALY DETECTED",
    briefing:
      "Christmas light signaling grid and surrounding woods. Correlate artifacts, locations, and personnel to trace psychic resonance across dimensional boundaries.",
    annotation: '"lights pulsing in rhythmic sequences along wall alphabets"',
    pinColor: "#ffb454",
    rotation: 2.2,
    verticalOffset: -35,
    xPos: 680,
    yPos: 260,
  },
  {
    id: 3,
    shortName: "REARRANGE // SECTOR-03",
    title: "CREEL HOUSE // ATTIC CHAMBER",
    subtitle: "TEMPORAL ANCHOR // SEQUENCE RESTORATION",
    category: "SEQUENCE RESTORATION",
    points: 200,
    bgSrc: "/creel-bg.jpg",
    surveillanceSector: "CREEL ESTATE — ATTIC SANCTUM // PSYCHIC CONVERGENCE",
    briefing:
      "The architectural core of Vecna's memory construct. Grandfather clock ticking out of phase with linear time. Decrypt scrambled chronological statements and code strings.",
    annotation: '"grandfather clock chime echoes four distinct times at dusk"',
    pinColor: "#ff2d3a",
    rotation: -2.5,
    verticalOffset: 45,
    xPos: 1200,
    yPos: 130,
  },
  {
    id: 4,
    shortName: "CASE STUDY // SECTOR-04",
    title: "HAWKINS DOWNTOWN & HIGH SCHOOL",
    subtitle: "INCIDENT DOSSIER // FORENSIC ANALYSIS",
    category: "INVESTIGATIVE ANALYSIS",
    points: 200,
    bgSrc: "/hawkins-town-bg.jpg",
    surveillanceSector: "HAWKINS HIGH & ARCADE // CIVIC AREA SURVEILLANCE",
    briefing:
      "Coroner records and police evidence logs from the 1986 wave of trance-state victims. Examine forensic field files and draw precise investigative conclusions.",
    annotation: '"student vehicle abandoned with tape deck running on loop"',
    pinColor: "#36e0c4",
    rotation: 1.5,
    verticalOffset: -40,
    xPos: 1720,
    yPos: 280,
  },
  {
    id: 5,
    shortName: "RADIO // SECTOR-05",
    title: "RADIO TOWER & RUSSIAN INTERCEPT",
    subtitle: "FREQUENCY HARMONICS // SIGNAL DECRYPTION",
    category: "SIGNAL DECODING",
    points: 200,
    bgSrc: "/hawkins-gate-bg.jpg",
    surveillanceSector: "HIGH FREQUENCY ARRAY — CEREBRO PEAK // CARRIER SIGNALS",
    briefing:
      "Russian audio surveillance intercepted beneath the mall and broadcast across civilian ham radio bands. Transcribe Morse code, binary patterns, and audio ciphers.",
    annotation: '"club radio picked up rhythmic carrier tones at 432.8 MHz"',
    pinColor: "#ffb454",
    rotation: -1.2,
    verticalOffset: 30,
    xPos: 2240,
    yPos: 140,
  },
  {
    id: 6,
    shortName: "LAB TASKS // SECTOR-06",
    title: "THE GATE RIFT & CENTRAL VOID",
    subtitle: "FINAL GATEWAY // SYSTEM OVERRIDE PROTOCOL",
    category: "TECHNICAL EXPERIMENTS",
    points: 200,
    bgSrc: "/upsidedown-bg.jpg",
    surveillanceSector: "SUB-TERRANEAN VOID // FOURTH GATE CONVERGENCE",
    briefing:
      "The subterranean breach connecting Hawkins to the red lightning expanse. Execute critical system overrides, mainframe commands, and terminal diagnostic tasks.",
    annotation: '"spatial tear expanding through bedrock into the upside down"',
    pinColor: "#ff2d3a",
    rotation: 2.0,
    verticalOffset: -20,
    xPos: 2760,
    yPos: 250,
  },
];

interface VecnaChaptersModalProps {
  isOpen: boolean;
  activeTrialId: number;
  solvedQuestions: Record<string, boolean>;
  failedQuestions?: Record<string, boolean>;
  unlockedStages?: number[];
  onSelectTrial: (trialId: number) => void;
  onClose: () => void;
}

export default function VecnaChaptersModal({
  isOpen,
  activeTrialId,
  solvedQuestions,
  failedQuestions = {},
  unlockedStages = [1],
  onSelectTrial,
  onClose,
}: VecnaChaptersModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [inspectedChapter, setInspectedChapter] = useState<VecnaChapterCardData | null>(null);

  // Mouse drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Center on active trial on mount
  useEffect(() => {
    if (!isOpen) return;
    const activeData = VECNA_CHAPTER_DATA.find((ch) => ch.id === activeTrialId);
    if (activeData && scrollContainerRef.current) {
      const targetScroll = Math.max(0, activeData.xPos - window.innerWidth / 2 + 180);
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  }, [isOpen, activeTrialId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftPos(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const scrollByDelta = (delta: number) => {
    sfx("click");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  const isStageCleared = useCallback(
    (stageId: number) => {
      const qs = STAGE_QUIZ_CONFIGS[stageId]?.questions || [];
      return (
        qs.length > 0 &&
        qs.every(
          (_, idx) => !!solvedQuestions[`${stageId}-${idx}`] || !!failedQuestions[`${stageId}-${idx}`]
        )
      );
    },
    [solvedQuestions, failedQuestions]
  );

  const isStageUnlocked = useCallback(
    (stageId: number) => {
      const adminUnlocked = unlockedStages.includes(stageId);
      if (stageId === 1) return adminUnlocked;
      const priorCleared = isStageCleared(stageId - 1);
      return priorCleared && adminUnlocked;
    },
    [unlockedStages, isStageCleared]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 960,
          backgroundColor: "#060913",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
        }}
      >
        {/* =====================================================================
            TOP TACTICAL HUD HEADER BAR
            ===================================================================== */}
        <header
          style={{
            position: "relative",
            zIndex: 30,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 28px",
            background: "rgba(7, 11, 20, 0.95)",
            borderBottom: "1.5px solid rgba(255, 45, 58, 0.35)",
            boxShadow: "0 4px 25px rgba(0, 0, 0, 0.8)",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {/* Left Title: Hawkins Indiana 1986 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  backgroundColor: "#ff2d3a",
                  boxShadow: "0 0 10px #ff2d3a, 0 0 20px #ff2d3a",
                  animation: "pulse 2s infinite",
                }}
              />
              <h1
                style={{
                  margin: 0,
                  fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  textShadow: "0 0 14px rgba(255, 45, 58, 0.65)",
                }}
              >
                HAWKINS, INDIANA
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: '"Share Tech Mono", monospace',
                  padding: "2px 8px",
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 45, 58, 0.18)",
                  border: "1px solid rgba(255, 45, 58, 0.4)",
                  color: "#ff8a80",
                  letterSpacing: "0.12em",
                  fontWeight: "bold",
                }}
              >
                OCTOBER 1986 · TACTICAL EVIDENCE BOARD
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#ff7b88",
                fontFamily: '"Caveat", "Courier New", cursive, monospace',
                marginTop: 3,
                fontStyle: "italic",
                letterSpacing: "0.06em",
              }}
            >
              "something moving in the canopy · psychic breach coordinates mapped across 6 sectors"
            </div>
          </div>

          {/* Center Stage Quick Selector Dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 16px",
              backgroundColor: "rgba(10, 16, 28, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#8899aa",
                fontFamily: '"Share Tech Mono", monospace',
                letterSpacing: "0.1em",
              }}
            >
              SECTOR GRID:
            </span>
            {VECNA_CHAPTER_DATA.map((ch) => {
              const unlocked = isStageUnlocked(ch.id);
              const cleared = isStageCleared(ch.id);
              const isCurr = activeTrialId === ch.id;

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    sfx("click");
                    if (scrollContainerRef.current) {
                      const targetX = Math.max(0, ch.xPos - window.innerWidth / 2 + 180);
                      scrollContainerRef.current.scrollTo({ left: targetX, behavior: "smooth" });
                    }
                  }}
                  title={`Jump to ${ch.title} (${cleared ? "CLEARED" : unlocked ? "UNLOCKED" : "LOCKED"})`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: "bold",
                    fontFamily: '"Share Tech Mono", monospace',
                    background: isCurr
                      ? "rgba(255, 45, 58, 0.3)"
                      : cleared
                      ? "rgba(54, 224, 196, 0.15)"
                      : unlocked
                      ? "rgba(255, 180, 84, 0.15)"
                      : "rgba(255, 255, 255, 0.04)",
                    color: isCurr
                      ? "#ff4d58"
                      : cleared
                      ? "#36e0c4"
                      : unlocked
                      ? "#ffb454"
                      : "#556677",
                    border: isCurr
                      ? "1px solid #ff2d3a"
                      : cleared
                      ? "1px solid #36e0c4"
                      : unlocked
                      ? "1px solid #ffb454"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>S{ch.id}</span>
                  <span>{cleared ? "✓" : unlocked ? "●" : "✕"}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action: Close / Cockpit */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                sfx("click");
                onClose();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                backgroundColor: "rgba(255, 45, 58, 0.15)",
                border: "1.5px solid #ff2d3a",
                borderRadius: 3,
                color: "#ff8a80",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 12,
                fontWeight: "bold",
                letterSpacing: "0.14em",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255, 45, 58, 0.25)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ff2d3a";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 45, 58, 0.15)";
                e.currentTarget.style.color = "#ff8a80";
              }}
            >
              <span>[✕ RETURN TO COCKPIT]</span>
            </button>
          </div>
        </header>

        {/* =====================================================================
            HORIZONTAL EVIDENCE BOARD CANVAS
            ===================================================================== */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          style={{
            position: "relative",
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            background: "#080d19",
            backgroundImage: `
              radial-gradient(ellipse at 50% 30%, rgba(20, 32, 54, 0.7) 0%, rgba(6, 10, 18, 0.98) 100%),
              linear-gradient(rgba(30, 48, 75, 0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 48, 75, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 48px 48px, 48px 48px",
            scrollBehavior: isDragging ? "auto" : "smooth",
          }}
        >
          {/* Total Canvas Space: 3300px wide */}
          <div
            style={{
              position: "relative",
              width: 3300,
              height: "100%",
              minHeight: 640,
            }}
          >
            {/* =================================================================
                TACTICAL BLUEPRINT BACKGROUND ELEMENTS (STREETS, RESERVOIR, NODES)
                ================================================================= */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {/* Cornwallis Reservoir Outline (Top Left) */}
              <ellipse
                cx="940"
                cy="110"
                rx="220"
                ry="80"
                fill="rgba(12, 28, 48, 0.55)"
                stroke="rgba(54, 120, 180, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x="940"
                y="115"
                fill="rgba(80, 140, 200, 0.45)"
                fontSize="12"
                fontFamily='"Share Tech Mono", monospace'
                textAnchor="middle"
                letterSpacing="0.2em"
              >
                CORNWALLIS RESERVOIR
              </text>

              {/* National Forest Canopy (Background Patch) */}
              <ellipse
                cx="460"
                cy="190"
                rx="280"
                ry="130"
                fill="rgba(8, 26, 18, 0.4)"
                stroke="rgba(40, 120, 80, 0.25)"
                strokeWidth="1"
                strokeDasharray="6 4"
              />
              <text
                x="460"
                y="190"
                fill="rgba(60, 140, 90, 0.35)"
                fontSize="11"
                fontFamily='"Share Tech Mono", monospace'
                textAnchor="middle"
                letterSpacing="0.16em"
              >
                NATIONAL FOREST CANOPY // DEER TRAIL
              </text>

              {/* Primary Street: Route 53 (Solid Line across whole map) */}
              <line
                x1="0"
                y1="490"
                x2="3300"
                y2="490"
                stroke="rgba(60, 95, 145, 0.45)"
                strokeWidth="2.5"
              />
              <line
                x1="0"
                y1="490"
                x2="3300"
                y2="490"
                stroke="rgba(255, 180, 84, 0.25)"
                strokeWidth="1"
                strokeDasharray="8 12"
              />
              <text
                x="200"
                y="480"
                fill="rgba(120, 160, 210, 0.5)"
                fontSize="10"
                fontFamily='"Share Tech Mono", monospace'
                letterSpacing="0.18em"
              >
                ROUTE 53 (PRIMARY PAVED) // EAST-WEST CORRIDOR
              </text>

              {/* Secondary Street: Cherry Lane */}
              <line
                x1="0"
                y1="610"
                x2="3300"
                y2="610"
                stroke="rgba(40, 70, 110, 0.35)"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <text
                x="1480"
                y="600"
                fill="rgba(90, 130, 180, 0.4)"
                fontSize="10"
                fontFamily='"Share Tech Mono", monospace'
                letterSpacing="0.14em"
              >
                CHERRY LANE // SECTOR MERIDIAN
              </text>

              {/* Central Rail Line (Dotted Cross Path) */}
              <line
                x1="0"
                y1="340"
                x2="3300"
                y2="340"
                stroke="rgba(90, 110, 140, 0.3)"
                strokeWidth="2"
                strokeDasharray="3 6"
              />
              <text
                x="180"
                y="330"
                fill="rgba(90, 120, 160, 0.35)"
                fontSize="9"
                fontFamily='"Share Tech Mono", monospace'
                letterSpacing="0.14em"
              >
                CENTRAL INDIANA FREIGHT RAIL LINE
              </text>

              {/* Connective Red Vector String between all 6 Pushpins */}
              <path
                d={`M 310 145 
                    C 500 130, 600 265, 830 265 
                    C 1000 265, 1100 135, 1350 135 
                    C 1550 135, 1650 285, 1870 285 
                    C 2050 285, 2150 145, 2390 145 
                    C 2600 145, 2700 255, 2910 255`}
                fill="none"
                stroke="#ff2d3a"
                strokeWidth="2.5"
                strokeDasharray="7 5"
                filter="drop-shadow(0 3px 6px rgba(0,0,0,0.9))"
                opacity="0.85"
              />

              {/* Amber Streetlamp Surveillance Nodes */}
              {[
                { x: 260, y: 490 },
                { x: 580, y: 340 },
                { x: 920, y: 490 },
                { x: 1240, y: 610 },
                { x: 1580, y: 490 },
                { x: 1940, y: 340 },
                { x: 2360, y: 490 },
                { x: 2780, y: 610 },
              ].map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill="#ffb454"
                    filter="drop-shadow(0 0 8px #ffb454)"
                  />
                  <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke="rgba(255, 180, 84, 0.25)" strokeWidth="1" />
                </g>
              ))}
            </svg>

            {/* Handwritten Creepy Annotations matching Reference Image */}
            <div
              style={{
                position: "absolute",
                top: 75,
                left: 170,
                color: "rgba(255, 120, 130, 0.55)",
                fontFamily: '"Caveat", "Courier New", cursive, monospace',
                fontSize: 16,
                pointerEvents: "none",
                transform: "rotate(-3deg)",
                zIndex: 2,
              }}
            >
              "something moving in the canopy · seismic spikes near sublevel 04"
            </div>

            <div
              style={{
                position: "absolute",
                top: 410,
                left: 1350,
                color: "rgba(255, 120, 130, 0.5)",
                fontFamily: '"Caveat", "Courier New", cursive, monospace',
                fontSize: 15,
                pointerEvents: "none",
                transform: "rotate(1.5deg)",
                zIndex: 2,
              }}
            >
              "club radio picked up rhythmic carrier tones across high-frequency band"
            </div>

            <div
              style={{
                position: "absolute",
                top: 80,
                left: 2350,
                color: "rgba(255, 120, 130, 0.5)",
                fontFamily: '"Caveat", "Courier New", cursive, monospace',
                fontSize: 15,
                pointerEvents: "none",
                transform: "rotate(-2deg)",
                zIndex: 2,
              }}
            >
              "dimensional fracture point · do not sever temporal anchor"
            </div>

            {/* =================================================================
                6 POLAROID CARDS (POSITIONED SEQUENTIALLY ACROSS COORDINATES)
                ================================================================= */}
            {VECNA_CHAPTER_DATA.map((ch) => {
              const isUnlocked = isStageUnlocked(ch.id);
              const isCleared = isStageCleared(ch.id);
              const isActive = activeTrialId === ch.id;

              const trialQuestions = STAGE_QUIZ_CONFIGS[ch.id]?.questions || [];
              const solvedInTrial = trialQuestions.filter(
                (_, idx) => !!solvedQuestions[`${ch.id}-${idx}`]
              ).length;

              return (
                <motion.div
                  key={ch.id}
                  whileHover={{
                    scale: 1.035,
                    y: -10,
                    zIndex: 25,
                    transition: { duration: 0.18 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx("click");
                    setInspectedChapter(ch);
                  }}
                  style={{
                    position: "absolute",
                    left: ch.xPos,
                    top: ch.yPos,
                    width: 300,
                    minHeight: 390,
                    backgroundColor: "#f5f0e6",
                    borderRadius: "3px",
                    boxShadow: isActive
                      ? "0 0 0 3px #ff2d3a, 0 20px 45px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.45)"
                      : isCleared
                      ? "0 0 0 2px #36e0c4, 0 16px 35px rgba(0, 0, 0, 0.85)"
                      : "0 14px 35px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.4)",
                    padding: "12px 12px 18px 12px",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    transform: `rotate(${ch.rotation}deg)`,
                    transition: "box-shadow 0.2s ease, transform 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: isActive ? 20 : 10,
                  }}
                >
                  {/* PushPin on Top Center */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-15px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 35,
                      pointerEvents: "none",
                    }}
                  >
                    <PushPin color={ch.pinColor} size={28} angle={ch.rotation > 0 ? 8 : -8} />
                  </div>

                  {/* Photo Section (Dark Vintage Film Aspect) */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 220,
                      backgroundColor: "#080608",
                      borderRadius: "2px",
                      overflow: "hidden",
                      border: "1px solid rgba(0, 0, 0, 0.35)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${ch.bgSrc})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "contrast(1.2) brightness(0.8) grayscale(0.25)",
                      }}
                    />

                    {/* Dark gradient overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(8, 2, 4, 0.3) 0%, rgba(10, 3, 6, 0.75) 100%)",
                      }}
                    />

                    {/* Top Right Status Badge inside photo */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 5,
                      }}
                    >
                      {isCleared ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            backgroundColor: "rgba(46, 125, 50, 0.95)",
                            color: "#ffffff",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: "0.1em",
                            borderRadius: 2,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                          }}
                        >
                          ✓ CLEARED
                        </span>
                      ) : isActive ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            backgroundColor: "rgba(255, 180, 84, 0.95)",
                            color: "#0a0604",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: "0.1em",
                            borderRadius: 2,
                            boxShadow: "0 2px 8px rgba(255, 180, 84, 0.5)",
                          }}
                        >
                          ● ACTIVE
                        </span>
                      ) : isUnlocked ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            backgroundColor: "rgba(30, 40, 60, 0.9)",
                            color: "#36e0c4",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            borderRadius: 2,
                            border: "1px solid rgba(54, 224, 196, 0.5)",
                          }}
                        >
                          READY
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            backgroundColor: "rgba(180, 20, 30, 0.95)",
                            color: "#ffffff",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: "0.1em",
                            borderRadius: 2,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                          }}
                        >
                          LOCKED
                        </span>
                      )}
                    </div>

                    {/* Bottom Left Photo Tag */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        left: 8,
                        zIndex: 5,
                        fontSize: 9,
                        color: "rgba(255, 255, 255, 0.7)",
                        fontFamily: '"Share Tech Mono", monospace',
                        letterSpacing: "0.12em",
                      }}
                    >
                      {ch.shortName}
                    </div>
                  </div>

                  {/* Polaroid Chin Section (Authentic Creamy Paper) */}
                  <div
                    style={{
                      paddingTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 4,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                        fontSize: 14,
                        fontWeight: 900,
                        color: "#1a1816",
                        letterSpacing: "0.06em",
                        lineHeight: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {ch.title}
                    </h3>

                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: '"Share Tech Mono", monospace',
                        color: "#6b6255",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                      }}
                    >
                      {isCleared
                        ? "CLEARANCE CONFIRMED · 10/10 SOLVED"
                        : isUnlocked
                        ? "CLEARANCE AUTHORIZED · 00/10 SOLVED"
                        : "CLEARANCE REQUIRED"}
                    </div>

                    {/* Action Indicator: [ CLICK TO INSPECT -> ] or [ LOCKED ] */}
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontFamily: '"Share Tech Mono", monospace',
                        fontWeight: "bold",
                        letterSpacing: "0.12em",
                        color: isCleared ? "#2e7d32" : isUnlocked ? "#b85d19" : "#b71c1c",
                      }}
                    >
                      {isCleared
                        ? "[ ✓ CLEARED · REVISIT ]"
                        : isUnlocked
                        ? "[ CLICK TO INSPECT → ]"
                        : "[ LOCKED ]"}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            BOTTOM FLOATING CONTROLS: PREV / NEXT PAN BUTTONS & MAP LEGEND
            ===================================================================== */}
        <div
          style={{
            position: "relative",
            zIndex: 30,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 28px",
            backgroundColor: "rgba(7, 11, 20, 0.96)",
            borderTop: "1px solid rgba(255, 45, 58, 0.25)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Map Reference Legend (Matching the User's Image) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 10,
              fontFamily: '"Share Tech Mono", monospace',
              color: "#8899aa",
              letterSpacing: "0.08em",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: "bold", color: "#d0d8e8" }}>MAP REFERENCE:</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 14, height: 2.5, backgroundColor: "#3c5f91" }} />
              Route 53 (Primary Paved)
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 14, height: 1.5, borderTop: "2px dashed #ffb454" }} />
              Residential Streets
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 14, height: 1.5, borderTop: "2px dotted #5a7090" }} />
              Central Rail Line
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ffb454", boxShadow: "0 0 6px #ffb454" }} />
              Surveillance Nodes
            </span>
          </div>

          {/* Navigation Panning Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => scrollByDelta(-480)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 3,
                color: "#d0d8e8",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 11,
                fontWeight: "bold",
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 45, 58, 0.2)";
                e.currentTarget.style.borderColor = "#ff2d3a";
                e.currentTarget.style.color = "#ff8a80";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "#d0d8e8";
              }}
            >
              ◀ PREV SECTOR
            </button>

            <button
              type="button"
              onClick={() => scrollByDelta(480)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 3,
                color: "#d0d8e8",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: 11,
                fontWeight: "bold",
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 45, 58, 0.2)";
                e.currentTarget.style.borderColor = "#ff2d3a";
                e.currentTarget.style.color = "#ff8a80";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "#d0d8e8";
              }}
            >
              NEXT SECTOR ▶
            </button>
          </div>
        </div>

        {/* =====================================================================
            "INSPECT FIRST" CLASSIFIED INCIDENT DOSSIER MODAL
            ===================================================================== */}
        <AnimatePresence>
          {inspectedChapter && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 990,
                backgroundColor: "rgba(3, 5, 10, 0.88)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={() => setInspectedChapter(null)}
            >
              <motion.div
                initial={{ scale: 0.93, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  width: "min(720px, 94vw)",
                  maxHeight: "90vh",
                  backgroundColor: "#0d0508",
                  border: "2px solid #ff2d3a",
                  borderRadius: 6,
                  boxShadow: "0 0 50px rgba(0,0,0,0.95), 0 0 30px rgba(255, 45, 58, 0.35)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Dossier Top Bar */}
                <div
                  style={{
                    padding: "16px 24px",
                    backgroundColor: "rgba(22, 5, 10, 0.95)",
                    borderBottom: "1.5px solid rgba(255, 45, 58, 0.35)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        backgroundColor: "#ff2d3a",
                        color: "#000000",
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: "0.14em",
                        borderRadius: 2,
                      }}
                    >
                      TOP SECRET // CONFIDENTIAL
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#ff8a80",
                        fontFamily: '"Share Tech Mono", monospace',
                        letterSpacing: "0.12em",
                      }}
                    >
                      {inspectedChapter.surveillanceSector}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectedChapter(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ff8a80",
                      fontSize: 18,
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Dossier Body */}
                <div style={{ padding: "24px 28px", overflowY: "auto" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#ff8a80",
                      fontFamily: '"Share Tech Mono", monospace',
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {inspectedChapter.shortName}
                  </div>

                  <h2
                    style={{
                      margin: "0 0 8px 0",
                      fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#ffffff",
                      letterSpacing: "0.08em",
                      textShadow: "0 0 12px rgba(255, 45, 58, 0.6)",
                    }}
                  >
                    {inspectedChapter.title}
                  </h2>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#ffb454",
                      fontFamily: '"Share Tech Mono", monospace',
                      marginBottom: 16,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {inspectedChapter.subtitle}
                  </div>

                  {/* Surveillance Dossier Briefing Card */}
                  <div
                    style={{
                      padding: "14px 18px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderLeft: "3px solid #ff2d3a",
                      borderRadius: 3,
                      marginBottom: 18,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#d0d0d8",
                      fontFamily: '"Courier New", Courier, monospace',
                    }}
                  >
                    <div style={{ color: "#ff8a80", fontWeight: "bold", fontSize: 11, marginBottom: 4, letterSpacing: ".08em" }}>
                      INCIDENT BRIEFING &amp; FIELD OBSERVATIONS:
                    </div>
                    {inspectedChapter.briefing}
                    <div style={{ marginTop: 8, fontStyle: "italic", color: "#ff8088", fontSize: 11 }}>
                      {inspectedChapter.annotation}
                    </div>
                  </div>

                  {/* Dual-Condition Status Panel */}
                  {(() => {
                    const isUnlocked = isStageUnlocked(inspectedChapter.id);
                    const isCleared = isStageCleared(inspectedChapter.id);
                    const adminUnlocked = unlockedStages.includes(inspectedChapter.id);
                    const priorCleared =
                      inspectedChapter.id === 1 || isStageCleared(inspectedChapter.id - 1);

                    return (
                      <div
                        style={{
                          padding: "14px 18px",
                          backgroundColor: isUnlocked
                            ? "rgba(54, 224, 196, 0.06)"
                            : "rgba(255, 45, 58, 0.08)",
                          border: isUnlocked
                            ? "1px solid rgba(54, 224, 196, 0.3)"
                            : "1px solid rgba(255, 45, 58, 0.35)",
                          borderRadius: 4,
                          marginBottom: 20,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            letterSpacing: "0.1em",
                            color: isUnlocked ? "#36e0c4" : "#ff4d58",
                            marginBottom: 10,
                            fontFamily: '"Share Tech Mono", monospace',
                          }}
                        >
                          DUAL-CONDITION SECTOR ACCESS VERIFICATION:
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                          {/* Condition A */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#aaaabb" }}>
                              Condition A: Stage {inspectedChapter.id - 1} Solved (Prior Cleared)
                            </span>
                            <span
                              style={{
                                color: priorCleared ? "#36e0c4" : "#ff4d58",
                                fontWeight: "bold",
                                fontFamily: '"Share Tech Mono", monospace',
                              }}
                            >
                              {priorCleared
                                ? inspectedChapter.id === 1
                                  ? "✓ INITIAL ENTRY POINT"
                                  : "✓ MET (CLEARED)"
                                : `✗ REQUIRE STAGE ${inspectedChapter.id - 1} CLEARED`}
                            </span>
                          </div>

                          {/* Condition B */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#aaaabb" }}>
                              Condition B: Admin Command Authorization (Switchboard)
                            </span>
                            <span
                              style={{
                                color: adminUnlocked ? "#36e0c4" : "#ff4d58",
                                fontWeight: "bold",
                                fontFamily: '"Share Tech Mono", monospace',
                              }}
                            >
                              {adminUnlocked ? "✓ AUTHORIZED" : "✗ RESTRICTED (PENDING OVERRIDE)"}
                            </span>
                          </div>
                        </div>

                        {/* Summary Access Result */}
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: 11, color: "#888899", fontFamily: '"Share Tech Mono", monospace' }}>
                            SECTOR STATUS:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: "bold",
                              letterSpacing: "0.1em",
                              color: isCleared ? "#36e0c4" : isUnlocked ? "#36e0c4" : "#ff4d58",
                              fontFamily: '"Share Tech Mono", monospace',
                            }}
                          >
                            {isCleared
                              ? "✓ CONQUERED (10/10 SOLVED · REVISIT PERMITTED)"
                              : isUnlocked
                              ? "✓ AUTHORIZED · READY TO ENGAGE"
                              : "ACCESS RESTRICTED · LOCK ACTIVE"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sector Intelligence Breakdown (Points & Questions) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 12,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "#888899", letterSpacing: ".1em" }}>TOTAL BOUNTY</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#ffb454", marginTop: 2 }}>
                        +200 PTS
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "#888899", letterSpacing: ".1em" }}>LEVELS</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#ffffff", marginTop: 2 }}>
                        10 Questions
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 3,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "#888899", letterSpacing: ".1em" }}>ATTEMPT ENGINE</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#36e0c4", marginTop: 4 }}>
                        20 / 10 / 0 PTS
                      </div>
                    </div>
                  </div>

                  {/* Modal Action Controls: [ ENTER STAGE SECTOR ] or [ RETURN ] */}
                  {(() => {
                    const isUnlocked = isStageUnlocked(inspectedChapter.id);
                    const isCleared = isStageCleared(inspectedChapter.id);

                    return (
                      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setInspectedChapter(null)}
                          style={{
                            padding: "10px 18px",
                            backgroundColor: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: 3,
                            color: "#d0d8e8",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: "0.1em",
                            cursor: "pointer",
                          }}
                        >
                          [ CLOSE DOSSIER ]
                        </button>

                        <button
                          type="button"
                          disabled={!isUnlocked}
                          onClick={() => {
                            if (!isUnlocked) {
                              sfx("err");
                              return;
                            }
                            sfx("boom");
                            onSelectTrial(inspectedChapter.id);
                            setInspectedChapter(null);
                            onClose();
                          }}
                          style={{
                            padding: "10px 24px",
                            backgroundColor: !isUnlocked
                              ? "rgba(120, 20, 30, 0.25)"
                              : isCleared
                              ? "#2e7d32"
                              : "#ff2d3a",
                            border: !isUnlocked
                              ? "1px solid #551111"
                              : isCleared
                              ? "1.5px solid #36e0c4"
                              : "1.5px solid #ff2d3a",
                            borderRadius: 3,
                            color: !isUnlocked ? "#773333" : isCleared ? "#ffffff" : "#000000",
                            fontFamily: '"Share Tech Mono", monospace',
                            fontSize: 13,
                            fontWeight: 900,
                            letterSpacing: "0.14em",
                            cursor: !isUnlocked ? "not-allowed" : "pointer",
                            boxShadow: !isUnlocked
                              ? "none"
                              : isCleared
                              ? "0 0 20px rgba(54, 224, 196, 0.4)"
                              : "0 0 25px rgba(255, 45, 58, 0.6)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {!isUnlocked
                            ? "ACCESS RESTRICTED · LOCKED"
                            : isCleared
                            ? "✓ REVISIT SECTOR (CLEARED)"
                            : "COMMENCE STAGE PROTOCOL"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
