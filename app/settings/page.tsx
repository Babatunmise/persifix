"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";

type SettingsIconName =
  | "profile"
  | "medications"
  | "records"
  | "reminders"
  | "clear"
  | "about";

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
    icon: "reminders",
    title: "Reminders",
    description: "Daily check-in",
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
  if (name === "reminders") {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 004 0" />
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
  const router = useRouter();
  const toast = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const subscribeToNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success("Welcome to the Sanctos newsletter!");
    setNewsletterEmail("");
  };

  const clearAllData = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all your data? This cannot be undone.",
    );
    if (!confirmed) return;

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("sanctos_")) {
        localStorage.removeItem(key);
      }
    }

    router.push("/");
  };

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

              if (row.title === "Edit Profile") {
                return (
                  <Link
                    key={row.title}
                    href="/settings/profile"
                    className={rowClassName}
                  >
                    {rowContent}
                  </Link>
                );
              }
              if (row.title === "Medications") {
                return (
                  <Link
                    key={row.title}
                    href="/settings/medications"
                    className={rowClassName}
                  >
                    {rowContent}
                  </Link>
                );
              }
              if (row.title === "Health Records") {
                return (
                  <Link
                    key={row.title}
                    href="/settings/records"
                    className={rowClassName}
                  >
                    {rowContent}
                  </Link>
                );
              }
              if (row.title === "Reminders") {
                return (
                  <Link
                    key={row.title}
                    href="/settings/reminders"
                    className={rowClassName}
                  >
                    {rowContent}
                  </Link>
                );
              }
              if (row.title === "About Sanctos") {
                return (
                  <Link
                    key={row.title}
                    href="/settings/about"
                    className={rowClassName}
                  >
                    {rowContent}
                  </Link>
                );
              }
              return (
                <button
                  key={row.title}
                  type="button"
                  onClick={row.title === "Clear All Data" ? clearAllData : undefined}
                  className={rowClassName}
                >
                  {rowContent}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Notes from Sanctos
          </p>
          <h2 className="text-xl font-semibold">Stay Updated</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Get occasional product news and thoughtful health check-in tips.
          </p>
          <form
            onSubmit={subscribeToNewsletter}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(event) => setNewsletterEmail(event.target.value)}
              placeholder="Your email address"
              className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-[#121212] px-4 py-3 text-[#F9F8F6] placeholder:text-neutral-600 focus:border-[#6D9A7F] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#2E5B44] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#376c51]"
            >
              Subscribe
            </button>
          </form>
        </section>
        <p className="mt-6 text-center text-xs text-neutral-600">Version 1.0.0</p>
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
            href="/trends"
            className="flex flex-col items-center text-neutral-500 transition-colors hover:text-[#F9F8F6]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M7 14l4-4 4 3 6-7" />
            </svg>
            <span className="mt-1 text-[10px] font-medium">Trends</span>
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
