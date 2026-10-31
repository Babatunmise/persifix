"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ScreenWrapper = ({ step, children }: { step: string, children: React.ReactNode }) => (
  <div key={step} className="animate-fade-in-up max-w-md mx-auto min-h-[80vh] flex flex-col justify-center px-6 py-12 text-white">
    {children}
  </div>
);

function BreathingTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate text based on elapsed time (16 second cycle)
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
      <h1 className="text-4xl font-semibold tracking-tight text-center text-white">Let's take a break.</h1>
      <p className="mt-4 text-center text-neutral-400 text-lg">Rest for 10 minutes before checking again.</p>
      
      <div className="text-7xl font-mono tracking-tighter mt-12 mb-8 text-[#2E5B44] text-center">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 my-8 mx-auto">
        {/* Background pulsing circles */}
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe-circle" />
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe-circle" style={{ animationDelay: '-0.2s' }} />
        
        {/* Solid inner circle */}
        <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full animate-breathe-circle" />
        
        {/* Text stays centered */}
        <span className="absolute text-white text-2xl font-semibold z-10">{text}</span>
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
    | "s1_age" | "s1_sbp" | "s1_dbp" | "s1_symptoms" 
    | "s4_coffee" | "s4_meal" | "s4_meds" | "s4_stress" 
    | "result" | "s9_timer" | "emergency" | "urgent"
  >("onboarding");
  
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");

  const [age, setAge] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [context, setContext] = useState({
    caffeine: "", meds: "", stress: "", meal: ""
  });

  const symptomList = [
    "Chest pain", "Severe headache", "One-sided weakness", 
    "Trouble speaking", "Shortness of breath", "Confusion"
  ];

  useEffect(() => {
    const savedName = localStorage.getItem("sanctos_name");
    const savedTitle = localStorage.getItem("sanctos_title");
    if (savedName) {
      setName(savedName);
      setTitle(savedTitle || "");
      setStep("s1_age");
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
      const hasSymptoms = symptoms.length > 0;
      
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

      setStep("s4_coffee");
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

  const getInfluencerText = () => {
    let text = "";
    if (context.meds === "no") text += "You mentioned you missed your medication today. This can affect a reading. ";
    if (context.meal === "yes") text += "You mentioned eating a heavy or salty meal recently. Digestion shifts blood flow, and salty foods can cause your body to hold onto water. These factors can temporarily affect a blood pressure reading. ";
    if (context.caffeine === "yes") text += "You mentioned recent caffeine, smoking, or exercise. These can temporarily raise blood pressure. ";
    if (context.stress === "yes") text += "You mentioned poor sleep or stress today. Stress hormones can cause temporary spikes. ";
    return text.trim();
  };

  const category = getCategory(parseInt(systolic), parseInt(diastolic));
  const influencerText = getInfluencerText();
  const isIsolatedSystolic = parseInt(age) >= 60 && parseInt(systolic) >= 140 && parseInt(diastolic) < 90;
  const isHighReading = category.includes("Stage");

  if (step === "onboarding") {
    return (
      <ScreenWrapper step={step}>
        <h1 className="text-4xl font-semibold tracking-tight mb-2 text-white">Let's decode your numbers.</h1>
        <p className="text-neutral-400 mb-12">First, what should we call you?</p>
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">Title (Optional)</label>
            <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl font-medium text-white focus:border-[#2E5B44] focus:outline-none">
              <option value="" className="text-black">Select...</option>
              <option value="Sir" className="text-black">Sir</option>
              <option value="Ma" className="text-black">Ma</option>
              <option value="Chief" className="text-black">Chief</option>
              <option value="Dr." className="text-black">Dr.</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-500 mb-2 uppercase tracking-wide">First Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunmise" className="w-full bg-transparent border-b border-neutral-700 py-4 text-2xl font-medium text-white placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
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
        <h2 className="text-5xl font-semibold tracking-tight mb-12 text-white">How old are you?</h2>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)} autoFocus placeholder="45" className="w-full text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-7xl font-semibold text-white placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
        <button onClick={() => { if(parseInt(age) < 1) return; setStep("s1_sbp"); }} disabled={!age} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50">Next</button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_sbp") {
    return (
      <ScreenWrapper step={step}>
        <p className="text-xl text-neutral-400 mb-4">Got it.</p>
        <h2 className="text-4xl font-semibold tracking-tight mb-2 text-white">What is your top number?</h2>
        <p className="text-neutral-500 mb-12">(Systolic)</p>
        <input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} autoFocus placeholder="120" className="w-full text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-7xl font-semibold text-white placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
        <button onClick={() => setStep("s1_dbp")} disabled={!systolic} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50">Next</button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_dbp") {
    return (
      <ScreenWrapper step={step}>
        <h2 className="text-4xl font-semibold tracking-tight mb-2 text-white">And your bottom number?</h2>
        <p className="text-neutral-500 mb-12">(Diastolic)</p>
        <input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} autoFocus placeholder="80" className="w-full text-center bg-transparent border-b-2 border-neutral-700 pb-4 text-7xl font-semibold text-white placeholder-neutral-600 focus:border-[#2E5B44] focus:outline-none" />
        <button onClick={() => setStep("s1_symptoms")} disabled={!diastolic} className="w-full mt-16 rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50">Next</button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_symptoms") {
    return (
      <ScreenWrapper step={step}>
        <h2 className="text-3xl font-semibold tracking-tight mb-8 leading-tight text-white">Are you experiencing any of these right now?</h2>
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
      <h2 className="text-4xl font-semibold tracking-tight mb-12 leading-tight text-white">{question}</h2>
      <div className="space-y-4 w-full">
        <button onClick={() => { 
          const newCtx = {...context, [valueKey]: "yes"};
          setContext(newCtx); 
          if(nextStep === "submit") handleContextSubmit(newCtx); 
          else setStep(nextStep); 
        }} className="w-full py-8 rounded-3xl bg-white text-black text-2xl font-semibold transition-transform hover:scale-105">Yes</button>
        
        <button onClick={() => { 
          const newCtx = {...context, [valueKey]: "no"};
          setContext(newCtx); 
          if(nextStep === "submit") handleContextSubmit(newCtx); 
          else setStep(nextStep); 
        }} className="w-full py-8 rounded-3xl bg-neutral-800 text-white border border-neutral-700 text-2xl font-semibold transition-transform hover:scale-105">No</button>
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
        {isHighReading ? (
          <div>
            <h1 className="text-6xl font-semibold tracking-tight text-white">{systolic}/{diastolic}.</h1>
            <p className="mt-4 text-2xl text-neutral-400">Higher than usual today. Let's slow down.</p>
            <div className="mt-10 p-8 rounded-3xl bg-neutral-900 border border-neutral-800">
              <p className="text-xl text-neutral-200 leading-relaxed">
                {influencerText && <span className="font-semibold block mb-2 text-white">{influencerText}</span>}
                Your reading is in the range doctors classify as <strong>{category}</strong>.
              </p>
              {isIsolatedSystolic && (
                <p className="mt-6 text-sm text-neutral-400 border-t border-neutral-800 pt-4">
                  Because you are over 60 and your top number is high while your bottom number is normal, this is known as Isolated Systolic Hypertension.
                </p>
              )}
            </div>
            <button onClick={() => setStep("s9_timer")} className="mt-10 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">
              Rest and Breathe (10 Mins)
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-6xl font-semibold tracking-tight text-white">{systolic}/{diastolic}. Steady.</h1>
            <p className="mt-4 text-2xl text-neutral-400">A good start, {title} {name}.</p>
            <div className="mt-10 p-8 rounded-3xl bg-neutral-900 border border-neutral-800">
              <p className="text-xl text-neutral-200 leading-relaxed">
                {influencerText && <span className="font-semibold block mb-2 text-white">{influencerText}</span>}
                Your reading is in the range doctors classify as <strong>{category}</strong>.
              </p>
            </div>
            <button onClick={() => { setSystolic(""); setDiastolic(""); setSymptoms([]); setContext({ caffeine: "", meds: "", stress: "", meal: "" }); setStep("s1_age"); }} className="mt-10 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white">
              Log Another Reading
            </button>
          </div>
        )}
      </ScreenWrapper>
    );
  }

  if (step === "s9_timer") {
    return <BreathingTimer onFinish={() => setStep("s1_age")} />;
  }

  return null;
}