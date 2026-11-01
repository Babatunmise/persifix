"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
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

type ReadingCategory = "Normal" | "Elevated" | "Stage 1" | "Stage 2";

function getReadingCategory(sys: number, dia: number): ReadingCategory {
  if (sys >= 140 || dia >= 90) return "Stage 2";
  if (sys >= 130 || dia >= 85) return "Stage 1";
  if (sys >= 125) return "Elevated";
  return "Normal";
}

function getCategoryLabel(sys: number, dia: number) {
  const category = getReadingCategory(sys, dia);
  return category === "Stage 1" || category === "Stage 2" ? "High" : category;
}

export default function HomePage() {
  const [isLogging, setIsLogging] = useState(false);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [lastReading, setLastReading] = useState<{
    sys: number;
    dia: number;
  } | null>(null);
  const [baselineHistory, setBaselineHistory] = useState<
    { sys: number; dia: number }[]
  >([]);
  const [trendError, setTrendError] = useState("");
  const greeting = useSyncExternalStore(
    subscribeToGreeting,
    getGreeting,
    () => "Hello",
  );

  useEffect(() => {
    const handleFocus = () => {
      setName(localStorage.getItem("sanctos_name") || "");
      setTitle(localStorage.getItem("sanctos_title") || "");
    };

    handleFocus();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      const deviceId = localStorage.getItem("sanctos_device_id");
      if (!deviceId) {
        if (isActive) {
          setLastReading(null);
          setBaselineHistory([]);
          setTrendError("");
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("readings")
          .select("systolic, diastolic")
          .eq("user_id", deviceId)
          .order("recorded_at", { ascending: false })
          .limit(7);

        if (error) throw error;

        if (data && data.length > 0) {
          if (isActive) {
            setLastReading({ sys: data[0].systolic, dia: data[0].diastolic });
            setBaselineHistory(
              data
                .map((reading) => ({
                  sys: reading.systolic,
                  dia: reading.diastolic,
                }))
                .reverse(),
            );
            setTrendError("");
          }
        } else {
          if (isActive) {
            setLastReading(null);
            setBaselineHistory([]);
            setTrendError("");
          }
        }
      } catch {
        if (isActive) {
          setLastReading(null);
          setBaselineHistory([]);
          setTrendError("We couldn't load your recent readings.");
        }
      }
    };

    void loadData();
    return () => {
      isActive = false;
    };
  }, [isLogging]);

  const categoryCounts: Record<ReadingCategory, number> = {
    Normal: 0,
    Elevated: 0,
    "Stage 1": 0,
    "Stage 2": 0,
  };
  for (const reading of baselineHistory) {
    categoryCounts[getReadingCategory(reading.sys, reading.dia)] += 1;
  }

  const highCount = categoryCounts["Stage 1"] + categoryCounts["Stage 2"];
  const latestCategory = lastReading
    ? getReadingCategory(lastReading.sys, lastReading.dia)
    : null;
  const trendSummary = !baselineHistory.length
    ? "No readings yet. Tap 'Let's check your BP together' to start building your baseline."
    : categoryCounts.Normal === baselineHistory.length
      ? "Your recent readings have all been in the healthy range. Keep up the good work."
      : highCount > 0
        ? `Your last reading was ${latestCategory}, but ${highCount} of your last ${baselineHistory.length} readings were High. We should talk about this trend.`
        : `Your last reading was ${latestCategory}. Your recent readings include ${categoryCounts.Elevated} Elevated reading${categoryCounts.Elevated === 1 ? "" : "s"}, with no Stage 1 or Stage 2 readings.`;

  if (isLogging) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col">
        <div className="max-w-md mx-auto w-full px-6 pt-6">
           <button onClick={() => setIsLogging(false)} className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
             ← Back to Home
           </button>
        </div>
        <div className="flex-1">
          <BPInterpreter onExit={() => setIsLogging(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-[#F9F8F6] pb-24 font-sans">
      <header className="max-w-md mx-auto px-6 py-6 flex justify-between items-center">
        <span className="text-xl font-semibold tracking-tight">getsanctos.</span>
        <Link
          href="/settings"
          aria-label="Settings"
          className="text-neutral-500 transition-colors hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42m-9.88 9.88-1.42 1.42" />
            <circle cx="12" cy="12" r="5" strokeWidth={1.8} />
          </svg>
        </Link>
      </header>

      <main className="max-w-md mx-auto px-6 space-y-8">
        
        {/* WARM HERO CARD */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}
            {title || name ? `, ${[title, name].filter(Boolean).join(" ")}` : ""}.
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
          
          <Link
            href="/trends"
            className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left shadow-sm transition-colors hover:border-neutral-700 hover:bg-neutral-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D9A7F]"
          >
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-neutral-400">Clinical Trend Summary</p>
              <span className="flex items-center gap-2">
                {lastReading && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {getCategoryLabel(lastReading.sys, lastReading.dia)}
                  </span>
                )}
                <svg
                  className="h-4 w-4 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
            
            <p className="mt-4 text-sm leading-6 text-neutral-300">
              {trendError || trendSummary}
            </p>
            {!trendError && baselineHistory.length > 0 && (
              <p className="mt-3 text-xs leading-5 text-neutral-500">
                Last {baselineHistory.length}: {categoryCounts.Normal} Normal ·{" "}
                {categoryCounts.Elevated} Elevated · {categoryCounts["Stage 1"]}{" "}
                Stage 1 · {categoryCounts["Stage 2"]} Stage 2
              </p>
            )}
          </Link>
        </div>
        
      </main>

      <nav className="fixed bottom-0 w-full bg-[#121212] border-t border-neutral-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <Link href="/" aria-current="page" className="flex flex-col items-center text-[#F9F8F6] transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">History</span>
          </Link>
          <Link href="/trends" className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 14l4-4 4 3 6-7" /></svg>
            <span className="text-[10px] font-medium mt-1">Trends</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}