import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type AuthenticatedRequest = {
  user: User;
  supabase: ReturnType<typeof createClient>;
};

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedRequest | Response> {
  const authorization = req.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonError("Authentication required", 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return jsonError("Service temporarily unavailable", 503);

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) return jsonError("Authentication required", 401);
  return { user: data.user, supabase };
}

export async function readJsonBody(req: NextRequest, maxBytes: number): Promise<unknown | Response> {
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return jsonError("A JSON request body is required", 415);
  }

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return jsonError("Request body too large", 413);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return jsonError("Request body too large", 413);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
}

/**
 * Best-effort per-instance throttling. This is deliberately not represented as
 * globally distributed protection; a shared store is required for that.
 */
export function enforceRateLimit(key: string, limit: number, windowMs = WINDOW_MS): Response | null {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (current.count >= limit) {
    return jsonError("Too many requests. Please try again shortly.", 429, {
      "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
    });
  }
  current.count += 1;
  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function redactDirectIdentifiers(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[identifier]")
    .replace(/\b(?:\d{1,2}[/-]){2}\d{2,4}\b/g, "[date]");
}
