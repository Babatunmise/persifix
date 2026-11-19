import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, isRecord, jsonError, readJsonBody } from "@/lib/api-security";

const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, and deeply empathetic.
Provide a short, compassionate, non-diagnostic supportive check-in.
Use motivational interviewing. Validate feelings without judging or shaming.
Never diagnose or give medical advice. Offer one gentle, actionable step.`;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = await enforceRateLimit(auth.supabase, "journal");
  if (limited) return limited;

  const body = await readJsonBody(req, 8_192);
  if (body instanceof Response) return body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Invalid request", 400);
  if (!isRecord(body) || body.entrySubmitted !== true) return jsonError("A journal entry is required", 400);

  // The journal content remains in the browser. The server receives only a
  // boolean indicating that the user submitted an entry; no journal text is
  // stored, logged, or forwarded to the AI provider.

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Companion is temporarily unavailable", 503);

  try {
    // Journal text may contain identifying health information. Until vendor safeguards
    // are verified, do not transmit the journal entry to the external AI provider.
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Provide a general supportive check-in without assuming any patient facts." },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return jsonError("Companion is unavailable", 502);
    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content;
    if (typeof narrative !== "string" || !narrative.trim()) return jsonError("Companion is unavailable", 502);
    return Response.json({ narrative });
  } catch {
    return jsonError("Companion is unavailable", 502);
  }
}