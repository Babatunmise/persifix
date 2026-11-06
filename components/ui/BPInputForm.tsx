"use client";

import { useState } from "react";
import { evaluate, getCategory } from "@/features/bp-interpreter/domain/evaluate";
import { interpret } from "@/features/bp-interpreter/domain/interpret";
import type { Baseline, Medication, ContextualInterpretation } from "@/features/bp-interpreter/domain/types";
import { COPY } from "@/features/bp-interpreter/domain/copy";

export function BPInputForm() {
  const [step, setStep] = useState<"input" | "context" | "result">("input");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [medication, setMedication] = useState<Medication>("unknown");
  const [interpretation, setInterpretation] = useState<ContextualInterpretation | null>(null);
  const [error, setError] = useState("");

  // --- MOCK BASELINE FOR TESTING ---
  // Change this to null to test the "First Reading" experience.
  // Change it to an object to test the "Usual Baseline" experience.
  const MOCK_BASELINE: Baseline | null = null; 
  // Example with baseline: { sys: 120, dia: 80, distinctDays: 10, sessions: 10 }

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);

    if (isNaN(sys) || isNaN(dia)) {
      setError("Please enter both numbers.");
      return;
    }

    if (sys <= dia) {
      setError("The top number must be higher than the bottom number.");
      return;
    }

    setStep("context");
  };

  const handleFinalSubmit = (med: Medication) => {
    setMedication(med);
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    
    // Call the pure math engine
    const clinicalResult = evaluate(sys, dia, undefined, [], true); 
    
    // Call the smart translation engine
    const smartResult = interpret({
      current: { sys, dia, readingsInSession: 2 },
      baseline: MOCK_BASELINE,
      medication: med
    }, getCategory);

    setInterpretation(smartResult);
    setStep("result");
  };

  // --- RENDER STEP 1: BP INPUT ---
  if (step === "input") {
    return (
      <form onSubmit={handleInitialSubmit} className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <input
            type="number"
            inputMode="numeric"
            placeholder="120"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none"
          />
          <span className="text-6xl text-neutral-600 font-light">/</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="80"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none"
          />
        </div>

        {error && <p className="text-red-500 text-center text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white transition-opacity hover:opacity-90"
        >
          Next
        </button>
      </form>
    );
  }

  // --- RENDER STEP 2: CONTEXT ---
  if (step === "context") {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold mb-8">Have you taken your BP medication today?</h2>
        <div className="space-y-4">
          <button
            onClick={() => handleFinalSubmit("taken")}
            className="w-full rounded-3xl bg-[#F9F8F6] py-6 text-xl font-semibold text-black transition-opacity hover:opacity-90"
          >
            Yes, I took it
          </button>
          <button
            onClick={() => handleFinalSubmit("missed")}
            className="w-full rounded-3xl bg-neutral-800 py-6 text-xl font-semibold text-[#F9F8F6] transition-opacity hover:opacity-90"
          >
            No, I missed it
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER STEP 3: THE WARM CONTEXTUAL RESULT SCREEN ---
  if (!interpretation) return null;

 // Look up the copy based on the engine's specific key and edge flag
  let copyKeyToUse = interpretation.state as string;
  if (interpretation.state === "BORDERLINE_FIRST" && interpretation.flags.edge) {
    copyKeyToUse = "BORDERLINE_FIRST_EDGE";
  }
  
  // Fallback to Healthy First just in case
  const copy = COPY[copyKeyToUse as keyof typeof COPY] || COPY.HEALTHY_FIRST;
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-neutral-400 mb-2">Thanks for checking in today.</p>
        <h2 className="text-6xl font-semibold text-[#F9F8F6]">{systolic}/{diastolic}</h2>
      </div>

      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6">
        
        {/* The Meaning (Driven by the Smart Engine) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Meaning</p>
          <h3 className="text-xl font-semibold text-[#F9F8F6] mb-2">{copy.headline}</h3>
          <p className="text-neutral-300 leading-relaxed text-sm">
            {copy.subtext}
          </p>
        </div>

        {/* The Context (Driven by the flags) */}
        {interpretation.flags.missedMeds && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Context</p>
            <p className="text-amber-500/90 text-sm leading-relaxed">
              You mentioned missing your medication today. On days you miss a dose, your numbers tend to run higher. Please check your prescription schedule or contact your pharmacist.
            </p>
          </div>
        )}

        {/* The Action (Driven by the actionLevel) */}
        {interpretation.actionLevel !== "none" && (
          <div className="pt-4 border-t border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Action</p>
            <p className="text-neutral-300 leading-relaxed text-sm">
              {interpretation.actionLevel === "recheck_now" && "Take a moment to sit quietly and rest. We recommend checking your BP again in 5 minutes to see if it settles."}
              {interpretation.actionLevel === "keep_logging" && "Keep logging your readings over the next few days so we can build your usual pattern."}
              {interpretation.actionLevel === "see_clinician_soon" && "Please schedule a check-up with your doctor to discuss this reading."}
              {interpretation.actionLevel === "urgent" && "Please seek immediate medical attention."}
            </p>
          </div>
        )}

      </div>

      <button 
        onClick={() => { 
          setStep("input"); 
          setInterpretation(null); 
          setSystolic(""); 
          setDiastolic(""); 
        }} 
        className="w-full rounded-full bg-transparent py-4 text-sm font-medium text-[#2E5B44] underline"
      >
        Log another reading
      </button>
    </div>
  );
}