export type RiskInputs = {
  age: number;
  sex: "male" | "female";
  sbp: number;
  smoking: "yes" | "no";
  bmi: number;
  region: string;
};

export type RiskResult = {
  percentage: number;
  category: "Low" | "Moderate" | "High";
};

export function calculateRisk(inputs: RiskInputs): RiskResult {
  // TODO: Swap this mock logic with the exact WHO 2019 coefficients and formulas.
  // For now, we generate a realistic-looking number based on age and BP.
  let baseRisk = 2.5; // baseline percentage
  
  if (inputs.age > 50) baseRisk += (inputs.age - 50) * 0.6;
  if (inputs.sbp > 130) baseRisk += (inputs.sbp - 130) * 0.15;
  if (inputs.smoking === "yes") baseRisk *= 1.8;
  if (inputs.sex === "male") baseRisk *= 1.2;
  if (inputs.bmi > 30) baseRisk += 1.5;

  // Cap at 99% for realism
  const percentage = Math.min(Number(baseRisk.toFixed(1)), 99);
  
  let category: "Low" | "Moderate" | "High" = "Low";
  if (percentage >= 5 && percentage < 20) category = "Moderate";
  if (percentage >= 20) category = "High";

  return { percentage, category };
}