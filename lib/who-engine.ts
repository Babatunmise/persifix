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

const REGION_MAP: Record<string, string> = {
  "Andean Latin America": "andean_latin_america",
  "Australasia": "australasia",
  "Caribbean": "caribbean",
  "Central Asia": "central_asia",
  "Central Europe": "central_europe",
  "Central Latin America": "central_latin_america",
  "Central Sub-Saharan Africa": "central_subsaharan_africa",
  "East Asia": "east_asia",
  "Eastern Europe": "eastern_europe",
  "Eastern Sub-Saharan Africa": "eastern_subsaharan_africa",
  "High-income Asia Pacific": "high_income_asia_pacific",
  "High-income North America": "high_income_north_america",
  "North Africa and Middle East": "north_africa_middle_east",
  "Oceania": "oceania",
  "South Asia": "south_asia",
  "Southeast Asia": "southeast_asia",
  "Southern Latin America": "southern_latin_america",
  "Southern Sub-Saharan Africa": "southern_subsaharan_africa",
  "Tropical Latin America": "tropical_latin_america",
  "Western Europe": "western_europe",
  "Western Sub-Saharan Africa": "western_subsaharan_africa"
};

const COEFFICIENTS = {
  mi: {
    male: { log_hr_age: 0.073593, log_hr_bmi: 0.0337219, log_hr_sbp: 0.0133937, log_hr_smoking: 0.5954767, log_hr_bmi_age: -0.0010432, log_hr_sbp_age: -0.0001837, log_hr_smoking_age: -0.0200831 },
    female: { log_hr_age: 0.1049418, log_hr_bmi: 0.0257616, log_hr_sbp: 0.016726, log_hr_smoking: 1.093132, log_hr_bmi_age: -0.0006537, log_hr_sbp_age: -0.0001966, log_hr_smoking_age: -0.0343739 }
  },
  stroke: {
    male: { log_hr_age: 0.097674, log_hr_bmi: 0.0159518, log_hr_sbp: 0.0227294, log_hr_smoking: 0.4999862, log_hr_bmi_age: -0.0003516, log_hr_sbp_age: -0.0004374, log_hr_smoking_age: -0.0153895 },
    female: { log_hr_age: 0.1046105, log_hr_bmi: 0.0036406, log_hr_sbp: 0.0216741, log_hr_smoking: 0.7399405, log_hr_bmi_age: -1.29e-05, log_hr_sbp_age: -0.0005311, log_hr_smoking_age: -0.0203997 }
  }
};

const INCIDENCE: Record<string, { mi: { male: number[], female: number[] }, stroke: { male: number[], female: number[] } }> = {
  "north_africa_middle_east": { mi: { male: [61, 105, 172, 273, 424, 634, 905, 1240], female: [18, 34, 63, 113, 192, 313, 489, 734] }, stroke: { male: [52, 91, 152, 246, 386, 589, 871, 1252], female: [36, 63, 106, 173, 277, 430, 651, 963] } },
  "central_subsaharan_africa": { mi: { male: [27, 44, 69, 104, 153, 218, 302, 407], female: [10, 17, 29, 47, 73, 110, 162, 231] }, stroke: { male: [68, 104, 153, 218, 303, 410, 541, 697], female: [51, 79, 118, 171, 242, 333, 449, 592] } },
  "eastern_subsaharan_africa": { mi: { male: [31, 50, 78, 117, 172, 245, 340, 459], female: [11, 19, 32, 51, 79, 120, 175, 250] }, stroke: { male: [74, 113, 166, 236, 328, 444, 587, 756], female: [55, 85, 127, 184, 261, 360, 485, 639] } },
  "southern_subsaharan_africa": { mi: { male: [52, 84, 131, 199, 292, 419, 584, 794], female: [19, 33, 56, 92, 145, 221, 328, 473] }, stroke: { male: [88, 134, 197, 281, 391, 530, 700, 904], female: [65, 101, 151, 219, 310, 428, 576, 760] } },
  "western_subsaharan_africa": { mi: { male: [25, 41, 63, 95, 139, 198, 274, 370], female: [9, 16, 27, 44, 68, 103, 151, 216] }, stroke: { male: [63, 97, 142, 202, 280, 379, 500, 645], female: [47, 73, 109, 158, 224, 309, 416, 548] } },
  "southern_latin_america": { mi: { male: [44, 73, 116, 178, 265, 385, 543, 746], female: [11, 21, 38, 66, 111, 178, 277, 417] }, stroke: { male: [30, 51, 83, 130, 199, 296, 428, 603], female: [20, 35, 59, 95, 149, 227, 338, 490] } },
  "high_income_north_america": { mi: { male: [71, 116, 182, 277, 408, 584, 812, 1097], female: [21, 38, 67, 115, 188, 298, 455, 673] }, stroke: { male: [27, 47, 79, 128, 201, 308, 456, 659], female: [20, 35, 59, 97, 155, 241, 365, 538] } },
  "caribbean": { mi: { male: [74, 119, 186, 282, 414, 591, 820, 1106], female: [28, 48, 82, 134, 211, 323, 478, 687] }, stroke: { male: [55, 92, 147, 229, 345, 505, 718, 994], female: [43, 72, 117, 184, 281, 418, 604, 852] } },
  "andean_latin_america": { mi: { male: [26, 43, 68, 104, 155, 226, 319, 440], female: [9, 16, 28, 47, 76, 119, 181, 268] }, stroke: { male: [25, 42, 69, 109, 167, 249, 361, 510], female: [19, 33, 54, 87, 136, 207, 308, 445] } },
  "central_latin_america": { mi: { male: [52, 85, 134, 205, 304, 439, 616, 841], female: [17, 30, 53, 89, 144, 225, 341, 501] }, stroke: { male: [33, 56, 91, 143, 218, 323, 465, 653], female: [25, 43, 71, 113, 176, 266, 391, 560] } },
  "tropical_latin_america": { mi: { male: [61, 99, 155, 235, 347, 498, 695, 943], female: [20, 35, 61, 101, 163, 254, 383, 562] }, stroke: { male: [43, 72, 116, 181, 275, 406, 583, 815], female: [32, 54, 89, 141, 219, 330, 484, 692] } },
  "east_asia": { mi: { male: [44, 72, 114, 174, 258, 373, 523, 714], female: [14, 25, 44, 74, 121, 190, 290, 431] }, stroke: { male: [97, 159, 251, 383, 567, 816, 1140, 1549], female: [63, 105, 169, 264, 401, 591, 846, 1180] } },
  "south_asia": { mi: { male: [111, 172, 258, 375, 529, 727, 972, 1265], female: [43, 68, 106, 160, 235, 336, 469, 639] }, stroke: { male: [70, 111, 170, 253, 367, 518, 712, 955], female: [52, 84, 131, 199, 293, 422, 592, 811] } },
  "southeast_asia": { mi: { male: [61, 99, 155, 236, 349, 502, 703, 958], female: [22, 38, 66, 109, 176, 274, 414, 607] }, stroke: { male: [91, 147, 228, 343, 502, 714, 988, 1331], female: [63, 103, 163, 250, 373, 541, 765, 1054] } },
  "central_asia": { mi: { male: [137, 217, 333, 494, 713, 1001, 1369, 1823], female: [38, 66, 112, 184, 291, 449, 673, 981] }, stroke: { male: [121, 192, 294, 438, 633, 892, 1222, 1633], female: [81, 131, 206, 313, 464, 670, 942, 1292] } },
  "high_income_asia_pacific": { mi: { male: [24, 40, 64, 100, 152, 224, 322, 451], female: [6, 11, 20, 35, 58, 94, 148, 226] }, stroke: { male: [44, 74, 119, 186, 283, 418, 601, 843], female: [24, 42, 70, 113, 177, 269, 398, 574] } },
  "western_europe": { mi: { male: [49, 81, 129, 199, 298, 434, 616, 850], female: [10, 19, 34, 60, 102, 166, 262, 402] }, stroke: { male: [26, 45, 75, 121, 190, 291, 433, 628], female: [16, 28, 48, 80, 129, 202, 308, 458] } },
  "central_europe": { mi: { male: [87, 140, 218, 330, 486, 697, 973, 1323], female: [21, 37, 65, 110, 181, 288, 444, 665] }, stroke: { male: [62, 103, 165, 257, 389, 573, 822, 1150], female: [39, 66, 109, 174, 271, 411, 605, 869] } },
  "eastern_europe": { mi: { male: [178, 281, 431, 638, 921, 1295, 1775, 2373], female: [44, 77, 132, 217, 346, 536, 807, 1182] }, stroke: { male: [117, 186, 287, 427, 620, 875, 1203, 1611], female: [73, 119, 187, 286, 425, 615, 868, 1195] } },
  "oceania": { mi: { male: [99, 155, 235, 346, 495, 690, 936, 1238], female: [42, 68, 109, 168, 253, 369, 524, 724] }, stroke: { male: [97, 152, 230, 339, 486, 678, 920, 1218], female: [72, 114, 175, 261, 379, 537, 739, 994] } },
  "australasia": { mi: { male: [53, 88, 140, 216, 323, 471, 667, 920], female: [13, 24, 43, 74, 123, 197, 306, 461] }, stroke: { male: [22, 38, 64, 104, 165, 254, 380, 554], female: [16, 28, 48, 79, 127, 199, 303, 451] } }
};

export function calculateRiskRaw(inputs: RiskInputs): number {
  const rKey = REGION_MAP[inputs.region] || "western_subsaharan_africa";
  const inc = INCIDENCE[rKey]!;
  
  // FIXED: Correct 0-indexed age group calculation (40-44 = 0, 45-49 = 1, etc.)
  const ageGroupIndex = Math.floor((inputs.age - 40) / 5);
  
 const inc_mi = inc.mi[inputs.sex][ageGroupIndex] || 0;
  const inc_stroke = inc.stroke[inputs.sex][ageGroupIndex] || 0;

  const c_mi = COEFFICIENTS.mi[inputs.sex];
  const c_stroke = COEFFICIENTS.stroke[inputs.sex];

  const smoke_val = inputs.smoking === "yes" ? 1 : 0;
  const age_c = inputs.age - 60;
  const sbp_c = inputs.sbp - 120;
  const bmi_c = inputs.bmi - 25;

  // Exact R Code Translation for MI
  const lp_mi = 
    c_mi.log_hr_age * age_c +
    c_mi.log_hr_bmi * bmi_c +
    c_mi.log_hr_sbp * sbp_c +
    c_mi.log_hr_smoking * smoke_val +
    c_mi.log_hr_bmi_age * bmi_c * age_c +
    c_mi.log_hr_sbp_age * sbp_c * age_c +
    c_mi.log_hr_smoking_age * smoke_val * age_c;

  const annual_rate_mi = inc_mi / 100000;
  const p_mi_baseline = 1 - Math.exp(-10 * annual_rate_mi);
  const s0_mi = 1 - p_mi_baseline;
  
  let p_mi = 1 - Math.pow(s0_mi, Math.exp(lp_mi));
  p_mi = Math.max(0, Math.min(1, p_mi)); // Add the R pmax/pmin clamp

  // Exact R Code Translation for Stroke
  const lp_stroke = 
    c_stroke.log_hr_age * age_c +
    c_stroke.log_hr_bmi * bmi_c +
    c_stroke.log_hr_sbp * sbp_c +
    c_stroke.log_hr_smoking * smoke_val +
    c_stroke.log_hr_bmi_age * bmi_c * age_c +
    c_stroke.log_hr_sbp_age * sbp_c * age_c +
    c_stroke.log_hr_smoking_age * smoke_val * age_c;

  const annual_rate_stroke = inc_stroke / 100000;
  const p_stroke_baseline = 1 - Math.exp(-10 * annual_rate_stroke);
  const s0_stroke = 1 - p_stroke_baseline;

  let p_stroke = 1 - Math.pow(s0_stroke, Math.exp(lp_stroke));
  p_stroke = Math.max(0, Math.min(1, p_stroke)); // Add the R pmax/pmin clamp

  // Combine
  return 1 - (1 - p_mi) * (1 - p_stroke);
}

export function calculateRisk(inputs: RiskInputs): RiskResult {
  const risk = calculateRiskRaw(inputs);
  const rawPercentage = risk * 100;
  const percentage = Number(rawPercentage.toFixed(1));

  let category: "Low" | "Moderate" | "High" | "Very High" | "Highest" = "Low";
  if (rawPercentage >= 5 && rawPercentage < 10) category = "Moderate";
  if (rawPercentage >= 10 && rawPercentage < 20) category = "High";
  if (rawPercentage >= 20 && rawPercentage < 30) category = "Very High";
  if (rawPercentage >= 30) category = "Highest";

  return { percentage, category };
}