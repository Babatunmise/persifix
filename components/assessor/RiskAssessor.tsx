"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { COUNTRIES } from "@/data/who-regions";
import { calculateRisk, type RiskResult } from "@/lib/who-engine";

export function RiskAssessor() {
  const [step, setStep] = useState<"hook" | "eligibility" | "suppressed" | "symptoms" | "location" | "established" | "high-risk" | "inputs" | "emergency" | "age-gate" | "result">("hook");
  
  // Location
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");

  // Inputs
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [smoking, setSmoking] = useState<"yes" | "no" | "">("");
  const [smokingYears, setSmokingYears] = useState("");
  const [sbp, setSbp] = useState("");
  const [dbp, setDbp] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [diabetes, setDiabetes] = useState<"yes" | "no" | "">("");
  const [meds, setMeds] = useState<"yes" | "no" | "">("");

  // Result
  const [result, setResult] = useState<RiskResult | null>(null);
  
  // Conversational Input Step
  const [inputStep, setInputStep] = useState<"age" | "sex" | "smoking" | "smokingYears" | "sbp" | "height" | "weight" | "diabetes" | "meds">("age");

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountry = e.target.value;
    setCountry(selectedCountry);
    const countryData = COUNTRIES.find((c) => c.name === selectedCountry);
    if (countryData) setRegion(countryData.region);
  };

  const handleSubmit = () => {
    const numericHeight = parseInt(height);
    const numericWeight = parseInt(weight);

    // Suppression Rule (Diabetes or Meds)
    if (diabetes === "yes" || meds === "yes") {
      setResult(null);
      setStep("suppressed");
      return;
    }

    const bmi = numericWeight / Math.pow(numericHeight / 100, 2);

    const calculated = calculateRisk({
      age: parseInt(age),
      sex: sex as "male" | "female",
      sbp: parseInt(sbp),
      smoking: smoking as "yes" | "no",
      bmi,
      region,
    });

    setResult(calculated);
    setStep("result");
  };

  const getBMI = () => (parseInt(weight) / Math.pow(parseInt(height) / 100, 2)).toFixed(1);

  // --- RENDER STEPS ---

  if (step === "hook") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Understand your heart.</h1>
        <p className="mt-6 max-w-md text-lg text-neutral-400 leading-relaxed">
          A 2-minute assessment to estimate your 10-year risk of a heart attack or stroke. No data is stored or sent to a server.
        </p>
        <button onClick={() => setStep("eligibility")} className="mt-10 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105">
          Begin Assessment
        </button>
      </Container>
    );
  }

  if (step === "eligibility") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Before we begin.</h1>
        <p className="mt-6 max-w-lg text-lg text-neutral-300 leading-relaxed">
          This tool is designed for adults aged 40-74 who do not have established heart disease, diabetes, or take medication for blood pressure or cholesterol.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button onClick={() => setStep("symptoms")} className="flex-1 rounded-xl bg-white px-6 py-4 text-base font-semibold text-black hover:scale-105 transition-transform">
            I fit these criteria
          </button>
          <button onClick={() => setStep("suppressed")} className="flex-1 rounded-xl bg-neutral-800 px-6 py-4 text-base font-semibold text-white hover:bg-neutral-700 transition-colors">
            I do not
          </button>
        </div>
      </Container>
    );
  }

  if (step === "suppressed") {
    return (
      <>
        <div className="hidden print:block bg-white text-black p-12 max-w-3xl mx-auto w-full">
          <div className="border-b-2 border-black pb-4 mb-8">
            <h1 className="text-3xl font-bold">SANCTOS.</h1>
            <p className="text-sm mt-1">Your medical sanctuary.</p>
          </div>
          <h2 className="text-xl font-semibold mb-4">Cardiovascular Risk Summary</h2>
          <p className="mb-8 text-sm text-gray-600">This report is an educational estimate based on WHO 2019 guidelines. It does not diagnose disease.</p>
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Patient Profile</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>Age:</strong> {age || "—"}</li>
                <li><strong>Sex:</strong> {sex || "—"}</li>
                <li><strong>Region:</strong> {country || "—"} {region ? `(${region})` : ""}</li>
                <li><strong>Blood Pressure:</strong> {sbp ? `${sbp}/${dbp} mmHg` : "—"}</li>
                <li><strong>BMI:</strong> {height && weight ? `${getBMI()} kg/m²` : "—"}</li>
                <li><strong>Smoker:</strong> {smoking || "—"} {smoking === "yes" ? `(${smokingYears} years)` : ""}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Estimated Risk</h3>
              <div className="text-lg font-bold text-black border border-black p-3 mt-1">Risk score not calculated.</div>
           <p className="text-sm mt-2 text-gray-600">Because of your answers, this calculator can’t reliably estimate your risk. The WHO 2019 non-laboratory model does not account for diabetes or cholesterol/blood pressure medications. Please consult a doctor for an accurate assessment.</p>
            </div>
          </div>
          <div className="border border-gray-300 p-4 text-sm mb-8">
            <p className="font-semibold mb-2">Questions to ask your doctor:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Given my medical history, what is my actual cardiovascular risk?</li>
              <li>Are my current blood pressure and cholesterol levels optimal?</li>
              <li>What lifestyle changes would be most impactful for me?</li>
              <li>How often should I be monitoring my blood pressure?</li>
            </ul>
          </div>
       <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
            <p><strong>Algorithm:</strong> WHO 2019 Non-Laboratory Cardiovascular Risk Model</p>
            <p><strong>Engine Version:</strong> v1.0.0 (Validated against 488,648 WHO vectors)</p>
            <p><strong>Generated on:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="mt-2">Generated by SANCTOS (sanctos.health). Not a medical device. No clinical claim.</p>
          </div>
        </div>

        <Container className="print:hidden flex flex-1 flex-col items-center justify-center py-24 text-center">
          <div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800 max-w-lg">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Assessment Not Applicable</h1>
          <p className="mt-4 text-base text-neutral-300">
              Because of your answers, this calculator can’t reliably estimate your risk. The WHO 2019 non-laboratory model does not account for diabetes or medications.
            </p>
          </div>
          <div className="mt-10 flex gap-4">
            <button onClick={() => window.print()} className="rounded-full bg-white px-8 py-4 text-base font-semibold text-black hover:scale-105 transition-transform">
              Download Sanctos Report
            </button>
          </div>
          <div className="mt-8 w-full max-w-md border-t border-neutral-800 pt-8">
            <p className="text-sm text-white">Sanctos is building continuous management tools for hypertension and medication tracking.</p>
            <form action="https://buttondown.com/api/emails/embed-subscribe/sanctos" method="post" target="popupwindow" onSubmit={() => window.open('https://buttondown.com/sanctos', 'popupwindow')} className="mt-4 flex gap-2">
              <input type="email" name="email" placeholder="Email address" required className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
              <input type="hidden" value="1" name="embed" />
              <button type="submit" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:scale-105 transition-transform">Join Waitlist</button>
            </form>
          </div>
        </Container>
      </>
    );
  }

  if (step === "symptoms") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Are you experiencing any of the following right now?</h1>
        <p className="mt-6 max-w-lg text-lg text-neutral-300 leading-relaxed">
          Chest pain, severe shortness of breath, sudden weakness, or difficulty speaking.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button onClick={() => setStep("emergency")} className="flex-1 rounded-xl bg-rose-950 px-6 py-4 text-base font-semibold text-rose-400 ring-1 ring-rose-900 hover:bg-rose-900/50 transition-colors">
            Yes, I have these symptoms
          </button>
          <button onClick={() => setStep("location")} className="flex-1 rounded-xl bg-white px-6 py-4 text-base font-semibold text-black hover:scale-105 transition-transform">
            No, I do not
          </button>
        </div>
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
          <div className="mt-8 border-t border-neutral-800 pt-6">
            <p className="text-sm text-white">We are building tools to help you organize your symptoms and BP logs for your next cardiology visit.</p>
            <form action="https://buttondown.com/api/emails/embed-subscribe/sanctos" method="post" target="popupwindow" onSubmit={() => window.open('https://buttondown.com/sanctos', 'popupwindow')} className="mt-4 flex gap-2">
              <input type="email" name="email" placeholder="Email address" required className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
              <input type="hidden" value="1" name="embed" />
              <button type="submit" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:scale-105 transition-transform">Join Waitlist</button>
            </form>
          </div>
        </div>
      </Container>
    );
  }

  if (step === "age-gate") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-neutral-900 p-8 ring-1 ring-neutral-800 max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Outside Assessment Range</h1>
          <p className="mt-4 text-base text-neutral-300">This specific WHO risk chart is designed for adults aged 40 to 74. Because you are outside this range, your clinical risk profile requires a different assessment approach. Please consult a healthcare professional for an accurate evaluation.</p>
          <div className="mt-8 border-t border-neutral-800 pt-6">
            <p className="text-sm text-white">Sanctos is building tools to help you establish a healthy cardiovascular baseline early.</p>
            <form action="https://buttondown.com/api/emails/embed-subscribe/sanctos" method="post" target="popupwindow" onSubmit={() => window.open('https://buttondown.com/sanctos', 'popupwindow')} className="mt-4 flex gap-2">
              <input type="email" name="email" placeholder="Email address" required className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
              <input type="hidden" value="1" name="embed" />
              <button type="submit" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:scale-105 transition-transform">Join Waitlist</button>
            </form>
          </div>
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
    const steps = smoking === "yes" 
      ? ["age", "sex", "smoking", "smokingYears", "sbp", "height", "weight", "diabetes", "meds"] 
      : ["age", "sex", "smoking", "sbp", "height", "weight", "diabetes", "meds"];
    const currentIndex = steps.indexOf(inputStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 max-w-lg mx-auto w-full text-center">
        
        <div className="w-full max-w-xs mb-12">
          <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {inputStep === "age" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">How old are you?</h2>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 45" autoFocus className="w-full text-center rounded-2xl bg-neutral-900 px-6 py-6 text-3xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
            <p className="text-sm text-neutral-500">Used to determine age-related baseline risk.</p>
            <button 
              onClick={() => {
                const numericAge = parseInt(age);
                if (numericAge < 40 || numericAge > 74) { setStep("age-gate"); return; }
                setInputStep("sex");
              }} 
              disabled={!age || parseInt(age) < 1} 
              className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {inputStep === "sex" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">What is your biological sex?</h2>
            <div className="flex gap-4">
              <button onClick={() => { setSex("male"); setInputStep("smoking"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">Male</button>
              <button onClick={() => { setSex("female"); setInputStep("smoking"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">Female</button>
            </div>
            <p className="text-sm text-neutral-500">Cardiovascular risk profiles differ between biological sexes.</p>
          </div>
        )}

        {inputStep === "smoking" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Do you currently smoke?</h2>
            <div className="flex gap-4">
              <button onClick={() => { setSmoking("yes"); setInputStep("smokingYears"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">Yes</button>
              <button onClick={() => { setSmoking("no"); setInputStep("sbp"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">No</button>
            </div>
            <p className="text-sm text-neutral-500">Smoking significantly accelerates arterial damage.</p>
          </div>
        )}

        {inputStep === "smokingYears" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">For how many years?</h2>
            <input type="number" value={smokingYears} onChange={(e) => setSmokingYears(e.target.value)} placeholder="e.g. 10" autoFocus className="w-full text-center rounded-2xl bg-neutral-900 px-6 py-6 text-3xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
            <p className="text-sm text-neutral-500">This helps us personalize your results.</p>
            <button onClick={() => setInputStep("sbp")} disabled={!smokingYears} className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50">Continue</button>
          </div>
        )}

        {inputStep === "sbp" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Blood Pressure</h2>
            <p className="text-neutral-400">From your most recent reading.</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-500 mb-2">Systolic (Top)</label>
                <input type="number" value={sbp} onChange={(e) => setSbp(e.target.value)} placeholder="120" autoFocus className="w-full text-center rounded-2xl bg-neutral-900 px-4 py-6 text-2xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-500 mb-2">Diastolic (Bottom)</label>
                <input type="number" value={dbp} onChange={(e) => setDbp(e.target.value)} placeholder="80" className="w-full text-center rounded-2xl bg-neutral-900 px-4 py-6 text-2xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
              </div>
            </div>
            <button 
              onClick={() => {
                const numericSbp = parseInt(sbp);
                const numericDbp = parseInt(dbp);
                if (numericSbp >= 180 || numericDbp >= 120) { setStep("emergency"); return; }
                setInputStep("height");
              }} 
              disabled={
                !sbp || parseInt(sbp) < 50 || parseInt(sbp) > 300 || 
                !dbp || parseInt(dbp) < 30 || 
                parseInt(dbp) > parseInt(sbp)
              } 
              className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {inputStep === "height" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">What is your height?</h2>
            <div className="relative">
              <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" autoFocus className="w-full text-center rounded-2xl bg-neutral-900 px-6 py-6 text-3xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">cm</span>
            </div>
            <button onClick={() => setInputStep("weight")} disabled={!height || parseInt(height) < 100} className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50">Continue</button>
          </div>
        )}

        {inputStep === "weight" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">What is your weight?</h2>
            <div className="relative">
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" autoFocus className="w-full text-center rounded-2xl bg-neutral-900 px-6 py-6 text-3xl text-white outline-none ring-1 ring-neutral-800 focus:ring-2 focus:ring-white transition-all" />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">kg</span>
            </div>
            <p className="text-sm text-neutral-500">Height and weight are used to calculate BMI.</p>
         <button 
              onClick={() => setInputStep("diabetes")} 
              disabled={!weight || parseInt(weight) < 30 || (parseInt(weight) / Math.pow(parseInt(height) / 100, 2)) > 80} 
              className="w-full rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {inputStep === "diabetes" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Have you been diagnosed with diabetes?</h2>
            <div className="flex gap-4">
              <button onClick={() => { setDiabetes("yes"); setInputStep("meds"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">Yes</button>
              <button onClick={() => { setDiabetes("no"); setInputStep("meds"); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">No</button>
            </div>
          </div>
        )}

        {inputStep === "meds" && (
          <div className="w-full space-y-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white">Are you currently taking medication for blood pressure or cholesterol?</h2>
            <div className="flex gap-4">
              <button onClick={() => { setMeds("yes"); handleSubmit(); }} className="flex-1 rounded-2xl bg-neutral-900 py-8 text-xl font-semibold text-white ring-1 ring-neutral-800 hover:bg-neutral-800 transition-colors">Yes</button>
              <button onClick={() => { setMeds("no"); handleSubmit(); }} className="flex-1 rounded-2xl bg-rose-500 py-8 text-xl font-semibold text-white hover:scale-105 transition-transform">No, Calculate</button>
            </div>
          </div>
        )}
      </Container>
    );
  }

  if (step === "result" && result) {
    const isHighest = result.category === "Highest";
    const isVeryHigh = result.category === "Very High";
    const isHigh = result.category === "High";
    const isMod = result.category === "Moderate";
    
    const colorClass = isHighest ? "text-rose-600" : isVeryHigh ? "text-rose-400" : isHigh ? "text-orange-400" : isMod ? "text-amber-400" : "text-emerald-400";
    const bgClass = isHighest ? "bg-rose-950/50 ring-rose-900" : isVeryHigh ? "bg-rose-950/30 ring-rose-900" : isHigh ? "bg-orange-950/30 ring-orange-900" : isMod ? "bg-amber-950/30 ring-amber-900" : "bg-emerald-950/30 ring-emerald-900";
    const bmi = getBMI();

    return (
      <>
        <div className="hidden print:block bg-white text-black p-12 max-w-3xl mx-auto w-full">
          <div className="border-b-2 border-black pb-4 mb-8">
            <h1 className="text-3xl font-bold">SANCTOS.</h1>
            <p className="text-sm mt-1">Your medical sanctuary.</p>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Cardiovascular Risk Summary</h2>
          <p className="mb-8 text-sm text-gray-600">This report is an educational estimate based on WHO 2019 guidelines. It does not diagnose disease.</p>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Patient Profile</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>Age:</strong> {age}</li>
                <li><strong>Sex:</strong> {sex}</li>
                <li><strong>Region:</strong> {country} ({region})</li>
                <li><strong>Blood Pressure:</strong> {sbp}/{dbp} mmHg</li>
                <li><strong>BMI:</strong> {bmi} kg/m²</li>
                <li><strong>Smoker:</strong> {smoking} {smoking === "yes" ? `(${smokingYears} years)` : ""}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Estimated Risk</h3>
              <div className="text-4xl font-bold">{result.percentage}%</div>
              <div className="text-lg font-semibold mt-1">{result.category} Risk</div>
              <p className="text-sm mt-2 text-gray-600">10-year risk of heart attack or stroke.</p>
            </div>
          </div>

          <div className="border border-gray-300 p-4 text-sm mb-8">
            <p><strong>Next Step:</strong> {isHighest || isVeryHigh || isHigh || isMod ? "Because your risk is elevated, schedule a routine check-up with a healthcare professional." : "Continue maintaining healthy habits and routine check-ups."}</p>
            {smoking === "yes" && smokingYears && (
              <p className="mt-2 text-sm font-semibold text-black">
                Note: Because you have been smoking for {smokingYears} years, quitting is the single most impactful action you can take to lower this risk.
              </p>
            )}
          </div>

          <div className="border border-gray-300 p-4 text-sm">
            <p className="font-semibold mb-2">Questions to ask your doctor:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Given my risk score, do I need to start any medications?</li>
              <li>Are my current blood pressure and cholesterol levels optimal?</li>
              <li>What lifestyle changes would be most impactful for me?</li>
              <li>How often should I be monitoring my blood pressure?</li>
            </ul>
          </div>

          <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
            <p>Algorithm: WHO 2019 Non-Laboratory Cardiovascular Risk Model</p>
            <p>Generated by SANCTOS (sanctos.health)</p>
            <p>Not a medical device. No clinical claim.</p>
          </div>
        </div>

        <Container className="print:hidden flex flex-1 flex-col items-center justify-center py-24 text-center">
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
              {isHighest || isVeryHigh || isHigh || isMod
                ? "Because your risk is elevated, we recommend scheduling a routine check-up with a healthcare professional."
                : "Continue maintaining your healthy habits and routine check-ups."}
            </p>
            {smoking === "yes" && smokingYears && (
              <p className="mt-4 text-base font-medium text-white border-t border-white/10 pt-4">
                Because you have been smoking for {smokingYears} years, quitting is the single most impactful action you can take to lower this risk.
              </p>
            )}
          </div>

          <div className="mt-10 flex gap-4">
            <button onClick={() => window.print()} className="rounded-full bg-white px-8 py-4 text-base font-semibold text-black hover:scale-105 transition-transform">
              Download Sanctos Report
            </button>
          </div>

          <div className="mt-16 w-full max-w-md border-t border-neutral-800 pt-8">
            <p className="text-sm font-medium text-white">Stay updated on Sanctos.</p>
            <p className="mt-2 text-xs text-neutral-500">
              Occasional updates on our cardiovascular tools. No health data is collected. Unsubscribe anytime.
            </p>
            <form action="https://buttondown.com/api/emails/embed-subscribe/sanctos" method="post" target="popupwindow" onSubmit={() => window.open('https://buttondown.com/sanctos', 'popupwindow')} className="mt-4 flex gap-2">
              <input type="email" name="email" placeholder="Email address" required className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white outline-none ring-1 ring-neutral-700 focus:ring-2 focus:ring-white" />
              <input type="hidden" value="1" name="embed" />
              <button type="submit" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:scale-105 transition-transform">Subscribe</button>
            </form>
          </div>
        </Container>
      </>
    );
  }

  return null;
}
