"use client";

import Link from "next/link";

export default function HealthRecordsPage() {
  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Your health
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Health Records
            </h1>
          </div>
          <Link
            href="/settings"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Settings
          </Link>
        </header>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E5B44]/20 text-[#6D9A7F]">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5m-8 5h4m-4 4h4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">Share your progress</h2>
          <p className="mt-3 leading-7 text-neutral-400">
            Export your readings as a PDF to share with your doctor.
          </p>
          <button
            type="button"
            onClick={() => window.alert("PDF generation coming in Phase 3!")}
            className="mt-8 w-full rounded-full bg-[#2E5B44] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#376c51] sm:w-auto sm:min-w-64"
          >
            Generate PDF Report
          </button>
        </section>
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
            className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">History</span>
          </Link>
          <Link
            href="/settings"
            aria-current="page"
            className="flex flex-col items-center text-[#F9F8F6] transition-colors"
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
