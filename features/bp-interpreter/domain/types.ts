// features/bp-interpreter/domain/types.ts

export interface ReadingInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt: string; // ISO string
}

// 1. The specific red-flag symptoms (Immediate Red Screen)
export type EmergencySymptom = 
  | "chest_pain"
  | "shortness_of_breath"
  | "sudden_weakness"
  | "difficulty_speaking"
  | "vision_changes"
  | "facial_drooping"    // Added: Stroke indicator
  | "severe_back_pain"   // Added: Aortic dissection indicator
  | "confusion"          // Added: Hypertensive encephalopathy
  | "fainting";          // Added: Loss of consciousness

// 2. The catch-all concern (Triggers follow-up question)
export type CatchAllConcern = "feeling_wrong";

// 3. The Blood Pressure Categories
export type BPCategory = "Normal" | "Elevated" | "Stage 1" | "Stage 2";

// 4. The output of our clinical engine
export interface InterpretationResult {
  kind: "emergency" | "severe_recheck" | "standard";
  category?: BPCategory;
  isProvisional: boolean;
  rulesetVersion: string;
  requiresRecheck: boolean;
  pulse_alert?: boolean; // The micro-fix you requested
}

// 5. The Context Engine types
export type MissedReason = "forgot" | "ran_out" | "side_effects";

export interface ContextData {
  takes_nsaids?: boolean;
  missed_reason?: MissedReason;
  height_cm?: number;
  weight_kg?: number;
}




