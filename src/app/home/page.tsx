"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

type Reading = {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string;
};

function calculateAge(dob: string | null) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  // App Data
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  // BP Form State
  const [showBPForm, setShowBPForm] = useState(false);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [savingBP, setSavingBP] = useState(false);
  const [errorBP, setErrorBP] = useState<string | null>(null);

  // Weight Form State
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [savingWeight, setSavingWeight] = useState(false);
  const [errorWeight, setErrorWeight] = useState<string | null>(null);

  // Meds state (UI only for now)
  const [medsTakenToday, setMedsTakenToday] = useState(false);

  //for the report generation, we will need to fetch the data and send it to the API route that generates the PDF. This can be done by creating a function that gathers the necessary data and makes a POST request to the /api/report endpoint.
  const [generatingReport, setGeneratingReport] = useState(false);
//bp reading protocol state
  const [bpStep, setBpStep] = useState<"protocol" | "input">("protocol");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, date_of_birth, goals, weight, weight_unit")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!profile) return router.push("/onboarding");
      
      setName(profile.name || "");
      setAge(calculateAge(profile.date_of_birth));
      setGoals(profile.goals || []);
      setCurrentWeight(profile.weight);
      if (profile.weight_unit) setWeightUnit(profile.weight_unit);

      const { data: rows } = await supabase
        .from("bp_readings")
        .select("id, systolic, diastolic, pulse, measured_at")
        .order("measured_at", { ascending: false })
        .limit(1);

      if (rows && rows.length > 0) {
        setLatestReading(rows[0]);
        fetchNarrative(rows[0].systolic, rows[0].diastolic, profile.date_of_birth, profile.goals);
      }
// Check if any meds were taken today
      const { data: medsLogs } = await supabase
        .from("medication_logs")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("status", "taken")
        .gte("taken_at", new Date(new Date().setHours(0,0,0,0)).toISOString());

      if (medsLogs && medsLogs.length > 0) {
        setMedsTakenToday(true);
      }
      setLoading(false);
    }
    load();
  }, [router]);

 async function fetchNarrative(sysVal: number, diaVal: number, dob: string | null, userGoals: string[]) {
    setLoadingNarrative(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let contextString = "";

      if (userData.user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Check for high sodium today
        const { data: meals } = await supabase
          .from("meal_logs")
          .select("sodium_mg")
          .gte("created_at", today.toISOString());
        
        const totalSodium = meals?.reduce((sum, m) => sum + m.sodium_mg, 0) || 0;
        if (totalSodium > 1000) {
          contextString += "The user has consumed high sodium today. ";
        }

        // 2. Check for pending meds
        const { data: meds } = await supabase
          .from("medications")
          .select("id")
          .eq("user_id", userData.user.id);
        
        if (meds && meds.length > 0) {
          const { data: medLogs } = await supabase
            .from("medication_logs")
            .select("medication_id")
            .eq("user_id", userData.user.id)
            .eq("status", "taken")
            .gte("taken_at", today.toISOString());
          
          if (medLogs && medLogs.length < meds.length) {
            contextString += "The user has not yet taken all their medications today. ";
          }
        }
      }

      const res = await fetch("/api/narrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systolic: sysVal,
          diastolic: diaVal,
          age: calculateAge(dob),
          goals: userGoals,
          context: contextString || "Normal daily routine."
        }),
      });
      const json = await res.json();
      if (res.ok && json.narrative) setNarrative(json.narrative);
    } catch (err) {
      console.error("Narrative fetch failed");
    } finally {
      setLoadingNarrative(false);
    }
  }

  async function saveReading(e: React.FormEvent) {
    e.preventDefault();
    setErrorBP(null);
    setNarrative(null);

    const sysNum = Number(sys);
    const diaNum = Number(dia);
    if (!sysNum || !diaNum) return setErrorBP("Please enter both numbers.");

    setSavingBP(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return router.push("/");

    const { data, error } = await supabase
      .from("bp_readings")
      .insert({
        user_id: userData.user.id,
        systolic: sysNum,
        diastolic: diaNum,
        pulse: pulse ? Number(pulse) : null,
      })
      .select()
      .single();

    if (error) {
      setSavingBP(false);
      return setErrorBP(error.message);
    }

    setLatestReading(data as Reading);
    setSys(""); setDia(""); setPulse(""); setShowBPForm(false);
    
    await fetchNarrative(sysNum, diaNum, null, goals);
    setSavingBP(false);
  }

  async function saveWeight(e: React.FormEvent) {
    e.preventDefault();
    setErrorWeight(null);
    const weightNum = Number(weightInput);
    if (!weightNum) return setErrorWeight("Please enter a valid weight.");

    setSavingWeight(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return router.push("/");

    // 1. Log the weight for history tracking
    const { error: logError } = await supabase.from("weight_logs").insert({
      user_id: userData.user.id,
      weight: weightNum,
      weight_unit: weightUnit,
    });

    // 2. Update the main profile so Kitchen recalculates calories
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ weight: weightNum, weight_unit: weightUnit })
      .eq("id", userData.user.id);

    if (logError || profileError) {
      setSavingWeight(false);
      return setErrorWeight("Failed to save weight. Please try again.");
    }

    setCurrentWeight(weightNum);
    setWeightInput("");
    setShowWeightForm(false);
    setSavingWeight(false);
  }

async function generateReport() {
    setGeneratingReport(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [bpRes, weightRes, medRes, medLogRes, workRes, sanctRes] = await Promise.all([
        supabase.from("bp_readings").select("systolic, diastolic").eq("user_id", userData.user.id).gte("measured_at", thirtyDaysAgo.toISOString()),
        supabase.from("weight_logs").select("weight, weight_unit").eq("user_id", userData.user.id).order("logged_at", { ascending: false }).limit(1),
        supabase.from("medications").select("name, dosage").eq("user_id", userData.user.id),
        supabase.from("medication_logs").select("id").eq("user_id", userData.user.id).eq("status", "taken").gte("taken_at", thirtyDaysAgo.toISOString()),
        supabase.from("workout_logs").select("duration_mins").eq("user_id", userData.user.id).gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("sanctuary_logs").select("activity_type, duration_mins").eq("user_id", userData.user.id).gte("created_at", thirtyDaysAgo.toISOString())
      ]);

      const bpData = bpRes.data || [];
      const avgSys = bpData.length ? Math.round(bpData.reduce((sum, r) => sum + r.systolic, 0) / bpData.length) : "N/A";
      const avgDia = bpData.length ? Math.round(bpData.reduce((sum, r) => sum + r.diastolic, 0) / bpData.length) : "N/A";
      
      const totalWorkoutMins = (workRes.data || []).reduce((sum, w) => sum + w.duration_mins, 0);
      const breatherCount = (sanctRes.data || []).filter(s => s.activity_type === 'breather').length;
      
      const latestW = weightRes.data && weightRes.data.length > 0 ? weightRes.data[0] : { weight: "N/A", weight_unit: "" };

      const payload = {
        name: name,
        avgSys, avgDia,
        totalReadings: bpData.length,
        latestWeight: latestW.weight,
        weightUnit: latestW.weight_unit,
        meds: (medRes.data || []).map(m => `${m.name} ${m.dosage || ""}`),
        medsTakenCount: (medLogRes.data || []).length,
        totalWorkoutMins,
        breatherCount,
        journalNotes: ["Felt a bit dizzy after the morning walk.", "Blood pressure seems stable, feeling less stressed this week."]
      };

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Getsanctos_Clinical_Report.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
       const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Report error:", err);
      alert("An error occurred while generating the report.");
    } finally {
      setGeneratingReport(false); // This guarantees it always resets
    }
  }



  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-2xl tracking-tight text-sanctos-navy">Sanctos</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sanctos-green opacity-70"></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full flex items-center justify-center text-sanctos-navy/60 hover:text-sanctos-navy">
              <span className="material-symbols-outlined">notifications</span>
            </button>
           <button 
              onClick={() => router.push("/profile")}
              className="w-8 h-8 rounded-full bg-sanctos-navy flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-sanctos-green"></span>
            <p className="text-[11px] uppercase tracking-wider text-sanctos-navy/60 font-semibold">
              {todayStr} • Rhythm
            </p>
          </div>
          <h1 className="font-serif text-[34px] leading-tight text-sanctos-navy tracking-tight">
            Good morning, {name.split(" ")[0] || "there"}.
          </h1>
        </div>

        <section className="bg-sanctos-sand rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/50 text-sanctos-navy">
              <span className="material-symbols-outlined text-[15px] fill">auto_awesome</span>
              <span className="text-[10px] font-bold tracking-wider uppercase">Sanctos Companion</span>
            </div>
            <span className="text-[11px] font-medium text-sanctos-navy/50">
              {latestReading ? "Latest insight" : "Waiting for data"}
            </span>
          </div>

          {loadingNarrative ? (
            <p className="font-serif text-lg italic text-sanctos-navy/50 animate-pulse py-2">
              Reflecting on your health...
            </p>
          ) : narrative ? (
            <p className="font-serif text-[19px] leading-relaxed text-sanctos-navy italic my-2">
              "{narrative}"
            </p>
          ) : (
            <p className="font-serif text-[19px] leading-relaxed text-sanctos-navy italic my-2">
              "Log your first reading today to hear from your companion."
            </p>
          )}
          
          {latestReading && (
            <div className="flex items-center gap-2 pt-2 mt-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sanctos-green text-white">
                <span className="material-symbols-outlined text-[12px] fill">check</span>
              </span>
              <span className="text-xs font-semibold text-sanctos-navy">Last reading: {latestReading.systolic}/{latestReading.diastolic} mmHg</span>
            </div>
          )}
          <button 
            onClick={() => router.push("/history")}
            className="mt-3 w-full py-2.5 rounded-full bg-white/40 text-sanctos-navy font-semibold text-sm flex items-center justify-center gap-1 hover:bg-white/60 transition-colors"
          >
            View Full History
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => { setShowBPForm(true); setBpStep("protocol"); }}
            className="flex flex-col items-center justify-between text-center p-3 aspect-square rounded-3xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-sanctos-sand flex items-center justify-center text-sanctos-navy">
              <span className="material-symbols-outlined text-[22px] fill">cardiology</span>
            </div>
            <div className="flex flex-col items-center w-full">
              <span className="text-[13px] font-bold text-sanctos-navy">Log BP</span>
              <span className="text-[11px] text-sanctos-navy/50 truncate w-full">&lt;130/80</span>
            </div>
          </button>

          <button 
            onClick={() => setShowWeightForm(true)}
            className="flex flex-col items-center justify-between text-center p-3 aspect-square rounded-3xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-sanctos-sand flex items-center justify-center text-sanctos-navy">
              <span className="material-symbols-outlined text-[22px]">scale</span>
            </div>
            <div className="flex flex-col items-center w-full">
              <span className="text-[13px] font-bold text-sanctos-navy">Log Weight</span>
              <span className="text-[11px] text-sanctos-navy/50 truncate w-full">
                {currentWeight ? `${currentWeight} ${weightUnit}` : "Add today"}
              </span>
            </div>
          </button>

         <button 
            onClick={() => router.push("/medicine")}
            className="flex flex-col items-center justify-between text-center p-3 aspect-square rounded-3xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${medsTakenToday ? 'bg-sanctos-green text-white' : 'bg-sanctos-sand text-sanctos-navy'}`}>
              <span className={`material-symbols-outlined text-[22px] ${medsTakenToday ? 'fill' : ''}`}>
                {medsTakenToday ? 'check' : 'pill'}
              </span>
            </div>
            <div className="flex flex-col items-center w-full">
              <span className="text-[13px] font-bold text-sanctos-navy">Meds</span>
              <span className={`text-[11px] truncate w-full ${medsTakenToday ? 'text-sanctos-green font-semibold' : 'text-sanctos-navy/50'}`}>
                {medsTakenToday ? 'Taken today' : 'Go to Cabinet'}
              </span>
            </div>
          </button>
        </section>
{/* Independent Clinical Assessment Card */}
        <section className="mt-2">
          <button 
            onClick={generateReport}
            disabled={generatingReport}
            className="w-full bg-white rounded-3xl p-5 shadow-sm border border-sanctos-sand flex items-center justify-between active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-sanctos-sand flex items-center justify-center text-sanctos-navy">
                <span className="material-symbols-outlined text-[24px]">clinical_notes</span>
              </div>
              <div className="text-left">
                <h3 className="font-serif text-lg text-sanctos-navy">Clinical Handoff</h3>
                <p className="text-xs text-sanctos-navy/60 mt-0.5">Generate 30-day Doctor's Report</p>
              </div>
            </div>
            {generatingReport ? (
              <span className="text-xs font-semibold text-sanctos-green animate-pulse mr-2">Building...</span>
            ) : (
              <div className="w-8 h-8 rounded-full bg-alive-bg flex items-center justify-center">
                <span className="material-symbols-outlined text-sanctos-navy/50 text-[18px]">download</span>
              </div>
            )}
          </button>
        </section>
        <section className="bg-sanctos-navy text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Today's Focus</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">17 mins</span>
          </div>
          <h2 className="font-serif text-[22px] leading-snug mb-5">
            15-min walk + 2 mins of Breather.
          </h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-sanctos-green flex items-center justify-center shrink-0 text-white">
                <span className="material-symbols-outlined text-[18px]">directions_walk</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-white truncate">Gentle Morning Stride</h3>
                  <span className="text-[11px] text-white/50">15 min</span>
                </div>
                <p className="text-[11px] text-white/50 truncate">Low vascular strain</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-sanctos-green flex items-center justify-center shrink-0 text-white">
                <span className="material-symbols-outlined text-[18px]">air</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-white truncate">Cardio-Calm Breather</h3>
                  <span className="text-[11px] text-white/50">2 min</span>
                </div>
                <p className="text-[11px] text-white/50 truncate">4-7-8 reset</p>
              </div>
            </div>
          </div>

          <button className="w-full h-12 rounded-full bg-sanctos-green text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
            Start Rhythm
            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
          </button>
         
        </section>
      </div>

     {/* BP Modal */}
      {showBPForm && (
        <div className="fixed inset-0 z-50 bg-sanctos-navy/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 pb-24">
          <div className="bg-alive-bg w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 fade-in">
            
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-serif text-2xl text-sanctos-navy">
                {bpStep === "protocol" ? "Pre-Check" : "Log Reading"}
              </h3>
              <button type="button" onClick={() => setShowBPForm(false)} className="text-sanctos-navy/50 hover:text-sanctos-navy">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* STEP 1: The Protocol Checklist */}
            {bpStep === "protocol" && (
              <div className="space-y-6 py-2">
                <p className="text-sm text-sanctos-navy/70 leading-relaxed">
                  For an accurate reading, please ensure you are set up correctly.
                </p>
                
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-sanctos-green rounded" required />
                    <span className="text-sm text-sanctos-navy font-medium">I have been sitting quietly for 5 minutes.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-sanctos-green rounded" required />
                    <span className="text-sm text-sanctos-navy font-medium">My feet are flat on the floor.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-sanctos-green rounded" required />
                    <span className="text-sm text-sanctos-navy font-medium">My arm is supported at heart level.</span>
                  </label>
                </div>

                <button 
                  type="button" 
                  onClick={() => setBpStep("input")}
                  className="w-full bg-sanctos-navy text-white rounded-full py-4 font-semibold mt-4"
                >
                  I'm Ready
                </button>
              </div>
            )}

            {/* STEP 2: The Input Form */}
            {bpStep === "input" && (
              <form onSubmit={saveReading} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Systolic</label>
                    <input type="number" placeholder="120" value={sys} onChange={e => setSys(e.target.value)} className="w-full mt-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold text-lg" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Diastolic</label>
                    <input type="number" placeholder="80" value={dia} onChange={e => setDia(e.target.value)} className="w-full mt-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold text-lg" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Pulse (optional)</label>
                  <input type="number" placeholder="72" value={pulse} onChange={e => setPulse(e.target.value)} className="w-full mt-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold text-lg" />
                </div>

                {errorBP && <p className="text-red-500 text-sm ml-1">{errorBP}</p>}
                
                <button type="submit" disabled={savingBP} className="w-full bg-sanctos-green text-white rounded-full py-4 font-semibold mt-2 disabled:opacity-50">
                  {savingBP ? "Saving..." : "Save Reading"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightForm && (
        <div className="fixed inset-0 z-50 bg-sanctos-navy/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 pb-24">
          <form onSubmit={saveWeight} className="bg-alive-bg w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-serif text-2xl text-sanctos-navy">Log Weight</h3>
              <button type="button" onClick={() => setShowWeightForm(false)} className="text-sanctos-navy/50 hover:text-sanctos-navy">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-sanctos-navy/60 ml-1">Weight</label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="number" 
                  step="0.1"
                  placeholder={weightUnit === 'kg' ? "70.5" : "155.0"} 
                  value={weightInput} 
                  onChange={e => setWeightInput(e.target.value)} 
                  className="flex-1 bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-semibold text-lg" 
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                  className="px-4 py-3 rounded-2xl bg-sanctos-sand/50 text-sanctos-navy font-semibold outline-none focus:ring-2 focus:ring-sanctos-green appearance-none"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>

            {errorWeight && <p className="text-red-500 text-sm ml-1">{errorWeight}</p>}
            
            <button type="submit" disabled={savingWeight} className="w-full bg-sanctos-navy text-white rounded-full py-4 font-semibold mt-2 disabled:opacity-50">
              {savingWeight ? "Saving..." : "Save Weight"}
            </button>
          </form>
        </div>
      )}

      <BottomNav />
    </main>
  );
}