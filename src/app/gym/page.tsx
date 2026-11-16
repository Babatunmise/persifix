"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

// Hardcoded safe routine per Argus's instructions
const TODAYS_ROUTINE = {
  title: "Gentle Morning Stride",
  duration: 15,
  calories: 150,
  description: "Low vascular strain, natural light"
};

export default function GymPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Active Plan vs Diet-Only Focus
  const [focusMode, setFocusMode] = useState<"active" | "diet">("active");
  
  // Data states
  const [completedToday, setCompletedToday] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState(0);

  useEffect(() => {
    async function loadData() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Check if completed today
      const { data: todayLogs } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", userData.user.id)
        .gte("created_at", today.toISOString());

      if (todayLogs && todayLogs.length > 0) {
        setCompletedToday(true);
      }

      // 2. Fetch this week's logs for progress (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      const { data: weekLogs } = await supabase
        .from("workout_logs")
        .select("created_at")
        .eq("user_id", userData.user.id)
        .gte("created_at", lastWeek.toISOString());

      if (weekLogs) {
        // Count unique days
        const uniqueDays = new Set(
          weekLogs.map(log => new Date(log.created_at).toDateString())
        );
        setWeeklyProgress(uniqueDays.size);
      }

      setLoading(false);
    }
    loadData();
  }, [router]);

  async function markComplete() {
    if (completedToday || saving) return;
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return router.push("/");

    const { error } = await supabase.from("workout_logs").insert({
      user_id: userData.user.id,
      activity_type: TODAYS_ROUTINE.title,
      duration_mins: TODAYS_ROUTINE.duration,
      calories_burned: TODAYS_ROUTINE.calories,
    });

    if (!error) {
      setCompletedToday(true);
      setWeeklyProgress(prev => Math.min(prev + 1, 7));
    } else {
      alert("Failed to save workout. Try again.");
    }
    setSaving(false);
  }

  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      {/* Header */}
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-serif text-2xl tracking-tight text-sanctos-navy">The Movement Room</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sanctos-green opacity-70"></span>
          </div>
          <p className="text-xs font-medium text-sanctos-navy/60">
            Movement keeps your vessels flexible.
          </p>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        {/* The Toggle */}
        <div className="bg-sanctos-sand/50 p-1.5 rounded-full flex relative">
          <button
            onClick={() => setFocusMode("active")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              focusMode === "active" 
                ? "bg-white text-sanctos-navy shadow-sm" 
                : "text-sanctos-navy/50 hover:text-sanctos-navy"
            }`}
          >
            Active Plan
          </button>
          <button
            onClick={() => setFocusMode("diet")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
              focusMode === "diet" 
                ? "bg-white text-sanctos-navy shadow-sm" 
                : "text-sanctos-navy/50 hover:text-sanctos-navy"
            }`}
          >
            Diet-Only Focus
          </button>
        </div>

        {focusMode === "active" ? (
          <>
            {/* Today's Routine Card */}
            <section className="bg-sanctos-navy text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">Today's Routine</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">{TODAYS_ROUTINE.duration} mins</span>
              </div>
              
              <h2 className="font-serif text-[26px] leading-snug mb-2">
                {TODAYS_ROUTINE.title}
              </h2>
              <p className="text-sm text-white/70 mb-6">
                {TODAYS_ROUTINE.description}
              </p>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-6">
                <div className="w-8 h-8 rounded-lg bg-sanctos-green flex items-center justify-center shrink-0 text-white">
                  <span className="material-symbols-outlined text-[18px]">directions_walk</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">Brisk Walk</h3>
                  <p className="text-[11px] text-white/50">Zone 2 Cardio (safe for BP)</p>
                </div>
              </div>

              <button 
                onClick={markComplete}
                disabled={completedToday || saving}
                className={`w-full h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
                  completedToday 
                    ? "bg-white/20 text-white/50 cursor-not-allowed" 
                    : "bg-sanctos-green text-white active:scale-95 shadow-sm"
                }`}
              >
                {saving ? "Saving..." : completedToday ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    Completed Today
                  </>
                ) : (
                  <>
                    Mark as Complete
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </>
                )}
              </button>
            </section>

            {/* The Connection Box */}
            <div className="bg-sanctos-green/10 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-sanctos-green text-[20px]">restaurant</span>
              <p className="text-xs font-medium text-sanctos-navy/80 leading-relaxed">
                Completing this routine unlocks <strong className="text-sanctos-green">+{TODAYS_ROUTINE.calories} calories</strong> for your Kitchen today.
              </p>
            </div>
          </>
        ) : (
          /* Diet-Only Mode Placeholder */
          <section className="bg-white rounded-3xl p-8 shadow-sm text-center space-y-3 mt-4">
            <span className="material-symbols-outlined text-4xl text-sanctos-sand">self_improvement</span>
            <h2 className="font-serif text-xl text-sanctos-navy">Resting Today</h2>
            <p className="text-sm text-sanctos-navy/60">
              You've chosen a diet-only focus. Movement is always optional, but we won't push a routine today. Rely on your Kitchen plan.
            </p>
          </section>
        )}

        {/* Weekly Progress */}
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-sanctos-navy">Weekly Rhythm</h3>
            <span className="text-xs font-semibold text-sanctos-green">{weeklyProgress} / 7 days</span>
          </div>
          <div className="flex justify-between gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < weeklyProgress 
                    ? "bg-sanctos-green text-white" 
                    : "bg-sanctos-sand/50 text-sanctos-navy/40"
                }`}>
                  {i < weeklyProgress ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    day
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}