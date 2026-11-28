const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * DeepSeek can signal a safety refusal via finish_reason=content_filter.
 * Treat explicit refusal text as a refusal too. Never retry these as transient
 * empty completions or pass them to the normal nutrition response contract.
 * @param {unknown} choice
 */
export function isProviderSafetyRefusal(choice) {
  if (!isRecord(choice)) return false;
  if (choice.finish_reason === "content_filter") return true;
  if (!isRecord(choice.message)) return false;
  return typeof choice.message.refusal === "string" && choice.message.refusal.trim().length > 0;
}
