"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/audio";
import { authenticateTeamWithSupabase } from "@/lib/supabaseService";
import { saveSession } from "@/lib/config";
import CinematicBackground from "./CinematicBackground";

export default function LoginScreen() {
  const router = useRouter();
  const { loginPlayer } = useGame();

  const [teamName, setTeamName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

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
          router.push("/vecna");
        } else {
          // Player credentials -> go to player game (cinematic intro, then map)
          loginPlayer({
            id: authResult.session.teamId || "T01",
            teamName: authResult.session.teamName,
            leaderName: authResult.session.leaderName,
          });
        }
      } else {
        setError(true);
        setErrorMessage(authResult.error || "UNKNOWN TEAM CREDENTIALS IN DATABASE");
        setShakeKey((k) => k + 1);
        sfx("err");
      }
    } catch (err: any) {
      setError(true);
      setErrorMessage(err.message || "DATABASE CONNECTION ERROR");
      setShakeKey((k) => k + 1);
      sfx("err");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className="screen"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CinematicBackground src="random" particles="spores" vignette="medium" overlayOpacity={0.7} />

      <motion.div
        key={shakeKey}
        className="panel content"
        style={{
          width: "min(490px, 92vw)",
          background: "rgba(10, 5, 9, 0.90)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: error ? "1px solid var(--danger)" : "1px solid rgba(255, 45, 58, 0.4)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.95)",
          zIndex: 10,
          padding: "36px 32px",
        }}
        initial={{ opacity: 0, y: 25 }}
        animate={
          error
            ? { x: [-14, 14, -10, 10, -6, 6, -2, 2, 0], opacity: 1, y: 0 }
            : { opacity: 1, y: 0 }
        }
        transition={{ duration: 0.45 }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            className="title-xl"
            style={{
              fontSize: "clamp(26px, 5.5vw, 40px)",
              color: "#ff3b45",
              margin: 0,
            }}
          >
            THE HAWKINS PROTOCOL
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label
              className="lbl"
              htmlFor="team-name-input"
              style={{ letterSpacing: ".15em", fontSize: 13 }}
            >
              TEAM NAME
            </label>
            <input
              id="team-name-input"
              className="field"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                if (error) setError(false);
              }}
              placeholder="ENTER TEAM NAME..."
              maxLength={40}
              autoFocus
              autoComplete="off"
              style={{
                fontSize: 18,
                borderColor: error ? "var(--danger)" : undefined,
                letterSpacing: ".1em",
              }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <label
              className="lbl"
              htmlFor="leader-name-input"
              style={{ letterSpacing: ".15em", fontSize: 13 }}
            >
              LEADER NAME
            </label>
            <input
              id="leader-name-input"
              className="field"
              value={leaderName}
              onChange={(e) => {
                setLeaderName(e.target.value);
                if (error) setError(false);
              }}
              placeholder="ENTER LEADER NAME..."
              maxLength={40}
              autoComplete="off"
              style={{
                fontSize: 18,
                borderColor: error ? "var(--danger)" : undefined,
                letterSpacing: ".1em",
              }}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                id="login-error-msg"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  color: "var(--danger)",
                  marginTop: 18,
                  padding: "10px 14px",
                  background: "rgba(255, 45, 58, 0.12)",
                  border: "1px solid var(--danger)",
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: "var(--font-term)",
                  textAlign: "center",
                  letterSpacing: ".1em",
                  fontWeight: "bold",
                }}
              >
                [ACCESS DENIED] {errorMessage || "UNKNOWN TEAM CREDENTIALS"}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="login-enter-btn"
            type="submit"
            className="btn big"
            style={{
              marginTop: 24,
              width: "100%",
              fontSize: 18,
              padding: "14px 20px",
              letterSpacing: ".2em",
              boxShadow: "none",
              animation: "none",
              opacity: isAuthenticating ? 0.7 : 1,
            }}
            disabled={!teamName.trim() || !leaderName.trim() || isAuthenticating}
          >
            {isAuthenticating ? "VERIFYING VIA SUPABASE..." : "ENTER HAWKINS PROTOCOL"}
          </button>

          {/* Supabase Security Badge & Quick Autofills */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#36e0c4", letterSpacing: ".15em", marginBottom: 12 }}>
              ● SUPABASE DATABASE CONNECTED
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
              {[
                { t: "Hawkins AV Club", l: "Dustin Henderson" },
                { t: "The Hellfire Club", l: "Eddie Munson" },
                { t: "Scoops Troop", l: "Robin Buckley" },
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
                    fontSize: 10,
                    letterSpacing: ".08em",
                    padding: "4px 8px",
                    borderRadius: 3,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#888899",
                    background: "rgba(255, 255, 255, 0.03)",
                    cursor: "pointer",
                  }}
                >
                  ⚡ {chip.t}
                </button>
              ))}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
