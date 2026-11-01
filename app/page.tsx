"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { BPInterpreter } from "@/components/interpreter/BPInterpreter";

const subscribeToGreeting = (onStoreChange: () => void) => {
  const interval = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(interval);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// Accessibility: Get text label for the reading
const getCategoryLabel = (sys?: number, dia?: number) => {
  if (!sys || !dia) return "";
  if (sys >= 140 || dia >= 90) return "High";
  if (sys >= 130 || dia >= 85) return "Elevated";
  if (sys >= 125) return "Rising";
  return "Normal";
};

export default function HomePage() {
  const [isLogging, setIsLogging] = useState(false);
  const [title, setTitle] = useState("");
  const [lastReading, setLastReading] = useState<{sys: number, dia: number} | null>(null);
  const [baselineHistory, setBaselineHistory] = useState<{sys: number, dia: number}[]>([]);
  const greeting = useSyncExternalStore(
    subscribeToGreeting,
    getGreeting,
    () => "Hello",
  );

  useEffect(() => {
    const loadData = async () => {
      const savedTitle = localStorage.getItem("sanctos_title") || "";
      setTitle(savedTitle);

      const supabase = createClient();
      const deviceId = localStorage.getItem("sanctos_device_id");
      
      if (deviceId) {
        const { data } = await supabase
          .from("readings")
          .select("systolic, diastolic")
          .eq("user_id", deviceId)
          .order("recorded_at", { ascending: false })
          .limit(7);
        
        if (data && data.length > 0) {
          setLastReading({ sys: data[0].systolic, dia: data[0].diastolic });
          const history = data.map(d => ({ sys: d.systolic, dia: d.diastolic })).reverse();
          setBaselineHistory(history);
        } else {
          setLastReading(null);
          setBaselineHistory([]);
        }
      }
    };
    loadData();
  }, [isLogging]);

  if (isLogging) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col">
        <div className="max-w-md mx-auto w-full px-6 pt-6">
           <button onClick={() => setIsLogging(false)} className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
             ← Back to Home
           </button>
        </div>
        <div className="flex-1">
          <BPInterpreter />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-[#F9F8F6] pb-24 font-sans">
      <header className="max-w-md mx-auto px-6 py-6 flex justify-between items-center">
        <span className="text-xl font-semibold tracking-tight">getsanctos.</span>
        <button className="text-neutral-500 hover:text-white cursor-not-allowed" title="Settings coming soon">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 space-y-8">
        
        {/* WARM HERO CARD */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}{title ? `, ${title}` : ""}.
          </h1>
          <p className="mt-2 text-neutral-400">Let&apos;s check in on your health today.</p>
          
          <button 
            onClick={() => setIsLogging(true)}
            className="mt-8 w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Let&apos;s check your BP together
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <p className="text-sm font-medium text-neutral-400">Last Check-in</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {lastReading ? `${lastReading.sys}/${lastReading.dia}` : "--/--"}
            </p>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-neutral-400">Your Usual BP</p>
              {/* ACCESSIBILITY TEXT LABEL */}
              {lastReading && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {getCategoryLabel(lastReading.sys, lastReading.dia)}
                </span>
              )}
            </div>
            
            {/* DYNAMIC BAR CHART */}
            <div className="mt-4 flex items-end space-x-1 h-10 w-full">
              {baselineHistory.length > 0 ? (
                baselineHistory.map((r, idx) => {
                  const heightPct = Math.min(100, Math.max(20, (r.sys / 180) * 100));
                  
                  let bgColor = "bg-emerald-500";
                  if (r.sys >= 140 || r.dia >= 90) bgColor = "bg-red-500";
                  else if (r.sys >= 130 || r.dia >= 85) bgColor = "bg-orange-500";
                  else if (r.sys >= 125) bgColor = "bg-yellow-500";

                  return (
                    <div 
                      key={idx} 
                      className={`${bgColor} rounded-t-sm flex-1`} 
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })
              ) : (
                <>
                  <div className="bg-neutral-800 rounded-t-sm h-[20%] flex-1"></div>
                  <div className="bg-neutral-800 rounded-t-sm h-[40%] flex-1"></div>
                  <div className="bg-neutral-800 rounded-t-sm h-[30%] flex-1"></div>
                </>
              )}
            </div>
          </div>
        </div>
        
      </main>

      <nav className="fixed bottom-0 w-full bg-[#121212] border-t border-neutral-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 opacity-50">
          <button disabled className="flex flex-col items-center text-neutral-500 cursor-not-allowed">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </button>
          <a href="/history" className="flex flex-col items-center text-neutral-500 hover:text-white opacity-100 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">History</span>
          </a>
          <button disabled className="flex flex-col items-center text-neutral-500 cursor-not-allowed">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}