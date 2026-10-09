import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let teamsList: Array<{ username: string; password?: string; pass?: string; teamName?: string; leaderName?: string; teamId?: string }> = [];

    if (Array.isArray(body.teams)) {
      teamsList = body.teams;
    } else if (typeof body.csv === "string") {
      const lines = body.csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      for (const line of lines) {
        // Skip header lines like "username,password" or "Team Name,Password"
        if (/^(username|team|squad|rank)/i.test(line.trim())) continue;

        let parts: string[] = [];
        if (line.includes("\t")) {
          parts = line.split("\t").map((p) => p.trim());
        } else if (line.includes(",")) {
          parts = line.split(",").map((p) => p.trim());
        } else if (line.includes(":")) {
          parts = line.split(":").map((p) => p.trim());
        } else if (line.includes(";")) {
          parts = line.split(";").map((p) => p.trim());
        }

        if (parts.length >= 2) {
          teamsList.push({
            username: parts[0],
            password: parts[1],
            teamName: parts[2] || parts[0],
            leaderName: parts[3] || "Squad Leader",
          });
        }
      }
    }

    if (teamsList.length === 0) {
      return NextResponse.json(
        { success: false, error: "EMPTY_IMPORT", message: "No teams found in import payload. Supported formats: CSV (comma), TSV (tab), or Colon (TEAM01 : password)." },
        { status: 400 }
      );
    }

    // Fetch existing teams to avoid primary key / username collisions
    const { data: existingTeams } = await supabaseAdmin
      .from("teams")
      .select("team_id, username");

    const existingMap = new Map((existingTeams || []).map((t) => [t.username.toUpperCase(), t.team_id]));

    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < teamsList.length; i++) {
      const item = teamsList[i];
      const rawUser = String(item.username || "").trim();
      if (!rawUser) continue;

      const username = rawUser.toUpperCase();
      const password = (item.password || item.pass || `hawkins83_${i + 1}`).trim();
      const teamName = (item.teamName || rawUser).trim();
      const leaderName = (item.leaderName || "Squad Leader").trim();

      // If team already exists, reuse team_id; otherwise create ID
      let teamId = existingMap.get(username);
      if (!teamId) {
        teamId = item.teamId || `T${String(existingMap.size + insertedCount + 1).padStart(2, "0")}`;
      }

      const { error } = await supabaseAdmin.from("teams").upsert(
        {
          team_id: teamId,
          username: username,
          password_plain: password,
          team_name: teamName,
          squad_leader: leaderName,
          total_score: 0,
          current_stage: 1,
          status: "ACTIVE",
        },
        { onConflict: "username" }
      );

      if (error) {
        errors.push(`${username}: ${error.message}`);
      } else {
        insertedCount++;
        existingMap.set(username, teamId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${insertedCount} squads.`,
      importedCount: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[TEAMS IMPORT ERROR]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}
