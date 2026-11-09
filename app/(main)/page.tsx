"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening">("morning");
  const [greeting, setGreeting] = useState("Hello");
  const [userName, setUserName] = useState("");
  const [lastReading, setLastReading] = useState<{ sys: number; dia: number; takenAt: string } | null>(null);
  const [readingCount, setReadingCount] = useState(0);

  // 1. Handle Dynamic Time & Greeting
  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setTimeOfDay("morning");
      setGreeting("Good morning");
    } else if (hour >= 12 && hour < 17) {
      setTimeOfDay("afternoon");
      setGreeting("Good afternoon");
    } else {
      setTimeOfDay("evening");
      setGreeting("Good evening");
    }

    const storedName = localStorage.getItem("sanctos_name");
    if (storedName) setUserName(storedName);
  }, []);

  // 2. Sync Offline Readings & Fetch Latest Data
  useEffect(() => {
    if (!mounted) return;

    const syncAndFetch = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        // --- SYNC OFFLINE READINGS ---
        const pendingStr = localStorage.getItem("sanctos_pending_readings");
        if (pendingStr) {
          const pending = JSON.parse(pendingStr);
          if (Array.isArray(pending) && pending.length > 0) {
            const successfulSync = [];
            
            for (const reading of pending) {
              try {
                const res = await fetch("/api/readings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
                  body: JSON.stringify({
                    systolic: reading.systolic,
                    diastolic: reading.diastolic,
                    medication: reading.medication,
                    fullContext: reading.fullContext,
                    taken_at: reading.taken_at
                  })
                });
                if (res.ok) successfulSync.push(reading);
              } catch (e) {
                console.error("Failed to sync a reading:", e);
              }
            }

            // Clear synced readings from local storage
            if (successfulSync.length > 0) {
              const remaining = pending.filter((r: any) => !successfulSync.includes(r));
              localStorage.setItem("sanctos_pending_readings", JSON.stringify(remaining));
            }
          }
        }

        // --- FETCH LATEST DATA ---
        const supabase = createClient();
        const { data, count } = await supabase
          .from("readings")
          .select("systolic, diastolic, taken_at", { count: "exact" })
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setLastReading({ 
            sys: data[0].systolic, 
            dia: data[0].diastolic, 
            takenAt: data[0].taken_at 
          });
        }
        setReadingCount(count || 0);
      } catch (err) {
        console.error("Home Hub fetch error:", err);
      }
    };

    syncAndFetch();

    // Refresh data when returning to the tab
    window.addEventListener("focus", syncAndFetch);
    return () => window.removeEventListener("focus", syncAndFetch);
  }, [mounted]);

  const bgClass = 
    timeOfDay === "morning" ? "bg-[#111a16]" : 
    timeOfDay === "afternoon" ? "bg-[#121212]" : 
    "bg-[#0d0d12]";

  // Guided Baseline Logic
  const isBaselineForming = readingCount < 3;
  const readingsNeeded = 3 - readingCount;
  
  const lastReadingDate = lastReading?.takenAt ? new Date(lastReading.takenAt).toDateString() : null;
  const todayDate = new Date().toDateString();
  const hasLoggedToday = lastReadingDate === todayDate;

  let focusTitle = "Today's Focus";
  let focusText = "";

  if (isBaselineForming) {
    focusTitle = "Guided Baseline";
    
    if (hasLoggedToday) {
      focusText = readingsNeeded === 1
        ? "Great check-in. We need just 1 more reading to establish your baseline. We'll prompt you again tomorrow morning."
        : `Great check-in. We need ${readingsNeeded} more readings. We'll prompt you again tomorrow.`;
    } else {
      focusText = readingsNeeded === 1 
        ? "We're learning your usual range. Log 1 more reading today to unlock your personalized insights."
        : `We're learning your usual range. Log ${readingsNeeded} more readings to unlock your personalized insights.`;
    }
  } else {
    if (lastReading) {
      if (lastReading.sys >= 140 || lastReading.dia >= 90) {
        focusText = "Let's focus on consistency today. Have you checked your medication schedule?";
      } else if (lastReading.sys >= 130 || lastReading.dia >= 80) {
        focusText = "Keep an eye on things today. Try to keep your water intake high and take a 10-minute walk.";
      } else {
        focusText = "Maintenance mode. Keep up the great habits—your numbers are looking healthy.";
      }
    }
  }

  if (!mounted) return <div className="min-h-screen bg-[#121212]" />;

  return (
    <div className={`min-h-screen ${bgClass} text-[#F9F8F6] pb-24 font-sans transition-colors duration-1000`}>
      
      <main className="max-w-md mx-auto px-6 pt-12 space-y-8">
        
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting}{userName ? `, ${userName}` : ""}.
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            It&apos;s hot in Lagos today. Drink water before checking your BP—dehydration can thicken the blood.
          </p>
        </div>

        <Link 
          href="/interpret"
          className="block w-full rounded-full bg-[#2E5B44] px-6 py-5 text-center text-lg font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Tell me your blood pressure today and we’ll understand it together.
        </Link>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2E5B44] mb-2">
            {focusTitle}
          </p>
          <p className="text-sm leading-relaxed text-neutral-300 mb-4">
            {focusText}
          </p>
          
          {/* Visual Progress Tracker for Baseline */}
          {isBaselineForming && (
            <div className="flex gap-2">
              {[1, 2, 3].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 flex-1 rounded-full ${step <= readingCount ? "bg-[#2E5B44]" : "bg-neutral-800"}`}
                ></div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <p className="text-sm font-medium text-neutral-500 mb-1">Last Check-in</p>
            <p className="text-2xl font-semibold">
              {lastReading ? `${lastReading.sys}/${lastReading.dia}` : "--/--"}
            </p>
          </div>
          
          <Link 
            href="/trends" 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between transition-colors hover:bg-neutral-800"
          >
            <p className="text-sm font-medium text-neutral-500 mb-1">Your Trends</p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">View</span>
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        </div>

      </main>

      <nav className="fixed bottom-0 w-full bg-[#121212] border-t border-neutral-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16">
          <Link href="/" className="flex flex-col items-center text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center text-neutral-500 hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">History</span>
          </Link>
          <Link href="/sanctos" className="flex flex-col items-center text-neutral-500 hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">Sanctos</span>
          </Link>
          <Link href="/trends" className="flex flex-col items-center text-neutral-500 hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 14l4-4 4 3 6-7" /></svg>
            <span className="text-[10px] font-medium mt-1">Trends</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center text-neutral-500 hover:text-[#F9F8F6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium mt-1">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}