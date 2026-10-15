"use client";
import React, { useState, useEffect } from "react";
import { sfx } from "@/lib/audio";

interface VecnaMessagePanelProps {
  onSendMessage: (target: "all" | string, message: string) => void;
  selectedTeamName?: string;
  teams?: string[];
}

const DEFAULT_AVAILABLE_TEAMS = [
  "Null Pointers",
  "Stack Smashers",
  "Rift Runners",
  "Byte Byters",
  "Shadow Walkers",
  "Hellfire Club",
  "Hawkins AV Club",
  "Mind Flayers",
];

export default function VecnaMessagePanel({
  onSendMessage,
  selectedTeamName,
  teams = DEFAULT_AVAILABLE_TEAMS,
}: VecnaMessagePanelProps) {
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const availableTeamList = teams.length > 0 ? teams : DEFAULT_AVAILABLE_TEAMS;
  const [chosenTeam, setChosenTeam] = useState<string>(selectedTeamName || availableTeamList[0]);
  const [message, setMessage] = useState("I KNOW WHERE YOU ARE.");

  // Limits (Requirement 5):
  // "all": limit 3 chances, cooldown 180s (3 minutes)
  // individual team: limit 5 messages per team, cooldown 60s (1 minute)
  const [allCount, setAllCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_dispatch_all_count");
        if (saved) return parseInt(saved, 10) || 0;
      } catch {}
    }
    return 0;
  });
  const [allLastSent, setAllLastSent] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_dispatch_all_last");
        if (saved) return parseInt(saved, 10) || 0;
      } catch {}
    }
    return 0;
  });

  const [teamCounts, setTeamCounts] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_dispatch_team_counts");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });
  const [teamLastSent, setTeamLastSent] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vecna_dispatch_team_last");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedTeamName && availableTeamList.includes(selectedTeamName)) {
      setChosenTeam(selectedTeamName);
    }
  }, [selectedTeamName, availableTeamList]);

  // Calculate cooldowns (3 min = 180s for All; 1 min = 60s for Individual)
  const allCooldownRemaining = Math.max(0, Math.ceil((allLastSent + 180000 - now) / 1000));
  const selectedTeamCooldownRemaining = Math.max(
    0,
    Math.ceil(((teamLastSent[chosenTeam] || 0) + 60000 - now) / 1000)
  );

  const isAllDisabled = allCount >= 3 || allCooldownRemaining > 0;
  const currentTeamCount = teamCounts[chosenTeam] || 0;
  const isTeamDisabled = currentTeamCount >= 5 || selectedTeamCooldownRemaining > 0;

  const isSendDisabled =
    !message.trim() || (targetType === "all" ? isAllDisabled : isTeamDisabled);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;

    sfx("boom");
    const currentTime = Date.now();

    if (targetType === "all") {
      setAllCount((prev) => prev + 1);
      setAllLastSent(currentTime);
      onSendMessage("all", message.trim());
    } else {
      setTeamCounts((prev) => ({
        ...prev,
        [chosenTeam]: (prev[chosenTeam] || 0) + 1,
      }));
      setTeamLastSent((prev) => ({
        ...prev,
        [chosenTeam]: currentTime,
      }));
      onSendMessage(chosenTeam, message.trim());
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vecna_dispatch_all_count", String(allCount));
        localStorage.setItem("vecna_dispatch_all_last", String(allLastSent));
        localStorage.setItem("vecna_dispatch_team_counts", JSON.stringify(teamCounts));
        localStorage.setItem("vecna_dispatch_team_last", JSON.stringify(teamLastSent));
      } catch {}
    }
  }, [allCount, allLastSent, teamCounts, teamLastSent]);

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
          justifyContent: "space-between",
        }}
      >
        <span>SEND MESSAGE</span>
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "rgba(255, 180, 180, 0.7)",
            letterSpacing: "0.1em",
          }}
        >
          {targetType === "all"
            ? `ALL TEAMS: ${3 - allCount}/3 REMAINING`
            : `${chosenTeam}: ${5 - currentTeamCount}/5 REMAINING`}
        </span>
      </div>

      {/* Target Toggle Tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => {
            sfx("click");
            setTargetType("all");
          }}
          style={{
            flex: 1,
            padding: "7px 10px",
            background: targetType === "all" ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.5)",
            border: targetType === "all" ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
            color: targetType === "all" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          ALL TEAMS ({3 - allCount}/3)
        </button>
        <button
          type="button"
          onClick={() => {
            sfx("click");
            setTargetType("specific");
          }}
          style={{
            flex: 1,
            padding: "7px 10px",
            background: targetType === "specific" ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.5)",
            border: targetType === "specific" ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.15)",
            color: targetType === "specific" ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            cursor: "pointer",
            borderRadius: "2px",
          }}
        >
          INDIVIDUAL TEAM
        </button>
      </div>

      {/* Team Selector when Specific Team is chosen */}
      {targetType === "specific" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label
            style={{
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              color: "rgba(255, 180, 180, 0.8)",
              letterSpacing: "0.12em",
            }}
          >
            TARGET TEAM:
          </label>
          <select
            value={chosenTeam}
            onChange={(e) => {
              sfx("click");
              setChosenTeam(e.target.value);
            }}
            style={{
              background: "#140407",
              border: "1.5px solid #ff2d3a",
              color: "#ffffff",
              padding: "7px 10px",
              borderRadius: "3px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {availableTeamList.map((tm) => (
              <option key={tm} value={tm} style={{ background: "#140407", color: "#ffffff" }}>
                {tm} ({5 - (teamCounts[tm] || 0)} messages left)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rate Limit / Cooldown Status Banner */}
      {targetType === "all" && allCooldownRemaining > 0 && (
        <div
          style={{
            background: "rgba(255, 45, 58, 0.15)",
            border: "1px dashed #ff2d3a",
            padding: "6px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff8a80",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          ⏳ COOLDOWN: {allCooldownRemaining}s REMAINING (ALL TEAMS: 1 PER 3 MIN)
        </div>
      )}
      {targetType === "all" && allCount >= 3 && (
        <div
          style={{
            background: "rgba(100, 20, 25, 0.4)",
            border: "1px solid #ff2d3a",
            padding: "6px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff6666",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          🚫 QUOTA REACHED: 3/3 ALL TEAMS TRANSMISSIONS USED
        </div>
      )}

      {targetType === "specific" && selectedTeamCooldownRemaining > 0 && (
        <div
          style={{
            background: "rgba(255, 45, 58, 0.15)",
            border: "1px dashed #ff2d3a",
            padding: "6px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff8a80",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          ⏳ COOLDOWN: {selectedTeamCooldownRemaining}s REMAINING FOR {chosenTeam.toUpperCase()} (1 PER MIN)
        </div>
      )}
      {targetType === "specific" && currentTeamCount >= 5 && (
        <div
          style={{
            background: "rgba(100, 20, 25, 0.4)",
            border: "1px solid #ff2d3a",
            padding: "6px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff6666",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          🚫 QUOTA REACHED FOR {chosenTeam.toUpperCase()}: 5/5 MESSAGES USED
        </div>
      )}

      {/* Message Input with Character Count */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
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
            {message.length}/150
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
                padding: "3px 7px",
                background: "rgba(255, 45, 58, 0.1)",
                border: "1px solid rgba(255, 45, 58, 0.2)",
                color: "rgba(255, 180, 180, 0.8)",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              💬 {msg.slice(0, 20)}...
            </button>
          ))}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSendDisabled}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            background: isSendDisabled ? "rgba(30, 10, 15, 0.6)" : "rgba(18, 3, 5, 0.9)",
            border: isSendDisabled ? "1px solid rgba(150, 45, 58, 0.3)" : "1.5px solid #ff2d3a",
            color: isSendDisabled ? "rgba(255, 255, 255, 0.3)" : "#ff4d58",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            cursor: isSendDisabled ? "not-allowed" : "pointer",
            borderRadius: "3px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!isSendDisabled) {
              e.currentTarget.style.background = "#ff2d3a";
              e.currentTarget.style.color = "#ffffff";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSendDisabled) {
              e.currentTarget.style.background = "rgba(18, 3, 5, 0.9)";
              e.currentTarget.style.color = "#ff4d58";
            }
          }}
        >
          {targetType === "all"
            ? `SEND TO ALL TEAMS (${3 - allCount} LEFT)`
            : `SEND TO ${chosenTeam.toUpperCase()} (${5 - currentTeamCount} LEFT)`}
        </button>
      </form>
    </div>
  );
}
