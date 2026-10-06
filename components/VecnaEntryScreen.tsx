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
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterVecnaMode = () => {
    sfx("gate");
    setIsEntering(true);
    setTimeout(() => {
      if (onEnter) {
        onEnter();
      } else {
        router.push("/vecna");
      }
    }, 3800);
  };

  const handleSkipAnimation = () => {
    if (onEnter) {
      onEnter();
    } else {
      router.push("/vecna");
    }
  };

  const barShadow =
    flashLevel > 0
      ? "0 0 5px rgba(255, 60, 80, 0.45), 0 0 10px rgba(255, 30, 45, 0.25)"
      : "0 0 2px rgba(255, 30, 45, 0.35), 0 0 4px rgba(255, 30, 45, 0.12)";

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
      {/* Cinematic Photorealistic Background with reduced red haze */}
      <CinematicBackground
        src="/upsidedown-bg.jpg"
        particles="none"
        vignette="heavy"
        overlayOpacity={0.82}
      />

      {/* Realistic Frequent Procedural Red Lightning & Embers Canvas (50% toned down) */}
      <RedLightningCanvas
        density="normal"
        onFlash={(intensity) => setFlashLevel(intensity * 0.5)}
      />

      {/* Subtle Atmospheric Crimson Overlay (Reduced Glow by 50%) */}
      <div
        className="layer"
        style={{
          zIndex: 3,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255, 20, 35, 0.11) 0%, transparent 68%), radial-gradient(ellipse at 80% 60%, rgba(180, 10, 25, 0.12) 0%, transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 35%, rgba(0,0,0,0.9) 100%)",
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
              '"Benguiat Bold", "ITC Benguiat", "ITC Benguiat Std", serif',
            fontSize: "clamp(16px, 1.8vw, 20px)",
            letterSpacing: "0.15em",
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#e8eff5",
          }}
        >
          VECNA <span style={{ color: "#ff2d3a" }}>CONTROL</span>
        </div>
      </header>

      {/* CENTER CINEMATIC VECNA ENTRY */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
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

        {/* Divider line (50% toned down) */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            width: "56px",
            height: "2px",
            background: "#ff2d3a",
            marginBottom: "28px",
            boxShadow: "0 0 4px rgba(255, 45, 58, 0.35)",
          }}
        />

        {/* VECNA TITLE IN STRANGER THINGS FONT WITH REDUCED GLOW */}
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
                ? `drop-shadow(0 0 ${4 + flashLevel * 6}px rgba(255, 50, 70, 0.45)) drop-shadow(0 0 ${9 + flashLevel * 10}px rgba(255, 30, 45, 0.25))`
                : "drop-shadow(0 0 2.5px rgba(255, 30, 45, 0.38)) drop-shadow(0 0 6px rgba(255, 30, 45, 0.15))",
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
                '"Benguiat Bold", "ITC Benguiat", "ITC Benguiat Std", serif',
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

        {/* CTA BUTTON: [ ENTER VECNA MODE ] (Stranger Things Font, No Arrow) */}
        <motion.button
          id="enter-vecna-mode-btn"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: "#7a0a12",
            borderColor: "#a6121c",
            boxShadow: "0 0 18px rgba(180, 20, 35, 0.6), inset 0 0 12px rgba(0, 0, 0, 0.5)",
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleEnterVecnaMode}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "16px",
            padding: "16px 54px",
            background: "#ff2230",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1.5px solid #ff5964",
            color: "#ffffff",
            fontFamily:
              '"Benguiat Bold", "ITC Benguiat", "ITC Benguiat Std", serif',
            fontSize: "clamp(16px, 1.8vw, 20px)",
            fontWeight: 900,
            letterSpacing: "0.22em",
            cursor: "pointer",
            boxShadow:
              "0 0 14px rgba(255, 34, 48, 0.35), inset 0 0 8px rgba(255, 255, 255, 0.2)",
            transition: "all 0.3s ease",
          }}
        >
          <span>ENTER VECNA MODE</span>
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

      {/* CINEMATIC HAWKINS-STYLE VECNA CONTROL CHAPTER OVERLAY ANIMATION */}
      {isEntering && (
        <motion.div
          key="vecna-cinematic-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6 }}
          onClick={handleSkipAnimation}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#080002",
            cursor: "pointer",
          }}
        >
          {/* Animated background glow */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse at 50% 50%, rgba(120, 0, 20, 0.5), transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.5] }}
            transition={{ duration: 2 }}
          />
          {/* Scanline effect on card */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0) 4px)",
              pointerEvents: "none",
            }}
          />

          <motion.div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(14px, 1.8vw, 20px)",
              color: "#36e0c4",
              letterSpacing: "0.55em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            C H A P T E R &nbsp; 0
          </motion.div>

          <motion.h1
            style={{
              fontFamily:
                '"Benguiat Bold", "ITC Benguiat", "ITC Benguiat Std", serif',
              fontSize: "clamp(3.8rem, 10vw, 8rem)",
              fontWeight: 900,
              background: "linear-gradient(180deg, #ff71ce 0%, #ff2d3a 52%, #b7121f 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 16px rgba(255, 45, 58, 0.7))",
              letterSpacing: "-0.01em",
              margin: "0 0 12px 0",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
            initial={{ opacity: 0, scale: 1.15, filter: "blur(14px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.4, delay: 0.5 }}
          >
            VECNA CONTROL
          </motion.h1>

          <motion.div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(13px, 1.4vw, 17px)",
              color: "rgba(215, 235, 240, 0.75)",
              letterSpacing: "0.25em",
              marginBottom: "28px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            The Upside Down · Oct 21st · 02:17 AM
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.8, duration: 1.2 }}
            style={{
              height: 2,
              width: "min(400px, 60vw)",
              background: "linear-gradient(90deg, transparent, #ff2d3a, transparent)",
              boxShadow: "0 0 12px #ff2d3a",
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
