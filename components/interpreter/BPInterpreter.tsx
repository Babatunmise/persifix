"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function BPInterpreter() {
  const [step, setStep] = useState<"onboarding" | "s1_entry" | "s4_context" | "result" | "s9_timer" | "emergency" | "urgent">("onboarding");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");

  // S1 Inputs
  const [age, setAge] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [error, setError] = useState("");

  // S4 Context
  const [context, setContext] = useState({
    caffeine: "",
    meds: "",
    stress: "",
    meal: ""
  });

  // S9 Timer State
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [pacerText, setPacerText] = useState("Breathe In");

  const symptomList = [
    "Chest pain", "Severe headache", "One-sided weakness", 
    "Trouble speaking", "Shortness of breath", "Confusion"
  ];

  // S9 Timer Logic
  useEffect(() => {
    if (step !== "s9_timer") return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    let cycleTime = 0;
    const pacer = setInterval(() => {
      cycleTime = (cycleTime + 1) % 16;
      if (cycleTime < 4) setPacerText("Breathe In");
      else if (cycleTime < 8) setPacerText("Hold");
      else if (cycleTime < 12) setPacerText("Breathe Out");
      else setPacerText("Hold");
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(pacer);
    };
  }, [step]);

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev => 
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleEntrySubmit = () => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    const numAge = parseInt(age);

    if (isNaN(sys) || isNaN(dia) || isNaN(numAge)) {
      setError("Please enter your age and both blood pressure numbers.");
      return;
    }
    if (sys > 260 || sys < 60 || dia > 160 || dia < 30 || dia >= sys) {
      setError("Please check your numbers. The bottom number cannot be higher than the top number, and the values must be realistic.");
      return;
    }

    const hasSymptoms = symptoms.length > 0;
    if (hasSymptoms && (sys >= 140 || dia >= 90)) { setStep("emergency"); return; }
    if (sys >= 180 || dia >= 120) { setStep("urgent"); return; }

    setError("");
    setStep("s4_context");
  };

  // --- SUPABASE SAVE LOGIC ---
const handleContextSubmit = async () => {
    try {
      const supabase = createClient();
      
      let deviceId = localStorage.getItem("sanctos_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("sanctos_device_id", deviceId);
      }

      const { error } = await supabase.from("readings").insert({
        user_id: deviceId,
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
        context_notes: JSON.stringify(context)
      });

      if (error) {
        throw new Error(error.message);
      }

      setStep("result");
    } catch (err: unknown) {
      console.error("FULL ERROR:", err);
      const message = err instanceof Error ? err.message : "Unknown network error";
      alert(`SAVE FAILED: ${message}`);
    }
  };
  // --- LOGIC FOR RESULT SCREEN ---
  const getCategory = (sys: number, dia: number) => {
    if (sys < 120 && dia < 80) return "Normal";
    if (sys >= 120 && sys <= 129 && dia < 80) return "Elevated";
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return "Stage 1 Hypertension";
    if (sys >= 140 || dia >= 90) return "Stage 2 Hypertension";
    return "Unknown";
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
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // --- RENDER SCREENS ---

  if (step === "onboarding") {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
        <h1 className="text-3xl font-semibold tracking-tight">Let's decode your numbers.</h1>
        <p className="mt-4 text-neutral-600">First, what should we call you?</p>
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title (Optional)</label>
            <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg focus:border-[#121212] focus:outline-none">
              <option value="">Select...</option>
              <option value="Sir">Sir</option>
              <option value="Ma">Ma</option>
              <option value="Chief">Chief</option>
              <option value="Dr.">Dr.</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">First Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunmise" className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg focus:border-[#121212] focus:outline-none" />
          </div>
          <button 
            onClick={() => { 
              localStorage.setItem("sanctos_title", title); 
              setStep("s1_entry"); 
            }} 
            disabled={!name} 
            className="w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "s9_timer") {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-[#121212] flex flex-col items-center text-center min-h-screen">
        <h1 className="text-3xl font-semibold tracking-tight mt-8">Let's take a break.</h1>
        <p className="mt-4 text-neutral-600">Rest for 10 minutes before checking again. This can help relax your body and give a more accurate reading.</p>
        
        <div className="text-6xl font-mono tracking-tighter mt-12 mb-8 text-[#2E5B44]">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>

        <div className="relative flex items-center justify-center w-64 h-64 my-8">
          <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-20 animate-breathe" />
          <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full opacity-40 animate-breathe" style={{ animationDelay: '0.2s' }} />
          <div className="absolute w-32 h-32 bg-[#2E5B44] rounded-full flex items-center justify-center text-white font-medium animate-breathe">
            <span className="text-xl">{pacerText}</span>
          </div>
        </div>

        <div className="mt-8 text-left bg-neutral-50 p-6 rounded-xl border border-neutral-200 w-full">
          <p className="text-sm font-medium text-neutral-800 mb-2">Instructions:</p>
          <ul className="text-sm text-neutral-600 space-y-2 list-disc pl-4">
            <li>Sit comfortably. Keep your back supported and feet flat.</li>
            <li>Follow the circle. Breathe in as it expands, out as it shrinks.</li>
            <li>Do not talk or check your phone during this time.</li>
            <li>If you feel unwell at any point, stop and seek medical care.</li>
          </ul>
        </div>

        <button onClick={() => { setTimeLeft(600); setStep("s1_entry"); }} className="mt-8 w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white">
          Check Again Now
        </button>
      </div>
    );
  }

  if (step === "emergency") {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
        <div className="p-8 rounded-2xl bg-red-50 border border-red-200">
          <h1 className="text-2xl font-bold text-red-800">Please seek immediate medical care.</h1>
          <p className="mt-4 text-red-700 leading-relaxed">Your reading is high and you reported symptoms that require urgent attention. Please stop and go to the nearest emergency room, or call emergency services.</p>
        </div>
      </div>
    );
  }

  if (step === "urgent") {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
        <div className="p-8 rounded-2xl bg-orange-50 border border-orange-200">
          <h1 className="text-2xl font-bold text-orange-800">Your reading is very high.</h1>
          <p className="mt-4 text-orange-700 leading-relaxed">A reading of {systolic}/{diastolic} is in the hypertensive crisis range. Please rest for 5 minutes and test again. If it remains this high, contact your doctor immediately or seek urgent care.</p>
        </div>
      </div>
    );
  }

  if (step === "s4_context") {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
        <h1 className="text-3xl font-semibold tracking-tight">A quick context check.</h1>
        <p className="mt-4 text-neutral-600">These factors can temporarily affect a reading.</p>
        
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Did you just drink coffee, smoke, or exercise?</label>
            <div className="flex gap-2">
              <button onClick={() => setContext({...context, caffeine: "yes"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.caffeine === "yes" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>Yes</button>
              <button onClick={() => setContext({...context, caffeine: "no"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.caffeine === "no" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>No</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Did you eat a heavy or salty meal in the last 2 hours?</label>
            <div className="flex gap-2">
              <button onClick={() => setContext({...context, meal: "yes"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.meal === "yes" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>Yes</button>
              <button onClick={() => setContext({...context, meal: "no"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.meal === "no" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>No</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Have you taken your BP medication today?</label>
            <div className="flex gap-2">
              <button onClick={() => setContext({...context, meds: "yes"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.meds === "yes" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>Yes</button>
              <button onClick={() => setContext({...context, meds: "no"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.meds === "no" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>No</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Did you sleep poorly or feel unusually stressed today?</label>
            <div className="flex gap-2">
              <button onClick={() => setContext({...context, stress: "yes"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.stress === "yes" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>Yes</button>
              <button onClick={() => setContext({...context, stress: "no"})} className={`flex-1 rounded-xl py-3 font-medium border ${context.stress === "no" ? "bg-[#2E5B44] text-white border-[#2E5B44]" : "border-neutral-300 text-neutral-700"}`}>No</button>
            </div>
          </div>
          
          <button onClick={handleContextSubmit} disabled={!context.caffeine || !context.meal || !context.meds || !context.stress} className="w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            See My Result
          </button>
        </div>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
        {isHighReading ? (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{systolic}/{diastolic}.</h1>
            <p className="mt-2 text-xl text-neutral-600">Higher than usual today. Let's slow down.</p>
            <div className="mt-8 p-8 rounded-2xl bg-[#F3F4F6] border border-neutral-200">
              <p className="text-lg text-neutral-800 leading-relaxed">
                {influencerText && <span className="font-semibold">{influencerText} </span>}
                Your reading is in the range doctors classify as <strong>{category}</strong>.
              </p>
              {isIsolatedSystolic && (
                <p className="mt-4 text-sm text-neutral-600 border-t border-neutral-300 pt-4">
                  Because you are over 60 and your top number is high while your bottom number is normal, this is known as Isolated Systolic Hypertension. This is common as arteries stiffen with age, but still important to discuss with your doctor.
                </p>
              )}
            </div>
            <button onClick={() => setStep("s9_timer")} className="mt-8 w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white">
              Rest and Breathe (10 Mins)
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{systolic}/{diastolic}. Steady.</h1>
            <p className="mt-2 text-xl text-neutral-600">A good start, {title} {name}.</p>
            <div className="mt-8 p-8 rounded-2xl bg-[#F3F4F6] border border-neutral-200">
              <p className="text-lg text-neutral-800 leading-relaxed">
                {influencerText && <span className="font-semibold">{influencerText} </span>}
                Your reading is in the range doctors classify as <strong>{category}</strong>.
              </p>
            </div>
            <button onClick={() => { setSystolic(""); setDiastolic(""); setSymptoms([]); setContext({ caffeine: "", meds: "", stress: "", meal: "" }); setStep("s1_entry"); }} className="mt-8 w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white">
              Log Another Reading
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-24 px-6 text-[#121212]">
      <h1 className="text-3xl font-semibold tracking-tight">Good to see you, {title} {name}.</h1>
      <p className="mt-4 text-neutral-600">Let's log your reading.</p>
      
      <div className="mt-8 space-y-8">
        <div className="rounded-xl bg-neutral-100 p-6">
          <p className="text-sm font-medium text-neutral-800">Day 0 Pre-Reading Checklist:</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600 space-y-1">
            <li>Sit with your back supported and feet flat.</li>
            <li>Rest your arm on a table at heart level.</li>
            <li>Stay quiet and relaxed for five minutes first.</li>
          </ul>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Age</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 45" className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-xl focus:border-[#121212] focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Systolic (Top)</label>
            <input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120" className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-2xl focus:border-[#121212] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Diastolic (Bottom)</label>
            <input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80" className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-2xl focus:border-[#121212] focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-3">Are you experiencing any of these right now?</label>
          <div className="space-y-2">
            {symptomList.map(symptom => (
              <label key={symptom} className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-neutral-50">
                <input type="checkbox" checked={symptoms.includes(symptom)} onChange={() => toggleSymptom(symptom)} className="h-5 w-5 rounded border-neutral-300 text-[#2E5B44] focus:ring-[#2E5B44]" />
                <span className="text-neutral-700">{symptom}</span>
              </label>
            ))}
          </div>
        </div>
        {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
        <button onClick={handleEntrySubmit} className="w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90">
          Check Reading
        </button>
      </div>
    </div>
  );
}