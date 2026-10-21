import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const base = getApiBase();
    const token = req.headers.get("authorization");
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Admin authorization required." }, { status: 401 });
    }
    const res = await fetch(`${base}/admin/teams`, {
      headers: { Authorization: token },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ success: false, error: "BACKEND_ERROR" }, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "BACKEND_UNREACHABLE" }, { status: 500 });
  }
}
