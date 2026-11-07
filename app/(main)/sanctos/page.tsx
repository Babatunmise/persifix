"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SessionType = 120 | 300 | 600; // 2 mins, 5 mins, 10 mins
type BreatherState = "setup" | "active" | "completed";

export default function SanctosPage() {
  const [state, setState] = useState<BreatherState>("setup");
  const [sessionDuration, setSessionDuration] = useState<SessionType>(300); // Default 5 mins
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pacerText, setPacerText] = useState<string>("Breathe In");

  const startSession = (duration: SessionType) => {
    setSessionDuration(duration);
    setTimeLeft(duration);
    setPacerText("Breathe In");
    setState("active");
  };

  const endSession = () => {
    setState("setup");
    setTimeLeft(0);
  };

  // The core breathing loop
  useEffect(() => {
    if (state !== "active") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setState("completed");
          return 0;
        }

        // Calculate pacing based on a strict 10-second cycle (4s inhale, 6s exhale)
        const elapsed = sessionDuration - prev;
        const cycleTime = elapsed % 10;

        if (cycleTime < 4) {
          setPacerText("Breathe In");
        } else {
          setPacerText("Breathe Out");
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, sessionDuration]);

  // --- RENDER SETUP ---
  if (state === "setup") {
    return (
      <div className="min-h-screen bg-[#121212] text-[#F9F8F6] flex flex-col justify-center p-6 max-w-md mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">The Sanctos Reset</h1>
        <p className="text-neutral-400 mb-8">Find a comfortable position. You can be sitting, standing, or lying down.</p>

        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl mb-8 space-y-4">
          <p className="text-sm font-semibold text-emerald-400">Before you begin:</p>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Take small, easy breaths, not deep ones. If you feel lightheaded, just breathe normally.
          </p>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Your mind may wander. That is normal. Just gently return to the circle.
          </p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => startSession(120)}
            className="w-full py-4 rounded-xl border border-neutral-700 hover:bg-neutral-800 font-semibold transition-colors"
          >
            2-Minute Starter
          </button>
          <button 
            onClick={() => startSession(300)}
            className="w-full py-4 rounded-xl bg-[#2E5B44] hover:bg-[#234535] font-semibold transition-colors text-white"
          >
            5-Minute Daily Reset
          </button>
          <button 
            onClick={() => startSession(600)}
            className="w-full py-4 rounded-xl border border-neutral-700 hover:bg-neutral-800 font-semibold transition-colors"
          >
            10-Minute Deep Calm
          </button>
        </div>

        <Link href="/" className="mt-12 text-center text-sm text-neutral-500 hover:text-white underline">
          Back to Home
        </Link>
      </div>
    );
  }

  // --- RENDER ACTIVE ---
  if (state === "active") {
    return (
      <div className="min-h-screen bg-[#121212] text-[#F9F8F6] flex flex-col items-center justify-center p-6 overflow-hidden relative">
        
        {/* The Breathing Sphere */}
        <div className="relative flex items-center justify-center w-64 h-64 mb-16">
          <div className="absolute w-40 h-40 rounded-full animate-breathe-sphere"></div>
          
          {/* The Text Overlay */}
          <span className="relative z-10 text-3xl font-light tracking-wide text-white/90">
            {pacerText}
          </span>
        </div>

        <div className="absolute bottom-12 text-center w-full px-6">
          <button 
            onClick={endSession}
            className="rounded-full border border-neutral-800 px-8 py-3 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Done for now.
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER COMPLETED ---
  return (
    <div className="min-h-screen bg-[#121212] text-[#F9F8F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-4xl font-semibold tracking-tight mb-4 text-emerald-400">You&apos;ve done enough for today.</h2>
        <p className="text-neutral-400 mb-12 leading-relaxed">
          Thank you for taking this time for yourself. Notice how your body feels. Carry this calm with you into the rest of your day.
        </p>
        
        <button 
          onClick={() => setState("setup")}
          className="w-full py-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 font-semibold transition-colors"
        >
          Return to Sanctos
        </button>
      </div>
    </div>
  );
}