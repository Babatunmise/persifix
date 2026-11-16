"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

type TimelineEvent = {
  id: string;
  type: "bp" | "weight" | "workout";
  date: string;
  title: string;
  value: string;
  subtitle?: string;
  status?: string;
  statusColor?: string;
};

function classifyBP(sys: number, dia: number) {
  if (sys < 90 || dia < 60) return { label: "Low", color: "text-blue-600" };
  if (sys < 120 && dia < 80) return { label: "Normal", color: "text-sanctos-green" };
  if (sys < 130 && dia < 80) return { label: "Elevated", color: "text-yellow-600" };
  if (sys < 140 || dia < 90) return { label: "High (Stage 1)", color: "text-orange-600" };
  return { label: "High (Stage 2)", color: "text-red-600" };
}

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    async function loadHistory() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      // 1. Fetch BP Readings
      const { data: bpData } = await supabase
        .from("bp_readings")
        .select("id, systolic, diastolic, measured_at")
        .eq("user_id", userData.user.id);

      // 2. Fetch Weight Logs
      const { data: weightData } = await supabase
        .from("weight_logs")
        .select("id, weight, weight_unit, logged_at")
        .eq("user_id", userData.user.id);

      // 3. Fetch Workouts
      const { data: workoutData } = await supabase
        .from("workout_logs")
        .select("id, activity_type, duration_mins, created_at")
        .eq("user_id", userData.user.id);

      const events: TimelineEvent[] = [];

      if (bpData) {
        bpData.forEach((bp) => {
          const c = classifyBP(bp.systolic, bp.diastolic);
          events.push({
            id: bp.id,
            type: "bp",
            date: bp.measured_at,
            title: "Blood Pressure",
            value: `${bp.systolic}/${bp.diastolic} mmHg`,
            status: c.label,
            statusColor: c.color,
          });
        });
      }

      if (weightData) {
        weightData.forEach((w) => {
          events.push({
            id: w.id,
            type: "weight",
            date: w.logged_at,
            title: "Weight Log",
            value: `${w.weight} ${w.weight_unit}`,
          });
        });
      }

      if (workoutData) {
        workoutData.forEach((w) => {
          events.push({
            id: w.id,
            type: "workout",
            date: w.created_at,
            title: w.activity_type,
            value: `${w.duration_mins} mins`,
          });
        });
      }

      // Sort newest to oldest
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(events);
      setLoading(false);
    }
    loadHistory();
  }, [router]);

  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40 flex items-center gap-3">
        <button onClick={() => router.push("/home")} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sanctos-navy">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-2xl tracking-tight text-sanctos-navy">Your Timeline</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sanctos-green opacity-70"></span>
          </div>
        </div>
      </header>

      <div className="px-6 pt-2">
        {timeline.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center mt-4">
            <span className="material-symbols-outlined text-4xl text-sanctos-sand mb-2">history</span>
            <p className="text-sm text-sanctos-navy/60">No history yet. Start logging your health today!</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-sanctos-sand/60 ml-3 space-y-6 pb-6">
            {timeline.map((event) => (
              <div key={event.id} className="relative pl-6">
                {/* Timeline Dot */}
                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                  event.type === "bp" ? "bg-sanctos-navy" : 
                  event.type === "weight" ? "bg-sanctos-sand" : "bg-sanctos-green"
                }`} />

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/40">
                        {new Date(event.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <h3 className="font-serif text-lg text-sanctos-navy">{event.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sanctos-navy">{event.value}</p>
                      {event.status && (
                        <p className={`text-[11px] font-bold ${event.statusColor}`}>
                          {event.status}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}