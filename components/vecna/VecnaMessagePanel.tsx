"use client";
import React, { useState, useEffect, useMemo } from "react";
import { sfx } from "@/lib/audio";
import { API_BASE } from "@/lib/api";
import { getStoredSession } from "@/lib/config";
import { subscribe, getSocket } from "@/lib/realtime";

import { TargetSquadItem } from "./VecnaTriggerPanel";

interface VecnaMessagePanelProps {
  onSendMessage: (target: "all" | string, message: string) => Promise<boolean> | void;
  selectedTeamName?: string;
  initialQuota?: number;
  availableSquads?: TargetSquadItem[];
}

export default function VecnaMessagePanel({
  onSendMessage,
  selectedTeamName,
  initialQuota = 5,
  availableSquads,
}: VecnaMessagePanelProps) {
  // Deduplicate and filter strictly for online squads, then randomize order to prevent ranking leaks
  const onlineSquads = useMemo(() => {
    const list = (availableSquads || []).filter(
      (s) => s && s.name && s.status !== "Offline"
    );
    // Fisher-Yates shuffle for randomized presentation
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [availableSquads]);

  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [chosenTeam, setChosenTeam] = useState<string>(selectedTeamName || "");
  const [message, setMessage] = useState("I KNOW WHERE YOU ARE.");

  // Keep chosenTeam synchronized with available online squads
  useEffect(() => {
    if (onlineSquads.length > 0) {
      if (selectedTeamName && onlineSquads.some((s) => s.name === selectedTeamName)) {
        setChosenTeam(selectedTeamName);
      } else if (!chosenTeam || !onlineSquads.some((s) => s.name === chosenTeam)) {
        setChosenTeam(onlineSquads[0].name);
      }
    } else {
      setChosenTeam("");
    }
  }, [onlineSquads, selectedTeamName, chosenTeam]);

  // Event-wide dispatch quota: 5 messages maximum shared across all Vecna teams
  const [remainingQuota, setRemainingQuota] = useState<number>(initialQuota);
  const [usedQuota, setUsedQuota] = useState<number>(5 - initialQuota);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live authoritative quota from backend on mount
  useEffect(() => {
    let isCancelled = false;
    const fetchQuota = async () => {
      try {
        const stored = getStoredSession();
        const token = stored && (stored as any).token ? (stored as any).token : "";
        const res = await fetch(`${API_BASE}/vecna/dispatch/quota`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data && typeof data.remaining === "number") {
            setRemainingQuota(data.remaining);
            setUsedQuota(data.used ?? (5 - data.remaining));
          }
        }
      } catch {}
    };
    fetchQuota();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Real-time synchronization across all Vecna teams & admin sessions
  useEffect(() => {
    const handleQuota = (data: any) => {
      if (data && typeof data.remaining === "number") {
        setRemainingQuota(data.remaining);
        setUsedQuota(data.used ?? (5 - data.remaining));
      }
    };
    const unsub = subscribe((event: any) => {
      if (event && event.type === "vecna:dispatch_quota") {
        handleQuota(event);
      }
    });
    const sock = getSocket();
    sock?.on("vecna:dispatch_quota", handleQuota);
    return () => {
      unsub();
      sock?.off("vecna:dispatch_quota", handleQuota);
    };
  }, []);

  useEffect(() => {
    if (selectedTeamName) {
      setChosenTeam(selectedTeamName);
    }
  }, [selectedTeamName]);

  const isQuotaExhausted = remainingQuota <= 0;
  const isSendDisabled =
    isSending ||
    !message.trim() ||
    isQuotaExhausted ||
    (targetType === "specific" && !chosenTeam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;

    if (isQuotaExhausted) {
      setErrorMessage("Dispatch limit reached for this event.");
      sfx("err");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const target = targetType === "all" ? "all" : chosenTeam;
      const result = await onSendMessage(target, message.trim());
      if (result === false) {
        // Submission rejected (e.g. quota exhausted on server)
        setErrorMessage("Dispatch limit reached for this event.");
        sfx("err");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to dispatch message.");
      sfx("err");
    } finally {
      setIsSending(false);
    }
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
          justifyContent: "space-between",
        }}
      >
        <span>VECNA DISPATCH TRANSMITTER</span>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: isQuotaExhausted ? "#ff4d58" : "#00ffcc",
            letterSpacing: "0.12em",
            fontWeight: "bold",
            background: "rgba(0, 0, 0, 0.6)",
            padding: "3px 8px",
            borderRadius: "3px",
            border: `1px solid ${isQuotaExhausted ? "rgba(255, 77, 88, 0.5)" : "rgba(0, 255, 204, 0.3)"}`,
          }}
        >
          {remainingQuota}/5 REMAINING
        </span>
      </div>

      {/* Event-Wide Shared Quota Info Badge */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10.5px",
          color: "rgba(255, 200, 200, 0.75)",
          letterSpacing: "0.06em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px dashed rgba(255, 45, 58, 0.25)",
          paddingBottom: "8px",
        }}
      >
        <span>EVENT ALLOWANCE: 5 MESSAGES SHARED BY ALL VECNA TEAMS</span>
        <span style={{ color: "#ff8a80" }}>USED: {usedQuota}/5</span>
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
          INDIVIDUAL SQUAD
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
            TARGET SQUAD:
          </label>
          <select
            value={chosenTeam}
            disabled={onlineSquads.length === 0}
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
              cursor: onlineSquads.length === 0 ? "not-allowed" : "pointer",
              opacity: onlineSquads.length === 0 ? 0.6 : 1,
            }}
          >
            {onlineSquads.length === 0 ? (
              <option value="" disabled style={{ background: "#140407", color: "rgba(255,180,180,0.6)" }}>
                [NO HAWKINS SQUADS ONLINE]
              </option>
            ) : (
              onlineSquads.map((sq) => (
                <option key={sq.id || sq.name} value={sq.name} style={{ background: "#140407", color: "#ffffff" }}>
                  {sq.name} {sq.leader ? `(${sq.leader})` : ""}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Quota Exhausted Warning Banner */}
      {isQuotaExhausted && (
        <div
          style={{
            background: "rgba(100, 20, 25, 0.5)",
            border: "1.5px solid #ff2d3a",
            padding: "8px 12px",
            borderRadius: "3px",
            fontSize: "11.5px",
            color: "#ff6666",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Dispatch limit reached for this event. (0/5 REMAINING)
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            background: "rgba(120, 10, 20, 0.6)",
            border: "1px dashed #ff4d58",
            padding: "6px 10px",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#ff99a0",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            textAlign: "center",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Message Input with Character Count */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
            placeholder="TYPE PSYCHIC TRANSMISSION..."
            rows={3}
            disabled={isQuotaExhausted || isSending}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "68px",
              padding: "10px 12px 24px",
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(255, 45, 58, 0.3)",
              borderRadius: "3px",
              color: isQuotaExhausted ? "rgba(255, 255, 255, 0.3)" : "#ffffff",
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
              disabled={isQuotaExhausted || isSending}
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
                cursor: isQuotaExhausted ? "not-allowed" : "pointer",
                borderRadius: "2px",
              }}
            >
              {msg.slice(0, 20)}...
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
          {isSending
            ? "TRANSMITTING..."
            : isQuotaExhausted
            ? "DISPATCH LIMIT REACHED (0/5)"
            : targetType === "all"
            ? `DISPATCH TO ALL TEAMS (${remainingQuota}/5 REMAINING)`
            : `DISPATCH TO ${chosenTeam.toUpperCase()} (${remainingQuota}/5 REMAINING)`}
        </button>
      </form>
    </div>
  );
}
