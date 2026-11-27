"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/supabase";

type Mode = "your-way" | "ahuvas-way";
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
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[#758477]";

export default function AhuvaCookingStudio() {
  const [meal, setMeal] = useState("");
  const [ingredientText, setIngredientText] = useState("");
  const [seasonings, setSeasonings] = useState("");
  const [servings, setServings] = useState(2);
  const [mode, setMode] = useState<Mode>("your-way");
  const [showSeasonings, setShowSeasonings] = useState(true);
  const [result, setResult] = useState<AhuvaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCookingStep, setActiveCookingStep] = useState(0);

  const ingredients = useMemo(
    () => ingredientText.split(/[,\\n]+/).map((item) => item.trim()).filter(Boolean),
    [ingredientText],
  );

  function removeIngredient(index: number) {
    setIngredientText(ingredients.filter((_, itemIndex) => itemIndex !== index).join(", "));
  }

  async function cook() {
    if (!meal.trim() || ingredients.length === 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Sign in again. Your meal is still here.");
        return;
      }
      const brief = [
        `Meal the user wants to eat: ${meal.trim()}`,
        `Ingredients the user confirms having: I have ${ingredients.join(", ")}`,
        `Salt-based seasonings, sauces, herbs and spices the user uses or has: ${seasonings.trim() || "Not specified"}`,
      ].join("\\n");
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          intent: "meal",
          mode,
          details: brief,
          servings: String(servings),
          conversation: [{ role: "user", content: brief }],
        }),
      });
      const data = await response.json().catch(() => null);
      if (data && typeof data === "object" && typeof data.assistantMessage === "string") {
        setResult(data as AhuvaResult);
      } else if (response.status === 401) {
        setError("Your session has expired. Sign in again. Your meal is still here.");
      } else if (response.status === 429) {
        setError("Ahuva is receiving too many requests right now. Please wait briefly and try again.");
      } else {
        setError(data?.error ?? "Ahuva couldn't complete this response. Your meal is still here; please try again.");
      }
    } catch {
      setError("We couldn't reach Ahuva. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function startAgain() {
    setResult(null);
    setActiveCookingStep(0);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#F7F6F0] text-[#20392F]">
      <header className="sticky top-0 z-20 border-b border-[#20392F]/10 bg-[#F7F6F0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-white">a</div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#7C897D]">Sanctos · Kitchen</p>
              <h1 className="font-serif text-[22px] leading-none tracking-tight">Ahuva</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#DCE4DA] bg-white/70 px-3 py-2 text-xs text-[#68796E] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#6F9678]" /> Your cooking studio
          </div>
          <button type="button" onClick={startAgain} className="text-xs font-semibold text-[#627568] transition hover:text-[#183D30]">New meal ↗</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:pt-12 lg:px-8">
        {!result ? (
          <>
            <div className="mb-8 flex flex-col justify-between gap-5 lg:mb-10 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your kitchen, your rhythm</p>
                <h2 className="mt-3 font-serif text-[2.65rem] leading-[1.02] tracking-tight text-[#183D30] sm:text-6xl">What are we making?</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#718076] sm:text-base">Bring the meal to the counter. Add what goes into it, make it yours, and let Ahuva help with the rest.</p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full bg-[#E9EEE5] px-3 py-2 text-[11px] font-medium text-[#536A59] lg:self-auto">
                <span>✳</span> Start anywhere. Change anything.
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:items-start">
              <section className="overflow-hidden rounded-[28px] border border-[#E5E8DF] bg-white shadow-[0_18px_55px_rgba(35,61,47,0.055)]">
                <div className="border-b border-[#EEF0E9] px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">01 · The meal</p>
                      <h3 className="mt-1 font-serif text-2xl text-[#183D30]">Set the scene</h3>
                    </div>
                    <span className="text-2xl text-[#9BAA98]">✳</span>
                  </div>
                  <label htmlFor="studio-meal" className="sr-only">What would you like to cook?</label>
                  <input id="studio-meal" value={meal} onChange={(event) => setMeal(event.target.value)} placeholder="What would you love to cook today?" className="mt-5 w-full border-0 border-b border-[#E6EAE2] bg-transparent px-0 py-3 font-serif text-2xl text-[#20392F] outline-none placeholder:text-[#B1B9AF] focus:border-[#789780] focus:ring-0 sm:text-3xl" />
                </div>

                <div className="px-5 py-6 sm:px-7">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">02 · The composition</p>
                      <h3 className="mt-1 font-serif text-2xl text-[#183D30]">Bring your ingredients together</h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#F1F4EE] px-3 py-1.5 text-[10px] font-semibold text-[#667B69]">{ingredients.length} added</span>
                  </div>

                  <div className="mt-5 min-h-[150px] rounded-2xl border border-dashed border-[#D9E1D6] bg-[#FAFBF8] p-4 sm:p-5">
                    {ingredients.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ingredients.map((item, index) => (
                          <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-xl border border-[#E3E9E0] bg-white px-3 py-2.5 text-sm font-medium text-[#365444] shadow-[0_2px_8px_rgba(35,61,47,0.035)]">
                            {item}
                            <button type="button" onClick={() => removeIngredient(index)} aria-label={`Remove ${item}`} className="text-lg leading-none text-[#9AA69A] transition hover:text-[#9A4E38]">×</button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-[112px] flex-col items-center justify-center text-center">
                        <span className="text-3xl text-[#A9B6A6]">＋</span>
                        <p className="mt-2 text-sm font-medium text-[#68796E]">Your ingredients will take shape here</p>
                        <p className="mt-1 text-xs text-[#9AA69A]">Add them one by one or bring in a whole list.</p>
                      </div>
                    )}
                  </div>
                  <label htmlFor="studio-ingredients" className="mt-4 block text-xs font-semibold text-[#536A59]">Add ingredients</label>
                  <textarea id="studio-ingredients" rows={2} value={ingredientText} onChange={(event) => setIngredientText(event.target.value)} placeholder="Rice, beans, tomatoes, onions, olive oil…" className={`${fieldClass} mt-2 resize-y bg-[#FCFCFA]`} />
                  <p className="mt-2 text-[11px] leading-5 text-[#909B90]">Separate ingredients with commas or put each on a new line. You can edit or remove any item above.</p>
                </div>
              </section>

              <aside className="space-y-5">
                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 shadow-[0_14px_40px_rgba(35,61,47,0.04)] sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">03 · At the table</p>
                      <h3 className="mt-1 font-serif text-2xl text-[#183D30]">Who's joining?</h3>
                    </div>
                    <span className="text-xl text-[#8FA18D]">♧</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#F7F8F4] p-3">
                    <div>
                      <p className="text-sm font-semibold text-[#365444]">Servings</p>
                      <p className="mt-0.5 text-xs text-[#899589]">How many are eating?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label="Reduce servings" onClick={() => setServings((value) => Math.max(1, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE4DA] bg-white text-lg text-[#365444]">−</button>
                      <span className="w-4 text-center text-lg font-semibold tabular-nums">{servings}</span>
                      <button type="button" aria-label="Increase servings" onClick={() => setServings((value) => Math.min(8, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE4DA] bg-white text-lg text-[#365444]">＋</button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 shadow-[0_14px_40px_rgba(35,61,47,0.04)] sm:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">04 · Your style</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#183D30]">How shall we cook?</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#F4F6F1] p-1">
                    <button type="button" aria-pressed={mode === "your-way"} onClick={() => setMode("your-way")} className={`rounded-xl px-3 py-3 text-left transition ${mode === "your-way" ? "bg-white text-[#29483B] shadow-sm" : "text-[#849084]"}`}>
                      <span className="block text-xs font-semibold">My way</span>
                      <span className="mt-1 block text-[10px] leading-4 opacity-75">Keep my method</span>
                    </button>
                    <button type="button" aria-pressed={mode === "ahuvas-way"} onClick={() => setMode("ahuvas-way")} className={`rounded-xl px-3 py-3 text-left transition ${mode === "ahuvas-way" ? "bg-white text-[#29483B] shadow-sm" : "text-[#849084]"}`}>
                      <span className="block text-xs font-semibold">Ahuva's way</span>
                      <span className="mt-1 block text-[10px] leading-4 opacity-75">Show me an approach</span>
                    </button>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[26px] border border-[#E5E8DF] bg-white shadow-[0_14px_40px_rgba(35,61,47,0.04)]">
                  <button type="button" onClick={() => setShowSeasonings((value) => !value)} aria-expanded={showSeasonings} className="flex w-full items-center justify-between p-5 text-left sm:p-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">05 · The finishing touches</p>
                      <h3 className="mt-1 font-serif text-xl text-[#183D30]">Seasonings & flavour</h3>
                      <p className="mt-1 text-xs text-[#899589]">Salt, spices, sauces, herbs and more</p>
                    </div>
                    <span className="text-lg text-[#829482]">{showSeasonings ? "−" : "+"}</span>
                  </button>
                  {showSeasonings && (
                    <div className="border-t border-[#EEF0E9] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                      <label htmlFor="studio-seasonings" className="sr-only">Seasonings and flavourings</label>
                      <textarea id="studio-seasonings" rows={3} value={seasonings} onChange={(event) => setSeasonings(event.target.value)} placeholder="What do you use to bring the flavour? For example: salt, stock, spices, sauces, herbs…" className={`${fieldClass} resize-y bg-[#FCFCFA]`} />
                      <p className="mt-2 text-[11px] leading-5 text-[#909B90]">Optional for now. Ahuva will ask if a missing detail is important.</p>
                    </div>
                  )}
                </section>
              </aside>
            </div>

            <div className="mt-6 flex flex-col items-stretch justify-between gap-4 rounded-[26px] bg-[#183D30] p-5 text-white shadow-[0_18px_45px_rgba(24,61,48,0.16)] sm:flex-row sm:items-center sm:px-7 sm:py-6">
              <div>
                <p className="font-serif text-2xl">Ready when you are.</p>
                <p className="mt-1 text-xs text-white/65">Your meal. Your ingredients. Your way.</p>
              </div>
              <button type="button" onClick={cook} disabled={!meal.trim() || ingredients.length === 0 || loading} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#E7EBDD] px-7 py-4 text-sm font-bold text-[#183D30] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
                {loading ? "Ahuva is preparing your workspace…" : "Cook with Ahuva"}
                <span aria-hidden="true" className="text-lg">↗</span>
              </button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#EBD9CF] bg-[#FFF7F1] px-4 py-3 text-sm text-[#8B4229]">{error}</p>}
          </>
        ) : (
          <section className="mx-auto max-w-5xl">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your cooking studio · Meal workspace</p>
                <h2 className="mt-2 font-serif text-4xl tracking-tight text-[#183D30] sm:text-5xl">{meal}</h2>
                <p className="mt-2 text-sm text-[#718076]">{servings} servings · {ingredients.length} ingredients</p>
              </div>
              <button type="button" onClick={startAgain} className="self-start rounded-full border border-[#DCE4DA] bg-white px-4 py-2.5 text-xs font-semibold text-[#536A59]">← Edit meal</button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <div className="space-y-5">
                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 shadow-sm sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Ahuva's understanding</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Your meal, made better.</h3>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#405C4D]">{result.assistantMessage}</p>
                  {result.interpretation && <div className="mt-5 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">The meal we're making</p><p className="mt-2 text-sm leading-6 text-[#365444]">{result.interpretation}</p></div>}
                  {result.status === "unavailable" && <p className="mt-4 rounded-xl bg-[#F7F8F4] p-4 text-xs leading-6 text-[#718076]">{result.reason === "sensitive_context" ? "This experience cannot assess personal medical conditions, allergies or medication-related dietary needs. General ingredient information is not a personal medical assessment." : "Ahuva's guided cooking conversation is not connected for this request. Your meal details remain available."}</p>}
                </section>

                {result.questions?.length ? (
                  <section className="rounded-[26px] border border-[#DCE7D9] bg-[#F4F8F1] p-5 sm:p-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#718477]">One detail to settle</p>
                    <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Ahuva wants to understand something.</h3>
                    <p className="mt-3 text-sm leading-7 text-[#405C4D]">{result.questions[0]}</p>
                  </section>
                ) : null}

                {result.recommendations?.length ? (
                  <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 sm:p-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Ways to make it yours</p>
                    <div className="mt-4 space-y-3">
                      {result.recommendations.map((item, index) => <div key={index} className="rounded-2xl bg-[#F7F8F4] p-4"><p className="text-sm font-semibold text-[#365444]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#718076]">{item.detail}</p></div>)}
                    </div>
                  </section>
                ) : null}

                {result.plan?.preparation?.length ? (
                  <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Cooking in progress</p>
                        <h3 className="mt-1 font-serif text-2xl text-[#183D30]">Let's make it.</h3>
                      </div>
                      <span className="rounded-full bg-[#EEF3EA] px-3 py-1.5 text-[10px] font-semibold text-[#536A59]">Step {activeCookingStep + 1} of {result.plan.preparation.length}</span>
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#EDF0E9]"><div className="h-full rounded-full bg-[#6F9678] transition-all" style={{ width: `${((activeCookingStep + 1) / result.plan.preparation.length) * 100}%` }} /></div>
                    <div className="mt-6 rounded-2xl bg-[#F7F8F4] p-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#849084]">Step {activeCookingStep + 1}</p>
                      <p className="mt-3 text-base leading-7 text-[#365444]">{result.plan.preparation[activeCookingStep]}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <button type="button" onClick={() => setActiveCookingStep((step) => Math.max(0, step - 1))} disabled={activeCookingStep === 0} className="rounded-full border border-[#DCE4DA] px-4 py-2.5 text-xs font-semibold text-[#536A59] disabled:opacity-35">Previous</button>
                      <button type="button" onClick={() => setActiveCookingStep((step) => Math.min(result.plan!.preparation.length - 1, step + 1))} disabled={activeCookingStep >= result.plan.preparation.length - 1} className="rounded-full bg-[#183D30] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{activeCookingStep === result.plan.preparation.length - 1 ? "Finished" : "Next step →"}</button>
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5">
                <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Meal composition</p>
                  <h3 className="mt-1 font-serif text-xl text-[#183D30]">What goes into it</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ingredients.map((item, index) => <span key={index} className="rounded-xl bg-[#F1F4EE] px-3 py-2 text-xs font-medium text-[#536A59]">{item}</span>)}
                  </div>
                  {seasonings && <div className="mt-4 border-t border-[#EEF0E9] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#849084]">Seasonings & flavour</p><p className="mt-2 text-sm leading-6 text-[#536A59]">{seasonings}</p></div>}
                </section>
                {result.plan?.ingredients?.length ? (
                  <section className="rounded-[26px] border border-[#E5E8DF] bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#849084]">Preparation ingredients</p>
                    <div className="mt-3 space-y-2">{result.plan.ingredients.map((item, index) => <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F8F4] px-3 py-2.5"><span className="text-xs text-[#536A59]">{item.name}{item.amount ? ` · ${item.amount}` : ""}</span><span className={`text-[9px] font-semibold uppercase tracking-wide ${item.availability === "available" ? "text-[#5E8767]" : item.availability === "missing" ? "text-[#A56D45]" : "text-[#899589]"}`}>{item.availability}</span></div>)}</div>
                  </section>
                ) : null}
                {result.safetyNotes?.length ? <section className="rounded-2xl border border-[#E8E1D5] bg-[#FBF8F1] p-4 text-xs leading-6 text-[#6F604B]">{result.safetyNotes.map((note, index) => <p key={index}>{note}</p>)}</section> : null}
              </aside>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF7F1] p-4 text-sm text-[#8B4229]">{error}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
