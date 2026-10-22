"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { COUNTRIES } from "@/data/who-regions";
import { calculateRisk, type RiskResult } from "@/lib/who-engine";

export function RiskAssessor() {
  const [step, setStep] = useState<"hook" | "location" | "established" | "high-risk" | "inputs" | "emergency" | "age-gate" | "result">("hook");
  
  // Location
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");

  // Inputs
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [smoking, setSmoking] = useState<"yes" | "no" | "">("");
  const [sbp, setSbp] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Result
  const [result, setResult] = useState<RiskResult | null>(null);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    setCountry(selectedCountry);
    const countryData = COUNTRIES.find((c) => c.name === selectedCountry);
    if (countryData) setRegion(countryData.region);
  };

  const handleSubmit = () => {
    const numericAge = parseInt(age);
    const numericSbp = parseInt(sbp);
    const numericHeight = parseInt(height);
    const numericWeight = parseInt(weight);

    // Safety Gates
    if (numericAge < 40 || numericAge > 80) { setStep("age-gate"); return; }
    if (numericSbp >= 180) { setStep("emergency"); return; }

    // Calculate BMI
    const bmi = numericWeight / Math.pow(numericHeight / 100, 2);

    // Run Engine
    const calculated = calculateRisk({
      age: numericAge,
      sex: sex as "male" | "female",
      sbp: numericSbp,
      smoking: smoking as "yes" | "no",
      bmi,
      region,
    });

    setResult(calculated);
    setStep("result");
  };

  // --- RENDER STEPS ---

  if (step === "hook") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Understand your heart.</h1>
        <p className="mt-6 max-w-md text-lg text-neutral-400 leading-relaxed">
          A 2-minute assessment to estimate your 10-year risk of a heart attack or stroke. No data is stored or sent to a server.
        </p>
        <button onClick={() => setStep("location")} className="mt-10 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105">
          Begin Assessment
        </button>
      </Container>
    );
  }

  if (step === "location") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Where do you live?</h1>
        <select value={country} onChange={handleCountryChange} className="mt-8 w-full max-w-md appearance-none rounded-xl bg-neutral-800 px-6 py-4 text-center text-lg text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white">
          <option value="" disabled>Select your country</option>
          {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <button onClick={() => setStep("established")} disabled={!country} className="mt-8 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50">
          Continue
        </button>
      </Container>
    );
  }

  if (step === "established") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Medical History</h1>
        <p className="mt-6 max-w-lg text-lg text-neutral-300 leading-relaxed">
          Has a doctor ever told you that you have heart disease, had a heart attack, stroke, or heart failure?
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button onClick={() => setStep("high-risk")} className="flex-1 rounded-xl bg-neutral-800 px-6 py-4 text-base font-semibold text-white hover:bg-neutral-700">Yes</button>
          <button onClick={() => setStep("inputs")} className="flex-1 rounded-xl bg-white px-6 py-4 text-base font-semibold text-black hover:scale-105">No</button>
        </div>
      </Container>
    );
  }

  if (step === "high-risk") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800 max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-rose-400">Highest Risk Category</h1>
          <p className="mt-4 text-base text-neutral-300">Established cardiovascular disease places you in the highest risk category. A risk score is not the right tool for you. Your focus should be on working with your doctor.</p>
        </div>
      </Container>
    );
  }

  if (step === "age-gate") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800 max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Outside Assessment Range</h1>
          <p className="mt-4 text-base text-neutral-300">This specific WHO risk chart is designed for adults aged 40 to 80. Because you are outside this range, your clinical risk profile requires a different assessment approach. Please consult a healthcare professional for an accurate evaluation.</p>
        </div>
      </Container>
    );
  }

  if (step === "emergency") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-rose-950 p-8 ring-1 ring-rose-900 max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-rose-400">Immediate Attention Required</h1>
          <p className="mt-4 text-lg text-white">Your blood pressure reading is extremely high. Please seek immediate medical attention or go to the nearest emergency room.</p>
        </div>
      </Container>
    );
  }

  if (step === "inputs") {
    return (
      <Container className="flex flex-1 flex-col py-16 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-center mb-10">Tell us about yourself.</h1>
        
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Age (40-80)</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 45" className="w-full rounded-xl bg-neutral-800 px-4 py-4 text-lg text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Sex</label>
              <div className="flex gap-2">
                <button onClick={() => setSex("male")} className={`flex-1 rounded-xl py-4 text-base font-semibold transition-colors ${sex === "male" ? "bg-white text-black" : "bg-neutral-800 text-white ring-1 ring-neutral-700"}`}>Male</button>
                <button onClick={() => setSex("female")} className={`flex-1 rounded-xl py-4 text-base font-semibold transition-colors ${sex === "female" ? "bg-white text-black" : "bg-neutral-800 text-white ring-1 ring-neutral-700"}`}>Female</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Do you currently smoke?</label>
            <div className="flex gap-2">
              <button onClick={() => setSmoking("yes")} className={`flex-1 rounded-xl py-4 text-base font-semibold transition-colors ${smoking === "yes" ? "bg-white text-black" : "bg-neutral-800 text-white ring-1 ring-neutral-700"}`}>Yes</button>
              <button onClick={() => setSmoking("no")} className={`flex-1 rounded-xl py-4 text-base font-semibold transition-colors ${smoking === "no" ? "bg-white text-black" : "bg-neutral-800 text-white ring-1 ring-neutral-700"}`}>No</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Systolic Blood Pressure (Top number)</label>
            <input type="number" value={sbp} onChange={(e) => setSbp(e.target.value)} placeholder="e.g. 120" className="w-full rounded-xl bg-neutral-800 px-4 py-4 text-lg text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Height (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" className="w-full rounded-xl bg-neutral-800 px-4 py-4 text-lg text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Weight (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" className="w-full rounded-xl bg-neutral-800 px-4 py-4 text-lg text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!age || !sex || !smoking || !sbp || !height || !weight} className="mt-8 w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
            Calculate Risk
          </button>
        </div>
      </Container>
    );
  }

  // RESULT STEP
  if (step === "result" && result) {
    const isHigh = result.category === "High";
    const isMod = result.category === "Moderate";
    const colorClass = isHigh ? "text-rose-400" : isMod ? "text-amber-400" : "text-emerald-400";
    const bgClass = isHigh ? "bg-rose-950/30 ring-rose-900" : isMod ? "bg-amber-950/30 ring-amber-900" : "bg-emerald-950/30 ring-emerald-900";

    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-medium text-neutral-400">Your 10-year risk is</h1>
        <div className={`mt-6 text-7xl font-bold tracking-tighter ${colorClass}`}>
          {result.percentage}%
        </div>
        <div className={`mt-2 rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-wider ${colorClass} bg-white/5`}>
          {result.category} Risk
        </div>

        <div className={`mt-10 rounded-2xl p-8 ring-1 max-w-lg ${bgClass}`}>
          <p className="text-lg text-neutral-200 leading-relaxed">
            This means that among 100 people with your profile, about {Math.round(result.percentage)} may have a heart attack or stroke in the next 10 years. 
            It does not mean you personally will.
          </p>
          <p className="mt-4 text-base text-neutral-400">
            {isHigh || isMod 
              ? "Because your risk is elevated, we recommend scheduling a routine check-up with a healthcare professional."
              : "Continue maintaining your healthy habits and routine check-ups."}
          </p>
        </div>

        <div className="mt-10 flex gap-4">
          <button onClick={() => alert("PDF generation coming next")} className="rounded-full bg-white px-8 py-4 text-base font-semibold text-black hover:scale-105 transition-transform">
            Download Sanctos Report
          </button>
        </div>
      </Container>
    );
  }

  return null;
}