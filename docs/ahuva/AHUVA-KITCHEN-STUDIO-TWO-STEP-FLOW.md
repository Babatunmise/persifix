# AHUVA Kitchen Studio — two-step experience

**Status:** Approved product direction; preview implementation in progress  
**Scope:** UX and API contract only. No provider activation, production release, database migration or family-account integration is authorised by this specification.

## Product journey

### Step 1 — Tell Ahuva about the meal

The user enters:
- The meal they intend to prepare.
- Confirmed main ingredients, added individually as removable chips.
- Confirmed seasonings, sauces, herbs and spices, separately from main ingredients.
- Number of people eating, including the user.
- The user's own intended servings.

Meal-based ingredient and seasoning suggestions are intended capabilities. They must be generated from the named meal, presented as suggestions, and added only when the user selects them. A suggestion must never be treated as an ingredient the user owns or intends to use without confirmation.

Household portion calculation remains provisional: total portions equal the user's personal servings plus one portion for each other diner. The interface must explain this assumption. Family accounts, invitations, connection codes, permissions and cross-account journal writes are deferred.

### Step 2 — Ahuva understands the meal

After Step 1, Ahuva reviews the complete confirmed brief and begins a contextual conversation.

Ahuva may ask about:
- Ingredient form or variant.
- Relevant ingredient quantities.
- Seasoning, sauce, stock or packaged-product formulation.
- Preparation details only where they materially change nutritional composition or exposure.

These are examples, not a fixed checklist. Ahuva must:
- Ask only when the missing detail changes the nutritional interpretation or recommendation.
- Ask one concise question at a time.
- Never repeat information already supplied.
- Avoid questions that do not materially improve the result.
- Move directly to explanation when enough information is available.
- Never teach cooking steps or turn Kitchen Studio into a recipe workflow.

### Meal intelligence

Once the available information is sufficient, Ahuva explains the relevant composition and heart-health considerations of the actual meal, identifies meaningful pressure points, and offers optional practical adjustments that preserve the user's chosen meal and autonomy.

Exact nutrient totals must come from reviewed food-composition data and deterministic calculations. The language model must not estimate or invent sodium, calories, macronutrients, portion weights or other numerical nutrient results from memory.

## Service and approval boundaries

- Ingredient and seasoning suggestions are not active until an approved service is implemented and connected.
- Step 2 conversational AI remains fail-closed while the external-AI approval gate is closed.
- This work does not approve DeepSeek or any other provider, new data transmission, or changes to user consent.
- No new database schema or migration.
- No family connectors or cross-account sharing.
- No production deployment or merge.
- The UI must clearly communicate unavailable functionality rather than simulate a live AI response.

## Acceptance criteria

1. Step 1 contains no fixed Preparation Context or cooking-method dropdown.
2. Step 1 retains separate main-ingredient and seasoning entry, removable chips, and household-serving inputs.
3. The Step 1 review action transitions to a distinct Step 2 meal-understanding experience.
4. The submitted meal brief includes all confirmed Step 1 information and does not include an invented preparation method.
5. Step 2 presents the AI's question only when the service returns a meaningful clarification; answers continue the same conversation.
6. The API prompt directs the model to inspect the complete brief and conversation, ask at most one useful question per turn, avoid repeats, and never provide cooking steps.
7. When the provider is disabled or unavailable, the interface preserves the user's meal and clearly states that the conversation is not connected.
8. No exact nutrition values are displayed unless supplied by a reviewed deterministic calculation source.
9. Ingredient/seasoning suggestions remain visibly unavailable until implemented; no suggestion is silently added to the user's confirmed list.
10. No production, database, family-sharing or provider-approval boundary is crossed.
