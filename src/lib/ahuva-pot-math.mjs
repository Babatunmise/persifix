const UNIT_DEFINITIONS = {
  g: { dimension: "mass", baseFactor: 1, metricUnit: "g", imperialUnit: "oz" },
  gram: { dimension: "mass", baseFactor: 1, metricUnit: "g", imperialUnit: "oz" },
  grams: { dimension: "mass", baseFactor: 1, metricUnit: "g", imperialUnit: "oz" },
  kg: { dimension: "mass", baseFactor: 1000, metricUnit: "kg", imperialUnit: "lb" },
  kilogram: { dimension: "mass", baseFactor: 1000, metricUnit: "kg", imperialUnit: "lb" },
  kilograms: { dimension: "mass", baseFactor: 1000, metricUnit: "kg", imperialUnit: "lb" },
  oz: { dimension: "mass", baseFactor: 28.349523125, metricUnit: "g", imperialUnit: "oz" },
  ounce: { dimension: "mass", baseFactor: 28.349523125, metricUnit: "g", imperialUnit: "oz" },
  ounces: { dimension: "mass", baseFactor: 28.349523125, metricUnit: "g", imperialUnit: "oz" },
  lb: { dimension: "mass", baseFactor: 453.59237, metricUnit: "kg", imperialUnit: "lb" },
  lbs: { dimension: "mass", baseFactor: 453.59237, metricUnit: "kg", imperialUnit: "lb" },
  pound: { dimension: "mass", baseFactor: 453.59237, metricUnit: "kg", imperialUnit: "lb" },
  pounds: { dimension: "mass", baseFactor: 453.59237, metricUnit: "kg", imperialUnit: "lb" },
  ml: { dimension: "volume", baseFactor: 1, metricUnit: "ml", imperialUnit: "tsp" },
  milliliter: { dimension: "volume", baseFactor: 1, metricUnit: "ml", imperialUnit: "tsp" },
  milliliters: { dimension: "volume", baseFactor: 1, metricUnit: "ml", imperialUnit: "tsp" },
  l: { dimension: "volume", baseFactor: 1000, metricUnit: "l", imperialUnit: "cup" },
  liter: { dimension: "volume", baseFactor: 1000, metricUnit: "l", imperialUnit: "cup" },
  liters: { dimension: "volume", baseFactor: 1000, metricUnit: "l", imperialUnit: "cup" },
  tsp: { dimension: "volume", baseFactor: 4.92892159375, metricUnit: "ml", imperialUnit: "tsp" },
  teaspoon: { dimension: "volume", baseFactor: 4.92892159375, metricUnit: "ml", imperialUnit: "tsp" },
  teaspoons: { dimension: "volume", baseFactor: 4.92892159375, metricUnit: "ml", imperialUnit: "tsp" },
  tbsp: { dimension: "volume", baseFactor: 14.78676478125, metricUnit: "ml", imperialUnit: "tbsp" },
  tablespoon: { dimension: "volume", baseFactor: 14.78676478125, metricUnit: "ml", imperialUnit: "tbsp" },
  tablespoons: { dimension: "volume", baseFactor: 14.78676478125, metricUnit: "ml", imperialUnit: "tbsp" },
  "us cup": { dimension: "volume", baseFactor: 236.5882365, metricUnit: "ml", imperialUnit: "cup" },
  "us cups": { dimension: "volume", baseFactor: 236.5882365, metricUnit: "ml", imperialUnit: "cup" },
  "metric cup": { dimension: "volume", baseFactor: 250, metricUnit: "ml", imperialUnit: "cup" },
  "metric cups": { dimension: "volume", baseFactor: 250, metricUnit: "ml", imperialUnit: "cup" },
  "us fl oz": { dimension: "volume", baseFactor: 29.5735295625, metricUnit: "ml", imperialUnit: "fl oz" },
};

const NON_LINEAR_INGREDIENTS = /\b(salt|seasoning|spice|chilli powder|chili powder|baking powder|baking soda|yeast|gelatin|gelatine|thickener|cornstarch|corn flour)\b/i;

function parseAmount(value) {
  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
    const result = numerator / denominator;
    return result > 0 && result <= 100000 ? result : null;
  }
  const result = Number(value);
  return Number.isFinite(result) && result > 0 && result <= 100000 ? result : null;
}

function formatQuantity(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return String(Number(value.toFixed(2)));
}

function calculateIngredient(line, factor, system) {
  if (!Number.isFinite(factor) || factor <= 0) return { result: line, note: "Serving ratio is invalid; left unchanged." };
  const match = line.match(/^\s*(\d+(?:\.\d+)?|\d+\/\d+)\s+(?:(us\s+cup|metric\s+cup|us\s+fl\s+oz|[^\s]+)\s+)?(.+?)\s*$/i);
  if (!match) return { result: line, note: "Quantity or unit not recognised; left unchanged." };
  const amount = parseAmount(match[1]);
  if (amount === null) return { result: line, note: "Invalid quantity; left unchanged." };
  const unit = (match[2] ?? "item").trim().toLowerCase().replace(/\.$/, "");
  const ingredient = match[3].trim();
  if (NON_LINEAR_INGREDIENTS.test(ingredient)) {
    return { result: line, note: "Review this ingredient manually; its quantity may not scale linearly." };
  }
  const definition = UNIT_DEFINITIONS[unit];
  if (unit === "item") return { result: formatQuantity(amount * factor) + " " + ingredient };
  if (!definition) {
    return {
      result: formatQuantity(amount * factor) + " " + match[2] + " " + ingredient,
      note: "Quantity scaled; unit conversion is unsupported, so the original unit is retained.",
    };
  }
  const scaledBase = amount * factor * definition.baseFactor;
  if (system === "metric") {
    const targetUnit = definition.metricUnit;
    const targetFactor = targetUnit === "kg" || targetUnit === "l" ? 1000 : 1;
    return { result: formatQuantity(scaledBase / targetFactor) + " " + targetUnit + " " + ingredient };
  }
  if (definition.dimension === "mass") {
    const usePounds = scaledBase >= 453.59237;
    const targetUnit = usePounds ? "lb" : "oz";
    const targetFactor = usePounds ? 453.59237 : 28.349523125;
    return { result: formatQuantity(scaledBase / targetFactor) + " " + targetUnit + " " + ingredient };
  }
  const useCups = scaledBase >= 236.5882365;
  const useTablespoons = !useCups && scaledBase >= 14.78676478125;
  const targetUnit = useCups ? "cup" : useTablespoons ? "tbsp" : "tsp";
  const targetFactor = useCups ? 236.5882365 : useTablespoons ? 14.78676478125 : 4.92892159375;
  return { result: formatQuantity(scaledBase / targetFactor) + " " + targetUnit + " " + ingredient };
}

export { calculateIngredient };
