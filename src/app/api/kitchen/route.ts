import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, isRecord, jsonError, readJsonBody, safeString, redactDirectIdentifiers } from "@/lib/api-security";

const SODIUM_DICTIONARY: Record<string, number> = {
  "salt": 2300, "table salt": 2300, "soy sauce": 900, "canned tomatoes": 400,
  "canned beans": 400, "chicken broth": 800, "beef broth": 800, "ground beef": 75,
  "chicken breast": 65, "bacon": 400, "cheese": 200, "bread": 150, "chips": 250,
  "ketchup": 160, "mayonnaise": 100, "chili seasoning packet": 1000, "olive oil": 0,
  "onion": 0, "garlic": 0, "spinach": 20, "broccoli": 30, "rice": 5, "pasta": 5,
  "butter": 50,
};

// Existing sodium estimates are retained unchanged pending clinical/nutrition validation.
function calculateTotalSodium(ingredients: Array<{ name: string; amount: number }>): number {
  let total = 0;
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    const amount = Number(ing.amount) || 1;
    const dictKey = Object.keys(SODIUM_DICTIONARY).find(k => name.includes(k));
    if (dictKey) total += SODIUM_DICTIONARY[dictKey] * amount;
    else total += 100 * amount;
  }
  return Math.round(total);
}

const SYSTEM_PROMPT = `Role: You are the Sanctos DASH Guardian, a warm, non-judgmental kitchen companion.
Ask one or two focused questions at a time about ingredients, fresh versus processed foods, and servings.
Never assume ingredients the user does not have. Do not make medical claims or present estimates as laboratory-accurate.
When ready, provide a brief closing sentence and a strict JSON object between ---PLAN_START--- and ---PLAN_END--- with ingredients [{name,amount,unit}], servings, pot_prep, plate_prep, closing_note.`;

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = await enforceRateLimit(auth.supabase, "kitchen");
  if (limited) return limited;

  const body = await readJsonBody(req, 16_384);
  if (body instanceof Response) return body;
  if (!isRecord(body) || !Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 12) {
    return jsonError("Provide between 1 and 12 chat messages", 400);
  }

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of body.messages) {
    if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant") || !safeString(item.content, 1_200)) {
      return jsonError("Invalid chat message", 400);
    }
    messages.push({ role: item.role, content: redactDirectIdentifiers(item.content.trim()) });
  }
  if (messages[messages.length - 1].role !== "user") return jsonError("A user message is required", 400);

  // Do not transmit dietary conversation or blood-pressure information to an
  // external AI processor until contractual, regional, retention, and consent
  // safeguards have been approved by the product owner.
  if (process.env.SANCTOS_EXTERNAL_AI_APPROVED !== "true") {
    return jsonError("This AI feature is temporarily unavailable while its data safeguards are reviewed.", 503);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return jsonError("Guardian is temporarily unavailable", 503);
  try {
    // Send only the bounded conversation needed for the current kitchen turn.
    // No account ID, profile, BP, medication, or stored patient records are included.
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return jsonError("Guardian is unavailable", 502);
    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string" || rawContent.length > 8_000) return jsonError("Guardian is unavailable", 502);

    const planStart = rawContent.indexOf("---PLAN_START---");
    const planEnd = rawContent.indexOf("---PLAN_END---");
    if (planStart !== -1 && planEnd > planStart) {
      try {
        const parsed: unknown = JSON.parse(rawContent.substring(planStart + 16, planEnd).trim());
        if (!isRecord(parsed) || !Array.isArray(parsed.ingredients) ||
            !Number.isFinite(parsed.servings) || (parsed.servings as number) <= 0 ||
            (parsed.servings as number) > 100 ||
            !safeString(parsed.pot_prep, 1_500) ||
            !safeString(parsed.plate_prep, 1_500) ||
            !safeString(parsed.closing_note, 500)) {
          return jsonError("Guardian could not validate the meal plan", 502);
        }
        const ingredients: Array<{ name: string; amount: number }> = [];
        if (parsed.ingredients.length > 40) return jsonError("Guardian could not validate the meal plan", 502);
        for (const ingredient of parsed.ingredients) {
          if (!isRecord(ingredient) || !safeString(ingredient.name, 100) ||
              !Number.isFinite(ingredient.amount) || (ingredient.amount as number) <= 0 ||
              (ingredient.amount as number) > 100) {
            return jsonError("Guardian could not validate the meal plan", 502);
          }
          ingredients.push({ name: ingredient.name.trim(), amount: ingredient.amount as number });
        }
        const sodiumPerServing = Math.round(calculateTotalSodium(ingredients) / (parsed.servings as number));
        return Response.json({
          status: "ready",
          message: rawContent.substring(0, planStart).trim() || "Here is your plan!",
          plan: { pot_prep: parsed.pot_prep, plate_prep: parsed.plate_prep, closing_note: parsed.closing_note },
          estimated_sodium: sodiumPerServing,
          ingredients_list: parsed.ingredients,
        });
      } catch {
        return Response.json({ status: "asking", message: "I couldn't validate that plan. Please check the ingredients and servings and try again." });
      }
    }
    return Response.json({ status: "asking", message: rawContent });
  } catch {
    return jsonError("Guardian is unavailable", 502);
  }
}