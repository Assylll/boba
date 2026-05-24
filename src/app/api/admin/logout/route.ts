import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession } from "@/server/auth";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  try {
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
  } catch {
    const response = NextResponse.json(
      {
        state: null,
        auth: {
          isAdminAuthenticated: false,
          adminUsername: null,
        },
        message: "Unable to load state during logout",
      },
      { status: 500 }
    );
    clearAdminSession(response);
    return response;
  }
}
