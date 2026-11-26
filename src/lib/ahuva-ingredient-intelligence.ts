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
    match: /\b(?:salt|table salt|sea salt|rock salt|kosher salt)\b/i,
    insight: {
      id: "salt",
      title: "Salt",
      constituents: "Salt is primarily sodium chloride. The sodium portion is the part most directly relevant to blood-pressure guidance.",
      biology: "Sodium helps regulate fluid balance and nerve and muscle function. When intake is high, the body may retain more water; this can increase the volume of fluid circulating in the blood. Responses differ between people, partly because sodium sensitivity varies.",
      bloodPressure: "A higher sodium intake can raise blood pressure, and reducing sodium lowers it on average. The effect is supported by controlled dietary studies; it is not possible to calculate this meal's effect without knowing the amount and the rest of the day's intake.",
      mealMeaning: "Salt is a confirmed sodium source in this meal. Its contribution adds to sodium that may also come from stock cubes, sauces or seasoning blends. Ahuva should not estimate the amount when none was supplied.",
      evidence: "Well established",
      sources: [sources.dashSodium, sources.sodium, sources.potassium],
    },
  },
  {
    match: /\b(?:beef|steak|ground beef|minced beef|beef mince)\b/i,
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
    match: /\b(?:fish|salmon|sardine|sardines|mackerel|trout|tuna|tilapia|catfish|cod|hake|herring)\b/i,
    insight: {
      id: "fish",
      title: "Fish",
      constituents: "Fish provides complete protein and several micronutrients. EPA and DHA omega-3 fats are more abundant in oily species; the amount varies widely by species and serving.",
      biology: "Protein supplies amino acids. EPA and DHA are incorporated into cell membranes and influence signalling molecules involved in inflammation and vascular function. Not every fish contains the same amount of these fats.",
      bloodPressure: "Fish is included in heart-healthy and DASH-style eating patterns, but the blood-pressure relevance of this particular fish cannot be inferred without knowing the species and portion. Evidence about omega-3 intake should not be presented as a guaranteed effect from one fish meal.",
      mealMeaning: "The fish species is unspecified. Ahuva can confidently describe it as a protein source, but should not assume it is oily or assign an omega-3 amount. Grilling, baking or frying also changes the meal's overall fat profile.",
      evidence: "Depends on the exact ingredient",
      sources: [sources.dash, { label: "NIH Office of Dietary Supplements · Omega-3 fatty acids", url: "https://ods.od.nih.gov/factsheets/omega3fattyacids-healthprofessional/" }],
    },
  },
  {
    match: /\b(?:oil|olive oil|canola oil|rapeseed oil|sunflower oil|corn oil|soybean oil|palm oil|palm kernel oil|coconut oil)\b/i,
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
    match: /\\b(?:suya spice|suya seasoning)\\b/i,
    insight: {
      id: "suya-spice",
      title: "Suya spice",
      constituents: "Suya seasoning is a blend, and formulations vary between homemade mixes and commercial products. Ingredients may include several spices and other flavouring components; the name alone does not establish the exact composition.",
      biology: "The individual spices contribute different aromatic compounds. If the blend also contains salt or sodium-based additives, those contribute to total sodium intake. The spices do not neutralise that sodium.",
      bloodPressure: "There is no reliable way to infer this blend's sodium content or a direct blood-pressure effect from its name. The product label or recipe is needed before making a composition-specific claim.",
      mealMeaning: "Suya spice is present, but its ingredients and sodium content are unconfirmed. Ahuva should keep it as an unknown seasoning component rather than assume it is either high-sodium or salt-free.",
      evidence: "Composition not confirmed",
      sources: [sources.dashSodium, sources.sodium],
    },
  },
  {
    match: /\\b(?:curry powder|curry blend|curry seasoning|curry)\\b/i,
    insight: {
      id: "curry",
      title: "Curry",
      constituents: "Curry powders and pastes differ widely. They may contain combinations of turmeric, coriander, cumin, chilli and other spices, but salt and other additives depend on the specific product.",
      biology: "The spices contain varied plant compounds, but their presence does not establish a clinically meaningful blood-pressure effect at ordinary cooking quantities. Added sodium, if present, contributes to total intake.",
      bloodPressure: "Curry itself should not be described as a blood-pressure treatment or as a sodium source without checking the formulation. The blood-pressure relevance depends on the actual ingredients and amount used.",
      mealMeaning: "The type of curry product is unknown. Ahuva should not assume its spice composition or sodium content; a label is useful only if the user wants a more precise assessment.",
      evidence: "Composition not confirmed",
      sources: [sources.dashSodium, sources.dash],
    },
  },
  {
    match: /\\b(?:stock cube|bouillon|seasoning cube)\\b/i,
    insight: {
      id: "stock-cube",
      title: "Stock cube or bouillon",
      constituents: "Stock cubes and bouillon are concentrated flavouring products. Many contain salt or sodium-based flavour enhancers, but sodium levels vary by brand and product.",
      biology: "Sodium contributes to fluid balance. When the overall diet supplies more sodium than the body needs, blood pressure can rise in many people.",
      bloodPressure: "A stock cube can be a meaningful sodium source, but its contribution depends on the label and how much is used. The product name alone cannot provide a reliable sodium estimate.",
      mealMeaning: "If a stock cube is used in this meal, its label and quantity matter alongside added salt and other seasonings. Ahuva should not invent a sodium value.",
      evidence: "Depends on the exact ingredient",
      sources: [sources.dashSodium, sources.sodium],
    },
  },
  {
    match: /\\b(?:seasoning blend|spice blend|mixed seasoning)\\b/i,
    insight: {
      id: "seasoning-blend",
      title: "Other seasoning blends",
      constituents: "Seasoning blends vary. Some contain only herbs and spices; others include salt, sodium-based flavour enhancers or other additives.",
      biology: "If sodium is present, it contributes to total sodium intake. The other flavouring ingredients do not cancel its physiological effects.",
      bloodPressure: "The blood-pressure relevance depends on the product's actual sodium content and how much is used. A blend's name is not enough to estimate its contribution.",
      mealMeaning: "The composition is unconfirmed. Ahuva should not label the product high-sodium or salt-free without its ingredient list or nutrition label.",
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
  if (insights.some((item) => item.id === "salt" || ["seasoning-blend", "suya-spice", "curry", "stock-cube"].includes(item.id))) {
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
  if (
    insights.some((item) => item.id === "salt" || item.id === "seasoning-blend") &&
    insights.some((item) => item.id === "fish" || item.id === "beef")
  ) {
    notes.push("Fish and beef naturally contain some potassium, but their amounts vary. That potassium does not cancel the sodium in added salt or a seasoning blend. Sodium and potassium affect fluid balance and blood-vessel function through complementary pathways; the total dietary pattern matters.");
  }
  if (insights.some((item) => item.id === "beef") && insights.some((item) => item.id === "oil")) {
    notes.push("The beef cut and oil type together determine much of the meal's fat profile. Without those details, Ahuva cannot tell whether this combination is high in saturated fat or quantify it.");
  }
  notes.push("These ingredients do not let us predict an individual's blood-pressure response to this meal. The overall pattern, quantities, preparation and individual health context matter.");
  return notes;
}
