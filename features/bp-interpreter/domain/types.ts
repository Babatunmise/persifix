// features/bp-interpreter/domain/types.ts

export interface ReadingInput {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt: string;
}

export type EmergencySymptom = 
  | "chest_pain" | "shortness_of_breath" | "sudden_weakness" 
  | "difficulty_speaking" | "vision_changes" | "facial_drooping"    
  | "severe_back_pain" | "confusion" | "fainting";

export type CatchAllConcern = "feeling_wrong";

// Changed to lowercase to match the consultant's logic
export type BPCategory = "normal" | "elevated" | "stage1" | "stage2" | "severe";

// --- CONSULTANT TYPES ---
export type UiState = 
  | "HEALTHY_FIRST" 
  | "BORDERLINE_FIRST" 
  | "HIGH_FIRST" 
  | "STEADY" 
  | "SLIGHTLY_HIGHER" 
  | "SIGNIFICANTLY_HIGHER" 
  | "BETTER_THAN_USUAL" 
  | "LOW_CHECK";

export type ActionLevel = "none" | "keep_logging" | "recheck_now" | "see_clinician_soon" | "urgent";

export type Medication = "taken" | "missed" | " ofnot_applicable" | "unknown";

export type BaselineStatus = "none" | "forming" | "provisional" | "established";

export interface Reading { sys: number; dia: number }

export interface Baseline extends Reading {
  distinctDays: number;
  sessions: number;
  sdSys?: number;
  sdDia?: number;
}

export interface InterpretationResult {
  kind: "emergency" | "severe_recheck" | "standard";
  category?: BPCategory;
  isProvisional: boolean;
  rulesetVersion: string;
  requiresRecheck: boolean;
  pulse_alert?: boolean;
}

export interface ContextualInterpretation {
  state: UiState;
  actionLevel: ActionLevel;
  escalateIfRecheckPersists: boolean;
  copyKey: string;
  facts: {
    category: BPCategory;
    baselineStatus: BaselineStatus;
    usual?: Reading;
    delta?: Reading;
  };
  flags: {
    edge: boolean;
    aboveGoal: boolean;
    provisional: boolean;
    missedMeds: boolean;
  };
}