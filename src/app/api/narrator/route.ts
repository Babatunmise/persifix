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
  const limited = enforceRateLimit(`narrator:${auth.user.id}`, 10);
  if (limited) return limited;
  const body = await readJsonBody(req, 2_048);
  if (body instanceof Response) return body;
  if (!isRecord(body)) return jsonError("Invalid request", 400);

  const systolic = body.systolic;
  const diastolic = body.diastolic;
  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic) ||
      (systolic as number) < 40 || (systolic as number) > 300 ||
      (diastolic as number) < 20 || (diastolic as number) > 200) {
    return jsonError("Enter a valid blood-pressure reading", 400);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Narrator is temporarily unavailable", 503);
  try {
    // Only the two numeric values needed for the narrative leave the application.
    // Age, goals, profile context, medication adherence, and identity are excluded.
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Blood-pressure reading: ${systolic}/${diastolic} mmHg.` },
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