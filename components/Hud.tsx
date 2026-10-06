"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { POWERS, PowerId, useGame } from "@/lib/store";
import { ITEMS, STAGE_ORDER, STAGES, StageId } from "@/lib/stages";
import { LocationId } from "@/lib/tasks";
import { isMuted, setMuted, sfx } from "@/lib/audio";

export function SoundToggle({ style }: { style?: React.CSSProperties }) {
  return null;
}

export function Toast() {
  const { toast } = useGame();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          className="toast"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const LOCATION_NAMES: Record<LocationId, string> = {
  town: "HAWKINS TOWN",
  policeStation: "POLICE DEPT",
  byersHouse: "BYERS HOUSE",
  radioTower: "RADIO TOWER",
  lab: "HAWKINS LAB",
  forest: "THE FOREST",
  gate: "THE GATE",
  upsidedown: "UPSIDE DOWN",
  mind: "VECNA'S MIND",
};

export default function Hud() {
  const { s, score, jump, reset, logout, radiometerPinCount, viewMode, setViewMode, activeChapterId, setChapterModalOpen } = useGame();
  const [dev, setDev] = useState(false);
  const [showClueLog, setShowClueLog] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  useEffect(() => {
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      let currentScroll = 0;
      if (target === document || target === document.documentElement || target === document.body) {
        currentScroll = window.scrollY || document.documentElement.scrollTop;
      } else if (target && "scrollTop" in target) {
        currentScroll = (target as HTMLElement).scrollTop;
      }

      if (currentScroll > 25) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  return (
    <>
      {/* Floating Pill Top HUD Navigation Bar (Auto-hides on scroll down) */}
      <div
        style={{
          position: "fixed",
          top: 14,
          left: "clamp(14px, 2.5vw, 28px)",
          right: "clamp(14px, 2.5vw, 28px)",
          maxWidth: 1440,
          margin: "0 auto",
          height: 66,
          background: "linear-gradient(180deg, rgba(14, 3, 7, 0.94) 0%, rgba(6, 1, 3, 0.97) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 12,
          border: "1.5px solid rgba(220, 24, 38, 0.75)",
          boxShadow:
            "0 0 24px rgba(220, 24, 38, 0.3), inset 0 0 16px rgba(220, 24, 38, 0.08), 0 10px 35px rgba(0, 0, 0, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(16px, 2.5vw, 32px)",
          boxSizing: "border-box",
          zIndex: 800,
          overflow: "hidden",
          transform: isScrolledDown ? "translateY(-140%)" : "translateY(0)",
          opacity: isScrolledDown ? 0 : 1,
          pointerEvents: isScrolledDown ? "none" : "auto",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
        }}
      >
        {/* Subtle Background Left Red Constellation Watermark */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 140,
            background: "radial-gradient(circle at 10% 50%, rgba(220, 24, 38, 0.18) 0%, transparent 80%)",
            pointerEvents: "none",
          }}
        />

        {/* LEFT SECTION: HAWKINS / INVESTIGATION // 1986 */}
        <button
          type="button"
          onClick={() => {
            sfx("click");
            setViewMode(viewMode === "board" ? "location" : "board");
          }}
          title="Click to toggle Hawkins Investigation Board"
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-title), Georgia, 'Times New Roman', serif",
              color: "#e61a28",
              fontSize: "clamp(16px, 1.8vw, 19px)",
              fontWeight: 900,
              letterSpacing: ".38em",
              textTransform: "uppercase",
              lineHeight: 1.1,
              textShadow: "0 0 14px rgba(230, 26, 40, 0.55)",
            }}
          >
            H A W K I N S
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "#8a8280",
              fontSize: "clamp(9.5px, 1.1vw, 11px)",
              fontWeight: 600,
              letterSpacing: ".28em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            INVESTIGATION // 1986
          </div>
        </button>

        {/* RIGHT SECTION: SQUAD | SCORE | LOGOUT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Vertical Divider 1 */}
          <div
            style={{
              width: 1,
              height: 36,
              background: "rgba(220, 24, 38, 0.45)",
              margin: "0 clamp(12px, 1.8vw, 24px)",
            }}
          />

          {/* SQUAD MODULE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9.5,
                fontWeight: 700,
                color: "#8a8280",
                letterSpacing: ".24em",
                textTransform: "uppercase",
                marginBottom: 3,
                lineHeight: 1,
              }}
            >
              SQUAD
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "clamp(13.5px, 1.5vw, 15.5px)",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {s.team?.name || "HELLFIRE CLUB"}
            </span>
          </div>

          {/* Vertical Divider 2 */}
          <div
            style={{
              width: 1,
              height: 36,
              background: "rgba(220, 24, 38, 0.45)",
              margin: "0 clamp(12px, 1.8vw, 24px)",
            }}
          />

          {/* SCORE MODULE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9.5,
                fontWeight: 800,
                color: "#e61a28",
                letterSpacing: ".24em",
                textTransform: "uppercase",
                marginBottom: 2,
                lineHeight: 1,
              }}
            >
              SCORE
            </span>
            <span
              style={{
                fontFamily: "var(--font-term), 'VT323', monospace",
                fontSize: "clamp(19px, 2.1vw, 23px)",
                fontWeight: "bold",
                color: "#ff2a3a",
                letterSpacing: ".2em",
                lineHeight: 1,
                textShadow: "0 0 10px rgba(255, 42, 58, 0.85), 0 0 20px rgba(255, 42, 58, 0.4)",
              }}
            >
              {String(score).padStart(5, "0")}
            </span>
          </div>

          {/* Vertical Divider 3 */}
          <div
            style={{
              width: 1,
              height: 36,
              background: "rgba(220, 24, 38, 0.45)",
              margin: "0 clamp(12px, 1.8vw, 24px)",
            }}
          />

          {/* LOGOUT BUTTON */}
          <button
            id="player-logout-btn"
            type="button"
            style={{
              padding: "7px clamp(16px, 1.8vw, 24px)",
              background: "rgba(220, 24, 38, 0.08)",
              border: "1.5px solid rgba(220, 24, 38, 0.75)",
              borderRadius: 6,
              color: "#e61a28",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "clamp(11px, 1.2vw, 12.5px)",
              fontWeight: 800,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 14px rgba(220, 24, 38, 0.2)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e61a28";
              e.currentTarget.style.color = "#000000";
              e.currentTarget.style.boxShadow = "0 0 22px rgba(220, 24, 38, 0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(220, 24, 38, 0.08)";
              e.currentTarget.style.color = "#e61a28";
              e.currentTarget.style.boxShadow = "0 0 14px rgba(220, 24, 38, 0.2)";
            }}
            onClick={() => {
              if (confirm("Log out of Hawkins Protocol and return to login screen?")) {
                logout();
              }
            }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Slide-out Clue Log Drawer */}
      <AnimatePresence>
        {showClueLog && (
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            style={{
              position: "fixed",
              top: 60,
              right: 14,
              width: 340,
              maxHeight: "80vh",
              background: "rgba(10, 14, 20, 0.96)",
              border: "1px solid var(--accent)",
              borderRadius: 6,
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
              zIndex: 890,
              padding: "16px 18px",
              fontFamily: "var(--font-term)",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              <div className="eyebrow" style={{ color: "var(--accent)" }}>
                DISCOVERED INTEL &amp; CLUES
              </div>
              <button
                type="button"
                onClick={() => setShowClueLog(false)}
                style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 13, letterSpacing: ".1em" }}
              >
                [CLOSE]
              </button>
            </div>

            {Object.keys(s.clues || {}).length === 0 ? (
              <div className="term dim" style={{ fontSize: 14, padding: "10px 0" }}>
                No clues logged yet. Solve tasks at Hawkins locations to collect evidence.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(s.clues || {}).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      padding: "8px 10px",
                    }}
                  >
                    <div className="eyebrow" style={{ fontSize: 10, color: "var(--accent2)" }}>
                      {key.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 14, color: "#fff", marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ICON: Record<PowerId, string> = { vision: "SIGHT", will: "LINK", eleven: "FORCE" };
const LABEL: Record<PowerId, string> = { vision: "EYE", will: "WAVE", eleven: "PSI" };

export function Dock() {
  const { s, powerUnlocked, castPower, active, say } = useGame();
  const cast = (p: PowerId) => {
    if (!powerUnlocked(p)) return say(`${POWERS[p].name} — LOCKED`);
    if (!active) return say("OPEN A TASK FIRST");
    const r = castPower(p, active);
    if (r === "ALREADY") say("ALREADY USED ON THIS TASK");
  };

  return (
    <div className="dock">
      {(Object.keys(POWERS) as PowerId[]).map((p) => {
        const un = powerUnlocked(p);
        const left = POWERS[p].max - (s.powerUses?.[p] || 0);
        return (
          <button
            key={p}
            className={`slot ${un && left > 0 ? "ready" : "locked"}`}
            onClick={() => cast(p)}
            title={`${POWERS[p].name} — ${POWERS[p].blurb} (-10 pts)`}
          >
            <span className="g" style={{ fontSize: un ? 28 : 12, letterSpacing: ".1em" }}>
              {un ? ICON[p] : "[LOCK]"}
            </span>
            <small>{LABEL[p]}</small>
            {un && <span className="ch">{left}</span>}
          </button>
        );
      })}

      {s.inventory?.length > 0 && <div className="sep" />}

      {s.inventory?.map((id) => (
        <div key={id} className="slot item" title={`${ITEMS[id]?.name}: ${ITEMS[id]?.desc}`}>
          <span className="g" style={{ color: "var(--accent2)" }}>
            {ITEMS[id]?.glyph || "▤"}
          </span>
        </div>
      ))}
    </div>
  );
}
