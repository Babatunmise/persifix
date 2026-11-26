import { NextRequest } from "next/server";

export const maxDuration = 60;
import { extractConfirmedIngredientText, extractStructuredConfirmedIngredients, isIngredientConfirmed } from "@/lib/ingredient-confirmation.mjs";
import { normalizeAhuvaResult } from "@/lib/ahuva-response-contract.mjs";
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
COOKING MODE — THESE ARE TWO DIFFERENT USER EXPERIENCES:
- In "your-way" mode, the user remains the cook and decision-maker. Preserve their familiar method and dish. Do not automatically generate a recipe, preparation sequence, or cooking workspace. Return plan: null unless the user explicitly asks for guided cooking steps. Focus on understanding the meal, explaining relevant ingredients and offering concise, optional adjustments. Do not turn an ingredient question into a recipe.
- In "ahuvas-way" mode, take a more active role. Propose a more DASH-aligned preparation approach, explain the meaningful changes, distinguish confirmed ingredients from suggested additions, and provide a practical preparation plan.
- If a user in "your-way" mode explicitly asks to see cooking steps, provide them while preserving their stated method. Do not silently switch them to "ahuvas-way".
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
- If ready in "your-way" mode and the user has not explicitly requested guided steps, give a concise meal-focused response and set plan to null. If ready in "ahuvas-way" mode, provide a practical preparation plan. If the user explicitly requests guided steps in either mode, provide them without changing the selected mode. Keep the user's original dish recognisable.
- Keep safety notes specific to a real issue in this meal. Do not append generic disclaimers.
Provide concise preparation guidance and quantities for the selected serving count. The serving count is authoritative and must be respected.
Do not claim to calculate exact nutrient or sodium values. Do not provide diagnoses, treatment advice, or medical suitability claims. If the user asks for medical dietary advice, say that this feature cannot assess that safely and suggest discussing it with their qualified care professional.
Return ONLY one valid JSON object. Do not add markdown or text outside the object.
Use exactly these keys and value types:
{
  "status": "ready" or "needs_clarification",
  "assistantMessage": "A concise user-facing message, required and non-empty",
  "interpretation": "A concise description of the meal understood, or an empty string",
  "questions": ["Zero or one concise clarification question"],
  "recommendations": [{"title":"Short title","detail":"Short explanation"}],
  "plan": null or {
    "servings": "Serving count as text",
    "preparation": ["Preparation step"],
    "ingredients": [{"name":"Ingredient","amount":"Amount or empty string","availability":"available" or "missing" or "optional"}]
  },
  "safetyNotes": ["Specific, relevant safety note"]
}
All keys must be present. Use empty arrays when there is nothing to add. Use plan:null for your-way unless the user explicitly requests guided cooking steps. For needs_clarification, include exactly one question and do not provide a full preparation plan. For ready responses, questions must be empty. Recommendations must be objects with both title and detail, never plain strings. Use at most 8 preparation steps, 30 ingredients, 3 recommendations and 4 safety notes. Keep strings concise. Never mark an ingredient available unless it appears in the confirmed inventory; the server independently checks this too.`;

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
      assistantMessage: "Ahuva’s guided cooking conversation is not connected yet. You can still explore the source-linked ingredient notes below.",
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
    `Cooking preference selected by the user: ${body.mode === "ahuvas-way" ? "Ahuva’s way — propose a more DASH-aligned approach and a guided preparation plan" : "Your way — preserve the familiar method; do not return preparation steps unless the user explicitly requests them"}.`,
    "Pay particular attention to salt, stock cubes, seasoning blends and sauces as potential sodium sources. Preserve the chosen meal where practical.",
  ].join("\n");

  try {
    const providerRequest = {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-flash",
        thinking: { type: "disabled" },
        max_tokens: 2600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
          ...conversation.slice(1),
        ],
        response_format: { type: "json_object" },
        stream: false,
      }),
    };

    // Retry one transient provider/network failure. Do not retry authentication,
    // invalid-request, or rate-limit responses.
    let response: Response | null = null;
    let transportError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch("https://api.deepseek.com/chat/completions", {
          ...providerRequest,
          signal: AbortSignal.timeout(25_000),
        });
        if (response.ok || ![408, 500, 502, 503, 504].includes(response.status) || attempt === 1) {
          break;
        }
        console.warn("[ahuva] transient provider response; retrying once", {
          category: "provider_transient_http",
          status: response.status,
          attempt: attempt + 1,
        });
      } catch (error) {
        transportError = error;
        if (attempt === 1) throw error;
        console.warn("[ahuva] transient provider transport failure; retrying once", {
          category: error instanceof Error && error.name === "TimeoutError"
            ? "provider_timeout"
            : "provider_network_error",
          attempt: attempt + 1,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    if (!response) throw transportError ?? new Error("Provider request did not return a response");

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
    if (!isRecord(data) || "error" in data || !Array.isArray(data.choices) ||
        !isRecord(data.choices[0]) || !isRecord(data.choices[0].message)) {
      console.error("[ahuva] provider returned an invalid completion envelope", {
        category: "provider_invalid_completion",
      });
      return jsonError("Ahuva could not complete the cooking response.", 502);
    }
    if (data.choices[0].finish_reason === "length") {
      console.error("[ahuva] provider output reached its token limit", {
        category: "provider_output_truncated",
      });
      return jsonError("Ahuva’s response was incomplete. Please try again.", 502);
    }
    if (!safeString(data.choices[0].message.content, 8_000)) {
      const firstChoice = data.choices[0];
      const firstMessage = firstChoice.message;
      const contentType = firstMessage.content === null ? "null" : typeof firstMessage.content;
      const finishReason = typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : "unknown";
      const refusalPresent = typeof firstMessage.refusal === "string" && firstMessage.refusal.length > 0;
      const reasoningLength = typeof firstMessage.reasoning_content === "string" ? firstMessage.reasoning_content.length : 0;
      console.warn("[ahuva] provider returned an empty completion; retrying once", {
        category: "provider_empty_completion",
        finishReason,
        contentType,
        refusalPresent,
        reasoningLength,
      });

      // A successful HTTP response can still contain an empty model completion.
      // Retry that case once, without exposing provider content or user data.
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const retryResponse = await fetch("https://api.deepseek.com/chat/completions", {
          ...providerRequest,
          signal: AbortSignal.timeout(25_000),
        });
        if (retryResponse.ok) {
          const retryData: unknown = await retryResponse.json();
          if (isRecord(retryData) && Array.isArray(retryData.choices) &&
              isRecord(retryData.choices[0]) && isRecord(retryData.choices[0].message) &&
              safeString(retryData.choices[0].message.content, 8_000)) {
            data = retryData;
          } else {
            console.error("[ahuva] provider retry also returned no usable completion", {
              category: "provider_empty_completion_retry_exhausted",
            });
          }
        } else {
          console.error("[ahuva] provider retry was not successful", {
            category: "provider_retry_http_error",
            status: retryResponse.status,
          });
        }
      } catch (retryError) {
        console.error("[ahuva] provider retry failed", {
          category: retryError instanceof Error && retryError.name === "TimeoutError"
            ? "provider_retry_timeout"
            : "provider_retry_transport_error",
        });
      }
    }

    if (!isRecord(data) || !Array.isArray(data.choices) ||
        !isRecord(data.choices[0]) || !isRecord(data.choices[0].message) ||
        !safeString(data.choices[0].message.content, 8_000)) {
      console.error("[ahuva] provider returned no usable completion after retry", {
        category: "provider_empty_completion_final",
      });
      return jsonError("Ahuva couldn’t finish that response. Your meal is still here—please try once more.", 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch {
      console.error("[ahuva] response contract rejected", { category: "invalid_json_body" });
      return jsonError("Ahuva returned an unreadable response. Please try again.", 502);
    }
    const latestUserMessage = conversation.filter((turn) => turn.role === "user").at(-1)?.content ?? "";
    const explicitlyRequestedSteps =
      /(?:show|give|provide|walk me through|guide me through).{0,80}\b(?:steps|instructions|recipe|preparation)\b/i.test(latestUserMessage);
    const contractInput = body.mode === "your-way" && !explicitlyRequestedSteps && isRecord(parsed)
      ? { ...parsed, plan: null }
      : parsed;
    const normalized = normalizeAhuvaResult(contractInput, {
      requirePlan: body.mode === "ahuvas-way" || explicitlyRequestedSteps,
    });
    if (!normalized.ok) {
      // Diagnostic reason is a fixed enum from the normalizer. Never log model
      // output, user meal details, or health-related content.
      console.error("[ahuva] response contract rejected", {
        category: "response_contract_rejected",
        reason: normalized.reason,
      });
      return jsonError("Ahuva could not organise its cooking response. Please try again.", 502);
    }
    const result = normalized.value;

    // Never label an ingredient as available unless the user explicitly named it.
    if (result.plan) {
      // The selected serving count is authoritative; do not let the model drift.
      result.plan.servings = String(body.servings);
      result.plan.ingredients = result.plan.ingredients.map((ingredient) =>
        ingredient.availability === "available" && !isIngredientConfirmed(
          ingredient.name,
          confirmedIngredientText ?? "",
          userProvidedText,
        )
          ? { ...ingredient, availability: "missing" as const }
          : ingredient,
      );
    }

    return Response.json(result);
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
