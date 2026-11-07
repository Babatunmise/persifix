"use client";

import { useState, useEffect } from "react";
import { evaluate, getCategory } from "@/features/bp-interpreter/domain/evaluate";
import { interpret } from "@/features/bp-interpreter/domain/interpret";
import { calculateBaseline } from "@/features/bp-interpreter/domain/baseline";
import type { Baseline, Medication, ContextualInterpretation } from "@/features/bp-interpreter/domain/types";
import { COPY } from "@/features/bp-interpreter/domain/copy";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

export function BPInputForm() {
  const [step, setStep] = useState<"input" | "context" | "result">("input");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [medication, setMedication] = useState<Medication>("unknown");
  const [interpretation, setInterpretation] = useState<ContextualInterpretation | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // REAL BASELINE STATE
  const [realBaseline, setRealBaseline] = useState<Baseline | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Ensure Auth
        const session = await ensureAnonymousSession();
        if (!session) return;

        // 2. Fetch the last 14 readings to calculate the baseline
        const supabase = createClient();
        const { data, error } = await supabase
          .from("readings")
          .select("systolic, diastolic, taken_at")
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: false })
          .limit(14);

        if (!error && data) {
          const baseline = calculateBaseline(data);
          setRealBaseline(baseline);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    initApp();
  }, []);

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

  const handleFinalSubmit = async (med: Medication) => {
    setMedication(med);
    setError("");
    setIsSaving(true);

    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error("No active session found. Please try again.");

      const response = await fetch("/api/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          systolic: sys,
          diastolic: dia,
          medication: med,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save reading");
      }

      // 3. Calculate the smart interpretation USING THE REAL BASELINE
      const smartResult = interpret({
        current: { sys, dia, readingsInSession: 2 },
        baseline: realBaseline, // <-- Injected here
        medication: med
      }, getCategory);

      setInterpretation(smartResult);
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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

  if (step === "context") {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold mb-8">Have you taken your BP medication today?</h2>
        
        {error && <p className="text-red-500 text-center text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          <button
            onClick={() => handleFinalSubmit("taken")}
            disabled={isSaving}
            className="w-full rounded-3xl bg-[#F9F8F6] py-6 text-xl font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Yes, I took it"}
          </button>
          <button
            onClick={() => handleFinalSubmit("missed")}
            disabled={isSaving}
            className="w-full rounded-3xl bg-neutral-800 py-6 text-xl font-semibold text-[#F9F8F6] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "No, I missed it"}
          </button>
        </div>
      </div>
    );
  }

  if (!interpretation) return null;

  let copyKeyToUse = interpretation.state as string;
  if (interpretation.state === "BORDERLINE_FIRST" && interpretation.flags.edge) {
    copyKeyToUse = "BORDERLINE_FIRST_EDGE";
  }
  
  const copy = COPY[copyKeyToUse as keyof typeof COPY] || COPY.HEALTHY_FIRST;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-lg text-neutral-400 mb-2">Thanks for checking in today.</p>
        <h2 className="text-6xl font-semibold text-[#F9F8F6]">{systolic}/{diastolic}</h2>
      </div>

      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6">
        
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Meaning</p>
          <h3 className="text-xl font-semibold text-[#F9F8F6] mb-2">{copy.headline}</h3>
          <p className="text-neutral-300 leading-relaxed text-sm">
            {copy.subtext}
          </p>
        </div>

        {interpretation.flags.missedMeds && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Context</p>
            <p className="text-amber-500/90 text-sm leading-relaxed">
              You mentioned missing your medication today. On days you miss a dose, your numbers tend to run higher. Please check your prescription schedule or contact your pharmacist.
            </p>
          </div>
        )}

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