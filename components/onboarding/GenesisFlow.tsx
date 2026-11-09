"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

export function GenesisFlow({ onComplete }: { onComplete: () => void }) {
  // 5 Steps: 0=Name, 1=Why, 2=Meds Yes/No, 3=Med Details, 4=Anchors
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [title, setTitle] = useState("");
  const [motivation, setMotivation] = useState("");
  
  const [takesMeds, setTakesMeds] = useState<boolean>(false);
  const [medName, setMedName] = useState("");
  const [supplyCount, setSupplyCount] = useState("");
  const [dosesPerDay, setDosesPerDay] = useState("");

  const [morningAnchor, setMorningAnchor] = useState("08:00");
  const [eveningAnchor, setEveningAnchor] = useState("20:00");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const session = await ensureAnonymousSession();
      if (!session) throw new Error("No session");

      const supabase = createClient();
      await supabase.from("profiles").upsert({
        id: session.user.id,
        first_name: firstName,
        title: title,
        motivation,
        medication_name: takesMeds ? medName : null,
        supply_count: takesMeds && supplyCount ? parseInt(supplyCount) : null,
        doses_per_day: takesMeds && dosesPerDay ? parseInt(dosesPerDay) : null,
        morning_anchor: morningAnchor,
        evening_anchor: eveningAnchor,
        updated_at: new Date().toISOString(),
      });

      localStorage.setItem("sanctos_name", firstName);
      localStorage.setItem("sanctos_title", title);

      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- STEP 0: IDENTITY ---
  if (step === 0) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-8">First, what should we call you?</h2>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Title (Optional)</label>
            <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-xl text-white focus:border-[#2E5B44] focus:outline-none">
              <option value="">Select...</option>
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
              <option value="Dr.">Dr.</option>
              <option value="Chief">Chief</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">First Name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Tunmise" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-xl text-white focus:border-[#2E5B44] focus:outline-none" />
          </div>
        </div>
        <button onClick={() => setStep(1)} disabled={!firstName} className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50 mt-4">
          Continue
        </button>
      </div>
    );
  }

  // --- STEP 1: THE WHY ---
  if (step === 1) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-8">Why are you tracking your blood pressure?</h2>
        <div className="space-y-3">
          {["Doctor's orders", "Family history", "Peace of mind", "Managing medication"].map((reason) => (
            <button
              key={reason}
              onClick={() => { setMotivation(reason); setStep(2); }}
              className="w-full rounded-2xl bg-neutral-900 border border-neutral-800 py-5 text-lg font-medium text-[#F9F8F6] transition-colors hover:bg-neutral-800"
            >
              {reason}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- STEP 2: DO YOU TAKE MEDS? (Yes/No Only) ---
  if (step === 2) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-8">Do you take BP medication?</h2>
        <div className="space-y-4">
          <button 
            onClick={() => { setTakesMeds(true); setStep(3); }} 
            className="w-full rounded-2xl bg-[#F9F8F6] py-5 text-lg font-semibold text-black"
          >
            Yes
          </button>
          <button 
            onClick={() => { setTakesMeds(false); setStep(4); }} 
            className="w-full rounded-2xl bg-neutral-900 border border-neutral-800 py-5 text-lg font-medium text-[#F9F8F6]"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  // --- STEP 3: MEDICATION DETAILS (Only shows if they clicked Yes) ---
  if (step === 3) {
    return (
      <div className="space-y-6 text-center animate-fade-in-up">
        <h2 className="text-3xl font-semibold mb-8">Tell us about your medication</h2>
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Medication Name</label>
            <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g. Amlodipine" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-[#2E5B44] focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Pills Left</label>
              <input type="number" inputMode="numeric" value={supplyCount} onChange={(e) => setSupplyCount(e.target.value)} placeholder="e.g. 30" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-[#2E5B44] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Doses / Day</label>
              <input type="number" inputMode="numeric" value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)} placeholder="e.g. 1" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:border-[#2E5B44] focus:outline-none" />
            </div>
          </div>
          <button onClick={() => setStep(4)} className="w-full rounded-full bg-[#2E5B44] py-4 text-lg font-semibold text-white mt-4">Continue</button>
        </div>
      </div>
    );
  }

  // --- STEP 4: DAILY ANCHORS ---
  return (
    <div className="space-y-8 text-center animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-semibold mb-2">Let&apos;s build a routine.</h2>
        <p className="text-neutral-400 text-sm">When do you usually have a quiet moment to check your BP?</p>
      </div>

      <div className="space-y-6 text-left">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Morning Check-in</label>
          <input type="time" value={morningAnchor} onChange={(e) => setMorningAnchor(e.target.value)} className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Evening Check-in</label>
          <input type="time" value={eveningAnchor} onChange={(e) => setEveningAnchor(e.target.value)} className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none" />
        </div>
      </div>

      <button onClick={handleSave} disabled={isSaving} className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        {isSaving ? "Saving..." : "Start My Journey"}
      </button>
    </div>
  );
}