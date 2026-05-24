import { NextRequest, NextResponse } from "next/server";
import {
  applyPersistedAction,
  PersistedStoreAction,
} from "@/lib/pos-state";
import { getAdminSession } from "@/server/auth";
import { updateState } from "@/server/state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTION_TYPES: PersistedStoreAction["type"][] = [
  "ADD_TO_CART",
  "UPDATE_QUANTITY",
  "REMOVE_FROM_CART",
  "CLEAR_CART",
  "CHECKOUT",
  "OPEN_SHIFT",
  "CLOSE_SHIFT",
  "ADD_RECEIPT",
  "TRANSFER_BETWEEN_ACCOUNTS",
  "DEPOSIT_TO_ACCOUNT",
  "WITHDRAW_FROM_ACCOUNT",
  "ADD_ACCOUNT",
  "TOGGLE_ACCOUNT",
  "UPDATE_ORDER_STATUS",
  "REPEAT_ORDER",
  "ADD_PRODUCT",
  "UPDATE_PRODUCT",
  "DELETE_PRODUCT",
];

const ADMIN_ONLY_ACTIONS = new Set<PersistedStoreAction["type"]>([
  "ADD_RECEIPT",
  "TRANSFER_BETWEEN_ACCOUNTS",
  "DEPOSIT_TO_ACCOUNT",
  "WITHDRAW_FROM_ACCOUNT",
  "ADD_ACCOUNT",
  "TOGGLE_ACCOUNT",
  "ADD_PRODUCT",
  "UPDATE_PRODUCT",
  "DELETE_PRODUCT",
]);

function isPersistedAction(value: unknown): value is PersistedStoreAction {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && ALLOWED_ACTION_TYPES.includes(type as PersistedStoreAction["type"]);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!isPersistedAction(body)) {
    return NextResponse.json({ message: "Invalid action payload" }, { status: 400 });
  }

  const admin = getAdminSession(request);
  if (ADMIN_ONLY_ACTIONS.has(body.type) && !admin.isAuthenticated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await updateState((current) => applyPersistedAction(current, body));
    return NextResponse.json({
      state,
      auth: {
        isAdminAuthenticated: admin.isAuthenticated,
        adminUsername: admin.username,
      },
    });
  } catch {
    return NextResponse.json({ message: "Unable to apply action" }, { status: 500 });
  }
}
