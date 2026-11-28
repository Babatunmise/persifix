"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { supabase } from "@/supabase";

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

type IngredientSection = "ingredients" | "seasonings";

const fieldClass = "w-full rounded-2xl border border-[#E4E8DF] bg-white px-4 py-3 text-[15px] leading-6 text-[#20392F] outline-none transition placeholder:text-[#A1AAA0] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10";
const cardClass = "rounded-[24px] border border-[#E5E8DF] bg-white p-4 shadow-[0_10px_30px_rgba(35,61,47,0.035)] sm:p-5";

function addUnique(current: string[], value: string) {
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || current.some((item) => item.toLocaleLowerCase() === clean.toLocaleLowerCase())) return current;
  return [...current, clean];
}

export default function AhuvaCookingStudio() {
  const [meal, setMeal] = useState("");
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [seasoningDraft, setSeasoningDraft] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [seasonings, setSeasonings] = useState<string[]>([]);
  const [peopleEating, setPeopleEating] = useState(2);
  const [personalServings, setPersonalServings] = useState(1);
  const [preparationMethod, setPreparationMethod] = useState("Not decided");
  const [activeSuggestions, setActiveSuggestions] = useState<IngredientSection | null>(null);
  const [result, setResult] = useState<AhuvaResult | null>(null);
  const [details, setDetails] = useState("");
  const [conversation, setConversation] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalServings = useMemo(
    () => Math.max(1, peopleEating - 1 + personalServings),
    [peopleEating, personalServings],
  );

  function addItem(section: IngredientSection) {
    if (section === "ingredients") {
      setIngredients((current) => addUnique(current, ingredientDraft));
      setIngredientDraft("");
    } else {
      setSeasonings((current) => addUnique(current, seasoningDraft));
      setSeasoningDraft("");
    }
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>, section: IngredientSection) {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem(section);
    }
  }

  async function requestAhuva(turns: { role: "user" | "assistant"; content: string }[], requestDetails: string) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      let session;
      try {
        const authResult = await supabase.auth.getSession();
        session = authResult.data.session;
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
            mode: "your-way",
            details: requestDetails,
            servings: String(totalServings),
            conversation: turns,
          }),
        });
      } catch {
        setError("Ahuva's nutrition service could not be reached. Check your connection and try again. Your meal is still here.");
        return;
      }

      const data = await response.json().catch(() => null);
      if (data && typeof data === "object" && typeof data.assistantMessage === "string") {
        setDetails(requestDetails);
        setConversation(turns);
        setResult(data as AhuvaResult);
        return;
      }
      if (response.status === 401) setError("Your session has expired. Sign in again. Your meal is still here.");
      else if (response.status === 429) setError("Ahuva is busy right now. Wait a moment and try again.");
      else if (response.status === 503) setError("Ahuva's nutrition intelligence is not connected yet. Your meal details are still here.");
      else if (response.status >= 500) setError("Ahuva couldn't complete that request. Your meal is still here; please try again.");
      else setError(data?.error ?? "Something needs attention before Ahuva can continue. Your meal is still here.");
    } finally {
      setLoading(false);
    }
  }

  async function analyseMeal() {
    if (!meal.trim() || ingredients.length === 0 || loading) return;
    const brief = [
      `Meal the user intends to prepare: ${meal.trim()}`,
      `Confirmed main ingredients: ${ingredients.join("; ")}`,
      `Confirmed seasonings, sauces, herbs and spices: ${seasonings.length ? seasonings.join("; ") : "Not specified"}`,
      `People eating at this meal, including the user: ${peopleEating}`,
      `Personal servings the user expects to consume across meals: ${personalServings}`,
      `Total portions to prepare, assuming one portion for each other diner: ${totalServings}`,
      `Preparation method, if known: ${preparationMethod}`,
      "Task: explain ingredient composition and relevant heart-health considerations; recommend practical quantity adjustments and optional healthier adaptations. Do not teach cooking steps.",
    ].join("\n");
    await requestAhuva([{ role: "user", content: brief }], brief);
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
    setError("");
  }

  function IngredientChips({ items, section }: { items: string[]; section: IngredientSection }) {
    const remove = (index: number) => {
      if (section === "ingredients") setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index));
      else setSeasonings((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };
    return (
      <div className="flex min-h-12 items-center gap-2 overflow-x-auto overscroll-x-contain pb-1" aria-label={section === "ingredients" ? "Selected ingredients" : "Selected seasonings"}>
        {items.length ? items.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#EEF3EA] px-3.5 py-2 text-sm text-[#365444]">
            {item}
            <button type="button" onClick={() => remove(index)} aria-label={`Remove ${item}`} className="text-base leading-none text-[#809181] hover:text-[#9A4E38]">×</button>
          </span>
        )) : <span className="text-sm text-[#9AA69A]">Your {section === "ingredients" ? "ingredients" : "seasonings"} will appear here.</span>}
      </div>
    );
  }

  function EntrySection({ section, title, description, items, draft, setDraft }: {
    section: IngredientSection;
    title: string;
    description: string;
    items: string[];
    draft: string;
    setDraft: (value: string) => void;
  }) {
    return (
      <section className={cardClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">{section === "ingredients" ? "01 · Main composition" : "02 · Flavour and seasoning"}</p>
            <h3 className="mt-1 font-serif text-xl text-[#183D30]">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-[#879487]">{description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F4F6F1] px-2.5 py-1 text-[11px] text-[#738174]">{items.length} added</span>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-[#DDE5DA] bg-[#FBFCF9] px-3 py-2">
          <IngredientChips items={items} section={section} />
        </div>
        <div className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor={section === "ingredients" ? "ingredient-entry" : "seasoning-entry"}>Add {title.toLowerCase()}</label>
          <input
            id={section === "ingredients" ? "ingredient-entry" : "seasoning-entry"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => handleEnter(event, section)}
            placeholder={section === "ingredients" ? "Add one ingredient…" : "Add one seasoning, herb or sauce…"}
            className={`${fieldClass} min-w-0 flex-1`}
          />
          <button type="button" onClick={() => addItem(section)} disabled={!draft.trim()} className="shrink-0 rounded-2xl bg-[#183D30] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add</button>
        </div>
        <div className="mt-3">
          <button type="button" onClick={() => setActiveSuggestions(activeSuggestions === section ? null : section)} className="text-xs font-semibold text-[#56735E] underline decoration-[#C7D5C4] underline-offset-4">
            {activeSuggestions === section ? "Hide ingredient suggestions" : "Explore typical suggestions"}
          </button>
          {activeSuggestions === section && (
            <p className="mt-2 rounded-xl bg-[#F7F8F4] p-3 text-xs leading-5 text-[#718076]">
              Meal-based suggestions will appear here when Ahuva's suggestion service is connected. For now, add only the items you actually plan to use. Nothing is assumed to be in your kitchen.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6F0] pb-28 text-[#20392F]">
      <header className="sticky top-0 z-20 border-b border-[#20392F]/10 bg-[#F7F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-white">a</div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7C897D]">Sanctos · Kitchen</p><h1 className="font-serif text-[22px] leading-none tracking-tight">Ahuva</h1></div>
          </div>
          <span className="hidden rounded-full border border-[#DCE4DA] bg-white/70 px-3 py-2 text-xs text-[#68796E] sm:block">Your food. Your heart health.</span>
          <button type="button" onClick={startAgain} className="text-xs font-semibold text-[#627568] transition hover:text-[#183D30]">New meal ↗</button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-7 sm:pt-10 lg:px-8">
        {!result ? (
          <>
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your kitchen, your rhythm</p>
              <h2 className="mt-2 font-serif text-[2.5rem] leading-[1.02] tracking-tight text-[#183D30] sm:text-5xl">What are you making?</h2>
              <label htmlFor="studio-meal" className="sr-only">What meal do you have in mind?</label>
              <input id="studio-meal" value={meal} onChange={(event) => setMeal(event.target.value)} placeholder="Name the meal you have in mind…" className="mt-4 w-full border-0 border-b border-[#DDE4DA] bg-transparent px-0 py-3 font-serif text-xl text-[#20392F] outline-none placeholder:text-[#AEB8AC] focus:border-[#789780] focus:ring-0 sm:text-2xl" />
            </div>

            <div className="space-y-3">
              <EntrySection section="ingredients" title="Main ingredients" description="Add each ingredient separately. You can remove or change any item." items={ingredients} draft={ingredientDraft} setDraft={setIngredientDraft} />
              <EntrySection section="seasonings" title="Seasonings" description="Keep salt, stock, sauces, herbs and spices separate from the main ingredients." items={seasonings} draft={seasoningDraft} setDraft={setSeasoningDraft} />
            </div>

            <section className={`${cardClass} mt-3`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">03 · Household servings</p>
              <h3 className="mt-1 font-serif text-xl text-[#183D30]">How much are you preparing?</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F7F8F4] p-4">
                  <label htmlFor="people-eating" className="block text-sm font-semibold text-[#365444]">People eating, including you</label>
                  <div className="mt-3 flex items-center justify-between">
                    <button type="button" aria-label="Reduce people eating" onClick={() => setPeopleEating((value) => Math.max(1, value - 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] bg-white text-xl">−</button>
                    <span id="people-eating" className="text-2xl font-semibold tabular-nums">{peopleEating}</span>
                    <button type="button" aria-label="Increase people eating" onClick={() => setPeopleEating((value) => Math.min(20, value + 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] bg-white text-xl">＋</button>
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F7F8F4] p-4">
                  <label htmlFor="personal-servings" className="block text-sm font-semibold text-[#365444]">Your personal servings</label>
                  <div className="mt-1 text-xs leading-5 text-[#849084]">How many portions will you want from this meal, including later?</div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" aria-label="Reduce your personal servings" onClick={() => setPersonalServings((value) => Math.max(1, value - 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] bg-white text-xl">−</button>
                    <span id="personal-servings" className="text-2xl font-semibold tabular-nums">{personalServings}</span>
                    <button type="button" aria-label="Increase your personal servings" onClick={() => setPersonalServings((value) => Math.min(20, value + 1))} className="h-10 w-10 rounded-full border border-[#DCE4DA] bg-white text-xl">＋</button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E7ECE3] px-4 py-3">
                <span className="text-sm text-[#536A59]">Total portions to prepare</span>
                <span className="font-semibold tabular-nums text-[#183D30]">{totalServings} portions</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#899589]">For now, Ahuva assumes one portion for each other person. Individual family allocations and automatic journal sharing will come with family connections later.</p>
            </section>

            <section className={`${cardClass} mt-3`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">04 · Preparation context</p>
              <h3 className="mt-1 font-serif text-xl text-[#183D30]">How will it be prepared?</h3>
              <p className="mt-1 text-xs leading-5 text-[#879487]">This helps Ahuva assess the meal's nutritional impact, not teach you how to cook.</p>
              <label htmlFor="preparation-method" className="sr-only">Preparation method</label>
              <select id="preparation-method" value={preparationMethod} onChange={(event) => setPreparationMethod(event.target.value)} className={`${fieldClass} mt-3`}>
                {["Not decided", "Boiled", "Steamed", "Baked", "Grilled", "Pan-fried", "Deep-fried", "Roasted", "Mixed or multiple methods", "Other"].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </section>

            <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-[#183D30] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><p className="font-serif text-xl">Your meal, understood.</p><p className="mt-1 text-xs text-white/65">Ingredients, quantities and heart-health considerations.</p></div>
              <button type="button" onClick={analyseMeal} disabled={!meal.trim() || ingredients.length === 0 || loading} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-[#E7EBDD] px-6 py-3 text-sm font-bold text-[#183D30] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">{loading ? "Reviewing…" : "Review my meal"} <span aria-hidden="true">↗</span></button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#EBD9CF] bg-[#FFF7F1] px-4 py-3 text-sm leading-6 text-[#8B4229]">{error}</p>}
          </>
        ) : (
          <section>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Ahuva · Nutrition review</p><h2 className="mt-2 font-serif text-4xl tracking-tight text-[#183D30] sm:text-5xl">{meal}</h2><p className="mt-2 text-sm text-[#718076]">{totalServings} portions · {ingredients.length} main ingredients · {seasonings.length} seasonings</p></div>
              <button type="button" onClick={startAgain} className="self-start rounded-full border border-[#DCE4DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#536A59]">← New meal</button>
            </div>
            <section className={cardClass}>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Ahuva's understanding</p>
              <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Your meal, made better.</h3>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#405C4D]">{result.assistantMessage}</p>
              {result.interpretation && <div className="mt-4 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">Meal overview</p><p className="mt-2 text-sm leading-6 text-[#365444]">{result.interpretation}</p></div>}
              {result.status === "unavailable" && <p className="mt-4 rounded-xl bg-[#F7F8F4] p-4 text-xs leading-6 text-[#718076]">Ahuva's nutrition intelligence is not connected for this request yet. Your meal details remain here; no nutritional values or health conclusions have been invented.</p>}
            </section>
            {result.recommendations?.length ? <section className={`${cardClass} mt-3`}><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Practical adjustments</p><div className="mt-3 space-y-3">{result.recommendations.map((item, index) => <div key={index} className="rounded-2xl bg-[#F7F8F4] p-4"><p className="text-sm font-semibold text-[#365444]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#718076]">{item.detail}</p></div>)}</div></section> : null}
            {result.questions?.length ? <section className={`${cardClass} mt-3`}><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#718477]">One detail to settle</p><p className="mt-3 text-sm leading-7 text-[#405C4D]">{result.questions[0]}</p></section> : null}
            {result.safetyNotes?.length ? <section className="mt-3 rounded-2xl border border-[#E8E1D5] bg-[#FBF8F1] p-4 text-xs leading-6 text-[#6F604B]">{result.safetyNotes.map((note, index) => <p key={index}>{note}</p>)}</section> : null}
            <section className={`${cardClass} mt-3`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">What you entered</p>
              <div className="mt-3"><p className="text-xs font-semibold text-[#536A59]">Main ingredients</p><p className="mt-1 text-sm leading-6 text-[#718076]">{ingredients.join(", ")}</p></div>
              <div className="mt-3"><p className="text-xs font-semibold text-[#536A59]">Seasonings</p><p className="mt-1 text-sm leading-6 text-[#718076]">{seasonings.join(", ") || "Not specified"}</p></div>
              <div className="mt-3"><p className="text-xs font-semibold text-[#536A59]">Preparation method</p><p className="mt-1 text-sm text-[#718076]">{preparationMethod}</p></div>
            </section>
            {result.status !== "unavailable" && <form onSubmit={submitFollowUp} className={`${cardClass} mt-3`}><label htmlFor="studio-followup" className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">Ask Ahuva about this meal</label><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input id="studio-followup" value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={1200} placeholder="Ask about an ingredient or adjustment…" className={`${fieldClass} min-w-0 flex-1`} /><button type="submit" disabled={!followUp.trim() || loading} className="rounded-2xl bg-[#183D30] px-6 py-3 text-xs font-semibold text-white disabled:opacity-40">{loading ? "Working…" : "Send →"}</button></div></form>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#EBD9CF] bg-[#FFF7F1] px-4 py-3 text-sm leading-6 text-[#8B4229]">{error}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
