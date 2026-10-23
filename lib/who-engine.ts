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
  category: "Low" | "Moderate" | "High" | "Very High" | "Highest";
};

const COEFFICIENTS = {
  male: { age: 0.0644, sbp: 0.0126, bmi: 0.0163, smoke: 0.7521 },
  female: { age: 0.0720, sbp: 0.0152, bmi: 0.0186, smoke: 0.6151 }
};

const REGION_S0: Record<string, { male: number; female: number }> = {
  "Andean Latin America": { male: 0.8781, female: 0.9082 },
  "Australasia": { male: 0.9225, female: 0.9431 },
  "Caribbean": { male: 0.8885, female: 0.9150 },
  "Central Asia": { male: 0.8503, female: 0.8921 },
  "Central Europe": { male: 0.8582, female: 0.8966 },
  "Central Latin America": { male: 0.8939, female: 0.9205 },
  "Central Sub-Saharan Africa": { male: 0.8651, female: 0.8988 },
  "East Asia": { male: 0.9102, female: 0.9321 },
  "Eastern Europe": { male: 0.8410, female: 0.8823 },
  "Eastern Sub-Saharan Africa": { male: 0.8532, female: 0.8910 },
  "High-income Asia Pacific": { male: 0.9310, female: 0.9505 },
  "High-income North America": { male: 0.9022, female: 0.9290 },
  "North Africa and Middle East": { male: 0.8724, female: 0.9041 },
  "Oceania": { male: 0.8609, female: 0.8955 },
  "South Asia": { male: 0.8450, female: 0.8850 },
  "Southeast Asia": { male: 0.8800, female: 0.9100 },
  "Southern Latin America": { male: 0.8900, female: 0.9150 },
  "Southern Sub-Saharan Africa": { male: 0.8490, female: 0.8880 },
  "Tropical Latin America": { male: 0.8756, female: 0.9058 },
  "Western Europe": { male: 0.9155, female: 0.9382 },
  "Western Sub-Saharan Africa": { male: 0.8570, female: 0.8930 },
};

export function calculateRisk(inputs: RiskInputs): RiskResult {
  const beta = inputs.sex === "male" ? COEFFICIENTS.male : COEFFICIENTS.female;
  const regionData = REGION_S0[inputs.region] || REGION_S0["Western Sub-Saharan Africa"];
  const s0 = inputs.sex === "male" ? regionData.male : regionData.female;

  const smoke_val = inputs.smoking === "yes" ? 1 : 0;
  const lp = 
    (inputs.age - 60) * beta.age +
    (inputs.sbp - 120) * beta.sbp +
    (inputs.bmi - 25) * beta.bmi +
    (smoke_val * beta.smoke);

  const risk = 1 - Math.pow(s0, Math.exp(lp));
  const rawPercentage = risk * 100;
  const percentage = Number(rawPercentage.toFixed(1));

  // 5-Band Logic using the raw percentage
  let category: "Low" | "Moderate" | "High" | "Very High" | "Highest" = "Low";
  if (rawPercentage >= 5 && rawPercentage < 10) category = "Moderate";
  if (rawPercentage >= 10 && rawPercentage < 20) category = "High";
  if (rawPercentage >= 20 && rawPercentage < 30) category = "Very High";
  if (rawPercentage >= 30) category = "Highest";

  return { percentage, category };
}