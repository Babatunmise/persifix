"use client";

import { useState, useEffect } from "react";
import { getCategory } from "@/features/bp-interpreter/domain/evaluate";
import { interpret } from "@/features/bp-interpreter/domain/interpret";
import { calculateBaseline } from "@/features/bp-interpreter/domain/baseline";
import type { Baseline, Medication, ContextualInterpretation } from "@/features/bp-interpreter/domain/types";
import { COPY } from "@/features/bp-interpreter/domain/copy";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { GenesisFlow } from "@/components/onboarding/GenesisFlow";

export function BPInputForm() {
  // --- CORE STATE ---
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [prepPhase, setPrepPhase] = useState<"checklist" | "breathing" | "done">("checklist");
  const [isPrepared, setIsPrepared] = useState(true);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  
  const [step, setStep] = useState<"input" | "context" | "result">("input");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // --- CONTEXT STATE ---
  const [contextStep, setContextStep] = useState(0);
  const [contextAnswers, setContextAnswers] = useState<Record<string, string>>({});
  const [isMorning, setIsMorning] = useState(false);
  
  const [interpretation, setInterpretation] = useState<ContextualInterpretation | null>(null);
  const [realBaseline, setRealBaseline] = useState<Baseline | null>(null);

  // --- INIT APP & FETCH PROFILE/BASELINE ---
  useEffect(() => {
    const hour = new Date().getHours();
    setIsMorning(hour >= 5 && hour < 12);

    const initApp = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        
        // 1. Check Genesis Onboarding Status
        const { data: profile } = await supabase
          .from("profiles")
          .select("motivation")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.motivation) {
          setHasCompletedOnboarding(true);
        } else {
          setHasCompletedOnboarding(false);
          return; // Stop here, they need to onboard first
        }

        // 2. Fetch Baseline
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

  // --- PREP PHASE TIMER LOGIC ---
  useEffect(() => {
    if (prepPhase !== "breathing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsPrepared(true);
          setPrepPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [prepPhase]);

  // --- HANDLERS ---
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
    const eveningQuestions = ["stress", "diet", "alcohol", "medication", "nsaids"];
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
      if (!session) throw new Error("No session");

      const payload = { 
        systolic: sys, 
        diastolic: dia, 
        medication: finalContext.medication || "unknown",
        fullContext: { ...finalContext, isPrepared } // Add prep status here
      };

      try {
        const response = await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Server rejected reading");
      } catch (networkError) {
        // OFFLINE FALLBACK
        console.warn("Network failed. Saving reading locally.");
        const pending = JSON.parse(localStorage.getItem("sanctos_pending_readings") || "[]");
        pending.push({ ...payload, user_id: session.user.id, taken_at: new Date().toISOString() });
        localStorage.setItem("sanctos_pending_readings", JSON.stringify(pending));
      }

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

  // --- RENDER GATES ---
  if (hasCompletedOnboarding === null) {
    return <div className="text-center text-neutral-500 py-12">Loading...</div>;
  }

  if (hasCompletedOnboarding === false) {
    return <GenesisFlow onComplete={() => setHasCompletedOnboarding(true)} />;
  }

  if (prepPhase === "checklist") {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-2 text-[#F9F8F6]">The Sanctuary Moment.</h2>
        <p className="text-neutral-400 text-sm mb-8">A calm, accurate reading starts before you press the button.</p>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl mb-8 space-y-3 text-left">
          <p className="text-sm font-semibold text-emerald-400 mb-2">Before you measure:</p>
          <p className="text-sm text-neutral-300">✓ Sit with your back supported.</p>
          <p className="text-sm text-neutral-300">✓ Keep both feet flat on the floor.</p>
          <p className="text-sm text-neutral-300">✓ Rest your arm at heart level.</p>
          <p className="text-sm text-neutral-300">✓ Ensure the cuff is on bare skin.</p>
        </div>

        <div className="space-y-3">
          <button onClick={() => setPrepPhase("breathing")} className="w-full rounded-full bg-[#2E5B44] py-5 text-lg font-semibold text-white transition-opacity hover:opacity-90">
            Start Rest (Breather)
          </button>
          <button onClick={() => { setIsPrepared(true); setPrepPhase("done"); }} className="w-full rounded-full border border-neutral-700 py-5 text-lg font-semibold text-[#F9F8F6] hover:bg-neutral-800">
            I have rested for 5 minutes
          </button>
          <button onClick={() => { setIsPrepared(false); setPrepPhase("done"); }} className="w-full rounded-full bg-transparent py-4 text-sm font-medium text-neutral-500 hover:text-white">
            Skip preparation
          </button>
        </div>
      </div>
    );
  }

if (prepPhase === "breathing") {
    // Calculate breathing pacer text based on 10-second cycle
    const elapsed = 300 - timeLeft;
    const cycleTime = elapsed % 10;
    const pacerText = cycleTime < 4 ? "Breathe In" : "Breathe Out";

    return (
      <div className="space-y-6 text-center flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-2 text-[#F9F8F6]">Resting quietly.</h2>
        <p className="text-neutral-400 text-sm mb-8">Keep your arm supported. We&apos;ll let you know when it&apos;s time.</p>
        <div className="relative flex items-center justify-center w-64 h-64 mb-12">
          {/* The Sphere - Let CSS handle the timing smoothly */}
          <div className="absolute w-40 h-40 rounded-full animate-breathe-sphere"></div>
          
          {/* The Text */}
          <span className="relative z-10 text-2xl font-light tracking-wide text-white/90">
            {pacerText}
          </span>
        </div>
        <button 
          onClick={() => { setIsPrepared(true); setPrepPhase("done"); }} 
          className="rounded-full bg-white text-black px-8 py-4 font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          Jump to Reading Now
        </button>
      </div>
    );
  }

  // --- RENDER STEP 1: BP INPUT ---
  if (step === "input") {
    return (
      <div className="animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold mb-2 text-[#F9F8F6]">Log your reading</h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Systolic (top) is the pressure when your heart beats. Diastolic (bottom) is the pressure when it rests.
          </p>
        </div>
        
        <form onSubmit={handleInitialSubmit} className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <input type="number" inputMode="numeric" placeholder="120" value={systolic} onChange={(e) => setSystolic(e.target.value)} className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
            <span className="text-6xl text-neutral-600 font-light">/</span>
            <input type="number" inputMode="numeric" placeholder="80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
          </div>
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white hover:opacity-90">Next</button>
        </form>
      </div>
    );
  }

  // --- RENDER STEP 2: CONTEXT ---
  if (step === "context") {
    const morningQuestions = [
      { key: "sleep", title: "How did you sleep last night?", options: ["Less than 5 hrs", "5-7 hrs", "Slept well"] },
      { key: "medication", title: "Have you taken your BP medication today?", options: ["Yes", "No"] },
      { key: "nsaids", title: "Do you take pain relievers (like Ibuprofen) often?", options: ["Yes", "No"] }
    ];

    const eveningQuestions = [
      { key: "stress", title: "What's weighing on you today?", options: ["Work", "Money", "Family", "None"] },
      { key: "diet", title: "What did your last meal look like?", options: ["Light", "Heavy on Maggi", "Ate out"] },
      { key: "alcohol", title: "Did you have any alcohol today?", options: ["Yes", "No"] },
      { key: "medication", title: "Have you taken your BP medication today?", options: ["Yes", "No"] },
      { key: "nsaids", title: "Do you take pain relievers (like Ibuprofen) often?", options: ["Yes", "No"] }
    ];

    const currentQ = (isMorning ? morningQuestions : eveningQuestions)[contextStep];
    if (!currentQ) return null;

    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-2xl font-semibold mb-8 text-[#F9F8F6]">{currentQ.title}</h2>
        <div className="space-y-4">
          {currentQ.options.map(opt => (
            <button key={opt} onClick={() => handleAnswer(currentQ.key, opt)} disabled={isSaving} className="w-full rounded-3xl bg-neutral-800 py-6 text-xl font-semibold text-[#F9F8F6] transition-opacity hover:opacity-90 disabled:opacity-50">
              {isSaving ? "Saving..." : opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER STEP 3: RESULT ---
  if (!interpretation) return null;

  let copyKeyToUse = interpretation.state as string;
  if (interpretation.state === "BORDERLINE_FIRST" && interpretation.flags.edge) {
    copyKeyToUse = "BORDERLINE_FIRST_EDGE";
  }
  const copy = COPY[copyKeyToUse as keyof typeof COPY] || COPY.HEALTHY_FIRST;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center mb-8">
        <p className="text-lg text-neutral-400 mb-2">Thanks for checking in today.</p>
        <h2 className="text-6xl font-semibold text-[#F9F8F6]">{systolic}/{diastolic}</h2>
      </div>
      
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Meaning</p>
          <h3 className="text-xl font-semibold text-[#F9F8F6] mb-2">{copy.headline}</h3>
          <p className="text-neutral-300 leading-relaxed text-sm">{copy.subtext}</p>
        </div>

        {(contextAnswers.medication === "No" || contextAnswers.alcohol === "Yes" || (contextAnswers.stress && contextAnswers.stress !== "None") || contextAnswers.diet === "Heavy on Maggi" || contextAnswers.sleep === "Less than 5 hrs") && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">The Context</p>
            <div className="text-amber-500/90 text-sm leading-relaxed space-y-2">
              {contextAnswers.medication === "No" && <p>You mentioned missing your medication today. On days you miss a dose, your numbers tend to run higher.</p>}
              {contextAnswers.alcohol === "Yes" && <p>You mentioned having alcohol today. Alcohol can temporarily raise blood pressure.</p>}
              {contextAnswers.stress && contextAnswers.stress !== "None" && <p>You mentioned feeling stressed ({contextAnswers.stress}). On days like this, your numbers tend to run a bit higher.</p>}
              {contextAnswers.diet === "Heavy on Maggi" && <p>You mentioned a heavier meal. Salty foods can cause your body to hold onto water.</p>}
              {contextAnswers.sleep === "Less than 5 hrs" && <p>You logged less than 5 hours of sleep. Poor sleep can temporarily elevate blood pressure.</p>}
            </div>
          </div>
        )}

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

      <button 
        onClick={() => { 
          setStep("input"); 
          setContextStep(0); 
          setContextAnswers({}); 
          setInterpretation(null); 
          setSystolic(""); 
          setDiastolic(""); 
          setPrepPhase("checklist"); // Reset prep for next reading
        }} 
        className="w-full rounded-full bg-transparent py-4 text-sm font-medium text-[#2E5B44] underline"
      >
        Log another reading
      </button>
    </div>
  );
}