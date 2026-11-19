import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type AuthenticatedRequest = {
  user: User;
  supabase: SupabaseClient;
};

const WINDOW_MS = 60_000;

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

  const reader = req.body?.getReader();
  if (!reader) return jsonError("Request body is required", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return jsonError("Request body too large", 413);
      }
      chunks.push(value);
    }
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
}

/**
 * Shared, atomic throttling stored in Supabase so limits apply across
 * serverless instances and regions.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  endpoint: string,
  limit: number,
  windowMs = WINDOW_MS,
): Promise<Response | null> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_endpoint: endpoint,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  }).maybeSingle();

  if (error || !data) {
    // Fail closed: do not process sensitive API work if the abuse-control
    // store is unavailable.
    return jsonError("Service temporarily unavailable", 503);
  }
  if (!data.allowed) {
    return jsonError("Too many requests. Please try again shortly.", 429, {
      "Retry-After": String(Math.max(1, data.retry_after_seconds ?? windowSeconds)),
    });
  }
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
