"use client";

import { useState, type FormEvent } from "react";

type EntryIntent = "meal" | "ingredients";
type CookingMode = "your-way" | "ahuvas-way";

const entryOptions: {
  id: EntryIntent;
  number: string;
  title: string;
  description: string;
  placeholder: string;
}[] = [
  {
    id: "meal",
    number: "01",
    title: "I know what I want to cook",
    description: "Bring your meal idea. Ahuva helps you make it work better.",
    placeholder: "e.g. Jollof rice for four people. I usually cook it with...",
  },
  {
    id: "ingredients",
    number: "02",
    title: "I have ingredients",
    description: "Start with what is available. Find a meal that makes sense.",
    placeholder: "e.g. Rice, tomatoes, eggs, spinach and onions.",
  },
];

export default function AhuvaKitchen() {
  const [intent, setIntent] = useState<EntryIntent | null>(null);
  const [details, setDetails] = useState("");
  const [mode, setMode] = useState<CookingMode>("your-way");
  const [servings, setServings] = useState("2");
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setIntent(null);
    setDetails("");
    setMode("your-way");
    setServings("2");
    setSubmitted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (details.trim()) setSubmitted(true);
  }

  const selectedEntry = entryOptions.find((option) => option.id === intent);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8F7F1] pb-28 text-[#182D25]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 h-[26rem] w-[26rem] rounded-full bg-[#DDE9D9]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-28 h-[28rem] w-[28rem] rounded-full bg-[#F0E5D2]/65 blur-3xl" />

      <header className="relative z-10 border-b border-[#183D30]/10 bg-[#F8F7F1]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-[#F8F7F1]">a</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718477]">Sanctos · Kitchen</p>
              <h1 className="font-serif text-2xl leading-none tracking-tight">Ahuva</h1>
            </div>
          </div>
          <span className="hidden rounded-full border border-[#183D30]/10 bg-white/70 px-3 py-2 text-[11px] font-medium text-[#64796C] sm:inline-flex">
            Your Kitchen Companion
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#718477]">Good food. Better decisions.</p>
          <h2 className="mt-4 font-serif text-[2.7rem] leading-[1.06] tracking-tight text-[#183D30] sm:text-6xl">
            Let’s make your next meal work better.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68796E] sm:text-lg">
            You know how you like to cook. Ahuva is here to help with the decisions around it — without taking over.
          </p>
        </div>

        {!intent && (
          <section aria-label="Choose how to start" className="mt-10 grid gap-4 sm:grid-cols-2">
            {entryOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntent(option.id)}
                className="group relative min-h-48 overflow-hidden rounded-[1.75rem] border border-[#183D30]/10 bg-white/85 p-6 text-left shadow-[0_12px_36px_rgba(24,61,48,0.045)] transition duration-200 hover:-translate-y-1 hover:border-[#6F927B]/50 hover:shadow-[0_18px_42px_rgba(24,61,48,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B] focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8EFE5] font-serif text-lg text-[#315B49]">{option.number}</span>
                <h3 className="mt-7 font-serif text-[1.55rem] leading-tight text-[#183D30]">{option.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#718477]">{option.description}</p>
                <span aria-hidden="true" className="absolute bottom-6 right-6 text-xl text-[#9AAB9D] transition group-hover:translate-x-1 group-hover:text-[#315B49]">→</span>
              </button>
            ))}
          </section>
        )}

        {intent && !submitted && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Step 1 · Your starting point</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">{selectedEntry?.title}</h3>
              </div>
              <button type="button" onClick={reset} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[#718477] transition hover:bg-[#F1F4EE] hover:text-[#183D30]">Change</button>
            </div>

            <form onSubmit={submit} className="mt-6">
              <label htmlFor="ahuva-meal-details" className="mb-2 block text-sm font-semibold text-[#29483B]">
                {intent === "meal" ? "What would you like to prepare?" : "What ingredients do you have?"}
              </label>
              <textarea
                id="ahuva-meal-details"
                autoFocus
                rows={4}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={selectedEntry?.placeholder}
                className="w-full resize-y rounded-2xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-4 text-[15px] leading-7 text-[#183D30] outline-none transition placeholder:text-[#9AA89D] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10"
              />

              <div className="mt-7 border-t border-[#E8ECE5] pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Step 2 · Choose your cooking style</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={mode === "your-way"}
                    onClick={() => setMode("your-way")}
                    className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#789780] ${mode === "your-way" ? "border-[#315B49] bg-[#F0F5EE] ring-1 ring-[#315B49]" : "border-[#E1E8DE] bg-white hover:border-[#9BAF9D]"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-serif text-xl text-[#183D30]">Your Way</span>
                      <span className="rounded-full bg-[#DDE9D9] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#315B49]">Default</span>
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-[#718477]">Keep your method. Get help with balance, substitutions, quantities and cost.</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "ahuvas-way"}
                    onClick={() => setMode("ahuvas-way")}
                    className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#789780] ${mode === "ahuvas-way" ? "border-[#315B49] bg-[#F0F5EE] ring-1 ring-[#315B49]" : "border-[#E1E8DE] bg-white hover:border-[#9BAF9D]"}`}
                  >
                    <span className="font-serif text-xl text-[#183D30]">Ahuva’s Way</span>
                    <span className="mt-2 block text-sm leading-6 text-[#718477]">See Ahuva’s suggested ingredients and preparation method. Guidance is optional.</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <label className="text-sm text-[#718477]" htmlFor="ahuva-servings">
                  How many people?
                  <select id="ahuva-servings" value={servings} onChange={(event) => setServings(event.target.value)} className="ml-3 rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-2 text-sm font-semibold text-[#29483B] outline-none focus:border-[#789780]">
                    {["1", "2", "3", "4", "5", "6", "7", "8+"].map((number) => <option key={number} value={number}>{number}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={!details.trim()} className="inline-flex items-center gap-3 rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#315B49] disabled:cursor-not-allowed disabled:opacity-35">
                  Continue <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {submitted && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7" aria-live="polite">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Your cooking brief</p>
            <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Here’s where we’ll begin.</h3>
            <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#F6F8F3] p-4 text-sm leading-6 text-[#29483B]">{details}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#E8EFE5] px-3 py-2 font-semibold text-[#315B49]">{mode === "your-way" ? "Your Way" : "Ahuva’s Way"}</span>
              <span className="rounded-full bg-[#F1F0E9] px-3 py-2 font-semibold text-[#68796E]">{servings} {servings === "1" ? "person" : "people"}</span>
            </div>
            <div className="mt-6 rounded-2xl border border-[#E5E9E1] bg-[#FBFCF9] p-4">
              <p className="text-sm font-semibold text-[#183D30]">Cooking intelligence is not active yet.</p>
              <p className="mt-1 text-sm leading-6 text-[#718477]">Your cooking preferences and chosen mode are captured in this interface, but meal recommendations and food guidance are not yet connected. Ahuva will not invent nutrition estimates or claim a meal is safe for a medical condition.</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setSubmitted(false)} className="text-sm font-semibold text-[#315B49] underline decoration-[#AABBAA] underline-offset-4">Edit brief</button>
              <button type="button" onClick={reset} className="rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315B49]">Start a new meal</button>
            </div>
          </section>
        )}

        <div className="mt-12 flex items-center gap-3 text-xs text-[#8B9A8E]">
          <span className="h-px w-8 bg-[#C8D3C7]" />
          Ahuva adapts to how you cook. Not the other way around.
        </div>
      </div>
    </main>
  );
}
