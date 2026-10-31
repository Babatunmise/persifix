"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ScreenWrapper = ({ step, children }: { step: string, children: React.ReactNode }) => (
  <div key={step} className="animate-fade-in-up max-w-md mx-auto min-h-[80vh] flex flex-col justify-center px-6 py-12 text-[#F9F8F6]">
    {children}
  </div>
);

// --- THE 30-MINUTE PERSISTENT TIMER ---
function PersistentTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins

  useEffect(() => {
    let targetEndTime = Number(localStorage.getItem("sanctos_30m_target"));
    if (!targetEndTime || targetEndTime < Date.now()) {
      targetEndTime = Date.now() + 1800000; 
      localStorage.setItem("sanctos_30m_target", String(targetEndTime));
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate breathing text based on a 16-second cycle
  const timeElapsed = 1800 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4; 
  let text = "";
  if (cycle === 0) text = "Breathe In";
  else if (cycle === 1) text = "Hold";
  else if (cycle === 2) text = "Breathe Out";
  else text = "Hold";

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleEarlyExit = () => {
    if (timeLeft > 0) {
      const confirmLeave = window.confirm(
        `You still have ${minutes} minutes and ${seconds} seconds left in your breathing exercise. We recommend resting for the full 30 minutes for a more accurate reading. Are you sure you want to check your blood pressure now?`
      );
      if (!confirmLeave) return;
    }
    localStorage.removeItem("sanctos_30m_target");
    onFinish();
  };

  return (
    <ScreenWrapper step="s9_30min_timer">
      <h1 className="text-4xl font-semibold tracking-tight text-center text-[#F9F8F6]">Let&apos;s wait a bit longer.</h1>
      
      <div className="mt-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 leading-relaxed text-left">
        <p className="font-semibold text-[#F9F8F6] mb-2">Why are we breathing?</p>
        <p>Deep, slow breathing stimulates your vagus nerve, which acts as your body’s natural &apos;brake&apos; system. When you breathe slowly, you signal to your heart to slow down. At the same time, it tells your blood vessels to relax and widen (vasodilation). Think of it as giving your heart a well-deserved mini-vacation.</p>
      </div>

      <div className="text-7xl font-mono tracking-tighter mt-8 mb-6 text-[#2E5B44] text-center">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 my-4 mx-auto">
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe-circle" />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe-circle" style={{ animationDelay: '-0.2s' }} />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full animate-breathe-circle" />
        <span className="absolute text-[#F9F8F6] text-2xl font-semibold z-10">{text}</span>
      </div>

      <button 
        onClick={handleEarlyExit} 
        className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
      >
        Check Again Now
      </button>
    </ScreenWrapper>
  );
}

function BreathingTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeElapsed = 600 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4; 
  let text = "";
  if (cycle === 0) text = "Breathe In";
  else if (cycle === 1) text = "Hold";
  else if (cycle === 2) text = "Breathe Out";
  else text = "Hold";

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <ScreenWrapper step="s9_timer">
      <h1 className="text-4xl font-semibold tracking-tight text-center text-[#F9F8F6]">Let&apos;s take a break.</h1>
      
      <div className="mt-6 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 leading-relaxed text-left">
        <p className="font-semibold text-[#F9F8F6] mb-2">Why are we breathing?</p>
        <p>Deep, slow breathing stimulates your vagus nerve, which acts as your body’s natural &apos;brake&apos; system. When you breathe slowly, you signal to your heart to slow down. At the same time, it tells your blood vessels to relax and widen (vasodilation). Think of it as giving your heart a well-deserved mini-vacation.</p>
      </div>

      <div className="text-7xl font-mono tracking-tighter mt-8 mb-6 text-[#2E5B44] text-center">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 my-4 mx-auto">
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe-circle" />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe-circle" style={{ animationDelay: '-0.2s' }} />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full animate-breathe-circle" />
        <span className="absolute text-[#F9F8F6] text-2xl font-semibold z-10">{text}</span>
      </div>

      <button onClick={onFinish} className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">
        Check Again Now
      </button>
    </ScreenWrapper>
  );
}


export function BPInterpreter() {
  const [step, setStep] = useState<
    | "onboarding" 
    | "s1_age" | "s1_bp" | "s1_symptoms" 
    | "s4_coffee" | "s4_meal" | "s4_meds" | "s4_stress" 
    | "result" | "s9_timer" | "s9_30min_timer" | "emergency" | "urgent"
  >("onboarding");
  
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 1 = Initial, 2 = Recheck after 10m, 3 = Recheck after 30m
  const [readingCount, setReadingCount] = useState(1);

  const [context, setContext] = useState({
    caffeine: "", meds: "", stress: "", meal: ""
  });

  const symptomList = [
    "Chest pain", "Severe headache", "One-sided weakness", 
    "Trouble speaking", "Shortness of breath", "Confusion"
  ];

  useEffect(() => {
    const saved30mTimer = localStorage.getItem("sanctos_30m_target");
    if (saved30mTimer && Number(saved30mTimer) > Date.now()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("s9_30min_timer");
      return;
    }

    const savedName = localStorage.getItem("sanctos_name");
    const savedTitle = localStorage.getItem("sanctos_title");
    const savedAge = localStorage.getItem("sanctos_age");
    const savedContext = localStorage.getItem("sanctos_context");

    if (savedName) {
      setName(savedName);
      setTitle(savedTitle || "");
    }

    if (savedAge) {
      setAge(savedAge);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("s1_bp"); 
    } else if (savedName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("s1_age");
    }

    if (savedContext) {
      setContext(JSON.parse(savedContext));
    }
  }, []);

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev => prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]);
  };

  const saveReadingToDB = async (isEmergency: boolean, currentContext = context) => {
    const supabase = createClient();
    let deviceId = localStorage.getItem("sanctos_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("sanctos_device_id", deviceId);
    }

    const { error: dbError } = await supabase.from("readings").insert({
      user_id: deviceId,
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      context_notes: isEmergency ? "Emergency Gate Triggered" : JSON.stringify(currentContext)
    });

    if (dbError) throw new Error(dbError.message);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);

    if (sys > 260 || sys < 60 || dia > 160 || dia < 30 || dia >= sys) {
      setError("The numbers entered are physically impossible. Please start over.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const hasSymptoms = readingCount === 1 ? symptoms.length > 0 : false;
      
      if (hasSymptoms && (sys >= 140 || dia >= 90)) {
        await saveReadingToDB(true);
        setStep("emergency");
        return;
      }
      if (sys >= 180 || dia >= 120) {
        await saveReadingToDB(true);
        setStep("urgent");
        return;
      }

      localStorage.setItem("sanctos_age", age);

      if (localStorage.getItem("sanctos_context")) {
        await saveReadingToDB(false);
        setStep("result");
      } else {
        setStep("s4_coffee");
      }
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContextSubmit = async (finalContext: typeof context) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      localStorage.setItem("sanctos_context", JSON.stringify(finalContext));
      await saveReadingToDB(false, finalContext);
      setStep("result");
    } catch (err: any) {
      alert("SAVE FAILED: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategory = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) return "Stage 2 Hypertension";
    if (sys >= 130 || dia >= 80) return "Stage 1 Hypertension";
    if (sys >= 120 && dia < 80) return "Elevated";
    return "Normal";
  };

  const category = getCategory(parseInt(systolic), parseInt(diastolic));
  const isHighReading = category !== "Normal" && category !== "Elevated";
  const isStage2 = category === "Stage 2 Hypertension";

  const meaningCopy = isHighReading 
    ? `Your reading of ${systolic}/${diastolic} is a bit higher than we would like to see regularly. The top number (${systolic}) is in the range doctors classify as ${isStage2 ? "Stage 2" : "Stage 1"}.`
    : `Your reading of ${systolic}/${diastolic} is within a healthy range.`;

  let contextCopy = "";
  if (context.meds === "no") contextCopy += "You mentioned missing your medication today. Missing a dose can cause your numbers to rise. ";
  if (context.meal === "yes") contextCopy += "You mentioned eating a heavy or salty meal recently. Digestion shifts blood flow, and salty foods can cause your body to hold onto water. These factors can temporarily affect a blood pressure reading. ";
  if (context.caffeine === "yes") contextCopy += "You mentioned recent caffeine, smoking, or exercise. These can temporarily raise blood pressure. ";
  if (context.stress === "yes") contextCopy += "You mentioned poor sleep or stress today. Stress hormones can cause temporary spikes. ";
  if (parseInt(age) >= 60) contextCopy += `Also, because you are ${age}, it is very common for the top number to climb a bit higher as our blood vessels naturally stiffen with age.`;
  
  if (!contextCopy) contextCopy = "There are no obvious temporary factors affecting this reading today.";

  let actionCopy = "";
  if (readingCount === 3 && isHighReading) {
    actionCopy = "Your blood pressure remains high even after two resting periods. We strongly recommend contacting your doctor today or seeking medical advice. Do not keep testing repeatedly. If you develop chest pain, shortness of breath, or sudden weakness, seek emergency care immediately.";
  } else {
    actionCopy = `Take a moment to sit quietly, keep your feet flat, and follow the breathing timer on your screen. After 10 minutes, let&apos;s check it again. ${context.meds === "no" ? "If you haven&apos;t taken your medication today, check your prescription schedule or call your pharmacist to ask if you should take it now." : ""}`;
  }

  const doctorQuestion = context.meds === "no" 
    ? `"Since my top number tends to spike when I miss a dose, is my current medication schedule still right for me?"`
    : isHighReading 
      ? `"My reading is ${systolic}/${diastolic}. Is this something I should monitor closely, or could it be related to my daily habits?"`
      : `"My reading is ${systolic}/${diastolic}. Does this look like a healthy baseline for me?"`;


  if (step === "onboarding") {
    return (
      <ScreenWrapper step={step}>
        <h1 className="text-4xl font-semibold tracking-tight mb-2 text-[#F9F8F6]">Let&apos;s decode your numbers.</h1>
        <p className="text-neutral-400 mb-12">First, what should we call you?</p>
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">Title (Optional)</label>
            <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl font-medium text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none">
              <option value="" className="text-black">Select...</option>
              <option value="Sir" className="text-black">Sir</option>
              <option value="Ma" className="text-black">Ma</option>
              <option value="Chief" className="text-black">Chief</option>
              <option value="Dr." className="text-black">Dr.</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">First Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunmise" className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl font-medium text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
          </div>
          <button onClick={() => { localStorage.setItem("sanctos_name", name); localStorage.setItem("sanctos_title", title); setStep("s1_age"); }} disabled={!name} className="w-full mt-8 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            Continue
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "s1_age") {
    return (
      <ScreenWrapper step={step}>
        <p className="text-xl text-neutral-400 mb-4">Thanks, {title} {name}.</p>
        <h2 className="text-5xl font-semibold tracking-tight mb-12 text-[#F9F8F6]">How old are you?</h2>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} autoFocus placeholder="45" className="w-full text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-7xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
        <button onClick={() => { if(parseInt(age) < 1) return; setStep("s1_bp"); }} disabled={!age} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50">Next</button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_bp") {
    return (
      <ScreenWrapper step={step}>
        <p className="text-xl text-neutral-400 mb-4">Got it.</p>
        <h2 className="text-4xl font-semibold tracking-tight mb-12 text-[#F9F8F6]">What is your reading?</h2>
        
        <div className="flex items-center justify-center gap-4 w-full">
          <input 
            type="number" 
            value={systolic} 
            onChange={(e) => setSystolic(e.target.value)} 
            autoFocus 
            placeholder="120" 
            className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" 
          />
          <span className="text-6xl text-neutral-600 font-light">/</span>
          <input 
            type="number" 
            value={diastolic} 
            onChange={(e) => setDiastolic(e.target.value)} 
            placeholder="80" 
            className="w-32 text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-6xl font-semibold text-[#F9F8F6] placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" 
          />
        </div>

        <button 
          onClick={() => {
            if (readingCount > 1) {
              handleFinalSubmit();
            } else {
              setStep("s1_symptoms");
            }
          }} 
          disabled={!systolic || !diastolic} 
          className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50"
        >
          Next
        </button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_symptoms") {
    return (
      <ScreenWrapper step={step}>
        <h2 className="text-3xl font-semibold tracking-tight mb-8 leading-tight text-[#F9F8F6]">Are you experiencing any of these right now?</h2>
        <div className="space-y-3 w-full">
          {symptomList.map(symptom => (
            <button key={symptom} onClick={() => toggleSymptom(symptom)} className={`w-full p-5 rounded-2xl text-left text-lg font-medium border-2 transition-all ${symptoms.includes(symptom) ? "border-red-500 bg-red-900/20 text-red-400" : "border-neutral-700 bg-neutral-900 text-neutral-300"}`}>
              {symptom}
            </button>
          ))}
        </div>
        {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        <button onClick={handleFinalSubmit} disabled={isSubmitting} className="w-full mt-10 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50">
          {isSubmitting ? "Checking..." : "Check Reading"}
        </button>
      </ScreenWrapper>
    );
  }

  const ContextScreen = ({ question, valueKey, nextStep }: { question: string, valueKey: keyof typeof context, nextStep: any }) => (
    <ScreenWrapper step={step}>
      <h2 className="text-4xl font-semibold tracking-tight mb-12 leading-tight text-[#F9F8F6]">{question}</h2>
      <div className="space-y-4 w-full">
        <button onClick={() => { 
          const newCtx = {...context, [valueKey]: "yes"};
          setContext(newCtx); 
          if(nextStep === "submit") handleContextSubmit(newCtx); 
          else setStep(nextStep); 
        }} className="w-full py-8 rounded-3xl bg-[#F9F8F6] text-black text-2xl font-semibold transition-transform hover:scale-105">Yes</button>
        
        <button onClick={() => { 
          const newCtx = {...context, [valueKey]: "no"};
          setContext(newCtx); 
          if(nextStep === "submit") handleContextSubmit(newCtx); 
          else setStep(nextStep); 
        }} className="w-full py-8 rounded-3xl bg-neutral-800 text-[#F9F8F6] border border-neutral-700 text-2xl font-semibold transition-transform hover:scale-105">No</button>
      </div>
    </ScreenWrapper>
  );

  if (step === "s4_coffee") return <ContextScreen question="Did you just drink coffee, smoke, or exercise?" valueKey="caffeine" nextStep="s4_meal" />;
  if (step === "s4_meal") return <ContextScreen question="Did you eat a heavy or salty meal recently?" valueKey="meal" nextStep="s4_meds" />;
  if (step === "s4_meds") return <ContextScreen question="Have you taken your BP medication today?" valueKey="meds" nextStep="s4_stress" />;
  if (step === "s4_stress") return <ContextScreen question="Did you sleep poorly or feel stressed today?" valueKey="stress" nextStep="submit" />;

  if (step === "emergency") {
    return (
      <ScreenWrapper step={step}>
        <div className="p-8 rounded-3xl bg-red-950 border border-red-900">
          <h1 className="text-3xl font-bold text-red-400 leading-tight">Please seek immediate medical care.</h1>
          <p className="mt-4 text-red-200 text-lg leading-relaxed">Your reading is high and you reported symptoms that require urgent attention. Please stop and go to the nearest emergency room.</p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "urgent") {
    return (
      <ScreenWrapper step={step}>
        <div className="p-8 rounded-3xl bg-orange-950 border border-orange-900">
          <h1 className="text-3xl font-bold text-orange-400 leading-tight">Your reading is very high.</h1>
          <p className="mt-4 text-orange-200 text-lg leading-relaxed">A reading of {systolic}/{diastolic} is in the hypertensive crisis range. Please rest for 5 minutes and test again. If it remains this high, contact your doctor immediately.</p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "result") {
    return (
      <ScreenWrapper step={step}>
        <p className="text-2xl text-neutral-400 mb-2">Thanks for checking in today. It&apos;s always good to know where you stand.</p>
        <h1 className="text-6xl font-semibold tracking-tight text-[#F9F8F6] mb-8">{systolic}/{diastolic}.</h1>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <div>
            <span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">The Meaning</span>
            <p className="text-neutral-200">{meaningCopy}</p>
          </div>

          <div>
            <span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">The Context</span>
            <p className="text-neutral-300">{contextCopy}</p>
          </div>

          <div>
            <span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">The Action</span>
            <p className="text-neutral-300">{actionCopy}</p>
          </div>

          <div className="border-t border-neutral-800 pt-6">
            <span className="block text-sm uppercase tracking-widest text-neutral-500 mb-1">Ask your doctor</span>
            <p className="text-[#F9F8F6] italic">{doctorQuestion}</p>
          </div>
        </div>

        {isHighReading ? (
          <button 
            onClick={() => { 
              if (readingCount === 1) {
                setReadingCount(2); 
                setStep("s9_timer"); 
              } else if (readingCount === 2) {
                setStep("s9_30min_timer");
              } else {
                setSystolic("");
                setDiastolic("");
                setSymptoms([]);
                setReadingCount(1);
                setStep("s1_bp");
              }
            }} 
            className="mt-10 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
          >
            {readingCount === 1 ? "Rest and Breathe (10 Mins)" : 
             readingCount === 2 ? "Wait 30 Minutes" : 
             "Log Another Reading"}
          </button>
        ) : (
          <button 
            onClick={() => { 
              setSystolic(""); 
              setDiastolic(""); 
              setSymptoms([]); 
              setReadingCount(1);
              setStep("s1_bp"); 
            }} 
            className="mt-10 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
          >
            Log Another Reading
          </button>
        )}
      </ScreenWrapper>
    );
  }

  if (step === "s9_timer") {
    return (
      <BreathingTimer 
        onFinish={() => {
          setStep("s1_bp"); 
        }} 
      />
    );
  }

  if (step === "s9_30min_timer") {
    return (
      <PersistentTimer 
        onFinish={() => {
          setSystolic(""); 
          setDiastolic(""); 
          setSymptoms([]);
          setReadingCount(3);
          setStep("s1_bp"); 
        }} 
      />
    );
  }

  return null;
}
