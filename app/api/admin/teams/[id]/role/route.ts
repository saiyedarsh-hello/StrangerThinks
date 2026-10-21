import { NextRequest, NextResponse } from "next/server";
import { getApiBase } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const base = getApiBase();
    const token = req.headers.get("authorization");
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Admin authorization required." }, { status: 401 });
    }
    const body = await req.json();

    const res = await fetch(`${base}/admin/teams/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "BACKEND_ERROR" },
      { status: 500 }
    );
  }
}
