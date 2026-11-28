# AHUVA Intelligence Integration — Readiness Review

**Status:** Engineering discovery complete; provider activation not approved  
**Branch:** `feat/ahuva-home-experience`  
**Scope:** Record the current service boundary and the work required before Step 2 can be treated as functional. This document does not authorise external processing, production changes, migrations or release.

## Current implementation findings

### Step 2 conversation

- The `POST /api/kitchen` route already contains a DeepSeek Chat Completions integration.
- The integration is deliberately fail-closed unless `SANCTOS_EXTERNAL_AI_APPROVED=true`.
- The route also requires `DEEPSEEK_API_KEY`.
- The provider model is currently hard-coded as `deepseek-flash`; current provider documentation identifies this as DeepSeek-V4.1-Flash-1017. The identifier is current, but should become a controlled server-side configuration before provider activation.
- The request now includes DeepSeek's documented `safety_check: { level: "high" }` setting. This provides provider-side input/output risk review; it does not replace Sanctos' own clinical and product safety controls.
- The route now handles a provider content-filter/refusal outcome without retrying it as though it were a transient empty response.
- Before the approval gate, the route authenticates the user, applies the shared rate limit, validates the request, redacts direct identifiers and rejects free text matching its sensitive-health-context rule.
- When the approval gate is closed, the route returns HTTP 503 with `reason: provider_not_approved`. The client currently renders that structured response as an unavailable Step 2 state.

**Conclusion:** The observed message is not evidence of a missing API route. The provider call exists but is intentionally disabled by the approval gate. Do not enable the environment variable or transmit meal data until the owner has explicitly approved the provider, model, data terms, retention, processing location/transfer safeguards and consent experience.

### Provider safety and data terms review

- The current DeepSeek API documentation lists `deepseek-flash` as a supported model name, so the existing model identifier is current at the time of this review: https://api-docs.deepseek.com/quick_start/pricing/
- DeepSeek's API guidance says public-facing applications should enable its model safety checks and separately fulfil their own content-safety and AI-labelling obligations: https://api-docs.deepseek.com/guides/safety/
- These safety settings have been added to the integration code while the external-processing gate remains closed. They have not yet been exercised against the live provider because activation is not approved.
- The publicly available DeepSeek Privacy Policy describes storage in mainland China, but its scope describes DeepSeek website products/services. It does not, by itself, conclusively establish the contractual processing, retention or training terms for Sanctos' Open Platform API traffic: https://chat.deepseek.com/downloads/DeepSeek%20Privacy%20Policy.pdf
- The Open Platform Terms place responsibility on Sanctos as the downstream application operator, require end-user disclosure of processing rules and consent or another legal basis, and require organisational/technical safeguards. The terms do not themselves resolve every retention, model-training, subprocessor or processing-location question for our intended use.
- Obtain API-specific written confirmation or applicable contractual terms for data processing, retention, training use, subprocessors and processing locations. Do not infer API protections from the consumer website policy or from the API's stateless conversation behaviour.

### Nutrition intelligence

Existing deterministic capability:
- `src/lib/ahuva-serving-intelligence.mjs` calculates a limited estimate of *known added sodium* from a user-entered fine-table-salt quantity and/or a packaged product's declared sodium per serving multiplied by the number of servings used.
- It also divides a measured household quantity into equal shares.

Existing qualitative knowledge:
- `src/lib/ahuva-ingredient-variants.ts` contains curated ingredient-variant guidance and cited sources for selected ingredient families.

Not present in the inspected implementation:
- A reviewed, versioned food-composition database covering the ingredients and product forms users can enter.
- A deterministic meal-level calculation for energy, carbohydrate, fibre, protein, total fat, saturated fat, sodium and other relevant nutrients.
- Reliable conversion from household measures or natural-language quantities to gram weights.
- A complete calculation that combines ingredients, recipe yield, total portions and the user's confirmed serving.
- A validated evidence/provenance record attached to each displayed nutrient value.

**Conclusion:** The existing sodium helper is not a complete meal nutrition engine. Ingredient descriptions and an LLM response must not be used as substitutes for verified nutrient calculations.

### Ingredient and seasoning suggestions

- The current UI explicitly presents meal-based suggestions as unavailable.
- The inspected code does not contain a connected suggestion endpoint or curated meal-to-ingredient suggestion service.
- Suggested items must remain separate from confirmed ingredients until the user selects them.

### Existing Kitchen Studio preservation

- The earlier prototype branch included guided cooking modes and preparation-plan behaviour.
- The approved product direction removes recipe teaching and fixed cooking-method selection from this Studio flow.
- The current implementation retains the separate ingredient/seasoning entry, removable chips, serving inputs, Step 2 review surface and follow-up UI.
- The previous guided-cooking behaviour should not be restored unless separately approved; it conflicts with the current nutrition-first Studio scope.

## Required work before Step 2 activation

1. **Provider and privacy approval**
   - Verify current provider/model identity and availability.
   - Review provider data terms, retention, training use, subprocessors, processing regions and international transfers.
   - Define exactly which meal data is sent and exclude unnecessary identifiers.
   - Provide clear user notice and consent before external processing.
   - Keep the server-side approval gate closed until all items are approved.

2. **Conversation service**
   - Keep the full confirmed meal brief and prior turns in the conversation.
   - Ask at most one material clarification at a time; never repeat known information.
   - Validate every response against the existing response contract.
   - Keep clinical-condition, allergy and medication-interaction requests outside the general meal-analysis path unless a separately reviewed clinical safety workflow exists.
   - Add automated tests for initial review, clarification, follow-up, malformed output, provider timeout, provider refusal and blocked sensitive context.

3. **Nutrition data and deterministic calculations**
   - Select and document a licensed, reviewed food-composition source suitable for a global product.
   - Define canonical food identities, variants, preparation states, units, edible portions and source/version provenance.
   - Add deterministic quantity normalisation and nutrient aggregation.
   - Distinguish measured, label-derived, database-derived and unavailable values.
   - Never render a nutrient total when the underlying food identity or quantity is unresolved.
   - Validate representative meals and serving calculations against independently checked examples before release.

4. **Suggestions**
   - Build meal-based ingredient and seasoning suggestions from a curated, culturally adaptable knowledge source.
   - Return suggestions as unconfirmed candidates.
   - Add only user-selected suggestions to the confirmed meal brief.
   - Test that no suggestion is silently treated as present or consumed.

5. **End-to-end readiness**
   - Verify Step 1 → API → conversation → deterministic calculation → Step 2 rendering.
   - Verify auth expiry and recovery without claiming persistence beyond what is actually implemented.
   - Verify privacy controls, rate limits, logging redaction and failure states.
   - Keep preview verification separate from production approval.

## Approval boundaries

This review authorises no provider activation, external data transfer, environment-variable change, new database schema, migration, production deployment, PR merge or release. Those remain separate explicit approval decisions.
