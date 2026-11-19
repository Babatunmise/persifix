import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, isRecord, jsonError, readJsonBody } from "@/lib/api-security";

const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, protective, and clinically cautious.
Provide a brief, non-diagnostic observation about a blood-pressure reading.
Do not diagnose, classify, infer treatment, or recommend medication changes.
Do not provide threshold-based escalation instructions in this endpoint. Encourage the user to discuss concerning readings with their healthcare professional.
Offer one gentle, non-medical supportive next step.`;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = await enforceRateLimit(auth.supabase, "narrator");
  if (limited) return limited;
  const body = await readJsonBody(req, 2_048);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body.readingId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.readingId)) {
    return jsonError("A valid reading reference is required", 400);
  }

  // Fetch the reading from the database using the verified user's JWT and an
  // explicit owner predicate. Client-supplied BP values are never trusted.
  const { data: reading, error } = await auth.supabase
    .from("bp_readings")
    .select("systolic, diastolic")
    .eq("id", body.readingId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !reading) return jsonError("Reading not found", 404);

  // Do not transmit dietary conversation or blood-pressure information to an
  // external AI processor until contractual, regional, retention, and consent
  // safeguards have been approved by the product owner.
  if (process.env.SANCTOS_EXTERNAL_AI_APPROVED !== "true") {
    return jsonError("This AI feature is temporarily unavailable while its data safeguards are reviewed.", 503);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Narrator is temporarily unavailable", 503);
  try {
    // Only the two numeric values needed for the narrative leave the application.
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Blood-pressure reading: ${reading.systolic}/${reading.diastolic} mmHg.` },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return jsonError("Narrator is unavailable", 502);
    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content;
    if (typeof narrative !== "string" || !narrative.trim()) return jsonError("Narrator is unavailable", 502);
    return Response.json({ narrative });
  } catch {
    return jsonError("Narrator is unavailable", 502);
  }
}