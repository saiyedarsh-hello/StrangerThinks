"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { authenticateTeamWithSupabase } from "@/lib/supabaseService";
import { saveSession } from "@/lib/config";
import CinematicBackground from "./CinematicBackground";
import RedLightningCanvas from "./RedLightningCanvas";

interface LandingPageProps {
  onEnterVecna?: () => void;
}

/**
 * Clean, calibrated Stranger Things Logo Lockup with bolder typography & refined contour glow
 */
function StrangerThingsLogo({ flashLevel = 0 }: { flashLevel?: number }) {
  const fontStack =
    '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", "Playfair Display", Georgia, serif';

  const barShadow =
    flashLevel > 0
      ? "0 0 8px rgba(230, 26, 40, 0.8), 0 2px 8px rgba(0, 0, 0, 0.9)"
      : "0 0 4px rgba(230, 26, 40, 0.55), 0 2px 6px rgba(0, 0, 0, 0.85)";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        width: "min(96vw, 1100px)",
        margin: "0 auto 36px auto",
        filter:
          flashLevel > 0
            ? "drop-shadow(0 0 10px rgba(230, 26, 40, 0.75)) drop-shadow(0 6px 22px rgba(0, 0, 0, 0.98))"
            : "drop-shadow(0 0 5px rgba(230, 26, 40, 0.5)) drop-shadow(0 4px 18px rgba(0, 0, 0, 0.95))",
        transition: "filter 0.08s ease-out",
      }}
    >
      {/* Top Word: S - TRANGE - R */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          width: "100%",
          lineHeight: 0.85,
        }}
      >
        {/* Top Horizontal Red Bar bridging over TRANGE */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "14%",
            right: "14%",
            height: "8px",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />

        {/* Large 'S' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(5.8rem, 14.5vw, 14rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "5.5px #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "-0.02em",
            transform: "translateY(12%)",
            zIndex: 2,
          }}
        >
          S
        </span>

        {/* Middle 'TRANGE' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(4.4rem, 11vw, 10.6rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "5.5px #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "0.01em",
            paddingTop: "14px",
            zIndex: 1,
          }}
        >
          TRANGE
        </span>

        {/* Large 'R' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(5.8rem, 14.5vw, 14rem)",
            fontWeight: 900,
            color: "#e61a28",
            WebkitTextStroke: "5.5px #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "-0.02em",
            transform: "translateY(12%)",
            zIndex: 2,
          }}
        >
          R
        </span>
      </div>

      {/* Bottom Row: [Left Bar] THINGS [Right Bar] */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          marginTop: "8px",
          gap: "clamp(10px, 2.5vw, 24px)",
        }}
      >
        {/* Left Flanking Bar */}
        <div
          style={{
            flex: 1,
            height: "8px",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />

        {/* Center 'THINGS' */}
        <span
          style={{
            fontFamily: fontStack,
            fontSize: "clamp(4.4rem, 11vw, 10.6rem)",
            fontWeight: 900,
            lineHeight: 0.9,
            color: "#e61a28",
            WebkitTextStroke: "5.5px #ff2a3a",
            paintOrder: "stroke fill",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          THINGS
        </span>

        {/* Right Flanking Bar */}
        <div
          style={{
            flex: 1,
            height: "8px",
            background: "#e61a28",
            boxShadow: barShadow,
            borderRadius: "1px",
            transition: "box-shadow 0.08s ease-out",
          }}
        />
      </div>
    </div>
  );
}

export default function LandingPage({ onEnterVecna }: LandingPageProps) {
  const router = useRouter();
  const { loginPlayer, setSoundOn } = useGame();

  const [flashLevel, setFlashLevel] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleOpenAuth = () => {
    sfx("click");
    setSoundOn(true);
    setShowModal(true);
  };

  const handleCloseAuth = () => {
    sfx("click");
    setShowModal(false);
    setError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim()) return;

    setIsAuthenticating(true);
    setError(false);

    try {
      const authResult = await authenticateTeamWithSupabase(teamName, leaderName);

      if (authResult.success) {
        setError(false);
        sfx("boom");

        if (authResult.session.role === "VECNA") {
          saveSession(authResult.session);
          if (onEnterVecna) {
            onEnterVecna();
          } else {
            router.push("/vecna");
          }
        } else {
          loginPlayer({
            id: authResult.session.teamId || "T01",
            teamName: authResult.session.teamName,
            leaderName: authResult.session.leaderName,
          });
        }
      } else {
        setError(true);
        setErrorMessage(authResult.error || "UNKNOWN TEAM CREDENTIALS");
        sfx("err");
      }
    } catch (err: any) {
      setError(true);
      setErrorMessage(err.message || "DATABASE CONNECTION ERROR");
      sfx("err");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        background: "#05080b",
      }}
    >
      {/* Cinematic Photorealistic Hawkins Road Background */}
      <CinematicBackground
        src="/hawkins-town-bg.jpg"
        particles="none"
        vignette="medium"
        overlayOpacity={0.42}
      />

      {/* Realistic Procedural Red Lightning & Embers Canvas (Layered behind text) */}
      <RedLightningCanvas density="normal" onFlash={(intensity) => setFlashLevel(intensity)} />

      {/* Subtle Atmospheric Dark Vignette Layer */}
      <div
        className="layer"
        style={{
          zIndex: 3,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 50%, transparent 35%, rgba(0, 0, 0, 0.78) 100%), linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* CENTER STRANGER THINGS TITLE & ENTER CTA */}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
        >
          <StrangerThingsLogo flashLevel={flashLevel} />
        </motion.div>

        {/* SINGLE MINIMAL ENTER BUTTON (Matches Uploaded Image, No Arrow) */}
        <motion.button
          id="enter-btn"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: "#7a0a12",
            borderColor: "#a6121c",
            boxShadow: "0 0 32px rgba(255, 34, 48, 0.8), inset 0 0 16px rgba(0, 0, 0, 0.5)",
          }}
          whileTap={{ scale: 0.96 }}
          onClick={handleOpenAuth}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "36px",
            padding: "16px 58px",
            background: "#ff2230",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1.5px solid #ff5964",
            borderRadius: "2px",
            color: "#ffffff",
            fontFamily:
              '"ITC Benguiat Std", "Benguiat", "Benguiat Bold Condensed", "Libre Caslon Display", "Playfair Display", Georgia, serif',
            fontSize: "clamp(17px, 1.9vw, 22px)",
            fontWeight: 900,
            letterSpacing: "0.25em",
            cursor: "pointer",
            boxShadow:
              "0 0 28px rgba(255, 34, 48, 0.65), inset 0 0 14px rgba(255, 255, 255, 0.25)",
            transition: "all 0.3s ease",
          }}
        >
          <span>ENTER</span>
        </motion.button>
      </main>

      {/* AUTHENTICATION / ENTER PROTOCOL MODAL */}
      <AnimatePresence>
        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              padding: "20px",
            }}
            onClick={handleCloseAuth}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{
                width: "min(460px, 94vw)",
                background: "rgba(12, 6, 10, 0.96)",
                border: "1.5px solid rgba(255, 45, 58, 0.5)",
                boxShadow:
                  "0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 58, 0.2)",
                padding: "36px 32px",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseAuth}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "20px",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: "center", marginBottom: "26px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    letterSpacing: "0.3em",
                    color: "#ff3b45",
                    marginBottom: "6px",
                  }}
                >
                  TRANSMISSION CREDENTIALS
                </div>
                <h3
                  style={{
                    fontFamily:
                      '"ITC Benguiat Std", "Benguiat", "Libre Caslon Display", "Playfair Display", serif',
                    fontSize: "26px",
                    color: "#ffffff",
                    letterSpacing: "0.05em",
                    margin: 0,
                  }}
                >
                  ENTER THE PROTOCOL
                </h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "18px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginBottom: "6px",
                    }}
                  >
                    TEAM NAME
                  </label>
                  <input
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="ENTER TEAM NAME..."
                    maxLength={40}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0, 0, 0, 0.6)",
                      border: error
                        ? "1.5px solid #ff2d3a"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      letterSpacing: "0.1em",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginBottom: "6px",
                    }}
                  >
                    TEAM LEADER NAME
                  </label>
                  <input
                    value={leaderName}
                    onChange={(e) => {
                      setLeaderName(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="ENTER LEADER NAME..."
                    maxLength={40}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "rgba(0, 0, 0, 0.6)",
                      border: error
                        ? "1.5px solid #ff2d3a"
                        : "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ffffff",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      letterSpacing: "0.1em",
                      outline: "none",
                    }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      color: "#ff2d3a",
                      marginBottom: "18px",
                      padding: "10px",
                      background: "rgba(255, 45, 58, 0.12)",
                      border: "1px solid #ff2d3a",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      textAlign: "center",
                      letterSpacing: "0.1em",
                    }}
                  >
                    [ACCESS DENIED] {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    !teamName.trim() || !leaderName.trim() || isAuthenticating
                  }
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#ff2d3a",
                    border: "none",
                    color: "#ffffff",
                    fontFamily: "var(--font-mono)",
                    fontSize: "15px",
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    opacity: isAuthenticating ? 0.7 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {isAuthenticating
                    ? "AUTHENTICATING..."
                    : "CONFIRM & ENTER"}
                </button>

                {/* Quick Autofill Chips */}
                <div style={{ marginTop: "20px", textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.4)",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    DEMO TEAMS / OPERATORS
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    {[
                      { t: "Null Pointers", l: "Aarav Sharma" },
                      { t: "Hellfire Club", l: "Eddie Munson" },
                      { t: "Vecna", l: "Henry Creel" },
                    ].map((chip) => (
                      <button
                        key={chip.t}
                        type="button"
                        onClick={() => {
                          setTeamName(chip.t);
                          setLeaderName(chip.l);
                          setError(false);
                        }}
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          padding: "4px 8px",
                          border:
                            chip.t === "Vecna"
                              ? "1px solid #ff2d3a"
                              : "1px solid rgba(255, 255, 255, 0.15)",
                          color:
                            chip.t === "Vecna"
                              ? "#ff4d58"
                              : "rgba(255, 255, 255, 0.7)",
                          background:
                            chip.t === "Vecna"
                              ? "rgba(255, 45, 58, 0.15)"
                              : "rgba(255, 255, 255, 0.05)",
                          cursor: "pointer",
                        }}
                      >
                        {chip.t === "Vecna" ? "👁️ " : "⚡ "}
                        {chip.t}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
