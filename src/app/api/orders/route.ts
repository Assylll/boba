import { NextResponse } from "next/server";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  return NextResponse.json({
    count: state.orders.length,
    orders: state.orders,
  });
}
