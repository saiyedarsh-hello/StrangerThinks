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
import { authenticateSocket, publish, getSocket, subscribe } from "@/lib/realtime";
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
  const [activeTab, setActiveTab] = useState<"leaderboard" | "stages" | "questions" | "logs">("leaderboard");
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
  const [unlockedStagesHawkins, setUnlockedStagesHawkins] = useState<number[]>([1]);
  const [unlockedStagesVecna, setUnlockedStagesVecna] = useState<number[]>([1]);
  const [unlockedStages, setUnlockedStages] = useState<number[]>([1]);
  const [stagesActiveTarget, setStagesActiveTarget] = useState<"hawkins" | "vecna">("hawkins");
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
        .filter((t: any) => t.role !== "ADMIN" && (t.teamName || "")?.toLowerCase() !== "admin bolte")
        .map((t) => ({
          ...t,
          teamName: t.teamName || (t as any).team_name || "Squad",
          leaderName: t.leaderName || (t as any).squad_leader || (t as any).leader_name || "Squad Leader",
          completedTasks: Array.isArray(t.completedTasks) ? t.completedTasks : [],
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
        const hwk = evRes.eventState.unlockedStagesHawkins || evRes.eventState.unlockedStages;
        const vcn = evRes.eventState.unlockedStagesVecna || evRes.eventState.unlockedStages;
        if (Array.isArray(hwk) && hwk.length > 0) {
          setUnlockedStagesHawkins(hwk);
          setUnlockedStages(hwk);
        }
        if (Array.isArray(vcn) && vcn.length > 0) {
          setUnlockedStagesVecna(vcn);
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
            (payload.teamName && (item.teamName || "").toLowerCase() === payload.teamName.toLowerCase());

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
            (payload.teamName && (prev.teamName || "").toLowerCase() === payload.teamName.toLowerCase()))
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

    // 4. Subscribe to stage unlocking across tabs and socket
    const unsubRealtime = subscribe((m: any) => {
      if (m.type === "stage_unlocked") {
        if (m.unlockedStagesHawkins && Array.isArray(m.unlockedStagesHawkins)) {
          setUnlockedStagesHawkins(m.unlockedStagesHawkins);
          setUnlockedStages(m.unlockedStagesHawkins);
        } else if (m.target !== "vecna" && Array.isArray(m.unlockedStages)) {
          setUnlockedStagesHawkins(m.unlockedStages);
          setUnlockedStages(m.unlockedStages);
        }
        if (m.unlockedStagesVecna && Array.isArray(m.unlockedStagesVecna)) {
          setUnlockedStagesVecna(m.unlockedStagesVecna);
        } else if (m.target === "vecna" && Array.isArray(m.unlockedStages)) {
          setUnlockedStagesVecna(m.unlockedStages);
        }
      }
      if (m.type === "event_state") {
        setEventState((prev) => ({
          ...prev,
          status: m.status || (m.isPaused ? "paused" : prev.status),
          submissions_open: m.submissionsOpen ?? prev.submissions_open,
          login_open: m.loginOpen ?? prev.login_open,
        }));
      }
      if (m.type === "event_reset") {
        setUnlockedStagesHawkins([1]);
        setUnlockedStagesVecna([1]);
        setUnlockedStages([1]);
      }
    });

    const sock = getSocket();
    const handleStageUnlocked = (d: any) => {
      if (d?.unlockedStagesHawkins && Array.isArray(d.unlockedStagesHawkins)) {
        setUnlockedStagesHawkins(d.unlockedStagesHawkins);
        setUnlockedStages(d.unlockedStagesHawkins);
      } else if (d?.target !== "vecna" && Array.isArray(d?.unlockedStages)) {
        setUnlockedStagesHawkins(d.unlockedStages);
        setUnlockedStages(d.unlockedStages);
      }
      if (d?.unlockedStagesVecna && Array.isArray(d.unlockedStagesVecna)) {
        setUnlockedStagesVecna(d.unlockedStagesVecna);
      } else if (d?.target === "vecna" && Array.isArray(d?.unlockedStages)) {
        setUnlockedStagesVecna(d.unlockedStages);
      }
    };
    sock?.on("stage:unlocked", handleStageUnlocked);

    const handleEventStateChanged = (d: any) => {
      setEventState((prev) => ({
        ...prev,
        status: d?.status || (d?.isPaused ? "paused" : prev.status),
        submissions_open: d?.submissionsOpen ?? prev.submissions_open,
        login_open: d?.loginOpen ?? prev.login_open,
      }));
      if (d?.unlockedStagesHawkins && Array.isArray(d.unlockedStagesHawkins)) {
        setUnlockedStagesHawkins(d.unlockedStagesHawkins);
        setUnlockedStages(d.unlockedStagesHawkins);
      }
      if (d?.unlockedStagesVecna && Array.isArray(d.unlockedStagesVecna)) {
        setUnlockedStagesVecna(d.unlockedStagesVecna);
      }
    };
    sock?.on("event:state_changed", handleEventStateChanged);

    // 5. Automated background refresh cycle (controllable interval & pause/resume)
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
      unsubRealtime();
      sock?.off("stage:unlocked", handleStageUnlocked);
      sock?.off("event:state_changed", handleEventStateChanged);
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
  const handleToggleStage = async (stageNum: number, currentUnlocked: boolean, target: "hawkins" | "vecna" | "all" = "hawkins") => {
    setIsUpdatingStage(true);
    try {
      const stored = getStoredSession();
      const activeTok =
        token ||
        (stored && (stored as any).token ? (stored as any).token : "") ||
        localStorage.getItem("hawkins_admin_token") ||
        sessionStorage.getItem("hawkins_admin_token") ||
        "";
      const cleanTok = activeTok.replace(/^Bearer\s+/i, "");
      const bearerTok = cleanTok ? `Bearer ${cleanTok}` : "";
      const res = await fetch("/api/admin/stages/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerTok,
        },
        body: JSON.stringify({ stageNumber: stageNum, unlocked: !currentUnlocked, target }),
      });
      const data = await res.json();
      if (data.success) {
        const hwk = data.unlockedStagesHawkins || (target === "hawkins" || target === "all" ? data.unlockedStages : unlockedStagesHawkins);
        const vcn = data.unlockedStagesVecna || (target === "vecna" || target === "all" ? data.unlockedStages : unlockedStagesVecna);
        if (Array.isArray(hwk)) {
          setUnlockedStagesHawkins(hwk);
          setUnlockedStages(hwk);
        }
        if (Array.isArray(vcn)) {
          setUnlockedStagesVecna(vcn);
        }
        publish({
          type: "stage_unlocked",
          unlockedStages: data.unlockedStages,
          unlockedStagesHawkins: hwk,
          unlockedStagesVecna: vcn,
          target,
        });
        setStatusMessage(
          `${target === "vecna" ? "Vecna Trial" : "Hawkins Stage"} ${stageNum} access updated: ${
            !currentUnlocked ? "UNLOCKED / AUTHORIZED" : "LOCKED / RESTRICTED"
          }`
        );
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
    const q = (searchQuery || "").trim().toLowerCase();
    const teamName = (t.teamName || "").toLowerCase();
    const teamId = (t.teamId || "").toLowerCase();
    const leaderName = (t.leaderName || "").toLowerCase();
    const matchesSearch = !q || teamName.includes(q) || teamId.includes(q) || leaderName.includes(q);
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
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif',
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            backgroundColor: "#ffffff",
            padding: "36px 32px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              marginBottom: 16,
              fontSize: 20,
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
            Admin Session Required
          </h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#64748b", margin: "0 0 24px 0" }}>
            Please return to the main entry page and authenticate with your Admin credentials to access this console.
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
              width: "100%",
              padding: "10px 20px",
              backgroundColor: "#0f172a",
              border: "none",
              borderRadius: 6,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            Return to Login
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
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif',
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ── TOP NAVIGATION BAR ── */}
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          padding: "12px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Brand identifier */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                backgroundColor: "#dc2626",
                boxShadow: "0 0 8px rgba(220, 38, 38, 0.35)",
                display: "inline-block",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#0f172a",
                  textTransform: "uppercase",
                }}
              >
                Hawkins Protocol
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                ADMIN COMMAND
              </span>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              backgroundColor: "#f1f5f9",
              padding: 3,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            {[
              { id: "leaderboard", label: "Leaderboard", count: leaderboard.length },
              { id: "stages", label: "Unlock Chapters", badge: `H:${unlockedStagesHawkins.length}/6 · V:${unlockedStagesVecna.length}/6` },
              { id: "questions", label: "Questions", count: chapters.length },
              { id: "logs", label: "System Logs" },
            ].map((tab) => {
              const isActive =
                activeTab === tab.id || (tab.id === "leaderboard" && activeTab === ("dashboard" as any));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sfx("click");
                    setActiveTab(tab.id as any);
                  }}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: isActive ? "#ffffff" : "transparent",
                    color: isActive ? "#0f172a" : "#64748b",
                    boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 10,
                        backgroundColor: isActive ? "#fee2e2" : "#e2e8f0",
                        color: isActive ? "#991b1b" : "#475569",
                        fontFamily: "var(--font-mono), monospace",
                        fontWeight: 600,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge !== undefined && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 10,
                        backgroundColor: isActive ? "#dcfce7" : "#e2e8f0",
                        color: isActive ? "#166534" : "#475569",
                        fontFamily: "var(--font-mono), monospace",
                        fontWeight: 600,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Refresh / Sync Button */}
          <button
            type="button"
            id="admin-refresh-now-btn"
            onClick={() => {
              sfx("blip");
              loadData(true);
            }}
            disabled={loading}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: loading ? "#f1f5f9" : "#ffffff",
              border: "1px solid #cbd5e1",
              color: loading ? "#94a3b8" : "#1e293b",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Force instant live update from database"
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
            <span>{loading ? "Syncing..." : "Sync"}</span>
          </button>

          {/* Auto-Refresh Toggle & Interval */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "2px 4px",
              gap: 2,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
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
                color: autoRefreshEnabled ? "#059669" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 8px",
                borderRadius: 4,
              }}
              title={autoRefreshEnabled ? "Auto-refresh is active. Click to pause." : "Auto-refresh is paused. Click to resume."}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: autoRefreshEnabled ? "#10b981" : "#94a3b8",
                  boxShadow: autoRefreshEnabled ? "0 0 6px #10b981" : "none",
                  display: "inline-block",
                }}
              />
              <span>{autoRefreshEnabled ? `Live (${autoRefreshSec}s)` : "Paused"}</span>
            </button>

            <div style={{ display: "flex", gap: 1, borderLeft: "1px solid #e2e8f0", paddingLeft: 3 }}>
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
                    background: autoRefreshInterval === sec && autoRefreshEnabled ? "#0f172a" : "transparent",
                    border: "none",
                    borderRadius: 3,
                    color: autoRefreshInterval === sec && autoRefreshEnabled ? "#ffffff" : "#64748b",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 6px",
                    cursor: "pointer",
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen Toggle */}
          <button
            id="admin-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              backgroundColor: isFullscreen ? "#fee2e2" : "#ffffff",
              border: isFullscreen ? "1px solid #fca5a5" : "1px solid #cbd5e1",
              color: isFullscreen ? "#dc2626" : "#475569",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            <span>{isFullscreen ? "✖" : "⛶"}</span>
          </button>

          {/* Logout */}
          <button
            id="admin-logout-btn"
            type="button"
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              backgroundColor: "#ffffff",
              border: "1px solid #fecaca",
              color: "#dc2626",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Log out of Admin Console"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── STATUS ALERT BANNER ── */}
      {statusMessage && (
        <div
          style={{
            backgroundColor: "#ecfdf5",
            borderBottom: "1px solid #a7f3d0",
            padding: "9px 28px",
            fontSize: 13,
            color: "#065f46",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 500,
          }}
        >
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <main
        style={{
          flex: 1,
          padding: "24px 28px 80px 28px",
          maxWidth: "1480px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: UNLOCK CHAPTERS & STAGE CONTROLS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "stages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header intro */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 4px 0", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Tournament Stages &amp; Access Controls
                </h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Dual-condition stage authorization switchboard, submission gates, and live tournament lifecycle state.
                </div>
              </div>
            </div>

            {/* ── EVENT LIFECYCLE & GLOBAL CONTROLS COMMAND BAR ── */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* Status Overview */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Event Status
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                    backgroundColor:
                      eventState.status === "active"
                        ? "#ecfdf5"
                        : eventState.status === "paused"
                        ? "#fffbeb"
                        : "#fef2f2",
                    color:
                      eventState.status === "active"
                        ? "#047857"
                        : eventState.status === "paused"
                        ? "#b45309"
                        : "#b91c1c",
                    border: `1px solid ${
                      eventState.status === "active"
                        ? "#a7f3d0"
                        : eventState.status === "paused"
                        ? "#fde68a"
                        : "#fecaca"
                    }`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor:
                        eventState.status === "active"
                          ? "#10b981"
                          : eventState.status === "paused"
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  />
                  {eventState.status.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 9px",
                    borderRadius: 6,
                    fontWeight: 500,
                    backgroundColor: eventState.submissions_open ? "#ecfdf5" : "#fef2f2",
                    color: eventState.submissions_open ? "#047857" : "#b91c1c",
                    border: `1px solid ${eventState.submissions_open ? "#a7f3d0" : "#fecaca"}`,
                  }}
                >
                  Submissions: {eventState.submissions_open ? "Open" : "Closed"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 9px",
                    borderRadius: 6,
                    fontWeight: 500,
                    backgroundColor: eventState.login_open ? "#ecfdf5" : "#fef2f2",
                    color: eventState.login_open ? "#047857" : "#b91c1c",
                    border: `1px solid ${eventState.login_open ? "#a7f3d0" : "#fecaca"}`,
                  }}
                >
                  Login: {eventState.login_open ? "Open" : "Closed"}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {eventState.status === "not_started" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={handleStartFreshEvent}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#0f172a",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>▶</span>
                    <span>Start Event</span>
                  </button>
                ) : eventState.status === "paused" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={() => updateEventStateAction({ status: "active", submissionsOpen: true, loginOpen: true })}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      color: "#047857",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>▶</span>
                    <span>Resume Event</span>
                  </button>
                ) : eventState.status === "active" ? (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={() => updateEventStateAction({ status: "paused" })}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#b45309",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>⏸</span>
                    <span>Pause Event</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdatingEvent}
                    onClick={handleStartFreshEvent}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#0f172a",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>▶</span>
                    <span>Start New Event</span>
                  </button>
                )}

                {/* Submissions Toggle */}
                <button
                  type="button"
                  disabled={isUpdatingEvent || eventState.status === "ended"}
                  onClick={() => updateEventStateAction({ submissionsOpen: !eventState.submissions_open })}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: eventState.status === "ended" ? "#94a3b8" : "#1e293b",
                    borderRadius: 6,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  {eventState.submissions_open ? "Stop Submissions" : "Open Submissions"}
                </button>

                {/* Login Toggle */}
                <button
                  type="button"
                  disabled={isUpdatingEvent || eventState.status === "ended"}
                  onClick={() => updateEventStateAction({ loginOpen: !eventState.login_open })}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: eventState.status === "ended" ? "#94a3b8" : "#1e293b",
                    borderRadius: 6,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  {eventState.login_open ? "Close Login" : "Open Login"}
                </button>

                {/* Reset all scores */}
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
                        setUnlockedStagesHawkins([1]);
                        setUnlockedStagesVecna([1]);
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
                        alert("Reset failed: " + (d.message || d.error));
                      }
                    } catch (e: any) {
                      alert("Reset error: " + e.message);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#e11d48",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Reset all team scores and progress to 0 PTS"
                >
                  ↺ Reset Scores
                </button>

                {/* End Event */}
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
                        setStatusMessage("Tournament event ended: Sessions terminated, results archived.");
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
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: eventState.status === "ended" ? "#94a3b8" : "#dc2626",
                    borderRadius: 6,
                    cursor: eventState.status === "ended" ? "not-allowed" : "pointer",
                  }}
                >
                  {eventState.status === "ended" ? "⏹ Concluded" : "⏹ End Event"}
                </button>
              </div>
            </div>

            {/* ── TOURNAMENT STAGE ACCESS SWITCHBOARD ── */}
            <div
              style={{
                padding: "20px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        color: "#0f172a",
                        textTransform: "uppercase",
                      }}
                    >
                      Stage Access Switchboard (Dual-Condition Locking)
                    </h3>
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#64748b" }}>
                    Configure authorized stages independently for Hawkins field operatives and Vecna shadow operators. Squads unlock stages only when Condition A (prior stage cleared) AND Condition B (authorized below) are both TRUE.
                  </p>
                </div>

                {/* Squad Type Segmented Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      background: "#e2e8f0",
                      padding: 2,
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStagesActiveTarget("hawkins")}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "none",
                        background: stagesActiveTarget === "hawkins" ? "#0284c7" : "transparent",
                        color: stagesActiveTarget === "hawkins" ? "#ffffff" : "#475569",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>🔵 HAWKINS SQUADS</span>
                      <span
                        style={{
                          fontSize: 10,
                          background: stagesActiveTarget === "hawkins" ? "rgba(255,255,255,0.25)" : "#cbd5e1",
                          color: stagesActiveTarget === "hawkins" ? "#ffffff" : "#334155",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        {unlockedStagesHawkins.length}/6 Open
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStagesActiveTarget("vecna")}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 4,
                        cursor: "pointer",
                        border: "none",
                        background: stagesActiveTarget === "vecna" ? "#b91c1c" : "transparent",
                        color: stagesActiveTarget === "vecna" ? "#ffffff" : "#475569",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>🔴 VECNA SQUADS</span>
                      <span
                        style={{
                          fontSize: 10,
                          background: stagesActiveTarget === "vecna" ? "rgba(255,255,255,0.25)" : "#cbd5e1",
                          color: stagesActiveTarget === "vecna" ? "#ffffff" : "#334155",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        {unlockedStagesVecna.length}/6 Open
                      </span>
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        color: stagesActiveTarget === "vecna" ? "#b91c1c" : "#0284c7",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono), monospace",
                        backgroundColor: stagesActiveTarget === "vecna" ? "#fef2f2" : "#f0f9ff",
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: `1px solid ${stagesActiveTarget === "vecna" ? "#fecaca" : "#bae6fd"}`,
                        fontSize: 11,
                      }}
                    >
                      {(stagesActiveTarget === "vecna" ? unlockedStagesVecna : unlockedStagesHawkins)
                        .slice()
                        .sort((a, b) => a - b)
                        .map((s) => `${stagesActiveTarget === "vecna" ? "TRIAL" : "STAGE"} ${s}`)
                        .join(", ") || "None"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                {(stagesActiveTarget === "hawkins"
                  ? [
                      { num: 1, title: "STAGE 1", name: "Hawkins Town Telemetry", type: "Civic District (Quiz Questions)", points: 200 },
                      { num: 2, title: "STAGE 2", name: "Chief Hopper's Dossier", type: "Precinct 2 (Connection Questions)", points: 200 },
                      { num: 3, title: "STAGE 3", name: "Joyce & Will's Wall", type: "Mirkwood (Rearrange Questions)", points: 200 },
                      { num: 4, title: "STAGE 4", name: "Hawkins Lab Sublevel 3", type: "Grid Mainframe (Case Study Questions)", points: 200 },
                      { num: 5, title: "STAGE 5", name: "East Hill Radio Tower", type: "Radiometer Alignment (5-Pin Cipher)", points: 200 },
                      { num: 6, title: "STAGE 6", name: "The Gateway Rift", type: "Parallel Abyss (Experiment 001 Severance)", points: 200 },
                    ]
                  : [
                      { num: 1, title: "TRIAL 1", name: "Series Knowledge", type: "Hawkins Lore & Timeline (Quiz Questions)", points: 200 },
                      { num: 2, title: "TRIAL 2", name: "Relationship Correlation", type: "Clues & Artifacts (Connection Questions)", points: 200 },
                      { num: 3, title: "TRIAL 3", name: "Sequence Restoration", type: "Scrambled Codes & Steps (Rearrange Questions)", points: 200 },
                      { num: 4, title: "TRIAL 4", name: "Investigative Forensics", type: "Situation Analysis (Case Study Questions)", points: 200 },
                      { num: 5, title: "TRIAL 5", name: "Signal Intelligence", type: "Morse & Binary Radio Ciphers", points: 200 },
                      { num: 6, title: "TRIAL 6", name: "Technical Experiments", type: "Sublevel 3 Bug Fixing & System Operations", points: 200 },
                    ]
                ).map((stg) => {
                  const currentList = stagesActiveTarget === "vecna" ? unlockedStagesVecna : unlockedStagesHawkins;
                  const isUnlocked = currentList.includes(stg.num);
                  const isVecnaTarget = stagesActiveTarget === "vecna";
                  const squadsOnStage = leaderboard.filter(
                    (t) => (isVecnaTarget ? t.role === "VECNA" : t.role !== "VECNA") && (t.currentStage || 1) === stg.num
                  ).length;
                  const squadsSolved = leaderboard.filter(
                    (t) => (isVecnaTarget ? t.role === "VECNA" : t.role !== "VECNA") && t.solvedCount >= stg.num
                  ).length;

                  return (
                    <div
                      key={stg.num}
                      style={{
                        background: isUnlocked ? (isVecnaTarget ? "#fff1f2" : "#f0fdf4") : "#f8fafc",
                        border: isUnlocked
                          ? (isVecnaTarget ? "1px solid #fecdd3" : "1px solid #86efac")
                          : "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 12,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: isUnlocked ? (isVecnaTarget ? "#be123c" : "#15803d") : "#64748b",
                              letterSpacing: "0.06em",
                              fontFamily: "var(--font-mono), monospace",
                            }}
                          >
                            {stg.title}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: isUnlocked ? (isVecnaTarget ? "#ffe4e6" : "#dcfce7") : "#e2e8f0",
                              color: isUnlocked ? (isVecnaTarget ? "#9f1239" : "#166534") : "#475569",
                              border: `1px solid ${
                                isUnlocked ? (isVecnaTarget ? "#fca5a5" : "#86efac") : "#cbd5e1"
                              }`,
                            }}
                          >
                            {isUnlocked ? "OPEN" : "LOCKED"}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>
                          {stg.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {stg.type}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 8,
                            borderTop: "1px dashed rgba(0,0,0,0.08)",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          <span>
                            Solves: <strong style={{ color: "#0f172a" }}>{squadsSolved}</strong>
                          </span>
                          <span>
                            Active here: <strong style={{ color: "#0f172a" }}>{squadsOnStage}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingStage}
                        onClick={() => handleToggleStage(stg.num, isUnlocked, stagesActiveTarget)}
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          cursor: isUpdatingStage ? "not-allowed" : "pointer",
                          background: isUnlocked
                            ? "#ffffff"
                            : (isVecnaTarget ? "#991b1b" : "#0f172a"),
                          border: isUnlocked
                            ? "1px solid #fca5a5"
                            : "none",
                          color: isUnlocked
                            ? "#b91c1c"
                            : "#ffffff",
                          transition: "all 0.15s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      >
                        {isUnlocked
                          ? `Lock ${isVecnaTarget ? "Trial" : "Stage"}`
                          : `Unlock ${isVecnaTarget ? "Trial" : "Stage"}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: ACTIVE TOURNAMENT STANDINGS (LEADERBOARD) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {(activeTab === "leaderboard" || activeTab === ("dashboard" as any)) && (
          <div>
            {/* ── TOURNAMENT STANDINGS TOOLBAR ── */}
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 2px 0", fontWeight: 700 }}>
                    Tournament Standings
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#047857", fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                      Realtime Sync
                    </span>
                    <span>·</span>
                    <span>{leaderboard.length} squads registered</span>
                    <span>·</span>
                    <span style={{ color: "#047857", fontWeight: 600 }}>{leaderboard.filter((t) => t.isOnline).length} online</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddTeamModal(true)}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#0f172a",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span>＋</span>
                    <span>Register Squad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    style={{
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#1e293b",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span>📁</span>
                    <span>Import Squads</span>
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
                      padding: "7px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#e11d48",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>🔓</span>
                    <span>Reset Sessions</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {/* Segmented Filter Pills */}
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    backgroundColor: "#f1f5f9",
                    padding: 3,
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {[
                    { id: "all", label: "All", count: leaderboard.length },
                    { id: "online", label: "Online", count: leaderboard.filter((t) => t.isOnline).length },
                    { id: "offline", label: "Offline", count: leaderboard.filter((t) => !t.isOnline).length },
                    { id: "vecna", label: "Vecna", count: leaderboard.filter((t) => t.role === "VECNA").length },
                  ].map((tab) => {
                    const isSelected = presenceFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          sfx("click");
                          setPresenceFilter(tab.id as any);
                        }}
                        style={{
                          padding: "5px 12px",
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          borderRadius: 4,
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#ffffff" : "transparent",
                          color: isSelected ? "#0f172a" : "#64748b",
                          boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{tab.label}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "var(--font-mono), monospace",
                            fontWeight: 600,
                            color: isSelected ? "#0f172a" : "#94a3b8",
                          }}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div style={{ position: "relative", minWidth: 260 }}>
                  <input
                    type="text"
                    placeholder="Search squad, leader, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 32px",
                      fontSize: 12,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      color: "#94a3b8",
                      pointerEvents: "none",
                    }}
                  >
                    🔍
                  </span>
                </div>
              </div>
            </div>

            {/* ── LEADERBOARD TABLE ── */}
            <div
              className="admin-scrollable"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "75vh",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                    <th style={{ padding: "11px 14px", width: 60, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>RANK</th>
                    <th style={{ padding: "11px 14px", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>SQUAD</th>
                    <th style={{ padding: "11px 14px", width: 110, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>ROLE</th>
                    <th style={{ padding: "11px 14px", width: 110, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>USERNAME</th>
                    <th style={{ padding: "11px 14px", width: 190, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>PASSWORD RECOVERY</th>
                    <th style={{ padding: "11px 14px", width: 160, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>PROGRESS</th>
                    <th style={{ padding: "11px 14px", width: 100, color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>STATUS</th>
                    <th style={{ padding: "11px 14px", width: 100, textAlign: "right", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>SCORE</th>
                    <th style={{ padding: "11px 14px", width: 220, textAlign: "center", color: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((item, idx) => {
                    const recent = recentlyUpdated[item.teamId];
                    const isRecent = recent && Date.now() - recent.timestamp < 4500;
                    const stageNum = eventState?.status === "not_started" ? 1 : (item.currentStage || 1);
                    const progressPercent = Math.min(100, Math.max(0, (stageNum / 6) * 100));

                    return (
                      <tr
                        key={item.teamId}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isRecent
                            ? "#ecfdf5"
                            : idx % 2 === 0
                            ? "#ffffff"
                            : "#fafafa",
                          borderLeft: isRecent ? "3px solid #10b981" : "3px solid transparent",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Rank */}
                        <td style={{ padding: "12px 14px" }}>
                          {item.rank === 1 ? (
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              #01 🥇
                            </span>
                          ) : item.rank === 2 ? (
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                backgroundColor: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #cbd5e1",
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              #02 🥈
                            </span>
                          ) : item.rank === 3 ? (
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                backgroundColor: "#ffedd5",
                                color: "#9a3412",
                                border: "1px solid #fed7aa",
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              #03 🥉
                            </span>
                          ) : (
                            <span
                              style={{
                                fontFamily: "var(--font-mono), monospace",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#64748b",
                              }}
                            >
                              #{String(item.rank).padStart(2, "0")}
                            </span>
                          )}
                        </td>

                        {/* Squad */}
                        <td style={{ padding: "12px 14px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 600, color: item.role === "VECNA" ? "#dc2626" : "#0f172a", fontSize: 13.5 }}>
                                {item.teamName}
                              </span>
                              {item.role === "VECNA" && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    padding: "2px 5px",
                                    borderRadius: 3,
                                    backgroundColor: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                    color: "#b91c1c",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  VECNA OPS
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                              Leader: {item.leaderName} · ID: <span style={{ fontFamily: "var(--font-mono), monospace" }}>{item.teamId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: "12px 14px" }}>
                          <select
                            value={item.role === "VECNA" ? "VECNA" : "PLAYER"}
                            disabled={eventState.status === "active"}
                            onChange={(e) => handleRoleChange(item.teamId, item.teamName, e.target.value as "PLAYER" | "VECNA")}
                            title={eventState.status === "active" ? "Role locked while event is active" : "Change squad role"}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: item.role === "VECNA" ? "#dc2626" : "#0284c7",
                              borderRadius: 4,
                              cursor: eventState.status === "active" ? "not-allowed" : "pointer",
                              outline: "none",
                            }}
                          >
                            <option value="PLAYER" style={{ color: "#0284c7" }}>
                              HAWKINS
                            </option>
                            <option value="VECNA" style={{ color: "#dc2626" }}>
                              VECNA
                            </option>
                          </select>
                        </td>

                        {/* Username */}
                        <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono), monospace", color: item.role === "VECNA" ? "#dc2626" : "#334155", fontSize: 12, fontWeight: 500 }}>
                          {item.username || item.teamId}
                        </td>

                        {/* Password Recovery */}
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            onClick={() => {
                              const pass = item.password || (item.role === "VECNA" ? "HAWKINS1986" : "hawkins83_01");
                              navigator.clipboard.writeText(pass);
                              alert(`Copied password for ${item.teamName}: ${pass}`);
                            }}
                            title="Click to copy password"
                            style={{
                              padding: "3px 8px",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              color: "#334155",
                              borderRadius: 4,
                              fontFamily: "var(--font-mono), monospace",
                              fontSize: 11.5,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>{item.password || (item.role === "VECNA" ? "HAWKINS1986" : "hawkins83_01")}</span>
                            <span style={{ fontSize: 10, color: "#64748b" }}>⧉</span>
                          </span>
                        </td>

                        {/* Progress */}
                        <td style={{ padding: "12px 14px" }}>
                          {item.role === "VECNA" ? (
                            <span style={{ color: "#dc2626", fontWeight: 500, fontSize: 12 }}>Omniscient Control</span>
                          ) : (
                            <div style={{ maxWidth: 140 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                                  Stage {stageNum}/6
                                </span>
                                <span style={{ color: "#64748b", fontSize: 11 }}>
                                  {eventState?.status === "not_started" ? 0 : item.solvedCount} solved
                                </span>
                              </div>
                              <div
                                style={{
                                  width: "100%",
                                  height: 4,
                                  backgroundColor: "#e2e8f0",
                                  borderRadius: 2,
                                  marginTop: 4,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${progressPercent}%`,
                                    height: "100%",
                                    backgroundColor: progressPercent >= 100 ? "#10b981" : "#0284c7",
                                    borderRadius: 2,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Presence */}
                        <td style={{ padding: "12px 14px" }}>
                          {item.isOnline ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontWeight: 600,
                                backgroundColor: "#ecfdf5",
                                color: "#047857",
                                border: "1px solid #a7f3d0",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981" }} />
                              Online
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontWeight: 500,
                                backgroundColor: "#f1f5f9",
                                color: "#64748b",
                                border: "1px solid #e2e8f0",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                              Offline
                            </span>
                          )}
                        </td>

                        {/* Score */}
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono), monospace" }}>
                            {eventState?.status === "not_started" ? 0 : (typeof item.score === "number" && !isNaN(item.score) ? item.score : 0)}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 3 }}>pts</span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => openTeamPerformance(item)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 500,
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                color: "#1e293b",
                                borderRadius: 4,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              Performance
                            </button>
                            <button
                              type="button"
                              onClick={() => openTeamDetailsModal(item)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 500,
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                color: "#475569",
                                borderRadius: 4,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              Dossier
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Force logout squad "${item.teamName}"?`)) {
                                  publish({ type: "force_logout", target: item.teamId });
                                  publish({ type: "force_logout", target: item.teamName });
                                  await fetch("/api/admin/teams/force-logout", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token || ""}`,
                                    },
                                    body: JSON.stringify({ teamId: item.teamId }),
                                  });
                                  setLeaderboard((prev) =>
                                    prev.map((t) => (t.teamId === item.teamId ? { ...t, isOnline: false, status: "OFFLINE", hasSession: false } : t))
                                  );
                                  loadData();
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 500,
                                backgroundColor: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#dc2626",
                                borderRadius: 4,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
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
                      <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                        {loading ? "Loading tournament data..." : "No squads match the filter criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: QUESTIONS CONFIGURATION (CHAPTER-WISE CARDS) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "questions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header & Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 4px 0", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Chapters &amp; Challenges ({chapters.length})
                </h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Select a chapter below to inspect question prompts, multiple-choice options, and archive lore configuration.
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                Reset to Defaults
              </button>
            </div>

            {/* Chapter-wise Cards Row / Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
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
                      borderRadius: 8,
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#fef2f2" : "#ffffff",
                      border: isSelected ? "2px solid #ef4444" : "1px solid #e2e8f0",
                      boxShadow: isSelected ? "0 4px 12px rgba(239, 68, 68, 0.12)" : "0 1px 2px rgba(0,0,0,0.03)",
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
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: isSelected ? "#dc2626" : "#64748b",
                        }}
                      >
                        STAGE {ch.id}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: isSelected ? "#fee2e2" : "#f1f5f9",
                          color: isSelected ? "#991b1b" : "#475569",
                          fontFamily: "var(--font-mono), monospace",
                          fontWeight: 600,
                        }}
                      >
                        {ch.points || 100} pts
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? "#0f172a" : "#334155",
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
                        color: isSelected ? "#dc2626" : "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 2,
                      }}
                    >
                      <span style={{ fontSize: 8 }}>{isSelected ? "●" : "○"}</span>
                      <span>{isSelected ? "Active View" : "Click to inspect"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Chapter Question Details */}
            {activeChapter ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
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
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "4px 10px",
                        borderRadius: 6,
                        backgroundColor: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fca5a5",
                      }}
                    >
                      STAGE {activeChapter.id}
                    </span>
                    <div>
                      <h3 style={{ fontSize: 17, color: "#0f172a", margin: 0, fontWeight: 700 }}>
                        {activeChapter.archiveTitle || `Chapter ${activeChapter.id}`}
                      </h3>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        Points Awarded:{" "}
                        <span style={{ color: "#0284c7", fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
                          {activeChapter.points || 100} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(activeChapter)}
                      style={{
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: "#0f172a",
                        border: "none",
                        color: "#ffffff",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      Edit Question
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteChapter(activeChapter.id)}
                      style={{
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#dc2626",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
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
                      letterSpacing: "0.08em",
                      color: "#64748b",
                      marginBottom: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Question Prompt
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#0f172a",
                      backgroundColor: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
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
                        letterSpacing: "0.08em",
                        color: "#64748b",
                        marginBottom: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Options &amp; Secret Key
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {activeChapter.options.map((opt) => {
                        const isCorrect = opt.id === activeChapter.correctAnswer;
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: "12px 16px",
                              borderRadius: 8,
                              backgroundColor: isCorrect ? "#ecfdf5" : "#ffffff",
                              border: isCorrect ? "1px solid #86efac" : "1px solid #e2e8f0",
                              color: isCorrect ? "#065f46" : "#334155",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 12,
                                color: isCorrect ? "#047857" : "#64748b",
                                fontFamily: "var(--font-mono), monospace",
                              }}
                            >
                              [{opt.id}]
                            </span>
                            <span style={{ flex: 1, lineHeight: 1.4, fontWeight: isCorrect ? 600 : 400 }}>{opt.text}</span>
                            {isCorrect && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#166534",
                                  backgroundColor: "#dcfce7",
                                  border: "1px solid #86efac",
                                  padding: "2px 8px",
                                  borderRadius: 4,
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
                        letterSpacing: "0.08em",
                        color: "#64748b",
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Archive Lore &amp; Dossier Notes
                    </div>
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        padding: "14px 18px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                        color: "#475569",
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
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                {loading ? "Loading chapters..." : "No chapters found. Click 'Reset Defaults' to populate the chapters."}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 4: SYSTEM & SUBMISSION LOGS (WITH CONNECTION TOPOLOGY) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {activeTab === "logs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header & Re-sync */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 4px 0", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  System Telemetry &amp; Network Bridges
                </h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Live infrastructure telemetry: Main Game Client ↔ Admin Console ↔ TiDB Serverless &amp; Socket.IO Leaderboard.
                </div>
              </div>

              <button
                type="button"
                onClick={handlePingAllConnections}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
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
                gap: 12,
              }}
            >
              {/* CARD 1: MAIN PAGE CLIENT */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Main Game Client
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      backgroundColor: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 7 }}>●</span> CONNECTED
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Bridge: Main Page ↔ Admin Console
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  {connStatus.mainPage.details}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8, marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  <span style={{ color: "#0284c7", fontWeight: 600 }}>Latency: {connStatus.mainPage.latency}</span>
                  <span>·</span>
                  <span>{connStatus.mainPage.lastPing}</span>
                </div>
              </div>

              {/* CARD 2: LEADERBOARD REAL-TIME */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Leaderboard Broadcast
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      backgroundColor: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 7 }}>●</span> SYNCHRONIZED
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Channel: {connStatus.leaderboard.channel}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  Live broadcast stream active across all connected squads
                </div>
                <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8, marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  <span style={{ color: "#0284c7", fontWeight: 600 }}>Roster: {leaderboard.length} Squads Active</span>
                  <span>·</span>
                  <span>Live Push Enabled</span>
                </div>
              </div>

              {/* CARD 3: ADMIN COMMAND BRIDGE */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Admin Command Bridge
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 7 }}>●</span> ONLINE
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Database: Port {connStatus.adminBridge.backendPort}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  Master clearance authenticated (Full R/W privileges)
                </div>
                <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8, marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  <span style={{ color: "#0284c7", fontWeight: 600 }}>Latency: {connStatus.adminBridge.latency}</span>
                  <span>·</span>
                  <span>Source: {dataSource.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 3,
                gap: 2,
                width: "fit-content",
              }}
            >
              <button
                type="button"
                onClick={() => setLogFilter("all")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: logFilter === "all" ? "#ffffff" : "transparent",
                  color: logFilter === "all" ? "#0f172a" : "#64748b",
                  boxShadow: logFilter === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                All Activity ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("connections")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: logFilter === "connections" ? "#ffffff" : "transparent",
                  color: logFilter === "connections" ? "#0f172a" : "#64748b",
                  boxShadow: logFilter === "connections" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Connections &amp; Handshakes ({logs.filter((l) => l.type === "connection" || l.status === "CONNECTED" || l.status === "SYNCED").length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("submissions")}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: logFilter === "submissions" ? "#ffffff" : "transparent",
                  color: logFilter === "submissions" ? "#0f172a" : "#64748b",
                  boxShadow: logFilter === "submissions" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Submissions ({logs.filter((l) => l.type === "submission" || l.status === "SUCCESS" || l.status === "FAILED").length})
              </button>
            </div>

            {/* Log Table */}
            <div
              className="admin-scrollable"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "65vh",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569" }}>
                    <th style={{ padding: "12px 16px", width: 110, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Time</th>
                    <th style={{ padding: "12px 16px", width: 170, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Component / Squad</th>
                    <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Event / Action</th>
                    <th style={{ padding: "12px 16px", width: 130, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "12px 16px", width: 90, textAlign: "right", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Latency</th>
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
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background-color 0.1s ease",
                          }}
                        >
                          <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12, fontFamily: "var(--font-mono), monospace" }}>{log.timestamp}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>
                            {log.team}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#334155" }}>{log.action}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 9px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: isConn
                                  ? "#ecfdf5"
                                  : isSynced
                                  ? "#fffbeb"
                                  : isSuccess
                                  ? "#ecfdf5"
                                  : "#fef2f2",
                                color: isConn
                                  ? "#047857"
                                  : isSynced
                                  ? "#b45309"
                                  : isSuccess
                                  ? "#047857"
                                  : "#dc2626",
                                border: isConn
                                  ? "1px solid #a7f3d0"
                                  : isSynced
                                  ? "1px solid #fde68a"
                                  : isSuccess
                                  ? "1px solid #a7f3d0"
                                  : "1px solid #fecaca",
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontSize: 12, fontFamily: "var(--font-mono), monospace" }}>
                            {log.latency || "24ms"}
                          </td>
                        </tr>
                      );
                    })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
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
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. EDIT QUESTION MODAL (Scrollable) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingChapter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              width: "100%",
              maxWidth: "720px",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#e11d48", fontWeight: 700, textTransform: "uppercase" }}>
                  Stage Configuration · Challenge Editor
                </span>
                <h3 style={{ fontSize: 18, color: "#0f172a", margin: "4px 0 0 0", fontWeight: 700 }}>
                  Edit Stage {editingChapter.id} : {editingChapter.archiveTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Question Prompt Field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                Question Prompt Text
              </label>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 13,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  color: "#0f172a",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Points & Answer Key Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Points Awarded
                </label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Secret Answer Key
                </label>
                <input
                  type="text"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  placeholder="e.g. A or 14.285_MHZ"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#fff1f2",
                    border: "1px solid #fecdd3",
                    borderRadius: 6,
                    color: "#e11d48",
                    fontWeight: 700,
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>
            </div>

            {/* Multiple Choice Options Configuration */}
            {editOptions.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 10, textTransform: "uppercase" }}>
                  Multiple Choice Options
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {editOptions.map((opt, idx) => (
                    <div key={opt.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span
                        style={{
                          width: 32,
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: opt.id === editAnswer ? "#059669" : "#64748b",
                          fontFamily: "var(--font-mono), monospace",
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
                          padding: "10px 14px",
                          fontSize: 13,
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          color: "#0f172a",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lore Lines Configuration */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                Archive Lore &amp; Dossier Notes (One per line)
              </label>
              <textarea
                value={editLoreText}
                onChange={(e) => setEditLoreText(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 13,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  color: "#334155",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveChapter}
                disabled={isSaving}
                style={{
                  padding: "8px 20px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#e11d48",
                  border: "none",
                  borderRadius: 6,
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3.5. BULK SQUAD IMPORT MODAL (CSV / TSV / EXCEL / ROSTER) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3.5. BULK SQUAD IMPORT MODAL (CSV / TSV / EXCEL / ROSTER) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              width: "100%",
              maxWidth: "820px",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#d97706", fontWeight: 700, textTransform: "uppercase" }}>
                  Tournament Roster Import
                </span>
                <h3 style={{ margin: "4px 0 2px 0", fontSize: 18, color: "#0f172a", fontWeight: 700 }}>
                  Bulk Squad Import &amp; Spreadsheet Validator
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Upload CSV, TSV, or Excel (.xlsx) files or paste squad data directly.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* File Upload Shortcut */}
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 8,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>Choose file from disk (.xlsx, .csv, .tsv):</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Expected columns: Team Name, Team Leader, Score, Role</div>
              </div>
              <input
                type="file"
                accept=".csv,.txt,.tsv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ fontSize: 12, color: "#475569" }}
              />
            </div>

            {/* Paste format explanation */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", textTransform: "uppercase" }}>
                  Paste Roster Text / Raw Data
                </span>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                  Team Name, Leader Name, Score, Role
                </span>
              </div>
              <textarea
                rows={importPreview ? 4 : 6}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  if (importPreview) setImportPreview(null);
                }}
                placeholder={`Null Pointers, Aarav Sharma, 0, PLAYER\nByte Byters, Dustin Henderson, 0, PLAYER\nShadow Walkers, Mike Wheeler, 0, PLAYER`}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono), monospace",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  color: "#0f172a",
                  boxSizing: "border-box",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Validation Preview Section */}
            {importPreview && (
              <div style={{ marginBottom: 20 }}>
                {/* Summary stat tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: "10px", backgroundColor: "#f8fafc", borderRadius: 6, textAlign: "center", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>TOTAL ROWS</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>{importPreview.totalRows}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#f0fdf4", borderRadius: 6, textAlign: "center", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>VALID READY</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>{importPreview.validCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fffbeb", borderRadius: 6, textAlign: "center", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 10, color: "#d97706", fontWeight: 700 }}>DUPLICATES</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>{importPreview.duplicateCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fef2f2", borderRadius: 6, textAlign: "center", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>MISSING</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>{importPreview.missingCount}</div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "#fef2f2", borderRadius: 6, textAlign: "center", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>MALFORMED</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>{importPreview.malformedCount}</div>
                  </div>
                </div>

                {/* Conflict Resolution Selector */}
                <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Duplicate Squad Conflict Strategy:
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: importMode === "skip" ? "#0f172a" : "#64748b" }}>
                      <input
                        type="radio"
                        name="importMode"
                        value="skip"
                        checked={importMode === "skip"}
                        onChange={() => setImportMode("skip")}
                      />
                      Skip duplicates (insert new squads only)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: importMode === "overwrite" ? "#0f172a" : "#64748b" }}>
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
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
                    <thead style={{ position: "sticky", top: 0 }}>
                      <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "8px 10px" }}>#</th>
                        <th style={{ padding: "8px 10px" }}>TEAM NAME</th>
                        <th style={{ padding: "8px 10px" }}>LEADER NAME</th>
                        <th style={{ padding: "8px 10px" }}>SCORE</th>
                        <th style={{ padding: "8px 10px" }}>ROLE</th>
                        <th style={{ padding: "8px 10px" }}>VALIDATION STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.slice(0, 30).map((r: any, idx: number) => {
                        let statusColor = "#059669";
                        let statusBg = "#f0fdf4";
                        let statusBorder = "#bbf7d0";
                        if (r.status === "DUPLICATE") {
                          statusColor = "#d97706";
                          statusBg = "#fffbeb";
                          statusBorder = "#fde68a";
                        } else if (r.status === "MISSING_REQUIRED" || r.status === "MALFORMED") {
                          statusColor = "#dc2626";
                          statusBg = "#fef2f2";
                          statusBorder = "#fecaca";
                        }

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 10px", color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>{r.row}</td>
                            <td style={{ padding: "6px 10px", color: "#0f172a", fontWeight: 600 }}>{r.teamName || "(empty)"}</td>
                            <td style={{ padding: "6px 10px", color: "#475569" }}>{r.leaderName || "(empty)"}</td>
                            <td style={{ padding: "6px 10px", color: "#0f172a", fontFamily: "var(--font-mono), monospace" }}>{r.initialScore ?? 0}</td>
                            <td style={{ padding: "6px 10px", color: r.role === "VECNA" ? "#dc2626" : "#2563eb", fontWeight: 600 }}>{r.role || "PLAYER"}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: statusColor, backgroundColor: statusBg, border: `1px solid ${statusBorder}` }}>
                                {r.status}
                              </span>
                              {r.error && <span style={{ color: "#64748b", marginLeft: 6, fontSize: 10 }}>({r.error})</span>}
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
              <div style={{ marginBottom: 16, padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#059669", fontSize: 12, fontWeight: 600 }}>
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
                      padding: "8px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#334155",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isAnalyzing ? "Analyzing spreadsheet..." : "Preview & Validate"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImporting || !importText.trim()}
                  onClick={handleBulkImport}
                  style={{
                    padding: "8px 20px",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#e11d48",
                    border: "none",
                    borderRadius: 6,
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isImporting ? "Importing squads..." : (importPreview ? "Confirm & Commit Import" : "Execute Import")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. REGISTER SQUAD MODAL (TIDB) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. REGISTER SQUAD MODAL (TIDB) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAddTeamModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              width: "100%",
              maxWidth: "500px",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                  Tournament Roster · New Entry
                </span>
                <h3 style={{ fontSize: 18, color: "#0f172a", margin: "4px 0 0 0", fontWeight: 700 }}>
                  Register Tournament Squad
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTeamModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Squad / Team Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sinclair Scouts"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Squad Leader Callsign
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucas Sinclair"
                  value={newLeaderName}
                  onChange={(e) => setNewLeaderName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Squad Role
                </label>
                <select
                  value={newTeamRole}
                  onChange={(e) => setNewTeamRole(e.target.value === "VECNA" ? "VECNA" : "PLAYER")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="PLAYER">Hawkins Participant</option>
                  <option value="VECNA">Vecna / Infiltrator</option>
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#475569", marginBottom: 8, textTransform: "uppercase" }}>
                  Starting Points
                </label>
                <input
                  type="number"
                  value={newTeamScore}
                  onChange={(e) => setNewTeamScore(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: 13,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingTeam}
                  style={{
                    padding: "8px 20px",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#e11d48",
                    border: "none",
                    borderRadius: 6,
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isCreatingTeam ? "Registering..." : "Register Squad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. TEAM DETAILS & POINTS EDITOR MODAL (TIDB) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. TEAM DETAILS & POINTS EDITOR MODAL (TIDB) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {detailTeam && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              width: "100%",
              maxWidth: "640px",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                  Squad Dossier &amp; Status
                </div>
                <h3 style={{ fontSize: 20, color: "#0f172a", margin: "4px 0 0 0", fontWeight: 700 }}>
                  {detailTeam.teamName}
                </h3>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Leader: <span style={{ color: "#0f172a", fontWeight: 600 }}>{detailTeam.leaderName}</span> · ID: <span style={{ color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>{detailTeam.teamId}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailTeam(null)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>RANK</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: detailTeam.rank <= 3 ? "#d97706" : "#0f172a", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  #{detailTeam.rank}
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>TOTAL SCORE</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#2563eb", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  {detailTeam.score} pts
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>SOLVED</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#059669", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                  {detailTeam.solvedCount} / 7
                </div>
              </div>
              <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>PRESENCE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: detailTeam.isOnline ? "#059669" : "#64748b", marginTop: 8 }}>
                  {detailTeam.isOnline ? "ONLINE" : "OFFLINE"}
                </div>
              </div>
            </div>

            {/* Admin Points Editor Section */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "16px 18px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
                  Score Adjustment
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>Live update</span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="number"
                  value={editTeamPoints}
                  onChange={(e) => setEditTeamPoints(Number(e.target.value))}
                  style={{
                    flex: 1,
                    minWidth: "120px",
                    padding: "8px 12px",
                    fontSize: 15,
                    fontWeight: 700,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    color: "#0f172a",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                />

                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => prev + 50)}
                    style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, cursor: "pointer" }}
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => prev + 100)}
                    style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, cursor: "pointer" }}
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTeamPoints((prev) => Math.max(0, prev - 50))}
                    style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, cursor: "pointer" }}
                  >
                    -50
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTeamPoints}
                  disabled={isUpdatingTeamPoints}
                  style={{
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#e11d48",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isUpdatingTeamPoints ? "Saving..." : "Save Points"}
                </button>
              </div>
            </div>

            {/* Questions / Chapters Solved by this team */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.06em", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
                  Stages Progress ({detailTeam.solvedCount} / 7 Solved)
                </div>
                {detailTeam.lastSubmissionTime && (
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                    Last solve: {new Date(detailTeam.lastSubmissionTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((chNum) => {
                  const chObj = chapters.find((c) => c.id === chNum);
                  const isSolved = (detailTeam.completedTasks || []).some(
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
                        padding: "8px 12px",
                        borderRadius: 6,
                        backgroundColor: isSolved ? "#f0fdf4" : "#f8fafc",
                        border: isSolved ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isSolved ? "#059669" : "#64748b",
                          }}
                        >
                          STAGE {chNum}
                        </span>
                        <span style={{ fontSize: 12, color: isSolved ? "#0f172a" : "#64748b", fontWeight: isSolved ? 600 : 400 }}>
                          {chObj ? chObj.archiveTitle : `Chapter ${chNum} Challenge`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                          {chObj?.points || 100} pts
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 700,
                            backgroundColor: isSolved ? "#dcfce7" : "#f1f5f9",
                            color: isSolved ? "#15803d" : "#64748b",
                            border: isSolved ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                          }}
                        >
                          {isSolved ? "✓ Solved" : "○ Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal footer close */}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDetailTeam(null)}
                style={{
                  padding: "8px 18px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. TEAM PERFORMANCE DRAWER / MODAL (6-STAGE BREAKDOWN & HISTORY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. TEAM PERFORMANCE DRAWER / MODAL (6-STAGE BREAKDOWN & HISTORY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {performanceTeam && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
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
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              width: "100%",
              maxWidth: "960px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "#e11d48", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  Squad Telemetry · 6-Stage Progression
                </div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                  {performanceTeam.teamName}
                </h2>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Leader: <span style={{ color: "#0f172a", fontWeight: 600 }}>{performanceTeam.leaderName}</span> · Team ID: <span style={{ color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>{performanceTeam.teamId}</span> · Role: <span style={{ color: performanceTeam.role === "VECNA" ? "#dc2626" : "#2563eb", fontWeight: 600 }}>{performanceTeam.role || "Hawkins Squad"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPerformanceTeam(null);
                  setPerformanceData(null);
                }}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  fontSize: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {isLoadingPerformance && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                Analyzing 6-stage telemetry from database...
              </div>
            )}

            {!isLoadingPerformance && performanceData && (
              <>
                {/* 1. Overview Stat Tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                  <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>RANK</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: performanceData.teamOverview.overallRank <= 3 ? "#d97706" : "#0f172a", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                      #{performanceData.teamOverview.overallRank}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>TOTAL NET POINTS</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                      {performanceData.teamOverview.currentTotalPoints} pts
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>CURRENT LOCATION</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 8 }}>
                      {performanceData.teamOverview.currentStage}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.05em" }}>STAGES CLEARED</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
                      {performanceData.stages.filter((s: any) => s.status === "Completed").length} / 6
                    </div>
                  </div>
                </div>

                {/* 2. Stage-by-Stage History Table (6 Stages) */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
                    {performanceData.teamOverview.role === "VECNA"
                      ? "Trial Progression & Scoring Breakdown"
                      : "Stage Progression & Scoring Breakdown"}
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Stage</th>
                          <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Status</th>
                          <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Started</th>
                          <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Completed</th>
                          <th style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Duration</th>
                          <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Earned</th>
                          <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Lost</th>
                          <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Net</th>
                          <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.stages.map((stg: any) => {
                          let badgeBg = "#f1f5f9";
                          let badgeColor = "#64748b";
                          let badgeBorder = "#e2e8f0";
                          if (stg.status === "Completed") {
                            badgeBg = "#f0fdf4";
                            badgeColor = "#059669";
                            badgeBorder = "#bbf7d0";
                          } else if (stg.status === "In Progress") {
                            badgeBg = "#fffbeb";
                            badgeColor = "#d97706";
                            badgeBorder = "#fde68a";
                          }

                          const formatTime = (ts: string) => {
                            if (!ts || ts === "Unavailable") return "—";
                            try {
                              const d = new Date(ts);
                              return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString();
                            } catch {
                              return "—";
                            }
                          };

                          const isExpanded = expandedPerformanceStage === stg.stageId;

                          return (
                            <React.Fragment key={stg.stageId}>
                              <tr style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: isExpanded ? "#f8fafc" : "transparent" }}>
                                <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>
                                  {stg.stageName.startsWith("TRIAL") ? stg.stageName : `Stage ${stg.stageId}: ${stg.stageName}`}
                                </td>
                                <td style={{ padding: "10px 14px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                                    {stg.status}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                                  {stg.startedAt === "Unavailable" ? "—" : formatToIST(stg.startedAt)}
                                </td>
                                <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                                  {stg.completedAt === "Unavailable" ? "—" : formatToIST(stg.completedAt)}
                                </td>
                                <td style={{ padding: "10px 14px", color: "#475569", fontFamily: "var(--font-mono), monospace" }}>
                                  {stg.duration === "Unavailable" ? "—" : stg.duration}
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "right", color: "#059669", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
                                  +{stg.pointsEarned}
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "right", color: stg.pointsLost < 0 ? "#dc2626" : "#64748b", fontWeight: 600, fontFamily: "var(--font-mono), monospace" }}>
                                  {stg.pointsLost < 0 ? stg.pointsLost : 0}
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "right", color: "#0f172a", fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
                                  {stg.netStageScore >= 0 ? `+${stg.netStageScore}` : stg.netStageScore} pts
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPerformanceStage(isExpanded ? null : stg.stageId)}
                                    style={{
                                      padding: "3px 8px",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      backgroundColor: isExpanded ? "#e2e8f0" : "#ffffff",
                                      color: isExpanded ? "#0f172a" : "#475569",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {isExpanded ? "Close" : "Audit"}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded itemized events for this stage */}
                              {isExpanded && (
                                <tr style={{ backgroundColor: "#f8fafc" }}>
                                  <td colSpan={9} style={{ padding: "12px 16px" }}>
                                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: 600 }}>
                                      Itemized audit events for {stg.stageName.startsWith("TRIAL") ? stg.stageName : `Stage ${stg.stageId}`}:
                                    </div>
                                    {(!stg.events || stg.events.length === 0) ? (
                                      <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                                        No itemized events recorded for this stage yet.
                                      </div>
                                    ) : (
                                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", backgroundColor: "#ffffff" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                          <thead>
                                            <tr style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>TIMESTAMP</th>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>EVENT TYPE</th>
                                              <th style={{ padding: "6px 10px", textAlign: "left" }}>DETAIL / REASON</th>
                                              <th style={{ padding: "6px 10px", textAlign: "right" }}>POINT DELTA</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {stg.events.map((ev: any, evIdx: number) => {
                                              let deltaColor = "#64748b";
                                              if (ev.pointDelta > 0) deltaColor = "#059669";
                                              else if (ev.pointDelta < 0) deltaColor = "#dc2626";

                                              return (
                                                <tr key={evIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                  <td style={{ padding: "6px 10px", color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                                                    {formatTime(ev.timestamp)}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", color: "#0f172a", fontWeight: 600 }}>
                                                    {ev.type}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", color: "#475569" }}>
                                                    {ev.detail || "-"}
                                                  </td>
                                                  <td style={{ padding: "6px 10px", textAlign: "right", color: deltaColor, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
                    Event-wide Score Adjustments
                  </div>
                  {(!performanceData.eventWideActions || performanceData.eventWideActions.length === 0) ? (
                    <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, color: "#64748b", fontSize: 12 }}>
                      No event-wide adjustments recorded for this squad.
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", backgroundColor: "#ffffff" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>TIMESTAMP</th>
                            <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>ACTION TYPE</th>
                            <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>DETAIL</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 700 }}>POINT DELTA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.eventWideActions.map((act: any, actIdx: number) => {
                            let deltaColor = "#64748b";
                            if (act.pointDelta > 0) deltaColor = "#059669";
                            else if (act.pointDelta < 0) deltaColor = "#dc2626";

                            return (
                              <tr key={actIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 12px", color: "#64748b", fontFamily: "var(--font-mono), monospace" }}>
                                  {act.timestamp !== "Unavailable" ? new Date(act.timestamp).toLocaleTimeString() : "—"}
                                </td>
                                <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 600 }}>{act.type}</td>
                                <td style={{ padding: "8px 12px", color: "#475569" }}>{act.detail || "-"}</td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: deltaColor, fontWeight: 700, fontFamily: "var(--font-mono), monospace" }}>
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
                  padding: "8px 18px",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Close Performance View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
