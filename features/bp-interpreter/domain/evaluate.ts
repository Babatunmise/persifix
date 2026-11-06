// features/bp-interpreter/domain/evaluate.ts
import type { InterpretationResult, BPCategory, EmergencySymptom } from "./types";

export const RULESET_VERSION = "2025-ACC-AHA-v1.1";

export function getCategory(systolic: number, diastolic: number): BPCategory {
  if (systolic >= 180 || diastolic >= 120) return "severe";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120 && diastolic < 80) return "elevated";
  return "normal";
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

  if (symptoms.length > 0) {
    return { ...baseResult, kind: "emergency", category: undefined };
  }

  const category = getCategory(systolic, diastolic);
  
  if (category === "severe") {
    return { ...baseResult, kind: "severe_recheck", category };
  }

  const hasPulseAlert = pulse !== undefined && pulse >= 100;

  return {
    ...baseResult,
    category,
    pulse_alert: hasPulseAlert,
  };
}