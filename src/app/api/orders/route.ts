import { NextResponse } from "next/server";
import { readState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json({
      count: state.orders.length,
      orders: state.orders,
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to load orders" },
      { status: 500 }
    );
  }
}
