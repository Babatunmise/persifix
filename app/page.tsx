"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BPInterpreter } from "@/components/interpreter/BPInterpreter";

export default function HomePage() {
  const [isLogging, setIsLogging] = useState(false);
  const [title, setTitle] = useState("");
  const [lastReading, setLastReading] = useState<{sys: number, dia: number} | null>(null);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    // Get greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Load title and last reading from local storage/supabase
    const loadData = async () => {
      // For MVP, we fetch the name from local storage if it exists
      // In the next sprint, we'll save this properly on onboarding
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
          .limit(1)
          .single();
        
        if (data) {
          setLastReading({ sys: data.systolic, dia: data.diastolic });
        }
      }
    };
    loadData();
  }, [isLogging]); // Reload when coming back from logging

  if (isLogging) {
    return (
      <div className="min-h-screen bg-[#FCFCFC]">
        <div className="absolute top-4 left-4 z-50">
           <button onClick={() => setIsLogging(false)} className="text-sm font-medium text-neutral-500 hover:text-black">
             ← Back to Home
           </button>
        </div>
        <BPInterpreter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#121212] pb-24 font-sans">
      {/* Header */}
      <header className="max-w-md mx-auto px-6 py-6 flex justify-between items-center">
        <span className="text-xl font-semibold tracking-tight">getsanctos.</span>
        <button className="text-neutral-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 space-y-8">
        {/* Hero Card */}
        <div className="bg-[#121212] text-white rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}{title ? `, ${title}` : ""}.
          </h1>
          <p className="mt-2 text-neutral-400">Your health, finally explained.</p>
          
          <button 
            onClick={() => setIsLogging(true)}
            className="mt-8 w-full rounded-full bg-[#2E5B44] px-8 py-4 text-lg font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Log Today's Reading
          </button>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">Last Reading</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#121212]">
              {lastReading ? `${lastReading.sys}/${lastReading.dia}` : "--/--"}
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">Your Baseline</p>
            {/* Mini Trend Line Mock */}
            <div className="mt-4 flex items-end space-x-1 h-8">
              <div className="w-2 bg-[#2E5B44] rounded-t-sm h-[40%]"></div>
              <div className="w-2 bg-[#2E5B44] rounded-t-sm h-[60%]"></div>
              <div className="w-2 bg-[#2E5B44] rounded-t-sm h-[50%]"></div>
              <div className="w-2 bg-[#2E5B44] rounded-t-sm h-[80%]"></div>
              <div className="w-2 bg-[#2E5B44] rounded-t-sm h-[70%]"></div>
            </div>
          </div>
        </div>

        {/* Context Chips */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Common Triggers</h2>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {["Extra Maggi?", "Poor Sleep?", "Stressed?", "Missed Meds?"].map((chip) => (
              <button key={chip} className="whitespace-nowrap rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
                {chip}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-neutral-200 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <button className="flex flex-col items-center text-[#121212]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </button>
          <a href="/history" className="flex flex-col items-center text-neutral-400 hover:text-[#121212]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">History</span>
          </a>
          <button className="flex flex-col items-center text-neutral-400 hover:text-[#121212]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}