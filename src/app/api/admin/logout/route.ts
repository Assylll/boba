import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/server/auth";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  const state = await readState();
  const response = NextResponse.json({
    state,
    auth: {
      isAdminAuthenticated: false,
      adminUsername: null,
    },
  });

  clearAdminSession(response);
  return response;
}
