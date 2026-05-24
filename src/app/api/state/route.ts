import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/server/auth";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const state = await readState();
  const admin = getAdminSession(request);

  return NextResponse.json({
    state,
    auth: {
      isAdminAuthenticated: admin.isAuthenticated,
      adminUsername: admin.username,
    },
  });
}
