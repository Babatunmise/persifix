"use client";

import { useState, useEffect } from "react";
import { getCategory } from "@/features/bp-interpreter/domain/evaluate";
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
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // CONTEXT STATE
  const [contextStep, setContextStep] = useState(0);
  const [contextAnswers, setContextAnswers] = useState<Record<string, string>>({});
  const [isMorning, setIsMorning] = useState(false);
  
  const [interpretation, setInterpretation] = useState<ContextualInterpretation | null>(null);
  const [realBaseline, setRealBaseline] = useState<Baseline | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsMorning(hour >= 5 && hour < 12);

    const initApp = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        const { data } = await supabase
          .from("readings")
          .select("systolic, diastolic, taken_at")
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: false })
          .limit(14);

        if (data) {
          const baseline = calculateBaseline(data);
          setRealBaseline(baseline);
        }
      } catch (err) {
        console.error(err);
      }
    };

    initApp();
  }, []);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);

    if (isNaN(sys) || isNaN(dia) || sys <= dia) {
      setError("Please check your numbers.");
      return;
    }
    setStep("context");
  };

  const handleAnswer = (key: string, value: string) => {
    const updatedAnswers = { ...contextAnswers, [key]: value };
    setContextAnswers(updatedAnswers);
    
    const morningQuestions = ["sleep", "medication", "nsaids"];
    const eveningQuestions = ["stress", "diet", "medication", "nsaids"];
    const currentQuestions = isMorning ? morningQuestions : eveningQuestions;

    if (contextStep < currentQuestions.length - 1) {
      setContextStep(prev => prev + 1);
    } else {
      submitFinal(updatedAnswers);
    }
  };

  const submitFinal = async (finalContext: Record<string, string>) => {
    setIsSaving(true);
    setError("");
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ 
          systolic: sys, 
          diastolic: dia, 
          medication: finalContext.medication || "unknown",
          fullContext: finalContext
        }),
      });

      if (!response.ok) throw new Error("Failed to save.");

      const smartResult = interpret({
        current: { sys, dia, readingsInSession: 2 },
        baseline: realBaseline,
        medication: (finalContext.medication as Medication) || "unknown"
      }, getCategory);

      setInterpretation(smartResult);
      setStep("result");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (step === "input") {
    return (
      <form onSubmit={handleInitialSubmit} className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <input type="number" inputMode="numeric" placeholder="120" value={systolic} onChange={(e) => setSystolic(e.target.value)} className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
          <span className="text-6xl text-neutral-600 font-light">/</span>
          <input type="number" inputMode="numeric" placeholder="80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
        </div>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white hover:opacity-90">Next</button>
      </form>
    );
  }

  if (step === "context") {
    const morningQuestions = [
      { key: "sleep", title: "How did you sleep last night?", options: ["Less than 5 hrs", "5-7 hrs", "Slept well"] },
      { key: "medication", title: "Have you taken your BP medication today?", options: ["Yes", "No"] },
      { key: "nsaids", title: "Do you take pain relievers (like Ibuprofen) often?", options: ["Yes", "No"] }
    ];

    const eveningQuestions = [
      { key: "stress", title: "What's weighing on you today?", options: ["Work", "Money", "Family", "None"] },
      { key: "diet", title: "What did your last meal look like?", options: ["Light", "Heavy on Maggi", "Ate out"] },
        { key: "alcohol", title: "Did you have any alcohol today?", options: ["Yes", "No"] }, // <-- ADD THIS LINE
      { key: "medication", title: "Have you taken your BP medication today?", options: ["Yes", "No"] },
      { key: "nsaids", title: "Do you take pain relievers (like Ibuprofen) often?", options: ["Yes", "No"] }
    ];

    const currentQ = (isMorning ? morningQuestions : eveningQuestions)[contextStep];

    if (!currentQ) return null;

    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-semibold mb-8">{currentQ.title}</h2>
        <div className="space-y-4">
          {currentQ.options.map(opt => (
            <button
              key={opt}
              onClick={() => handleAnswer(currentQ.key, opt)}
              disabled={isSaving}
              className="w-full rounded-3xl bg-neutral-800 py-6 text-xl font-semibold text-[#F9F8F6] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : opt}
            </button>
          ))}
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
        
        {/* The Meaning */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Meaning</p>
          <h3 className="text-xl font-semibold text-[#F9F8F6] mb-2">{copy.headline}</h3>
          <p className="text-neutral-300 leading-relaxed text-sm">{copy.subtext}</p>
        </div>

        {/* The Context (Dynamically generated from answers) */}
        {(contextAnswers.medication === "No" || contextAnswers.alcohol === "Yes" || contextAnswers.stress && contextAnswers.stress !== "None" || contextAnswers.diet === "Heavy on Maggi" || contextAnswers.sleep === "Less than 5 hrs") && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Context</p>
            <div className="text-amber-500/90 text-sm leading-relaxed space-y-2">
              {contextAnswers.medication === "No" && (
                <p>You mentioned missing your medication today. On days you miss a dose, your numbers tend to run higher.</p>
              )}
              {contextAnswers.alcohol === "Yes" && (
                <p>You mentioned having alcohol today. Alcohol can temporarily raise blood pressure, and heavy drinking over time can cause it to stay elevated.</p>
              )}
              {contextAnswers.stress && contextAnswers.stress !== "None" && (
                <p>You mentioned feeling stressed ({contextAnswers.stress}). On days like this, your numbers tend to run a bit higher.</p>
              )}
              {contextAnswers.diet === "Heavy on Maggi" && (
                <p>You mentioned a heavier meal. Salty foods can cause your body to hold onto water.</p>
              )}
              {contextAnswers.sleep === "Less than 5 hrs" && (
                <p>You logged less than 5 hours of sleep. Poor sleep can temporarily elevate blood pressure.</p>
              )}
            </div>
          </div>
        )}

        {/* The Action */}
        {interpretation.actionLevel !== "none" && (
          <div className="pt-4 border-t border-neutral-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Action</p>
            <p className="text-neutral-300 leading-relaxed text-sm">
              {interpretation.actionLevel === "recheck_now" && "Take a moment to sit quietly and rest."}
              {interpretation.actionLevel === "keep_logging" && "Keep logging your readings over the next few days."}
              {interpretation.actionLevel === "see_clinician_soon" && "Please schedule a check-up with your doctor."}
            </p>
          </div>
        )}

      </div>
      <button onClick={() => { setStep("input"); setContextStep(0); setContextAnswers({}); setInterpretation(null); setSystolic(""); setDiastolic(""); }} className="w-full rounded-full bg-transparent py-4 text-sm font-medium text-[#2E5B44] underline">Log another reading</button>
    </div>
  );
}