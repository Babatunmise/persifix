// verify-math.ts
import fs from 'fs';
import path from 'path';
import { calculateRiskRaw } from './lib/who-engine';

// Map the R snake_case regions to our TS Title Case regions
const regionMap: Record<string, string> = {
  "andean_latin_america": "Andean Latin America",
  "australasia": "Australasia",
  "caribbean": "Caribbean",
  "central_asia": "Central Asia",
  "central_europe": "Central Europe",
  "central_latin_america": "Central Latin America",
  "central_subsaharan_africa": "Central Sub-Saharan Africa",
  "east_asia": "East Asia",
  "eastern_europe": "Eastern Europe",
  "eastern_subsaharan_africa": "Eastern Sub-Saharan Africa",
  "high_income_asia_pacific": "High-income Asia Pacific",
  "high_income_north_america": "High-income North America",
  "north_africa_middle_east": "North Africa and Middle East",
  "oceania": "Oceania",
  "south_asia": "South Asia",
  "southeast_asia": "Southeast Asia",
  "southern_latin_america": "Southern Latin America",
  "southern_subsaharan_africa": "Southern Sub-Saharan Africa",
  "tropical_latin_america": "Tropical Latin America",
  "western_europe": "Western Europe",
  "western_subsaharan_africa": "Western Sub-Saharan Africa"
};

const TOLERANCE = 1e-9;

async function run() {
  console.log("Loading golden.json...");
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'golden_out/golden.json'), 'utf-8'));
  const vectors = data.vectors;
  console.log(`Found ${vectors.length} vectors. Beginning comparison...`);

  let passed = 0;
  let failed = 0;

  for (const v of vectors) {
    const tsRegion = regionMap[v.region];
    if (!tsRegion) {
      console.error(`Unknown region mapping: ${v.region}`);
      failed++;
      continue;
    }

    const tsRisk = calculateRiskRaw({
      age: v.age,
      sex: v.sex,
      sbp: v.sbp,
      smoking: v.smoker === 1 ? "yes" : "no",
      bmi: v.bmi,
      region: tsRegion
    });

    const diff = Math.abs(tsRisk - v.risk);

    if (diff > TOLERANCE) {
      console.error(`FAIL | ID: ${v.id} | R: ${v.risk} | TS: ${tsRisk} | Diff: ${diff}`);
      failed++;
      if (failed > 10) {
        console.error("Too many failures. Halting to prevent terminal spam.");
        break;
      }
    } else {
      passed++;
    }
  }

  console.log(`\n==== RESULTS ====`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("✅ ALL VECTORS MATCH WITHIN 1e-9 TOLERANCE!");
  }
}

run();