"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";
import { STAGE_QUIZ_CONFIGS } from "@/lib/chapterQuestions";

export interface VecnaChapterCardData {
  id: number;
  shortName: string;
  title: string;
  subtitle: string;
  category: string;
  points: number;
  bgSrc: string;
}

export const VECNA_CHAPTER_DATA: VecnaChapterCardData[] = [
  {
    id: 1,
    shortName: "TELEMETRY",
    title: "MUNICIPAL TELEMETRY",
    subtitle: "CIVIC DISTRICT · POWER SURGE",
    category: "TELEMETRY BREACH",
    points: 50,
    bgSrc: "/hawkins-town-bg.jpg",
  },
  {
    id: 2,
    shortName: "VECTOR",
    title: "PRECINCT RF VECTOR",
    subtitle: "HAWKINS POLICE · HOPPER'S LOGS",
    category: "VECTOR CORRELATION",
    points: 50,
    bgSrc: "/hawkins-police-bg.jpg",
  },
  {
    id: 3,
    shortName: "ELECTROMAGNETIC",
    title: "WALL FREQUENCIES",
    subtitle: "BYERS HOUSE · CHRISTMAS LIGHTS",
    category: "ELECTROMAGNETIC ENCODING",
    points: 50,
    bgSrc: "/hawkins-bg.jpg",
  },
  {
    id: 4,
    shortName: "LOGIC",
    title: "MAINFRAME OVERFLOW",
    subtitle: "HAWKINS LAB · PARITY ROUTINE",
    category: "LOGIC EXECUTION",
    points: 50,
    bgSrc: "/hawkins-lab-bg.jpg",
  },
  {
    id: 5,
    shortName: "COORDINATE",
    title: "DEEP WOODS RUNES",
    subtitle: "ROANE COUNTY · TRAIL 7 MARKERS",
    category: "COORDINATE CIPHER",
    points: 50,
    bgSrc: "/creel-bg.jpg",
  },
  {
    id: 6,
    shortName: "FREQUENCY",
    title: "TOWER RADIOMETER",
    subtitle: "EAST HILL · 5-PIN RESONANCE",
    category: "FREQUENCY ALIGNMENT",
    points: 50,
    bgSrc: "/hawkins-gate-bg.jpg",
  },
  {
    id: 7,
    shortName: "ROT13",
    title: "HIVE MIND THRESHOLD",
    subtitle: "UPSIDE DOWN · SUBJECT 001",
    category: "ROT13 MIND DECRYPTION",
    points: 50,
    bgSrc: "/upsidedown-bg.jpg",
  },
];

interface VecnaChaptersModalProps {
  isOpen: boolean;
  activeTrialId: number;
  solvedQuestions: Record<string, boolean>;
  onSelectTrial: (trialId: number) => void;
  onClose: () => void;
}

export default function VecnaChaptersModal({
  isOpen,
  activeTrialId,
  solvedQuestions,
  onSelectTrial,
  onClose,
}: VecnaChaptersModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 920,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        {/* Fullscreen Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            sfx("click");
            onClose();
          }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(4, 1, 3, 0.92)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: "relative",
            zIndex: 925,
            width: "min(1120px, 96vw)",
            maxHeight: "92vh",
            background: "#0a0205",
            border: "2px solid #ff2d3a",
            borderRadius: "8px",
            boxShadow: "0 0 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1.5px solid rgba(255, 45, 58, 0.35)",
              background: "rgba(18, 4, 8, 0.95)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ff2d3a",
                    boxShadow: "0 0 10px #ff2d3a",
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#ff2d3a",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    textShadow: "0 0 12px rgba(255, 45, 58, 0.6)",
                  }}
                >
                  VECNA EXPEDITION · ALL 7 CHAPTERS
                </h3>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(255, 180, 180, 0.65)",
                  fontFamily: '"Share Tech Mono", monospace',
                  letterSpacing: "0.16em",
                  marginTop: "4px",
                }}
              >
                SELECT A CHAPTER SECTOR TO COMMENCE PSYCHIC OVERRIDE PROTOCOL
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sfx("click");
                onClose();
              }}
              style={{
                background: "rgba(255, 45, 58, 0.15)",
                border: "1px solid #ff2d3a",
                color: "#ff8a80",
                padding: "8px 18px",
                borderRadius: "3px",
                cursor: "pointer",
                fontFamily: '"Share Tech Mono", monospace',
                fontSize: "12px",
                letterSpacing: "0.14em",
                fontWeight: "bold",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ff2d3a";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 45, 58, 0.15)";
                e.currentTarget.style.color = "#ff8a80";
              }}
            >
              [✕ CLOSE]
            </button>
          </div>

          {/* Modal Body: Square Mode Grid */}
          <div
            style={{
              padding: "24px",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            {VECNA_CHAPTER_DATA.map((ch) => {
              const isActive = activeTrialId === ch.id;
              const trialQuestions = STAGE_QUIZ_CONFIGS[ch.id]?.questions || [];
              const clearedCount = trialQuestions.filter(
                (_, idx) => !!solvedQuestions[`${ch.id}-${idx}`]
              ).length;
              const isAllCleared = trialQuestions.length > 0 && clearedCount === trialQuestions.length;

              return (
                <motion.div
                  key={ch.id}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    sfx("boom");
                    onSelectTrial(ch.id);
                    onClose();
                  }}
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    minHeight: "220px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: isActive
                      ? "2.5px solid #ff2d3a"
                      : isAllCleared
                      ? "2px solid #81c784"
                      : "1.5px solid rgba(255, 45, 58, 0.35)",
                    boxShadow: isActive
                      ? "0 0 25px rgba(255, 45, 58, 0.65), inset 0 0 20px rgba(255, 45, 58, 0.2)"
                      : isAllCleared
                      ? "0 0 16px rgba(129, 199, 132, 0.45)"
                      : "0 6px 16px rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "16px",
                    boxSizing: "border-box",
                    transition: "border 0.2s, box-shadow 0.2s",
                  }}
                >
                  {/* Background Picture with Dark Crimson Gradient */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${ch.bgSrc})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      zIndex: 1,
                      filter: "brightness(0.55) contrast(1.15)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(14, 2, 6, 0.7) 0%, rgba(20, 3, 8, 0.5) 40%, rgba(10, 1, 4, 0.95) 100%)",
                      zIndex: 2,
                    }}
                  />

                  {/* Top Bar: Chapter Tag & Points */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 3,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 10px",
                        background: isActive ? "#ff2d3a" : "rgba(18, 4, 8, 0.85)",
                        color: isActive ? "#000" : "#ff8a80",
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: "11px",
                        fontWeight: "bold",
                        letterSpacing: "0.14em",
                        borderRadius: "3px",
                        border: "1px solid rgba(255, 45, 58, 0.5)",
                      }}
                    >
                      TRIAL {ch.id}
                    </span>

                    <span
                      style={{
                        padding: "3px 8px",
                        background: "rgba(0, 0, 0, 0.75)",
                        color: "#ffcdd2",
                        fontFamily: '"Share Tech Mono", monospace',
                        fontSize: "10.5px",
                        fontWeight: "bold",
                        letterSpacing: "0.08em",
                        borderRadius: "3px",
                        border: "1px solid rgba(255, 45, 58, 0.3)",
                      }}
                    >
                      50 PTS
                    </span>
                  </div>

                  {/* Center Content: Title & Subtitle */}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 3,
                      textAlign: "center",
                      margin: "auto 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontFamily: '"Share Tech Mono", monospace',
                        letterSpacing: "0.2em",
                        color: "#ff7b88",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      {ch.shortName}
                    </div>
                    <div
                      style={{
                        fontFamily: '"ITC Benguiat Std", "Benguiat", serif',
                        fontSize: "18px",
                        fontWeight: 900,
                        color: "#ffffff",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        lineHeight: 1.2,
                        textShadow: "0 0 10px rgba(255, 45, 58, 0.8)",
                      }}
                    >
                      {ch.title}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "rgba(255, 200, 200, 0.65)",
                        fontFamily: '"Share Tech Mono", monospace',
                        marginTop: "4px",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {ch.subtitle}
                    </div>
                  </div>

                  {/* Bottom: Progress Bar & Cleared Count */}
                  <div style={{ position: "relative", zIndex: 3 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "10px",
                        fontFamily: '"Share Tech Mono", monospace',
                        letterSpacing: "0.1em",
                        marginBottom: "5px",
                      }}
                    >
                      <span style={{ color: isAllCleared ? "#81c784" : "#ffb3ba" }}>
                        {isAllCleared ? "✓ ALL CLEARED" : `CLEARED: ${clearedCount} / 10`}
                      </span>
                      <span style={{ color: "rgba(255, 180, 180, 0.6)" }}>
                        {clearedCount * 5} / 50 PTS
                      </span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "5px",
                        background: "rgba(0, 0, 0, 0.8)",
                        borderRadius: "3px",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 45, 58, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          width: `${(clearedCount / 10) * 100}%`,
                          height: "100%",
                          background: isAllCleared ? "#81c784" : "#ff2d3a",
                          boxShadow: isAllCleared
                            ? "0 0 6px #81c784"
                            : "0 0 6px #ff2d3a",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
