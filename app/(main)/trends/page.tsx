"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

type Reading = { systolic: number; diastolic: number };

export default function TrendsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [recentAvg, setRecentAvg] = useState<{ sys: number; dia: number } | null>(null);
  const [monthlyAvg, setMonthlyAvg] = useState<{ sys: number; dia: number } | null>(null);
  const [readingCount, setReadingCount] = useState(0);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        // Fetch the last 30 readings
        const { data } = await supabase
          .from("readings")
          .select("systolic, diastolic")
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: false })
          .limit(30);

        if (data && data.length > 0) {
          setReadingCount(data.length);

          // Calculate 7-day (last 7 readings) average
          const recent = data.slice(0, 7);
          const recentSys = Math.round(recent.reduce((acc, r) => acc + r.systolic, 0) / recent.length);
          const recentDia = Math.round(recent.reduce((acc, r) => acc + r.diastolic, 0) / recent.length);
          setRecentAvg({ sys: recentSys, dia: recentDia });

          // Calculate 30-day (all 30 readings) average
          const monthlySys = Math.round(data.reduce((acc, r) => acc + r.systolic, 0) / data.length);
          const monthlyDia = Math.round(data.reduce((acc, r) => acc + r.diastolic, 0) / data.length);
          setMonthlyAvg({ sys: monthlySys, dia: monthlyDia });
        }
      } catch (err) {
        console.error("Failed to load trends:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, []);

  return (
    <div className="max-w-md mx-auto py-12 px-6 text-[#F9F8F6] min-h-screen">
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your Trends</h1>
        <Link href="/" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
          Back to Home
        </Link>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading your trends...</p>
      ) : readingCount === 0 ? (
        <div className="text-center p-8 border border-neutral-800 rounded-3xl bg-neutral-900/50">
          <h2 className="text-xl font-semibold mb-2">Not enough data yet.</h2>
          <p className="text-sm text-neutral-400 mb-6">
            We need at least 2 readings to show your trends. Keep logging to see the bigger picture.
          </p>
          <Link 
            href="/interpret"
            className="inline-block rounded-full bg-[#2E5B44] px-6 py-3 text-sm font-semibold text-white"
          >
            Log a reading
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recent Average (7-day) */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
            <p className="text-sm font-medium text-neutral-400 mb-1">Recent Average</p>
            <p className="text-xs text-neutral-500 mb-4">Based on your last 7 readings</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold">{recentAvg?.sys}/{recentAvg?.dia}</p>
              <span className="text-sm text-neutral-500">mmHg</span>
            </div>
          </div>

          {/* Monthly Average (30-day) */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
            <p className="text-sm font-medium text-neutral-400 mb-1">Monthly Average</p>
            <p className="text-xs text-neutral-500 mb-4">Based on your last {readingCount} readings</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold">{monthlyAvg?.sys}/{monthlyAvg?.dia}</p>
              <span className="text-sm text-neutral-500">mmHg</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}