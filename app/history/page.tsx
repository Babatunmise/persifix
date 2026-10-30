"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Reading = {
  id: string;
  systolic: number;
  diastolic: number;
  recorded_at: string;
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

      const { data, error } = await supabase
        .from("readings")
        .select("*")
        .eq("user_id", deviceId)
        .order("recorded_at", { ascending: false });

      if (data) setReadings(data);
      setLoading(false);
    };

    fetchReadings();
  }, []);

  return (
    <div className="max-w-md mx-auto py-24 px-6 text-[#121212] min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your History</h1>
        <Link href="/" className="text-sm font-medium text-[#2E5B44] underline">
          Back to Log
        </Link>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : readings.length === 0 ? (
        <p className="text-neutral-500">No readings logged yet.</p>
      ) : (
        <div className="space-y-4">
          {readings.map((reading) => (
            <div key={reading.id} className="p-4 rounded-xl border border-neutral-200 bg-white flex justify-between items-center">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {reading.systolic}/{reading.diastolic}
                </p>
                <p className="text-sm text-neutral-500">
                  {new Date(reading.recorded_at).toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}