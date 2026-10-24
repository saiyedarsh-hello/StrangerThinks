import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const passkey = String(body.passkey || body.password || "").trim();

    if (!passkey) {
      return NextResponse.json(
        { success: false, error: "MISSING_PASSKEY", message: "Clearance password is required." },
        { status: 400 }
      );
    }

    // Clearance is verified exclusively by the backend authentication service.
    const base = getApiBase();
    const res = await fetch(`${base}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.token) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || "ACCESS_DENIED",
          message: data.message || "Invalid administrator clearance password.",
        },
        { status: res.status === 200 ? 401 : res.status }
      );
    }

    const response = NextResponse.json(data);
    response.cookies.set("hawkins_admin_token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "BACKEND_UNREACHABLE", message: "Security mainframe is offline." },
      { status: 502 }
    );
  }
}
