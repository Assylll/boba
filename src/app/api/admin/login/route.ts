import { NextRequest, NextResponse } from "next/server";
import {
  setAdminSession,
  verifyAdminCredentials,
} from "@/server/auth";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password || !verifyAdminCredentials(username, password)) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  try {
    const state = await readState();
    const response = NextResponse.json({
      state,
      auth: {
        isAdminAuthenticated: true,
        adminUsername: username,
      },
    });

    setAdminSession(response, username);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to complete login" },
      { status: 500 }
    );
  }
}
