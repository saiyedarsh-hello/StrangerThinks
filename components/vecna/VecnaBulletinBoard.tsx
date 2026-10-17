"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import PushPin from "@/components/PushPin";

export interface VecnaBoardCard {
  id: number;
  shortName: string;
  stageName: string;
  title: string;
  category: string;
  points: number;
  imgSrc: string;
}

export const VECNA_BOARD_CARDS: VecnaBoardCard[] = [
  {
    id: 1,
    shortName: "STAGE 1",
    stageName: "HAWKINS TOWN",
    title: "HAWKINS TOWN",
    category: "SERIES KNOWLEDGE",
    points: 50,
    imgSrc: "/hawkins-town-bg.jpg",
  },
  {
    id: 2,
    shortName: "STAGE 2",
    stageName: "HAWKINS LAB",
    title: "HAWKINS LAB",
    category: "RELATIONSHIP MATRIX",
    points: 50,
    imgSrc: "/hawkins-police-bg.jpg",
  },
  {
    id: 3,
    shortName: "STAGE 3",
    stageName: "BYERS HOUSE",
    title: "BYERS HOUSE",
    category: "SEQUENCE RESTORATION",
    points: 50,
    imgSrc: "/hawkins-bg.jpg",
  },
  {
    id: 4,
    shortName: "STAGE 4",
    stageName: "CREEL HOUSE",
    title: "CREEL HOUSE",
    category: "CASE STUDY FORENSICS",
    points: 50,
    imgSrc: "/hawkins-lab-bg.jpg",
  },
  {
    id: 5,
    shortName: "STAGE 5",
    stageName: "RADIO TOWER",
    title: "RADIO TOWER",
    category: "SIGNAL DECODING",
    points: 50,
    imgSrc: "/hawkins-gate-bg.jpg",
  },
  {
    id: 6,
    shortName: "STAGE 6",
    stageName: "THE UPSIDE DOWN",
    title: "THE UPSIDE DOWN",
    category: "TERMINAL OVERRIDE",
    points: 50,
    imgSrc: "/upsidedown-bg.jpg",
  },
];

interface VecnaBulletinBoardProps {
  activeTrialId: number;
  solvedQuestions: Record<string, boolean>;
  vecnaScore: number;
  onSelectTrial: (trialId: number) => void;
  onOpenTacticalMap?: () => void;
  onOpenPowers?: () => void;
  onOpenDispatch?: () => void;
  onOpenStoryBriefing?: () => void;
}

export default function VecnaBulletinBoard({
  activeTrialId,
  solvedQuestions,
  vecnaScore,
  onSelectTrial,
  onOpenTacticalMap,
  onOpenPowers,
  onOpenDispatch,
  onOpenStoryBriefing,
}: VecnaBulletinBoardProps) {
  const [selectedCardId, setSelectedCardId] = useState<number>(activeTrialId);

  // Count solved questions per trial (each stage has 10 questions)
  const getTrialSolvedCount = useCallback(
    (trialId: number) => {
      let count = 0;
      for (let i = 0; i < 10; i++) {
        if (solvedQuestions[`${trialId}-${i}`]) count++;
      }
      return count;
    },
    [solvedQuestions]
  );

  const totalSolvedAll = Object.values(solvedQuestions).filter(Boolean).length;

  const handleCardClick = (card: VecnaBoardCard) => {
    sfx("click");
    setSelectedCardId(card.id);
    onSelectTrial(card.id);
  };

  return (
    <div
      className="vecna-bulletin-board-container"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 64px)",
        background: "radial-gradient(circle at 50% 20%, #10131d 0%, #090a10 60%, #040507 100%)",
        padding: "24px 28px 80px 28px",
        boxSizing: "border-box",
        fontFamily: '"Share Tech Mono", monospace',
        color: "#e2e6f0",
        overflowX: "hidden",
        border: "none",
        outline: "none",
        margin: 0,
      }}
    >
      {/* ── Background: Charred Corkboard & Subtle Micro-texture Overlay ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.04) 1.2px, transparent 1.2px), radial-gradient(rgba(0, 0, 0, 0.8) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
          backgroundPosition: "0 0, 11px 11px",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      {/* ── Deep Vignette (No overwhelming red glow) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow:
            "inset 0 0 160px rgba(0,0,0,0.95), inset 0 0 40px rgba(0, 0, 0, 0.6)",
          pointerEvents: "none",
        }}
      />

      {/* ── Very subtle ambient dark wine mist ── */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "25%",
          width: "500px",
          height: "350px",
          background: "radial-gradient(circle, rgba(160, 25, 40, 0.04) 0%, transparent 70%)",
          filter: "blur(50px)",
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
            TOP ROW: VECNA MIND LAIR BANNER + CURSED POLAROID + RIBBON
            ─────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          {/* Main Title Parchment — Dark Tactical Dossier */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: "relative",
              background: "linear-gradient(135deg, #131622 0%, #0c0e16 100%)",
              padding: "16px 32px 14px 32px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.7), 0 0 15px rgba(220, 35, 50, 0.12)",
              borderRadius: "3px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              transform: "rotate(-0.5deg)",
              minWidth: "300px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-14px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <PushPin size={28} angle={-6} color="#8e1c24" />
            </div>

            <h1
              style={{
                fontFamily:
                  '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", "Playfair Display", Georgia, serif',
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 900,
                color: "#f0f2f6",
                letterSpacing: "0.08em",
                margin: 0,
                lineHeight: 1,
                textTransform: "uppercase",
                textShadow: "0 0 14px rgba(230, 45, 60, 0.4)",
              }}
            >
              MIND LAIR BOARD
            </h1>

            <div
              style={{
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "12px",
                letterSpacing: "0.22em",
                fontWeight: "bold",
                color: "#9da4b3",
                marginTop: "4px",
                textTransform: "uppercase",
              }}
            >
              HAWKINS INFILTRATION TRIALS
            </div>
          </motion.div>

          {/* Middle Cluster: Polaroid & Caution Ribbon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            {/* Corrupted Creel House Polaroid */}
            <div
              style={{
                position: "relative",
                background: "#0c0e15",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                padding: "8px 8px 16px 8px",
                boxShadow: "4px 8px 20px rgba(0,0,0,0.85)",
                transform: "rotate(-2deg)",
                width: "110px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <PushPin size={22} angle={12} color="#8e1c24" />
              </div>
              <div
                style={{
                  width: "100%",
                  height: "70px",
                  background: "#000",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src="/hawkins-town-bg.jpg"
                  alt="Hawkins Under Siege"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "sepia(0.3) contrast(1.2) brightness(0.7)",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "9px",
                  fontWeight: "bold",
                  color: "#8a92a2",
                  marginTop: "5px",
                  letterSpacing: "0.08em",
                }}
              >
                HAWKINS · 1986
              </div>
            </div>

            {/* Caution Ribbon: FOUR GATES · FOUR SACRIFICES. */}
            <div
              style={{
                position: "relative",
                background: "linear-gradient(90deg, #131622 0%, #1a1e2c 100%)",
                padding: "8px 20px",
                boxShadow: "3px 6px 14px rgba(0,0,0,0.7)",
                transform: "rotate(1deg)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderLeft: "3px solid #e04b57",
              }}
            >
              <div style={{ position: "absolute", top: "-11px", left: "12px" }}>
                <PushPin size={20} angle={-10} color="#8e1c24" />
              </div>
              <span
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#e2e6f0",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                FOUR GATES · FOUR SACRIFICES
              </span>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────
            MAIN SECTION: 6 VECNA TRIAL CARDS GRID + RIGHT MIND LAIR LEDGER
            ─────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 310px",
            gap: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* 6 Vecna Trial Cards Grid (Threads completely removed) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              position: "relative",
            }}
          >
            {/* The 6 Trial Cards */}
            {VECNA_BOARD_CARDS.map((card, idx) => {
              const solvedCount = getTrialSolvedCount(card.id);
              const isAllSolved = solvedCount >= 10;
              const isSelected = selectedCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -5, scale: 1.01, transition: { duration: 0.18 } }}
                  onClick={() => handleCardClick(card)}
                  style={{
                    position: "relative",
                    background: "linear-gradient(180deg, #131622 0%, #0d0f16 60%, #080a0e 100%)",
                    borderRadius: "3px",
                    padding: "16px",
                    boxShadow: isSelected
                      ? "0 0 0 1.5px rgba(255, 75, 90, 0.65), 0 12px 30px rgba(0,0,0,0.85), 0 0 16px rgba(255, 45, 58, 0.2)"
                      : "0 8px 24px rgba(0,0,0,0.85), inset 0 0 20px rgba(0, 0, 0, 0.5)",
                    border: isSelected ? "1.5px solid rgba(255, 75, 90, 0.65)" : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transform: `rotate(${idx % 2 === 0 ? "-0.8deg" : "0.8deg"})`,
                    transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Top Pushpin */}
                  <div style={{ position: "absolute", top: "-13px", right: "16px" }}>
                    <PushPin
                      color="#8e1c24"
                      size={24}
                      angle={idx % 2 === 0 ? -12 : 10}
                    />
                  </div>

                  {/* Card Header: 01 HAWKINS TOWN */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        background: isAllSolved ? "#2e7d32" : "#1b1f2b",
                        color: "#ffffff",
                        fontWeight: 900,
                        fontSize: "13px",
                        padding: "3px 8px",
                        borderRadius: "2px",
                        fontFamily: '"Share Tech Mono", monospace',
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      0{card.id}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: '"Share Tech Mono", monospace',
                          fontSize: "15px",
                          fontWeight: "bold",
                          color: "#f0f2f6",
                          letterSpacing: "0.05em",
                          lineHeight: 1.2,
                          textTransform: "uppercase",
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#7e8799",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          marginTop: "2px",
                        }}
                      >
                        {card.category}
                      </div>
                    </div>
                  </div>

                  {/* Image Container with Dark Cinematic Overlay */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "130px",
                      background: "#08090d",
                      borderRadius: "2px",
                      overflow: "hidden",
                      marginBottom: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <img
                      src={card.imgSrc}
                      alt={card.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "contrast(1.15) brightness(0.68)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, transparent 40%, rgba(8, 10, 14, 0.88) 100%)",
                      }}
                    />

                    {/* Progress Badge overlay on image */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "8px",
                        background: isAllSolved ? "#2e7d32" : "rgba(13, 16, 23, 0.92)",
                        border: isAllSolved ? "1px solid #4caf50" : "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#e2e6f0",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 900,
                        fontFamily: '"Share Tech Mono", monospace',
                        letterSpacing: "0.12em",
                        borderRadius: "2px",
                      }}
                    >
                      {isAllSolved ? "✓ 10/10 COMPLETED" : `CURSE: ${solvedCount}/10 SOLVED`}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "rgba(10, 12, 18, 0.88)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#c4c9d6",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                      }}
                    >
                      +{card.points} PTS
                    </div>
                  </div>

                  {/* Action Button: [ ENTER TRIAL CONSOLE ] */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(card);
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      background: isAllSolved
                        ? "linear-gradient(180deg, #1b5e20 0%, #2e7d32 100%)"
                        : "linear-gradient(180deg, #202534 0%, #141722 100%)",
                      color: "#ffffff",
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: "11.5px",
                      fontWeight: "bold",
                      letterSpacing: "0.14em",
                      border: isAllSolved
                        ? "1px solid #4caf50"
                        : "1px solid rgba(255, 75, 90, 0.35)",
                      borderRadius: "2px",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      transition: "all 0.15s ease",
                      textTransform: "uppercase",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isAllSolved
                        ? "#2e7d32"
                        : "#c62828";
                      e.currentTarget.style.borderColor = isAllSolved ? "#4caf50" : "#ef5350";
                      e.currentTarget.style.boxShadow =
                        "0 0 10px rgba(198, 40, 40, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isAllSolved
                        ? "linear-gradient(180deg, #1b5e20 0%, #2e7d32 100%)"
                        : "linear-gradient(180deg, #202534 0%, #141722 100%)";
                      e.currentTarget.style.borderColor = isAllSolved
                        ? "1px solid #4caf50"
                        : "1px solid rgba(255, 75, 90, 0.35)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.6)";
                    }}
                  >
                    {isAllSolved
                      ? "✓ REVISIT TRIAL (COMPLETED)"
                      : solvedCount > 0
                      ? `RESUME TRIAL (${solvedCount}/10) ▶`
                      : "ENTER TRIAL CONSOLE ▶"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* ───────────────────────────────────────────────────────────────────
              RIGHT SIDEBAR: VECNA MIND LAIR TELEMETRY & TACTICAL DOSSIER
              ─────────────────────────────────────────────────────────────────── */}
          <div
            style={{
              position: "relative",
              background: "linear-gradient(180deg, #131622 0%, #0b0d14 100%)",
              padding: "20px 18px",
              boxShadow: "4px 8px 24px rgba(0,0,0,0.85)",
              border: "1px solid rgba(255, 255, 255, 0.09)",
              transform: "rotate(0.6deg)",
            }}
          >
            {/* Pushpin at top center */}
            <div
              style={{
                position: "absolute",
                top: "-14px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <PushPin size={24} angle={-6} color="#8e1c24" />
            </div>

            {/* Header */}
            <h2
              style={{
                fontFamily:
                  '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", Georgia, serif',
                fontSize: "18px",
                fontWeight: 900,
                color: "#f0f2f6",
                letterSpacing: "0.12em",
                margin: "0 0 14px 0",
                textAlign: "center",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "8px",
                textShadow: "0 0 10px rgba(255, 45, 58, 0.3)",
              }}
            >
              HIVE TELEMETRY
            </h2>

            {/* Grandfather Clock Chimes Status */}
            <div
              style={{
                background: "rgba(14, 17, 24, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "2px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#8a92a2",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>CLOCK TOLLS</span>
                <span style={{ color: "#e0535f" }}>{Math.min(4, Math.floor(totalSolvedAll / 15))}/4 GATES</span>
              </div>

              {/* 4 Chime Pillars */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {[1, 2, 3, 4].map((chime) => {
                  const isChimed = totalSolvedAll >= chime * 15;
                  return (
                    <div
                      key={chime}
                      style={{
                        background: isChimed
                          ? "linear-gradient(180deg, #8e1c24 0%, #c62828 100%)"
                          : "#0d0f16",
                        border: isChimed ? "1px solid #ef5350" : "1px solid rgba(255, 255, 255, 0.06)",
                        padding: "8px 4px",
                        textAlign: "center",
                        boxShadow: isChimed ? "0 0 10px rgba(239, 83, 80, 0.4)" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 900,
                          color: isChimed ? "#ffffff" : "#4a5060",
                        }}
                      >
                        {chime === 1 ? "I" : chime === 2 ? "II" : chime === 3 ? "III" : "IV"}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: isChimed ? "#ffcdd2" : "#383d4a",
                          marginTop: "2px",
                        }}
                      >
                        {isChimed ? "OPEN" : "SEALED"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Psychic Reserve Meter */}
            <div
              style={{
                background: "rgba(14, 17, 24, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "2px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#8a92a2",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                PSYCHIC RESERVE
              </div>
              <div
                style={{
                  fontFamily: "var(--font-term), 'VT323', monospace",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#ff3b47",
                  letterSpacing: ".15em",
                  lineHeight: 1,
                  textShadow: "0 0 10px rgba(255, 59, 71, 0.6)",
                }}
              >
                {String(vecnaScore).padStart(5, "0")} PTS
              </div>
            </div>

            {/* Stages Progression Overview */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#8a92a2",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                STAGES STATUS ({totalSolvedAll}/60)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {VECNA_BOARD_CARDS.map((card) => {
                  const count = getTrialSolvedCount(card.id);
                  const isDone = count >= 10;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background:
                          selectedCardId === card.id
                            ? "rgba(224, 75, 87, 0.15)"
                            : "rgba(13, 16, 23, 0.7)",
                        border:
                          selectedCardId === card.id
                            ? "1px solid rgba(255, 75, 90, 0.4)"
                            : "1px solid rgba(255, 255, 255, 0.06)",
                        cursor: "pointer",
                        fontSize: "11px",
                        borderRadius: "2px",
                      }}
                    >
                      <span style={{ color: isDone ? "#81c784" : "#9ea6b5", fontWeight: "bold" }}>
                        {card.stageName}
                      </span>
                      <span
                        style={{
                          color: isDone ? "#4caf50" : "#e0535f",
                          fontWeight: 900,
                        }}
                      >
                        {count}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
