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

function getContextSummary(contextNotes: string | null) {
  if (!contextNotes) return "—";

  try {
    const parsed: unknown = JSON.parse(contextNotes);
    if (typeof parsed !== "object" || parsed === null) return "—";

    const context = parsed as Record<string, unknown>;
    const tags: string[] = [];
    if (context.caffeine === "yes") tags.push("Recent Caffeine");
    if (context.meal === "yes") tags.push("Heavy Meal");
    if (context.meds === "no") tags.push("Missed Meds");
    if (context.meds === "yes") tags.push("Medication Taken");
    if (context.stress === "yes") tags.push("Poor Sleep / Stress");
    return tags.length ? tags.join(", ") : "No context noted";
  } catch {
    return "—";
  }
}

export default function ClinicalReportPage() {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadReport = async () => {
      setPatientName(localStorage.getItem("sanctos_name") || "");
      setPatientAge(localStorage.getItem("sanctos_age") || "");
      setReportDate(
        new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );

      const deviceId = localStorage.getItem("sanctos_device_id");
      if (!deviceId) {
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("readings")
          .select("id, systolic, diastolic, recorded_at, context_notes")
          .eq("user_id", deviceId)
          .order("recorded_at", { ascending: false })
          .limit(10);

        if (queryError) throw queryError;
        if (isActive) {
          setReadings(data ?? []);
          setError("");
        }
      } catch {
        if (isActive) {
          setError("We couldn't load your readings for this report.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadReport();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="min-h-screen max-w-full bg-white px-5 py-8 text-black sm:px-8 sm:py-12 print:min-h-0 print:bg-white print:px-0 print:py-0 print:text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-black hover:underline"
          >
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#2E5B44] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244936]"
          >
            Print PDF
          </button>
        </div>

        <header className="border-b-2 border-black pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Sanctos · Blood pressure report
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Sanctos Clinical Summary
            </h1>
            <p className="text-sm text-neutral-700">
              Prepared {reportDate || "—"}
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-xl border border-neutral-300 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600">
            Patient information
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:max-w-md">
            <div>
              <dt className="text-neutral-600">Name</dt>
              <dd className="mt-1 font-semibold">{patientName || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-neutral-600">Age</dt>
              <dd className="mt-1 font-semibold">
                {patientAge ? `${patientAge} years` : "Not provided"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Recent blood pressure readings</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Most recent readings, up to 10 entries
              </p>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          ) : isLoading ? (
            <p className="mt-5 py-8 text-center text-sm text-neutral-600">
              Loading readings…
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-neutral-400">
                    <th scope="col" className="px-3 py-3 font-semibold">Systolic</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Diastolic</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.length ? (
                    readings.map((reading) => (
                      <tr key={reading.id} className="border-b border-neutral-300">
                        <td className="px-3 py-3 font-semibold">{reading.systolic} mmHg</td>
                        <td className="px-3 py-3">{reading.diastolic} mmHg</td>
                        <td className="px-3 py-3">
                          {new Date(reading.recorded_at).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-3">{getContextSummary(reading.context_notes)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-neutral-600">
                        No readings are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-neutral-300 p-5 sm:p-6">
          <h2 className="text-xl font-bold">Questions for my Doctor</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Are my current readings safe?</li>
            <li>Should we adjust my medication?</li>
          </ol>
        </section>

        <footer className="mt-8 border-t border-neutral-300 pt-4 text-xs leading-5 text-black">
          <h2 className="font-bold uppercase tracking-wider">Medical Disclaimer</h2>
          <p className="mt-2">
            This report is a patient-generated summary and is not a substitute
            for professional medical advice. Not a medical device.
          </p>
        </footer>
      </div>
    </main>
  );
}
