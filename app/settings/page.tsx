"use client";

import Link from "next/link";

type SettingsIconName = "profile" | "medications" | "records" | "clear" | "about";

const SETTINGS_ROWS: {
  icon: SettingsIconName;
  title: string;
  description: string;
  destructive?: boolean;
}[] = [
  {
    icon: "profile",
    title: "Edit Profile",
    description: "Name, title, and age",
  },
  {
    icon: "medications",
    title: "Medications",
    description: "Coming Soon",
  },
  {
    icon: "records",
    title: "Health Records",
    description: "Export PDF",
  },
  {
    icon: "clear",
    title: "Clear All Data",
    description: "Remove your saved information",
    destructive: true,
  },
  {
    icon: "about",
    title: "About Sanctos",
    description: "Version 1.0.0",
  },
];

function SettingsIcon({
  name,
  destructive = false,
}: {
  name: SettingsIconName;
  destructive?: boolean;
}) {
  const iconClass = `h-5 w-5 ${destructive ? "text-red-400" : "text-[#2E5B44]"}`;

  if (name === "profile") {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M20 21a8 8 0 00-16 0m8-10a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    );
  }
  if (name === "medications") {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10.5 20.5l-7-7a5 5 0 017.07-7.07l7 7a5 5 0 01-7.07 7.07zm-3.54-10.6l7.07 7.07M14 4h6m-3-3v6" />
      </svg>
    );
  }
  if (name === "records") {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5m-8 5h4m-4 4h4m-7-4h.01M8 17h.01" />
      </svg>
    );
  }
  if (name === "clear") {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
      </svg>
    );
  }
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth={1.7} />
      <path strokeLinecap="round" strokeWidth={1.7} d="M12 11v5m0-8h.01" />
    </svg>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Your account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Settings
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            Back to Home
          </Link>
        </header>

        <section aria-label="Settings options">
          <p className="mb-4 text-sm text-neutral-500">
            Manage your profile and preferences.
          </p>
          <div className="space-y-3">
            {SETTINGS_ROWS.map((row) => {
              const rowContent = (
                <>
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      row.destructive ? "bg-red-950/60" : "bg-[#2E5B44]/15"
                    }`}
                  >
                    <SettingsIcon name={row.icon} destructive={row.destructive} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{row.title}</span>
                    <span
                      className={`mt-1 block text-sm ${
                        row.destructive ? "text-red-400/70" : "text-neutral-500"
                      }`}
                    >
                      {row.description}
                    </span>
                  </span>
                  <svg
                    className="h-5 w-5 shrink-0 text-neutral-600 transition-colors group-hover:text-neutral-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              );
              const rowClassName = `group flex w-full items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 text-left transition-colors hover:border-neutral-700 hover:bg-neutral-900 sm:p-6 ${
                  row.destructive ? "text-red-400" : "text-[#F9F8F6]"
                }`;

              return row.title === "Edit Profile" ? (
                <Link
                  key={row.title}
                  href="/settings/profile"
                  className={rowClassName}
                >
                  {rowContent}
                </Link>
              ) : (
                <button
                  key={row.title}
                  type="button"
                  className={rowClassName}
                >
                  {rowContent}
                </button>
              );
            })}
          </div>
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
