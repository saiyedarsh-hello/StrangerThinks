import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const base = getApiBase();
    const token = req.headers.get("authorization");
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Admin authorization required." }, { status: 401 });
    }
    const res = await fetch(`${base}/admin/event/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
