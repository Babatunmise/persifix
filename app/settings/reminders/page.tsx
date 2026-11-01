"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const REMINDER_ENABLED_KEY = "sanctos_reminder_enabled";
const REMINDER_TIME_KEY = "sanctos_reminder_time";
const REMINDERS_CHANGE_EVENT = "sanctos-reminders-change";
const DEFAULT_REMINDER_TIME = "08:00";

function subscribeToReminderPreferences(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(REMINDERS_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(REMINDERS_CHANGE_EVENT, onStoreChange);
  };
}

function getReminderEnabled() {
  return localStorage.getItem(REMINDER_ENABLED_KEY) === "true";
}

function getReminderTime() {
  return localStorage.getItem(REMINDER_TIME_KEY) || DEFAULT_REMINDER_TIME;
}

function notifyReminderPreferenceChange() {
  window.dispatchEvent(new Event(REMINDERS_CHANGE_EVENT));
}

export default function RemindersPage() {
  const isEnabled = useSyncExternalStore(
    subscribeToReminderPreferences,
    getReminderEnabled,
    () => false,
  );
  const reminderTime = useSyncExternalStore(
    subscribeToReminderPreferences,
    getReminderTime,
    () => DEFAULT_REMINDER_TIME,
  );

  const toggleReminder = () => {
    const nextEnabled = !getReminderEnabled();
    localStorage.setItem(REMINDER_ENABLED_KEY, String(nextEnabled));
    notifyReminderPreferenceChange();
  };

  const changeReminderTime = (time: string) => {
    localStorage.setItem(REMINDER_TIME_KEY, time);
    notifyReminderPreferenceChange();
  };

  return (
    <main className="min-h-screen bg-[#121212] px-5 py-8 text-[#F9F8F6] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Your routine
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Reminders
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
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 className="font-semibold">Daily Check-in Reminder</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-400">
                Choose whether to keep a daily blood pressure check-in on your
                radar.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              aria-label="Daily Check-in Reminder"
              onClick={toggleReminder}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D9A7F] ${
                isEnabled ? "bg-[#2E5B44]" : "bg-neutral-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  isEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="mt-8 border-t border-neutral-800 pt-6">
            <label
              htmlFor="reminder-time"
              className="mb-2 block text-sm font-medium text-neutral-300"
            >
              Reminder time
            </label>
            <input
              id="reminder-time"
              type="time"
              value={reminderTime}
              disabled={!isEnabled}
              onChange={(event) => changeReminderTime(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-[#121212] px-4 py-3 text-[#F9F8F6] [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-40 sm:w-56"
            />
            <p className="mt-2 text-xs text-neutral-500">
              Reminder preferences are saved on this device.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
