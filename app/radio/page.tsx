"use client";
import React, { useEffect } from "react";
import Radiometer from "@/components/Radiometer";
import Hud, { SoundToggle, Toast } from "@/components/Hud";
import CinematicBackground from "@/components/CinematicBackground";
import { useGame } from "@/lib/store";

export default function RadioPage() {
  const { session, loginPlayer } = useGame();

  useEffect(() => {
    if (!session) {
      loginPlayer({ id: "T01", teamName: "Null Pointers", leaderName: "Aarav Sharma" });
    }
  }, [session, loginPlayer]);

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "70px 20px clamp(140px, 28vh, 300px)",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <CinematicBackground
        src="/hawkins-gate-bg.jpg"
        particles="spores"
        vignette="heavy"
        overlayOpacity={0.65}
      />

      <div
        className="panel"
        style={{
          width: "min(1180px, 94vw)",
          background: "rgba(10, 5, 10, 0.95)",
          border: "1px solid rgba(255, 45, 58, 0.35)",
          boxShadow: "0 0 45px rgba(0,0,0,0.92)",
          borderRadius: 6,
          padding: "24px 28px",
          position: "relative",
          zIndex: 10,
          marginBottom: 30,
        }}
      >
        <Radiometer />
      </div>

      <Hud />
      <Toast />
    </div>
  );
}
