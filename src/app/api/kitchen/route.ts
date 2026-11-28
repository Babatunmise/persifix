import { NextRequest } from "next/server";

export const maxDuration = 60;
import { extractConfirmedIngredientText, extractStructuredConfirmedIngredients, isIngredientConfirmed } from "@/lib/ingredient-confirmation.mjs";
import { normalizeAhuvaResult } from "@/lib/ahuva-response-contract.mjs";
import { isProviderSafetyRefusal } from "@/lib/ahuva-provider-response.mjs";
import { getPrimaryIngredientQuantityClarification, getApprovedSyntheticTestFixture, isApprovedSyntheticTestBrief, isApprovedSyntheticTestFollowup, isSyntheticAhuvaTestRequest } from "@/lib/ahuva-conversation-policy.mjs";
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

const SYSTEM_PROMPT = `You are Ahuva, Sanctos' food, nutrition and heart-health companion.

Help users understand the meal they have chosen, its ingredients and seasonings, relevant nutritional characteristics, and optional practical adjustments. Do not teach cooking steps or replace the user's chosen meal.

Review the complete meal brief and conversation before responding. Follow a clarification-first conversation: if a material ingredient quantity, form or formulation is unknown, set status to "needs_clarification", ask exactly one concise question, and do not present a meal-level nutritional assessment or practical adjustments yet. Prioritise the amount of the main ingredient when no quantity is supplied; accept familiar household measures. After the user answers, retain that answer and ask only the next most useful missing detail, if one remains. Never repeat a question, bundle questions, or assume unconfirmed ingredients are present. If the user cannot provide a detail, acknowledge the uncertainty and proceed only with appropriately limited qualitative information.

Discuss relevant nutrition such as fibre, carbohydrate, protein, sodium, added sugars, and fat quality only when supported by the known ingredients. Seasonings, sauces and packaged products may have materially different formulations; do not infer their contents from their names.

Never invent nutrient values, sodium totals, portion weights, ingredient variants or health effects. Do not calculate nutrition from model memory. Exact nutrient calculations must come from reviewed food-composition data and deterministic application calculations. If those are unavailable, say so clearly.

Keep observations proportionate. One meal does not establish a person's overall health or predict an individual's response. Preserve food traditions, preferences and autonomy. Never shame, moralise, forbid ordinary foods or make recommendations compulsory. Be globally inclusive.

Do not diagnose, prescribe, or make personalised medical-suitability decisions. If a request requires individual clinical judgement, explain that the application cannot assess it and direct the user to a qualified care professional. Do not infer personal health facts or clinician instructions.

Return ONLY one valid json object with exactly these keys and value types:
{
  "status": "ready" or "needs_clarification",
  "assistantMessage": "A concise user-facing message, required and non-empty",
  "interpretation": "A concise description of the meal understood, or an empty string",
  "questions": ["Zero or one concise clarification question"],
  "recommendations": [{"title":"Short title","detail":"Short explanation"}],
  "plan": null,
  "safetyNotes": ["Specific, relevant safety note"]
}
Use empty arrays when there is nothing to add. Keep strings concise. Do not return preparation steps or exact nutritional quantities that have not been calculated by the application.`;

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

  // Preview test mode accepts only the finite, exact synthetic fixture set.
  // The server validates the complete payload; client flags cannot authorise other data.
  const syntheticTestMode = process.env.SANCTOS_EXTERNAL_AI_TEST_MODE === "true";
  const syntheticFixture = getApprovedSyntheticTestFixture(safeDetails);
  const syntheticDetailsMatch = isApprovedSyntheticTestBrief(safeDetails);
  const syntheticConversationMatch = isSyntheticAhuvaTestRequest(safeDetails, conversation);
  const isSyntheticTestRequest =
    body.syntheticTest === true &&
    syntheticConversationMatch;

  if (syntheticTestMode && !isSyntheticTestRequest) {
    const diagnostic = !syntheticDetailsMatch
      ? "approved_meal_brief_mismatch"
      : !syntheticConversationMatch
        ? conversation.length === 1
          ? "initial_test_turn_mismatch"
          : conversation.length === 3
            ? "followup_test_turn_mismatch"
            : "unexpected_conversation_length"
        : "synthetic_test_flag_missing";
    console.warn("[ahuva] synthetic Preview request rejected", {
      category: "synthetic_test_validation_failed",
      diagnostic,
      detailsMatch: syntheticDetailsMatch,
      conversationLength: conversation.length,
      firstTurnRole: conversation[0]?.role ?? "missing",
      firstTurnMatchesBrief: conversation[0]?.content === safeDetails,
      secondTurnRole: conversation[1]?.role ?? "missing",
      thirdTurnRole: conversation[2]?.role ?? "missing",
      followupMatchesApprovedReply: Boolean(syntheticFixture?.followup && isApprovedSyntheticTestFollowup(conversation[2]?.content, syntheticFixture ?? undefined)),
      syntheticFlag: body.syntheticTest === true,
    });
    return Response.json({
      error: "The synthetic test was rejected by the Preview safety gate.",
      diagnostic,
      checks: {
        approvedMealBriefMatched: syntheticDetailsMatch,
        conversationLength: conversation.length,
        firstTurnMatchedApprovedBrief: conversation[0]?.content === safeDetails,
        followupMatchedApprovedReply: conversation.length === 3 && Boolean(syntheticFixture?.followup) && isApprovedSyntheticTestFollowup(conversation[2]?.content, syntheticFixture ?? undefined),
        syntheticTestFlagPresent: body.syntheticTest === true,
      },
    }, { status: 403 });
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

  // Ask for the primary ingredient quantity before generating meal-level guidance.
  // This narrow deterministic clarification does not calculate or estimate nutrients.
  const quantityClarification = getPrimaryIngredientQuantityClarification(safeDetails, conversation);
  if (quantityClarification) {
    return Response.json({
      status: "needs_clarification",
      assistantMessage: quantityClarification.assistantMessage,
      interpretation: "",
      questions: [quantityClarification.question],
      recommendations: [],
      plan: null,
      safetyNotes: [],
    });
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
        // DeepSeek does not support JSON response_format together with safety_check.
        // Keep the provider safety review enabled and enforce JSON through the system prompt + parser.
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
      let providerErrorType = "unknown";
      let providerErrorCode = "unknown";
      let providerErrorParam = "none";
      let contentRiskRejected = false;
      let providerDiagnostic = "unclassified";
      let safeProviderMessage = "";
      try {
        const errorBody: unknown = await response.clone().json();
        if (isRecord(errorBody) && isRecord(errorBody.error)) {
          const providerError = errorBody.error;
          if (typeof providerError.type === "string") providerErrorType = providerError.type.slice(0, 80);
          if (typeof providerError.code === "string") providerErrorCode = providerError.code.slice(0, 80);
          const allowedParams = ["model", "messages", "thinking", "max_tokens", "response_format", "safety_check", "stream", "temperature", "top_p", "frequency_penalty", "presence_penalty"];
          if (typeof providerError.param === "string" && allowedParams.includes(providerError.param)) {
            providerErrorParam = providerError.param;
          }
          const rawProviderMessage = typeof providerError.message === "string" ? providerError.message : "";
          safeProviderMessage = rawProviderMessage.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").slice(0, 240);
          const providerMessage = rawProviderMessage.toLowerCase();
          contentRiskRejected =
            /content exists risk|content risk/i.test(providerMessage) ||
            /content[_ -]risk/i.test(providerErrorCode);
          if (contentRiskRejected) {
            providerDiagnostic = "content_risk";
          } else if (/json.*(prompt|word)|prompt.*json/.test(providerMessage)) {
            providerDiagnostic = "json_mode_prompt_requirement";
          } else if (/model.*(not found|invalid|unavailable)|invalid.*model/.test(providerMessage)) {
            providerDiagnostic = "model_rejected";
          } else if (/context length|maximum context|too many tokens/.test(providerMessage)) {
            providerDiagnostic = "context_length";
          } else if (/unsupported|unknown|extra.*parameter/.test(providerMessage)) {
            const parameter = ["model", "messages", "thinking", "max_tokens", "response_format", "safety_check", "stream"].find((key) =>
              providerMessage.includes(key),
            );
            providerDiagnostic = parameter ? `unsupported_parameter:${parameter}` : "unsupported_parameter";
          } else if (/invalid.*(parameter|field|value)|parameter.*invalid/.test(providerMessage)) {
            const parameter = ["model", "messages", "thinking", "max_tokens", "response_format", "safety_check", "stream"].find((key) =>
              providerMessage.includes(key),
            );
            providerDiagnostic = parameter ? `invalid_parameter:${parameter}` : "invalid_parameter";
          } else if (/message.*(role|content|empty|invalid)|messages.*(role|content|empty|invalid)/.test(providerMessage)) {
            providerDiagnostic = "messages_rejected";
          } else if (/api key|authentication|unauthorized/.test(providerMessage)) {
            providerDiagnostic = "authentication_rejected";
          } else if (providerErrorParam !== "none") {
            providerDiagnostic = `provider_rejected_parameter:${providerErrorParam}`;
          } else if (/invalid request|bad request|request parameter/.test(providerMessage)) {
            providerDiagnostic = "generic_invalid_request";
          } else if (status === 400) {
            providerDiagnostic = "unclassified_bad_request";
          }
        }
      } catch {
        // Keep provider error bodies out of logs; classify only structured metadata.
      }
      const category = contentRiskRejected ? "provider_safety_input_rejected" :
        status === 401 || status === 403 ? "provider_auth_rejected" :
        status === 429 ? "provider_rate_limited" :
        status >= 500 ? "provider_server_error" :
        "provider_request_rejected";
      console.error("[ahuva] DeepSeek request failed", {
        category,
        status,
        providerErrorType,
        providerErrorCode,
        providerErrorParam,
        providerDiagnostic,
      });
      if (contentRiskRejected) {
        return Response.json({
          status: "unavailable",
          assistantMessage: "I can’t complete this review through the provider’s safety check. Your meal details have not been analysed. Please try a simpler everyday-food question without personal health information.",
          interpretation: "",
          questions: [],
          recommendations: [],
          plan: null,
          safetyNotes: [],
          reason: "provider_safety_input_rejected",
        }, { status: 422 });
      }
      return Response.json({
        error: "Ahuva could not complete the provider request.",
        diagnostic: providerDiagnostic,
        provider: {
          status,
          type: providerErrorType,
          code: providerErrorCode,
          parameter: providerErrorParam,
          message: safeProviderMessage,
        },
      }, { status: 502 });
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
