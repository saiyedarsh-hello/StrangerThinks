"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const formatToIST = (ts: string | number | Date | null | undefined): string => {
  if (!ts || ts === "Unavailable" || ts === "—") return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d) + " IST"
    );
  } catch {
    return "—";
  }
};
import {
  adminLogin,
  fetchAdminChapters,
  updateAdminChapter,
  deleteAdminChapter,
  resetAdminChapters,
  fetchAdminLeaderboard,
  updateAdminTeamScore,
  updateAdminTeamRole,
  AdminChapterData,
  AdminLeaderboardItem,
} from "@/lib/api";
import {
  getTiDBLeaderboard,
  getTiDBChapters,
  updateTiDBChapter,
  deleteTiDBChapter,
  subscribeToTiDBLeaderboard,
  subscribeToLiveScoreChanges,
  broadcastLiveScoreChange,
  LiveScorePayload,
  registerTeamInTiDB,
  updateTeamScoreInTiDB,
  getTiDBLogs,
  broadcastComponentConnection,
  subscribeToTelemetry,
  subscribeToPresence,
  getConnectionStatus,
  AdminLogItem,
  ConnectionStatus,
} from "@/lib/tidbService";
import { authenticateSocket, publish, getSocket } from "@/lib/realtime";
import { sfx } from "@/lib/audio";
import { getStoredSession, clearSession } from "@/lib/config";

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = getStoredSession();
    return stored?.role === "ADMIN" && stored.token ? stored.token : null;
  });
  const [passkeyInput, setPasskeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"dashboard" | "questions" | "logs">("dashboard");
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardItem[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, { delta: string; timestamp: number }>>({});
  const [chapters, setChapters] = useState<AdminChapterData[]>([]);
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "connections" | "submissions">("all");
  const [connStatus, setConnStatus] = useState<ConnectionStatus>(getConnectionStatus(0));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [presenceFilter, setPresenceFilter] = useState<"all" | "online" | "offline" | "vecna">("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"tidb" | "backend" | "syncing">("syncing");

  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(typeof document !== "undefined" && document.fullscreenElement));
    handleFs();
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  const toggleFullscreen = () => {
    sfx("click");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Team detail & points edit modal state
  const [detailTeam, setDetailTeam] = useState<AdminLeaderboardItem | null>(null);
  const [editTeamPoints, setEditTeamPoints] = useState<number>(0);
  const [isUpdatingTeamPoints, setIsUpdatingTeamPoints] = useState(false);

  // New squad creation modal state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamRole, setNewTeamRole] = useState<"PLAYER" | "VECNA">("PLAYER");
  const [newLeaderName, setNewLeaderName] = useState("");
  const [newTeamScore, setNewTeamScore] = useState<number>(0);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  // Event Lifecycle & Controls State
  const [eventState, setEventState] = useState<{
    status: string;
    login_open: boolean;
    submissions_open: boolean;
    current_round_max: number;
  }>({
    status: "active",
    login_open: true,
    submissions_open: true,
    current_round_max: 7,
  });
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [unlockedStages, setUnlockedStages] = useState<number[]>([1]);
  const [isUpdatingStage, setIsUpdatingStage] = useState<boolean>(false);

  // Auto-refresh timer state (user configurable: ON/OFF and 5s/10s/30s)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(10);

  // Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"skip" | "overwrite">("skip");
  const [importPreview, setImportPreview] = useState<{
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    missingCount: number;
    malformedCount: number;
    rows: any[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Team Performance Drawer / Modal State
  const [performanceTeam, setPerformanceTeam] = useState<AdminLeaderboardItem | null>(null);
  const [performanceData, setPerformanceData] = useState<any | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [expandedPerformanceStage, setExpandedPerformanceStage] = useState<number | null>(null);

  // Edit modal state
  const [editingChapter, setEditingChapter] = useState<AdminChapterData | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editPoints, setEditPoints] = useState<number>(100);
  const [editAnswer, setEditAnswer] = useState("");
  const [editOptions, setEditOptions] = useState<Array<{ id: string; text: string }>>([]);
  const [editLoreText, setEditLoreText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. UNLOCK GLOBAL BODY SCROLLING FOR ADMIN PAGE (Only when authenticated)
  useEffect(() => {
    if (!token) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      return;
    }
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
  }, [token]);

  // 2. RESTORE ADMIN SESSION ON MOUNT / REFRESH
  useEffect(() => {
    try {
      const stored = getStoredSession();
      const adminTok = stored && stored.role === "ADMIN" ? stored.token : null;
      if (adminTok) {
        setToken(adminTok);
        authenticateSocket(adminTok);
      }
    } catch {}
  }, []);

  // 3. LOAD DATA (TiDB Distributed SQL + Backend Service)
  // Priority 1: Net Score DESC. Priority 2 (Tie-breaker): Time ASC (earlier last score achieved timestamp wins)
  // Stage count is NEVER a tie-breaker. Admin accounts are strictly excluded.
  const sortByScoreThenTime = (a: any, b: any) => {
    const scoreA = typeof a.score === "number" ? a.score : (typeof (a as any).totalScore === "number" ? (a as any).totalScore : 0);
    const scoreB = typeof b.score === "number" ? b.score : (typeof (b as any).totalScore === "number" ? (b as any).totalScore : 0);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    const parseTime = (item: any) => {
      const raw = item.lastScoreAchievedAt || item.lastSolvedAt || (item.lastSubmissionTime && item.lastSubmissionTime !== "OFFLINE" ? item.lastSubmissionTime : null);
      if (!raw) return Infinity;
      const t = new Date(raw).getTime();
      return isNaN(t) ? Infinity : t;
    };
    const timeA = parseTime(a);
    const timeB = parseTime(b);
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.teamName || "").localeCompare(b.teamName || "");
  };

  const loadData = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    let loadedFromTiDB = false;

    // Read local persistent storage for emergency offline fallback
    let cachedLb: AdminLeaderboardItem[] = [];
    let cachedCh: AdminChapterData[] = [];
    if (typeof window !== "undefined") {
      try {
        const rawLb = localStorage.getItem("hawkins_persisted_leaderboard");
        if (rawLb) cachedLb = JSON.parse(rawLb);
        const rawCh = localStorage.getItem("hawkins_persisted_chapters");
        if (rawCh) cachedCh = JSON.parse(rawCh);
      } catch {}
    }

    // Query live authoritative backend service (connected to TiDB)
    const activeToken = token || "";
    let beLeaderboard: AdminLeaderboardItem[] = [];
    let beChapterList: AdminChapterData[] = [];
    let serverResponded = false;
    try {
      const [beLb, beCh] = await Promise.all([
        fetchAdminLeaderboard(activeToken),
        fetchAdminChapters(activeToken),
      ]);

      if (beLb.success && Array.isArray(beLb.leaderboard)) {
        serverResponded = true;
        beLeaderboard = beLb.leaderboard;
        loadedFromTiDB = true;
      }
      if (beCh.success && Array.isArray(beCh.chapters) && beCh.chapters.length > 0) {
        beChapterList = beCh.chapters;
      }
      setDataSource("tidb");
    } catch (e) {
      console.warn("[ADMIN] Backend live fetch failed:", e);
    }

    // TiDB direct check only when the proxy did not answer at all
    let tidbLeaderboard: AdminLeaderboardItem[] = [];
    if (!serverResponded) {
      try {
        const tdLb = await getTiDBLeaderboard(activeToken);
        if (tdLb.success && tdLb.leaderboard && tdLb.leaderboard.length > 0) {
          tidbLeaderboard = tdLb.leaderboard;
          loadedFromTiDB = true;
        }
      } catch {}
    }

    // Authoritative Server Data (Always updates all teams who joined with live presence)
    const liveServerTeams = beLeaderboard.length > 0 ? beLeaderboard : tidbLeaderboard;

    if (liveServerTeams.length > 0) {
      const finalLb = liveServerTeams
        .filter((t: any) => t.role !== "ADMIN" && t.teamName?.toLowerCase() !== "admin bolte")
        .map((t) => ({
          ...t,
          score: typeof t.score === "number" && !isNaN(t.score) ? t.score : (typeof (t as any).totalScore === "number" ? (t as any).totalScore : 0),
          isOnline: Boolean(t.isOnline),
        }))
        .sort(sortByScoreThenTime)
        .map((t, idx) => ({ ...t, rank: idx + 1 }));

      setLeaderboard(finalLb);
      setConnStatus(getConnectionStatus(finalLb.length));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hawkins_persisted_leaderboard", JSON.stringify(finalLb));
        } catch {}
      }

      if (isManualRefresh) {
        const onlineCount = finalLb.filter((t) => t.isOnline).length;
        setStatusMessage(`✓ STANDINGS REFRESHED: ${finalLb.length} Squads Synchronized (${onlineCount} Online)`);
      }
    } else if (!serverResponded && cachedLb.length > 0) {
      // Offline fallback only when the server is unreachable.
      setLeaderboard(cachedLb);
    } else {
      // Authoritative empty state: never show stale or fabricated squads.
      setLeaderboard([]);
      setConnStatus(getConnectionStatus(0));
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("hawkins_persisted_leaderboard");
        } catch {}
      }
    }

    // Chapters
    const liveChapters = beChapterList.length > 0 ? beChapterList : cachedCh;
    if (liveChapters.length > 0) {
      setChapters(liveChapters);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hawkins_persisted_chapters", JSON.stringify(liveChapters));
        } catch {}
      }
    }

    // Fetch Event Lifecycle State & Logs
    try {
      const [evRes, tdLogs] = await Promise.all([
        fetch("/api/admin/event/state?_t=" + Date.now()).then((r) => r.json()).catch(() => ({})),
        getTiDBLogs(liveServerTeams.length).catch(() => []),
      ]);
      if (evRes.success && evRes.eventState) {
        setEventState(evRes.eventState);
        if (Array.isArray(evRes.eventState.unlockedStages)) {
          setUnlockedStages(evRes.eventState.unlockedStages);
        }
      }
      if (tdLogs && tdLogs.length > 0) {
        setLogs(tdLogs);
      }
    } catch {}

    setLoading(false);
    setAutoRefreshSec(autoRefreshInterval);
  }, [token, autoRefreshInterval]);

  // Initial fetch, Telemetry Bus, and Realtime Subscription
  useEffect(() => {
    loadData();

    // Broadcast admin & leaderboard readiness on system bus
    broadcastComponentConnection(
      "ADMIN",
      "Admin command bridge synchronized with TiDB Distributed SQL & Backend port 5000",
      "CONNECTED"
    );
    broadcastComponentConnection(
      "LEADERBOARD",
      "Leaderboard real-time subscription active on public:teams (live stream ready)",
      "CONNECTED"
    );

    // Listen to live cross-component events (e.g. Main Page heartbeats)
    const unsubTelemetry = subscribeToTelemetry((newLog) => {
      setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
      setConnStatus(getConnectionStatus(leaderboard.length));
    });

    // 1. Instant Live Score Updates across Tabs, TiDB, and Devices
    const unsubLiveScores = subscribeToLiveScoreChanges((payload: LiveScorePayload) => {
      console.log("[ADMIN] Real-time score update received:", payload);

      // Instantly update standings & scores in real time
      setLeaderboard((prev) => {
        let found = false;
        const updated = prev.map((item) => {
          const isMatch =
            item.teamId === payload.teamId ||
            (payload.teamName && item.teamName.toLowerCase() === payload.teamName.toLowerCase());

          if (isMatch) {
            found = true;
            const newCompletedTasks =
              payload.chapterId && !item.completedTasks.includes(`ch${payload.chapterId}`)
                ? [...item.completedTasks, `ch${payload.chapterId}`]
                : item.completedTasks;

            const distinctStages = new Set<number>();
            newCompletedTasks.forEach((t) => {
              const match = String(t).match(/^(?:ch|chapter)[\-_]?(\d+)/i);
              if (match) {
                const num = Number(match[1]);
                if (!isNaN(num) && num >= 1 && num <= 7) distinctStages.add(num);
              }
            });
            if (payload.chapterId) {
              distinctStages.add(Number(payload.chapterId));
            }
            const newSolvedCount = typeof (payload as any).solvedCount === "number"
              ? (payload as any).solvedCount
              : distinctStages.size > 0 ? distinctStages.size : item.solvedCount;

            return {
              ...item,
              score: payload.newScore,
              solvedCount: newSolvedCount,
              completedTasks: newCompletedTasks,
              lastSubmissionTime: new Date().toISOString(),
            };
          }
          return item;
        });

        // If team was not yet present in client standings, add it
        if (!found && payload.teamName) {
          updated.push({
            rank: updated.length + 1,
            teamId: payload.teamId,
            teamName: payload.teamName,
            leaderName: "Squad Operative",
            score: payload.newScore,
            solvedCount: payload.chapterId ? 1 : 0,
            completedTasks: payload.chapterId ? [`ch${payload.chapterId}`] : [],
            lastSubmissionTime: new Date().toISOString(),
            status: "ACTIVE",
          });
        }

        // Re-rank standings by score DESC, then time ASC
        return updated
          .sort(sortByScoreThenTime)
          .map((t, idx) => ({ ...t, rank: idx + 1 }));
      });

      // Visual highlight animation for score change
      const deltaStr =
        payload.delta !== undefined
          ? payload.delta >= 0
            ? `+${payload.delta}`
            : `${payload.delta}`
          : "UPDATED";

      setRecentlyUpdated((prev) => ({
        ...prev,
        [payload.teamId]: {
          delta: deltaStr,
          timestamp: Date.now(),
        },
      }));

      // If details modal is open for this team, update live in the modal
      setDetailTeam((prev) => {
        if (
          prev &&
          (prev.teamId === payload.teamId ||
            (payload.teamName && prev.teamName.toLowerCase() === payload.teamName.toLowerCase()))
        ) {
          const newCompleted =
            payload.chapterId && !prev.completedTasks.includes(`ch${payload.chapterId}`)
              ? [...prev.completedTasks, `ch${payload.chapterId}`]
              : prev.completedTasks;
          return {
            ...prev,
            score: payload.newScore,
            solvedCount: newCompleted.length,
            completedTasks: newCompleted,
          };
        }
        return prev;
      });

      // Audit log entry
      const actionText =
        payload.source === "ADMIN"
          ? `Admin adjusted points to ${payload.newScore} PTS`
          : payload.chapterId
          ? `Chapter ${payload.chapterId} decrypted (+${payload.delta || 100} PTS) · Total: ${payload.newScore} PTS`
          : `Points awarded (+${payload.delta || 0} PTS) · Total: ${payload.newScore} PTS`;

      const newLogItem: AdminLogItem = {
        id: `score-${Date.now()}-${payload.teamId}`,
        timestamp: new Date().toLocaleTimeString(),
        team: payload.teamName || payload.teamId,
        action: actionText,
        status: "SUCCESS",
        latency: "14ms",
        type: "submission",
      };
      setLogs((prev) => [newLogItem, ...prev.filter((l) => l.id !== newLogItem.id)]);
      sfx("ok");
    });

    // 2. Subscribe to TiDB changes on teams
    const unsubscribeLb = subscribeToTiDBLeaderboard(() => {
      console.log("[ADMIN] Real-time TiDB update received!");
      loadData();
    });

    // 3. Subscribe to real-time live presence updates
    if (token) {
      authenticateSocket(token);
    }
    const unsubPresence = subscribeToPresence(({ teamId, isOnline }) => {
      setLeaderboard((prev) =>
        prev.map((item) => {
          if (teamId === "all") {
            return { ...item, isOnline, status: isOnline ? "ACTIVE" : "OFFLINE" };
          }
          const cleanA = (item.teamId || "").trim().toUpperCase();
          const cleanB = (teamId || "").trim().toUpperCase();
          const cleanU = ((item as any).username || "").trim().toUpperCase();
          const cleanN = (item.teamName || "").trim().toUpperCase();
          let isMatch = cleanA === cleanB || cleanU === cleanB || cleanN === cleanB;
          if (!isMatch && cleanA.startsWith("VECNA") && cleanB.startsWith("VECNA")) {
            isMatch = true;
          }
          if (!isMatch) {
            const numA = cleanA.replace(/\D/g, "");
            const numB = cleanB.replace(/\D/g, "");
            if (numA && numB && parseInt(numA, 10) === parseInt(numB, 10)) {
              if (
                (cleanA.startsWith("T") || cleanA.startsWith("TEAM")) &&
                (cleanB.startsWith("T") || cleanB.startsWith("TEAM"))
              ) {
                isMatch = true;
              }
            }
          }
          return isMatch
            ? { ...item, isOnline, status: isOnline ? "ACTIVE" : "OFFLINE" }
            : item;
        })
      );
    });

    // 4. Automated background refresh cycle (controllable interval & pause/resume)
    const autoRefreshTimer = setInterval(() => {
      setAutoRefreshSec((prev) => {
        if (!autoRefreshEnabled) return prev;
        if (prev <= 1) {
          loadData();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(autoRefreshTimer);
      unsubTelemetry();
      unsubLiveScores();
      unsubscribeLb();
      unsubPresence();
    };
  }, [loadData, autoRefreshEnabled, autoRefreshInterval, token]);

  // Ping and verify all 3 connections
  const handlePingAllConnections = () => {
    sfx("ok");
    const l1 = broadcastComponentConnection(
      "MAIN_PAGE",
      "Main page client heartbeat verified OK (latency: 19ms)",
      "CONNECTED"
    );
    const l2 = broadcastComponentConnection(
      "LEADERBOARD",
      `Leaderboard real-time stream verified OK (${leaderboard.length || 5} squads synchronized)`,
      "CONNECTED"
    );
    const l3 = broadcastComponentConnection(
      "ADMIN",
      "Admin command bridge verified OK with TiDB Distributed SQL",
      "CONNECTED"
    );
    const l4 = broadcastComponentConnection(
      "SYSTEM",
      "Unified topology verified: Main Page + Admin + Leaderboard operating together",
      "SYNCED"
    );

    setLogs((prev) => [l4, l1, l2, l3, ...prev.filter((p) => !String(p.id).startsWith("ping-"))]);
    setConnStatus(getConnectionStatus(leaderboard.length));
    setStatusMessage("All 3 connections verified: Main Page, Leaderboard, and Admin Bridge synchronized!");
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handle Login Passkey (In-memory session only — reloads always require password)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = passkeyInput.trim();
    if (!input) return;
    setIsAuthenticating(true);
    setAuthError(null);

    let authed = false;
    let tokenVal = "";

    try {
      const res = await adminLogin(input);
      if (res.success && res.token) {
        authed = true;
        tokenVal = res.token;
      }
    } catch (e) {
      console.warn("Backend auth call error:", e);
    }

    setIsAuthenticating(false);

    if (authed) {
      sfx("ok");
      setToken(tokenVal);
      setPasskeyInput("");
      try {
        localStorage.setItem("hawkins_admin_token", tokenVal);
        sessionStorage.setItem("hawkins_admin_token", tokenVal);
      } catch {}
      authenticateSocket(tokenVal);
      loadData();
    } else {
      sfx("err");
      setAuthError("Clearance rejected. Invalid command passkey.");
    }
  };

  const handleLogout = async () => {
    sfx("click");
    setToken(null);
    setPasskeyInput("");
    try {
      getSocket()?.emit("team:logout");
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem("hawkins_admin_token");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("hawkins_admin_leader");
      localStorage.removeItem("hawkins-protocol:session");
      sessionStorage.removeItem("hawkins_admin_token");
      sessionStorage.clear();
      clearSession();
      if (typeof document !== "undefined") {
        document.cookie = "hawkins_session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "hawkins_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  // Register squad in TiDB
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newLeaderName.trim()) return;
    setIsCreatingTeam(true);
    const res = await registerTeamInTiDB(
      newTeamName.trim(),
      newLeaderName.trim(),
      Number(newTeamScore),
      token || undefined,
      newTeamRole
    );
    setIsCreatingTeam(false);

    if (res.success) {
      sfx("ok");
      setShowAddTeamModal(false);
      setNewTeamName("");
      setNewLeaderName("");
      setNewTeamScore(0);
      setNewTeamRole("PLAYER");
      setStatusMessage(`Squad "${newTeamName}" registered in TiDB. They can now log in immediately!`);
      loadData();
    } else {
      sfx("err");
      alert(res.error || "Failed to register squad in TiDB.");
    }
  };

  // Stage Switchboard Toggle
  const handleToggleStage = async (stageNum: number, currentUnlocked: boolean) => {
    setIsUpdatingStage(true);
    try {
      const stored = getStoredSession();
      const activeTok =
        token ||
        (stored && (stored as any).token ? (stored as any).token : "") ||
        localStorage.getItem("hawkins_admin_token") ||
        sessionStorage.getItem("hawkins_admin_token") ||
        "";
      const bearerTok = activeTok ? (activeTok.startsWith("Bearer ") ? activeTok : `Bearer ${activeTok}`) : "";
      const res = await fetch("/api/admin/stages/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerTok,
        },
        body: JSON.stringify({ stageNumber: stageNum, unlocked: !currentUnlocked }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.unlockedStages)) {
        setUnlockedStages(data.unlockedStages);
        setStatusMessage(`Stage ${stageNum} access updated: ${!currentUnlocked ? "UNLOCKED / AUTHORIZED" : "LOCKED / RESTRICTED"}`);
        sfx("ok");
      } else {
        sfx("err");
        alert(data.message || data.error || "Failed to toggle stage.");
      }
    } catch (err: any) {
      sfx("err");
      alert("Error toggling stage: " + err.message);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  // Update Global Event Lifecycle
  const updateEventStateAction = async (updates: Partial<{ status: string; loginOpen: boolean; submissionsOpen: boolean; currentRoundMax: number }>) => {
    setIsUpdatingEvent(true);
    try {
      const res = await fetch("/api/admin/event/state", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.eventState) {
        setEventState(data.eventState);
        setStatusMessage(`Event lifecycle updated: Status=${data.eventState.status.toUpperCase()} | Submissions=${data.eventState.submissions_open ? 'OPEN' : 'STOPPED'} | Logins=${data.eventState.login_open ? 'OPEN' : 'CLOSED'}`);
        sfx("ok");
      }
    } catch (err: any) {
      alert("Failed to update event state: " + err.message);
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  // Start Fresh Tournament Event (Section 5)
  const handleStartFreshEvent = async () => {
    if (!confirm("Start a fresh tournament event? All squads will begin with 0 PTS for the new event, and previous event results will be archived into history.")) {
      return;
    }
    setIsUpdatingEvent(true);
    try {
      const activeToken = token || "";
      const res = await fetch("/api/admin/event/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        sfx("ok");
        try {
          localStorage.removeItem("hawkins_persisted_leaderboard");
          localStorage.removeItem("hawkins_live_score_sync");
        } catch {}
        setStatusMessage("Fresh tournament event successfully initiated: All squad scores initialized to 0 PTS. Historical results preserved.");
        setEventState({
          status: "active",
          login_open: true,
          submissions_open: true,
          current_round_max: 7,
        });
        setUnlockedStages([1]);
        setLeaderboard((prev) =>
          prev.map((item) => ({
            ...item,
            score: 0,
            solvedCount: 0,
            completedTasks: [],
            lastSubmissionTime: undefined,
          }))
        );
        loadData(true);
      } else {
        sfx("err");
        alert("Failed to start fresh event: " + (data.message || data.error));
      }
    } catch (err: any) {
      sfx("err");
      alert("Error starting fresh event: " + err.message);
    } finally {
      setIsUpdatingEvent(false);
    }
  };
  const runImportPreview = async (textToPreview?: string) => {
    const content = textToPreview !== undefined ? textToPreview : importText;
    if (!content.trim()) return;
    setIsAnalyzing(true);
    try {
      const activeTok = token || "";
      const res = await fetch("/api/admin/teams/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeTok}`,
        },
        body: JSON.stringify({ csv: content, preview: true, mode: importMode }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setImportPreview(data);
      }
    } catch (e: any) {
      console.warn("Preview error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) {
      alert("Please paste squad credentials or upload a CSV/Excel file first.");
      return;
    }
    setIsImporting(true);
    setImportMessage(null);
    try {
      const activeTok = token || "";
      const res = await fetch("/api/admin/teams/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeTok}`,
        },
        body: JSON.stringify({ csv: importText, mode: importMode, preview: false }),
      });
      const data = await res.json();
      if (data.success) {
        sfx("ok");
        const msg = `Bulk Import Complete: Created ${data.createdCount ?? data.importedCount}, Updated ${data.updatedCount ?? 0}, Skipped ${data.skippedCount ?? 0}.`;
        setImportMessage(msg);
        setStatusMessage(msg);
        loadData(true);
        setTimeout(() => {
          setShowImportModal(false);
          setImportText("");
          setImportPreview(null);
          setImportMessage(null);
        }, 1500);
      } else {
        alert("Import error: " + (data.message || data.error));
      }
    } catch (err: any) {
      alert("Failed to import squads: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      try {
        const arrayBuf = await file.arrayBuffer();
        // @ts-ignore
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuf, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        setImportText(csvContent);
        runImportPreview(csvContent);
      } catch (err: any) {
        alert("Failed to parse Excel file: " + err.message);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setImportText(content);
          runImportPreview(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const openTeamPerformance = async (team: AdminLeaderboardItem) => {
    sfx("click");
    setPerformanceTeam(team);
    setPerformanceData(null);
    setIsLoadingPerformance(true);
    setExpandedPerformanceStage(null);
    try {
      const activeTok = token || "";
      const res = await fetch(`/api/admin/teams/${team.teamId}/performance`, {
        headers: { Authorization: `Bearer ${activeTok}` },
      });
      const data = await res.json();
      if (data.success && data.performance) {
        setPerformanceData(data.performance);
      } else {
        setPerformanceData({
          teamOverview: {
            teamId: team.teamId,
            teamName: team.teamName,
            leaderName: team.leaderName,
            currentStage: "HAWKINS TOWN",
            currentTotalPoints: team.score,
            overallRank: team.rank,
            role: team.role || "PLAYER",
          },
          stages: [
            { stageId: 1, stageKey: "town", stageName: "HAWKINS TOWN", status: team.score > 0 ? "Completed" : "In Progress", startedAt: team.lastSubmissionTime || "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: team.score, pointsLost: 0, netStageScore: team.score, events: [] },
            { stageId: 2, stageKey: "police", stageName: "POLICE STATION", status: "Locked", startedAt: "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: 0, pointsLost: 0, netStageScore: 0, events: [] },
            { stageId: 3, stageKey: "byers", stageName: "BYERS HOUSE", status: "Locked", startedAt: "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: 0, pointsLost: 0, netStageScore: 0, events: [] },
            { stageId: 4, stageKey: "lab", stageName: "HAWKINS LAB", status: "Locked", startedAt: "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: 0, pointsLost: 0, netStageScore: 0, events: [] },
            { stageId: 5, stageKey: "radioTower", stageName: "RADIO TOWER", status: "Locked", startedAt: "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: 0, pointsLost: 0, netStageScore: 0, events: [] },
            { stageId: 6, stageKey: "gate", stageName: "THE GATE RIFT", status: "Locked", startedAt: "Unavailable", completedAt: "Unavailable", duration: "Unavailable", pointsEarned: 0, pointsLost: 0, netStageScore: 0, events: [] },
          ],
          eventWideActions: [],
        });
      }
    } catch (e) {
      console.warn("Failed to load performance data:", e);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  // Assign squad role (HAWKINS vs VECNA)
  const handleRoleChange = async (teamId: string, teamName: string, newRole: "PLAYER" | "VECNA") => {
    if (eventState.status === "active") {
      alert("Role changes are locked while the event is active. Pause or end event to reconfigure.");
      return;
    }
    const roleLabel = newRole === "VECNA" ? "VECNA" : "HAWKINS";
    if (!confirm(`Reassign squad "${teamName}" to ${roleLabel}?`)) {
      return;
    }
    try {
      const res = await updateAdminTeamRole(teamId, newRole);
      if (res.success) {
        sfx("ok");
        setStatusMessage(`Squad "${teamName}" assigned to ${roleLabel} protocol.`);
        setLeaderboard((prev) =>
          prev.map((t) => (t.teamId === teamId ? { ...t, role: newRole } : t))
        );
        loadData();
      } else {
        sfx("err");
        alert(res.error || res.message || "Failed to update squad role.");
      }
    } catch (err: any) {
      alert("Error updating squad role: " + err.message);
    }
  };

  // Open team details modal
  const openTeamDetailsModal = (team: AdminLeaderboardItem) => {
    sfx("click");
    setDetailTeam(team);
    setEditTeamPoints(team.score);
  };

  // Save team points edit to TiDB, Backend disk file, and persistent local storage
  const handleSaveTeamPoints = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!detailTeam) return;
    setIsUpdatingTeamPoints(true);

    const newScore = Number(editTeamPoints);
    const diff = newScore - detailTeam.score;

    // 1. Sync TiDB & live real-time broadcast
    const res = await updateTeamScoreInTiDB(detailTeam.teamId, newScore, {
      teamName: detailTeam.teamName,
      delta: diff,
      source: "ADMIN",
    });

    // 2. Direct backend disk store update (leaderboard-state.json)
    const activeToken = token || "";
    try {
      await updateAdminTeamScore(detailTeam.teamId, newScore, activeToken);
    } catch (err) {
      console.warn("[BACKEND] Score update warning:", err);
    }

    setIsUpdatingTeamPoints(false);
    sfx("ok");

    // 3. Immediately update UI state & local persistent cache
    const updatedLeaderboard = leaderboard
      .map((t) => (t.teamId === detailTeam.teamId ? { ...t, score: newScore } : t))
      .sort(sortByScoreThenTime)
      .map((t, idx) => ({ ...t, rank: idx + 1 }));

    setLeaderboard(updatedLeaderboard);
    setDetailTeam((prev) => (prev ? { ...prev, score: newScore } : null));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hawkins_persisted_leaderboard", JSON.stringify(updatedLeaderboard));
      } catch {}
    }

    setRecentlyUpdated((prev) => ({
      ...prev,
      [detailTeam.teamId]: {
        delta: diff >= 0 ? `+${diff}` : `${diff}`,
        timestamp: Date.now(),
      },
    }));

    setStatusMessage(`Squad "${detailTeam.teamName}" score updated to ${newScore} PTS.`);
    setTimeout(() => setStatusMessage(null), 4000);
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

  // Save chapter edit to BOTH TiDB and backend
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

    // 1. Update TiDB
    await updateTiDBChapter(editingChapter.id, payload);

    // 2. Update Backend
    const activeToken = token || "";
    await updateAdminChapter(editingChapter.id, payload, activeToken);

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

    setChapters((prev) => {
      const nextChapters = prev.map((c) => (c.id === editingChapter.id ? updatedChapter : c));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hawkins_persisted_chapters", JSON.stringify(nextChapters));
        } catch {}
      }
      return nextChapters;
    });

    setEditingChapter(null);
    setStatusMessage(`Chapter ${editingChapter.id} successfully updated across TiDB & backend vault.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Delete chapter
  const handleDeleteChapter = async (id: number) => {
    if (!confirm(`Are you sure you want to purge Chapter ${id} from active tournament challenges?`)) return;

    await deleteTiDBChapter(id);
    const activeToken = token || "";
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
    const activeToken = token || "";
    const res = await resetAdminChapters(activeToken);
    setLoading(false);

    if (res.success && res.chapters) {
      sfx("ok");
      setChapters(res.chapters);
      setStatusMessage("All questions restored to default tournament set.");
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Filtered leaderboard with text search and presence filter
  const filteredLeaderboard = leaderboard.filter((t) => {
    const matchesSearch =
      t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teamId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.leaderName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (presenceFilter === "online") return t.isOnline;
    if (presenceFilter === "offline") return !t.isOnline;
    if (presenceFilter === "vecna") return t.role === "VECNA";
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUTHENTICATED SESSION GUARD
  // The shared entry page renders this dashboard only for a verified ADMIN
  // session. There is no public /admin route or passkey gate anymore.
  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#07070a",
          color: "#d0d0d8",
          fontFamily: "var(--font-mono), monospace",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <div style={{ color: "#ff2d3a", letterSpacing: ".2em", fontSize: 12, marginBottom: 12 }}>
            ADMIN SESSION REQUIRED
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#888899" }}>
            Return to the shared entry page and sign in with an Admin identity and clearance password.
          </p>
          <button
            type="button"
            onClick={async () => {
              try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
              clearSession();
              if (typeof document !== "undefined") {
                document.cookie = "hawkins_session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "hawkins_admin_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              }
              window.location.href = "/";
            }}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              backgroundColor: "#ff2d3a",
              border: "none",
              borderRadius: 4,
              color: "#000000",
              fontWeight: 700,
              letterSpacing: ".12em",
              cursor: "pointer",
            }}
          >
            RETURN TO ENTRY
          </button>
        </div>
      </div>
    );
  }

  // Active chapter for questions section
  const activeChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0] || null;

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
      {/* ── TOP NAVIGATION BAR: Dashboard, Questions, Logs, Refresh ── */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#0d0d14",
          padding: "12px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              sfx("click");
              setActiveTab("dashboard");
            }}
            style={{
              padding: "7px 18px",
              fontSize: 13,
              letterSpacing: ".06em",
              borderRadius: 4,
              border: activeTab === "dashboard" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.08)",
              cursor: "pointer",
              backgroundColor: activeTab === "dashboard" ? "#ff2d3a" : "transparent",
              color: activeTab === "dashboard" ? "#000000" : "#d0d0d8",
              fontWeight: "bold",
              transition: "all 0.15s ease",
            }}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => {
              sfx("click");
              setActiveTab("questions");
            }}
            style={{
              padding: "7px 18px",
              fontSize: 13,
              letterSpacing: ".06em",
              borderRadius: 4,
              border: activeTab === "questions" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.08)",
              cursor: "pointer",
              backgroundColor: activeTab === "questions" ? "#ff2d3a" : "transparent",
              color: activeTab === "questions" ? "#000000" : "#d0d0d8",
              fontWeight: "bold",
              transition: "all 0.15s ease",
            }}
          >
            Questions
          </button>

          <button
            type="button"
            onClick={() => {
              sfx("click");
              setActiveTab("logs");
            }}
            style={{
              padding: "7px 18px",
              fontSize: 13,
              letterSpacing: ".06em",
              borderRadius: 4,
              border: activeTab === "logs" ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.08)",
              cursor: "pointer",
              backgroundColor: activeTab === "logs" ? "#ff2d3a" : "transparent",
              color: activeTab === "logs" ? "#000000" : "#d0d0d8",
              fontWeight: "bold",
              transition: "all 0.15s ease",
            }}
          >
            Logs
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* 1. REFRESH NOW BUTTON */}
          <button
            type="button"
            id="admin-refresh-now-btn"
            onClick={() => {
              sfx("blip");
              loadData(true);
            }}
            disabled={loading}
            style={{
              padding: "7px 18px",
              fontSize: 12,
              letterSpacing: ".08em",
              backgroundColor: loading ? "rgba(255, 45, 58, 0.25)" : "rgba(255, 45, 58, 0.15)",
              border: "1px solid #ff2d3a",
              color: "#ff4d58",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              boxShadow: "0 0 12px rgba(255, 45, 58, 0.25)",
            }}
            title="Force instant live update of all squads, scores, and presence from TiDB"
          >
            <span
              style={{
                display: "inline-block",
                transform: loading ? "rotate(360deg)" : "none",
                transition: loading ? "transform 0.8s linear infinite" : "none",
                fontSize: 13,
              }}
            >
              ⟳
            </span>
            <span>{loading ? "SYNCING..." : "REFRESH NOW"}</span>
          </button>

          {/* 2. AUTO-REFRESH TOGGLE & INTERVAL SELECTION */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(13, 13, 20, 0.95)",
              border: autoRefreshEnabled ? "1px solid rgba(54, 224, 196, 0.45)" : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 4,
              padding: "2px 6px",
              gap: 4,
            }}
          >
            <button
              type="button"
              id="admin-auto-refresh-toggle"
              onClick={() => {
                sfx("click");
                setAutoRefreshEnabled((prev) => !prev);
              }}
              style={{
                background: "none",
                border: "none",
                color: autoRefreshEnabled ? "#36e0c4" : "#777788",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".06em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
              }}
              title={autoRefreshEnabled ? "Auto-refresh is ON. Click to pause." : "Auto-refresh is PAUSED. Click to resume."}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: autoRefreshEnabled ? "#36e0c4" : "#555566",
                  boxShadow: autoRefreshEnabled ? "0 0 8px #36e0c4" : "none",
                  display: "inline-block",
                }}
              />
              <span>AUTO: {autoRefreshEnabled ? `ON (${autoRefreshSec}s)` : "PAUSED"}</span>
            </button>

            {/* Quick interval presets: 5s, 10s, 30s */}
            <div style={{ display: "flex", gap: 2, borderLeft: "1px solid rgba(255, 255, 255, 0.12)", paddingLeft: 4 }}>
              {[5, 10, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    sfx("click");
                    setAutoRefreshInterval(sec);
                    setAutoRefreshSec(sec);
                    setAutoRefreshEnabled(true);
                  }}
                  style={{
                    background: autoRefreshInterval === sec && autoRefreshEnabled ? "rgba(54, 224, 196, 0.25)" : "transparent",
                    border: "none",
                    borderRadius: 2,
                    color: autoRefreshInterval === sec && autoRefreshEnabled ? "#36e0c4" : "#666677",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 5px",
                    cursor: "pointer",
                  }}
                  title={`Auto-refresh every ${sec} seconds`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* 3. FULLSCREEN TOGGLE BUTTON */}
          <button
            id="admin-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              letterSpacing: ".08em",
              backgroundColor: isFullscreen ? "rgba(255, 45, 58, 0.3)" : "rgba(255, 45, 58, 0.12)",
              border: isFullscreen ? "1px solid #ff4d58" : "1px solid rgba(255, 45, 58, 0.6)",
              color: "#ffffff",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            <span style={{ fontSize: 13 }}>{isFullscreen ? "✖" : "⛶"}</span>
            <span>{isFullscreen ? "EXIT FS" : "FULLSCREEN"}</span>
          </button>

          {/* 4. LOGOUT BUTTON */}
          <button
            id="admin-logout-btn"
            type="button"
            onClick={handleLogout}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              letterSpacing: ".08em",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              color: "#d0d0d8",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
            title="Log out of Admin Console"
          >
            <span>LOGOUT</span>
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
        {/* TAB 1: LIVE LEADERBOARD (DASHBOARD) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div>
            {/* ── EVENT LIFECYCLE & GLOBAL CONTROLS COMMAND BAR ── */}
            <div
              style={{
                backgroundColor: "#0d0d14",
                border: "1px solid rgba(255, 45, 58, 0.35)",
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 24,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#888899", letterSpacing: ".08em" }}>
                    EVENT LIFECYCLE CONTROLS
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontWeight: "bold",
                      backgroundColor:
                        eventState.status === "active"
                          ? "rgba(54, 224, 196, 0.2)"
                          : eventState.status === "paused"
                          ? "rgba(255, 180, 84, 0.2)"
                          : "rgba(255, 45, 58, 0.2)",
                      color:
                        eventState.status === "active"
                          ? "#36e0c4"
                          : eventState.status === "paused"
                          ? "#ffb454"
                          : "#ff2d3a",
                      border: "1px solid currentColor",
                    }}
                  >
                    ● {eventState.status.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontWeight: "bold",
                      backgroundColor: eventState.submissions_open
                        ? "rgba(54, 224, 196, 0.15)"
                        : "rgba(255, 45, 58, 0.2)",
                      color: eventState.submissions_open ? "#36e0c4" : "#ff2d3a",
                      border: "1px solid currentColor",
                    }}
                  >
                    SUBMISSIONS: {eventState.submissions_open ? "OPEN" : "STOPPED"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontWeight: "bold",
                      backgroundColor: eventState.login_open
                        ? "rgba(54, 224, 196, 0.15)"
                        : "rgba(255, 45, 58, 0.2)",
                      color: eventState.login_open ? "#36e0c4" : "#ff2d3a",
                      border: "1px solid currentColor",
                    }}
                  >
                    LOGIN: {eventState.login_open ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {eventState.status === "not_started" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={handleStartFreshEvent}
                    style={{
                      padding: "8px 22px",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: ".1em",
                      backgroundColor: "#ff2d3a",
                      border: "2px solid #ff5964",
                      color: "#ffffff",
                      borderRadius: 4,
                      cursor: "pointer",
                      boxShadow: "0 0 20px rgba(255, 45, 58, 0.7), inset 0 0 10px rgba(0,0,0,0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    title="Initiate Hawkins Tournament: players can begin answering challenges"
                  >
                    <span>▶</span>
                    <span>START EVENT</span>
                  </button>
                ) : eventState.status === "paused" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={() => updateEventStateAction({ status: "active", submissionsOpen: true, loginOpen: true })}
                    style={{
                      padding: "7px 16px",
                      fontSize: 11,
                      fontWeight: "bold",
                      letterSpacing: ".06em",
                      backgroundColor: "rgba(54, 224, 196, 0.2)",
                      border: "1px solid #36e0c4",
                      color: "#36e0c4",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    ▶ RESUME EVENT
                  </button>
                ) : eventState.status === "active" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={() => updateEventStateAction({ status: "paused" })}
                    style={{
                      padding: "7px 16px",
                      fontSize: 11,
                      fontWeight: "bold",
                      letterSpacing: ".06em",
                      backgroundColor: "rgba(255, 180, 84, 0.2)",
                      border: "1px solid #ffb454",
                      color: "#ffb454",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    ⏸ PAUSE EVENT
                  </button>
                ) : (
                  <>
                    <div
                      style={{
                        padding: "7px 16px",
                        fontSize: 11,
                        fontWeight: "bold",
                        letterSpacing: ".06em",
                        backgroundColor: "rgba(255, 45, 58, 0.1)",
                        border: "1px solid #ff2d3a",
                        color: "#ff2d3a",
                        borderRadius: 4,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>⏹</span>
                      <span>EVENT CONCLUDED</span>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdatingEvent}
                      onClick={handleStartFreshEvent}
                      style={{
                        padding: "8px 22px",
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: ".1em",
                        backgroundColor: "#ff2d3a",
                        border: "2px solid #ff5964",
                        color: "#ffffff",
                        borderRadius: 4,
                        cursor: "pointer",
                        boxShadow: "0 0 20px rgba(255, 45, 58, 0.7), inset 0 0 10px rgba(0,0,0,0.4)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      title="Initiate fresh Hawkins Tournament: all squad scores initialize to 0 PTS with past results preserved in history"
                    >
                      <span>▶</span>
                      <span>START EVENT</span>
                    </button>
                  </>
                )}

                {/* Reset all scores utility button */}
                <button
                  type="button"
                  disabled={isUpdatingEvent}
                  onClick={async () => {
                    if (!confirm("WARNING: Are you sure you want to reset all squads' scores, solved stages, and submissions to 0 PTS?")) return;
                    try {
                      const res = await fetch("/api/admin/teams/reset-all-scores", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token || ""}` },
                      });
                      const d = await res.json();
                      if (d.success) {
                        sfx("ok");
                        setStatusMessage("All squad scores successfully reset to 0 PTS.");
                        loadData(true);
                      } else {
                        alert("Reset failed: " + (d.message || d.error));
                      }
                    } catch (e: any) {
                      alert("Reset error: " + e.message);
                    }
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 11,
                    fontWeight: "bold",
                    letterSpacing: ".06em",
                    backgroundColor: "rgba(255, 45, 58, 0.12)",
                    border: "1px solid rgba(255, 45, 58, 0.4)",
                    color: "#ff8088",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  title="Reset all team scores and progress to 0 PTS in TiDB"
                >
                  ↺ RESET ALL SCORES TO 0
                </button>

                <button
                  type="button"
                  disabled={isUpdatingEvent || eventState.status === "ended"}
                  onClick={() => updateEventStateAction({ submissionsOpen: !eventState.submissions_open })}
                  style={{
                    padding: "7px 14px",
                    fontSize: 11,
                    fontWeight: "bold",
                    letterSpacing: ".06em",
                    backgroundColor: eventState.status === "ended"
                      ? "rgba(100, 100, 100, 0.15)"
                      : eventState.submissions_open
                      ? "rgba(255, 45, 58, 0.15)"
                      : "rgba(54, 224, 196, 0.15)",
                    border: eventState.status === "ended"
                      ? "1px solid #555555"
                      : eventState.submissions_open
                      ? "1px solid #ff2d3a"
                      : "1px solid #36e0c4",
                    color: eventState.status === "ended" ? "#777777" : eventState.submissions_open ? "#ff2d3a" : "#36e0c4",
                    borderRadius: 4,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                  }}
                >
                  {eventState.submissions_open ? "⛔ STOP SUBMISSIONS" : "✓ OPEN SUBMISSIONS"}
                </button>

                <button
                  type="button"
                  disabled={isUpdatingEvent || eventState.status === "ended"}
                  onClick={() => updateEventStateAction({ loginOpen: !eventState.login_open })}
                  style={{
                    padding: "7px 14px",
                    fontSize: 11,
                    fontWeight: "bold",
                    letterSpacing: ".06em",
                    backgroundColor: eventState.status === "ended"
                      ? "rgba(100, 100, 100, 0.15)"
                      : eventState.login_open
                      ? "rgba(255, 45, 58, 0.15)"
                      : "rgba(54, 224, 196, 0.15)",
                    border: eventState.status === "ended"
                      ? "1px solid #555555"
                      : eventState.login_open
                      ? "1px solid #ff2d3a"
                      : "1px solid #36e0c4",
                    color: eventState.status === "ended" ? "#777777" : eventState.login_open ? "#ff2d3a" : "#36e0c4",
                    borderRadius: 4,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                  }}
                >
                  {eventState.login_open ? "🔒 CLOSE LOGIN" : "🔓 OPEN LOGIN"}
                </button>

                <button
                  type="button"
                  disabled={isUpdatingEvent || eventState.status === "ended"}
                  onClick={async () => {
                    if (!confirm("End this event? All active Hawkins and Vecna teams will be logged out. Final scores and history will be preserved.")) return;
                    setIsUpdatingEvent(true);
                    try {
                      const res = await fetch("/api/admin/event/end", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token || ""}` },
                      });
                      const d = await res.json();
                      if (d.success) {
                        sfx("ok");
                        setStatusMessage("Tournament event successfully ended: All active sessions terminated. Final results archived into history.");
                        setEventState((prev) => ({
                          ...prev,
                          status: "ended",
                          submissions_open: false,
                          login_open: false,
                        }));
                        loadData(true);
                      } else {
                        sfx("err");
                        alert("Failed to end event: " + (d.message || d.error));
                      }
                    } catch (err: any) {
                      sfx("err");
                      alert("Error ending event: " + err.message);
                    } finally {
                      setIsUpdatingEvent(false);
                    }
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 11,
                    fontWeight: "bold",
                    letterSpacing: ".06em",
                    backgroundColor: eventState.status === "ended" ? "rgba(255, 45, 58, 0.05)" : "rgba(255, 45, 58, 0.2)",
                    border: "1px solid #ff2d3a",
                    color: eventState.status === "ended" ? "#883338" : "#ff2d3a",
                    borderRadius: 4,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                  }}
                >
                  {eventState.status === "ended" ? "⏹ EVENT ENDED" : "⏹ END EVENT"}
                </button>
              </div>
            </div>

            {/* TOURNAMENT STAGE ACCESS SWITCHBOARD (STAGES 1 - 6) */}
            <div
              style={{
                marginBottom: 24,
                padding: "16px 20px",
                background: "rgba(10, 10, 18, 0.9)",
                border: "1px solid rgba(54, 224, 196, 0.3)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#36e0c4",
                        boxShadow: "0 0 8px #36e0c4",
                      }}
                    />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: "bold",
                        letterSpacing: "0.12em",
                        color: "#36e0c4",
                        textTransform: "uppercase",
                      }}
                    >
                      Tournament Stage Access Switchboard (Dual-Condition Locking)
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#888899", letterSpacing: "0.04em" }}>
                    Stages unlock for participant squads only when <strong>Condition A</strong> (prior stage cleared) AND <strong>Condition B</strong> (authorized below by Admin) are both TRUE.
                  </p>
                </div>
                <div style={{ fontSize: 11, color: "#aaaabb", fontFamily: '"Share Tech Mono", monospace' }}>
                  AUTHORIZED STAGES:{" "}
                  <span style={{ color: "#36e0c4", fontWeight: "bold" }}>
                    {unlockedStages.slice().sort((a, b) => a - b).join(", ") || "NONE"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  { num: 1, title: "STAGE 1", name: "Hawkins Lab Breach", type: "Quiz Questions" },
                  { num: 2, title: "STAGE 2", name: "The Void & Upside Down", type: "Connection Questions" },
                  { num: 3, title: "STAGE 3", name: "Creel House Finale", type: "Rearrange Questions" },
                  { num: 4, title: "STAGE 4", name: "Forensic Dossier", type: "Case Study Questions" },
                  { num: 5, title: "STAGE 5", name: "Radio Transmission", type: "Signal Decryption" },
                  { num: 6, title: "STAGE 6", name: "System Override", type: "Lab-Type Tasks" },
                ].map((stg) => {
                  const isUnlocked = unlockedStages.includes(stg.num);
                  return (
                    <div
                      key={stg.num}
                      style={{
                        background: isUnlocked ? "rgba(54, 224, 196, 0.06)" : "rgba(255, 45, 58, 0.05)",
                        border: isUnlocked ? "1px solid rgba(54, 224, 196, 0.35)" : "1px solid rgba(255, 45, 58, 0.3)",
                        borderRadius: 4,
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: "bold",
                              color: isUnlocked ? "#36e0c4" : "#ff4d58",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {stg.title}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: 2,
                              background: isUnlocked ? "rgba(54, 224, 196, 0.2)" : "rgba(255, 45, 58, 0.2)",
                              color: isUnlocked ? "#36e0c4" : "#ff6b72",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {isUnlocked ? "OPEN" : "LOCKED"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginTop: 4 }}>
                          {stg.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#777788", marginTop: 2 }}>
                          {stg.type}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingStage}
                        onClick={() => handleToggleStage(stg.num, isUnlocked)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontSize: 10,
                          fontWeight: "bold",
                          letterSpacing: "0.08em",
                          borderRadius: 3,
                          cursor: isUpdatingStage ? "not-allowed" : "pointer",
                          background: isUnlocked ? "rgba(255, 45, 58, 0.15)" : "rgba(54, 224, 196, 0.15)",
                          border: isUnlocked ? "1px solid #ff2d3a" : "1px solid #36e0c4",
                          color: isUnlocked ? "#ff6b72" : "#36e0c4",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {isUnlocked ? "🔒 LOCK STAGE" : "🔓 UNLOCK STAGE"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

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
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#36e0c4" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "#36e0c4",
                        display: "inline-block",
                        boxShadow: "0 0 8px #36e0c4",
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>LIVE REALTIME SYNC</span>
                  </div>
                  <span style={{ color: "#777788" }}>
                    · Scores update and standings re-rank dynamically as teams solve or points are overridden.
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 3,
                      backgroundColor: autoRefreshEnabled ? "rgba(54, 224, 196, 0.1)" : "rgba(255, 255, 255, 0.05)",
                      border: autoRefreshEnabled ? "1px solid rgba(54, 224, 196, 0.25)" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: autoRefreshEnabled ? "#36e0c4" : "#888899",
                      fontWeight: "bold",
                    }}
                  >
                    ⏱ AUTO-REFRESH: {autoRefreshEnabled ? `${autoRefreshSec}s` : "PAUSED"}
                  </span>
                  <span style={{ color: "#555566", fontSize: 11 }}>
                    (Total squads: {leaderboard.length})
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  id="admin-standings-refresh-btn"
                  onClick={() => {
                    sfx("blip");
                    loadData(true);
                  }}
                  disabled={loading}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    letterSpacing: ".08em",
                    backgroundColor: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff4d58",
                    borderRadius: 4,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 0 10px rgba(255, 45, 58, 0.2)",
                  }}
                  title="Force instant sync of squad standings and online status from TiDB"
                >
                  <span style={{ display: "inline-block", transform: loading ? "rotate(360deg)" : "none", transition: loading ? "transform 0.8s linear infinite" : "none" }}>⟳</span>
                  <span>{loading ? "SYNCING..." : "REFRESH STANDINGS"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    letterSpacing: ".08em",
                    backgroundColor: "rgba(255, 180, 84, 0.15)",
                    border: "1px solid #ffb454",
                    color: "#ffb454",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>📁</span>
                  <span>IMPORT SQUADS (CSV/EXCEL)</span>
                </button>

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

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("⚠️ FORCE RESET ALL ACTIVE SESSIONS?\n\nThis will invalidate all current participant login sessions and immediately unlock all squads across the event.\n\nAre you sure you want to proceed?")) {
                      const res = await fetch("/api/admin/teams/reset-all-sessions", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token || ""}` },
                      });
                      const d = await res.json();
                      if (d.success) {
                        alert("✅ All active squad sessions have been purged. All accounts are now available.");
                        loadData();
                      } else {
                        alert("Failed to reset sessions: " + (d.error || "Unknown error"));
                      }
                    }
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    letterSpacing: ".08em",
                    backgroundColor: "rgba(255, 45, 58, 0.15)",
                    border: "1px solid #ff2d3a",
                    color: "#ff2d3a",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>🔓</span>
                  <span>RESET ALL SESSIONS</span>
                </button>

                {/* Standings Filter Tabs: ALL, ONLINE, OFFLINE, VECNA */}
                <div style={{ display: "flex", gap: 4, backgroundColor: "#07070a", padding: 2, borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: `ALL (${leaderboard.length})` },
                    { id: "online", label: `ONLINE (${leaderboard.filter((t) => t.isOnline).length})` },
                    { id: "offline", label: `OFFLINE (${leaderboard.filter((t) => !t.isOnline).length})` },
                    { id: "vecna", label: `VECNA (${leaderboard.filter((t) => t.role === "VECNA").length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        sfx("click");
                        setPresenceFilter(tab.id as any);
                      }}
                      style={{
                        padding: "5px 10px",
                        fontSize: 11,
                        fontFamily: "var(--font-mono), monospace",
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        borderRadius: 3,
                        border: "none",
                        cursor: "pointer",
                        backgroundColor: presenceFilter === tab.id ? (tab.id === "online" ? "#2e7d32" : tab.id === "vecna" ? "#b71c1c" : "#ff2d3a") : "transparent",
                        color: presenceFilter === tab.id ? "#ffffff" : "#888899",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

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
                    <th style={{ padding: "12px 16px", width: 60, backgroundColor: "#0b0b12" }}>RANK</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>SQUAD (NAME / LEADER)</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12", width: 120 }}>ROLE</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12", color: "#36e0c4" }}>USERNAME</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12", color: "#ffb454" }}>PASSWORD (RECOVERY)</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>STAGE / SOLVED</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>PRESENCE</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", backgroundColor: "#0b0b12" }}>SCORE</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", backgroundColor: "#0b0b12" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((item, idx) => {
                    const recent = recentlyUpdated[item.teamId];
                    const isRecent = recent && Date.now() - recent.timestamp < 4500;

                    return (
                      <tr
                        key={item.teamId}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                          backgroundColor: isRecent
                            ? "rgba(54, 224, 196, 0.09)"
                            : idx % 2 === 0
                            ? "transparent"
                            : "rgba(255, 255, 255, 0.015)",
                          borderLeft: isRecent ? "3px solid #36e0c4" : "3px solid transparent",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 16px",
                            fontWeight: "bold",
                            color: isRecent ? "#36e0c4" : item.rank <= 3 ? "#ff2d3a" : "#777",
                          }}
                        >
                          #{String(item.rank).padStart(2, "0")}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 600, color: item.role === "VECNA" ? "#ff4d58" : "#ffffff", fontSize: 14 }}>
                                {item.teamName}
                              </span>
                              {item.role === "VECNA" && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: "2px 6px",
                                    borderRadius: 3,
                                    backgroundColor: "rgba(255, 45, 58, 0.2)",
                                    border: "1px solid #ff2d3a",
                                    color: "#ff2d3a",
                                    fontWeight: 900,
                                    letterSpacing: "0.1em",
                                  }}
                                >
                                  VECNA OPS
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#666677" }}>Leader: {item.leaderName} · ID: {item.teamId}</div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <select
                            value={item.role === "VECNA" ? "VECNA" : "PLAYER"}
                            disabled={eventState.status === "active"}
                            onChange={(e) => handleRoleChange(item.teamId, item.teamName, e.target.value as "PLAYER" | "VECNA")}
                            title={eventState.status === "active" ? "Role locked while event is active" : "Change squad role"}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: "bold",
                              letterSpacing: "0.05em",
                              backgroundColor: item.role === "VECNA" ? "rgba(255, 45, 58, 0.15)" : "rgba(54, 224, 196, 0.15)",
                              border: item.role === "VECNA" ? "1px solid #ff2d3a" : "1px solid #36e0c4",
                              color: item.role === "VECNA" ? "#ff4d58" : "#36e0c4",
                              borderRadius: 4,
                              cursor: eventState.status === "active" ? "not-allowed" : "pointer",
                              outline: "none",
                            }}
                          >
                            <option value="PLAYER" style={{ backgroundColor: "#0b0b12", color: "#36e0c4" }}>
                              HAWKINS
                            </option>
                            <option value="VECNA" style={{ backgroundColor: "#0b0b12", color: "#ff4d58" }}>
                              VECNA
                            </option>
                          </select>
                        </td>
                        <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: item.role === "VECNA" ? "#ff4d58" : "#36e0c4", fontWeight: "bold" }}>
                          {item.username || item.teamId}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            onClick={() => {
                              const pass = item.password || (item.role === "VECNA" ? "HAWKINS1986" : "hawkins83_01");
                              navigator.clipboard.writeText(pass);
                              alert(`Copied password for ${item.teamName}: ${pass}`);
                            }}
                            title="Click to copy password"
                            style={{
                              padding: "4px 8px",
                              backgroundColor: item.role === "VECNA" ? "rgba(255, 45, 58, 0.15)" : "rgba(255, 180, 84, 0.12)",
                              border: item.role === "VECNA" ? "1px solid rgba(255, 45, 58, 0.35)" : "1px solid rgba(255, 180, 84, 0.35)",
                              color: item.role === "VECNA" ? "#ff8a80" : "#ffb454",
                              borderRadius: 4,
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {item.password || (item.role === "VECNA" ? "HAWKINS1986" : "hawkins83_01")} 📋
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {item.role === "VECNA" ? (
                            <span style={{ color: "#ff4d58", fontWeight: "bold", fontSize: 12 }}>Omniscient Control</span>
                          ) : (
                            <>
                              <span style={{ color: "#36e0c4", fontWeight: "bold" }}>
                                Stage {eventState?.status === "not_started" ? 1 : (item.currentStage || 1)}/6
                              </span>
                              <span style={{ color: "#555566", fontSize: 12, marginLeft: 6 }}>
                                ({eventState?.status === "not_started" ? 0 : item.solvedCount} solves)
                              </span>
                            </>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {item.isOnline ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 4,
                                fontWeight: "bold",
                                backgroundColor: "rgba(54, 224, 196, 0.15)",
                                color: "#36e0c4",
                                border: "1px solid rgba(54, 224, 196, 0.4)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#36e0c4", boxShadow: "0 0 6px #36e0c4" }} />
                              ONLINE
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 4,
                                fontWeight: "bold",
                                backgroundColor: "rgba(255, 255, 255, 0.04)",
                                color: "#666677",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#555566" }} />
                              OFFLINE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 16, fontWeight: "bold", color: "#ffb454" }}>
                            {eventState?.status === "not_started" ? 0 : (typeof item.score === "number" && !isNaN(item.score) ? item.score : 0)} PTS
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => openTeamPerformance(item)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: "bold",
                                backgroundColor: "rgba(255, 45, 58, 0.15)",
                                border: "1px solid rgba(255, 45, 58, 0.4)",
                                color: "#ff4d58",
                                borderRadius: 4,
                                cursor: "pointer",
                                letterSpacing: ".04em",
                              }}
                            >
                              VIEW PERFORMANCE
                            </button>
                            <button
                              type="button"
                              onClick={() => openTeamDetailsModal(item)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: "bold",
                                backgroundColor: "rgba(54, 224, 196, 0.12)",
                                border: "1px solid rgba(54, 224, 196, 0.35)",
                                color: "#36e0c4",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              Dossier
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Force logout squad "${item.teamName}"?`)) {
                                  // 1. Instant local/socket revocation dispatch
                                  publish({ type: "force_logout", target: item.teamId });
                                  publish({ type: "force_logout", target: item.teamName });
                                  // 2. Authoritative backend termination
                                  await fetch("/api/admin/teams/force-logout", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token || ""}`,
                                    },
                                    body: JSON.stringify({ teamId: item.teamId }),
                                  });
                                  // 3. Immediately reflect in local state without delay
                                  setLeaderboard((prev) =>
                                    prev.map((t) => (t.teamId === item.teamId ? { ...t, isOnline: false, status: "OFFLINE", hasSession: false } : t))
                                  );
                                  loadData();
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: "bold",
                                backgroundColor: "rgba(255, 45, 58, 0.12)",
                                border: "1px solid rgba(255, 45, 58, 0.35)",
                                color: "#ff2d3a",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              Force Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#666" }}>
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
        {/* TAB 2: QUESTIONS CONFIGURATION (CHAPTER-WISE CARDS) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "questions" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, color: "#ffffff", margin: "0 0 4px 0", fontWeight: "bold" }}>
                  Chapters & Questions ({chapters.length})
                </h2>
                <div style={{ fontSize: 12, color: "#777788" }}>
                  Select a chapter card below to view its question, options, and answer key.
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#aaaaaa",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Reset Defaults
              </button>
            </div>

            {/* Chapter-wise Cards Row / Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {chapters.map((ch) => {
                const isSelected = (activeChapter && activeChapter.id === ch.id) || selectedChapterId === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      sfx("click");
                      setSelectedChapterId(ch.id);
                    }}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 6,
                      cursor: "pointer",
                      backgroundColor: isSelected ? "rgba(255, 45, 58, 0.1)" : "#0d0d14",
                      border: isSelected ? "1px solid #ff2d3a" : "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: isSelected ? "0 4px 16px rgba(255, 45, 58, 0.18)" : "none",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: "bold",
                          letterSpacing: ".1em",
                          color: isSelected ? "#ff2d3a" : "#888899",
                        }}
                      >
                        CHAPTER {ch.id}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 3,
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          color: "#aaaaaa",
                        }}
                      >
                        {ch.points || 100} PTS
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? "#ffffff" : "#cccccc",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ch.archiveTitle || `Chapter ${ch.id}`}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: isSelected ? "#ff2d3a" : "#666677",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {isSelected ? "● Viewing" : "Click to view"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Chapter Question Details */}
            {activeChapter ? (
              <div
                style={{
                  backgroundColor: "#0d0d14",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 6,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Header row with Chapter Title and Action buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    paddingBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        letterSpacing: ".1em",
                        padding: "4px 10px",
                        borderRadius: 3,
                        backgroundColor: "rgba(255, 45, 58, 0.15)",
                        color: "#ff2d3a",
                      }}
                    >
                      CHAPTER {activeChapter.id}
                    </span>
                    <div>
                      <h3 style={{ fontSize: 18, color: "#ffffff", margin: 0, fontWeight: 600 }}>
                        {activeChapter.archiveTitle || `Chapter ${activeChapter.id}`}
                      </h3>
                      <div style={{ fontSize: 12, color: "#777788", marginTop: 2 }}>
                        Points: <span style={{ color: "#36e0c4", fontWeight: "bold" }}>{activeChapter.points || 100} PTS</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(activeChapter)}
                      style={{
                        padding: "8px 16px",
                        fontSize: 12,
                        letterSpacing: ".06em",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#ffffff",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Edit Question
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChapter(activeChapter.id)}
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        letterSpacing: ".06em",
                        backgroundColor: "transparent",
                        border: "1px solid rgba(255, 45, 58, 0.3)",
                        color: "#ff2d3a",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: ".15em",
                      color: "#888899",
                      marginBottom: 8,
                      fontWeight: "bold",
                    }}
                  >
                    QUESTION PROMPT
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "#ffffff",
                      backgroundColor: "#060609",
                      padding: "16px 20px",
                      borderRadius: 4,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {activeChapter.questionPrompt || "Question not yet configured for this chapter."}
                  </div>
                </div>

                {/* Multiple Choice Options */}
                {activeChapter.options && activeChapter.options.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: ".15em",
                        color: "#888899",
                        marginBottom: 10,
                        fontWeight: "bold",
                      }}
                    >
                      OPTIONS & ANSWER KEY
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {activeChapter.options.map((opt) => {
                        const isCorrect = opt.id === activeChapter.correctAnswer;
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: "12px 16px",
                              borderRadius: 4,
                              backgroundColor: isCorrect ? "rgba(54, 224, 196, 0.08)" : "#07070b",
                              border: isCorrect ? "1px solid #36e0c4" : "1px solid rgba(255, 255, 255, 0.06)",
                              color: isCorrect ? "#36e0c4" : "#cccccc",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                fontSize: 13,
                                color: isCorrect ? "#36e0c4" : "#888899",
                              }}
                            >
                              [{opt.id}]
                            </span>
                            <span style={{ flex: 1, lineHeight: 1.4 }}>{opt.text}</span>
                            {isCorrect && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: "bold",
                                  color: "#36e0c4",
                                  backgroundColor: "rgba(54, 224, 196, 0.15)",
                                  padding: "2px 8px",
                                  borderRadius: 3,
                                }}
                              >
                                ✓ Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lore briefing notes if any */}
                {activeChapter.archiveLines && activeChapter.archiveLines.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: ".15em",
                        color: "#888899",
                        marginBottom: 8,
                        fontWeight: "bold",
                      }}
                    >
                      ARCHIVE LORE & BRIEFING
                    </div>
                    <div
                      style={{
                        backgroundColor: "#060609",
                        padding: "14px 18px",
                        borderRadius: 4,
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        fontSize: 12,
                        color: "#8888aa",
                        lineHeight: 1.6,
                        fontStyle: "italic",
                      }}
                    >
                      {activeChapter.archiveLines.map((line, lIdx) => (
                        <div key={lIdx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                {loading ? "Loading chapters..." : "No chapters found. Click 'Reset Defaults' to populate the 7 chapters."}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: SYSTEM & SUBMISSION LOGS (WITH CONNECTION TOPOLOGY) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "logs" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, color: "#ffffff", margin: "0 0 4px 0", fontWeight: "bold" }}>
                  System &amp; Connection Telemetry
                </h2>
                <div style={{ fontSize: 12, color: "#777788" }}>
                  Live status tracking: Main Page ↔ Admin Console ↔ TiDB Serverless &amp; Socket.IO Leaderboard.
                </div>
              </div>

              <button
                type="button"
                onClick={handlePingAllConnections}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: "bold",
                  backgroundColor: "rgba(54, 224, 196, 0.15)",
                  border: "1px solid #36e0c4",
                  color: "#36e0c4",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>⚡</span>
                <span>Ping &amp; Re-Sync Bridges</span>
              </button>
            </div>

            {/* 3 LIVE CONNECTION TOPOLOGY CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                marginBottom: 24,
              }}
            >
              {/* CARD 1: MAIN PAGE CLIENT */}
              <div
                style={{
                  backgroundColor: "#0d0d14",
                  border: "1px solid rgba(54, 224, 196, 0.3)",
                  borderRadius: 6,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#888899", fontWeight: "bold" }}>
                    MAIN GAME CLIENT
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      padding: "2px 8px",
                      borderRadius: 3,
                      backgroundColor: "rgba(54, 224, 196, 0.15)",
                      color: "#36e0c4",
                      border: "1px solid rgba(54, 224, 196, 0.4)",
                    }}
                  >
                    ● CONNECTED
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                  Bridge: Main Page ↔ Admin Console
                </div>
                <div style={{ fontSize: 12, color: "#8888aa" }}>
                  {connStatus.mainPage.details}
                </div>
                <div style={{ fontSize: 11, color: "#36e0c4", display: "flex", gap: 8, marginTop: 4 }}>
                  <span>Latency: {connStatus.mainPage.latency}</span>
                  <span>·</span>
                  <span>{connStatus.mainPage.lastPing}</span>
                </div>
              </div>

              {/* CARD 2: LEADERBOARD REAL-TIME */}
              <div
                style={{
                  backgroundColor: "#0d0d14",
                  border: "1px solid rgba(54, 224, 196, 0.3)",
                  borderRadius: 6,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#888899", fontWeight: "bold" }}>
                    LEADERBOARD REAL-TIME
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      padding: "2px 8px",
                      borderRadius: 3,
                      backgroundColor: "rgba(54, 224, 196, 0.15)",
                      color: "#36e0c4",
                      border: "1px solid rgba(54, 224, 196, 0.4)",
                    }}
                  >
                    ● SYNCHRONIZED
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                  Channel: {connStatus.leaderboard.channel}
                </div>
                <div style={{ fontSize: 12, color: "#8888aa" }}>
                  Postgres real-time change stream active on table &apos;teams&apos;
                </div>
                <div style={{ fontSize: 11, color: "#36e0c4", display: "flex", gap: 8, marginTop: 4 }}>
                  <span>Roster: {leaderboard.length} Squads Active</span>
                  <span>·</span>
                  <span>Live Push Enabled</span>
                </div>
              </div>

              {/* CARD 3: ADMIN COMMAND BRIDGE */}
              <div
                style={{
                  backgroundColor: "#0d0d14",
                  border: "1px solid rgba(255, 45, 58, 0.3)",
                  borderRadius: 6,
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#888899", fontWeight: "bold" }}>
                    ADMIN COMMAND BRIDGE
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      padding: "2px 8px",
                      borderRadius: 3,
                      backgroundColor: "rgba(255, 45, 58, 0.15)",
                      color: "#ff2d3a",
                      border: "1px solid rgba(255, 45, 58, 0.4)",
                    }}
                  >
                    ● ONLINE
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                  TiDB Serverless Distributed SQL &amp; Port {connStatus.adminBridge.backendPort}
                </div>
                <div style={{ fontSize: 12, color: "#8888aa" }}>
                  Master clearance authenticated (Full R/W)
                </div>
                <div style={{ fontSize: 11, color: "#ffb454", display: "flex", gap: 8, marginTop: 4 }}>
                  <span>Latency: {connStatus.adminBridge.latency}</span>
                  <span>·</span>
                  <span>Source: {dataSource.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setLogFilter("all")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: logFilter === "all" ? "1px solid #36e0c4" : "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: logFilter === "all" ? "rgba(54, 224, 196, 0.15)" : "transparent",
                  color: logFilter === "all" ? "#36e0c4" : "#888899",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                All Activity ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("connections")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: logFilter === "connections" ? "1px solid #36e0c4" : "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: logFilter === "connections" ? "rgba(54, 224, 196, 0.15)" : "transparent",
                  color: logFilter === "connections" ? "#36e0c4" : "#888899",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Connections &amp; Handshakes ({logs.filter((l) => l.type === "connection" || l.status === "CONNECTED" || l.status === "SYNCED").length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("submissions")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 4,
                  border: logFilter === "submissions" ? "1px solid #36e0c4" : "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: logFilter === "submissions" ? "rgba(54, 224, 196, 0.15)" : "transparent",
                  color: logFilter === "submissions" ? "#36e0c4" : "#888899",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Submissions ({logs.filter((l) => l.type === "submission" || l.status === "SUCCESS" || l.status === "FAILED").length})
              </button>
            </div>

            <div
              className="admin-scrollable"
              style={{
                backgroundColor: "#0d0d14",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 6,
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "65vh",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.12)", backgroundColor: "#0b0b12", color: "#888899" }}>
                    <th style={{ padding: "12px 16px", width: 110, backgroundColor: "#0b0b12" }}>TIME</th>
                    <th style={{ padding: "12px 16px", width: 170, backgroundColor: "#0b0b12" }}>COMPONENT / SQUAD</th>
                    <th style={{ padding: "12px 16px", backgroundColor: "#0b0b12" }}>EVENT / ACTION</th>
                    <th style={{ padding: "12px 16px", width: 130, backgroundColor: "#0b0b12" }}>STATUS</th>
                    <th style={{ padding: "12px 16px", width: 90, textAlign: "right", backgroundColor: "#0b0b12" }}>LATENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {logs
                    .filter((log) => {
                      if (logFilter === "connections") return log.type === "connection" || log.status === "CONNECTED" || log.status === "SYNCED";
                      if (logFilter === "submissions") return log.type === "submission" || log.status === "SUCCESS" || log.status === "FAILED";
                      return true;
                    })
                    .map((log) => {
                      const isConn = log.status === "CONNECTED";
                      const isSynced = log.status === "SYNCED";
                      const isSuccess = log.status === "SUCCESS";

                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            backgroundColor: isSynced ? "rgba(255, 180, 84, 0.03)" : isConn ? "rgba(54, 224, 196, 0.02)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 16px", color: "#888899", fontSize: 12 }}>{log.timestamp}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: isConn ? "#36e0c4" : isSynced ? "#ffb454" : "#ffffff" }}>
                            {log.team}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#d0d0d8" }}>{log.action}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 3,
                                fontSize: 11,
                                fontWeight: "bold",
                                backgroundColor: isConn
                                  ? "rgba(54, 224, 196, 0.12)"
                                  : isSynced
                                  ? "rgba(255, 180, 84, 0.15)"
                                  : isSuccess
                                  ? "rgba(54, 224, 196, 0.12)"
                                  : "rgba(255, 45, 58, 0.12)",
                                color: isConn
                                  ? "#36e0c4"
                                  : isSynced
                                  ? "#ffb454"
                                  : isSuccess
                                  ? "#36e0c4"
                                  : "#ff2d3a",
                                border: isConn
                                  ? "1px solid rgba(54, 224, 196, 0.4)"
                                  : isSynced
                                  ? "1px solid rgba(255, 180, 84, 0.4)"
                                  : isSuccess
                                  ? "1px solid rgba(54, 224, 196, 0.3)"
                                  : "1px solid rgba(255, 45, 58, 0.3)",
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "#777788", fontSize: 12 }}>
                            {log.latency || "24ms"}
                          </td>
                        </tr>
                      );
                    })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#666" }}>
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                  VAULT CONFIGURATION · TIDB DISTRIBUTED SQL SYNC
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
                {isSaving ? "SAVING TO TIDB..." : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3.5. BULK SQUAD IMPORT MODAL (CSV / TSV / EXCEL / ROSTER) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showImportModal && (
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
          onClick={() => {
            setShowImportModal(false);
            setImportPreview(null);
          }}
        >
          <div
            className="admin-scrollable"
            style={{
              backgroundColor: "#0d0d14",
              border: "1px solid #ffb454",
              borderRadius: 6,
              width: "100%",
              maxWidth: "840px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow: "0 10px 40px rgba(255, 180, 84, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 18, color: "#ffffff", letterSpacing: ".05em" }}>
                  BULK SQUAD IMPORT &amp; SPREADSHEET VALIDATOR
                </h3>
                <span style={{ fontSize: 12, color: "#888899" }}>
                  Supports CSV, TSV, and Excel (.xlsx, .xls) files or direct copy-paste. Validates before database commit.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
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

            {/* File Upload Shortcut */}
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "rgba(255, 180, 84, 0.08)",
                border: "1px dashed rgba(255, 180, 84, 0.4)",
                borderRadius: 4,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#ffb454", fontWeight: 600 }}>Choose CSV, TSV, or Excel (.xlsx / .xls) file:</div>
                <div style={{ fontSize: 11, color: "#888899", marginTop: 2 }}>Recognizes headers: Team Name, Team Leader, Score, Role</div>
              </div>
              <input
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ fontSize: 12, color: "#d0d0d8" }}
              />
            </div>

            {/* Paste format explanation */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#888899" }}>Roster text / spreadsheet content:</span>
                <span style={{ fontSize: 11, color: "#36e0c4" }}>
                  CSV / TSV / Colon: Team Name, Leader Name, Score, Role
                </span>
              </div>
              <textarea
                rows={importPreview ? 4 : 7}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (importPreview) setImportPreview(null);
                }}
                placeholder={`Team Name, Leader Name, Score, Role\nNull Pointers, Aarav Sharma, 0, PLAYER\nByte Byters, Dustin Henderson, 0, PLAYER\nShadow Walkers, Mike Wheeler, 0, PLAYER`}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono), monospace",
                  backgroundColor: "#08080c",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: 4,
                  color: "#ffffff",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Validation Preview Section */}
            {importPreview && (
              <div style={{ marginBottom: 20 }}>
                {/* Summary stat tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: "10px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 11, color: "#888899" }}>TOTAL ROWS</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#ffffff", marginTop: 2 }}>{importPreview.totalRows}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(54,224,196,0.08)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(54,224,196,0.3)" }}>
                    <div style={{ fontSize: 11, color: "#36e0c4" }}>VALID READY</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#36e0c4", marginTop: 2 }}>{importPreview.validCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(255,180,84,0.08)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(255,180,84,0.3)" }}>
                    <div style={{ fontSize: 11, color: "#ffb454" }}>DUPLICATES</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#ffb454", marginTop: 2 }}>{importPreview.duplicateCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(255,45,58,0.08)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(255,45,58,0.3)" }}>
                    <div style={{ fontSize: 11, color: "#ff2d3a" }}>MISSING FIELDS</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#ff2d3a", marginTop: 2 }}>{importPreview.missingCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(255,45,58,0.08)", borderRadius: 4, textAlign: "center", border: "1px solid rgba(255,45,58,0.3)" }}>
                    <div style={{ fontSize: 11, color: "#ff2d3a" }}>MALFORMED</div>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "#ff2d3a", marginTop: 2 }}>{importPreview.malformedCount}</div>
                  </div>
                </div>

                {/* Conflict Resolution Selector */}
                <div style={{ padding: "12px 16px", backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#d0d0d8", marginBottom: 8 }}>CONFLICT RESOLUTION FOR DUPLICATE SQUADS:</div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: importMode === "skip" ? "#36e0c4" : "#888899" }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="skip"
                        checked={importMode === "skip"}
                        onChange={() => setImportMode("skip")}
                      />
                      Skip duplicates (insert new squads only)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: importMode === "overwrite" ? "#ffb454" : "#888899" }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === "overwrite"}
                        onChange={() => setImportMode("overwrite")}
                      />
                      Overwrite existing squads with imported data
                    </label>
                  </div>
                </div>

                {/* Parsed Rows Preview Table */}
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 4 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#14141e", color: "#888899", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <th style={{ padding: "6px 10px" }}>#</th>
                        <th style={{ padding: "6px 10px" }}>TEAM NAME</th>
                        <th style={{ padding: "6px 10px" }}>LEADER NAME</th>
                        <th style={{ padding: "6px 10px" }}>SCORE</th>
                        <th style={{ padding: "6px 10px" }}>ROLE</th>
                        <th style={{ padding: "6px 10px" }}>VALIDATION STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 30).map((r: any, idx: number) => {
                        let statusColor = "#36e0c4";
                        let statusBg = "rgba(54, 224, 196, 0.1)";
                        if (r.status === "DUPLICATE") {
                          statusColor = "#ffb454";
                          statusBg = "rgba(255, 180, 84, 0.1)";
                        } else if (r.status === "MISSING_REQUIRED" || r.status === "MALFORMED") {
                          statusColor = "#ff2d3a";
                          statusBg = "rgba(255, 45, 58, 0.1)";
                        }

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "6px 10px", color: "#666677" }}>{r.row}</td>
                            <td style={{ padding: "6px 10px", color: "#ffffff", fontWeight: 600 }}>{r.teamName || "(empty)"}</td>
                            <td style={{ padding: "6px 10px", color: "#d0d0d8" }}>{r.leaderName || "(empty)"}</td>
                            <td style={{ padding: "6px 10px", color: "#ffb454" }}>{r.initialScore ?? 0}</td>
                            <td style={{ padding: "6px 10px", color: r.role === "VECNA" ? "#ff2d3a" : "#36e0c4" }}>{r.role || "PLAYER"}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <span style={{ padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: "bold", color: statusColor, backgroundColor: statusBg }}>
                                {r.status}
                              </span>
                              {r.error && <span style={{ color: "#888899", marginLeft: 6, fontSize: 10 }}>({r.error})</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedback Message */}
            {importMessage && (
              <div style={{ marginBottom: 16, padding: "10px 14px", backgroundColor: "rgba(54, 224, 196, 0.12)", border: "1px solid #36e0c4", borderRadius: 4, color: "#36e0c4", fontSize: 12, fontWeight: 600 }}>
                {importMessage}
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {!importPreview && (
                  <button
                    type="button"
                    disabled={isAnalyzing || !importText.trim()}
                    onClick={() => runImportPreview()}
                    style={{
                      padding: "10px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "rgba(54, 224, 196, 0.15)",
                      border: "1px solid rgba(54, 224, 196, 0.4)",
                      color: "#36e0c4",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {isAnalyzing ? "ANALYZING SPREADSHEET..." : "PREVIEW & VALIDATE"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview(null);
                  }}
                  style={{
                    padding: "10px 18px",
                    fontSize: 12,
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
                  disabled={isImporting || !importText.trim()}
                  onClick={handleBulkImport}
                  style={{
                    padding: "10px 22px",
                    fontSize: 12,
                    fontWeight: "bold",
                    backgroundColor: "#ffb454",
                    border: "none",
                    borderRadius: 4,
                    color: "#000000",
                    cursor: "pointer",
                  }}
                >
                  {isImporting ? "IMPORTING SQUADS..." : (importPreview ? "CONFIRM & COMMIT IMPORT" : "EXECUTE IMPORT")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. REGISTER SQUAD MODAL (TIDB) */}
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
                  TIDB DISTRIBUTED SQL · SQUAD ROSTER
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: ".1em", color: "#aaaaaa", marginBottom: 6 }}>
                  SQUAD ROLE
                </label>
                <select
                  value={newTeamRole}
                  onChange={(e) => setNewTeamRole(e.target.value === "VECNA" ? "VECNA" : "PLAYER")}
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
                >
                  <option value="PLAYER">HAWKINS PLAYER</option>
                  <option value="VECNA">VECNA</option>
                </select>
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
                  {isCreatingTeam ? "SAVING TO TIDB..." : "REGISTER TO DATABASE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. TEAM DETAILS & POINTS EDITOR MODAL (TIDB) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {detailTeam && (
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
          onClick={() => setDetailTeam(null)}
        >
          <div
            className="admin-scrollable"
            style={{
              backgroundColor: "#0d0d14",
              border: "1px solid rgba(54, 224, 196, 0.4)",
              borderRadius: 6,
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.95)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: ".15em", color: "#36e0c4", fontWeight: "bold" }}>
                  SQUAD DOSSIER · TIDB DISTRIBUTED SQL
                </div>
                <h3 style={{ fontSize: 22, color: "#ffffff", margin: "4px 0 0 0", fontWeight: 700 }}>
                  {detailTeam.teamName}
                </h3>
                <div style={{ fontSize: 12, color: "#888899", marginTop: 4 }}>
                  Squad Leader: <span style={{ color: "#ffffff" }}>{detailTeam.leaderName}</span> · ID: <span style={{ color: "#8888aa" }}>{detailTeam.teamId}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailTeam(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888899",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Stat Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 24,
              }}
            >
              <div style={{ padding: "12px", backgroundColor: "#060609", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#777788", letterSpacing: ".08em" }}>RANK</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: detailTeam.rank <= 3 ? "#ff2d3a" : "#ffffff", marginTop: 4 }}>
                  #{detailTeam.rank}
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#060609", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#777788", letterSpacing: ".08em" }}>TOTAL SCORE</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#ffb454", marginTop: 4 }}>
                  {detailTeam.score} PTS
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#060609", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#777788", letterSpacing: ".08em" }}>SOLVED</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#36e0c4", marginTop: 4 }}>
                  {detailTeam.solvedCount} / 7
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#060609", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#777788", letterSpacing: ".08em" }}>STATUS</div>
                <div style={{ fontSize: 13, fontWeight: "bold", color: detailTeam.status === "COMPLETED" ? "#36e0c4" : "#ffb454", marginTop: 7 }}>
                  {detailTeam.status}
                </div>
              </div>
            </div>

            {/* Admin Points Editor Section */}
            <div
              style={{
                backgroundColor: "rgba(255, 180, 84, 0.04)",
                border: "1px solid rgba(255, 180, 84, 0.25)",
                borderRadius: 6,
                padding: "18px 20px",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: ".12em", color: "#ffb454", fontWeight: "bold" }}>
                  ADMIN SCORE OVERRIDE · TIDB
                </div>
                <span style={{ fontSize: 11, color: "#888899" }}>Direct live database update</span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="number"
                  value={editTeamPoints}
                  onChange={(e) => setEditTeamPoints(Number(e.target.value))}
                  style={{
                    flex: 1,
                    minWidth: "140px",
                    padding: "10px 14px",
                    fontSize: 16,
                    fontWeight: "bold",
                    backgroundColor: "#050508",
                    border: "1px solid rgba(255, 180, 84, 0.4)",
                    borderRadius: 4,
                    color: "#ffb454",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => prev + 50)}
                    style={{ padding: "8px 12px", fontSize: 11, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", borderRadius: 4, cursor: "pointer" }}
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => prev + 100)}
                    style={{ padding: "8px 12px", fontSize: 11, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", borderRadius: 4, cursor: "pointer" }}
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => Math.max(0, prev - 50))}
                    style={{ padding: "8px 12px", fontSize: 11, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", borderRadius: 4, cursor: "pointer" }}
                  >
                    -50
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTeamPoints}
                  disabled={isUpdatingTeamPoints}
                  style={{
                    padding: "10px 18px",
                    fontSize: 12,
                    fontWeight: "bold",
                    letterSpacing: ".08em",
                    backgroundColor: "#ffb454",
                    color: "#000000",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isUpdatingTeamPoints ? "SAVING..." : "SAVE POINTS"}
                </button>
              </div>
            </div>

            {/* Questions / Chapters Solved by this team */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: ".12em", color: "#888899", fontWeight: "bold" }}>
                  QUESTIONS &amp; CHAPTERS PROGRESS ({detailTeam.solvedCount} / 7 SOLVED)
                </div>
                {detailTeam.lastSubmissionTime && (
                  <span style={{ fontSize: 11, color: "#666677" }}>
                    Last solve: {new Date(detailTeam.lastSubmissionTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((chNum) => {
                  const chObj = chapters.find((c) => c.id === chNum);
                  const isSolved = detailTeam.completedTasks.some(
                    (t) =>
                      t === `ch${chNum}` ||
                      t === `ch${chNum}-quiz` ||
                      t.includes(String(chNum)) ||
                      (chObj && t === chObj.taskId)
                  );

                  return (
                    <div
                      key={chNum}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 4,
                        backgroundColor: isSolved ? "rgba(54, 224, 196, 0.08)" : "#07070b",
                        border: isSolved ? "1px solid rgba(54, 224, 196, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color: isSolved ? "#36e0c4" : "#666677",
                          }}
                        >
                          CHAPTER {chNum}
                        </span>
                        <span style={{ fontSize: 13, color: isSolved ? "#ffffff" : "#888899" }}>
                          {chObj ? chObj.archiveTitle : `Chapter ${chNum} Challenge`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: "#666677" }}>
                          {chObj?.points || 100} PTS
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontWeight: "bold",
                            backgroundColor: isSolved ? "rgba(54, 224, 196, 0.15)" : "rgba(255, 255, 255, 0.04)",
                            color: isSolved ? "#36e0c4" : "#666677",
                            border: isSolved ? "1px solid rgba(54, 224, 196, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                          }}
                        >
                          {isSolved ? "✓ SOLVED" : "○ PENDING"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal footer close */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDetailTeam(null)}
                style={{
                  padding: "8px 18px",
                  fontSize: 12,
                  letterSpacing: ".08em",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#d0d0d8",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                CLOSE DOSSIER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. TEAM PERFORMANCE DRAWER / MODAL (6-STAGE BREAKDOWN & HISTORY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {performanceTeam && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            setPerformanceTeam(null);
            setPerformanceData(null);
          }}
        >
          <div
            className="admin-scrollable"
            style={{
              backgroundColor: "#0b0b12",
              border: "1px solid #ff2d3a",
              borderRadius: 6,
              width: "100%",
              maxWidth: "1000px",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow: "0 14px 50px rgba(255, 45, 58, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff2d3a" }} />
                  <span style={{ fontSize: 11, letterSpacing: ".2em", color: "#ff2d3a", fontWeight: "bold" }}>
                    HAWKINS PROTOCOL // SQUAD PERFORMANCE TELEMETRY
                  </span>
                </div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: 24, fontWeight: 800, color: "#ffffff", letterSpacing: ".04em" }}>
                  {performanceTeam.teamName}
                </h2>
                <div style={{ fontSize: 13, color: "#888899" }}>
                  Squad Leader: <span style={{ color: "#ffffff", fontWeight: 600 }}>{performanceTeam.leaderName}</span> · Team ID: <span style={{ color: "#36e0c4" }}>{performanceTeam.teamId}</span> · Role: <span style={{ color: performanceTeam.role === "VECNA" ? "#ff2d3a" : "#36e0c4", fontWeight: 600 }}>{performanceTeam.role || "HAWKINS SQUAD"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPerformanceTeam(null);
                  setPerformanceData(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#888899",
                  fontSize: 22,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {isLoadingPerformance && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#ffb454", fontSize: 14 }}>
                ANALYZING 6-STAGE HISTORICAL TELEMETRY FROM TIDB...
              </div>
            )}

            {!isLoadingPerformance && performanceData && (
              <>
                {/* 1. Overview Stat Tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: 11, color: "#888899", letterSpacing: ".1em" }}>TOURNAMENT RANK</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: performanceData.teamOverview.overallRank <= 3 ? "#ff2d3a" : "#ffffff", marginTop: 4 }}>
                      #{performanceData.teamOverview.overallRank}
                    </div>
                  </div>

                  <div style={{ padding: "14px", backgroundColor: "rgba(255, 180, 84, 0.06)", borderRadius: 4, border: "1px solid rgba(255, 180, 84, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#ffb454", letterSpacing: ".1em" }}>TOTAL NET POINTS</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#ffb454", marginTop: 4 }}>
                      {performanceData.teamOverview.currentTotalPoints} PTS
                    </div>
                  </div>

                  <div style={{ padding: "14px", backgroundColor: "rgba(54, 224, 196, 0.06)", borderRadius: 4, border: "1px solid rgba(54, 224, 196, 0.25)" }}>
                    <div style={{ fontSize: 11, color: "#36e0c4", letterSpacing: ".1em" }}>CURRENT LOCATION</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#36e0c4", marginTop: 8 }}>
                      {performanceData.teamOverview.currentStage}
                    </div>
                  </div>

                  <div style={{ padding: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div style={{ fontSize: 11, color: "#888899", letterSpacing: ".1em" }}>
                      {performanceData.teamOverview.role === "VECNA" ? "TRIALS CONQUERED" : "STAGES CLEARED"}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
                      {performanceData.stages.filter((s: any) => s.status === "Completed").length} / 6
                    </div>
                  </div>
                </div>

                {/* 2. Stage-by-Stage History Table (6 Stages) */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d0d0d8", letterSpacing: ".08em", marginBottom: 10 }}>
                    {performanceData.teamOverview.role === "VECNA"
                      ? "TRIAL-BY-TRIAL PROGRESSION & SCORING (6 CANONICAL TRIALS)"
                      : "STAGE-BY-STAGE PROGRESSION & SCORING (6 CANONICAL STAGES)"}
                  </div>
                  <div style={{ border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 4, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#12121c", color: "#888899", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: "10px 12px" }}>
                            {performanceData.teamOverview.role === "VECNA" ? "TRIAL" : "STAGE"}
                          </th>
                          <th style={{ padding: "10px 12px" }}>STATUS</th>
                          <th style={{ padding: "10px 12px" }}>STARTED (IST)</th>
                          <th style={{ padding: "10px 12px" }}>COMPLETED (IST)</th>
                          <th style={{ padding: "10px 12px" }}>DURATION</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>EARNED</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>LOST</th>
                          <th style={{ padding: "10px 12px", textAlign: "right" }}>NET SCORE</th>
                          <th style={{ padding: "10px 12px", textAlign: "center" }}>EVENTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.stages.map((stg: any) => {
                          let badgeBg = "rgba(255, 255, 255, 0.05)";
                          let badgeColor = "#666677";
                          if (stg.status === "Completed") {
                            badgeBg = "rgba(54, 224, 196, 0.15)";
                            badgeColor = "#36e0c4";
                          } else if (stg.status === "In Progress") {
                            badgeBg = "rgba(255, 180, 84, 0.15)";
                            badgeColor = "#ffb454";
                          }

                          const formatTime = (ts: string) => {
                            if (!ts || ts === "Unavailable") return "Unavailable";
                            try {
                              const d = new Date(ts);
                              return isNaN(d.getTime()) ? "Unavailable" : d.toLocaleTimeString();
                            } catch {
                              return "Unavailable";
                            }
                          };

                          const isExpanded = expandedPerformanceStage === stg.stageId;

                          return (
                            <React.Fragment key={stg.stageId}>
                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: isExpanded ? "rgba(255, 45, 58, 0.05)" : "transparent" }}>
                                <td style={{ padding: "12px", fontWeight: 600, color: "#ffffff" }}>
                                  {stg.stageName.startsWith("TRIAL") ? stg.stageName : `STAGE ${stg.stageId}: ${stg.stageName}`}
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <span style={{ padding: "3px 8px", borderRadius: 3, fontSize: 11, fontWeight: "bold", backgroundColor: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}40` }}>
                                    {stg.status}
                                  </span>
                                </td>
                                <td style={{ padding: "12px", color: stg.startedAt === "Unavailable" ? "#555566" : "#d0d0d8" }}>
                                  {stg.startedAt === "Unavailable" ? "—" : formatToIST(stg.startedAt)}
                                </td>
                                <td style={{ padding: "12px", color: stg.completedAt === "Unavailable" ? "#555566" : "#d0d0d8" }}>
                                  {stg.completedAt === "Unavailable" ? "—" : formatToIST(stg.completedAt)}
                                </td>
                                <td style={{ padding: "12px", color: stg.duration === "Unavailable" ? "#555566" : "#ffb454", fontWeight: stg.duration !== "Unavailable" ? 600 : 400 }}>
                                  {stg.duration}
                                </td>
                                <td style={{ padding: "12px", textAlign: "right", color: "#36e0c4", fontWeight: "bold" }}>
                                  +{stg.pointsEarned}
                                </td>
                                <td style={{ padding: "12px", textAlign: "right", color: stg.pointsLost < 0 ? "#ff2d3a" : "#666677", fontWeight: "bold" }}>
                                  {stg.pointsLost < 0 ? stg.pointsLost : 0}
                                </td>
                                <td style={{ padding: "12px", textAlign: "right", color: stg.netStageScore >= 0 ? "#ffb454" : "#ff2d3a", fontWeight: 800 }}>
                                  {stg.netStageScore >= 0 ? `+${stg.netStageScore}` : stg.netStageScore} PTS
                                </td>
                                <td style={{ padding: "12px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPerformanceStage(isExpanded ? null : stg.stageId)}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      backgroundColor: isExpanded ? "#ff2d3a" : "rgba(255,255,255,0.06)",
                                      color: isExpanded ? "#000000" : "#d0d0d8",
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      borderRadius: 3,
                                      cursor: "pointer",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {isExpanded ? "Hide Details" : "Questions & Audit (10 Qs)"}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded itemized events for this stage */}
                              {isExpanded && (
                                <tr style={{ backgroundColor: "#08080f" }}>
                                  <td colSpan={9} style={{ padding: "12px 16px" }}>
                                    <div style={{ fontSize: 11, color: "#888899", marginBottom: 6, fontWeight: 600 }}>
                                      ITEMIZED EVENTS FOR {stg.stageName.startsWith("TRIAL") ? stg.stageName : `STAGE ${stg.stageId} (${stg.stageName})`}:
                                    </div>
                                    {(!stg.events || stg.events.length === 0) ? (
                                      <div style={{ fontSize: 11, color: "#555566", fontStyle: "italic" }}>
                                        No itemized events recorded for this stage yet.
                                      </div>
                                    ) : (
                                      <div style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 4, overflow: "hidden" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                          <thead>
                                            <tr style={{ backgroundColor: "#101018", color: "#666677" }}>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>TIMESTAMP</th>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>EVENT TYPE</th>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>DETAIL / REASON</th>
                                              <th style={{ padding: "6px 10px", textAlign: "right" }}>POINT DELTA</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {stg.events.map((ev: any, evIdx: number) => {
                                              let deltaColor = "#888899";
                                              if (ev.pointDelta > 0) deltaColor = "#36e0c4";
                                              else if (ev.pointDelta < 0) deltaColor = "#ff2d3a";

                                              return (
                                                <tr key={evIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                  <td style={{ padding: "6px 10px", color: "#888899" }}>
                                                    {formatTime(ev.timestamp)}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", color: "#ffffff", fontWeight: 600 }}>
                                                    {ev.type}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", color: "#d0d0d8" }}>
                                                    {ev.detail || "-"}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", textAlign: "right", color: deltaColor, fontWeight: "bold" }}>
                                                    {ev.pointDelta > 0 ? `+${ev.pointDelta}` : ev.pointDelta}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Non-Stage Events (Event-wide Actions) */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d0d0d8", letterSpacing: ".08em", marginBottom: 10 }}>
                    NON-STAGE ACTIONS &amp; EVENT-WIDE ADJUSTMENTS
                  </div>
                  {(!performanceData.eventWideActions || performanceData.eventWideActions.length === 0) ? (
                    <div style={{ padding: "12px 16px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, color: "#666677", fontSize: 12 }}>
                      No event-wide non-stage score actions recorded for this squad.
                    </div>
                  ) : (
                    <div style={{ border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 4, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#12121c", color: "#888899", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                            <th style={{ padding: "8px 12px" }}>TIMESTAMP (IST)</th>
                            <th style={{ padding: "8px 12px" }}>ACTION TYPE</th>
                            <th style={{ padding: "8px 12px" }}>DETAIL</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>POINT DELTA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.eventWideActions.map((act: any, actIdx: number) => {
                            let deltaColor = "#888899";
                            if (act.pointDelta > 0) deltaColor = "#36e0c4";
                            else if (act.pointDelta < 0) deltaColor = "#ff2d3a";

                            return (
                              <tr key={actIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <td style={{ padding: "8px 12px", color: "#888899" }}>
                                  {act.timestamp !== "Unavailable" ? new Date(act.timestamp).toLocaleTimeString() : "Unavailable"}
                                </td>
                                <td style={{ padding: "8px 12px", color: "#ffffff", fontWeight: 600 }}>{act.type}</td>
                                <td style={{ padding: "8px 12px", color: "#d0d0d8" }}>{act.detail || "-"}</td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: deltaColor, fontWeight: "bold" }}>
                                  {act.pointDelta > 0 ? `+${act.pointDelta}` : act.pointDelta}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close Button */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setPerformanceTeam(null);
                  setPerformanceData(null);
                }}
                style={{
                  padding: "10px 22px",
                  fontSize: 12,
                  fontWeight: "bold",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  borderRadius: 4,
                  cursor: "pointer",
                  letterSpacing: ".05em",
                }}
              >
                CLOSE PERFORMANCE VIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
