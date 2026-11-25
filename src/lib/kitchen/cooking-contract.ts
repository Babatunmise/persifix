export type CookingIntent = "meal" | "ingredients";
export type CookingMode = "your_way" | "ahuvas_way";

export type CookingRequestV1 = {
  version: 1;
  intent: CookingIntent;
  mode: CookingMode;
  description: string;
  servings: number;
  context?: {
    budget?: { amount: number; currency: string };
    equipment?: string[];
    preferences?: string[];
    exclusions?: string[];
    cookingMethod?: string;
    timeAvailableMinutes?: number;
  };
};

export type CookingRequestValidation =
  | { ok: true; value: CookingRequestV1 }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function boundedStringArray(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => boundedString(item, maxLength));
}

/**
 * Validates and copies the public Cooking v1 request into a trusted,
 * bounded shape. It deliberately does not infer clinical classifications,
 * inspect user profiles, or call an AI/data provider.
 */
export function validateCookingRequestV1(input: unknown): CookingRequestValidation {
  if (!isRecord(input)) return { ok: false, error: "Request must be an object." };
  if (input.version !== 1) return { ok: false, error: "Unsupported Cooking request version." };
  if (input.intent !== "meal" && input.intent !== "ingredients") {
    return { ok: false, error: "Choose a valid cooking starting point." };
  }
  if (input.mode !== "your_way" && input.mode !== "ahuvas_way") {
    return { ok: false, error: "Choose a valid cooking mode." };
  }
  if (!boundedString(input.description, 1200)) {
    return { ok: false, error: "Describe your meal or ingredients in 1,200 characters or fewer." };
  }
  if (!Number.isInteger(input.servings) || (input.servings as number) < 1 || (input.servings as number) > 20) {
    return { ok: false, error: "Servings must be a whole number between 1 and 20." };
  }

  let context: CookingRequestV1["context"];
  if (input.context !== undefined) {
    if (!isRecord(input.context)) return { ok: false, error: "Cooking context must be an object." };
    const raw = input.context;
    context = {};

    if (raw.budget !== undefined) {
      if (!isRecord(raw.budget) ||
          typeof raw.budget.amount !== "number" ||
          !Number.isFinite(raw.budget.amount) ||
          raw.budget.amount <= 0 ||
          raw.budget.amount > 1_000_000_000 ||
          typeof raw.budget.currency !== "string" ||
          !/^[A-Z]{3}$/.test(raw.budget.currency)) {
        return { ok: false, error: "Budget must include a positive amount and a three-letter currency code." };
      }
      context.budget = { amount: raw.budget.amount, currency: raw.budget.currency };
    }

    for (const key of ["equipment", "preferences", "exclusions"] as const) {
      const value = raw[key];
      if (value !== undefined) {
        if (!boundedStringArray(value, 20, 80)) {
          return { ok: false, error: `${key} must contain no more than 20 short text entries.` };
        }
        context[key] = value.map((item) => item.trim());
      }
    }

    if (raw.cookingMethod !== undefined) {
      if (!boundedString(raw.cookingMethod, 300)) {
        return { ok: false, error: "Cooking method must be 300 characters or fewer." };
      }
      context.cookingMethod = raw.cookingMethod.trim();
    }

    if (raw.timeAvailableMinutes !== undefined) {
      if (!Number.isInteger(raw.timeAvailableMinutes) ||
          (raw.timeAvailableMinutes as number) < 1 ||
          (raw.timeAvailableMinutes as number) > 1440) {
        return { ok: false, error: "Available time must be a whole number between 1 and 1,440 minutes." };
      }
      context.timeAvailableMinutes = raw.timeAvailableMinutes as number;
    }
  }

  return {
    ok: true,
    value: {
      version: 1,
      intent: input.intent,
      mode: input.mode,
      description: input.description.trim(),
      servings: input.servings as number,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    },
  };
}
