export function normalizeIngredientText(value) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function extractConfirmedIngredientText(intent, details, conversation) {
  if (intent === "ingredients") return details;
  const confirmations = conversation
    .filter((turn, index) => turn.role === "user" && index > 0)
    .map((turn) => turn.content)
    .flatMap((content) => {
      const matches = [];
      const pattern = /\\b(?:i have|we have|i've got|we've got|i got|we got|available ingredients(?: are)?|ingredients i have(?: are)?|ingredients available(?: are)?)\\s*[:\\-]?\\s*([^.!?\\n]+)/gi;
      for (const match of content.matchAll(pattern)) matches.push(match[1].trim());
      return matches;
    });
  return confirmations.join(", ");
}

export function isIngredientConfirmed(ingredient, confirmedText, allUserText = "") {
  const normalizedIngredient = normalizeIngredientText(ingredient);
  if (!normalizedIngredient) return false;
  const normalizedConfirmed = ` ${normalizeIngredientText(confirmedText)} `;
  const normalizedAll = ` ${normalizeIngredientText(allUserText)} `;
  const variants = [normalizedIngredient, `${normalizedIngredient}s`];
  const negativeMarkers = variants.flatMap((name) => [
    ` no ${name} `, ` not ${name} `, ` without ${name} `,
    ` out of ${name} `, ` ran out of ${name} `,
    ` do not have ${name} `, ` don t have ${name} `,
    ` doesn t have ${name} `, ` don t got ${name} `,
  ]);
  if (negativeMarkers.some((marker) => normalizedAll.includes(marker))) return false;
  return variants.some((name) => normalizedConfirmed.includes(` ${name} `));
}
