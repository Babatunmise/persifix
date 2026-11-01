"use client";

import Link from "next/link";

export default function MedicationsPage() {
  return (
    <main className="min-h-screen bg-[#121212] px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-12 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            Medications
          </h1>
          <Link
            href="/settings"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Settings
          </Link>
        </header>

        <section className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900/70 px-6 py-12 text-center sm:px-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2E5B44]/15">
            <svg
              className="h-8 w-8 text-[#2E5B44]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M10.5 20.5l-7-7a5 5 0 017.07-7.07l7 7a5 5 0 01-7.07 7.07zm-3.54-10.6l7.07 7.07"
              />
            </svg>
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-tight">
            Coming Soon.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400 sm:text-base">
            Soon, you will be able to track your BP medication dosage,
            schedule, and adherence right here.
          </p>
          <button
            type="button"
            disabled
            className="mt-8 w-full max-w-xs cursor-not-allowed rounded-full border border-neutral-800 bg-neutral-800/60 px-6 py-4 font-semibold text-neutral-500"
          >
            Add Medication
          </button>
        </section>
      </div>
    </main>
  );
}
