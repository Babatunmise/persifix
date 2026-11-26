import { NextRequest } from "next/server";
import { extractConfirmedIngredientText, extractStructuredConfirmedIngredients, isIngredientConfirmed } from "@/lib/ingredient-confirmation.mjs";
import {
  authenticateRequest,
  enforceRateLimit,
  isRecord,
  jsonError,
  readJsonBody,
  safeString,
  redactDirectIdentifiers,
} from "@/lib/api-security";

type Turn = { role: "user" | "assistant"; content: string };

const SENSITIVE_CONTEXT = /\b(?:blood pressure|high blood pressure|low blood pressure|\bbp\b|hypertension|hypertensive|hypotension|hypotensive|medication|medicines|prescription|insulin|warfarin|blood thinner|anticoagulant|glp[- ]?1|diagnos(?:is|ed)|allerg(?:y|ies|ic)|intoleran(?:ce|t)|kidney disease|renal disease|dialysis|liver disease|hepatitis|diabetes|type 1 diabetes|type 2 diabetes|pre[- ]?diabetes|blood sugar|high cholesterol|heart failure|heart disease|cardiovascular|stroke|gout|celiac|coeliac|crohn(?:'s)?|ulcerative colitis|irritable bowel syndrome|ibs|autoimmune|immunocompromised|cancer|chemotherapy|eating disorder|anorexia|bulimia|pregnan(?:t|cy)|breastfeed(?:ing)?|medical condition|medical history|health condition|symptom(?:s)?|disease|disorder|doctor|physician|clinician|dietitian|nurse|hospital|clinic|prescribed|treatment|therapy|surgery|chronic|acute|doctor told me|low[- ]?sodium|low[- ]?salt diet|sodium restriction|salt restriction)\b/i;

const SYSTEM_PROMPT = `You are Ahuva, the food companion inside Sanctos.
Your role is to help users enjoy the meal they want while making practical choices that better align with the DASH (Dietary Approaches to Stop Hypertension) eating pattern.
The user has provided, in this order: the meal they want to eat, ingredients they confirm having, seasonings and flavourings they use (including salt, stock cubes, seasoning blends, sauces, herbs and spices), and the number of servings.
Start from the user's chosen meal. Do not replace it with unrelated meal suggestions. Work out how to prepare or adapt that meal using the ingredients they actually have.
Use the seasoning information deliberately: identify likely concentrated sources of sodium such as salt, stock cubes, seasoning blends, sauces and packaged marinades. Without shaming the user or claiming exact sodium values, suggest practical DASH-supportive adjustments where appropriate, such as reducing added salt, using less stock or sauce, choosing lower-sodium alternatives when available, and building flavour with herbs, spices, citrus, garlic, onion or other suitable aromatics.
DASH guidance should be balanced and practical: encourage vegetables, fruits, whole grains, beans and other legumes, nuts and seeds, and appropriate lean proteins where they naturally fit the meal. Consider saturated fat and highly processed ingredients. Do not turn every dish into a different dish or imply that salt must always be eliminated.
Use only ingredients explicitly confirmed as available. Clearly label additions not in the user's list as missing or optional; never imply they are available. If an essential ingredient is missing or the user's information is unclear, ask the minimum necessary clarification rather than inventing availability.
Do not assume a particular cuisine, country, or food culture. Respect familiar food traditions and the user's preferences. Be practical, culturally adaptable, non-judgmental, and concise.
Ahuva must feel like a thoughtful cooking partner, not a form, checklist, or report. Contribute to the user's chosen meal and build it with them one useful move at a time.
COOKING MODE:
- In "your-way" mode, preserve the user's familiar method and dish. Offer small, optional DASH-supportive adjustments; do not take over.
- In "ahuvas-way" mode, propose a more DASH-aligned preparation approach, explaining the meaningful changes while preserving the identity and flavour direction of the chosen meal.
- Never silently change the selected mode or imply the user chose a mode they did not select.
INGREDIENT INTELLIGENCE:
- Treat ingredient knowledge as a distinct educational layer, not as invented recipe prose.
- Explain relevant constituents (for example sodium, potassium, saturated fat, omega-3 fatty acids) and established biological pathways only when supported by reliable evidence.
- Explain ingredient-ingredient or nutrient-nutrient interactions only when there is credible evidence; distinguish direct biochemical interaction, whole-diet interaction, and simple co-occurrence.
- Do not infer the composition of a spice blend, stock cube, sauce, oil, or packaged seasoning from its name. Ask for its label or composition only when it materially changes the guidance.
- Do not claim that a single food treats hypertension or predict a person's blood-pressure response.
- Do not generate ingredient intelligence from memory. The application should display clinically reviewed knowledge-base entries separately from AI-generated cooking suggestions.
CONVERSATION RULES:
- First demonstrate that you understood the exact dish the user named. Do not reinterpret a recognisable dish as an unclear ingredient list.
- The structured meal brief is authoritative. It separately identifies the intended meal, confirmed available ingredients, seasonings and serving count. Read each field according to its label.
- Never ask whether the user has an ingredient already listed under confirmed available ingredients. Never ask the user to repeat information already present in the brief or conversation.
- Do not confuse the name of a dish with its inventory. A named dish can include components that are not confirmed as available; use the confirmed inventory field to establish availability.
- Ask at most ONE concise, high-value clarification question in a turn. Ask only when its answer would materially change the preparation or safety of the meal. If the available information is sufficient, proceed without a question.
- Prefer one useful contribution over several generic suggestions. Explain briefly why it helps this particular meal.
- Do not produce a long introductory explanation, repeat the entire ingredient list in prose, or narrate your internal reasoning.
- If clarification is needed, acknowledge the meal, briefly state what you can already do, then ask the single question. Do not produce a full preparation plan until the essential uncertainty is resolved.
- If ready, give a short, inviting opening and a practical preparation plan. Keep the user's original dish recognisable.
- Keep safety notes specific to a real issue in this meal. Do not append generic disclaimers.
Provide concise preparation guidance and quantities for the selected serving count. The serving count is authoritative and must be respected.
Do not claim to calculate exact nutrient or sodium values. Do not provide diagnoses, treatment advice, or medical suitability claims. If the user asks for medical dietary advice, say that this feature cannot assess that safely and suggest discussing it with their qualified care professional.
Return ONLY valid JSON with this schema:
{
  "status": "ready" | "needs_clarification",
  "assistantMessage": "string",
  "interpretation": "string",
  "questions": ["string"],
  "recommendations": [],
  "plan": {
    "servings": "string",
    "preparation": ["string"],
    "ingredients": [{"name":"string","amount":"string","availability":"available"|"missing"|"optional"}]
  } | null,
  "safetyNotes": ["string"]
}
Use no recommendations unless a small number of clearly relevant alternatives or optional improvements genuinely help. Use at most 8 preparation steps, 30 ingredients, 4 questions. Keep all strings concise.`;

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
  if (!Array.isArray(value.questions) || value.questions.length > 1 ||
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
  const validServings = isRecord(body) &&
    ((typeof body.servings === "number" && Number.isInteger(body.servings) && body.servings >= 1 && body.servings <= 8) ||
      (typeof body.servings === "string" && (/^[1-8]$/.test(body.servings) || body.servings === "8+")));

  if (!isRecord(body) ||
      (body.intent !== "meal" && body.intent !== "ingredients") ||
      (body.mode !== "your-way" && body.mode !== "ahuvas-way") ||
      !safeString(body.details, 2_000) ||
      !validServings ||
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

  const safeDetails = redactDirectIdentifiers(body.details.trim());

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

  const userProvidedText = [
    safeDetails,
    ...conversation.filter((turn, index) => turn.role === "user" && index > 0).map((turn) => turn.content),
  ].filter(Boolean).join("\n");
  const confirmedIngredientText =
    extractStructuredConfirmedIngredients(safeDetails) ??
    extractConfirmedIngredientText(body.intent, safeDetails, conversation);
  const context = [
    "Task: help the user prepare the meal they asked for, with practical DASH-aligned adjustments.",
    `User's meal, confirmed ingredients, seasonings and serving count: ${safeDetails}`,
    `Cooking preference selected by the user: ${body.mode === "ahuvas-way" ? "Ahuva’s way — propose a more DASH-aligned approach" : "Your way — preserve the familiar method and offer optional adjustments"}.`,
    "Pay particular attention to salt, stock cubes, seasoning blends and sauces as potential sodium sources. Preserve the chosen meal where practical.",
  ].join("\n");

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
          ...conversation.slice(1),
        ],
        response_format: { type: "json_object" },
        stream: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const status = response.status;
      const category =
        status === 401 || status === 403 ? "provider_auth_rejected" :
        status === 429 ? "provider_rate_limited" :
        status >= 500 ? "provider_server_error" :
        "provider_request_rejected";
      // Log only the provider status and a fixed category. Never log request
      // content, response bodies, credentials, or provider error messages.
      console.error("[ahuva] DeepSeek request failed", { category, status });
      return jsonError("Ahuva could not respond just now. Please try again.", 502);
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      console.error("[ahuva] DeepSeek returned invalid JSON", { category: "provider_invalid_json" });
      return jsonError("Ahuva returned an incomplete response. Please try again.", 502);
    }
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

    // Never label an ingredient as available unless the user explicitly named it.
    if (parsed.plan) {
      // The selected serving count is authoritative; do not let the model drift.
      parsed.plan.servings = String(body.servings);
      parsed.plan.ingredients = parsed.plan.ingredients.map((ingredient) =>
        ingredient.availability === "available" && !isIngredientConfirmed(
          ingredient.name,
          confirmedIngredientText ?? "",
          userProvidedText,
        )
          ? { ...ingredient, availability: "missing" as const }
          : ingredient,
      );
    }

    return Response.json(parsed);
  } catch (error) {
    const category = error instanceof Error && error.name === "TimeoutError"
      ? "provider_timeout"
      : error instanceof Error && error.name === "AbortError"
        ? "provider_aborted"
        : "provider_network_error";
    // Error messages can contain request or transport details; log only a
    // fixed category and do not serialize the error object.
    console.error("[ahuva] DeepSeek transport failed", { category });
    return jsonError("Ahuva is temporarily unavailable. Please try again.", 502);
  }
}
