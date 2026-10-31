"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const ScreenWrapper = ({ step, children }: { step: string, children: React.ReactNode }) => (
  <div key={step} className="animate-fade-in-up max-w-md mx-auto min-h-[80vh] flex flex-col justify-center px-6 py-12 text-[#F9F8F6]">
    {children}
  </div>
);

type SessionContext = { caffeine: string; meds: string; stress: string; meal: string };

function PersistentTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(1800);
  const finished = useRef(false);

  useEffect(() => {
    let targetEndTime = Number(localStorage.getItem("sanctos_30m_target"));
    if (!targetEndTime) {
      targetEndTime = Date.now() + 1800000; 
      localStorage.setItem("sanctos_30m_target", String(targetEndTime));
    }

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        localStorage.removeItem("sanctos_30m_target");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !finished.current) {
      finished.current = true;
      onFinish();
    }
  }, [timeLeft, onFinish]);

  const timeElapsed = 1800 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4; 
  const text = cycle === 0 ? "Breathe In" : cycle === 1 ? "Hold" : cycle === 2 ? "Breathe Out" : "Hold";

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleEarlyExit = () => {
    if (timeLeft > 0) {
      if (!window.confirm(`You still have ${minutes}m ${seconds}s left. We recommend resting for the full 30 minutes. Check BP now?`)) return;
    }
    localStorage.removeItem("sanctos_30m_target");
    if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  };

  return (
    <ScreenWrapper step="s9_30min_timer">
      <h1 className="text-4xl font-semibold tracking-tight text-center text-[#F9F8F6]">Let&apos;s wait a bit longer.</h1>
      <div className="mt-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 leading-relaxed text-left">
        <p className="font-semibold text-[#F9F8F6] mb-2">Why are we breathing?</p>
        <p>Deep, slow breathing stimulates your vagus nerve, which acts as your body’s natural &apos;brake&apos; system. This tells your heart to slow down and your blood vessels to relax.</p>
      </div>
      <div className="text-7xl font-mono tracking-tighter mt-8 mb-6 text-[#2E5B44] text-center">{minutes}:{seconds.toString().padStart(2, '0')}</div>
      <div className="relative flex items-center justify-center w-64 h-64 my-4 mx-auto">
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe-circle" />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe-circle" style={{ animationDelay: '-0.2s' }} />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full animate-breathe-circle" />
        <span className="absolute text-[#F9F8F6] text-2xl font-semibold z-10">{text}</span>
      </div>
      <button onClick={handleEarlyExit} className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Check Again Now</button>
    </ScreenWrapper>
  );
}

function BreathingTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(600);
  const finished = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const finish = useCallback(() => {
    if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  }, [onFinish]);

  useEffect(() => {
    if (timeLeft === 0) finish();
  }, [finish, timeLeft]);

  const timeElapsed = 600 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4; 
  const text = cycle === 0 ? "Breathe In" : cycle === 1 ? "Hold" : cycle === 2 ? "Breathe Out" : "Hold";

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <ScreenWrapper step="s9_timer">
      <h1 className="text-4xl font-semibold tracking-tight text-center text-[#F9F8F6]">Let&apos;s take a break.</h1>
      <div className="mt-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 leading-relaxed text-left">
        <p className="font-semibold text-[#F9F8F6] mb-2">Why are we breathing?</p>
        <p>Deep, slow breathing stimulates your vagus nerve, which acts as your body’s natural &apos;brake&apos; system. This tells your heart to slow down and your blood vessels to relax.</p>
      </div>
      <div className="text-7xl font-mono tracking-tighter mt-8 mb-6 text-[#2E5B44] text-center">{minutes}:{seconds.toString().padStart(2, '0')}</div>
      <div className="relative flex items-center justify-center w-64 h-64 my-4 mx-auto">
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe-circle" />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe-circle" style={{ animationDelay: '-0.2s' }} />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full animate-breathe-circle" />
        <span className="absolute text-[#F9F8F6] text-2xl font-semibold z-10">{text}</span>
      </div>
      <button onClick={finish} className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Done</button>
    </ScreenWrapper>
  );
}

export function BPInterpreter() {
  const [step, setStep] = useState<"onboarding" | "s1_age" | "s1_bp" | "s1_symptoms" | "s4_coffee" | "s4_meal" | "s4_meds" | "s4_stress" | "result" | "s9_timer" | "s9_30min_timer" | "emergency" | "urgent">("onboarding");
  
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingCount, setReadingCount] = useState(1);
  const [currentReadingId, setCurrentReadingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext>({ caffeine: "", meds: "", stress: "", meal: "" });

  const symptomList = ["Chest pain", "Severe headache", "One-sided weakness", "Trouble speaking", "Shortness of breath", "Confusion"];

  // Hydrate profile and resume a 30-minute wait when one is already in progress.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedName = localStorage.getItem("sanctos_name");
    const savedTitle = localStorage.getItem("sanctos_title");
    const savedAge = localStorage.getItem("sanctos_age");
    const saved30mTimer = localStorage.getItem("sanctos_30m_target");
    const savedReadingCount = Number(localStorage.getItem("sanctos_reading_count"));
    const savedReadingId = localStorage.getItem("sanctos_current_reading_id");
    const savedSessionId = localStorage.getItem("sanctos_session_id");
    const savedSessionContext = localStorage.getItem("sanctos_session_context");

    if (savedName) setName(savedName);
    if (savedTitle) setTitle(savedTitle);
    if (savedAge) setAge(savedAge);
    if (savedName && savedAge && saved30mTimer && savedSessionId) {
      const restoredContext = savedSessionContext ? JSON.parse(savedSessionContext) as SessionContext : null;
      setSessionId(savedSessionId);
      setSessionContext(restoredContext ?? { caffeine: "", meds: "", stress: "", meal: "" });
      if (savedReadingId) setCurrentReadingId(savedReadingId);
      if (savedReadingCount >= 1 && savedReadingCount <= 3) setReadingCount(savedReadingCount);
      setStep("s9_30min_timer");
    } else {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      setSessionContext({ caffeine: "", meds: "", stress: "", meal: "" });
      setReadingCount(1);
      localStorage.setItem("sanctos_session_id", newSessionId);
      localStorage.setItem("sanctos_reading_count", "1");
      localStorage.setItem("sanctos_session_context", JSON.stringify({ caffeine: "", meds: "", stress: "", meal: "" }));
      localStorage.removeItem("sanctos_session_context_complete");
      setStep(savedName && savedAge ? "s4_coffee" : savedName ? "s1_age" : "onboarding");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSymptom = (symptom: string) => setSymptoms(prev => prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]);

  const saveReadingToDB = async (additionalNotes: Record<string, unknown> = {}) => {
    if (!sessionId) throw new Error("Cannot save the reading because the session id is missing.");
    const supabase = createClient();
    let deviceId = localStorage.getItem("sanctos_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("sanctos_device_id", deviceId);
    }

    const { data, error: dbError } = await supabase.from("readings").insert({
      user_id: deviceId,
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      context_notes: JSON.stringify({
        ...sessionContext,
        ...additionalNotes,
        sessionId,
        readingNumber: readingCount
      })
    }).select("id").single();

    if (dbError) throw new Error(dbError.message);
    if (!data) throw new Error("The reading was saved without returning an id.");
    setCurrentReadingId(data.id);
    localStorage.setItem("sanctos_current_reading_id", data.id);
  };

  const updateBreathingStatus = async () => {
    if (!currentReadingId) throw new Error("Cannot update the reading because its id is missing.");
    const supabase = createClient();
    const { data, error: readError } = await supabase.from("readings")
      .select("context_notes")
      .eq("id", currentReadingId)
      .single();
    if (readError) throw new Error(readError.message);

    const savedContext: Record<string, unknown> = data.context_notes
      ? JSON.parse(data.context_notes)
      : {};
    const { error: dbError } = await supabase.from("readings")
      .update({ context_notes: JSON.stringify({ ...savedContext, didBreathing: true }) })
      .eq("id", currentReadingId);
    if (dbError) throw new Error(dbError.message);
  };

  const startNextReading = (nextCount: number) => {
    setSystolic("");
    setDiastolic("");
    setSymptoms([]);
    setCurrentReadingId(null);
    setError("");
    setReadingCount(nextCount);
    localStorage.setItem("sanctos_reading_count", String(nextCount));
    localStorage.removeItem("sanctos_current_reading_id");
    setStep("s1_bp");
  };

  const startNewSession = () => {
    const newSessionId = crypto.randomUUID();
    const emptyContext = { caffeine: "", meds: "", stress: "", meal: "" };
    setSessionId(newSessionId);
    setSessionContext(emptyContext);
    setReadingCount(1);
    setSystolic("");
    setDiastolic("");
    setSymptoms([]);
    setCurrentReadingId(null);
    setError("");
    localStorage.setItem("sanctos_session_id", newSessionId);
    localStorage.setItem("sanctos_session_context", JSON.stringify(emptyContext));
    localStorage.setItem("sanctos_reading_count", "1");
    localStorage.removeItem("sanctos_session_context_complete");
    localStorage.removeItem("sanctos_current_reading_id");
    localStorage.removeItem("sanctos_30m_target");
    setStep("s4_coffee");
  };

  const nextReadingCount = readingCount + 1;

  const startBreathingTimer = () => {
    setReadingCount(nextReadingCount);
    localStorage.setItem("sanctos_reading_count", String(nextReadingCount));
    setStep("s9_timer");
  };

  const startWaitingTimer = () => {
    setReadingCount(nextReadingCount);
    localStorage.setItem("sanctos_reading_count", String(nextReadingCount));
    localStorage.setItem("sanctos_30m_target", String(Date.now() + 1800000));
    setStep("s9_30min_timer");
  };

  const finishTimer = async () => {
    try {
      await updateBreathingStatus();
      startNextReading(readingCount);
    } catch (err) {
      const message = `Failed to update reading: ${err instanceof Error ? err.message : "Unknown error"}`;
      startNextReading(readingCount);
      setError(message);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    const sys = Number(systolic);
    const dia = Number(diastolic);

    if (sys > 260 || sys < 60 || dia > 160 || dia < 30 || dia >= sys) {
      setError("Please check your numbers.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const hasSymptoms = readingCount === 1 && symptoms.length > 0;
      if (hasSymptoms && (sys >= 130 || dia >= 85)) {
        await saveReadingToDB({ emergency: true });
        setStep("emergency");
        return;
      }
      if (sys >= 180 || dia >= 120) {
        await saveReadingToDB({ urgent: true });
        setStep("urgent");
        return;
      }
      await saveReadingToDB();
      setStep("result");
    } catch (err) {
      setError(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContextAnswer = (finalContext: SessionContext, isLastQuestion: boolean) => {
    setSessionContext(finalContext);
    localStorage.setItem("sanctos_session_context", JSON.stringify(finalContext));
    setError("");
    if (isLastQuestion) {
      localStorage.setItem("sanctos_session_context_complete", "true");
      setStep("s1_bp");
    }
  };

  const getCategory = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) return "Stage 2";
    if (sys >= 130 || dia >= 85) return "Stage 1";
    if (sys >= 125) return "Elevated";
    return "Normal";
  };

  const category = getCategory(Number(systolic), Number(diastolic));
  const isHighReading = category === "Stage 1" || category === "Stage 2";

  let meaningCopy = "";
  if (category === "Normal") {
    meaningCopy = "Your reading is in the optimal, healthy range. Keep up the great work.";
  } else if (category === "Elevated") {
    meaningCopy = "Your reading is slightly elevated. It's not a cause for alarm, but it's a good time to check in on your daily habits.";
  } else {
    meaningCopy = "Your reading is a bit higher than we would like to see regularly. Let's take a moment to help bring it down.";
  }

  let actionCopy = "";
  if (isHighReading && readingCount === 1) {
    actionCopy = `Take a moment to sit quietly, keep your feet flat, and follow the breathing timer on your screen.`;
  } else if (isHighReading && readingCount === 2) {
    actionCopy = "Rest for 30 minutes, then check your blood pressure again.";
  } else if (isHighReading && readingCount === 3) {
    actionCopy = "Your blood pressure remains high even after two resting periods. We strongly recommend contacting your doctor today.";
  } else {
    actionCopy = "Continue maintaining your healthy habits and check your blood pressure again tomorrow.";
  }

  if (step === "onboarding") return <ScreenWrapper step={step}><h1 className="text-4xl font-semibold mb-2">Let&apos;s decode your numbers.</h1><p className="text-neutral-400 mb-12">What should we call you?</p><div className="space-y-8"><select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none"><option value="" className="text-black">Title...</option><option value="Sir" className="text-black">Sir</option><option value="Ma" className="text-black">Ma</option></select><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="First Name" className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none" /><button onClick={() => { localStorage.setItem("sanctos_name", name); localStorage.setItem("sanctos_title", title); setStep("s1_age"); }} disabled={!name} className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Continue</button></div></ScreenWrapper>;

  if (step === "s1_age") return <ScreenWrapper step={step}><p className="text-xl text-neutral-400 mb-4">Thanks, {title} {name}.</p><h2 className="text-5xl font-semibold mb-12">How old are you?</h2><input type="number" value={age} onChange={(e) => setAge(e.target.value)} autoFocus className="w-full text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-7xl font-semibold focus:border-[#2E5B44] focus:outline-none" /><button onClick={() => { localStorage.setItem("sanctos_age", age); setStep("s4_coffee"); }} disabled={!age} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Next</button></ScreenWrapper>;

  if (step === "s1_bp") return <ScreenWrapper step={step}><h2 className="text-4xl font-semibold mb-12">What is your reading?</h2><div className="flex items-center justify-center gap-4"><input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} autoFocus placeholder="120" className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold focus:border-[#2E5B44] focus:outline-none" /><span className="text-6xl text-neutral-600">/</span><input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold focus:border-[#2E5B44] focus:outline-none" /></div>{error && <p className="mt-4 text-center text-red-400">{error}</p>}<button onClick={() => readingCount === 1 ? setStep("s1_symptoms") : handleFinalSubmit()} disabled={!systolic || !diastolic || isSubmitting} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Next</button></ScreenWrapper>;

  if (step === "s1_symptoms") return <ScreenWrapper step={step}><h2 className="text-3xl font-semibold mb-8">Any of these right now?</h2><div className="space-y-3">{symptomList.map(s => <button key={s} onClick={() => toggleSymptom(s)} className={`w-full p-5 rounded-2xl text-left border-2 ${symptoms.includes(s) ? "border-red-500 bg-red-900/20 text-red-400" : "border-neutral-700 bg-neutral-900 text-neutral-300"}`}>{s}</button>)}</div>{error && <p className="mt-4 text-center text-red-400">{error}</p>}<button onClick={handleFinalSubmit} disabled={isSubmitting} className="w-full mt-10 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">{isSubmitting ? "Checking..." : "Check Reading"}</button></ScreenWrapper>;

  const renderContextScreen = (q: string, k: keyof SessionContext, n: "s4_meal" | "s4_meds" | "s4_stress" | "submit") => (
    <ScreenWrapper step={step}><h2 className="text-4xl font-semibold mb-12">{q}</h2><div className="space-y-4">
      {error && <p className="text-center text-red-400">{error}</p>}
      <button onClick={() => { const c = {...sessionContext, [k]: "yes"}; handleContextAnswer(c, n === "submit"); if(n !== "submit") setStep(n); }} className="w-full py-8 rounded-3xl bg-[#F9F8F6] text-black text-2xl font-semibold">Yes</button>
      <button onClick={() => { const c = {...sessionContext, [k]: "no"}; handleContextAnswer(c, n === "submit"); if(n !== "submit") setStep(n); }} className="w-full py-8 rounded-3xl bg-neutral-800 text-[#F9F8F6] text-2xl font-semibold">No</button>
    </div></ScreenWrapper>
  );

  if (step === "s4_coffee") return renderContextScreen("Did you just drink coffee, smoke, or exercise?", "caffeine", "s4_meal");
  if (step === "s4_meal") return renderContextScreen("Did you eat a heavy or salty meal recently?", "meal", "s4_meds");
  if (step === "s4_meds") return renderContextScreen("Have you taken your BP medication today?", "meds", "s4_stress");
  if (step === "s4_stress") return renderContextScreen("Did you sleep poorly or feel stressed today?", "stress", "submit");

  if (step === "emergency") return <ScreenWrapper step={step}><div className="p-8 rounded-3xl bg-red-950 border border-red-900"><h1 className="text-3xl font-bold text-red-400 mb-4">Seek immediate medical care.</h1><p className="text-red-200">Please go to the nearest emergency room.</p></div></ScreenWrapper>;
  if (step === "urgent") return <ScreenWrapper step={step}><div className="p-8 rounded-3xl bg-orange-950 border border-orange-900"><h1 className="text-3xl font-bold text-orange-400 mb-4">Reading is very high.</h1><p className="text-orange-200">Rest for 5 mins and test again. If it remains this high, contact your doctor.</p></div></ScreenWrapper>;

  if (step === "result" && isHighReading && readingCount === 3) return (
    <ScreenWrapper step={step}>
      <p className="text-xl text-neutral-200">{actionCopy}</p>
      <button onClick={startNewSession} className="mt-10 w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white">Log Another Reading</button>
    </ScreenWrapper>
  );

  if (step === "result") return (
    <ScreenWrapper step={step}>
      <p className="text-2xl text-neutral-400 mb-2">Thanks for checking in today.</p>
      <h1 className="text-6xl font-semibold mb-8">{systolic}/{diastolic}.</h1>
      <div className="space-y-6">
        <div><span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">The Meaning</span><p className="text-neutral-200">{meaningCopy}</p></div>
        <div><span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">The Action</span><p className="text-neutral-300">{actionCopy}</p></div>
      </div>

      {isHighReading && readingCount === 1 ? (
        <div className="mt-10 space-y-3">
          <button onClick={startBreathingTimer} className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Rest and Breathe (10 Mins)</button>
          <button onClick={() => startNextReading(nextReadingCount)} className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white">Skip / Log Another</button>
        </div>
      ) : isHighReading && readingCount === 2 ? (
        <div className="mt-10 space-y-3">
          <button onClick={startWaitingTimer} className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">Wait 30 Minutes</button>
          <button onClick={() => startNextReading(nextReadingCount)} className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white">Skip / Log Another</button>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          <p className="text-center text-sm text-neutral-400">Deep breathing is great for maintaining a healthy baseline.</p>
          <button onClick={startNewSession} className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white">Log Another Reading</button>
        </div>
      )}
    </ScreenWrapper>
  );

  if (step === "s9_timer") return <BreathingTimer onFinish={() => { void finishTimer(); }} />;
  if (step === "s9_30min_timer") return <PersistentTimer onFinish={() => { void finishTimer(); }} />;

  return null;
}