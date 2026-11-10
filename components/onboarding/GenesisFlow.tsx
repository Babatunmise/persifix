"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useAppConfig } from "@/components/providers/AppConfigProvider";

const COMMON_BP_MEDS = [
  "Amlodipine", "Lisinopril", "Losartan", "Metoprolol", 
  "Atenolol", "Hydrochlorothiazide", "Ramipril", "Valsartan"
];

export function GenesisFlow({ onComplete }: { onComplete: () => void }) {
  const { refreshConfig } = useAppConfig();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [medName, setMedName] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const session = await ensureAnonymousSession();
      if (!session) throw new Error("No session");

      const supabase = createClient();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      
      // 1. Save Profile
      await supabase.from("profiles").upsert({
        id: session.user.id,
        first_name: firstName,
        motivation,
        timezone: userTimezone,
        updated_at: new Date().toISOString(),
      });

      // 2. Save Medication (if provided)
      if (medName.trim()) {
        await supabase.from("medications").insert({
          user_id: session.user.id,
          name: medName.trim(),
        });
      }

      // 3. Save locally for fast hydration
      localStorage.setItem("sanctos_name", firstName);

      // 4. Refresh the global context so the Home Hub updates instantly
      await refreshConfig();

      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- STEP 0: THE WELCOME & NAME ---
  if (step === 0) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-4 text-[#F9F8F6]">Welcome to Sanctos.</h1>
          <p className="text-neutral-400">Your companion for understanding your blood pressure.</p>
        </div>
        
        <div className="text-left mt-8">
          <label className="block text-sm font-medium text-neutral-400 mb-2">What should we call you?</label>
          <input 
            type="text" 
            value={firstName} 
            onChange={(e) => {
              // Auto-capitalize first letter
              const val = e.target.value;
              setFirstName(val.charAt(0).toUpperCase() + val.slice(1));
            }} 
            placeholder="First Name" 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-xl text-white focus:border-[#2E5B44] focus:outline-none capitalize" 
          />
        </div>

        <button 
          onClick={() => setStep(1)} 
          disabled={!firstName.trim()} 
          className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50 mt-8"
        >
          Continue
        </button>
      </div>
    );
  }

  // --- STEP 1: THE WHY ---
  if (step === 1) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-2 text-[#F9F8F6]">What brings you here today?</h2>
        <p className="text-neutral-400 text-sm mb-8">We&apos;ll tailor your experience based on your goal.</p>
        
        <div className="space-y-3">
          {[
            { label: "Understanding", desc: "I want to learn what my numbers mean." },
            { label: "Prevention", desc: "I want to keep my heart healthy." },
            { label: "Detection", desc: "I'm monitoring a potential issue." },
            { label: "Management", desc: "I'm managing an existing condition." }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { setMotivation(item.label); setStep(2); }}
              className="w-full text-left p-5 rounded-2xl bg-neutral-900 border border-neutral-800 transition-colors hover:bg-neutral-800 flex flex-col gap-1"
            >
              <span className="text-lg font-semibold text-[#F9F8F6]">{item.label}</span>
              <span className="text-sm text-neutral-400">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- STEP 2: ONE MEDICATION ---
  return (
    <div className="space-y-8 text-center animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-semibold mb-2 text-[#F9F8F6]">Do you take BP medication?</h2>
        <p className="text-neutral-400 text-sm">You can add more later in Settings.</p>
      </div>

      <div className="text-left space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Medication Name (Optional)</label>
          <input 
            type="text" 
            list="med-list"
            value={medName} 
            onChange={(e) => setMedName(e.target.value)} 
            placeholder="Start typing..." 
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-lg text-white focus:border-[#2E5B44] focus:outline-none" 
          />
          <datalist id="med-list">
            {COMMON_BP_MEDS.map(med => (
              <option key={med} value={med} />
            ))}
          </datalist>
        </div>

        <button 
          onClick={() => setMedName("I'm not sure")}
          className="text-sm text-[#2E5B44] underline hover:text-white transition-colors"
        >
          I&apos;m not sure what it&apos;s called
        </button>
      </div>

      <div className="pt-8 space-y-3">
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Setting up..." : "Finish Setup"}
        </button>
        
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full rounded-full bg-transparent py-3 text-sm font-medium text-neutral-400 hover:text-white"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}