# Ahuva Cooking Intelligence — Implementation Plan v1

Status: Proposed implementation contract. No provider activation or data-processing approval is granted by this document.

## Product outcome

After a user submits a meal idea or available ingredients, serving count, and cooking mode, Ahuva must return a useful next action. The submission must never terminate in a static confirmation screen.

The experience must support:
- Your Way: preserve the user's stated method and help with quantities, substitutions, affordability, and practical balance.
- Ahuva's Way: offer an alternative preparation method using only confirmed available ingredients. Missing ingredients must be identified and substitutions or additions clearly labelled for user approval.
- Follow-up turns: allow corrections and refinements without losing the meal context.
- Ingredient-first discovery: return a small, relevant set of meal directions only when the user starts from available ingredients.

## Request/response contract

POST /api/kitchen

Request:
- intent: "meal" | "ingredients"
- mode: "your-way" | "ahuvas-way"
- details: bounded user-authored text
- servings: positive integer or explicit "8+"
- confirmedIngredients: optional structured list; never inferred from unconfirmed text without showing the interpretation for confirmation
- conversation: bounded sequence of user/assistant turns for follow-up

Response:
- status: "ready" | "needs_clarification" | "unavailable"
- assistantMessage: concise response
- interpretation: parsed meal/ingredient understanding, with uncertain items marked
- recommendations: optional small list, each with rationale
- plan: optional preparation approach and ingredient quantities, each ingredient labelled available, missing, or suggested
- questions: only the minimum necessary clarification questions
- safetyNotes: only when materially relevant; no diagnosis or treatment claims
- provenance: provider/model and reference-data versions for internal observability, not user-facing claims

All fields must be runtime-validated. Reject malformed or oversized provider output. Do not calculate or display sodium, nutrients, or clinical suitability from the legacy heuristic dictionary.

## Data and safety boundaries

- Keep authentication, ownership isolation, rate limiting, bounded request bodies, identifier redaction, and fail-closed provider configuration.
- Do not send profile data, account identifiers, medical records, blood pressure, medications, allergies, or health conditions to an external model.
- User-entered free text can contain sensitive information. Detect and stop/redirect such turns before external transmission; do not silently strip context and then answer as if it was understood.
- Health-informed recommendations require a separately approved, deterministic nutrition/reference layer and appropriate user consent. The language model must not be the source of clinical or nutrient calculations.
- Distinguish allergies, intolerances, medical dietary restrictions, religious restrictions, dislikes, and voluntary preferences.
- No fabricated pantry inventory. No silent ingredient additions.
- No external provider may be enabled by code default. The server-side approval gate remains mandatory.

## Provider assessment snapshot (25 November 2026)

### DeepSeek API — existing integration, not approved for activation
- The Open Platform Terms effective 29 April 2026 require downstream developers to disclose personal-information processing rules and obtain consent or another legal basis, and establish security measures.
- DeepSeek's consumer privacy policy says data may be stored in the PRC, but expressly says downstream developer processing through open-platform services is outside that policy. The API's applicable contractual data-processing and retention position therefore needs direct confirmation.
- The current public terms allow limited use of inputs/outputs to improve services under stated de-identification conditions, with an opt-out path. That is not sufficient evidence of a Sanctos-specific no-training or retention arrangement.
- Decision: keep the existing gate closed pending API-specific written answers and contract review.

### OpenAI API — preferred candidate for a formal vendor review
- OpenAI states API inputs and outputs are not used for model training by default.
- The API's standard abuse-monitoring retention is up to 30 days. Zero Data Retention is available only to approved qualifying organisations and eligible endpoints/features.
- Chat Completions is listed as ZDR-eligible, subject to stated limitations and account approval.
- Decision: candidate only. Confirm account eligibility, applicable data-processing terms, international transfer safeguards, endpoint/feature configuration, and Sanctos's legal obligations before any production transmission.

### Anthropic API — alternative candidate
- Commercial API inputs and outputs are not used for training unless the customer opts in.
- Standard API retention is up to 30 days. Zero Data Retention is available only under an approved arrangement and only for eligible APIs/features.
- Decision: candidate only. Confirm eligibility, contract, regional transfer safeguards, endpoint coverage, and operational requirements.

## Recommended implementation sequence

1. Replace the current submit-only UI state with a real request lifecycle: idle, submitting, response, clarification, retryable error.
2. Implement and validate the provider-neutral request/response schema and server-side adapter boundary.
3. Remove the legacy DASH-only response contract and the unvalidated sodium heuristic from the new Cooking path. Preserve existing security controls.
4. Add integration tests for both modes, ingredient confirmation, servings, missing ingredients, follow-up context, malformed model output, provider timeout, rate limiting, and closed provider gate.
5. Implement a local deterministic utility layer for safe, non-clinical operations such as explicit serving multiplication when quantities are supplied. Do not pretend this replaces conversational intelligence.
6. Complete provider due diligence and present the specific vendor, retention mode, data categories, consent wording, and residual risks for founder approval.
7. Only after approval, configure production credentials and the explicit server-side feature gate, then test the complete journey in production.

## Acceptance criteria

A Cooking session is not complete unless:
- submitting the brief causes a server request and returns a visible result or a clear actionable error;
- serving count is reflected in the response;
- both modes follow their distinct product rules;
- Ahuva never claims an unconfirmed ingredient is available;
- missing ingredients and optional additions are transparent;
- follow-up edits preserve context;
- no unvalidated clinical/nutritional numbers are shown;
- the closed provider gate fails safely and is never represented as a successful assistant response.

## Approval gates

This plan does not authorise:
- enabling DeepSeek, OpenAI, Anthropic, or any external AI provider;
- transmitting user food, dietary, or health-related conversation to a vendor;
- production database migrations;
- clinical/nutrition calculations or health rules;
- changes to vendor retention, region, consent, or privacy settings.
