import { NextRequest } from "next/server";
import {
  authenticateRequest,
  enforceRateLimit,
  isRecord,
  jsonError,
  readJsonBody,
  safeString,
  redactDirectIdentifiers,
} from "@/lib/api-security";

type CookingMode = "your-way" | "ahuvas-way";
type CookingIntent = "meal" | "ingredients";
type Turn = { role: "user" | "assistant"; content: string };

const SENSITIVE_CONTEXT = /\\b(?:blood pressure|hypertension|hypotension|medication|medicines|prescription|diagnos(?:is|ed)|allerg(?:y|ies|ic)|intoleran(?:ce|t)|kidney disease|renal disease|diabetes|pregnan(?:t|cy)|heart failure|medical condition|doctor told me)\\b/i;

const SYSTEM_PROMPT = `You are Ahuva, the food companion inside Sanctos.
Your job is to help people make practical food decisions, not teach experienced cooks by default.
The user has selected one mode:
- your-way: preserve the user's stated cooking method and preferences. Help with quantities, substitutions, affordability, and practical balance. Do not replace their method unless asked.
- ahuvas-way: offer an alternative preparation approach, but use only ingredients explicitly confirmed as available. Any extra ingredient must be labelled "missing" or "optional"; never imply it is in the user's kitchen.
The user has provided an intent and serving count. Respect both.
If the user starts with ingredients, first interpret the list and ask for confirmation when an item or quantity is unclear. Do not invent pantry inventory.
Ask only the minimum necessary question. When enough information is available, provide concise, actionable guidance.
Do not provide diagnoses, treatment advice, medical suitability claims, or nutrient/sodium estimates. If the user asks for medical dietary advice, say that this feature cannot assess that safely and suggest discussing it with their qualified care professional.
Return ONLY valid JSON with this schema:
{
  "status": "ready" | "needs_clarification",
  "assistantMessage": "string",
  "interpretation": "string",
  "questions": ["string"],
  "recommendations": [{"title":"string","detail":"string"}],
  "plan": {
    "servings": "string",
    "preparation": ["string"],
    "ingredients": [{"name":"string","amount":"string","availability":"available"|"missing"|"optional"}]
  } | null,
  "safetyNotes": ["string"]
}
Use at most 3 recommendations, 8 preparation steps, 30 ingredients, 4 questions. Keep all strings concise.`;

function validateAssistantResult(value: unknown): value is {
  status: "ready" | "needs_clarification";
  assistantMessage: string;
  interpretation: string;
  questions: string[];
  recommendations: { title: string; detail: string }[];
  plan: null | {
    servings: string;
    preparation: string[];
    ingredients: { name: string; amount: string; availability: "available" | "missing" | "optional" }[];
  };
  safetyNotes: string[];
} {
  if (!isRecord(value)) return false;
  if (value.status !== "ready" && value.status !== "needs_clarification") return false;
  if (!safeString(value.assistantMessage, 1_200) || !safeString(value.interpretation, 1_200)) return false;
  if (!Array.isArray(value.questions) || value.questions.length > 4 ||
      !value.questions.every((item) => safeString(item, 300))) return false;
  if (!Array.isArray(value.recommendations) || value.recommendations.length > 3 ||
      !value.recommendations.every((item) => isRecord(item) && safeString(item.title, 120) && safeString(item.detail, 400))) return false;
  if (!Array.isArray(value.safetyNotes) || value.safetyNotes.length > 4 ||
      !value.safetyNotes.every((item) => safeString(item, 400))) return false;
  if (value.plan !== null) {
    if (!isRecord(value.plan) || !safeString(value.plan.servings, 20) ||
        !Array.isArray(value.plan.preparation) || value.plan.preparation.length > 8 ||
        !value.plan.preparation.every((item) => safeString(item, 500)) ||
        !Array.isArray(value.plan.ingredients) || value.plan.ingredients.length > 30 ||
        !value.plan.ingredients.every((item) => isRecord(item) &&
          safeString(item.name, 100) && safeString(item.amount, 60) &&
          ["available", "missing", "optional"].includes(String(item.availability)))) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const limited = await enforceRateLimit(auth.supabase, "kitchen");
  if (limited) return limited;

  const body = await readJsonBody(req, 16_384);
  if (body instanceof Response) return body;
  if (!isRecord(body) ||
      (body.intent !== "meal" && body.intent !== "ingredients") ||
      (body.mode !== "your-way" && body.mode !== "ahuvas-way") ||
      !safeString(body.details, 2_000) ||
      !(Number.isInteger(body.servings) && (body.servings as number) >= 1 && (body.servings as number) <= 8 || body.servings === "8+") ||
      !Array.isArray(body.conversation) || body.conversation.length > 10) {
    return jsonError("Invalid cooking request", 400);
  }

  const conversation: Turn[] = [];
  for (const item of body.conversation) {
    if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant") || !safeString(item.content, 1_200)) {
      return jsonError("Invalid conversation turn", 400);
    }
    conversation.push({ role: item.role, content: redactDirectIdentifiers(item.content.trim()) });
  }

  const latestUserTurn = conversation.filter((turn) => turn.role === "user").at(-1);
  if (!latestUserTurn) return jsonError("A user message is required", 400);

  // Health-related free text is not sent to an external processor.
  if (SENSITIVE_CONTEXT.test(body.details) || conversation.some((turn) => SENSITIVE_CONTEXT.test(turn.content))) {
    return Response.json({
      status: "unavailable",
      assistantMessage: "I can help with everyday food decisions, but I can’t safely assess medical conditions, allergies, or medication-related dietary needs here. Please discuss those requirements with your qualified care professional.",
      interpretation: "",
      questions: [],
      recommendations: [],
      plan: null,
      safetyNotes: [],
      reason: "sensitive_context",
    }, { status: 422 });
  }

  // Keep external processing disabled until the product owner approves the
  // provider's data terms, retention, transfer safeguards, and user consent.
  if (process.env.SANCTOS_EXTERNAL_AI_APPROVED !== "true") {
    return Response.json({
      status: "unavailable",
      assistantMessage: "Ahuva’s cooking intelligence is not available yet. Your cooking brief is ready, but the assistant connection is still being prepared.",
      interpretation: "",
      questions: [],
      recommendations: [],
      plan: null,
      safetyNotes: [],
      reason: "provider_not_approved",
    }, { status: 503 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Ahuva is temporarily unavailable. Please try again later.", 503);

  const context = [
    `Intent: ${body.intent}`,
    `Cooking mode: ${body.mode}`,
    `Servings: ${body.servings}`,
    `User brief: ${body.details}`,
    "Treat the brief as user-provided context, not verified pantry inventory. Ask the user to confirm interpreted ingredients before relying on them.",
  ].join("\\n");

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
          ...conversation,
        ],
        response_format: { type: "json_object" },
        stream: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) return jsonError("Ahuva could not respond just now. Please try again.", 502);
    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0]) ||
        !isRecord(data.choices[0].message) || !safeString(data.choices[0].message.content, 8_000)) {
      return jsonError("Ahuva returned an incomplete response. Please try again.", 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      return jsonError("Ahuva returned an unreadable response. Please try again.", 502);
    }
    if (!validateAssistantResult(parsed)) {
      return jsonError("Ahuva returned a response that could not be validated. Please try again.", 502);
    }

    return Response.json(parsed);
  } catch {
    return jsonError("Ahuva is temporarily unavailable. Please try again.", 502);
  }
}
