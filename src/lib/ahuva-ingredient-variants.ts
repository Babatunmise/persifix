export type IngredientVariant = {
  name: string;
  bestFor: string;
  practicalUse: string;
  healthContext: string;
  checkBeforeUse?: string;
};

export type IngredientVariantGuide = {
  familyId: string;
  familyName: string;
  variants: IngredientVariant[];
  sources: { label: string; url: string }[];
};

const heartAssociationOil = {
  label: "American Heart Association · Healthy cooking oils",
  url: "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/healthy-cooking-oils",
};
const britishHeartFoundationOil = {
  label: "British Heart Foundation · Using oils in cooking",
  url: "https://www.bhf.org.uk/informationsupport/heart-matters-magazine/nutrition/ask-the-expert/oils-in-cooking",
};
const heartAssociationSodium = {
  label: "American Heart Association · Sodium",
  url: "https://www.heart.org/en/health/healthy-living/healthy-eating/eat-smart/sodium",
};

const guides: IngredientVariantGuide[] = [
  {
    familyId: "oil",
    familyName: "Cooking oils and fats",
    sources: [heartAssociationOil, britishHeartFoundationOil],
    variants: [
      {
        name: "Extra-virgin olive oil",
        bestFor: "Dressings, dips, drizzling, finishing and gentle-to-moderate everyday cooking.",
        practicalUse: "Choose it when you want olive flavour. It can be used for ordinary home cooking; avoid letting it smoke.",
        healthContext: "Rich in monounsaturated fat and generally a heart-favourable replacement for butter or other fats high in saturated fat.",
        checkBeforeUse: "The flavour and quality vary. 'Extra virgin' describes how it is produced, not a promise that it should only be used cold.",
      },
      {
        name: "Refined or light olive oil",
        bestFor: "Neutral-flavoured sautéing, roasting, pan-frying and higher-heat everyday cooking.",
        practicalUse: "Use when you want olive oil's general fatty-acid profile with a milder flavour and greater heat tolerance than extra-virgin varieties.",
        healthContext: "Still predominantly unsaturated fat. 'Light' usually refers to colour or flavour, not fewer calories.",
      },
      {
        name: "Canola / rapeseed oil",
        bestFor: "Versatile everyday cooking, sautéing, roasting, baking and stir-frying.",
        practicalUse: "A useful neutral option when you do not want the oil to dominate the dish. Refined versions are suitable for hotter cooking.",
        healthContext: "Low in saturated fat and provides mostly unsaturated fats.",
      },
      {
        name: "High-oleic sunflower oil",
        bestFor: "Sautéing, roasting and hotter pan cooking.",
        practicalUse: "Look specifically for 'high-oleic' on the label; it is not the same fatty-acid profile as standard sunflower oil.",
        healthContext: "Higher in monounsaturated fat than conventional sunflower oil and generally more heat-stable.",
      },
      {
        name: "Regular sunflower oil",
        bestFor: "Everyday baking, sautéing and moderate-heat cooking, following the product label.",
        practicalUse: "A neutral-tasting option. Avoid repeatedly heating or reusing it.",
        healthContext: "Provides mostly polyunsaturated fat and is low in saturated fat.",
      },
      {
        name: "Corn oil",
        bestFor: "Baking, roasting, dressings and ordinary sautéing.",
        practicalUse: "A neutral oil that works when a mild flavour is preferred. Match the refined or unrefined form to the cooking heat.",
        healthContext: "Mostly unsaturated fat and lower in saturated fat than tropical oils such as palm and coconut.",
      },
      {
        name: "Soybean oil",
        bestFor: "General-purpose cooking, baking, roasting and dressings.",
        practicalUse: "A neutral option for mixed dishes. Follow the label and avoid overheating or repeatedly reusing it.",
        healthContext: "Predominantly unsaturated fat, including polyunsaturated fats.",
      },
      {
        name: "Peanut oil",
        bestFor: "Stir-frying and higher-heat cooking when the product is refined.",
        practicalUse: "Refined peanut oil has a mild flavour; less-refined versions can taste more strongly of peanuts.",
        healthContext: "Contains substantial unsaturated fat. Peanut allergy must be considered; do not assume every refined product is safe for an allergic person.",
        checkBeforeUse: "Check allergy history and the manufacturer's allergen statement.",
      },
      {
        name: "Avocado oil",
        bestFor: "Refined versions for hotter cooking; unrefined versions for dressings, drizzling and gentler cooking.",
        practicalUse: "Check whether the bottle says refined or virgin/unrefined; the form changes flavour and heat suitability.",
        healthContext: "Predominantly monounsaturated fat and generally low in saturated fat.",
      },
      {
        name: "Sesame oil",
        bestFor: "Toasted sesame oil for finishing, dressings and flavour; refined sesame oil for cooking.",
        practicalUse: "Toasted sesame oil is strongly flavoured, so a small drizzle can add aroma. Do not treat toasted and refined sesame oil as interchangeable.",
        healthContext: "Contains unsaturated fats; the nutritional profile varies by product and processing.",
        checkBeforeUse: "Sesame is a major food allergen in some jurisdictions. Check allergy history and the product label.",
      },
      {
        name: "Flaxseed / linseed oil",
        bestFor: "Cold dressings and finishing only.",
        practicalUse: "Do not use it for frying or high-heat cooking. Follow the label's refrigeration and storage directions.",
        healthContext: "Provides alpha-linolenic acid (ALA), a plant omega-3 fat. It is not equivalent gram-for-gram to EPA or DHA from fish.",
      },
      {
        name: "Walnut oil",
        bestFor: "Cold dressings, dips and finishing.",
        practicalUse: "Use where its nutty flavour is welcome; avoid high heat and follow storage directions.",
        healthContext: "Provides unsaturated fats, including ALA. Walnut allergy must be considered.",
        checkBeforeUse: "Check allergy history and storage instructions.",
      },
      {
        name: "Coconut oil",
        bestFor: "Occasional use when its distinct flavour is wanted, rather than as the default everyday cooking fat.",
        practicalUse: "Works in some baking and dishes where coconut flavour is intended. Use a modest amount.",
        healthContext: "High in saturated fat compared with most liquid non-tropical vegetable oils. For heart health, the AHA favours replacing saturated fats with unsaturated oils.",
      },
      {
        name: "Palm oil",
        bestFor: "Specific traditional dishes where its colour and flavour are important; use thoughtfully rather than as the default everyday fat.",
        practicalUse: "Its strong colour and flavour are part of some dishes. The red and refined forms differ; do not assume they are nutritionally identical.",
        healthContext: "Higher in saturated fat than most liquid non-tropical vegetable oils. Amount and overall dietary pattern matter.",
      },
      {
        name: "Grapeseed oil",
        bestFor: "Dressings, baking and general cooking when a neutral flavour is desired.",
        practicalUse: "Use according to the product's refinement and label; avoid repeated heating.",
        healthContext: "Predominantly unsaturated fat, with a relatively high proportion of polyunsaturated fat.",
      },
      {
        name: "Vegetable oil blend",
        bestFor: "General-purpose cooking when the blend is made from unsaturated non-tropical oils.",
        practicalUse: "The phrase 'vegetable oil' does not identify the exact oil. Check the ingredient list to see whether it is canola, sunflower, soybean, palm, or a blend.",
        healthContext: "The fat profile depends on the actual oils in the blend, so the label matters.",
        checkBeforeUse: "Ask for the ingredient list if a more specific comparison is needed.",
      },
      {
        name: "Butter, ghee, lard or beef dripping",
        bestFor: "Occasional flavour-specific cooking or baking, rather than the main everyday cooking fat.",
        practicalUse: "These are animal fats or dairy-derived fats, not interchangeable with liquid vegetable oils. Use smaller amounts when they are chosen.",
        healthContext: "Generally higher in saturated fat than liquid oils such as olive or canola. Ghee is not automatically low in saturated fat.",
      },
    ],
  },
  {
    familyId: "salt",
    familyName: "Salt and salt substitutes",
    sources: [heartAssociationSodium],
    variants: [
      {
        name: "Fine table salt",
        bestFor: "Small, measured additions where it dissolves quickly.",
        practicalUse: "Teaspoon measures depend on crystal size and how tightly salt packs. For accuracy, use the label or weigh it rather than assuming every salt teaspoon is equal.",
        healthContext: "Sodium chloride. The sodium amount, not whether it is labelled sea or table salt, is the key blood-pressure consideration.",
      },
      {
        name: "Iodised table salt",
        bestFor: "Everyday measured use where iodised salt is the household choice.",
        practicalUse: "Use sparingly as with other salt. Iodine fortification supports iodine intake but does not remove sodium.",
        healthContext: "Provides iodine as well as sodium chloride; it is not lower in sodium by virtue of being iodised.",
      },
      {
        name: "Sea salt, rock salt or kosher/coarse salt",
        bestFor: "Finishing texture or recipes that specify a particular crystal size.",
        practicalUse: "Large crystals occupy more volume per teaspoon than fine salt. Do not assume these are lower-sodium alternatives; compare by weight or label.",
        healthContext: "Still primarily sodium chloride. Mineral traces do not make ordinary use a blood-pressure treatment.",
      },
      {
        name: "Seasoned salt",
        bestFor: "Specific flavour blends where the salt contribution is counted as part of the seasoning.",
        practicalUse: "Check the ingredient list and sodium label. It can add sodium on top of separately added salt.",
        healthContext: "Often contains salt as a major ingredient; composition varies by brand.",
      },
      {
        name: "Potassium-based salt substitute",
        bestFor: "Only when appropriate for the person's health context and clinician guidance.",
        practicalUse: "Do not recommend it automatically as a universal swap. Some products replace some sodium chloride with potassium chloride.",
        healthContext: "Potassium-based substitutes may be unsuitable for people with kidney disease or those taking medicines that raise potassium. Individual suitability needs clinical review.",
        checkBeforeUse: "If the user mentions kidney disease, potassium restrictions or relevant medicines, do not advise a switch; direct them to their clinician.",
      },
    ],
  },
  {
    familyId: "beef",
    familyName: "Beef cuts and forms",
    sources: [{ label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" }],
    variants: [
      { name: "Lean whole cuts", bestFor: "Grilling, roasting, stewing or pan-cooking after trimming visible fat.", practicalUse: "Examples include round, sirloin and tenderloin; the exact fat content still varies by cut and trimming.", healthContext: "A lean unprocessed cut generally fits more easily into a DASH-style pattern than a fatty or processed cut." },
      { name: "Fattier cuts", bestFor: "Occasional dishes where the cut's texture and flavour are central.", practicalUse: "Trim visible fat where appropriate and consider a smaller amount alongside beans, vegetables or other protein sources.", healthContext: "Usually contribute more saturated fat; the cut and portion matter." },
      { name: "Minced / ground beef", bestFor: "Sauces, patties, meatballs and mixed dishes.", practicalUse: "Check the lean percentage on the pack; 'minced beef' alone does not reveal its fat content.", healthContext: "Fat content varies widely with the lean-to-fat ratio." },
      { name: "Cured, corned or deli beef", bestFor: "Occasional use for flavour rather than as the everyday protein base.", practicalUse: "Check sodium per serving and the amount used; processed forms may contribute substantial sodium.", healthContext: "Processing, sodium and saturated fat can change how it fits the overall pattern." },
    ],
  },
  {
    familyId: "fish",
    familyName: "Fish types and forms",
    sources: [
      { label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" },
      { label: "NIH Office of Dietary Supplements · Omega-3 fatty acids", url: "https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/" },
    ],
    variants: [
      { name: "Oily fish (e.g. salmon, sardines, mackerel, trout)", bestFor: "Grilling, baking, steaming or pan-cooking.", practicalUse: "Choose cooking methods that preserve the fish's texture without needing heavy breading or deep-frying.", healthContext: "Usually contains more EPA and DHA omega-3 than lean white fish; amounts vary by species and serving." },
      { name: "Lean white fish (e.g. cod, tilapia, haddock)", bestFor: "Steaming, baking, grilling or light pan-cooking.", practicalUse: "Its mild flavour works with herbs, citrus, garlic and spice blends.", healthContext: "Provides protein but generally less EPA and DHA than oily fish." },
      { name: "Canned fish", bestFor: "Quick meals, salads, sandwiches and sauces.", practicalUse: "Compare water- or oil-packed versions and check sodium on the label; draining does not guarantee all sodium is removed.", healthContext: "Species determines omega-3 content; added salt and sauces determine much of the sodium difference." },
      { name: "Smoked, salted or dried fish", bestFor: "Small flavouring portions in dishes where its concentrated taste is useful.", practicalUse: "Check the processing method and consider how much is combined with added salt, stock cubes or sauces.", healthContext: "Can be a concentrated sodium source; the amount varies substantially by product and preparation." },
    ],
  },
  {
    familyId: "curry",
    familyName: "Curry powders, pastes and sauces",
    sources: [heartAssociationSodium],
    variants: [
      { name: "Dry curry powder", bestFor: "Seasoning dry rubs, marinades, stews and sautéed aromatics.", practicalUse: "Bloom briefly in oil or add to aromatics according to the recipe; check the label because some blends include salt.", healthContext: "A spice blend is not automatically sodium-free. The actual formulation determines sodium content." },
      { name: "Curry paste", bestFor: "Building a flavour base for stews, soups and sauces.", practicalUse: "Add gradually and taste; pastes can contain salt, oil, sugar or other concentrated ingredients.", healthContext: "Sodium and fat vary by brand and recipe. Use the label rather than assuming it matches dry powder." },
      { name: "Ready-made curry sauce", bestFor: "Convenience meals and simmer sauces.", practicalUse: "Check sodium per serving and how many servings the jar contains; the whole jar is not necessarily one serving.", healthContext: "Packaged sauces can add sodium and energy beyond the fresh ingredients." },
    ],
  },
  {
    familyId: "stock-cube",
    familyName: "Stock cubes and bouillon",
    sources: [heartAssociationSodium],
    variants: [
      { name: "Regular stock cube or powder", bestFor: "Concentrated flavour in soups, stews and rice dishes.", practicalUse: "Use the label's serving size; avoid automatically combining a full cube with extra salt.", healthContext: "Often contributes meaningful sodium. Brand and serving size matter." },
      { name: "Reduced-sodium stock cube", bestFor: "Recipes where a lower-sodium stock product is desired.", practicalUse: "Compare the sodium per serving with the regular version; 'reduced' does not mean sodium-free.", healthContext: "Still contributes sodium, which must be counted alongside other seasonings." },
      { name: "No-added-salt stock", bestFor: "Adding stock flavour when limiting added sodium.", practicalUse: "Check the nutrition label; naturally occurring sodium may still be present.", healthContext: "Usually offers more control over added sodium, but the exact product label is authoritative." },
    ],
  },
  {
    familyId: "seasoning-blend",
    familyName: "Seasoning blends and sauces",
    sources: [heartAssociationSodium],
    variants: [
      { name: "Salt-free dried herb and spice blend", bestFor: "Everyday seasoning when you want flavour without adding sodium from the blend.", practicalUse: "Check that salt, sodium chloride or sodium-based flavour enhancers are not listed.", healthContext: "The blend itself may contribute little sodium, but other ingredients in the meal still count." },
      { name: "Salt-containing seasoning blend", bestFor: "Flavouring dishes when the blend is treated as part of the total salt allowance.", practicalUse: "Read sodium per serving and measure how much enters the whole pot.", healthContext: "Can add sodium even when no table salt is added separately." },
      { name: "Soy, fish, oyster or other savoury sauce", bestFor: "Small measured amounts for umami and seasoning.", practicalUse: "Compare regular and reduced-sodium versions and account for the quantity used.", healthContext: "Sodium varies widely by sauce and brand; the product label is needed." },
    ],
  },

  {
    familyId: "rice",
    familyName: "Rice varieties and forms",
    sources: [{ label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" }],
    variants: [
      { name: "Brown / wholegrain rice", bestFor: "Meals where a nuttier flavour and firmer texture work well.", practicalUse: "Rinse if desired and allow for a longer cooking time than many white-rice varieties. Use the same household bowl or ladle to portion the cooked pot.", healthContext: "Retains the bran and germ, so it generally provides more fibre than white rice. Whole grains are encouraged in DASH-style eating." },
      { name: "White rice", bestFor: "Soft-textured dishes, quick cooking and meals where white rice is the familiar staple.", practicalUse: "Use the water ratio and timing for the specific variety. Pair with vegetables, beans or other fibre-rich foods to build a balanced plate.", healthContext: "Milling removes the bran and germ, so it generally has less fibre than brown rice. It can still be part of an overall balanced meal." },
      { name: "Parboiled rice", bestFor: "Separate grains in pilafs, jollof-style dishes and batch cooking.", practicalUse: "Follow the pack instructions; parboiled rice can need a different water ratio and cooking time from regular white rice.", healthContext: "Parboiling changes starch structure and can retain some nutrients from the grain layers. The exact product and enrichment vary." },
      { name: "Basmati or jasmine rice", bestFor: "Aromatic rice dishes where fragrance and grain texture matter.", practicalUse: "Choose based on the flavour and texture you want. Both can be sold as white or wholegrain, so check the package rather than assuming the fibre content.", healthContext: "The variety name alone does not establish whether the rice is wholegrain or its full nutritional profile." },
      { name: "Instant / ready-to-heat rice", bestFor: "Convenience meals and quick preparation.", practicalUse: "Check the ingredient list and sodium per serving, especially for flavoured microwave pouches or seasoned rice.", healthContext: "Plain products may be similar to their base rice; flavoured products can add sodium, sauces or fats." },
    ],
  },
  {
    familyId: "chicken",
    familyName: "Chicken cuts and forms",
    sources: [{ label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" }, heartAssociationSodium],
    variants: [
      { name: "Skinless breast", bestFor: "Grilling, poaching, baking, stewing and quick pan-cooking.", practicalUse: "Because it is relatively lean, avoid overcooking; use aromatics, herbs and a little sauce for moisture.", healthContext: "A lean, unprocessed poultry option that can fit a DASH-style eating pattern." },
      { name: "Thigh or drumstick", bestFor: "Stews, roasting and slower cooking where a richer texture is wanted.", practicalUse: "Removing the skin reduces some of the fat; cook thoroughly and use the cut the user actually has.", healthContext: "Dark meat and skin-on portions generally contain more fat than skinless breast; exact amounts depend on cut and preparation." },
      { name: "Wings / skin-on chicken", bestFor: "Roasting or grilling when the skin and texture are part of the dish.", practicalUse: "Use a measured amount of oil and avoid relying on salty bottled marinades or seasoning mixes.", healthContext: "Skin adds fat, and sauces or marinades may add sodium. Neither should be assumed without checking the product." },
      { name: "Minced / ground chicken", bestFor: "Patties, meatballs, fillings and sauces.", practicalUse: "Check whether the mince includes skin or added ingredients; products vary in fat and sodium.", healthContext: "The label and lean percentage are needed for a more specific comparison." },
      { name: "Processed, brined or pre-seasoned chicken", bestFor: "Convenience use when the product is chosen deliberately.", practicalUse: "Check sodium per serving and the ingredient list; brining and seasoning can add sodium before cooking.", healthContext: "Processed forms may contribute more sodium than plain fresh chicken." },
    ],
  },
  {
    familyId: "tomato",
    familyName: "Tomatoes and tomato products",
    sources: [heartAssociationSodium, { label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" }],
    variants: [
      { name: "Fresh tomatoes", bestFor: "Salads, sauces, stews and fresh salsas.", practicalUse: "Use chopped for texture or cook down for a lighter sauce base. Add gradually to control the liquid in the pot.", healthContext: "A vegetable-rich ingredient; it does not independently treat high blood pressure." },
      { name: "Plain canned tomatoes", bestFor: "Soups, stews, sauces and dishes where consistent texture is useful.", practicalUse: "Choose no-added-salt versions when sodium control matters and compare the label between brands.", healthContext: "Canned products vary in added sodium; the label determines the contribution." },
      { name: "Tomato paste / puree", bestFor: "Concentrated tomato flavour, colour and body in sauces, rice dishes and stews.", practicalUse: "Because it is concentrated, a small spoonful adds strong flavour. Check whether salt has been added; tomato paste and passata are not the same concentration.", healthContext: "Plain paste is concentrated tomato; salted or seasoned products can add sodium." },
      { name: "Passata / tomato puree (pourable)", bestFor: "Smooth sauces, soups and stews.", practicalUse: "Use as a liquid tomato base; check whether the product is plain or seasoned.", healthContext: "Sodium varies by brand and added ingredients." },
      { name: "Sun-dried tomatoes", bestFor: "Small flavour-intense additions, salads, sauces and fillings.", practicalUse: "Oil-packed and dry-packed versions differ. Check added salt and oil in the product label.", healthContext: "Can be more concentrated in sodium per portion, especially when salted." },
    ],
  },
  {
    familyId: "onion",
    familyName: "Onion varieties and alliums",
    sources: [{ label: "NHLBI · DASH eating plan", url: "https://www.nhlbi.nih.gov/health/dash-eating-plan" }],
    variants: [
      { name: "Yellow / brown onion", bestFor: "Slow-cooked bases, stews, soups and caramelising.", practicalUse: "Its balanced flavour becomes sweeter as it cooks; use early in the cooking process for a flavour base.", healthContext: "A useful vegetable and flavour builder; no special blood-pressure effect should be claimed." },
      { name: "Red onion", bestFor: "Salads, quick pickles, salsas and lightly cooked dishes.", practicalUse: "Use raw for a sharper crunch or cook briefly for a milder flavour.", healthContext: "Colour does not make it a treatment or guarantee a clinically meaningful advantage over other onions." },
      { name: "White onion", bestFor: "Salsas, sauces and dishes where a sharper onion flavour is wanted.", practicalUse: "Use raw or cooked according to the dish's flavour profile.", healthContext: "Nutritional differences between common onion colours should not be overstated." },
      { name: "Spring onion / scallion", bestFor: "Garnishes, stir-fries, soups and quick-cooking dishes.", practicalUse: "Use the white portion early for flavour and the green tops near the end for freshness.", healthContext: "Adds flavour and vegetable variety; it is not a substitute for a measured sodium assessment." },
      { name: "Shallot", bestFor: "Dressings, delicate sauces and dishes where a milder, sweeter allium flavour is wanted.", practicalUse: "Use finely chopped and cook gently to avoid burning.", healthContext: "A culinary alternative to onion, not a blood-pressure intervention." },
    ],
  },
];

export function getIngredientVariantGuide(familyId: string): IngredientVariantGuide | null {
  return guides.find((guide) => guide.familyId === familyId) ?? null;
}
