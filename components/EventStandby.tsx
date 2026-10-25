"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";
import { useGame } from "@/lib/store";

interface EventStandbyProps {
  onEventStarted: () => void;
  isEnded?: boolean;
}

export default function EventStandby({ onEventStarted, isEnded = false }: EventStandbyProps) {
  const { s } = useGame();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let active = true;
    const checkState = async () => {
      try {
        const res = await fetch(`/api/admin/event/state?_t=${Date.now()}`);
        const data = await res.json();
        if (active && data.success && data.eventState) {
          if (data.eventState.status === "active") {
            sfx("boom");
            onEventStarted();
          }
        }
      } catch {}
    };

    const interval = setInterval(() => {
      setPulse((p) => (p + 1) % 4);
      checkState();
    }, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [onEventStarted]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        backgroundColor: "#070406",
        backgroundImage:
          "radial-gradient(circle at 50% 35%, rgba(184, 29, 36, 0.22) 0%, rgba(10, 4, 6, 0.95) 70%, #000 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: "var(--font-mono), monospace",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* CRT Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%)",
          backgroundSize: "100% 4px",
          pointerEvents: "none",
          opacity: 0.8,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: "680px",
          width: "92%",
          background: "rgba(18, 8, 12, 0.9)",
          border: "2px solid #b81d24",
          boxShadow:
            "0 0 50px rgba(184, 29, 36, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.8)",
          borderRadius: "4px",
          padding: "clamp(24px, 4vw, 38px)",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Top Department Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 14px",
            backgroundColor: "rgba(184, 29, 36, 0.2)",
            border: "1px solid #b81d24",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff5964",
            fontWeight: 800,
            letterSpacing: ".2em",
            marginBottom: "20px",
          }}
        >
          <span>●</span>
          <span>HAWKINS NATIONAL LABORATORY // INCIDENT BRIEF</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily:
              '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", Georgia, serif',
            fontSize: "clamp(24px, 3.5vw, 36px)",
            fontWeight: 900,
            color: "#ff2230",
            letterSpacing: ".1em",
            margin: "0 0 12px",
            textShadow:
              "0 0 20px rgba(255, 34, 48, 0.8), 0 0 40px rgba(184, 29, 36, 0.6)",
          }}
        >
          {isEnded ? "TOURNAMENT CONCLUDED" : "EVENT ON STANDBY"}
        </h1>

        <p
          style={{
            fontSize: "clamp(13px, 1.3vw, 15px)",
            color: "#e2d5c5",
            lineHeight: 1.6,
            marginBottom: "24px",
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {isEnded
            ? "The Hawkins Invitational Tournament has officially ended. All final team standings and investigation files have been archived into Department of Energy historical records."
            : "Chief Hopper and the Command Bridge have not yet authorized the tournament start signal. Until the event is officially initiated by the Admin, investigation files remain classified and locked."}
        </p>

        {/* Squad Status Box */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            border: "1px dashed rgba(255, 255, 255, 0.2)",
            borderRadius: "4px",
            padding: "14px 20px",
            marginBottom: "26px",
            display: "flex",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: "12px",
            textAlign: "left",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "#777", letterSpacing: ".1em", marginBottom: "3px" }}>
              AUTHENTICATED SQUAD:
            </div>
            <div style={{ color: "#ffd54f", fontWeight: 900, fontSize: "14px" }}>
              {(s.team as any)?.teamName || s.team.name || "OPERATIVE"}
            </div>
          </div>
          <div>
            <div style={{ color: "#777", letterSpacing: ".1em", marginBottom: "3px" }}>
              SQUAD LEADER:
            </div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>
              {s.team.leaderName || "LEADER"}
            </div>
          </div>
          <div>
            <div style={{ color: "#777", letterSpacing: ".1em", marginBottom: "3px" }}>
              TERMINAL STATUS:
            </div>
            <div style={{ color: "#36e0c4", fontWeight: 800, fontSize: "14px" }}>
              ONLINE (STANDBY)
            </div>
          </div>
        </div>

        {/* Pulsing Signal Beacon */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 18px",
            background: "rgba(255, 45, 58, 0.12)",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            borderRadius: "30px",
            fontSize: "12px",
            color: "#ff737d",
            letterSpacing: ".12em",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#ff2230",
              boxShadow: "0 0 12px #ff2230",
              display: "inline-block",
            }}
          />
          <span>AWAITING ADMIN LAUNCH TRANSMISSION{".".repeat(pulse + 1)}</span>
        </div>

        <div
          style={{
            marginTop: "20px",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
            letterSpacing: ".06em",
          }}
        >
          ※ THIS SCREEN WILL AUTOMATICALLY TRANSITION THE MOMENT THE ADMIN CLICKS &quot;START EVENT&quot;.
        </div>
      </motion.div>
    </div>
  );
}
