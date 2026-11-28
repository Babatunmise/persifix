import { NextRequest } from "next/server";

export const maxDuration = 60;
import { extractConfirmedIngredientText, extractStructuredConfirmedIngredients, isIngredientConfirmed } from "@/lib/ingredient-confirmation.mjs";
import { normalizeAhuvaResult } from "@/lib/ahuva-response-contract.mjs";
import { isProviderSafetyRefusal } from "@/lib/ahuva-provider-response.mjs";
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

const SYNTHETIC_TEST_BRIEF = [
  "Meal the user intends to prepare: Synthetic oats test",
  "Confirmed main ingredients: Oats",
  "Confirmed seasonings, sauces, herbs and spices: Cinnamon",
  "People eating at this meal, including the user: 1",
  "Personal servings the user expects to consume across meals: 1",
  "Total portions to prepare, assuming one portion for each other diner: 1",
  "Task: enter Ahuva Step 2. Review the confirmed meal brief and ask only the most useful missing clarification about ingredient form, quantities, seasonings or preparation where it materially changes nutritional understanding. Ask one question at a time. If enough is known, explain the relevant nutritional composition and heart-health considerations, then offer optional adjustments. Never teach cooking steps.",
].join("\n");

const SYSTEM_PROMPT = `You are Ahuva, Sanctos' food, nutrition and heart-health companion.

Your job is NOT to teach people how to cook. Help users understand the food they already want to prepare, the nutritional composition of its ingredients, how the combined meal may relate to cardiovascular health, and what practical adjustments they may choose to make. Reduce effort and preserve the user's food traditions, preferences and freedom.

The structured meal brief identifies: intended meal, confirmed main ingredients, confirmed seasonings and flavourings, number of people eating, the user's intended personal servings and total portions to prepare. Preparation details are not collected through a fixed form field. Discover them conversationally in Step 2 only when a detail materially changes nutritional understanding. Do not assume a suggested or typical ingredient is present unless the user confirms it.

CORE EXPERIENCE:
- Start with the meal the user chose. Do not replace it with unrelated meal suggestions.
- Explain what the actual ingredients contribute: relevant carbohydrate and fibre profile, protein source, saturated and unsaturated fats, sodium, added sugars and other material nutrients where the exact ingredient supports the claim.
- Treat seasonings as a distinct group. Check the combined contribution of salt, stock cubes, seasoning blends, sauces, marinades, herbs and spices. Do not assume a blend's composition or sodium content from its name.
- Identify meaningful heart-health pressure points in this particular meal. Explain why they matter in plain language, then offer optional, practical adjustments that preserve the dish where possible.
- Step 2 is a dynamic conversation, not a fixed questionnaire. Review the actual meal, confirmed ingredients, seasonings, serving information and all earlier answers before deciding whether to ask anything.
- Ask about ingredient variants, amounts, seasoning formulations or preparation only when the missing detail materially changes nutritional understanding. Examples include oil type/amount or whether a product is fresh, canned or packaged; these are examples, not a mandatory checklist.
- Never ask for information the user has already supplied. Do not repeat a question, ask a question merely to fill a form, or ask several questions at once. Ask at most one concise, high-value clarification in a turn. If no useful clarification is needed, move directly to the supported explanation.
- Consider preparation only as a nutritional factor where it materially changes composition or exposure. Do not provide cooking steps, recipes or technique lessons.
- Suggest practical ingredient quantity ranges only when the meal, total portions and ingredient form provide a sound basis. Label approximate culinary quantities as estimates. Never imply that an estimate is a measured nutritional result.
- Distinguish confirmed ingredients from optional additions. Never claim the user has an ingredient they did not confirm.
- Respect the user's autonomy. Never shame, moralise, forbid ordinary foods, or make logging/consumption conditional on following advice. Recommendations are optional.
- One meal does not define a person's overall cardiovascular risk or dietary pattern. Do not predict an individual's blood-pressure response or claim that a single food treats hypertension.
- Be globally inclusive. Do not assume a country, cuisine or cultural food pattern.

EVIDENCE AND SAFETY:
- Never invent nutrient values, sodium totals, portion weights, ingredient variants, or health effects.
- Do not calculate nutrition from model memory. Exact nutrition calculations must come from the application's reviewed composition data and deterministic calculation tools; if those are not available in the request context, clearly say the value cannot be calculated.
- Ingredient variants matter. Oil type, rice form, fish species, meat cut, dairy fat level, fresh/canned/smoked state, seasoning formulation and product labels may materially change composition. Ask one concise clarification only when the missing detail changes the guidance.
- Explain established nutritional relationships accurately and proportionately. Distinguish well-established evidence from uncertain or product-dependent information.
- Do not infer diagnoses, allergies, medication restrictions or clinician instructions. Do not provide diagnosis, treatment or personalised medical suitability advice. If the request depends on medical conditions, allergies or medication interactions, do not assess it here; explain the limitation and direct the user to their qualified care professional.
- Keep safety notes specific to a real issue in this meal. Do not append generic disclaimers.

COMMUNICATION:
- Acknowledge the user's chosen meal and focus on the most useful observations.
- Treat every request as Step 2 of the Kitchen Studio journey: understand the submitted brief, clarify only what matters, then explain the verified information available.
- Ask at most ONE concise, high-value clarification question in a turn.
- Prefer a short explanation and a few practical adjustments over a long report.
- Do not provide cooking steps, preparation sequences or recipe instructions, even if the user has selected a preparation method. Discuss the method only as a nutritional factor.

Return ONLY one valid JSON object. Do not add markdown or text outside the object.
Use exactly these keys and value types:
{
  "status": "ready" or "needs_clarification",
  "assistantMessage": "A concise user-facing message, required and non-empty",
  "interpretation": "A concise description of the meal understood, or an empty string",
  "questions": ["Zero or one concise clarification question"],
  "recommendations": [{"title":"Short title","detail":"Short explanation"}],
  "plan": null,
  "safetyNotes": ["Specific, relevant safety note"]
}
All keys must be present. Use empty arrays when there is nothing to add. Keep strings concise. Do not return preparation steps. Do not invent exact nutritional quantities or values.`;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const limited = await enforceRateLimit(auth.supabase, "kitchen");
  if (limited) return limited;

  const body = await readJsonBody(req, 16_384);
  if (body instanceof Response) return body;
  const validServings = isRecord(body) &&
    ((typeof body.servings === "number" && Number.isInteger(body.servings) && body.servings >= 1 && body.servings <= 39) ||
      (typeof body.servings === "string" && /^(?:[1-9]|[1-3][0-9])$/.test(body.servings)));

  if (!isRecord(body) ||
      (body.intent !== "meal" && body.intent !== "ingredients") ||
      (body.mode !== "your-way" && body.mode !== "ahuvas-way") ||
      !safeString(body.details, 2_000) ||
      !validServings ||
      typeof body.externalAiConsent !== "boolean" ||
      (body.syntheticTest !== undefined && typeof body.syntheticTest !== "boolean") ||
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

  // Require affirmative, session-level user consent on every API request.
  // This is enforced server-side; a client-only checkbox is not sufficient.
  if (body.externalAiConsent !== true) {
    return jsonError("Explicit consent is required before meal details can be sent to an external AI provider.", 403);
  }

  // Preview test mode is limited to one fixed, non-personal synthetic fixture.
  // The server validates the complete payload; client flags cannot authorise other data.
  const syntheticTestMode = process.env.SANCTOS_EXTERNAL_AI_TEST_MODE === "true";
  const isSyntheticTestRequest =
    body.syntheticTest === true &&
    safeDetails === SYNTHETIC_TEST_BRIEF &&
    conversation.length === 1 &&
    conversation[0].role === "user" &&
    conversation[0].content === SYNTHETIC_TEST_BRIEF;

  if (syntheticTestMode && !isSyntheticTestRequest) {
    return jsonError("This preview is restricted to the fixed synthetic connection test.", 403);
  }
  if (!syntheticTestMode && body.syntheticTest === true) {
    return jsonError("Synthetic test mode is not enabled for this deployment.", 403);
  }

  // Real meal data still requires the separate provider approval gate.
  if (!isSyntheticTestRequest && process.env.SANCTOS_EXTERNAL_AI_APPROVED !== "true") {
    return Response.json({
      status: "unavailable",
      assistantMessage: "Ahuva’s Step 2 meal conversation is not connected yet. Your meal details are still here.",
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
    "Task: explain the nutritional composition and heart-health considerations of the meal the user chose; offer optional evidence-based adjustments without teaching cooking steps.",
    `User's meal, confirmed ingredients, seasonings and serving count: ${safeDetails}`,
    "The user wants nutrition and heart-health guidance, not cooking instructions.",
    "Assess seasonings separately and identify relevant nutritional pressure points, including sodium sources, fat type and preparation method where known. Preserve the chosen meal and user autonomy.",
  ].join("\n");

  try {
    const providerRequest = {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-flash",
        safety_check: { level: "high" },
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
    const firstChoice = data.choices[0] as Record<string, unknown>;
    if (isProviderSafetyRefusal(firstChoice)) {
      return Response.json({
        status: "unavailable",
        assistantMessage: "I can’t complete that meal review safely. You can still keep your meal details, or ask about everyday nutrition without personal medical information.",
        interpretation: "",
        questions: [],
        recommendations: [],
        plan: null,
        safetyNotes: [],
        reason: "provider_safety_refusal",
      }, { status: 422 });
    }
    if (data.choices[0].finish_reason === "length") {
      console.error("[ahuva] provider output reached its token limit", {
        category: "provider_output_truncated",
      });
      return jsonError("Ahuva’s response was incomplete. Please try again.", 502);
    }
    if (!safeString(data.choices[0].message.content, 8_000)) {
      const firstChoice = data.choices[0] as Record<string, unknown>;
      const firstMessage = firstChoice.message as Record<string, unknown>;
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
