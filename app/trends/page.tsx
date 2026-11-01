"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Reading = {
  id: number;
  systolic: number;
  diastolic: number;
  recorded_at: string;
};

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function isWithinDays(recordedAt: string, days: number) {
  const timestamp = new Date(recordedAt).getTime();
  const now = Date.now();
  return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - days * 24 * 60 * 60 * 1000;
}

function AverageBar({
  label,
  value,
  color,
  unit,
}: {
  label: string;
  value: number | null;
  color: string;
  unit: string;
}) {
  const width = value === null ? 0 : Math.min(100, (value / 200) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="font-semibold text-[#F9F8F6]">
          {value === null ? "—" : `${value} ${unit}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TrendsNavigation() {
  const items = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/history", label: "History", icon: "history" },
    { href: "/trends", label: "Trends", icon: "trends" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ] as const;

  return (
    <nav className="fixed bottom-0 w-full border-t border-neutral-800 bg-[#121212] pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {items.map((item) => {
          const isActive = item.href === "/trends";
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center transition-colors ${
                isActive
                  ? "text-[#F9F8F6]"
                  : "text-neutral-500 hover:text-[#F9F8F6]"
              }`}
            >
              {item.icon === "home" && (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              )}
              {item.icon === "history" && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {item.icon === "trends" && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 14l4-4 4 3 6-7" />
                </svg>
              )}
              {item.icon === "settings" && (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-2.37 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span className="mt-1 text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function TrendsPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadReadings = async () => {
      const deviceId = localStorage.getItem("sanctos_device_id");
      if (!deviceId) {
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("readings")
          .select("id, systolic, diastolic, recorded_at")
          .eq("user_id", deviceId)
          .order("recorded_at", { ascending: false })
          .limit(30);

        if (queryError) throw queryError;
        if (isActive) {
          setReadings(data ?? []);
          setError("");
        }
      } catch {
        if (isActive) setError("We couldn't load your trends. Please try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadReadings();
    return () => {
      isActive = false;
    };
  }, []);

  const lastSevenDays = readings.filter((reading) =>
    isWithinDays(reading.recorded_at, 7),
  );
  const lastThirtyDays = readings.filter((reading) =>
    isWithinDays(reading.recorded_at, 30),
  );
  const averageSystolic = average(
    lastThirtyDays.map((reading) => reading.systolic),
  );
  const averageDiastolic = average(
    lastThirtyDays.map((reading) => reading.diastolic),
  );
  const sevenDaySystolic = average(
    lastSevenDays.map((reading) => reading.systolic),
  );
  const sevenDayDiastolic = average(
    lastSevenDays.map((reading) => reading.diastolic),
  );
  const thirtyDaySystolic = averageSystolic;
  const thirtyDayDiastolic = averageDiastolic;
  const hasEnoughData = lastThirtyDays.length >= 2;

  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Your health over time
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Your Trends
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Home
          </Link>
        </header>

        {error ? (
          <div className="rounded-3xl border border-red-900/70 bg-red-950/30 p-6 text-red-300" role="alert">
            {error}
          </div>
        ) : isLoading ? (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-6 py-12 text-center text-neutral-400">
            Loading your readings…
          </div>
        ) : !hasEnoughData ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900/70 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E5B44]/15 text-[#6D9A7F]">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 14l4-4 4 3 6-7" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-semibold">Your trends are taking shape</h2>
            <p className="mt-2 max-w-sm leading-6 text-neutral-400">
              We need at least 2 readings to show your trends. Keep logging to
              see the bigger picture.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Last 30 days · {lastThirtyDays.length} readings
              </p>
              <h2 className="mt-2 text-xl font-semibold">Average blood pressure</h2>
              <div className="mt-8 space-y-6">
                <AverageBar
                  label="Systolic"
                  value={averageSystolic}
                  color="bg-[#6D9A7F]"
                  unit="mmHg"
                />
                <AverageBar
                  label="Diastolic"
                  value={averageDiastolic}
                  color="bg-sky-500"
                  unit="mmHg"
                />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-6">
                <div>
                  <p className="text-sm text-neutral-500">Average systolic</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {averageSystolic} <span className="text-sm font-normal text-neutral-500">mmHg</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Average diastolic</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {averageDiastolic} <span className="text-sm font-normal text-neutral-500">mmHg</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Recent Averages
              </p>
              <h2 className="mt-2 text-xl font-semibold">7 days vs. 30 days</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Last 7 days",
                    count: lastSevenDays.length,
                    systolic: sevenDaySystolic,
                    diastolic: sevenDayDiastolic,
                  },
                  {
                    label: "Last 30 days",
                    count: lastThirtyDays.length,
                    systolic: thirtyDaySystolic,
                    diastolic: thirtyDayDiastolic,
                  },
                ].map((period) => (
                  <div
                    key={period.label}
                    className="rounded-2xl border border-neutral-800 bg-[#121212]/70 p-5"
                  >
                    <p className="font-medium">{period.label}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {period.count} {period.count === 1 ? "reading" : "readings"}
                    </p>
                    <p className="mt-4 text-2xl font-semibold">
                      {period.systolic ?? "—"}/{period.diastolic ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">mmHg average</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <TrendsNavigation />
    </div>
  );
}
