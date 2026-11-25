"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/supabase";

type EntryIntent = "meal" | "ingredients";
type Turn = { role: "user" | "assistant"; content: string };
type CookingResult = {
  status: "ready" | "needs_clarification" | "unavailable";
  assistantMessage: string;
  interpretation?: string;
  questions?: string[];
  recommendations?: { title: string; detail: string }[];
  plan?: null | {
    servings: string;
    preparation: string[];
    ingredients: { name: string; amount: string; availability: "available" | "missing" | "optional" }[];
  };
  safetyNotes?: string[];
  reason?: string;
};

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
    placeholder: "Describe the meal and how you usually prepare it.",
  },
  {
    id: "ingredients",
    number: "02",
    title: "I have ingredients",
    description: "Start with what is available. Find a meal that makes sense.",
    placeholder: "List the ingredients you have. Include quantities if you know them.",
  },
];

export default function AhuvaKitchen() {
  const [intent, setIntent] = useState<EntryIntent | null>(null);
  const [details, setDetails] = useState("");
  const [mode, setMode] = useState<CookingMode>("your-way");
  const [servings, setServings] = useState("2");
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [result, setResult] = useState<CookingResult | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIntent(null);
    setDetails("");
    setMode("your-way");
    setServings("2");
    setConversation([]);
    setResult(null);
    setFollowUp("");
    setLoading(false);
    setError(null);
  }

  async function askAhuva(turns: Turn[]) {
    if (!intent || !details.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Sign in again to continue.");
        return;
      }
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          intent,
          mode,
          details: details.trim(),
          servings,
          conversation: turns,
        }),
      });
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "assistantMessage" in data &&
          typeof data.assistantMessage === "string") {
        setResult(data as CookingResult);
        setConversation(turns);
      } else if (!response.ok) {
        setError("Ahuva could not respond just now. Please try again.");
      } else {
        setError("Ahuva returned an incomplete response. Please try again.");
      }
    } catch {
      setError("We couldn’t reach Ahuva. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details.trim() || !intent || loading) return;
    const turns: Turn[] = [{ role: "user", content: details.trim() }];
    setConversation(turns);
    await askAhuva(turns);
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUp.trim() || loading) return;
    const turns = [...conversation, { role: "assistant" as const, content: result?.assistantMessage ?? "" }, { role: "user" as const, content: followUp.trim() }];
    setFollowUp("");
    await askAhuva(turns);
  }

  const selectedEntry = entryOptions.find((option) => option.id === intent);
  const hasResult = result !== null;

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
          <span className="hidden rounded-full border border-[#183D30]/10 bg-white/70 px-3 py-2 text-[11px] font-medium text-[#64796C] sm:inline-flex">Your Kitchen Companion</span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#718477]">Good food. Better decisions.</p>
          <h2 className="mt-4 font-serif text-[2.7rem] leading-[1.06] tracking-tight text-[#183D30] sm:text-6xl">Let’s make your next meal work better.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68796E] sm:text-lg">You know how you like to cook. Ahuva is here to help with the decisions around it — without taking over.</p>
        </div>

        {!intent && (
          <section aria-label="Choose how to start" className="mt-10 grid gap-4 sm:grid-cols-2">
            {entryOptions.map((option) => (
              <button key={option.id} type="button" onClick={() => setIntent(option.id)} className="group relative min-h-48 overflow-hidden rounded-[1.75rem] border border-[#183D30]/10 bg-white/85 p-6 text-left shadow-[0_12px_36px_rgba(24,61,48,0.045)] transition duration-200 hover:-translate-y-1 hover:border-[#6F927B]/50 hover:shadow-[0_18px_42px_rgba(24,61,48,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B] focus-visible:ring-offset-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8EFE5] font-serif text-lg text-[#315B49]">{option.number}</span>
                <h3 className="mt-7 font-serif text-[1.55rem] leading-tight text-[#183D30]">{option.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#718477]">{option.description}</p>
                <span aria-hidden="true" className="absolute bottom-6 right-6 text-xl text-[#9AAB9D] transition group-hover:translate-x-1 group-hover:text-[#315B49]">→</span>
              </button>
            ))}
          </section>
        )}

        {intent && !hasResult && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Step 1 · Your starting point</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">{selectedEntry?.title}</h3>
              </div>
              <button type="button" onClick={reset} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[#718477] transition hover:bg-[#F1F4EE] hover:text-[#183D30]">Change</button>
            </div>

            <form onSubmit={submit} className="mt-6">
              <label htmlFor="ahuva-meal-details" className="mb-2 block text-sm font-semibold text-[#29483B]">{intent === "meal" ? "What would you like to prepare?" : "What ingredients do you have?"}</label>
              <textarea id="ahuva-meal-details" autoFocus rows={4} maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={selectedEntry?.placeholder} className="w-full resize-y rounded-2xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-4 text-[15px] leading-7 text-[#183D30] outline-none transition placeholder:text-[#9AA89D] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10" />

              <div className="mt-7 border-t border-[#E8ECE5] pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Step 2 · Choose your cooking style</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" aria-pressed={mode === "your-way"} onClick={() => setMode("your-way")} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#789780] ${mode === "your-way" ? "border-[#315B49] bg-[#F0F5EE] ring-1 ring-[#315B49]" : "border-[#E1E8DE] bg-white hover:border-[#9BAF9D]"}`}>
                    <span className="flex items-center justify-between gap-2"><span className="font-serif text-xl text-[#183D30]">Your Way</span><span className="rounded-full bg-[#DDE9D9] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#315B49]">Default</span></span>
                    <span className="mt-2 block text-sm leading-6 text-[#718477]">Keep your method. Get help with balance, substitutions, quantities and cost.</span>
                  </button>
                  <button type="button" aria-pressed={mode === "ahuvas-way"} onClick={() => setMode("ahuvas-way")} className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#789780] ${mode === "ahuvas-way" ? "border-[#315B49] bg-[#F0F5EE] ring-1 ring-[#315B49]" : "border-[#E1E8DE] bg-white hover:border-[#9BAF9D]"}`}>
                    <span className="font-serif text-xl text-[#183D30]">Ahuva’s Way</span>
                    <span className="mt-2 block text-sm leading-6 text-[#718477]">See another preparation approach, grounded in the ingredients you have.</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <label className="text-sm text-[#718477]" htmlFor="ahuva-servings">How many people?
                  <select id="ahuva-servings" value={servings} onChange={(event) => setServings(event.target.value)} className="ml-3 rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-2 text-sm font-semibold text-[#29483B] outline-none focus:border-[#789780]">
                    {["1", "2", "3", "4", "5", "6", "7", "8+"].map((number) => <option key={number} value={number}>{number}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={!details.trim() || loading} className="inline-flex items-center gap-3 rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#315B49] disabled:cursor-not-allowed disabled:opacity-45">
                  {loading ? "Ahuva is thinking…" : "Ask Ahuva"} <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
            {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF1E9] px-4 py-3 text-sm text-[#8B4229]">{error}</p>}
          </section>
        )}

        {loading && hasResult && <p role="status" className="mt-8 text-sm text-[#718477]">Ahuva is working on your follow-up…</p>}

        {hasResult && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Ahuva · {mode === "your-way" ? "Your Way" : "Ahuva’s Way"}</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Your cooking session</h3>
              </div>
              <button type="button" onClick={reset} className="text-xs font-semibold text-[#718477] underline underline-offset-4">New meal</button>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[#29483B]">{result?.assistantMessage}</p>

            {result?.interpretation && <div className="mt-5 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">What I understood</p><p className="mt-2 text-sm leading-6 text-[#29483B]">{result.interpretation}</p></div>}

            {result?.plan && (
              <div className="mt-6 space-y-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">For {result.plan.servings}</p><h4 className="mt-1 font-serif text-xl text-[#183D30]">Your preparation</h4></div>
                {result.plan.ingredients.length > 0 && <div className="space-y-2">{result.plan.ingredients.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9F5] px-3 py-3 text-sm"><span className="text-[#29483B]">{item.name} <span className="text-[#87958A]">· {item.amount}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.availability === "available" ? "bg-[#E4EFE2] text-[#315B49]" : item.availability === "missing" ? "bg-[#FFF0E6] text-[#92532F]" : "bg-[#F1F0E9] text-[#68796E]"}`}>{item.availability}</span></div>)}</div>}
                {result.plan.preparation.length > 0 && <ol className="space-y-3">{result.plan.preparation.map((step, index) => <li key={index} className="flex gap-3 text-sm leading-6 text-[#405C4D]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8EFE5] text-[11px] font-bold text-[#315B49]">{index + 1}</span><span>{step}</span></li>)}</ol>}
              </div>
            )}

            {result?.recommendations && result.recommendations.length > 0 && <div className="mt-6 space-y-3">{result.recommendations.map((item, index) => <div key={index} className="rounded-2xl border border-[#E6EBE3] p-4"><p className="font-semibold text-[#29483B]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#718477]">{item.detail}</p></div>)}</div>}
            {result?.questions && result.questions.length > 0 && <div className="mt-5 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Ahuva needs to know</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#405C4D]">{result.questions.map((question, index) => <li key={index}>{question}</li>)}</ul></div>}
            {result?.safetyNotes && result.safetyNotes.length > 0 && <div className="mt-5 rounded-xl border border-[#E8E1D5] bg-[#FBF8F1] p-4 text-sm leading-6 text-[#6F604B]">{result.safetyNotes.map((note, index) => <p key={index}>{note}</p>)}</div>}

            {result?.status !== "unavailable" && (
              <form onSubmit={submitFollowUp} className="mt-7 border-t border-[#E8ECE5] pt-5">
                <label htmlFor="ahuva-followup" className="mb-2 block text-sm font-semibold text-[#29483B]">Continue with Ahuva</label>
                <div className="flex gap-2">
                  <input id="ahuva-followup" value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={1200} placeholder="Add a detail or ask a follow-up…" className="min-w-0 flex-1 rounded-full border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-3 text-sm outline-none focus:border-[#789780]" />
                  <button type="submit" disabled={!followUp.trim() || loading} className="rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Send</button>
                </div>
              </form>
            )}
            {result?.status === "unavailable" && <div className="mt-5 rounded-2xl border border-[#E5E9E1] bg-[#FBFCF9] p-4"><p className="text-xs leading-5 text-[#718477]">Your brief has reached the Cooking service. The AI provider remains disabled until its data safeguards are approved.</p></div>}
            {error && <p role="alert" className="mt-4 text-sm text-[#8B4229]">{error}</p>}
            <div className="mt-6 flex justify-end"><button type="button" onClick={reset} className="rounded-full border border-[#DCE4DA] px-5 py-3 text-sm font-semibold text-[#315B49]">Start a new meal</button></div>
          </section>
        )}

        <div className="mt-12 flex items-center gap-3 text-xs text-[#8B9A8E]"><span className="h-px w-8 bg-[#C8D3C7]" />Ahuva adapts to how you cook. Not the other way around.</div>
      </div>
    </main>
  );
}
