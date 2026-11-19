import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, isRecord, jsonError, readJsonBody } from "@/lib/api-security";

const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, and empathetic.
Do not prescribe, change, or recommend a medication dose. Do not tell a user to take or skip a dose.
For a missed dose, advise following the medication leaflet or contacting a pharmacist/prescriber for medicine-specific instructions.
For dizziness, advise sitting or lying safely and seeking urgent help for fainting, chest pain, severe breathlessness, weakness, or severe symptoms.
Maximum 2 sentences. Be brief, supportive, and safe.`;
const ALLOWED_REASONS = new Set(["Forgot", "Ran out", "Felt dizzy"]);

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = enforceRateLimit(`meds-followup:${auth.user.id}`, 6);
  if (limited) return limited;
  const body = await readJsonBody(req, 1_024);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body.reason !== "string" || !ALLOWED_REASONS.has(body.reason)) {
    return jsonError("Select a valid missed-dose reason", 400);
  }
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Companion is temporarily unavailable", 503);

  try {
    // Transmit only a fixed reason category; never send identity, medicine name, dose, or record.
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Missed-dose category: ${body.reason}.` },
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