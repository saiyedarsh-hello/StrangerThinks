"use client";
import React, { useState } from "react";
import { sfx } from "@/lib/audio";

interface VecnaMessagePanelProps {
  onSendMessage: (target: "all" | string, message: string) => void;
  selectedTeamName?: string;
}

export default function VecnaMessagePanel({
  onSendMessage,
  selectedTeamName,
}: VecnaMessagePanelProps) {
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [message, setMessage] = useState("I KNOW WHERE YOU ARE.");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sfx("boom");
    const actualTarget = targetType === "all" ? "all" : selectedTeamName || "all";
    onSendMessage(actualTarget, message.trim());
  };

  const presetMessages = [
    "I KNOW WHERE YOU ARE.",
    "YOU DON'T UNDERSTAND WHAT HE IS.",
    "YOU SHOULD NOT HAVE COME THIS FAR.",
    "THE GATE IS ALREADY OPENING.",
  ];

  return (
    <div
      style={{
        background: "rgba(10, 3, 6, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "var(--font-title)",
          fontSize: "14px",
          letterSpacing: "0.2em",
          fontWeight: 900,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        SEND MESSAGE
      </div>

      {/* Target Toggle Tabs (Matches Image 3) */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => {
            sfx("click");
            setTargetType("all");
          }}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: targetType === "all" ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.5)",
            border: targetType === "all" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
            color: targetType === "all" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          ALL TEAMS
        </button>
        <button
          type="button"
          onClick={() => {
            sfx("click");
            setTargetType("specific");
          }}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: targetType === "specific" ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.5)",
            border: targetType === "specific" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
            color: targetType === "specific" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          {selectedTeamName ? `TEAM: ${selectedTeamName}` : "SPECIFIC TEAM"}
        </button>
      </div>

      {/* Message Input with Character Count */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="TYPE TRANSMISSION MESSAGE..."
            rows={3}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "68px",
              padding: "10px 12px 24px",
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(255, 45, 58, 0.3)",
              borderRadius: "3px",
              color: "#ffffff",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              letterSpacing: "0.05em",
              resize: "none",
              outline: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              right: "10px",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            {message.length}/200
          </div>
        </div>

        {/* Quick Lore Message Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {presetMessages.map((msg, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                sfx("click");
                setMessage(msg);
              }}
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                padding: "2px 6px",
                background: "rgba(255, 45, 58, 0.1)",
                border: "1px solid rgba(255, 45, 58, 0.2)",
                color: "rgba(255, 180, 180, 0.7)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              💬 {msg.slice(0, 20)}...
            </button>
          ))}
        </div>

        {/* Send Button (Matches Image 3) */}
        <button
          type="submit"
          disabled={!message.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            background: "rgba(18, 3, 5, 0.9)",
            border: "1px solid #ff2d3a",
            color: "#ff4d58",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            cursor: "pointer",
            borderRadius: "3px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#ff2d3a";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(18, 3, 5, 0.9)";
            e.currentTarget.style.color = "#ff4d58";
          }}
        >
          SEND MESSAGE
        </button>
      </form>
    </div>
  );
}
