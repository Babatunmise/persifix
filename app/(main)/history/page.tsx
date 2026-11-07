"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

type Reading = {
  id: string;
  systolic: number;
  diastolic: number;
  taken_at: string;
  context: any; // Add context for the tags
};

export default function HistoryPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [readingsByDate, setReadingsByDate] = useState<Record<string, Reading[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch readings from Supabase on mount
  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        // Added 'context' to the select query
        const { data } = await supabase
          .from("readings")
          .select("id, systolic, diastolic, taken_at, context")
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: true });

        if (data) {
          const grouped = data.reduce((acc, reading) => {
            const dateStr = new Date(reading.taken_at).toISOString().split("T")[0];
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(reading);
            return acc;
          }, {} as Record<string, Reading[]>);
          
          setReadingsByDate(grouped);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadings();
  }, []);

  // Calendar Math
  const { daysInMonth, startingDay } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return {
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      startingDay: new Date(year, month, 1).getDay(),
    };
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Helper to format the selected date nicely
  const formattedSelectedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString("en-GB", { weekday: 'long', day: "numeric", month: "long" })
    : null;

  return (
    <div className="max-w-md mx-auto py-12 px-6 text-[#F9F8F6] min-h-screen pb-24">
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your History</h1>
        <Link href="/" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
          Back to Home
        </Link>
      </div>

      {/* Calendar Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 mb-8">
        
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-2 text-neutral-400 hover:text-white">&lt;</button>
          <h2 className="text-xl font-semibold">{monthName}</h2>
          <button onClick={nextMonth} className="p-2 text-neutral-400 hover:text-white">&gt;</button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-neutral-500">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {Array.from({ length: startingDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayReadings = readingsByDate[dateStr];
            const isSelected = selectedDate === dateStr;

            let dotColor = "";
            if (dayReadings && dayReadings.length > 0) {
              const highestSys = Math.max(...dayReadings.map(r => r.systolic));
              const highestDia = Math.max(...dayReadings.map(r => r.diastolic));
              if (highestSys >= 140 || highestDia >= 90) dotColor = "bg-red-500";
              else if (highestSys >= 130 || highestDia >= 80) dotColor = "bg-amber-500";
              else dotColor = "bg-emerald-500";
            }

            return (
              <button 
                key={day} 
                onClick={() => setSelectedDate(dateStr)}
                className={`h-10 rounded-full flex flex-col items-center justify-center relative transition-colors
                  ${isSelected ? "bg-[#F9F8F6] text-black font-bold" : "text-neutral-300 hover:bg-neutral-800"}
                `}
              >
                <span>{day}</span>
                {dotColor && !isSelected && (
                  <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Micro View (Day Details) */}
      <div className="mt-8">
        {selectedDate ? (
          <div>
            <h3 className="text-lg font-semibold text-neutral-400 mb-4">
              {formattedSelectedDate}
            </h3>
            
            <div className="space-y-3">
              {readingsByDate[selectedDate]?.map((reading) => {
                // Parse context tags
                const tags = [];
                if (reading.context?.medication === "missed") tags.push("Missed Meds");
                
                return (
                  <div key={reading.id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-semibold">{reading.systolic}/{reading.diastolic}</p>
                      {tags.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-1 rounded-md uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {new Date(reading.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center p-6 border border-dashed border-neutral-800 rounded-2xl">
            <p className="text-neutral-500 text-sm">
              {isLoading ? "Loading your history..." : "Tap a day on the calendar to view your readings."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}