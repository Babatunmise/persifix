"use client";

import { useRef, useState, type FormEvent } from "react";
import { supabase } from "@/supabase";
import { getCombinedMealInsight, getIngredientInsights } from "@/lib/ahuva-ingredient-intelligence";
import { getIngredientVariantGuide } from "@/lib/ahuva-ingredient-variants";
import { createAhuvaRequestLock } from "@/lib/ahuva-request-lock.mjs";
import AhuvaServingReview from "@/components/AhuvaServingReview";

type EntryIntent = "meal" | "ingredients";
type CookingMode = "your-way" | "ahuvas-way";
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

export default function AhuvaKitchen() {
  const intent: EntryIntent = "meal";
  const [details, setDetails] = useState("");
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [resultScreen, setResultScreen] = useState<1 | 2 | 3 | 4>(1);
  const [mealIdea, setMealIdea] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [seasonings, setSeasonings] = useState("");
  const [mode, setMode] = useState<CookingMode>("your-way");
  const [servings, setServings] = useState("2");
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [result, setResult] = useState<CookingResult | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [showGuidedCooking, setShowGuidedCooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestLock = useRef(createAhuvaRequestLock());

  function reset() {
    if (requestLock.current.isLocked()) return;
    setStage(1);
    setResultScreen(1);
    setMealIdea("");
    setIngredients("");
    setSeasonings("");
    setDetails("");
    setServings("2");
    setMode("your-way");
    setConversation([]);
    setResult(null);
    setFollowUp("");
    setActiveStep(0);
    setShowGuidedCooking(false);
    setLoading(false);
    setError(null);
  }

  async function askAhuva(turns: Turn[], modeOverride: CookingMode = mode, detailsOverride?: string): Promise<boolean> {
    const brief = detailsOverride ?? details;
    if (!brief.trim() || !requestLock.current.acquire()) return false;

    // Lock synchronously before React re-renders, preventing rapid-tap duplicates.
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Sign in again. Your meal details are still here.");
        return false;
      }

      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          intent,
          mode: modeOverride,
          details: brief.trim(),
          servings,
          conversation: turns,
        }),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // A proxy or provider failure may return a non-JSON response.
      }

      if (data && typeof data === "object" &&
          "assistantMessage" in data && typeof data.assistantMessage === "string") {
        setResult(data as CookingResult);
        setResultScreen(1);
        setActiveStep(0);
        setConversation(turns);
        return true;
      }

      const serverError = data && typeof data === "object" &&
        "error" in data && typeof data.error === "string" ? data.error : null;
      if (response.status === 401) {
        setError("Your session has expired. Sign in again. Your meal details are still here.");
      } else if (response.status === 429) {
        setError("Ahuva is receiving too many requests right now. Please wait briefly before continuing.");
      } else {
        setError(serverError ?? "Ahuva couldn’t complete the cooking response. Please try again later.");
      }
      return false;
    } catch {
      setError("We couldn’t reach Ahuva. Your meal details are saved; check your connection and retry.");
      return false;
    } finally {
      requestLock.current.release();
      setLoading(false);
    }
  }

  function continueStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage === 1 && mealIdea.trim()) {
      setStage(2);
      return;
    }
    if (stage === 2 && ingredients.trim() && seasonings.trim()) {
      setStage(3);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mealIdea.trim() || !ingredients.trim() || !servings || loading) return;
    const brief = [
      `Meal the user wants to eat: ${mealIdea.trim()}`,
      `Ingredients the user confirms having: I have ${ingredients.trim()}`,
      `Salt-based seasonings, sauces, herbs and spices the user uses or has: ${seasonings.trim() || "Not specified"}`,
    ].join("\\n");
    setDetails(brief);
    const turns: Turn[] = [{ role: "user", content: brief }];
    await askAhuva(turns, mode, brief);
  }

  async function chooseMeal(title: string) {
    if (loading) return;
    const turns = [...conversation, { role: "assistant" as const, content: result?.assistantMessage ?? "" }, { role: "user" as const, content: "I choose this meal: " + title + ". Please build the preparation around the ingredients I listed, keep it DASH-guided, and tell me clearly if anything is missing." }];
    await askAhuva(turns);
  }

  async function requestGuidedCooking() {
    if (loading) return;
    if (result?.plan?.preparation?.length) {
      setShowGuidedCooking(true);
      return;
    }
    setShowGuidedCooking(true);
    const request = "Please show optional guided cooking steps for this meal. Preserve my usual cooking method and do not invent ingredient quantities or assume equipment.";
    const turns = [...conversation, { role: "assistant" as const, content: result?.assistantMessage ?? "" }, { role: "user" as const, content: request }];
    await askAhuva(turns);
  }

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUp.trim() || loading) return;
    const turns = [...conversation, { role: "assistant" as const, content: result?.assistantMessage ?? "" }, { role: "user" as const, content: followUp.trim() }];
    const sent = await askAhuva(turns);
    if (sent) setFollowUp("");
  }

  const hasResult = result !== null;
  const ingredientText = [ingredients, seasonings].filter(Boolean).join(" ");
  const ingredientInsights = getIngredientInsights(ingredientText);
  const combinedMealInsights = getCombinedMealInsight(ingredientText);

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
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#718477]">DASH-guided everyday cooking</p>
          <h2 className="mt-4 font-serif text-[2.7rem] leading-[1.06] tracking-tight text-[#183D30] sm:text-6xl">Let’s make the meal you want work better for you.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68796E] sm:text-lg">Tell Ahuva what you feel like eating. She’ll work with your ingredients and seasonings to help make it more DASH-friendly.</p>
        </div>

        {!hasResult && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Let’s begin · Step {stage} of 3</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">{stage === 1 ? "What would you like to eat?" : stage === 2 ? "What ingredients and seasonings do you have?" : "How many people are eating?"}</h3>
              </div>
              {stage > 1 && <button type="button" onClick={() => setStage((stage - 1) as 1 | 2 | 3)} className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-[#718477] hover:bg-[#F1F4EE]">Back</button>}
            </div>

            {stage === 1 && (
              <form onSubmit={continueStep} className="mt-6">
                <label htmlFor="ahuva-meal-idea" className="mb-2 block text-sm font-semibold text-[#29483B]">Tell Ahuva what you feel like eating</label>
                <textarea id="ahuva-meal-idea" autoFocus rows={3} maxLength={1000} value={mealIdea} onChange={(event) => setMealIdea(event.target.value)} placeholder="A meal, dish or food you’re craving…" className="w-full resize-y rounded-2xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-4 text-[15px] leading-7 text-[#183D30] outline-none placeholder:text-[#9AA89D] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10" />
                <div className="mt-5 flex justify-end"><button type="submit" disabled={!mealIdea.trim()} className="rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Continue →</button></div>
              </form>
            )}

            {stage === 2 && (
              <form onSubmit={continueStep} className="mt-6 space-y-6">
                <div>
                  <label htmlFor="ahuva-ingredients" className="mb-2 block text-sm font-semibold text-[#29483B]">Which ingredients do you have available?</label>
                  <textarea id="ahuva-ingredients" autoFocus rows={3} maxLength={1500} value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="List the ingredients you have. Add quantities if you know them…" className="w-full resize-y rounded-2xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-4 text-[15px] leading-7 text-[#183D30] outline-none placeholder:text-[#9AA89D] focus:border-[#789780] focus:ring-4 focus:ring-[#789780]/10" />
                </div>
                <div className="rounded-2xl border border-[#E6EBE3] bg-[#F8FAF6] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Seasonings & flavour</p>
                  <label htmlFor="ahuva-seasonings" className="mt-2 mb-2 block text-sm font-semibold text-[#29483B]">What do you use to season your food?</label>
                  <p className="mb-3 text-xs leading-5 text-[#718477]">Include salt, stock cubes, seasoning blends, sauces, herbs and spices. If you use none or are unsure, say so. This helps Ahuva consider hidden sources of sodium.</p>
                  <textarea id="ahuva-seasonings" rows={2} required maxLength={1000} value={seasonings} onChange={(event) => setSeasonings(event.target.value)} placeholder="For example: salt, stock cubes, spice blends, sauces, garlic, herbs… Or type none / not sure." className="w-full resize-y rounded-xl border border-[#DCE4DA] bg-white px-4 py-3 text-sm leading-6 text-[#183D30] outline-none placeholder:text-[#9AA89D] focus:border-[#789780]" />
                </div>
                <div className="flex justify-end"><button type="submit" disabled={!ingredients.trim() || !seasonings.trim()} className="rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">Continue →</button></div>
              </form>
            )}

            {stage === 3 && (
              <form onSubmit={submit} className="mt-6">
                <label className="block text-sm font-semibold text-[#29483B]" htmlFor="ahuva-servings">How many people are eating?</label>
                <select id="ahuva-servings" value={servings} onChange={(event) => setServings(event.target.value)} className="mt-3 w-full rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-3 text-sm font-semibold text-[#29483B] outline-none focus:border-[#789780]">
                  {["1", "2", "3", "4", "5", "6", "7", "8+"].map((number) => <option key={number} value={number}>{number}</option>)}
                </select>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#29483B]">How would you like to cook?</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button type="button" aria-pressed={mode === "your-way"} onClick={() => setMode("your-way")} className={`rounded-2xl border p-4 text-left transition ${mode === "your-way" ? "border-[#315B49] bg-[#EAF1E8] ring-2 ring-[#315B49]/10" : "border-[#DCE4DA] bg-white"}`}>
                      <span className="block text-sm font-semibold text-[#29483B]">Your way</span>
                      <span className="mt-1 block text-xs leading-5 text-[#718477]">Keep your usual approach. Ahuva helps you make thoughtful adjustments.</span>
                    </button>
                    <button type="button" aria-pressed={mode === "ahuvas-way"} onClick={() => setMode("ahuvas-way")} className={`rounded-2xl border p-4 text-left transition ${mode === "ahuvas-way" ? "border-[#315B49] bg-[#EAF1E8] ring-2 ring-[#315B49]/10" : "border-[#DCE4DA] bg-white"}`}>
                      <span className="block text-sm font-semibold text-[#29483B]">Ahuva’s way</span>
                      <span className="mt-1 block text-xs leading-5 text-[#718477]">Let Ahuva suggest a more DASH-aligned approach while keeping the meal recognisable.</span>
                    </button>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-[#F6F8F3] p-4 text-sm leading-6 text-[#405C4D]">
                  <p><strong>Meal:</strong> {mealIdea}</p>
                  <p className="mt-1"><strong>Ingredients:</strong> {ingredients}</p>
                  <p className="mt-1"><strong>Seasonings:</strong> {seasonings.trim() || "Not specified"}</p>
                </div>
                <div className="mt-6 flex justify-end"><button type="submit" disabled={loading} className="inline-flex items-center gap-3 rounded-full bg-[#183D30] px-6 py-3 text-sm font-semibold text-white disabled:opacity-45">{loading ? "Ahuva is thinking…" : "Ask Ahuva"} <span aria-hidden="true">→</span></button></div>
              </form>
            )}
            {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF1E9] px-4 py-3 text-sm text-[#8B4229]">{error}</p>}
          </section>
        )}
        {loading && hasResult && <p role="status" className="mt-8 text-sm text-[#718477]">Ahuva is working on your follow-up…</p>}

        {hasResult && (
          <section className="mt-10 max-w-2xl rounded-[1.75rem] border border-[#183D30]/10 bg-white/90 p-5 shadow-[0_16px_44px_rgba(24,61,48,0.06)] sm:p-7" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Ahuva · DASH-guided cooking</p>
                <h3 className="mt-2 font-serif text-2xl text-[#183D30]">Your meal, made better</h3>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                
                <button type="button" onClick={reset} className="text-xs font-semibold text-[#718477] underline underline-offset-4">New meal</button>
              </div>
            </div>
            {resultScreen === 1 && (
              <>
                <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[#29483B]">{result?.assistantMessage}</p>
                {result?.interpretation && <div className="mt-5 rounded-2xl bg-[#F6F8F3] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Our meal</p><p className="mt-2 text-sm leading-6 text-[#29483B]">{result.interpretation}</p></div>}
                {result?.status === "unavailable" && <div className="mt-5 rounded-2xl border border-[#E5E9E1] bg-[#FBFCF9] p-4"><p className="text-xs leading-5 text-[#718477]">{result.reason === "sensitive_context" ? "Ahuva cannot assess medical conditions, allergies or medication-related dietary needs in this experience. The reviewed ingredient information remains general and is not a personal medical assessment." : "Ahuva’s guided cooking conversation is not connected yet. You can still explore the source-linked ingredient notes."}</p></div>}
              </>
            )}
            {resultScreen === 2 && (
            <section className="mt-6 rounded-2xl border border-[#DCE7D9] bg-[#F7FAF5] p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Ingredient intelligence · Evidence-linked starter notes</p>
              <h4 className="mt-1 font-serif text-xl text-[#183D30]">Understand what is in your meal</h4>
              <p className="mt-2 text-sm leading-6 text-[#68796E]">Explore what each identified ingredient contains, what it does in the body and what is actually known about its relationship with blood pressure.</p><p className="mt-2 text-xs leading-5 text-[#87958A]">General educational information linked to authoritative sources. These starter notes still require formal clinical review before production release.</p>
              {ingredientInsights.length > 0 ? <div className="mt-4 space-y-3">{ingredientInsights.map((insight) => <details key={insight.id} className="rounded-xl border border-[#E2E9DF] bg-white p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#29483B]">{insight.title}</span><span className="rounded-full bg-[#F1F4EE] px-2.5 py-1 text-[10px] font-semibold text-[#68796E]">{insight.evidence}</span></div><p className="mt-1 text-xs text-[#718477]">Composition · Biology · Blood-pressure relevance</p></summary><div className="mt-4 space-y-3 text-sm leading-6 text-[#405C4D]"><div><p className="font-semibold text-[#29483B]">What it contains</p><p className="mt-1">{insight.constituents}</p></div><div><p className="font-semibold text-[#29483B]">What happens in the body</p><p className="mt-1">{insight.biology}</p></div><div><p className="font-semibold text-[#29483B]">How it relates to blood pressure</p><p className="mt-1">{insight.bloodPressure}</p></div><div><p className="font-semibold text-[#29483B]">What this means for your meal</p><p className="mt-1">{insight.mealMeaning}</p></div><div className="border-t border-[#E8ECE5] pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718477]">Sources</p>{insight.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold text-[#315B49] underline underline-offset-2">{source.label}</a>)}</div>{getIngredientVariantGuide(insight.id) && <details className="rounded-xl border border-[#E2E9DF] bg-[#F8FAF6] p-3"><summary className="cursor-pointer text-sm font-semibold text-[#315B49]">Compare types and how to use them</summary><div className="mt-3 space-y-3">{getIngredientVariantGuide(insight.id)!.variants.map((variant) => <div key={variant.name} className="border-t border-[#E2E9DF] pt-3 first:border-0 first:pt-0"><p className="text-sm font-semibold text-[#29483B]">{variant.name}</p><p className="mt-1 text-xs leading-5 text-[#405C4D]"><strong>Best for:</strong> {variant.bestFor}</p><p className="mt-1 text-xs leading-5 text-[#405C4D]"><strong>Practical use:</strong> {variant.practicalUse}</p><p className="mt-1 text-xs leading-5 text-[#405C4D]"><strong>Health context:</strong> {variant.healthContext}</p>{variant.checkBeforeUse && <p className="mt-1 text-xs leading-5 text-[#92532F]"><strong>Check:</strong> {variant.checkBeforeUse}</p>}</div>)}</div><div className="mt-3 border-t border-[#E2E9DF] pt-3">{getIngredientVariantGuide(insight.id)!.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-semibold text-[#315B49] underline underline-offset-2">{source.label}</a>)}</div></details>}</div></details>)}</div> : <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-[#68796E]">An evidence-linked ingredient profile is not yet available for the ingredients identified. Ahuva will not invent their composition or blood-pressure effects.</p>}
              <div className="mt-4 rounded-xl border border-[#E2E9DF] bg-white p-4"><p className="font-semibold text-[#29483B]">How the ingredients come together</p><div className="mt-2 space-y-2 text-sm leading-6 text-[#405C4D]">{combinedMealInsights.map((note, index) => <p key={index}>{note}</p>)}</div></div>
            </section>
            )}

            {resultScreen === 3 && (
            <>
            {mode === "your-way" && result?.status !== "unavailable" && !showGuidedCooking && <div className="mt-4 rounded-2xl border border-[#E6EBE3] bg-white p-4"><p className="text-sm leading-6 text-[#68796E]">Your usual cooking method stays yours. Would you like Ahuva to walk you through it?</p><button type="button" onClick={requestGuidedCooking} disabled={loading} className="mt-3 rounded-full border border-[#315B49] px-4 py-2.5 text-xs font-semibold text-[#315B49] disabled:opacity-40">{loading ? "Ahuva is thinking…" : "Show optional cooking steps"}</button></div>}
            {result?.plan && (mode === "ahuvas-way" || showGuidedCooking) && (
              <div className="mt-6 space-y-5">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">For {result.plan.servings}</p><h4 className="mt-1 font-serif text-xl text-[#183D30]">Your preparation</h4></div>
                {result.plan.ingredients.length > 0 && <div className="rounded-2xl bg-[#F8F9F5] p-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">What we&apos;re working with</p><div className="flex flex-wrap gap-2">{result.plan.ingredients.map((item, index) => <span key={`${item.name}-${index}`} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs ${item.availability === "available" ? "bg-[#E4EFE2] text-[#315B49]" : item.availability === "missing" ? "bg-[#FFF0E6] text-[#92532F]" : "bg-[#F1F0E9] text-[#68796E]"}`}>{item.name}{item.amount ? <span className="opacity-70">· {item.amount}</span> : null}</span>)}</div></div>}


                {result.plan.preparation.length > 0 && <div className="rounded-2xl border border-[#E6EBE3] bg-white p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Let&apos;s cook · Step {Math.min(activeStep + 1, result.plan.preparation.length)} of {result.plan.preparation.length}</p><span className="text-xs text-[#87958A]">{Math.round(((activeStep + 1) / result.plan.preparation.length) * 100)}%</span></div><p className="mt-4 text-base leading-7 text-[#29483B]">{result.plan.preparation[Math.min(activeStep, result.plan.preparation.length - 1)]}</p><div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => setActiveStep((step) => Math.max(0, step - 1))} disabled={activeStep === 0} className="rounded-full border border-[#DCE4DA] px-4 py-2 text-xs font-semibold text-[#315B49] disabled:opacity-35">Previous</button><button type="button" onClick={() => setActiveStep((step) => Math.min(result.plan!.preparation.length - 1, step + 1))} disabled={activeStep >= result.plan.preparation.length - 1} className="rounded-full bg-[#183D30] px-4 py-2 text-xs font-semibold text-white disabled:opacity-35">Next step →</button></div></div>}
              </div>
            )}

            {result?.recommendations && result.recommendations.length > 0 && <div className="mt-6 space-y-3">{result.recommendations.map((item, index) => <button key={index} type="button" disabled={loading} onClick={() => chooseMeal(item.title)} className="w-full rounded-2xl border border-[#E6EBE3] p-4 text-left transition hover:border-[#789780] hover:bg-[#F8FAF6] disabled:opacity-50"><p className="font-semibold text-[#29483B]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#718477]">{item.detail}</p><span className="mt-3 inline-block text-xs font-semibold text-[#315B49]">Choose this meal →</span></button>)}</div>}
            {result?.questions && result.questions.length > 0 && <div className="mt-5 rounded-2xl border border-[#DCE7D9] bg-[#F6F8F3] p-4"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E4EFE2] text-xs font-bold text-[#315B49]">a</span><p className="text-xs font-semibold text-[#315B49]">One thing to decide together</p></div><p className="mt-3 text-sm leading-6 text-[#29483B]">{result.questions[0]}</p></div>}
            {result?.safetyNotes && result.safetyNotes.length > 0 && <div className="mt-5 rounded-xl border border-[#E8E1D5] bg-[#FBF8F1] p-4 text-sm leading-6 text-[#6F604B]">{result.safetyNotes.map((note, index) => <p key={index}>{note}</p>)}</div>}
            </>
            )}

            {resultScreen === 4 && (
              <>
              {result?.status !== "unavailable" && <AhuvaServingReview initialPeople={servings} mealName={mealIdea} ingredients={ingredients} />}

            {result?.status !== "unavailable" && (
              <form onSubmit={submitFollowUp} className="mt-7 border-t border-[#E8ECE5] pt-5">
                <label htmlFor="ahuva-followup" className="mb-2 block text-sm font-semibold text-[#29483B]">What would you like to explore or change?</label>
                <div className="flex gap-2">
                  <input id="ahuva-followup" value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={1200} placeholder="Ask about an ingredient, how it relates to the meal, or a change you’re considering…" className="min-w-0 flex-1 rounded-full border border-[#DCE4DA] bg-[#FBFCF9] px-4 py-3 text-sm outline-none focus:border-[#789780]" />
                  <button type="submit" disabled={!followUp.trim() || loading} className="rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Send</button>
                </div>
              </form>
            )}
              </>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-[#FFF1E9] px-4 py-3 text-sm text-[#8B4229]">{error}</p>}
            <div className="mt-8 border-t border-[#E8ECE5] pt-5">
              <div className="mb-4 flex items-center justify-between text-xs text-[#718477]"><span>Step {resultScreen} of 4</span><span>{["Your meal", "Ingredients", "Cooking", "Serving"][resultScreen - 1]}</span></div>
              <div className="mb-5 grid grid-cols-4 gap-2" role="group" aria-label="Cooking experience steps">
                {(["Your meal", "Ingredients", "Cooking", "Serving"] as const).map((label, index) => (
                  <button key={label} type="button" aria-current={resultScreen === index + 1 ? "step" : undefined} onClick={() => setResultScreen((index + 1) as 1 | 2 | 3 | 4)} className={`h-1.5 rounded-full transition ${resultScreen >= index + 1 ? "bg-[#315B49]" : "bg-[#E3E9E1]"}`} aria-label={`Go to step ${index + 1}: ${label}`} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setResultScreen((screen) => Math.max(1, screen - 1) as 1 | 2 | 3 | 4)} disabled={resultScreen === 1} className="rounded-full border border-[#DCE4DA] px-5 py-3 text-sm font-semibold text-[#315B49] disabled:opacity-35">Back</button>
                {resultScreen < 4 ? <button type="button" onClick={() => setResultScreen((screen) => Math.min(4, screen + 1) as 1 | 2 | 3 | 4)} className="rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white">Continue →</button> : <button type="button" onClick={reset} className="rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white">Start a new meal</button>}
              </div>
            </div>
          </section>
        )}

        <div className="mt-12 flex items-center gap-3 text-xs text-[#8B9A8E]"><span className="h-px w-8 bg-[#C8D3C7]" />Ahuva helps you make DASH-aligned choices without taking the joy out of food.</div>
      </div>
    </main>
  );
}
