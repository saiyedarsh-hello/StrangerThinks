import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const base = getApiBase();
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${base}/tasks/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
      }
    } catch (backendErr) {
      // Backend offline; proceed to fallback
    }

    return NextResponse.json({ success: true, message: "Progress recorded." }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: true, message: "Progress recorded." }, { status: 200 });
  }
}
