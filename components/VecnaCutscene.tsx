"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx, setDroneTheme } from "@/lib/audio";
import Glitch from "./Glitch";

interface VecnaCutsceneProps {
  onDismiss: () => void;
}

export default function VecnaCutscene({ onDismiss }: VecnaCutsceneProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setDroneTheme("mind");
    sfx("alarm");

    const t1 = setTimeout(() => {
      setStep(1); // CONNECTION ESTABLISHED
      sfx("glitch");
    }, 1500);

    const t2 = setTimeout(() => {
      setStep(2); // VECNA HAS FOUND YOU
      sfx("heartbeat");
      sfx("boom");
    }, 3200);

    const t3 = setTimeout(() => {
      setStep(3); // YOU SHOULD NOT HAVE COME THIS FAR
      sfx("clockChime");
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "radial-gradient(ellipse at 50% 50%, #200407 0%, #000000 85%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-term)",
        textAlign: "center",
      }}
    >
      {/* Background Animated Veins / Noise */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(255, 45, 58, 0.25) 0%, transparent 60%)",
          animation: "pulse 2s infinite ease-in-out",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 720, position: "relative", zIndex: 10 }}>
        {/* Step 0: Unknown connection */}
        {step >= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: "#ff2d3a", fontSize: 20, letterSpacing: ".3em", marginBottom: 16 }}
          >
            [!] UNKNOWN CONNECTION DETECTED . . .
          </motion.div>
        )}

        {/* Step 1: Connection established */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ color: "var(--accent2)", fontSize: 24, letterSpacing: ".2em", marginBottom: 28 }}
          >
            CONNECTION ESTABLISHED.
          </motion.div>
        )}

        {/* Step 2: VECNA HAS FOUND YOU */}
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.6 }}
            style={{ margin: "20px 0" }}
          >
            <h1
              className="title-xl"
              style={{
                fontSize: "clamp(38px, 8vw, 76px)",
                color: "#ff2d3a",
                lineHeight: 1.1,
              }}
            >
              <Glitch text="VECNA HAS FOUND YOU." hard />
            </h1>
          </motion.div>
        )}

        {/* Step 3: Sinister final message */}
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div
              style={{
                fontSize: "clamp(20px, 3.5vw, 28px)",
                color: "#fff",
                letterSpacing: ".2em",
                margin: "24px 0 36px",
              }}
            >
              &quot;YOU SHOULD NOT HAVE COME THIS FAR.&quot;
            </div>

            <button
              className="btn red big pulse-cta"
              onClick={() => {
                sfx("boom");
                onDismiss();
              }}
              style={{ fontSize: 22, padding: "16px 36px" }}
            >
              ENTER VECNA&apos;S MIND
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
