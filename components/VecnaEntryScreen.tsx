"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { sfx } from "@/lib/audio";
import CinematicBackground from "./CinematicBackground";
import RedLightningCanvas from "./RedLightningCanvas";

interface VecnaEntryScreenProps {
  onEnter?: () => void;
}

export default function VecnaEntryScreen({ onEnter }: VecnaEntryScreenProps) {
  const router = useRouter();
  const [flashLevel, setFlashLevel] = useState(0);

  const handleEnterVecnaMode = () => {
    sfx("boom");
    if (onEnter) {
      onEnter();
    } else {
      router.push("/vecna");
    }
  };

  const barShadow =
    flashLevel > 0
      ? "0 0 10px rgba(255, 60, 80, 0.9), 0 0 20px rgba(255, 30, 45, 0.5)"
      : "0 0 4px rgba(255, 30, 45, 0.75), 0 0 8px rgba(255, 30, 45, 0.25)";

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        background: "#080103",
      }}
    >
      {/* Cinematic Photorealistic Background */}
      <CinematicBackground
        src="/upsidedown-bg.jpg"
        particles="none"
        vignette="heavy"
        overlayOpacity={0.72}
      />

      {/* Realistic Frequent Procedural Red Lightning & Embers Canvas */}
      <RedLightningCanvas
        density="vecna_heavy"
        onFlash={(intensity) => setFlashLevel(intensity)}
      />

      {/* Subtle Atmospheric Crimson Overlay (Reduced Haze) */}
      <div
        className="layer"
        style={{
          zIndex: 3,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255, 20, 35, 0.22) 0%, transparent 68%), radial-gradient(ellipse at 80% 60%, rgba(180, 10, 25, 0.25) 0%, transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 35%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* TOP HEADER */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "24px 44px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily:
              '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
            fontSize: "clamp(16px, 1.8vw, 20px)",
            letterSpacing: "0.15em",
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#e8eff5",
          }}
        >
          HAWKINS <span style={{ color: "#ff2d3a" }}>PROTOCOL</span>
        </div>
      </header>

      {/* CENTER CINEMATIC VECNA ENTRY */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "20px",
          margin: "auto 0",
        }}
      >
        {/* Eyebrow: YOU HAVE BEEN CHOSEN */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(13px, 1.4vw, 17px)",
            letterSpacing: "0.5em",
            color: "rgba(255, 210, 215, 0.85)",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}
        >
          YOU HAVE BEEN CHOSEN
        </motion.div>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            width: "56px",
            height: "2px",
            background: "#ff2d3a",
            marginBottom: "28px",
            boxShadow: "0 0 8px rgba(255, 45, 58, 0.7)",
          }}
        />

        {/* VECNA TITLE WITH CRISP SHARP NEON & REDUCED BLUR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          style={{
            position: "relative",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "18px",
            padding: "8px 24px",
            filter:
              flashLevel > 0
                ? `drop-shadow(0 0 ${8 + flashLevel * 12}px rgba(255, 50, 70, 0.9)) drop-shadow(0 0 ${18 + flashLevel * 20}px rgba(255, 30, 45, 0.5))`
                : "drop-shadow(0 0 5px rgba(255, 30, 45, 0.75)) drop-shadow(0 0 12px rgba(255, 30, 45, 0.3))",
            transition: "filter 0.08s ease-out",
          }}
        >
          {/* Top Thin Red Framing Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "4%",
              right: "4%",
              height: "4px",
              background: "#ff2230",
              boxShadow: barShadow,
              transition: "box-shadow 0.08s ease-out",
            }}
          />

          <h1
            style={{
              fontFamily:
                '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
              fontSize: "clamp(6.2rem, 16vw, 14.5rem)",
              fontWeight: 900,
              lineHeight: 0.95,
              color: "#ff2230",
              letterSpacing: "-0.01em",
              margin: 0,
              padding: "4px 8px",
              textTransform: "uppercase",
              WebkitTextStroke: "4.0px #ff5964",
              paintOrder: "stroke fill",
              whiteSpace: "nowrap",
            }}
          >
            VECNA
          </h1>

          {/* Bottom Thin Red Framing Bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "4%",
              right: "4%",
              height: "4px",
              background: "#ff2230",
              boxShadow: barShadow,
              transition: "box-shadow 0.08s ease-out",
            }}
          />
        </motion.div>

        {/* Subtitle: CONTROL THE PROTOCOL */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(13px, 1.4vw, 18px)",
            letterSpacing: "0.4em",
            color: "rgba(255, 220, 225, 0.85)",
            textTransform: "uppercase",
            marginBottom: "46px",
          }}
        >
          CONTROL THE PROTOCOL
        </motion.div>

        {/* CTA BUTTON: [ ENTER VECNA MODE → ] */}
        <motion.button
          id="enter-vecna-mode-btn"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: "#6b080f",
            borderColor: "#8f0d16",
            boxShadow: "0 0 30px rgba(130, 10, 20, 0.85), inset 0 0 18px rgba(0, 0, 0, 0.6)",
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleEnterVecnaMode}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            marginTop: "16px",
            padding: "16px 54px",
            background: "#ff2230",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1.5px solid #ff5964",
            color: "#ffffff",
            fontFamily:
              '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
            fontSize: "clamp(16px, 1.8vw, 20px)",
            fontWeight: 900,
            letterSpacing: "0.25em",
            cursor: "pointer",
            boxShadow:
              "0 0 28px rgba(255, 34, 48, 0.65), inset 0 0 14px rgba(255, 255, 255, 0.25)",
            transition: "all 0.3s ease",
          }}
        >
          <span>ENTER VECNA MODE</span>
          <span style={{ fontSize: "1.2em" }}>→</span>
        </motion.button>
      </main>

      {/* FOOTER BAR */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "18px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "rgba(255, 200, 200, 0.4)",
          letterSpacing: "0.15em",
        }}
      >
        <div>VECNA CONTROL PROTOCOL · 1986</div>
        <div>AUTHORIZED GAMEMASTER ACCESS ONLY</div>
      </footer>
    </div>
  );
}
