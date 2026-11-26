export type IngredientInsight = {
  id: string;
  title: string;
  constituents: string;
  biology: string;
  bloodPressure: string;
  mealMeaning: string;
  evidence: "Well established" | "Depends on the exact ingredient" | "Composition not confirmed";
  sources: { label: string; url: string }[];
};

const sources = {
  dash: {
    label: "NHLBI · DASH eating plan",
    url: "https://www.nhlbi.nih.gov/health/dash-eating-plan",
  },
  dashSodium: {
    label: "NHLBI · DASH-Sodium trial findings",
    url: "https://www.nhlbi.nih.gov/health/dash/health-benefits",
  },
  potassium: {
    label: "American Heart Association · Potassium and blood pressure",
    url: "https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/how-potassium-can-help-control-high-blood-pressure",
  },
  sodium: {
    label: "American Heart Association · Sodium and blood pressure",
    url: "https://www.heart.org/en/health/healthy-living/healthy-eating/eat-smart/sodium",
  },
};

const profiles: { match: RegExp; insight: IngredientInsight }[] = [
  {
    match: /\\b(?:salt|table salt|sea salt|rock salt|kosher salt)\\b/i,
    insight: {
      id: "salt",
      title: "Salt",
      constituents: "Salt is primarily sodium chloride. The sodium portion is the part most directly relevant to blood-pressure guidance.",
      biology: "Sodium helps regulate fluid balance and nerve and muscle function. When intake is high, the body may retain more water; this can increase the volume of fluid circulating in the blood. Responses differ between people, partly because sodium sensitivity varies.",
      bloodPressure: "A higher sodium intake can raise blood pressure, and reducing sodium lowers it on average. The effect is supported by controlled dietary studies; it is not possible to calculate this meal's effect without knowing the amount and the rest of the day's intake.",
      mealMeaning: "Salt is a confirmed sodium source in this meal. Its contribution adds to sodium that may also come from stock cubes, sauces or seasoning blends. Ahuva should not estimate the amount when none was supplied.",
      evidence: "Well established",
      sources: [sources.dashSodium, sources.sodium],
    },
  },
  {
    match: /\\b(?:beef|steak|ground beef|minced beef|beef mince)\\b/i,
    insight: {
      id: "beef",
      title: "Beef",
      constituents: "Beef supplies complete protein, vitamin B12, zinc and iron (including readily absorbed haem iron). The amount of saturated fat varies substantially with the cut and trimming.",
      biology: "Protein supplies amino acids for tissue maintenance. Iron supports oxygen transport, while vitamin B12 is needed for red blood cell formation and nervous-system function. These are important nutritional roles, but they are not blood-pressure-lowering actions.",
      bloodPressure: "Beef does not have a predictable immediate blood-pressure effect. In a DASH-style eating pattern, the relevant considerations are portion, cut, saturated-fat content, processing and how often red meat replaces fish, beans or other protein sources.",
      mealMeaning: "The cut and whether it is processed are not yet known. A lean, unprocessed cut generally fits the DASH pattern more easily than fatty or processed beef. Ahuva should ask about the cut only if it would change the user's decision.",
      evidence: "Depends on the exact ingredient",
      sources: [sources.dash],
    },
  },
  {
    match: /\\b(?:fish|salmon|sardine|sardines|mackerel|trout|tuna|tilapia|catfish|cod|hake|herring)\\b/i,
    insight: {
      id: "fish",
      title: "Fish",
      constituents: "Fish provides complete protein and several micronutrients. EPA and DHA omega-3 fats are more abundant in oily species; the amount varies widely by species and serving.",
      biology: "Protein supplies amino acids. EPA and DHA are incorporated into cell membranes and influence signalling molecules involved in inflammation and vascular function. Not every fish contains the same amount of these fats.",
      bloodPressure: "Fish is included in heart-healthy and DASH-style eating patterns, but the blood-pressure relevance of this particular fish cannot be inferred without knowing the species and portion. Evidence about omega-3 intake should not be presented as a guaranteed effect from one fish meal.",
      mealMeaning: "The fish species is unspecified. Ahuva can confidently describe it as a protein source, but should not assume it is oily or assign an omega-3 amount. Grilling, baking or frying also changes the meal's overall fat profile.",
      evidence: "Depends on the exact ingredient",
      sources: [sources.dash],
    },
  },
  {
    match: /\\b(?:oil|olive oil|canola oil|rapeseed oil|sunflower oil|corn oil|soybean oil|palm oil|palm kernel oil|coconut oil)\\b/i,
    insight: {
      id: "oil",
      title: "Cooking oil",
      constituents: "Oils are almost entirely fat, but their fatty-acid profiles differ. Olive, canola/rapeseed and many seed oils contain more unsaturated fats; coconut, palm-kernel and palm oils contain more saturated fat.",
      biology: "Replacing some saturated fat with unsaturated fat can improve blood lipid patterns. The type of oil matters more than the word 'oil' alone.",
      bloodPressure: "Cooking oil is not a direct sodium source and should not be described as automatically raising or lowering blood pressure. Its relevance to cardiovascular health is mainly through the overall fat pattern and what it replaces.",
      mealMeaning: "The oil type and amount have not been confirmed. Ahuva must not assume olive oil or calculate fat intake. If the user wants a comparison, ask which oil they use.",
      evidence: "Depends on the exact ingredient",
      sources: [sources.dash],
    },
  },
  {
    match: /\\b(?:suya spice|suya seasoning|curry|curry powder|seasoning blend|spice blend|mixed seasoning|stock cube|bouillon|seasoning cube)\\b/i,
    insight: {
      id: "seasoning-blend",
      title: "Seasoning blends and spice mixes",
      constituents: "A blend may contain spices and herbs, but some products also include salt, sodium-containing flavour enhancers or other additives. Recipes and commercial formulations vary.",
      biology: "If a blend contains added sodium, it contributes to total sodium intake. The non-sodium spices cannot be assumed to neutralise that sodium or cancel its effects.",
      bloodPressure: "The blood-pressure relevance depends on the product's actual sodium content and how much is used. The name of a blend is not enough to estimate its sodium contribution.",
      mealMeaning: "The composition of this seasoning is unconfirmed. Ahuva should treat it as an unknown possible sodium source, not label it high-sodium without its ingredient list or nutrition label.",
      evidence: "Composition not confirmed",
      sources: [sources.dashSodium, sources.sodium],
    },
  },
];

export function getIngredientInsights(text: string): IngredientInsight[] {
  const found = new Set<string>();
  const insights: IngredientInsight[] = [];
  for (const profile of profiles) {
    if (profile.match.test(text) && !found.has(profile.insight.id)) {
      found.add(profile.insight.id);
      insights.push(profile.insight);
    }
  }
  return insights;
}

export function getCombinedMealInsight(text: string): string[] {
  const insights = getIngredientInsights(text);
  const notes: string[] = [];
  if (insights.some((item) => item.id === "salt" || item.id === "seasoning-blend")) {
    notes.push("The most direct blood-pressure factor identified in this ingredient list is possible sodium from added salt and any sodium-containing seasoning products. Their combined amount is unknown, so no sodium total should be estimated.");
  }
  if (insights.some((item) => item.id === "beef")) {
    notes.push("The beef's cut, fat content and processing status affect how it fits the overall eating pattern. The ingredient list alone does not establish its saturated-fat content.");
  }
  if (insights.some((item) => item.id === "fish")) {
    notes.push("Fish contributes protein, but its species is needed before making a meaningful statement about EPA or DHA omega-3 content.");
  }
  if (insights.some((item) => item.id === "oil")) {
    notes.push("The oil type is unknown. Its fatty-acid profile cannot be assessed from 'oil' alone.");
  }
  notes.push("These ingredients do not let us predict an individual's blood-pressure response to this meal. The overall pattern, quantities, preparation and individual health context matter.");
  return notes;
}
