"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Reading = {
  id: string;
  systolic: number;
  diastolic: number;
  recorded_at: string;
  context_notes: string;
};

export default function HistoryPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadings = async () => {
      const supabase = createClient();
      const deviceId = localStorage.getItem("sanctos_device_id");
      
      if (!deviceId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("readings")
        .select("*")
        .eq("user_id", deviceId)
        .order("recorded_at", { ascending: false });

      if (data) setReadings(data);
      setLoading(false);
    };

    fetchReadings();
  }, []);

  const groupedReadings = useMemo(() => {
    const groups: Record<string, Record<string, Reading[]>> = {};
    
    readings.forEach((r) => {
      const d = new Date(r.recorded_at);
      const dayStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      
      const hour = d.getHours();
      let timeOfDay = "Night";
      if (hour >= 5 && hour < 12) timeOfDay = "Morning";
      else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";

      if (!groups[dayStr]) groups[dayStr] = { Morning: [], Afternoon: [], Night: [] };
      groups[dayStr][timeOfDay].push(r);
    });

    return groups;
  }, [readings]);

  return (
    <div className="max-w-md mx-auto py-12 px-6 text-[#F9F8F6] min-h-screen bg-[#121212]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your History</h1>
        <Link href="/" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
          Back to Home
        </Link>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : readings.length === 0 ? (
        <p className="text-neutral-500">No readings logged yet.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedReadings).map(([day, times]) => (
            <div key={day}>
              <h2 className="text-lg font-semibold text-neutral-400 border-b border-neutral-800 pb-2 mb-4">{day}</h2>
              
              <div className="space-y-6">
                {Object.entries(times).map(([timeOfDay, timeReadings]) => {
                  if (timeReadings.length === 0) return null;
                  
                  return (
                    <div key={timeOfDay}>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#2E5B44] mb-3">{timeOfDay}</h3>
                      <div className="space-y-3">
                        {timeReadings.map((r) => {
                          let chips = [];
                          try {
                            const ctx = JSON.parse(r.context_notes);
                            if (ctx.caffeine === "yes") chips.push("Coffee/Exercise");
                            if (ctx.meal === "yes") chips.push("Heavy Meal");
                            if (ctx.meds === "no") chips.push("Missed Meds");
                            if (ctx.stress === "yes") chips.push("Stressed");
                            if (ctx.didBreathing) chips.push("Breathing Done");
                          } catch (e) {}

                          return (
                            <div key={r.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-2xl font-semibold">{r.systolic}/{r.diastolic}</p>
                                <p className="text-xs text-neutral-500">
                                  {new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              {chips.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {chips.map(c => (
                                    <span key={c} className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-1 rounded-md">{c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}