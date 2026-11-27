"use client";

import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/supabase";

type Mode = "your-way" | "ahuvas-way";
type ModuleName = "ingredients" | "servings" | "style" | "flavour";
type AhuvaResult = {
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

const fieldClass = "w-full rounded-2xl border border-[#E4E8DF] bg-white px-4 py-3.5 text-[15px] leading-6 text-[#20392F] outline-none transition placeholder:text-[#A1AAA0] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10";
const moduleButton = "min-h-[104px] rounded-2xl border border-[#E5E8DF] bg-white p-4 text-left transition hover:border-[#B9C9B7] hover:bg-[#FCFDFB] focus:outline-none focus:ring-4 focus:ring-[#789780]/10";

function parseIngredients(value: string) {
  return value
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => item.split(/\s+and\s+/i).map((part) => part.trim()).filter(Boolean));
}

export default function AhuvaCookingStudio() {
  const [meal, setMeal] = useState("");
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [seasonings, setSeasonings] = useState("");
  const [servings, setServings] = useState(2);
  const [mode, setMode] = useState<Mode>("your-way");
  const [activeModule, setActiveModule] = useState<ModuleName | null>(null);
  const [result, setResult] = useState<AhuvaResult | null>(null);
  const [details, setDetails] = useState("");
  const [conversation, setConversation] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCookingStep, setActiveCookingStep] = useState(0);

  const ingredientSummary = useMemo(
    () => ingredients.length ? ingredients.join(", ") : "Add what goes into your meal",
    [ingredients],
  );

  function addIngredients() {
    const additions = parseIngredients(ingredientDraft);
    if (!additions.length) return;
    setIngredients((current) => {
      const seen = new Set(current.map((item) => item.toLocaleLowerCase()));
      return [...current, ...additions.filter((item) => {
        const key = item.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })];
    });
    setIngredientDraft("");
    setActiveModule(null);
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function requestAhuva(turns: { role: "user" | "assistant"; content: string }[], requestDetails: string, isInitial = false) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      let session;
      try {
        const response = await supabase.auth.getSession();
        session = response.data.session;
      } catch {
        setError("We couldn't verify your sign-in. Check your connection, then try again. Your meal is still here.");
        return;
      }
      if (!session?.access_token) {
        setError("Your session has expired. Sign in again. Your meal is still here.");
        return;
      }

      let response: Response;
      try {
        response = await fetch("/api/kitchen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent: "meal",
            mode,
            details: requestDetails,
            servings: String(servings),
            conversation: turns,
          }),
        });
      } catch {
        setError("Ahuva's cooking service could not be reached. Check your connection and try again. Your meal is still here.");
        return;
      }

      const data = await response.json().catch(() => null);
      if (data && typeof data === "object" && typeof data.assistantMessage === "string") {
        setDetails(requestDetails);
        setConversation(turns);
        setResult(data as AhuvaResult);
        if (isInitial) setActiveCookingStep(0);
        return;
      }
      if (response.status === 401) {
        setError("Your session has expired. Sign in again. Your meal is still here.");
      } else if (response.status === 429) {
        setError("Ahuva is busy right now. Wait a moment and try again.");
      } else if (response.status === 503) {
        setError("Ahuva's cooking service is temporarily unavailable. Your meal is still here; please try again later.");
      } else if (response.status >= 500) {
        setError("Ahuva couldn't complete that request. Your meal is still here; please try again.");
      } else {
        setError(data?.error ?? "Something needs attention before Ahuva can continue. Your meal is still here.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function cook() {
    if (!meal.trim() || ingredients.length === 0 || loading) return;
    const brief = [
      `Meal the user wants to eat: ${meal.trim()}`,
      `Ingredients the user confirms having: I have ${ingredients.join(", ")}`,
      `Salt-based seasonings, sauces, herbs and spices the user uses or has: ${seasonings.trim() || "Not specified"}`,
    ].join("\n");
    await requestAhuva([{ role: "user", content: brief }], brief, true);
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUp.trim() || !details || !result || loading) return;
    const turns = [
      ...conversation,
      { role: "assistant" as const, content: result.assistantMessage },
      { role: "user" as const, content: followUp.trim() },
    ];
    await requestAhuva(turns, details);
    setFollowUp("");
  }

  function startAgain() {
    setResult(null);
    setDetails("");
    setConversation([]);
    setFollowUp("");
    setActiveCookingStep(0);
    setError("");
  }

  const moduleContent: Record<ModuleName, { title: string; eyebrow: string; description: string }> = {
    ingredients: { title: "Ingredients", eyebrow: "Build your meal", description: "Add what you have or plan to use. You can add a list all at once." },
    servings: { title: "Who's joining?", eyebrow: "At the table", description: "Set how many people you're cooking for." },
    style: { title: "Your cooking style", eyebrow: "Make it yours", description: "Keep your familiar method, or ask Ahuva to guide the preparation." },
    flavour: { title: "Seasonings & flavour", eyebrow: "The finishing touches", description: "Add sauces, herbs, spices, stock or other flavourings if you want to." },
  };

  return (
    <main className="min-h-screen bg-[#F7F6F0] pb-28 text-[#20392F]">
      <header className="sticky top-0 z-20 border-b border-[#20392F]/10 bg-[#F7F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-white">a</div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7C897D]">Sanctos · Kitchen</p>
              <h1 className="font-serif text-[22px] leading-none tracking-tight">Ahuva</h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-[#DCE4DA] bg-white/70 px-3 py-2 text-xs text-[#68796E] sm:block">Your cooking studio</div>
          <button type="button" onClick={startAgain} className="text-xs font-semibold text-[#627568] transition hover:text-[#183D30]">New meal ↗</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pt-7 sm:pt-10 lg:px-8">
        {!result ? (
          <>
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your kitchen, your rhythm</p>
              <h2 className="mt-2 font-serif text-[2.5rem] leading-[1.02] tracking-tight text-[#183D30] sm:text-5xl">What are we making?</h2>
              <label htmlFor="studio-meal" className="sr-only">What would you like to cook?</label>
              <input id="studio-meal" value={meal} onChange={(event) => setMeal(event.target.value)} placeholder="Name the meal you have in mind…" className="mt-4 w-full border-0 border-b border-[#DDE4DA] bg-transparent px-0 py-3 font-serif text-xl text-[#20392F] outline-none placeholder:text-[#AEB8AC] focus:border-[#789780] focus:ring-0 sm:text-2xl" />
            </div>

            <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-4 shadow-[0_12px_36px_rgba(35,61,47,0.045)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Your meal at a glance</p>
                  <h3 className="mt-1 font-serif text-xl text-[#183D30]">The overview</h3>
                </div>
                <span className="text-xs text-[#849084]">{ingredients.length} ingredients</span>
              </div>
              <div className="mt-4 min-h-12">
                {ingredients.length ? (
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((item, index) => (
                      <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-xl bg-[#F2F5EF] px-3 py-2 text-sm text-[#365444]">
                        {item}
                        <button type="button" onClick={() => removeIngredient(index)} aria-label={`Remove ${item}`} className="text-base leading-none text-[#91A092] hover:text-[#9A4E38]">×</button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm text-[#9AA69A]">Your ingredients will appear here as you add them.</p>}
              </div>
            </section>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setActiveModule("ingredients")} className={moduleButton}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">01 · Composition</span>
                <span className="mt-2 block font-serif text-lg text-[#183D30]">Ingredients</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#879487]">{ingredientSummary}</span>
              </button>
              <button type="button" onClick={() => setActiveModule("servings")} className={moduleButton}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">02 · At the table</span>
                <span className="mt-2 block font-serif text-lg text-[#183D30]">Servings</span>
                <span className="mt-1 block text-xs leading-5 text-[#879487]">{servings} {servings === 1 ? "person" : "people"}</span>
              </button>
              <button type="button" onClick={() => setActiveModule("style")} className={moduleButton}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">03 · Your preference</span>
                <span className="mt-2 block font-serif text-lg text-[#183D30]">Cooking style</span>
                <span className="mt-1 block text-xs leading-5 text-[#879487]">{mode === "your-way" ? "My way" : "Ahuva&apos;s way"}</span>
              </button>
              <button type="button" onClick={() => setActiveModule("flavour")} className={moduleButton}>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">04 · Optional</span>
                <span className="mt-2 block font-serif text-lg text-[#183D30]">Flavour</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#879487]">{seasonings.trim() || "Seasonings, sauces, herbs…"}</span>
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-[#183D30] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="font-serif text-xl">Ready when you are.</p>
                <p className="mt-1 text-xs text-white/65">Your meal. Your ingredients. Your way.</p>
              </div>
              <button type="button" onClick={cook} disabled={!meal.trim() || ingredients.length === 0 || loading} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-[#E7EBDD] px-6 py-3 text-sm font-bold text-[#183D30] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
                {loading ? "Preparing…" : "Cook with Ahuva"} <span aria-hidden="true">↗</span>
              </button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#EBD9CF] bg-[#FFF7F1] px-4 py-3 text-sm leading-6 text-[#8B4229]">{error}</p>}
          </>
        ) : (
          <section className="mx-auto max-w-5xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your cooking studio · Meal workspace</p>
                <h2 className="mt-2 font-serif text-4xl tracking-tight text-[#183D30] sm:text-5xl">{meal}</h2>
                <p className="mt-2 text-sm text-[#718076]">{servings} servings · {ingredients.length} ingredients</p>
              </div>
              <button type="button" onClick={startAgain} className="self-start rounded-full border border-[#DCE4DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#536A59]">← New meal</button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
              <div className="space-y-4">
                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Ahuva&apos;s understanding</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Your meal, made better.</h3>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#405C4D]">{result.assistantMessage}</p>
                  {result.interpretation && <div className="mt-4 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">The meal we&apos;re making</p><p className="mt-2 text-sm leading-6 text-[#365444]">{result.interpretation}</p></div>}
                  {result.status === "unavailable" && <p className="mt-4 rounded-xl bg-[#F7F8F4] p-4 text-xs leading-6 text-[#718076]">{result.reason === "sensitive_context" ? "This experience cannot assess personal medical conditions, allergies or medication-related dietary needs. General ingredient information is not a personal medical assessment." : "Ahuva&apos;s guided cooking conversation is not connected for this request yet. Your meal details remain here."}</p>}
                </section>
                {result.questions?.length ? <section className="rounded-[26px] border border-[#DCE7D9] bg-[#F4F8F1] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#718477]">One detail to settle</p><h3 className="mt-2 font-serif text-xl text-[#183D30]">Ahuva wants to understand something.</h3><p className="mt-3 text-sm leading-7 text-[#405C4D]">{result.questions[0]}</p></section> : null}
                {result.recommendations?.length ? <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Ways to make it yours</p><div className="mt-3 space-y-3">{result.recommendations.map((item, index) => <div key={index} className="rounded-2xl bg-[#F7F8F4] p-4"><p className="text-sm font-semibold text-[#365444]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#718076]">{item.detail}</p></div>)}</div></section> : null}
                {result.plan?.preparation?.length ? <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Cooking in progress</p><h3 className="mt-1 font-serif text-2xl text-[#183D30]">Let&apos;s make it.</h3></div><span className="rounded-full bg-[#EEF3EA] px-3 py-1.5 text-[10px] font-semibold text-[#536A59]">Step {activeCookingStep + 1} of {result.plan.preparation.length}</span></div>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#EDF0E9]"><div className="h-full rounded-full bg-[#6F9678] transition-all" style={{ width: `${((activeCookingStep + 1) / result.plan.preparation.length) * 100}%` }} /></div>
                  <div className="mt-5 rounded-2xl bg-[#F7F8F4] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">Step {activeCookingStep + 1}</p><p className="mt-3 text-base leading-7 text-[#365444]">{result.plan.preparation[activeCookingStep]}</p></div>
                  <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => setActiveCookingStep((step) => Math.max(0, step - 1))} disabled={activeCookingStep === 0} className="rounded-full border border-[#DCE4DA] px-4 py-2.5 text-xs font-semibold text-[#536A59] disabled:opacity-35">Previous</button><button type="button" onClick={() => setActiveCookingStep((step) => Math.min(result.plan!.preparation.length - 1, step + 1))} disabled={activeCookingStep >= result.plan.preparation.length - 1} className="rounded-full bg-[#183D30] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{activeCookingStep === result.plan.preparation.length - 1 ? "Finished" : "Next step →"}</button></div>
                </section> : null}
              </div>
              <aside className="space-y-4">
                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Meal composition</p><h3 className="mt-1 font-serif text-xl text-[#183D30]">What goes into it</h3><div className="mt-4 flex flex-wrap gap-2">{ingredients.map((item, index) => <span key={index} className="rounded-xl bg-[#F1F4EE] px-3 py-2 text-xs font-medium text-[#536A59]">{item}</span>)}</div>{seasonings && <div className="mt-4 border-t border-[#EEF0E9] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#849084]">Seasonings & flavour</p><p className="mt-2 text-sm leading-6 text-[#536A59]">{seasonings}</p></div>}</section>
                {result.plan?.ingredients?.length ? <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Preparation ingredients</p><div className="mt-3 space-y-2">{result.plan.ingredients.map((item, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F8F4] px-3 py-2.5"><span className="text-xs text-[#536A59]">{item.name}{item.amount ? ` · ${item.amount}` : ""}</span><span className={`text-[9px] font-semibold uppercase tracking-wide ${item.availability === "available" ? "text-[#5E8767]" : item.availability === "missing" ? "text-[#A56D45]" : "text-[#899589]"}`}>{item.availability}</span></div>)}</div></section> : null}
                {result.safetyNotes?.length ? <section className="rounded-2xl border border-[#E8E1D5] bg-[#FBF8F1] p-4 text-xs leading-6 text-[#6F604B]">{result.safetyNotes.map((note, index) => <p key={index}>{note}</p>)}</section> : null}
              </aside>
            </div>
            {result.status !== "unavailable" && <form onSubmit={submitFollowUp} className="mt-4 rounded-[26px] border border-[#E5E8DF] bg-white p-5"><label htmlFor="studio-followup" className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">{result.questions?.length ? "Your answer" : "Keep shaping your meal"}</label><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input id="studio-followup" value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={1200} placeholder={result.questions?.[0] ? "Tell Ahuva what you mean…" : "Change an ingredient or add a detail…"} className={`${fieldClass} min-w-0 flex-1`} /><button type="submit" disabled={!followUp.trim() || loading} className="rounded-2xl bg-[#183D30] px-6 py-3 text-xs font-semibold text-white disabled:opacity-40">{loading ? "Working…" : "Send to Ahuva →"}</button></div></form>}
          </section>
        )}
      </div>

      {activeModule && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#172B22]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModule(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="module-title" className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-[#E5E8DF] bg-[#FBFCF9] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">{moduleContent[activeModule].eyebrow}</p><h3 id="module-title" className="mt-1 font-serif text-2xl text-[#183D30]">{moduleContent[activeModule].title}</h3><p className="mt-2 text-sm leading-6 text-[#718076]">{moduleContent[activeModule].description}</p></div>
              <button type="button" onClick={() => setActiveModule(null)} aria-label="Close module" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF2EC] text-xl text-[#536A59]">×</button>
            </div>
            {activeModule === "ingredients" && <div className="mt-5"><label htmlFor="ingredient-draft" className="sr-only">Add ingredients</label><textarea id="ingredient-draft" autoFocus rows={4} value={ingredientDraft} onChange={(event) => setIngredientDraft(event.target.value)} placeholder="Rice, beans, tomatoes, onions…" className={fieldClass} /><p className="mt-2 text-xs leading-5 text-[#899589]">Separate items with commas or put each on a new line.</p><button type="button" onClick={addIngredients} disabled={!parseIngredients(ingredientDraft).length} className="mt-4 w-full rounded-2xl bg-[#183D30] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-40">Add to overview</button></div>}
            {activeModule === "servings" && <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4"><span className="text-sm font-semibold text-[#365444]">People eating</span><div className="flex items-center gap-4"><button type="button" aria-label="Reduce servings" onClick={() => setServings((value) => Math.max(1, value - 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] text-xl">−</button><span className="w-5 text-center text-xl font-semibold tabular-nums">{servings}</span><button type="button" aria-label="Increase servings" onClick={() => setServings((value) => Math.min(8, value + 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] text-xl">＋</button></div></div>}
            {activeModule === "style" && <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" aria-pressed={mode === "your-way"} onClick={() => setMode("your-way")} className={`rounded-2xl border p-4 text-left ${mode === "your-way" ? "border-[#789780] bg-[#EEF3EA]" : "border-[#E5E8DF] bg-white"}`}><span className="block text-sm font-semibold text-[#365444]">My way</span><span className="mt-1 block text-xs leading-5 text-[#849084]">Keep my familiar method</span></button><button type="button" aria-pressed={mode === "ahuvas-way"} onClick={() => setMode("ahuvas-way")} className={`rounded-2xl border p-4 text-left ${mode === "ahuvas-way" ? "border-[#789780] bg-[#EEF3EA]" : "border-[#E5E8DF] bg-white"}`}><span className="block text-sm font-semibold text-[#365444]">Ahuva&apos;s way</span><span className="mt-1 block text-xs leading-5 text-[#849084]">Guide me through preparation</span></button></div>}
            {activeModule === "flavour" && <div className="mt-5"><label htmlFor="studio-seasonings" className="sr-only">Seasonings and flavourings</label><textarea id="studio-seasonings" autoFocus rows={4} value={seasonings} onChange={(event) => setSeasonings(event.target.value)} placeholder="Salt, stock, spices, sauces, herbs…" className={fieldClass} /><p className="mt-2 text-xs leading-5 text-[#899589]">Optional. Ahuva can ask if a detail matters to the meal.</p></div>}
            {activeModule !== "ingredients" && <button type="button" onClick={() => setActiveModule(null)} className="mt-5 w-full rounded-2xl bg-[#183D30] px-5 py-3.5 text-sm font-semibold text-white">Done</button>}
          </section>
        </div>
      )}
    </main>
  );
}
