"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

type Med = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string;
  pills_remaining: number;
};

const INTERACTION_WARNINGS: Record<string, string> = {
  ibuprofen: "NSAIDs like Ibuprofen can raise blood pressure and blunt the effect of your BP meds. Ask your doctor for a safer alternative.",
  naproxen: "NSAIDs like Naproxen can raise blood pressure. Consult your doctor.",
  "salt substitute": "Salt substitutes are usually high in potassium. Combined with ACE inhibitors or ARBs, this can cause dangerous hyperkalemia (too much potassium).",
  potassium: "High potassium can be dangerous with certain BP medications. Always check with your doctor.",
  decongestant: "Decongestants (like pseudoephedrine) can spike blood pressure. Avoid if possible.",
};

export default function MedicinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meds, setMeds] = useState<Med[]>([]);
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set());

  // Add Med State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [savingMed, setSavingMed] = useState(false);

  // Shield State
  const [searchTerm, setSearchTerm] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  // Missed Dose State
  const [showMissedPrompt, setShowMissedPrompt] = useState(false);
  const [missedReason, setMissedReason] = useState("");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      // Get Meds
      const { data: medsData } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: true });

      if (medsData) setMeds(medsData);

      // Get Today's Logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: logs } = await supabase
        .from("medication_logs")
        .select("medication_id")
        .eq("user_id", userData.user.id)
        .eq("status", "taken")
        .gte("taken_at", today.toISOString());

      if (logs) {
        setTakenToday(new Set(logs.map((l) => l.medication_id)));
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function addMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSavingMed(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase.from("medications").insert({
      user_id: userData.user.id,
      name: newName,
      dosage: newDosage,
      pills_remaining: 30,
    }).select().single();

    if (data) setMeds([...meds, data]);
    setNewName(""); setNewDosage(""); setShowAddForm(false);
    setSavingMed(false);
  }

  async function markTaken(medId: string, currentPills: number) {
    if (takenToday.has(medId)) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // 1. Log it
    await supabase.from("medication_logs").insert({
      user_id: userData.user.id,
      medication_id: medId,
      status: "taken",
    });

    // 2. Decrement pill count
    await supabase.from("medications").update({ pills_remaining: Math.max(currentPills - 1, 0) }).eq("id", medId);

    // 3. Update UI
    setTakenToday((prev) => new Set(prev).add(medId));
    setMeds(meds.map(m => m.id === medId ? { ...m, pills_remaining: Math.max(m.pills_remaining - 1, 0) } : m));
  }

  function checkInteraction(val: string) {
    setSearchTerm(val);
    const lower = val.toLowerCase();
    const foundKey = Object.keys(INTERACTION_WARNINGS).find(k => lower.includes(k));
    setWarning(foundKey ? INTERACTION_WARNINGS[foundKey] : null);
  }

  async function submitMissedReason(reason: string) {
    setMissedReason(reason);
    setAiAdvice(null);
    try {
      const res = await fetch("/api/meds-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) setAiAdvice(data.narrative);
    } catch (err) {}
  }

  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-serif text-2xl tracking-tight text-sanctos-navy">The Cabinet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sanctos-green opacity-70"></span>
          </div>
          <p className="text-xs font-medium text-sanctos-navy/60">Protecting your daily rhythm.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="w-10 h-10 rounded-full bg-sanctos-navy text-white flex items-center justify-center">
          <span className="material-symbols-outlined">add</span>
        </button>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        {/* Today's Doses */}
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-sanctos-navy mb-4">Today's Doses</h2>
          {meds.length === 0 ? (
            <p className="text-sm text-sanctos-navy/50">No medications added yet. Click the + button above.</p>
          ) : (
            <div className="space-y-3">
              {meds.map((med) => {
                const isTaken = takenToday.has(med.id);
                const isLow = med.pills_remaining <= 5;

                return (
                  <div key={med.id} className={`flex items-center justify-between p-3 rounded-2xl border ${isTaken ? "border-sanctos-green/20 bg-sanctos-green/5" : "border-sanctos-sand/50 bg-alive-bg"}`}>
                    <div>
                      <p className="font-semibold text-sanctos-navy">{med.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-sanctos-navy/60">{med.dosage}</p>
                        {isLow && !isTaken && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Refill Soon</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => markTaken(med.id, med.pills_remaining)}
                      disabled={isTaken}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isTaken ? "bg-sanctos-green text-white" : "bg-sanctos-sand text-sanctos-navy hover:bg-sanctos-sand/80"
                      }`}
                    >
                      <span className="material-symbols-outlined">{isTaken ? "check" : "pill"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Drug Interaction Shield */}
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sanctos-navy">health_and_safety</span>
            <h2 className="text-sm font-bold text-sanctos-navy">Interaction Shield</h2>
          </div>
          <p className="text-xs text-sanctos-navy/60 mb-3">Checking a new medicine or supplement?</p>
          <input
            type="text"
            placeholder="Type a drug name (e.g., Ibuprofen)"
            value={searchTerm}
            onChange={(e) => checkInteraction(e.target.value)}
            className="w-full bg-alive-bg px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-medium"
          />
          {warning && (
            <div className="mt-3 bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <p className="text-xs font-medium leading-relaxed">{warning}</p>
            </div>
          )}
        </section>

        {/* Companion Check-in */}
        <section className="bg-sanctos-navy text-white rounded-3xl p-6 shadow-md">
          <h2 className="font-serif text-xl mb-2">Missed a dose?</h2>
          <p className="text-sm text-white/70 mb-4">
            It happens. Let's figure it out together so you don't feel alone.
          </p>
          {!aiAdvice ? (
            <div className="grid grid-cols-3 gap-2">
              {["Forgot", "Ran out", "Felt dizzy"].map(reason => (
                <button 
                  key={reason}
                  onClick={() => submitMissedReason(reason)}
                  className="bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 p-4 rounded-xl">
              <p className="text-sm leading-relaxed italic">"{aiAdvice}"</p>
              <button onClick={() => setAiAdvice(null)} className="text-xs font-semibold mt-3 underline text-white/60">Dismiss</button>
            </div>
          )}
        </section>

      </div>

      {/* Add Med Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-sanctos-navy/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 pb-24">
          <form onSubmit={addMedication} className="bg-alive-bg w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-serif text-2xl text-sanctos-navy">Add Medication</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-sanctos-navy/50">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Medication Name</label>
              <input type="text" placeholder="e.g., Lisinopril" value={newName} onChange={e => setNewName(e.target.value)} className="w-full mt-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold" />
            </div>
            <div>
              <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Dosage (optional)</label>
              <input type="text" placeholder="e.g., 10mg" value={newDosage} onChange={e => setNewDosage(e.target.value)} className="w-full mt-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold" />
            </div>
            <button type="submit" disabled={savingMed} className="w-full bg-sanctos-navy text-white rounded-full py-4 font-semibold mt-2 disabled:opacity-50">
              {savingMed ? "Saving..." : "Add to Cabinet"}
            </button>
          </form>
        </div>
      )}

      <BottomNav />
    </main>
  );
}