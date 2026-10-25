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
  xPos: number;
  yPos: number;
}

export const VECNA_CHAPTER_DATA: VecnaChapterCardData[] = [
  {
    id: 1,
    shortName: "SECTOR-01 // QUIZ",
    title: "HAWKINS NATIONAL LABORATORY",
    subtitle: "SUBLEVEL 04 // SERIES LORE & LOGIC",
    category: "SERIES KNOWLEDGE",
    points: 200,
    bgSrc: "/hawkins-lab-bg.jpg",
    surveillanceSector: "HAWKINS LAB — U.S. DEPT OF ENERGY // RESTRICTED",
    briefing:
      "Sublevel 04 isolation facility. Ground zero for psionic amplification and sensory deprivation protocols. Complete initial intelligence diagnostics to map the breach.",
    annotation: '"heavy electromagnetic disturbance detected near isolation tank"',
    pinColor: "#ffb454",
    rotation: -1.5,
    xPos: 140,
    yPos: 120,
  },
  {
    id: 2,
    shortName: "SECTOR-02 // CONNECTION",
    title: "BYERS RESIDENCE & SHADOW WOODS",
    subtitle: "PERIMETER GRID // MATCH CLUES & ARTIFACTS",
    category: "RELATIONSHIP MAPPING",
    points: 200,
    bgSrc: "/hawkins-police-bg.jpg",
    surveillanceSector: "BYERS RESIDENCE — MIRACLE ST. // ANOMALY DETECTED",
    briefing:
      "Christmas light signaling grid and surrounding woods. Correlate artifacts, locations, and personnel to trace psychic resonance across dimensional boundaries.",
    annotation: '"lights pulsing in rhythmic sequences along wall alphabets"',
    pinColor: "#ff2d3a",
    rotation: 1.8,
    xPos: 680,
    yPos: 210,
  },
  {
    id: 3,
    shortName: "SECTOR-03 // REARRANGE",
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
    rotation: -2.0,
    xPos: 1220,
    yPos: 130,
  },
  {
    id: 4,
    shortName: "SECTOR-04 // CASE STUDY",
    title: "HAWKINS DOWNTOWN & HIGH SCHOOL",
    subtitle: "INCIDENT DOSSIER // FORENSIC ANALYSIS",
    category: "INVESTIGATIVE ANALYSIS",
    points: 200,
    bgSrc: "/hawkins-town-bg.jpg",
    surveillanceSector: "HAWKINS HIGH & ARCADE // CIVIC AREA SURVEILLANCE",
    briefing:
      "Coroner records and police evidence logs from the 1986 wave of trance-state victims. Examine forensic field files and draw precise investigative conclusions.",
    annotation: '"student vehicle abandoned with tape deck running on loop"',
    pinColor: "#ff2d3a",
    rotation: 1.5,
    xPos: 1760,
    yPos: 220,
  },
  {
    id: 5,
    shortName: "SECTOR-05 // RADIO INTERCEPT",
    title: "RADIO TOWER & RUSSIAN INTERCEPT",
    subtitle: "FREQUENCY HARMONICS // SIGNAL DECRYPTION",
    category: "SIGNAL DECODING",
    points: 200,
    bgSrc: "/hawkins-gate-bg.jpg",
    surveillanceSector: "HIGH FREQUENCY ARRAY — CEREBRO PEAK // CARRIER SIGNALS",
    briefing:
      "Russian audio surveillance intercepted beneath the mall and broadcast across civilian ham radio bands. Transcribe Morse code, binary patterns, and audio ciphers.",
    annotation: '"club radio picked up rhythmic carrier tones at 432.8 MHz"',
    pinColor: "#ff2d3a",
    rotation: -1.2,
    xPos: 2300,
    yPos: 125,
  },
  {
    id: 6,
    shortName: "SECTOR-06 // FINAL LAB",
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
    xPos: 2840,
    yPos: 210,
  },
];

interface VecnaChaptersBoardProps {
  activeTrialId: number;
  solvedQuestions: Record<string, boolean>;
  failedQuestions?: Record<string, boolean>;
  unlockedStages?: number[];
  onSelectTrial: (trialId: number) => void;
  onEnterTrial?: (trialId: number) => void;
  isStageUnlocked: (stageId: number) => boolean;
  isStageCleared: (stageId: number) => boolean;
  effectiveScore?: number;
}

export default function VecnaChaptersBoard({
  activeTrialId,
  solvedQuestions,
  failedQuestions = {},
  unlockedStages = [1],
  onSelectTrial,
  onEnterTrial,
  isStageUnlocked,
  isStageCleared,
  effectiveScore = 0,
}: VecnaChaptersBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [inspectedChapter, setInspectedChapter] = useState<VecnaChapterCardData | null>(null);
  const [lockAlertMessage, setLockAlertMessage] = useState<string | null>(null);

  // Mouse drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // Center on active trial on mount
  useEffect(() => {
    const activeData = VECNA_CHAPTER_DATA.find((ch) => ch.id === activeTrialId);
    if (activeData && scrollContainerRef.current) {
      const targetScroll = Math.max(0, activeData.xPos - window.innerWidth / 2 + 160);
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
    }
  }, [activeTrialId]);

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

  const scrollToSector = (chapterId: number) => {
    sfx("click");
    const targetCard = VECNA_CHAPTER_DATA.find((ch) => ch.id === chapterId);
    if (targetCard && scrollContainerRef.current) {
      const targetX = Math.max(0, targetCard.xPos - window.innerWidth / 2 + 160);
      scrollContainerRef.current.scrollTo({ left: targetX, behavior: "smooth" });
    }
  };

  const scrollByDelta = (delta: number) => {
    sfx("click");
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  const handleCardClick = (ch: VecnaChapterCardData) => {
    const unlocked = isStageUnlocked(ch.id);
    if (!unlocked) {
      sfx("err");
      const priorCleared = ch.id === 1 || isStageCleared(ch.id - 1);
      const adminUnlocked = unlockedStages.includes(ch.id);
      let reason = `SECTOR ${ch.id} IS LOCKED`;
      if (!priorCleared && !adminUnlocked) {
        reason = `SECTOR ${ch.id} LOCKED: MUST SOLVE SECTOR ${ch.id - 1} AND AWAIT COMMAND AUTHORIZATION.`;
      } else if (!priorCleared) {
        reason = `SECTOR ${ch.id} LOCKED: MUST COMPLETE ALL QUESTIONS IN SECTOR ${ch.id - 1} FIRST.`;
      } else {
        reason = `SECTOR ${ch.id} LOCKED: AWAITING COMMAND AUTHORIZATION FROM ADMIN.`;
      }
      setLockAlertMessage(reason);
      setTimeout(() => setLockAlertMessage(null), 3500);
      return;
    }

    sfx("click");
    setInspectedChapter(ch);
  };

  const handleEnterSector = (chapterId: number) => {
    sfx("boom");
    setInspectedChapter(null);
    if (onEnterTrial) {
      onEnterTrial(chapterId);
    } else {
      onSelectTrial(chapterId);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "#050204",
        userSelect: "none",
      }}
    >
      {/* ───────────────────────────────────────────────────────────────────
          LOCK ALERT TOAST BANNER (TOP FLOATING)
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lockAlertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              backgroundColor: "rgba(180, 20, 30, 0.95)",
              color: "#ffffff",
              border: "1.5px solid #ff4d58",
              borderRadius: "4px",
              padding: "10px 22px",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              boxShadow: "0 0 25px rgba(255, 45, 58, 0.6)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>🔒</span>
            <span>{lockAlertMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────
          HORIZONTAL SCROLLABLE CANVAS
          Panoramic Background: /vecna-horizon-bg.png
          ─────────────────────────────────────────────────────────────────── */}
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
          backgroundColor: "#060307",
          scrollBehavior: isDragging ? "auto" : "smooth",
          scrollbarWidth: "none",
        }}
      >
        {/* Total Canvas Space: 3400px wide */}
        <div
          style={{
            position: "relative",
            width: 3400,
            height: "100%",
            minHeight: 640,
            backgroundImage: `url('/vecna-horizon-bg.png')`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Subtle dark vignette overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8, 2, 5, 0.75) 0%, rgba(6, 1, 3, 0.25) 25%, rgba(6, 1, 3, 0.2) 75%, rgba(8, 2, 5, 0.88) 100%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* SVG Layer: Red Dashed Connective Spline linking all 6 Pushpins */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            {/* Smooth Red Dashed Line connecting Pushpin Coordinates:
                P1: (295, 125)
                P2: (835, 215)
                P3: (1375, 135)
                P4: (1915, 225)
                P5: (2455, 130)
                P6: (2995, 215)
            */}
            <path
              d="M 295 125 
                 C 475 125, 655 215, 835 215 
                 C 1015 215, 1195 135, 1375 135 
                 C 1555 135, 1735 225, 1915 225 
                 C 2095 225, 2275 130, 2455 130 
                 C 2635 130, 2815 215, 2995 215"
              fill="none"
              stroke="#ff2d3a"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              filter="drop-shadow(0 0 8px rgba(255, 45, 58, 0.8))"
              opacity="0.9"
            />
          </svg>

          {/* Creepy Handwritten Annotations on the Horizon Canvas */}
          <div
            style={{
              position: "absolute",
              top: 70,
              left: 200,
              color: "rgba(255, 120, 130, 0.6)",
              fontFamily: '"Caveat", "Courier New", cursive, monospace',
              fontSize: 17,
              pointerEvents: "none",
              transform: "rotate(-2.5deg)",
              zIndex: 2,
            }}
          >
            "something moving in the canopy · seismic spikes near sublevel 04"
          </div>

          <div
            style={{
              position: "absolute",
              top: 380,
              left: 1400,
              color: "rgba(255, 120, 130, 0.55)",
              fontFamily: '"Caveat", "Courier New", cursive, monospace',
              fontSize: 16,
              pointerEvents: "none",
              transform: "rotate(1.2deg)",
              zIndex: 2,
            }}
          >
            "grandfather clock ticks four times · reality tether dissolving"
          </div>

          <div
            style={{
              position: "absolute",
              top: 75,
              left: 2360,
              color: "rgba(255, 120, 130, 0.6)",
              fontFamily: '"Caveat", "Courier New", cursive, monospace',
              fontSize: 16,
              pointerEvents: "none",
              transform: "rotate(-1.8deg)",
              zIndex: 2,
            }}
          >
            "carrier tone intercepted at 432.8 MHz · the gate is opening"
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              6 POLAROID CHAPTER CARDS (ARRANGED ALONG HORIZONTAL WAVE)
              ───────────────────────────────────────────────────────────────── */}
          {VECNA_CHAPTER_DATA.map((ch) => {
            const isUnlocked = isStageUnlocked(ch.id);
            const isCleared = isStageCleared(ch.id);
            const isActive = activeTrialId === ch.id;

            const trialQuestions = STAGE_QUIZ_CONFIGS[ch.id]?.questions || [];
            const solvedInTrial = trialQuestions.filter(
              (_, idx) => !!solvedQuestions[`${ch.id}-${idx}`]
            ).length;
            const totalInTrial = trialQuestions.length || 10;
            const solvedCountStr = `${String(solvedInTrial).padStart(2, "0")}/${String(totalInTrial).padStart(2, "0")}`;

            return (
              <motion.div
                key={ch.id}
                whileHover={{
                  scale: 1.035,
                  y: -10,
                  zIndex: 30,
                  transition: { duration: 0.18 },
                }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(ch);
                }}
                style={{
                  position: "absolute",
                  left: ch.xPos,
                  top: ch.yPos,
                  width: 310,
                  minHeight: 395,
                  backgroundColor: "#f7f2e7",
                  borderRadius: "3px",
                  boxShadow: isActive
                    ? "0 0 0 3px #ff2d3a, 0 20px 45px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.55)"
                    : isCleared
                    ? "0 0 0 2px #36e0c4, 0 16px 40px rgba(0, 0, 0, 0.9)"
                    : "0 14px 38px rgba(0, 0, 0, 0.85), 0 2px 6px rgba(0, 0, 0, 0.5)",
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
                  <PushPin
                    color={isCleared ? "#36e0c4" : isUnlocked ? "#ffb454" : "#d32f2f"}
                    size={28}
                    angle={ch.rotation > 0 ? 8 : -8}
                  />
                </div>

                {/* Photo Section (Dark Vintage Film Aspect) */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 215,
                    backgroundColor: "#080608",
                    borderRadius: "2px",
                    overflow: "hidden",
                    border: "1px solid rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${ch.bgSrc})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "contrast(1.2) brightness(0.8) grayscale(0.2)",
                    }}
                  />

                  {/* Dark gradient overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(8, 2, 4, 0.25) 0%, rgba(10, 3, 6, 0.78) 100%)",
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
                          backgroundColor: "rgba(30, 40, 60, 0.92)",
                          color: "#36e0c4",
                          fontFamily: '"Share Tech Mono", monospace',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          borderRadius: 2,
                          border: "1px solid rgba(54, 224, 196, 0.5)",
                        }}
                      >
                        AUTHORIZED
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
                        🔒 LOCKED
                      </span>
                    )}
                  </div>

                  {/* Bottom Left Category Pill inside photo */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      zIndex: 5,
                      fontSize: 9.5,
                      color: "rgba(255, 255, 255, 0.85)",
                      fontFamily: '"Share Tech Mono", monospace',
                      letterSpacing: "0.12em",
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      padding: "2px 6px",
                      borderRadius: 2,
                    }}
                  >
                    {ch.shortName}
                  </div>
                </div>

                {/* Polaroid Chin Section (Creamy Paper) */}
                <div
                  style={{
                    paddingTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 5,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                      fontSize: 14.5,
                      fontWeight: 900,
                      color: "#181512",
                      letterSpacing: "0.05em",
                      lineHeight: 1.25,
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
                      fontWeight: 700,
                    }}
                  >
                    {isCleared
                      ? `CLEARANCE CONFIRMED · ${solvedCountStr} SOLVED`
                      : isUnlocked
                      ? `CLEARANCE AUTHORIZED · ${solvedCountStr} SOLVED`
                      : "CLEARANCE REQUIRED"}
                  </div>

                  {/* Action Link / Button */}
                  <div
                    style={{
                      marginTop: 4,
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

      {/* ───────────────────────────────────────────────────────────────────
          BOTTOM TIMELINE NAVIGATION BAR (MATCHING MOCKUP)
          ─────────────────────────────────────────────────────────────────── */}
      <footer
        style={{
          position: "relative",
          zIndex: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 24px",
          backgroundColor: "rgba(10, 4, 8, 0.96)",
          borderTop: "1.5px solid rgba(255, 45, 58, 0.35)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Left: Map Reference Intel */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 10,
            fontFamily: '"Share Tech Mono", monospace',
            color: "rgba(255, 200, 200, 0.7)",
            letterSpacing: "0.1em",
          }}
        >
          <span style={{ fontWeight: "bold", color: "#ff8a80" }}>SECTOR RECON:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#36e0c4" }} />
            CLEARED
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ffb454" }} />
            AUTHORIZED
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff2d3a" }} />
            LOCKED
          </span>
        </div>

        {/* Center: Timeline Slider Rail with 6 Nodes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(18, 5, 10, 0.8)",
            padding: "5px 16px",
            borderRadius: "20px",
            border: "1px solid rgba(255, 45, 58, 0.3)",
          }}
        >
          <button
            type="button"
            onClick={() => scrollByDelta(-450)}
            title="Pan Left"
            style={{
              background: "transparent",
              border: "none",
              color: "#ff8a80",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px",
              display: "flex",
              alignItems: "center",
            }}
          >
            ◀
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {VECNA_CHAPTER_DATA.map((ch) => {
              const unlocked = isStageUnlocked(ch.id);
              const cleared = isStageCleared(ch.id);
              const isCurr = activeTrialId === ch.id;

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToSector(ch.id)}
                  title={`Sector ${ch.id}: ${ch.title} (${cleared ? "CLEARED" : unlocked ? "UNLOCKED" : "LOCKED"})`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "10.5px",
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
                      : "rgba(255, 180, 180, 0.4)",
                    border: isCurr
                      ? "1px solid #ff2d3a"
                      : cleared
                      ? "1px solid #36e0c4"
                      : unlocked
                      ? "1px solid #ffb454"
                      : "1px solid rgba(255, 45, 58, 0.2)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>S{ch.id}</span>
                  <span>{cleared ? "✓" : unlocked ? "●" : "🔒"}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollByDelta(450)}
            title="Pan Right"
            style={{
              background: "transparent",
              border: "none",
              color: "#ff8a80",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px",
              display: "flex",
              alignItems: "center",
            }}
          >
            ▶
          </button>
        </div>

        {/* Right: Quick Action to open currently selected sector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              const currCh = VECNA_CHAPTER_DATA.find((ch) => ch.id === activeTrialId) || VECNA_CHAPTER_DATA[0];
              handleCardClick(currCh);
            }}
            style={{
              padding: "6px 14px",
              backgroundColor: "rgba(255, 45, 58, 0.2)",
              border: "1px solid #ff2d3a",
              borderRadius: "3px",
              color: "#ffffff",
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.12em",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            [ INSPECT ACTIVE SECTOR {activeTrialId} ]
          </button>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────────────
          CLASSIFIED INCIDENT DOSSIER MODAL (INSPECT FIRST)
          ─────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {inspectedChapter && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 990,
              backgroundColor: "rgba(4, 1, 3, 0.9)",
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
                backgroundColor: "#0d0408",
                border: "2px solid #ff2d3a",
                borderRadius: 6,
                boxShadow: "0 0 50px rgba(0,0,0,0.95), 0 0 30px rgba(255, 45, 58, 0.4)",
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
                      fontSize: "10px",
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
                    letterSpacing: "0.1em",
                    marginBottom: 16,
                  }}
                >
                  {inspectedChapter.subtitle}
                </div>

                {/* Photo Thumbnail in Dossier */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 180,
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 20,
                    border: "1px solid rgba(255, 45, 58, 0.4)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${inspectedChapter.bgSrc})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "contrast(1.2) brightness(0.85)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(8, 2, 4, 0.2) 0%, rgba(10, 3, 6, 0.8) 100%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 12,
                      fontFamily: '"Caveat", cursive',
                      fontSize: 15,
                      color: "#ff8a80",
                    }}
                  >
                    {inspectedChapter.annotation}
                  </div>
                </div>

                {/* Briefing Narrative */}
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "rgba(255, 230, 230, 0.9)",
                    fontFamily: '"Share Tech Mono", monospace',
                    marginBottom: 20,
                    borderLeft: "3px solid #ff2d3a",
                    paddingLeft: 14,
                  }}
                >
                  {inspectedChapter.briefing}
                </div>

                {/* Clearance & Lock Conditions Breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 22,
                  }}
                >
                  {/* Condition 1: Prior Sector */}
                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "rgba(18, 5, 10, 0.85)",
                      border: "1px solid rgba(255, 45, 58, 0.25)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "rgba(255, 180, 180, 0.7)",
                        letterSpacing: "0.12em",
                        marginBottom: 4,
                        fontFamily: '"Share Tech Mono", monospace',
                      }}
                    >
                      CONDITION 1: PRIOR SECTOR CLEARED
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        fontFamily: '"Share Tech Mono", monospace',
                        color:
                          inspectedChapter.id === 1 || isStageCleared(inspectedChapter.id - 1)
                            ? "#36e0c4"
                            : "#ff4d58",
                      }}
                    >
                      {inspectedChapter.id === 1
                        ? "✓ INITIAL SECTOR (AUTO)"
                        : isStageCleared(inspectedChapter.id - 1)
                        ? `✓ SECTOR ${inspectedChapter.id - 1} COMPLETED`
                        : `✗ MUST CLEAR SECTOR ${inspectedChapter.id - 1}`}
                    </div>
                  </div>

                  {/* Condition 2: Admin Authorization */}
                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "rgba(18, 5, 10, 0.85)",
                      border: "1px solid rgba(255, 45, 58, 0.25)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9.5,
                        color: "rgba(255, 180, 180, 0.7)",
                        letterSpacing: "0.12em",
                        marginBottom: 4,
                        fontFamily: '"Share Tech Mono", monospace',
                      }}
                    >
                      CONDITION 2: COMMAND AUTHORIZATION
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        fontFamily: '"Share Tech Mono", monospace',
                        color: unlockedStages.includes(inspectedChapter.id) ? "#36e0c4" : "#ff4d58",
                      }}
                    >
                      {unlockedStages.includes(inspectedChapter.id)
                        ? "✓ COMMAND GRANTED BY ADMIN"
                        : "✗ AWAITING ADMIN CLEARANCE"}
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setInspectedChapter(null)}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "transparent",
                      border: "1px solid rgba(255, 45, 58, 0.4)",
                      borderRadius: 3,
                      color: "#ff8a80",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    CANCEL
                  </button>

                  {isStageUnlocked(inspectedChapter.id) ? (
                    <button
                      type="button"
                      onClick={() => handleEnterSector(inspectedChapter.id)}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "#ff2d3a",
                        border: "1.5px solid #ff2d3a",
                        borderRadius: 3,
                        color: "#000000",
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 12.5,
                        fontWeight: 900,
                        letterSpacing: "0.14em",
                        cursor: "pointer",
                        boxShadow: "0 0 20px rgba(255, 45, 58, 0.5)",
                      }}
                    >
                      ⚡ INITIATE SECTOR OVERRIDE · SOLVE SECTOR
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "rgba(180, 20, 30, 0.4)",
                        border: "1.5px solid rgba(180, 20, 30, 0.6)",
                        borderRadius: 3,
                        color: "rgba(255, 200, 200, 0.5)",
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: 12.5,
                        fontWeight: 900,
                        letterSpacing: "0.14em",
                        cursor: "not-allowed",
                      }}
                    >
                      🔒 ACCESS RESTRICTED · AUTHORIZATION REQUIRED
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
