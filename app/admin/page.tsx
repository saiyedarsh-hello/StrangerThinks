"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  adminLogin,
  fetchAdminChapters,
  updateAdminChapter,
  deleteAdminChapter,
  resetAdminChapters,
  fetchAdminLeaderboard,
  AdminChapterData,
  AdminLeaderboardItem,
} from "@/lib/api";
import {
  getSupabaseLeaderboard,
  getSupabaseChapters,
  updateSupabaseChapter,
  deleteSupabaseChapter,
  subscribeToSupabaseLeaderboard,
  registerTeamInSupabase,
} from "@/lib/supabaseService";
import { sfx } from "@/lib/audio";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"leaderboard" | "vault">("leaderboard");
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardItem[]>([]);
  const [chapters, setChapters] = useState<AdminChapterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"supabase" | "backend" | "syncing">("syncing");

  // New squad creation modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newLeaderName, setNewLeaderName] = useState("");
  const [newTeamScore, setNewTeamScore] = useState<number>(0);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Edit modal state
  const [editingChapter, setEditingChapter] = useState<AdminChapterData | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editPoints, setEditPoints] = useState<number>(100);
  const [editAnswer, setEditAnswer] = useState("");
  const [editOptions, setEditOptions] = useState<Array<{ id: string; text: string }>>([]);
  const [editLoreText, setEditLoreText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. UNLOCK GLOBAL BODY SCROLLING FOR ADMIN PAGE
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevBodyMaxHeight = document.body.style.maxHeight;

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    document.body.style.maxHeight = "none";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      document.body.style.maxHeight = prevBodyMaxHeight;
    };
  }, []);

  // 2. CHECK SAVED SESSION
  useEffect(() => {
    const saved = localStorage.getItem("hawkins_admin_token");
    if (saved) {
      setToken(saved);
    } else {
      // Default to chief clearance passkey for seamless initial load
      setToken("HAWKINS_CHIEF_1983");
      localStorage.setItem("hawkins_admin_token", "HAWKINS_CHIEF_1983");
    }
  }, []);

  // 3. LOAD DATA (Supabase First with Backend Fallback)
  const loadData = useCallback(async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    // Try Supabase first
    try {
      const [sbLb, sbCh] = await Promise.all([
        getSupabaseLeaderboard(),
        getSupabaseChapters(),
      ]);

      if (sbLb.success && sbLb.leaderboard && sbLb.leaderboard.length > 0) {
        setLeaderboard(sbLb.leaderboard);
        loadedFromSupabase = true;
      }
      if (sbCh.success && sbCh.chapters && sbCh.chapters.length > 0) {
        setChapters(sbCh.chapters);
        loadedFromSupabase = true;
      }
    } catch (e) {
      console.warn("[ADMIN] Supabase initial query fallback:", e);
    }

    // If Supabase tables were empty or pending seed, query backend service
    const activeToken = token || "HAWKINS_CHIEF_1983";
    try {
      const [beLb, beCh] = await Promise.all([
        fetchAdminLeaderboard(activeToken),
        fetchAdminChapters(activeToken),
      ]);

      if (beLb.success && beLb.leaderboard && beLb.leaderboard.length > 0) {
        setLeaderboard((prev) => (loadedFromSupabase && prev.length > 0 ? prev : beLb.leaderboard!));
      }
      if (beCh.success && beCh.chapters && beCh.chapters.length > 0) {
        setChapters((prev) => (loadedFromSupabase && prev.length > 0 ? prev : beCh.chapters!));
      }

      setDataSource(loadedFromSupabase ? "supabase" : "backend");
    } catch (e) {
      console.warn("[ADMIN] Backend fetch failed:", e);
      if (loadedFromSupabase) setDataSource("supabase");
    }

    setLoading(false);
  }, [token]);

  // Initial fetch and Realtime Subscription
  useEffect(() => {
    loadData();

    // Subscribe to Supabase real-time updates for teams
    const unsubscribe = subscribeToSupabaseLeaderboard(() => {
      console.log("[ADMIN] Real-time Supabase update received!");
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Handle Login Passkey
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyInput.trim()) return;
    setIsAuthenticating(true);
    setAuthError(null);

    const res = await adminLogin(passkeyInput.trim());
    setIsAuthenticating(false);

    if (res.success && res.token) {
      sfx("ok");
      setToken(res.token);
      localStorage.setItem("hawkins_admin_token", res.token);
      loadData();
    } else {
      sfx("err");
      setAuthError(res.message || "Clearance rejected. Invalid command passkey.");
    }
  };

  const handleLogout = () => {
    sfx("click");
    setToken(null);
    localStorage.removeItem("hawkins_admin_token");
  };

  // Register squad in Supabase
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newLeaderName.trim()) return;
    setIsCreatingTeam(true);
    const res = await registerTeamInSupabase(newTeamName.trim(), newLeaderName.trim(), Number(newTeamScore));
    setIsCreatingTeam(false);

    if (res.success) {
      sfx("ok");
      setShowAddTeamModal(false);
      setNewTeamName("");
      setNewLeaderName("");
      setNewTeamScore(0);
      setStatusMessage(`Squad "${newTeamName}" registered in Supabase. They can now log in immediately!`);
      loadData();
    } else {
      sfx("err");
      alert(res.error || "Failed to register squad in Supabase.");
    }
  };

  // Open edit modal
  const openEditModal = (ch: AdminChapterData) => {
    sfx("click");
    setEditingChapter(ch);
    setEditPrompt(ch.questionPrompt || "");
    setEditPoints(ch.points || 100);
    setEditAnswer(ch.correctAnswer || "A");
    setEditOptions(ch.options ? JSON.parse(JSON.stringify(ch.options)) : []);
    setEditLoreText(ch.archiveLines ? ch.archiveLines.join("\n") : "");
  };

  // Save chapter edit to BOTH Supabase and backend
  const handleSaveChapter = async () => {
    if (!editingChapter) return;
    setIsSaving(true);

    const payload: Partial<AdminChapterData> = {
      questionPrompt: editPrompt,
      points: Number(editPoints),
      correctAnswer: editAnswer,
      options: editOptions.length > 0 ? editOptions : undefined,
      archiveLines: editLoreText.split("\n").filter((l) => l.trim().length > 0),
    };

    // 1. Update Supabase
    await updateSupabaseChapter(editingChapter.id, payload);

    // 2. Update Backend
    const activeToken = token || "HAWKINS_CHIEF_1983";
    const res = await updateAdminChapter(editingChapter.id, payload, activeToken);

    setIsSaving(false);
    sfx("ok");

    const updatedChapter: AdminChapterData = {
      ...editingChapter,
      ...payload,
      archiveTitle: editingChapter.archiveTitle,
      id: editingChapter.id,
      label: editingChapter.label,
      tag: editingChapter.tag,
      taskId: editingChapter.taskId,
      archiveSector: editingChapter.archiveSector,
    };

    setChapters((prev) => prev.map((c) => (c.id === editingChapter.id ? updatedChapter : c)));
    setEditingChapter(null);
    setStatusMessage(`Chapter ${editingChapter.id} successfully updated across Supabase & backend vault.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Delete chapter
  const handleDeleteChapter = async (id: number) => {
    if (!confirm(`Are you sure you want to purge Chapter ${id} from active tournament challenges?`)) return;

    await deleteSupabaseChapter(id);
    const activeToken = token || "HAWKINS_CHIEF_1983";
    await deleteAdminChapter(id, activeToken);

    sfx("click");
    setChapters((prev) => prev.filter((c) => c.id !== id));
    setStatusMessage(`Chapter ${id} purged from active challenges.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!confirm("Reset all 7 chapters and question answers back to default canon Stranger Things questions?")) return;

    setLoading(true);
    const activeToken = token || "HAWKINS_CHIEF_1983";
    const res = await resetAdminChapters(activeToken);
    setLoading(false);

    if (res.success && res.chapters) {
      sfx("ok");
      setChapters(res.chapters);
      setStatusMessage("All questions restored to default tournament set.");
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Filtered leaderboard
  const filteredLeaderboard = leaderboard.filter(
    (t) =>
      t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teamId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.leaderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION GATE (If not logged in)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#07070a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          color: "#e0e0e0",
          fontFamily: "var(--font-mono), monospace",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "#0d0d12",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            borderRadius: "6px",
            padding: "32px 28px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff2d3a" }} />
            <span
              style={{
                fontSize: 12,
                letterSpacing: ".2em",
                color: "#ff2d3a",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              RESTRICTED COMMAND INTERFACE
            </span>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 8px 0",
              letterSpacing: ".04em",
            }}
          >
            Hawkins Security Admin
          </h1>

          <p
            style={{
              fontSize: 13,
              color: "#888899",
              lineHeight: 1.5,
              margin: "0 0 24px 0",
            }}
          >
            Connected to Supabase PostgreSQL & Hawkins Security Mainframe. Enter master passkey to access tournament controls.
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: ".15em",
                  color: "#aaaaaa",
                  marginBottom: 8,
                }}
              >
                SECURITY CLEARANCE PASSKEY
              </label>
              <input
                type="password"
                placeholder="Enter command passkey..."
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 14,
                  backgroundColor: "#050508",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "4px",
                  color: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "var(--font-mono), monospace",
                }}
              />
            </div>

            {authError && (
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(255, 45, 58, 0.12)",
                  border: "1px solid #ff2d3a",
                  borderRadius: "4px",
                  color: "#ff2d3a",
                  fontSize: 12,
                  marginBottom: 18,
                }}
              >
                ⚠ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 13,
                fontWeight: "bold",
                letterSpacing: ".15em",
                backgroundColor: "#ff2d3a",
                border: "none",
                borderRadius: "4px",
                color: "#000000",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {isAuthenticating ? "VERIFYING CLEARANCE..." : "AUTHENTICATE"}
            </button>

            <button
              type="button"
              onClick={() => {
                setToken("HAWKINS_CHIEF_1983");
                localStorage.setItem("hawkins_admin_token", "HAWKINS_CHIEF_1983");
                loadData();
              }}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "8px",
                fontSize: 11,
                color: "#777788",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              ⚡ Quick Unlock (HAWKINS_CHIEF_1983)
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MAIN ADMIN DASHBOARD (Fully Scrollable)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#08080c",
        color: "#d0d0d8",
        fontFamily: "var(--font-mono), monospace",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ── TOP NAVIGATION BAR ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#0d0d14",
          padding: "14px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#36e0c4",
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#ffffff", letterSpacing: ".06em" }}>
              HAWKINS PROTOCOL · COMMAND CONSOLE
            </div>
            <div style={{ fontSize: 11, color: "#777788", letterSpacing: ".1em", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#36e0c4" }}>● SUPABASE ACTIVE</span>
              <span>·</span>
              <span style={{ color: "#ffb454" }}>● BACKEND PORT 5000</span>
              <span>·</span>
              <span>SOURCE: {dataSource.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#050508", padding: 3, borderRadius: 5, border: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            type="button"
            onClick={() => {
              sfx("click");
              setActiveTab("leaderboard");
            }}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              letterSpacing: ".1em",
              borderRadius: 3,
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "leaderboard" ? "#ff2d3a" : "transparent",
              color: activeTab === "leaderboard" ? "#000000" : "#aaaaaa",
              fontWeight: "bold",
              transition: "all 0.15s ease",
            }}
          >
            📊 LIVE LEADERBOARD ({leaderboard.length})
          </button>

          <button
            type="button"
            onClick={() => {
              sfx("click");
              setActiveTab("vault");
            }}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              letterSpacing: ".1em",
              borderRadius: 3,
              border: "none",
              cursor: "pointer",
              backgroundColor: activeTab === "vault" ? "#ff2d3a" : "transparent",
              color: activeTab === "vault" ? "#000000" : "#aaaaaa",
              fontWeight: "bold",
              transition: "all 0.15s ease",
            }}
          >
            ⚙️ QUESTION VAULT ({chapters.length})
          </button>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              letterSpacing: ".1em",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {loading ? "SYNCING..." : "⟳ REFRESH"}
          </button>

          <Link href="/" target="_blank" style={{ textDecoration: "none" }}>
            <button
              type="button"
              style={{
                padding: "6px 14px",
                fontSize: 12,
                letterSpacing: ".1em",
                backgroundColor: "transparent",
                border: "1px solid rgba(54, 224, 196, 0.4)",
                color: "#36e0c4",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              ↗ OPEN GAME VIEW
            </button>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              letterSpacing: ".1em",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 45, 58, 0.3)",
              color: "#ff2d3a",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            LOCK
          </button>
        </div>
      </header>

      {/* ── STATUS ALERT BANNER ── */}
      {statusMessage && (
        <div
          style={{
            backgroundColor: "#0e1814",
            borderBottom: "1px solid #36e0c4",
            padding: "10px 28px",
            fontSize: 13,
            color: "#36e0c4",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── MAIN SCROLLABLE CONTENT AREA ── */}
      <main
        style={{
          flex: 1,
          padding: "24px 32px 80px 32px",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: LIVE LEADERBOARD */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: ".04em" }}>
                  Active Tournament Standings
                </h2>
                <div style={{ fontSize: 12, color: "#777788" }}>
                  Real-time Supabase sync enabled. Live scores update on decryption. Total teams registered: {leaderboard.length}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(true)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    letterSpacing: ".08em",
                    backgroundColor: "rgba(54, 224, 196, 0.15)",
                    border: "1px solid #36e0c4",
                    color: "#36e0c4",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>＋</span>
                  <span>REGISTER SQUAD</span>
                </button>

                <input
                  type="text"
                  placeholder="Filter by team or leader..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 13,
                    backgroundColor: "#0d0d14",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 4,
                    color: "#ffffff",
                    width: "240px",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>
            </div>

            {/* Scrollable Leaderboard Table Container */}
            <div
              className="admin-scrollable"
              style={{
                backgroundColor: "#0d0d14",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 6,
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "75vh",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.12)", backgroundColor: "#0b0b12", color: "#888899" }}>
                    <th style={{ padding: "12px 16px", width: 70, backgroundColor: "#0b0b12" }}>RANK</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>TEAM ID / NAME</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>TEAM LEADER</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>SOLVED</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>STATUS</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", backgroundColor: "#0b0b12" }}>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((item, idx) => (
                    <tr
                      key={item.teamId}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: "bold", color: item.rank <= 3 ? "#ff2d3a" : "#777" }}>
                        #{String(item.rank).padStart(2, "0")}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#ffffff" }}>{item.teamName}</div>
                        <div style={{ fontSize: 11, color: "#666677" }}>ID: {item.teamId}</div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#cccccc" }}>{item.leaderName}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ color: "#36e0c4", fontWeight: "bold" }}>{item.solvedCount}</span>
                        <span style={{ color: "#555566" }}> / 7 Chapters</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            fontWeight: "bold",
                            letterSpacing: ".08em",
                            backgroundColor:
                              item.status === "COMPLETED"
                                ? "rgba(54, 224, 196, 0.15)"
                                : item.status === "ACTIVE"
                                ? "rgba(255, 180, 84, 0.15)"
                                : "rgba(255, 255, 255, 0.05)",
                            color:
                              item.status === "COMPLETED"
                                ? "#36e0c4"
                                : item.status === "ACTIVE"
                                ? "#ffb454"
                                : "#777788",
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: "bold", fontSize: 16, color: "#ffb454" }}>
                        {item.score} <span style={{ fontSize: 11, color: "#777" }}>PTS</span>
                      </td>
                    </tr>
                  ))}
                  {filteredLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#666" }}>
                        {loading ? "Loading tournament data..." : "No teams match the filter criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: QUESTION VAULT CONFIGURATION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "vault" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, color: "#ffffff", margin: "0 0 4px 0", letterSpacing: ".04em" }}>
                  Question Vault & Cryptographic Secrets
                </h2>
                <div style={{ fontSize: 12, color: "#777788" }}>
                  All questions and answer keys stored here are verified purely server-side. Edits persist to Supabase & backend.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    letterSpacing: ".08em",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 45, 58, 0.35)",
                    color: "#ff2d3a",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  ⚠ RESET TO CANON DEFAULTS
                </button>
              </div>
            </div>

            {/* Scrollable Chapter Cards Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    backgroundColor: "#0d0d14",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 6,
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            letterSpacing: ".15em",
                            padding: "2px 8px",
                            borderRadius: 3,
                            backgroundColor: "rgba(255, 45, 58, 0.15)",
                            color: "#ff2d3a",
                          }}
                        >
                          CHAPTER {ch.id}
                        </span>
                        <span style={{ fontSize: 11, color: "#888899", letterSpacing: ".1em" }}>
                          SECTOR: {ch.archiveSector} · [{ch.tag}]
                        </span>
                        <span style={{ fontSize: 11, color: "#555566" }}>TASK ID: {ch.taskId}</span>
                      </div>
                      <h3 style={{ fontSize: 17, color: "#ffffff", margin: 0, fontWeight: "bold" }}>
                        {ch.archiveTitle}
                      </h3>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: "bold",
                          color: "#ffb454",
                          backgroundColor: "#060609",
                          border: "1px solid rgba(255, 180, 84, 0.25)",
                          padding: "4px 10px",
                          borderRadius: 3,
                        }}
                      >
                        +{ch.points} PTS
                      </span>

                      <button
                        type="button"
                        onClick={() => openEditModal(ch)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#ffffff",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        ✎ EDIT
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(ch.id)}
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          backgroundColor: "transparent",
                          border: "1px solid rgba(255, 45, 58, 0.3)",
                          color: "#ff2d3a",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt Preview */}
                  <div
                    style={{
                      backgroundColor: "#060609",
                      padding: "12px 16px",
                      borderRadius: 4,
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#e2e2ec",
                    }}
                  >
                    <span style={{ color: "#777788", fontSize: 11, display: "block", marginBottom: 4 }}>
                      QUESTION PROMPT:
                    </span>
                    {ch.questionPrompt}
                  </div>

                  {/* Options & Secret Answer Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {ch.options &&
                        ch.options.map((opt) => (
                          <span
                            key={opt.id}
                            style={{
                              fontSize: 11,
                              padding: "3px 8px",
                              backgroundColor: opt.id === ch.correctAnswer ? "rgba(54, 224, 196, 0.15)" : "#060609",
                              border: opt.id === ch.correctAnswer ? "1px solid #36e0c4" : "1px solid rgba(255, 255, 255, 0.06)",
                              color: opt.id === ch.correctAnswer ? "#36e0c4" : "#aaaaaa",
                              borderRadius: 3,
                            }}
                          >
                            <strong>[{opt.id}]</strong> {opt.text.slice(0, 36)}...
                          </span>
                        ))}
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#666677", marginBottom: 6 }}>
                        PROTECTED ANSWER KEY:
                      </div>
                      <div
                        style={{
                          padding: "8px 14px",
                          borderRadius: 4,
                          backgroundColor: "rgba(255, 45, 58, 0.1)",
                          border: "1px solid #ff2d3a",
                          color: "#ff2d3a",
                          fontWeight: "bold",
                          fontSize: 14,
                          letterSpacing: ".08em",
                          display: "inline-block",
                        }}
                      >
                        SECRET: {ch.correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {chapters.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                  {loading ? "Loading chapters from Supabase..." : "No chapters found. Click 'Reset to Canon Defaults' to load the standard 7 chapters."}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. EDIT QUESTION MODAL (Scrollable) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingChapter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingChapter(null)}
        >
          <div
            className="admin-scrollable"
            style={{
              backgroundColor: "#0d0d14",
              border: "1px solid rgba(255, 45, 58, 0.4)",
              borderRadius: 6,
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.95)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: ".15em", color: "#ff2d3a", fontWeight: "bold" }}>
                  VAULT CONFIGURATION · SUPABASE SYNC
                </span>
                <h3 style={{ fontSize: 19, color: "#ffffff", margin: "4px 0 0 0" }}>
                  Edit Chapter {editingChapter.id} : {editingChapter.archiveTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888899",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Question Prompt Field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                QUESTION PROMPT TEXT
              </label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  backgroundColor: "#050508",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 4,
                  color: "#ffffff",
                  boxSizing: "border-box",
                  fontFamily: "var(--font-mono), monospace",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Points & Answer Key Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  POINTS AWARDED
                </label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 4,
                    color: "#ffffff",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  SECRET ANSWER KEY
                </label>
                <input
                  type="text"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="e.g. A or 14.285_MHZ"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 45, 58, 0.4)",
                    borderRadius: 4,
                    color: "#ff2d3a",
                    fontWeight: "bold",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>
            </div>

            {/* Multiple Choice Options Configuration */}
            {editOptions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 8 }}>
                  MULTIPLE CHOICE OPTIONS
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {editOptions.map((opt, idx) => (
                    <div key={opt.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span
                        style={{
                          width: 32,
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: "bold",
                          color: opt.id === editAnswer ? "#36e0c4" : "#888",
                        }}
                      >
                        [{opt.id}]
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...editOptions];
                          updated[idx].text = e.target.value;
                          setEditOptions(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: 13,
                          backgroundColor: "#050508",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: 4,
                          color: "#ffffff",
                          fontFamily: "var(--font-mono), monospace",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lore Lines Configuration */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                CHARACTER LORE & BRIEFING LINES (One per line)
              </label>
              <textarea
                value={editLoreText}
                onChange={(e) => setEditLoreText(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  backgroundColor: "#050508",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 4,
                  color: "#d0d0d8",
                  boxSizing: "border-box",
                  fontFamily: "var(--font-mono), monospace",
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                style={{
                  padding: "10px 18px",
                  fontSize: 12,
                  letterSpacing: ".1em",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#888899",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleSaveChapter}
                disabled={isSaving}
                style={{
                  padding: "10px 22px",
                  fontSize: 12,
                  fontWeight: "bold",
                  letterSpacing: ".15em",
                  backgroundColor: "#ff2d3a",
                  border: "none",
                  borderRadius: 4,
                  color: "#000000",
                  cursor: "pointer",
                }}
              >
                {isSaving ? "SAVING TO SUPABASE..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. REGISTER SQUAD MODAL (SUPABASE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddTeamModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAddTeamModal(false)}
        >
          <div
            className="admin-scrollable"
            style={{
              backgroundColor: "#0d0d14",
              border: "1px solid rgba(54, 224, 196, 0.4)",
              borderRadius: 6,
              width: "100%",
              maxWidth: "520px",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.95)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: ".15em", color: "#36e0c4", fontWeight: "bold" }}>
                  SUPABASE POSTGRESQL · SQUAD ROSTER
                </span>
                <h3 style={{ fontSize: 19, color: "#ffffff", margin: "4px 0 0 0" }}>
                  Register New Tournament Squad
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888899",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  SQUAD / TEAM NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sinclair Scouts"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 4,
                    color: "#ffffff",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  SQUAD LEADER CALLSIGN
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucas Sinclair"
                  value={newLeaderName}
                  onChange={(e) => setNewLeaderName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 4,
                    color: "#ffffff",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  STARTING POINTS
                </label>
                <input
                  type="number"
                  value={newTeamScore}
                  onChange={(e) => setNewTeamScore(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: 14,
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 4,
                    color: "#ffffff",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  style={{
                    padding: "10px 18px",
                    fontSize: 12,
                    letterSpacing: ".1em",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#888899",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  style={{
                    padding: "10px 22px",
                    fontSize: 12,
                    fontWeight: "bold",
                    letterSpacing: ".15em",
                    backgroundColor: "#36e0c4",
                    border: "none",
                    borderRadius: 4,
                    color: "#000000",
                    cursor: "pointer",
                  }}
                >
                  {isCreatingTeam ? "SAVING TO SUPABASE..." : "REGISTER TO DATABASE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
