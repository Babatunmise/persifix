"use client";

import { useState, type FormEvent } from "react";

type CookingIntent = "meal" | "ingredients";
type Message = { role: "you" | "ahuva"; text: string };

const entryPoints: {
  id: CookingIntent;
  title: string;
  description: string;
  example: string;
}[] = [
  {
    id: "meal",
    title: "I know what I want to cook",
    description: "Start with the meal. Ahuva will help you make it work.",
    example: "e.g. I want to make jollof rice for four people.",
  },
  {
    id: "ingredients",
    title: "I have ingredients",
    description: "Start with what is in your kitchen. Find a good meal to make.",
    example: "e.g. Rice, tomatoes, eggs, spinach and onions.",
  },
];

const prompts: Record<CookingIntent, string> = {
  meal: "What would you like to cook?",
  ingredients: "What ingredients do you have?",
};

export default function AhuvaKitchen() {
  const [intent, setIntent] = useState<CookingIntent | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function chooseIntent(nextIntent: CookingIntent) {
    setIntent(nextIntent);
    setInput("");
    setSubmitted(false);
  }

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!intent || !value) return;
    setMessages((current) => [...current, { role: "you", text: value }]);
    setSubmitted(true);
  }

  function startAgain() {
    setIntent(null);
    setInput("");
    setMessages([]);
    setSubmitted(false);
  }

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
            Your Kitchen Guardian
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#718477]">A better food decision starts here</p>
          <h2 className="mt-4 font-serif text-[2.7rem] leading-[1.06] tracking-tight text-[#183D30] sm:text-6xl">
            What are we cooking today?
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68796E] sm:text-lg">
            Tell me what you have in mind or what is already in your kitchen. We’ll take it from there.
          </p>
        </div>

        {!intent && (
          <section aria-label="Choose how to start" className="mt-10 grid gap-4 sm:grid-cols-2">
            {entryPoints.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseIntent(item.id)}
                className="group relative min-h-48 overflow-hidden rounded-[1.75rem] border border-[#183D30]/10 bg-white/85 p-6 text-left shadow-[0_12px_36px_rgba(24,61,48,0.045)] transition duration-200 hover:-translate-y-1 hover:border-[#6F927B]/50 hover:shadow-[0_18px_42px_rgba(24,61,48,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B] focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8EFE5] font-serif text-lg text-[#315B49]">
                  {index === 0 ? "01" : "02"}
                </span>
                <h3 className="mt-7 font-serif text-[1.55rem] leading-tight text-[#183D30]">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#718477]">{item.description}</p>
                <span aria-hidden="true" className="absolute bottom-6 right-6 text-xl text-[#9AAB9D] transition group-hover:translate-x-1 group-hover:text-[#315B49]">→</span>
              </button>
            ))}
          </section>
        )}

        {intent && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Let’s get started</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">{prompts[intent]}</h3>
              </div>
              <button type="button" onClick={startAgain} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[#718477] transition hover:bg-[#F1F4EE] hover:text-[#183D30]">
                Change
              </button>
            </div>

            <form onSubmit={submitRequest} className="mt-6">
              <label htmlFor="ahuva-start-input" className="sr-only">{prompts[intent]}</label>
              <textarea
                id="ahuva-start-input"
                autoFocus
                rows={4}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={prompts[intent]}
                disabled={submitted}
                className="w-full resize-y rounded-2xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-4 text-[15px] leading-7 text-[#183D30] outline-none transition placeholder:text-[#9AA89D] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10 disabled:opacity-70"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#91A096]">{entryPoints.find((item) => item.id === intent)?.example}</p>
                <button
                  type="submit"
                  disabled={!input.trim() || submitted}
                  className="inline-flex items-center gap-3 rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#315B49] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Continue <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>

            {submitted && (
              <div className="mt-6 rounded-2xl border border-[#E5E9E1] bg-[#F6F8F3] p-4" role="status" aria-live="polite">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Your starting point</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#29483B]">{messages[messages.length - 1]?.text}</p>
                <div className="mt-4 border-t border-[#DCE4DA] pt-4">
                  <p className="text-sm font-semibold text-[#183D30]">Ahuva’s cooking intelligence is not connected yet.</p>
                  <p className="mt-1 text-sm leading-6 text-[#718477]">This is the simplified starting flow. Meal suggestions, food guidance and the cooking workspace will appear here once the intelligence layer is implemented.</p>
                </div>
                <button type="button" onClick={startAgain} className="mt-4 text-sm font-semibold text-[#315B49] underline decoration-[#AABBAA] underline-offset-4 hover:text-[#183D30]">
                  Start a new meal
                </button>
              </div>
            )}
          </section>
        )}

        <div className="mt-12 flex items-center gap-3 text-xs text-[#8B9A8E]">
          <span className="h-px w-8 bg-[#C8D3C7]" />
          Good food. Better decisions. Your way.
        </div>
      </div>
    </main>
  );
}
