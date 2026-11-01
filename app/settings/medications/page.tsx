"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";

type Medication = {
  id: number;
  name: string;
  dosage: string;
  schedule: string;
};

export default function MedicationsPage() {
  const toast = useToast();
  const [medications, setMedications] = useState<Medication[]>([
    { id: 1, name: "Lisinopril", dosage: "10mg", schedule: "Morning" },
    { id: 2, name: "Amlodipine", dosage: "5mg", schedule: "Night" },
  ]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState("Morning");

  useEffect(() => {
    if (!isFormOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFormOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen]);

  const addMedication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const medicationName = name.trim();
    if (!medicationName) return;

    setMedications((currentMedications) => [
      ...currentMedications,
      {
        id: Math.max(0, ...currentMedications.map((medication) => medication.id)) + 1,
        name: medicationName,
        dosage: dosage.trim() || "Pending",
        schedule,
      },
    ]);
    setName("");
    setDosage("");
    setSchedule("Morning");
    setIsFormOpen(false);
    toast.success("Medication added");
  };

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

        <section aria-label="Your medications">
          <p className="mb-5 text-sm text-neutral-400">
            A quick overview of your current medication routine.
          </p>
          <div className="space-y-3">
            {medications.map((medication) => (
              <article
                key={medication.id}
                className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2E5B44]/15 text-[#6D9A7F]">
                  <svg
                    className="h-6 w-6"
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
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{medication.name}</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {medication.dosage} <span className="mx-1 text-neutral-600">·</span>{" "}
                    {medication.schedule}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="mt-8 w-full rounded-full bg-[#2E5B44] px-6 py-5 text-lg font-semibold text-white transition-colors hover:bg-[#376c51]"
          >
            Add New Medication
          </button>
        </section>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close medication form"
            onClick={() => setIsFormOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="medication-form-title"
            className="relative z-10 w-full max-w-lg rounded-t-3xl border border-neutral-800 bg-[#121212] p-6 text-[#F9F8F6] shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Medication list
                </p>
                <h2
                  id="medication-form-title"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Add medication
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-neutral-500 transition-colors hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={addMedication} className="space-y-5">
              <div>
                <label
                  htmlFor="medication-name"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Medication Name
                </label>
                <input
                  id="medication-name"
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g., Lisinopril"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 text-lg text-[#F9F8F6] placeholder:text-neutral-600 focus:border-[#6D9A7F] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="medication-dosage"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Dosage
                </label>
                <input
                  id="medication-dosage"
                  type="text"
                  value={dosage}
                  onChange={(event) => setDosage(event.target.value)}
                  placeholder="e.g., 10mg"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 text-lg text-[#F9F8F6] placeholder:text-neutral-600 focus:border-[#6D9A7F] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="medication-schedule"
                  className="mb-2 block text-sm font-medium text-neutral-300"
                >
                  Schedule
                </label>
                <select
                  id="medication-schedule"
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-4 text-lg text-[#F9F8F6] focus:border-[#6D9A7F] focus:outline-none"
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Night</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-full border border-neutral-700 px-5 py-4 font-semibold text-neutral-300 transition-colors hover:bg-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#2E5B44] px-5 py-4 font-semibold text-white transition-colors hover:bg-[#376c51]"
                >
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
