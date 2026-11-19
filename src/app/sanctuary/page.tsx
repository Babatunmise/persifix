"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

export default function SanctuaryPage() {
  const router = useRouter();
  
  // Breather State
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Exhale">("Inhale");
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Journal State
  const [showJournal, setShowJournal] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // 4s Inhale / 6s Exhale logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (isBreathing) {
      interval = setInterval(() => setSessionSeconds(s => s + 1), 1000);
      
      const cycle = () => {
        timeout = setTimeout(() => {
          setBreathPhase("Exhale");
          timeout = setTimeout(() => {
            cycle();
          }, 6000); // 6s Exhale
        }, 4000); // 4s Inhale
      };
      cycle();
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isBreathing]);

  async function stopBreathing() {
    setBreathPhase("Inhale");
    setIsBreathing(false);
    if (sessionSeconds < 10) return; // Don't log tiny sessions

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const mins = Math.max(Math.round(sessionSeconds / 60), 1);
    await supabase.from("sanctuary_logs").insert({
      user_id: userData.user.id,
      activity_type: "breather",
      duration_mins: mins,
    });
    setSessionSeconds(0);
  }

  async function submitJournal() {
    if (!journalText.trim()) return;
    setLoadingAI(true);
    setAiResponse(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAiResponse("Please sign in again to use the journal companion.");
        return;
      }
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ entrySubmitted: true }),
      });
      const data = await res.json();
      
      if (res.ok && data.narrative) {
        setAiResponse(data.narrative);
        
        // Log the journal entry
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from("sanctuary_logs").insert({
            user_id: userData.user.id,
            activity_type: "journal",
            duration_mins: null,
          });
        }
      }
    } catch (err) {
      alert("The companion is resting. Try again later.");
    } finally {
      setLoadingAI(false);
    }
  }

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-serif text-2xl tracking-tight text-sanctos-navy">The Sanctuary</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sanctos-sand opacity-70"></span>
          </div>
          <p className="text-xs font-medium text-sanctos-navy/60">
            A quiet space to reset your nervous system.
          </p>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        {/* The Breather */}
        <section className="bg-sanctos-sand rounded-[2rem] p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          <div className="w-full flex justify-between items-center mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/50">The Breather</span>
            {isBreathing && <span className="text-xs font-semibold text-sanctos-green">{sessionSeconds}s</span>}
          </div>

          {/* Expanding Circle */}
          <div className="relative w-48 h-48 flex items-center justify-center mb-8">
            <div 
              className={`absolute inset-0 rounded-full bg-sanctos-green/20 transition-all ease-in-out ${
                isBreathing && breathPhase === "Inhale" ? "scale-100 duration-[4000ms]" : "scale-50 duration-[6000ms]"
              }`}
            />
            <div 
              className={`absolute inset-4 rounded-full bg-sanctos-green/40 transition-all ease-in-out ${
                isBreathing && breathPhase === "Inhale" ? "scale-100 duration-[4000ms]" : "scale-50 duration-[6000ms]"
              }`}
            />
            <div className="z-10 text-center">
              <p className="font-serif text-2xl text-sanctos-navy">
                {isBreathing ? breathPhase : "Ready?"}
              </p>
            </div>
          </div>

          <button 
            onClick={isBreathing ? stopBreathing : () => {
              setSessionSeconds(0);
              setBreathPhase("Inhale");
              setIsBreathing(true);
            }}
            className="w-full h-14 rounded-full bg-sanctos-navy text-white font-semibold active:scale-95 transition-all"
          >
            {isBreathing ? "Finish Session" : "Start 4s Inhale / 6s Exhale"}
          </button>
        </section>

        {/* Middle Cards */}
        <section className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowJournal(true)}
            className="bg-white rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square shadow-sm hover:shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-[28px] text-sanctos-navy mb-2">edit_note</span>
            <span className="font-serif text-lg text-sanctos-navy">The Journal</span>
          </button>

          <button className="bg-white rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square shadow-sm opacity-60">
            <span className="material-symbols-outlined text-[28px] text-sanctos-navy mb-2">bedtime</span>
            <span className="font-serif text-lg text-sanctos-navy">Sleep Hub</span>
          </button>
        </section>

        {/* Companion Check-in */}
        <section className="bg-sanctos-green/10 rounded-3xl p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-sanctos-green mt-1">graphic_eq</span>
          <div>
            <p className="text-sm font-medium text-sanctos-navy leading-relaxed">
              I noticed your BP was a bit higher today. Let&apos;s take 2 minutes to breathe together right now.
            </p>
          </div>
        </section>
      </div>

      {/* Journal Modal */}
      {showJournal && (
        <div className="fixed inset-0 z-50 bg-sanctos-navy/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 pb-24">
          <div className="bg-alive-bg w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 fade-in max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-serif text-2xl text-sanctos-navy">The Journal</h3>
              <button 
                onClick={() => { setShowJournal(false); setAiResponse(null); setJournalText(""); }} 
                className="text-sanctos-navy/50 hover:text-sanctos-navy"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!aiResponse ? (
              <div className="space-y-4">
                <p className="text-sm text-sanctos-navy/70">
                  How is your heart feeling today? Let it out. No judgment here.
                </p>
                <textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="I felt a bit anxious after lunch..."
                  rows={5}
                  className="w-full bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-medium resize-none"
                />
                <button 
                  onClick={submitJournal}
                  disabled={!journalText.trim() || loadingAI}
                  className="w-full bg-sanctos-navy text-white rounded-full py-4 font-semibold disabled:opacity-50"
                >
                  {loadingAI ? "Reflecting..." : "Share with Companion"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-sanctos-sand rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-sanctos-green fill">auto_awesome</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-sanctos-navy/60">Companion Response</span>
                  </div>
                  <p className="font-serif text-[19px] leading-relaxed text-sanctos-navy italic">
                    "{aiResponse}"
                  </p>
                </div>
                
                <button 
                  onClick={() => { setShowJournal(false); setAiResponse(null); setJournalText(""); }}
                  className="w-full bg-sanctos-green text-white rounded-full py-4 font-semibold"
                >
                  I feel better
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}