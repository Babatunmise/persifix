# Ahuva Cooking Intelligence Contract — v1

**Status:** Engineering specification; implementation not yet authorised by this document alone  
**Product scope:** Kitchen → Cooking only  
**External AI:** Approval gate remains closed  
**Database:** No schema changes authorised  
**Clinical status:** No nutrient calculations or medical safety claims may be inferred from this contract

## 1. Product contract

Cooking is decision support for people who already know how to cook.

- **Your Way** is the default. Preserve the user's stated method and preferences. Help with practical decisions: balance, substitutions, quantities, affordability and relevant dietary constraints.
- **Ahuva's Way** is optional. Offer an alternative preparation approach, ingredient list and optional guided steps.
- Do not turn every interaction into a cooking lesson or medical consultation.
- Ask only for information needed to make the next decision.
- Never invent pantry contents, ingredient quantities, nutrient values or food-safety assurances.

## 2. User journey

1. Choose a starting point: meal or ingredients.
2. Provide a short free-text description.
3. Choose your_way (default) or ahuvas_way.
4. Provide serving count.
5. Ahuva identifies missing decision-critical context and asks concise follow-up questions only when required.
6. Ahuva returns a small set of useful recommendations or a clear next action.
7. User may adapt the result, change mode or request optional guided preparation.

## 3. Request schema

The future server route should accept a bounded, versioned request. The UI must not send the entire user profile by default.

~~~ts
type CookingIntent = "meal" | "ingredients";
type CookingMode = "your_way" | "ahuvas_way";

type CookingRequestV1 = {
  version: 1;
  intent: CookingIntent;
  mode: CookingMode;
  description: string;
  servings: number; // integer, 1–20
  context?: {
    budget?: { amount: number; currency: string };
    equipment?: string[];
    preferences?: string[];
    exclusions?: string[]; // user-stated; not assumed to be medically safe
    cookingMethod?: string; // especially important in Your Way
    timeAvailableMinutes?: number;
  };
};
~~~

Server validation:
- Authenticate using the existing Sanctos request-authentication boundary.
- Preserve the current Kitchen rate-limit and bounded-body controls.
- Enforce exact enum values, string limits, array limits and numeric ranges.
- Reject malformed or unsupported versions.
- Treat all user text as untrusted input, not system instructions.
- Do not accept client-supplied user IDs or trusted safety classifications.
- Do not silently interpret a dislike as an allergy or a preference as a medical restriction.

## 4. Response schema

Responses must be explicit about what Ahuva needs next and what evidence supports its suggestions.

~~~ts
type CookingResponseV1 =
  | {
      version: 1;
      status: "needs_context";
      message: string;
      questions: Array<{
        id: string;
        prompt: string;
        required: boolean;
        kind: "text" | "single_choice" | "number";
        options?: string[];
      }>;
    }
  | {
      version: 1;
      status: "recommendations";
      message: string;
      recommendations: Array<{
        id: string;
        title: string;
        reason: string;
        fit: string[];
        tradeoffs: string[];
        confidence: "high" | "limited";
      }>;
      limitations: string[];
    }
  | {
      version: 1;
      status: "adaptation";
      message: string;
      meal: {
        title: string;
        servings: number;
        preservedMethod?: string;
        changes: string[];
        ingredients: Array<{
          name: string;
          quantity?: number;
          unit?: string;
          role: "requested" | "suggested" | "optional";
        }>;
      };
      limitations: string[];
    }
  | {
      version: 1;
      status: "preparation";
      message: string;
      steps: Array<{
        id: string;
        instruction: string;
        durationMinutes?: number;
      }>;
      limitations: string[];
    }
  | {
      version: 1;
      status: "unavailable";
      message: string;
    };
~~~

The backend must validate every model/provider result against the response schema before returning it. Invalid output must fail safely; never render arbitrary provider JSON directly.

## 5. Mode-specific behaviour

### Your Way

- Preserve the user's stated cooking method unless they ask to change it.
- Make suggestions additive and explain the practical reason.
- Separate essential changes from optional ideas.
- Offer substitutions only when ingredient identity and functional role are sufficiently understood.
- Do not label a meal healthy, safe or suitable for a condition without validated evidence.

### Ahuva's Way

- May propose an alternative method and ingredient list.
- Distinguish required ingredients from optional additions.
- Guided steps are provided only when requested or clearly useful.
- Timers are contextual to a timed step; they are not a primary Cooking entry feature.

## 6. Safety and evidence boundaries

- Allergies, intolerances, medical restrictions, religious restrictions, dislikes and voluntary preferences are different categories and must not be conflated.
- Allergy checks require deterministic ingredient/alias and derivative handling. If identity is ambiguous, do not claim the meal is safe.
- Medical dietary advice requires clinically reviewed rules and appropriately sourced evidence. A generative model is not the clinical guard.
- Nutrient values require a traceable food record, preparation state, quantity conversion, source/version and calculation method.
- Missing data must remain missing. No generic fallback sodium values, zeroes or invented estimates.
- The current hard-coded sodium dictionary in the legacy route is not approved as a production nutrition engine.

## 7. Privacy and external processing

The existing SANCTOS_EXTERNAL_AI_APPROVED fail-closed gate must remain in place.

Before any external model receives Cooking content, Sanctos must approve:
- Provider terms and data-processing agreement.
- Processing region, retention and training-use terms.
- Data minimisation and redaction behaviour.
- User notice and consent where required.
- Security review and incident handling.
- Clinical boundary and output-validation design.

Do not add an alternate provider path, bypass the gate, or transmit dietary/health context through another route.

## 8. Implementation sequence

1. Keep the current UI truthful while intelligence is unavailable.
2. Implement shared request/response TypeScript types and deterministic validation without external calls.
3. Build a deterministic orchestration layer that can return unavailable until approved data/decision sources exist.
4. Design food-reference matching and substitution evidence as a separately reviewed module.
5. Add allergy/restriction guard only after taxonomy, source coverage and test cases are reviewed.
6. Integrate an external model only after explicit approval and privacy safeguards.
7. Add persistence only after a separately reviewed schema, RLS and migration plan.
8. Run route, contract, security, accessibility and end-to-end tests.

## 9. Acceptance criteria

- Your Way is the default and preserves the user's described method.
- Ahuva's Way is optional and does not force guided cooking.
- Only necessary follow-up questions are asked.
- Every response is schema-validated.
- Unknown food data is disclosed, not guessed.
- No unsupported clinical or nutrition claim is emitted.
- Authentication, rate limiting, body limits and fail-closed AI gate remain intact.
- No database writes or external AI calls occur before their respective approvals.
- Both journeys work end to end before Cooking is considered functionally complete.
