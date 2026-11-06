// features/bp-interpreter/domain/evaluate.ts
import type { InterpretationResult, BPCategory, EmergencySymptom } from "./types";

export const RULESET_VERSION = "2025-ACC-AHA-v1.1";

// Helper to determine the highest category
export function getCategory(systolic: number, diastolic: number): BPCategory {
  if (systolic >= 140 || diastolic >= 90) return "Stage 2";
  if (systolic >= 130 || diastolic >= 80) return "Stage 1";
  if (systolic >= 120 && diastolic < 80) return "Elevated";
  return "Normal";
}

export function evaluate(
  systolic: number,
  diastolic: number,
  pulse: number | undefined,
  symptoms: EmergencySymptom[],
  isProvisional: boolean
): InterpretationResult {
  const baseResult: InterpretationResult = {
    kind: "standard",
    isProvisional,
    rulesetVersion: RULESET_VERSION,
    requiresRecheck: isProvisional, 
  };

  // 1. P0 EMERGENCY GATE (Overrides ALL BP math)
  // If any red-flag symptom is present, we do not look at the numbers.
  if (symptoms.length > 0) {
    return {
      ...baseResult,
      kind: "emergency",
      category: undefined,
    };
  }

  // 2. SEVERE RECHECK (Hypertensive Crisis)
  // If BP is dangerously high (>= 180/120), but no symptoms are present.
  if (systolic >= 180 || diastolic >= 120) {
    return {
      ...baseResult,
      kind: "severe_recheck",
      category: "Stage 2",
    };
  }

  // 3. STANDARD CLASSIFICATION (Highest category wins)
  const category = getCategory(systolic, diastolic);

  // 4. PULSE ALERT (Micro-fix 1)
  const hasPulseAlert = pulse !== undefined && pulse >= 100;

  return {
    ...baseResult,
    category,
    pulse_alert: hasPulseAlert,
  };
}