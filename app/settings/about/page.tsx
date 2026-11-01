"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#121212] px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-12 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            About Sanctos
          </h1>
          <Link
            href="/settings"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Settings
          </Link>
        </header>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E5B44]/20">
            <svg
              className="h-7 w-7 text-[#2E5B44]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M12 3v18m-9-9h18M5.64 5.64l12.72 12.72m0-12.72L5.64 18.36"
              />
            </svg>
          </div>
          <p className="text-lg leading-relaxed text-neutral-300">
            Sanctos is a continuous medical companion, helping you build a
            clearer picture of your blood pressure and the everyday habits
            around it. Small, thoughtful check-ins can support more informed
            conversations about your health.
          </p>
          <p className="mt-8 border-t border-neutral-800 pt-6 text-sm font-medium text-neutral-500">
            Version 1.0.0
          </p>
        </section>

        <section
          aria-label="Medical disclaimer"
          className="mt-5 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-5"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
            Important health information
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">
            Not a medical device. No clinical claim. In emergencies, call your
            local emergency number.
          </p>
        </section>
      </div>
    </main>
  );
}
