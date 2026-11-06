// features/bp-interpreter/domain/interpret.ts
import type { BPCategory, Baseline, BaselineStatus, Medication, Reading, ContextualInterpretation, UiState, ActionLevel } from "./types";

export type Input = {
  current: Reading & { readingsInSession: number };
  baseline: Baseline | null;
  medication: Medication;
};

export type Classify = (sys: number, dia: number) => BPCategory;

export const CFG = {
  baselineMinDays: 3,
  baselineFullDays: 7,
  windowDays: 14,
  steadyBand: { sys: 7, dia: 5 },
  bandCap: { sys: 12, dia: 8 },
  bandSdMultiplier: 1.5,
  bigRise: { sys: 20, dia: 10 },
  edgeMmHg: 4,
  low: { sys: 90, dia: 60 },
} as const;

const ORDER: BPCategory[] = ["normal", "elevated", "stage1", "stage2", "severe"];
const rank = (c: BPCategory) => ORDER.indexOf(c);

const SOFTENABLE = new Set<UiState>(["BORDERLINE_FIRST", "STEADY", "SLIGHTLY_HIGHER"]);
const MED_AWARE = new Set<UiState>(["BORDERLINE_FIRST", "HIGH_FIRST", "SLIGHTLY_HIGHER", "SIGNIFICANTLY_HIGHER"]);

export function baselineStatus(b: Baseline | null): BaselineStatus {
  if (!b || b.sessions === 0) return "none";
  if (b.distinctDays < CFG.baselineMinDays) return "forming";
  return b.distinctDays >= CFG.baselineFullDays ? "established" : "provisional";
}

function band(b: Baseline): Reading {
  const widen = (sd: number | undefined, floor: number, cap: number) => Math.min(cap, Math.max(floor, CFG.bandSdMultiplier * (sd ?? 0)));
  return {
    sys: widen(b.sdSys, CFG.steadyBand.sys, CFG.bandCap.sys),
    dia: widen(b.sdDia, CFG.steadyBand.dia, CFG.bandCap.dia),
  };
}

function isEdge(cur: Reading, cat: BPCategory, classify: Classify): boolean {
  if (cat !== "elevated" && cat !== "stage1") return false;
  return rank(classify(cur.sys - CFG.edgeMmHg, cur.dia - CFG.edgeMmHg)) < rank(cat);
}

export function interpret(input: Input, classify: Classify): ContextualInterpretation {
  const { current, baseline, medication } = input;
  const category = classify(current.sys, current.dia);
  const status = baselineStatus(baseline);
  
  const flags = {
    edge: isEdge(current, category, classify),
    aboveGoal: rank(category) >= rank("stage1"),
    provisional: current.readingsInSession < 2,
    missedMeds: medication === "missed",
  };

  let usual: Reading | undefined;
  let delta: Reading | undefined;
  let relative: "steady" | "rose" | "big_rise" | "fell" = "steady";

  if (baseline && (status === "provisional" || status === "established")) {
    usual = { sys: baseline.sys, dia: baseline.dia };
    delta = { sys: current.sys - baseline.sys, dia: current.dia - baseline.dia };
    const b = band(baseline);
    if (delta.sys >= CFG.bigRise.sys || delta.dia >= CFG.bigRise.dia) relative = "big_rise";
    else if (delta.sys > b.sys || delta.dia > b.dia) relative = "rose";
    else if (delta.sys <= -b.sys || delta.dia <= -b.dia) relative = "fell";
  }

  const build = (
    state: UiState,
    actionLevel: ActionLevel,
    o: { escalate?: boolean; tags?: string[] } = {}
  ): ContextualInterpretation => {
    const tags = [...(o.tags ?? [])];
    if (flags.edge && SOFTENABLE.has(state)) tags.push("edge");
    if (usual && status === "provisional") tags.push("hedged");
    if (flags.missedMeds && MED_AWARE.has(state)) tags.push("missed_meds");
    return {
      state,
      actionLevel,
      escalateIfRecheckPersists: o.escalate ?? false,
      copyKey: [state, ...tags].join("."),
      facts: { category, baselineStatus: status, usual, delta },
      flags,
    };
  };

  // 1. Severe
  if (category === "severe") {
    return build(usual ? "SIGNIFICANTLY_HIGHER" : "HIGH_FIRST", "urgent", { escalate: true });
  }

  // 2. Low guard
  const isLow = current.sys < CFG.low.sys || current.dia < CFG.low.dia;
  const lowIsUsual = usual !== undefined && relative === "steady";
  if (isLow && !lowIsUsual) {
    return build("LOW_CHECK", "recheck_now", { escalate: true });
  }

  // 3. No usable baseline
  if (!usual) {
    if (category === "normal") return build("HEALTHY_FIRST", "none");
    if (category === "stage2") return build("HIGH_FIRST", "recheck_now", { escalate: true });
    return build("BORDERLINE_FIRST", "keep_logging");
  }

  // 4. Usable baseline
  const goalTag = flags.aboveGoal ? ["above_goal"] : [];
  const usualCategory = classify(usual.sys, usual.dia);
  const up = relative === "rose" || relative === "big_rise";
  const crossedIntoStage2 = category === "stage2" && rank(usualCategory) < rank("stage2");
  const bigRiseAtGoalOrAbove = relative === "big_rise" && flags.aboveGoal;

  if (up && (bigRiseAtGoalOrAbove || crossedIntoStage2)) {
    return build("SIGNIFICANTLY_HIGHER", "recheck_now", { escalate: true, tags: goalTag });
  }

  if (up) {
    const level: ActionLevel = category === "stage2" ? "see_clinician_soon" : "keep_logging";
    return build("SLIGHTLY_HIGHER", level, { tags: [...goalTag, ...(relative === "big_rise" ? ["big_rise"] : [])] });
  }

  if (relative === "fell") {
    return build("BETTER_THAN_USUAL", "none", { tags: goalTag });
  }

  const steadyLevel: ActionLevel = 
    category === "stage2" ? "see_clinician_soon" : flags.aboveGoal ? "keep_logging" : "none";
  
  return build("STEADY", steadyLevel, { tags: goalTag });
}