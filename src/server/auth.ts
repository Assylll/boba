import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "boba_pos_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const ADMIN_DEFAULT_USERNAME =
  process.env.ADMIN_USERNAME ?? process.env.NEXT_PUBLIC_ADMIN_USERNAME ?? "admin";
const ADMIN_DEFAULT_PASSWORD =
  process.env.ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin123";
const SESSION_SECRET =
  process.env.BOBA_POS_SESSION_SECRET ?? "boba-pos-local-dev-secret";

interface SessionPayload {
  u: string;
  e: number;
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function fromBase64Url(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

function sign(rawPayload: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(rawPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSession(payload: SessionPayload): string {
  const payloadRaw = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadRaw);
  return `${payloadRaw}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [payloadRaw, signature] = token.split(".");
  if (!payloadRaw || !signature) return null;

  const expectedSignature = sign(payloadRaw);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(payloadRaw)) as SessionPayload;
    if (!parsed.u || !parsed.e) return null;
    if (parsed.e < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_DEFAULT_USERNAME && password === ADMIN_DEFAULT_PASSWORD;
}

export function getAdminSession(request: NextRequest): {
  isAuthenticated: boolean;
  username: string | null;
} {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { isAuthenticated: false, username: null };
  }

  const payload = decodeSession(token);
  if (!payload) {
    return { isAuthenticated: false, username: null };
  }

  return {
    isAuthenticated: true,
    username: payload.u,
  };
}

export function setAdminSession(response: NextResponse, username: string): void {
  const token = encodeSession({
    u: username,
    e: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSession(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
