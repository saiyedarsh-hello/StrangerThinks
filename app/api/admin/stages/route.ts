import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const base = getApiBase();
    let token = req.headers.get("authorization");
    if (!token || token.trim() === "" || token.trim() === "Bearer") {
      const cookieTok =
        req.cookies.get("hawkins_admin_token")?.value ||
        req.cookies.get("hawkins_session_token")?.value ||
        req.cookies.get("admin_token")?.value;
      if (cookieTok) {
        token = cookieTok.startsWith("Bearer ") ? cookieTok : `Bearer ${cookieTok}`;
      }
    }
    if (!token || token.trim() === "" || token.trim() === "Bearer") {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Admin authorization required." },
        { status: 401 }
      );
    }
    const res = await fetch(`${base}/admin/stages`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
