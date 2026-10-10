/**
 * DEPRECATED: Migrated to TiDB Distributed SQL
 * Re-exports from @/lib/tidbService for full backward compatibility
 */

export * from "@/lib/tidbService";

import {
  getTiDBLeaderboard,
  getTiDBChapters,
  updateTiDBChapter,
  deleteTiDBChapter,
  subscribeToTiDBLeaderboard,
  authenticateTeamWithTiDB,
  registerTeamInTiDB,
} from "@/lib/tidbService";

// Legacy Supabase aliases mapped to TiDB service
export const getSupabaseLeaderboard = getTiDBLeaderboard;
export const getSupabaseChapters = getTiDBChapters;
export const updateSupabaseChapter = updateTiDBChapter;
export const deleteSupabaseChapter = deleteTiDBChapter;
export const subscribeToSupabaseLeaderboard = subscribeToTiDBLeaderboard;
export const authenticateTeamWithSupabase = authenticateTeamWithTiDB;
export const registerTeamInSupabase = registerTeamInTiDB;
