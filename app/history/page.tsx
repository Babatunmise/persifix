"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Reading = {
  id: number;
  systolic: number;
  diastolic: number;
  recorded_at: string;
  context_notes: string | null;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const INITIAL_MONTH = 10;
const INITIAL_YEAR = 2026;

function getDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getIndicatorColor(readings: Reading[]) {
  const highestSystolic = Math.max(
    ...readings.map((reading) => reading.systolic),
  );

  if (highestSystolic >= 140) return "bg-red-500";
  if (highestSystolic >= 130) return "bg-orange-400";
  return "bg-emerald-500";
}

function getContextTags(contextNotes: string | null) {
  if (!contextNotes) return [];

  let context: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(contextNotes);
    if (typeof parsed !== "object" || parsed === null) return [];
    context = parsed as Record<string, unknown>;
  } catch {
    return [];
  }

  const tags: string[] = [];
  if (context.caffeine === "yes") tags.push("Recent Caffeine");
  if (context.meal === "yes") tags.push("Recent Heavy Meal");
  if (context.meds === "no") tags.push("Missed Meds");
  if (context.meds === "yes") tags.push("Medication Taken");
  if (context.stress === "yes") tags.push("Stress / Poor Sleep");
  return tags;
}

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(INITIAL_MONTH);
  const [currentYear, setCurrentYear] = useState(INITIAL_YEAR);
  const [selectedDate, setSelectedDate] = useState("2026-11-01");
  const [readingsByDate, setReadingsByDate] = useState<
    Record<string, Reading[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadReadings = async () => {
      const deviceId = localStorage.getItem("sanctos_device_id");
      if (!deviceId) {
        if (isActive) {
          setReadingsByDate({});
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("readings")
          .select("id, systolic, diastolic, recorded_at, context_notes")
          .eq("user_id", deviceId)
          .order("recorded_at", { ascending: false });

        if (queryError) throw queryError;

        const groupedReadings: Record<string, Reading[]> = {};
        for (const reading of data ?? []) {
          const dateKey = reading.recorded_at.slice(0, 10);
          groupedReadings[dateKey] ??= [];
          groupedReadings[dateKey].push({
            id: reading.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            recorded_at: reading.recorded_at,
            context_notes: reading.context_notes,
          });
        }

        if (isActive) {
          setReadingsByDate(groupedReadings);
          setError("");
        }
      } catch {
        if (isActive) {
          setError("We couldn't load your readings. Please try again.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadReadings();
    return () => {
      isActive = false;
    };
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startingWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: startingWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const selectedReadings = selectedDate ? readingsByDate[selectedDate] ?? [] : [];

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(currentYear, currentMonth + offset, 1);
    setCurrentMonth(nextMonth.getMonth());
    setCurrentYear(nextMonth.getFullYear());
    setSelectedDate("");
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      <main className="min-h-screen px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your History
          </h1>
          <Link
            href="/"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Home
          </Link>
        </header>

        <section
          aria-label={`${monthLabel} calendar`}
          className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="mb-7 flex items-end justify-between gap-4">
            <div className="flex items-end gap-3 sm:gap-5">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
                className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-lg text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
              >
                &lt;
              </button>
              <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Blood pressure log
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {monthLabel}
              </h2>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
                className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 text-lg text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
              >
                &gt;
              </button>
            </div>
            <span className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400">
              Monthly view
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((weekday, index) => (
              <div
                key={`${weekday}-${index}`}
                className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500"
                aria-label={
                  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index]
                }
              >
                {weekday}
              </div>
            ))}

            {calendarCells.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} aria-hidden="true" />;
              }

              const dateKey = getDateKey(currentYear, currentMonth, day);
              const dayReadings = readingsByDate[dateKey] ?? [];
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-label={`${formatSelectedDate(dateKey)}${dayReadings.length ? `, ${dayReadings.length} readings` : ", no readings"}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium transition-colors sm:text-base ${
                    isSelected
                      ? "border-[#F9F8F6] bg-[#F9F8F6] text-black"
                      : "border-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800"
                  }`}
                >
                  <span>{day}</span>
                  {dayReadings.length > 0 ? (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${getIndicatorColor(dayReadings)}`}
                    />
                  ) : (
                    <span aria-hidden="true" className="h-1.5 w-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-4 border-t border-neutral-800 pt-5">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Reading range
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              In range
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              Elevated
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              High
            </span>
          </div>
        </section>

        <section className="mt-8" aria-live="polite">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Selected day
              </p>
              <h2 className="text-xl font-semibold sm:text-2xl">
                {selectedDate
                  ? formatSelectedDate(selectedDate)
                  : "Select a day"}
              </h2>
            </div>
            {selectedReadings.length > 0 && (
              <span className="text-sm text-neutral-500">
                {selectedReadings.length}{" "}
                {selectedReadings.length === 1 ? "reading" : "readings"}
              </span>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-900/70 bg-red-950/30 px-6 py-6 text-center">
              <p role="alert" className="text-sm text-red-300">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-10 text-center">
              <p className="font-medium text-neutral-300">Loading readings…</p>
            </div>
          ) : selectedDate && selectedReadings.length > 0 ? (
            <div className="space-y-3">
              {selectedReadings.map((reading) => (
                <article
                  key={reading.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6"
                >
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {reading.systolic}
                      <span className="mx-1 text-neutral-600">/</span>
                      {reading.diastolic}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(reading.recorded_at).toLocaleTimeString(
                        undefined,
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {getContextTags(reading.context_notes).length > 0 ? (
                      getContextTags(reading.context_notes).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1.5 text-xs font-medium text-neutral-300"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500">
                        No context tags
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-10 text-center">
              <p className="font-medium text-neutral-300">No readings logged</p>
              <p className="mt-1 text-sm text-neutral-500">
                Readings for this day will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-10 text-center">
              <p className="font-medium text-neutral-300">Choose a date</p>
              <p className="mt-1 text-sm text-neutral-500">
                Select a day on the calendar to view its readings.
              </p>
            </div>
          )}
        </section>
      </div>
      </main>
      <nav className="fixed bottom-0 w-full border-t border-neutral-800 bg-[#121212] pb-safe">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around">
          <Link
            href="/"
            className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/history"
            aria-current="page"
            className="flex flex-col items-center text-[#F9F8F6] transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">History</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-2.37 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
