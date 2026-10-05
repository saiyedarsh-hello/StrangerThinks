"use client";
import React from "react";
import { sfx } from "@/lib/audio";

export type VecnaTab = "MAP" | "TEAMS" | "TRIGGERS" | "MESSAGES" | "LOGS";

interface VecnaSidebarProps {
  activeTab: VecnaTab;
  onSelectTab: (tab: VecnaTab) => void;
}

export default function VecnaSidebar({ activeTab, onSelectTab }: VecnaSidebarProps) {
  const tabs: { id: VecnaTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "MAP",
      label: "MAP",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      ),
    },
    {
      id: "TEAMS",
      label: "TEAMS",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "TRIGGERS",
      label: "TRIGGERS",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: "MESSAGES",
      label: "MESSAGES",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      id: "LOGS",
      label: "LOGS",
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px 8px",
        background: "rgba(10, 2, 4, 0.95)",
        borderRight: "1px solid rgba(255, 45, 58, 0.2)",
        minWidth: "68px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              sfx("click");
              onSelectTab(tab.id);
            }}
            title={tab.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 6px",
              background: isActive ? "rgba(255, 45, 58, 0.18)" : "transparent",
              borderLeft: isActive ? "3px solid #ff2d3a" : "3px solid transparent",
              color: isActive ? "#ff4d58" : "rgba(255, 180, 180, 0.45)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(255, 45, 58, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255, 180, 180, 0.45)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {tab.icon}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.15em",
                fontWeight: isActive ? "bold" : "normal",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
