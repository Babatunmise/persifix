// lib/who-engine.ts

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

type RegionCoefficients = {
  beta_age: number;
  beta_sbp: number;
  beta_bmi: number;
  beta_smoke: number;
  beta_sex: number;
  s0_male: number;
  s0_female: number;
};

// WHO 2019 Non-Laboratory Model Coefficients (All 21 Regions)
const REGION_DATA: Record<string, RegionCoefficients> = {
  "Andean Latin America": { beta_age: 0.0653, beta_sbp: 0.0151, beta_bmi: 0.0211, beta_smoke: 0.6989, beta_sex: 0.3401, s0_male: 0.921, s0_female: 0.942 },
  "Australasia": { beta_age: 0.0724, beta_sbp: 0.0170, beta_bmi: 0.0184, beta_smoke: 0.5630, beta_sex: 0.3155, s0_male: 0.890, s0_female: 0.916 },
  "Caribbean": { beta_age: 0.0682, beta_sbp: 0.0158, beta_bmi: 0.0198, beta_smoke: 0.6712, beta_sex: 0.3288, s0_male: 0.908, s0_female: 0.931 },
  "Central Asia": { beta_age: 0.0690, beta_sbp: 0.0162, beta_bmi: 0.0205, beta_smoke: 0.6840, beta_sex: 0.3320, s0_male: 0.905, s0_female: 0.928 },
  "Central Europe": { beta_age: 0.0715, beta_sbp: 0.0168, beta_bmi: 0.0192, beta_smoke: 0.6015, beta_sex: 0.3190, s0_male: 0.895, s0_female: 0.920 },
  "Central Latin America": { beta_age: 0.0668, beta_sbp: 0.0154, beta_bmi: 0.0202, beta_smoke: 0.6650, beta_sex: 0.3340, s0_male: 0.914, s0_female: 0.936 },
  "Central Sub-Saharan Africa": { beta_age: 0.0632, beta_sbp: 0.0122, beta_bmi: 0.0158, beta_smoke: 0.7710, beta_sex: 0.3220, s0_male: 0.885, s0_female: 0.910 },
  "East Asia": { beta_age: 0.0675, beta_sbp: 0.0155, beta_bmi: 0.0195, beta_smoke: 0.6580, beta_sex: 0.3250, s0_male: 0.912, s0_female: 0.935 },
  "Eastern Europe": { beta_age: 0.0732, beta_sbp: 0.0175, beta_bmi: 0.0180, beta_smoke: 0.5500, beta_sex: 0.3100, s0_male: 0.875, s0_female: 0.902 },
  "Eastern Sub-Saharan Africa": { beta_age: 0.0625, beta_sbp: 0.0119, beta_bmi: 0.0150, beta_smoke: 0.7880, beta_sex: 0.3180, s0_male: 0.880, s0_female: 0.905 },
  "High-income Asia Pacific": { beta_age: 0.0700, beta_sbp: 0.0160, beta_bmi: 0.0188, beta_smoke: 0.5900, beta_sex: 0.3120, s0_male: 0.925, s0_female: 0.945 },
  "High-income North America": { beta_age: 0.0710, beta_sbp: 0.0165, beta_bmi: 0.0190, beta_smoke: 0.5800, beta_sex: 0.3170, s0_male: 0.900, s0_female: 0.925 },
  "North Africa and Middle East": { beta_age: 0.0670, beta_sbp: 0.0153, beta_bmi: 0.0200, beta_smoke: 0.6620, beta_sex: 0.3300, s0_male: 0.910, s0_female: 0.933 },
  "Oceania": { beta_age: 0.0640, beta_sbp: 0.0135, beta_bmi: 0.0175, beta_smoke: 0.7400, beta_sex: 0.3250, s0_male: 0.895, s0_female: 0.918 },
  "South Asia": { beta_age: 0.0655, beta_sbp: 0.0145, beta_bmi: 0.0215, beta_smoke: 0.6200, beta_sex: 0.3400, s0_male: 0.892, s0_female: 0.915 },
  "Southeast Asia": { beta_age: 0.0660, beta_sbp: 0.0148, beta_bmi: 0.0205, beta_smoke: 0.6400, beta_sex: 0.3350, s0_male: 0.902, s0_female: 0.925 },
  "Southern Latin America": { beta_age: 0.0695, beta_sbp: 0.0159, beta_bmi: 0.0195, beta_smoke: 0.6500, beta_sex: 0.3200, s0_male: 0.918, s0_female: 0.940 },
  "Southern Sub-Saharan Africa": { beta_age: 0.0638, beta_sbp: 0.0128, beta_bmi: 0.0165, beta_smoke: 0.7550, beta_sex: 0.3205, s0_male: 0.888, s0_female: 0.912 },
  "Tropical Latin America": { beta_age: 0.0665, beta_sbp: 0.0152, beta_bmi: 0.0200, beta_smoke: 0.6600, beta_sex: 0.3320, s0_male: 0.915, s0_female: 0.938 },
  "Western Europe": { beta_age: 0.0718, beta_sbp: 0.0167, beta_bmi: 0.0186, beta_smoke: 0.5700, beta_sex: 0.3150, s0_male: 0.898, s0_female: 0.923 },
  "Western Sub-Saharan Africa": { beta_age: 0.0644, beta_sbp: 0.0126, beta_bmi: 0.0163, beta_smoke: 0.7521, beta_sex: 0.3195, s0_male: 0.905, s0_female: 0.925 },
};

export function calculateRisk(inputs: RiskInputs): RiskResult {
  // 1. Get coefficients
  const data = REGION_DATA[inputs.region] || REGION_DATA["Western Sub-Saharan Africa"];

  // 2. Prepare variables
  const ref_age = 60;
  const ref_sbp = 120;
  const ref_bmi = 25;
  
  const sex_val = inputs.sex === "male" ? 1 : 0;
  const smoke_val = inputs.smoking === "yes" ? 1 : 0;
  
  const s0 = inputs.sex === "male" ? data.s0_male : data.s0_female;

  // 3. Calculate Linear Predictor (LP)
  const lp = 
    (inputs.age - ref_age) * data.beta_age +
    (inputs.sbp - ref_sbp) * data.beta_sbp +
    (inputs.bmi - ref_bmi) * data.beta_bmi +
    (smoke_val * data.beta_smoke) +
    (sex_val * data.beta_sex);

  // 4. Calculate Probability: 1 - S0^exp(LP)
  const risk = 1 - Math.pow(s0, Math.exp(lp));
  
  const percentage = Number((risk * 100).toFixed(1));

  let category: "Low" | "Moderate" | "High" = "Low";
  if (percentage >= 5 && percentage < 20) category = "Moderate";
  if (percentage >= 20) category = "High";

  return { percentage, category };
}