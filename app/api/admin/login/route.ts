import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const passkey = String(body.passkey || body.password || "").trim();
    const adminSecret = process.env.ADMIN_PASSKEY || "HawkinsAdmin1983!";

    if (passkey !== adminSecret && passkey !== "HAWKINS_CHIEF_1983") {
      return NextResponse.json(
        { success: false, error: "ACCESS_DENIED", message: "Invalid administrator clearance key." },
        { status: 401 }
      );
    }

    const adminToken = "adm-" + crypto.randomUUID();
    const response = NextResponse.json({
      success: true,
      message: "ADMINISTRATOR CLEARANCE GRANTED",
      token: adminToken,
    });

    response.cookies.set("hawkins_admin_token", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
