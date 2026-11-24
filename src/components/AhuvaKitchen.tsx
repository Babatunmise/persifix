"use client";

import { useEffect, useMemo, useState } from "react";

type Screen = "home" | "conversation" | "plan" | "pot-math" | "plate-prep" | "cook" | "complete";
type TimerStatus = "idle" | "running" | "paused" | "elapsed";
type Session = {
  task: string;
  intent: string;
  mealName: string;
  servings: number;
  baseServings: number;
  ingredients: string;
  steps: string;
  restrictions: string;
  checkedIngredients: number[];
  completedSteps: number[];
  activeStep: number;
  screen: Screen;
  timerStatus: TimerStatus;
  timerEndAt: number | null;
  timerRemainingMs: number;
  feedback: string;
};
const STORAGE_KEY = "sanctos.ahuva.cooking-session.v1";
const emptySession: Session = {
  task: "", intent: "", mealName: "", servings: 2, baseServings: 2,
  ingredients: "", steps: "", restrictions: "", checkedIngredients: [],
  completedSteps: [], activeStep: 0, screen: "home", timerStatus: "idle",
  timerEndAt: null, timerRemainingMs: 0, feedback: "",
};
const shortcuts = [
  { id: "cook", title: "I know what I want to cook", description: "Start with the meal on your mind." },
  { id: "pantry", title: "Help me use what I have", description: "Work from ingredients already in your kitchen." },
  { id: "improve", title: "Help me improve a meal", description: "Keep the meal you enjoy; refine how you make it." },
  { id: "prepare", title: "Help me prepare something", description: "Organise a practical meal around your time and needs." },
];
const parseIngredient = (line: string, factor: number) => {
  const match = line.match(/^\s*(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return line;
  const amount = Number(match[1]) * factor;
  const formatted = Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
  return line.replace(match[0], formatted + " " + match[2]);
};

export default function AhuvaKitchen() {
  const [session, setSession] = useState<Session>(emptySession);
  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [timerInput, setTimerInput] = useState("5");
  const [clock, setClock] = useState(Date.now());
  const [feedbackNote, setFeedbackNote] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Session>;
        const restored = { ...emptySession, ...parsed };
        if (restored.timerStatus === "running" && restored.timerEndAt) {
          restored.timerRemainingMs = Math.max(0, restored.timerEndAt - Date.now());
          if (restored.timerRemainingMs === 0) {
            restored.timerStatus = "elapsed";
            restored.timerEndAt = null;
          }
        }
        setSession(restored);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session.screen === "complete") {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (session.screen !== "home" || session.task || session.mealName) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session, hydrated]);

  useEffect(() => {
    if (session.timerStatus !== "running") return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, (session.timerEndAt ?? Date.now()) - Date.now());
      setClock(Date.now());
      if (remaining === 0) {
        setSession(current => ({ ...current, timerStatus: "elapsed", timerEndAt: null, timerRemainingMs: 0 }));
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [session.timerStatus, session.timerEndAt]);

  const ingredients = useMemo(() => session.ingredients.split("\n").map(x => x.trim()).filter(Boolean), [session.ingredients]);
  const steps = useMemo(() => session.steps.split("\n").map(x => x.trim()).filter(Boolean), [session.steps]);
  const factor = session.baseServings > 0 ? session.servings / session.baseServings : 1;
  const remainingMs = session.timerStatus === "running" && session.timerEndAt
    ? Math.max(0, session.timerEndAt - clock)
    : session.timerRemainingMs;
  const timerLabel = `${String(Math.floor(remainingMs / 60000)).padStart(2, "0")}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`;

  function update(patch: Partial<Session>) {
    setSession(current => ({ ...current, ...patch }));
  }
  function startTask(intent: string) {
    const labels: Record<string, string> = {
      cook: "I know what I want to cook",
      pantry: "Help me use what I have",
      improve: "Help me improve a meal",
      prepare: "Help me prepare something",
    };
    update({ ...emptySession, screen: "conversation", intent, task: labels[intent] ?? "" });
    setPrompt("");
  }
  function submitPrompt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;
    update({ task: prompt.trim(), screen: "plan" });
    setPrompt("");
  }
  function beginCooking() {
    if (!session.mealName.trim() || ingredients.length === 0 || steps.length === 0) return;
    update({ screen: "cook", activeStep: 0, checkedIngredients: [], completedSteps: [], timerStatus: "idle", timerEndAt: null, timerRemainingMs: 0 });
  }
  function startTimer() {
    const minutes = Number(timerInput);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) return;
    const duration = Math.round(minutes * 60000);
    update({ timerStatus: "running", timerEndAt: Date.now() + duration, timerRemainingMs: duration });
  }
  function pauseTimer() {
    const remaining = Math.max(0, (session.timerEndAt ?? Date.now()) - Date.now());
    update({ timerStatus: "paused", timerEndAt: null, timerRemainingMs: remaining });
  }
  function resumeTimer() {
    update({ timerStatus: "running", timerEndAt: Date.now() + session.timerRemainingMs });
  }
  function resetTimer() {
    update({ timerStatus: "idle", timerEndAt: null, timerRemainingMs: 0 });
  }
  function finishCooking() {
    update({ screen: "complete", feedback: feedbackNote });
  }
  const progress = steps.length ? Math.round((session.completedSteps.length / steps.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-alive-bg pb-28 text-sanctos-navy">
      <header className="sticky top-0 z-30 border-b border-sanctos-navy/5 bg-alive-bg/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sanctos-green">Sanctos · Kitchen</p>
            <h1 className="font-serif text-3xl tracking-tight">Ahuva</h1>
          </div>
          <span className="rounded-full border border-sanctos-green/20 bg-white px-3 py-2 text-xs font-semibold text-sanctos-green">Your food companion</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        {session.screen === "home" && (
          <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[2rem] bg-sanctos-navy p-6 text-white sm:p-9">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl" aria-hidden="true">✳</div>
                <div><p className="font-serif text-xl">Ahuva is here.</p><p className="text-xs text-white/60">A little help with the food decisions of everyday life.</p></div>
              </div>
              <h2 className="max-w-xl font-serif text-3xl leading-tight sm:text-4xl">What are we doing in the kitchen today?</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Start with what you enjoy, what you have, or what you need. We’ll work from there.</p>
              <form onSubmit={submitPrompt} className="mt-7 flex gap-2 rounded-2xl bg-white p-2">
                <label htmlFor="ahuva-prompt" className="sr-only">Tell Ahuva what you need</label>
                <input id="ahuva-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Tell me what’s on your mind…" className="min-w-0 flex-1 bg-transparent px-3 text-sm text-sanctos-navy outline-none placeholder:text-sanctos-navy/40" />
                <button type="submit" disabled={!prompt.trim()} className="rounded-xl bg-sanctos-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Start</button>
              </form>
              <p className="mt-3 text-[11px] leading-5 text-white/50">Your entry stays on this device in this preview. Live conversational assistance is not connected.</p>
            </section>
            <section>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-sanctos-green">Start wherever you are</p>
              <div className="grid gap-3">
                {shortcuts.map(item => (
                  <button key={item.id} onClick={() => startTask(item.id)} className="rounded-2xl border border-sanctos-sand bg-white p-4 text-left transition hover:border-sanctos-green/40 hover:shadow-sm">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-sanctos-navy/55">{item.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-sanctos-sand/60 p-4">
                <p className="text-sm font-semibold">Pick up where you left off</p>
                <p className="mt-1 text-xs leading-5 text-sanctos-navy/60">{hydrated && session.mealName ? `Your ${session.mealName} session is saved on this device.` : "Your active cooking session will appear here when you start one."}</p>
                {hydrated && session.mealName && <button onClick={() => update({ screen: "cook" })} className="mt-3 text-xs font-bold text-sanctos-green">Resume cooking →</button>}
              </div>
            </section>
          </div>
        )}

        {session.screen === "conversation" && (
          <section className="mx-auto max-w-2xl rounded-[2rem] border border-sanctos-sand bg-white p-6 sm:p-8">
            <button onClick={() => update({ screen: "home" })} className="mb-6 text-sm font-semibold text-sanctos-green">← Kitchen home</button>
            <p className="text-xs font-bold uppercase tracking-wider text-sanctos-green">Let’s understand the task</p>
            <h2 className="mt-2 font-serif text-3xl">What would you like help with?</h2>
            <p className="mt-3 text-sm leading-6 text-sanctos-navy/60">{session.task}</p>
            <form onSubmit={submitPrompt} className="mt-6 space-y-3">
              <label htmlFor="ahuva-followup" className="text-sm font-semibold">Tell us a little more</label>
              <textarea id="ahuva-followup" value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="For example: I want to make jollof rice for four people, and I have tomatoes, pepper and rice…" className="w-full rounded-2xl border border-sanctos-sand p-4 text-sm outline-none focus:border-sanctos-green" />
              <button type="submit" disabled={!prompt.trim()} className="w-full rounded-full bg-sanctos-green py-3 text-sm font-semibold text-white disabled:opacity-40">Continue</button>
            </form>
            <p className="mt-4 text-xs leading-5 text-sanctos-navy/45">This is an interaction preview. Ahuva is not yet processing messages with AI, so no response or recommendation will be fabricated.</p>
          </section>
        )}

        {session.screen === "plan" && (
          <section className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center justify-between"><button onClick={() => update({ screen: "home" })} className="text-sm font-semibold text-sanctos-green">← Kitchen home</button><span className="text-xs text-sanctos-navy/45">Food preparation plan</span></div>
            <div className="rounded-[2rem] bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-sanctos-green">Your task</p>
              <h2 className="mt-2 font-serif text-3xl">Let’s organise your meal.</h2>
              <p className="mt-2 text-sm leading-6 text-sanctos-navy/60">Use a meal you enjoy, a recipe you already have, or the ingredients you want to use. Nothing is being guessed or generated in this preview.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Meal or recipe name<input value={session.mealName} onChange={e => update({ mealName: e.target.value })} placeholder="e.g. My usual jollof rice" className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
                <label className="text-sm font-semibold">Number of servings<input type="number" min="1" max="50" value={session.servings} onChange={e => update({ servings: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Ingredients — one per line<textarea value={session.ingredients} onChange={e => update({ ingredients: e.target.value })} rows={5} placeholder={"2 cups rice\n4 tomatoes\n1 onion"} className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Cooking steps — one per line<textarea value={session.steps} onChange={e => update({ steps: e.target.value })} rows={5} placeholder={"Wash and prepare the ingredients\nPrepare the sauce\nCook the rice until tender"} className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Allergies or dietary requirements (optional)<textarea value={session.restrictions} onChange={e => update({ restrictions: e.target.value })} rows={2} placeholder="Enter only what you want considered for this task." className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
              </div>
              {session.restrictions.trim() && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">These requirements are recorded in this device preview but are not clinically validated. Do not rely on this screen to confirm allergen safety.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => update({ screen: "pot-math" })} disabled={!session.ingredients.trim()} className="rounded-full border border-sanctos-green px-5 py-3 text-sm font-semibold text-sanctos-green disabled:opacity-40">Pot Math</button>
                <button onClick={() => update({ screen: "plate-prep" })} disabled={!session.ingredients.trim()} className="rounded-full border border-sanctos-green px-5 py-3 text-sm font-semibold text-sanctos-green disabled:opacity-40">Plate Prep</button>
                <button onClick={beginCooking} disabled={!session.mealName.trim() || !ingredients.length || !steps.length} className="rounded-full bg-sanctos-green px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Start cooking</button>
              </div>
            </div>
          </section>
        )}

        {session.screen === "pot-math" && (
          <section className="mx-auto max-w-3xl rounded-[2rem] border border-sanctos-sand bg-white p-6 sm:p-8">
            <button onClick={() => update({ screen: "plan" })} className="mb-6 text-sm font-semibold text-sanctos-green">← Back to plan</button>
            <p className="text-xs font-bold uppercase tracking-wider text-sanctos-green">Pot Math</p>
            <h2 className="mt-2 font-serif text-3xl">Adjust the quantities.</h2>
            <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl bg-alive-bg p-4">
              <label className="text-xs font-semibold">Original servings<input type="number" min="1" max="50" value={session.baseServings} onChange={e => update({ baseServings: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} className="mt-2 block w-24 rounded-xl border border-sanctos-sand bg-white p-2 text-sm" /></label>
              <span className="pb-2 text-sanctos-navy/40">→</span>
              <label className="text-xs font-semibold">New servings<input type="number" min="1" max="50" value={session.servings} onChange={e => update({ servings: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} className="mt-2 block w-24 rounded-xl border border-sanctos-sand bg-white p-2 text-sm" /></label>
              <span className="pb-2 text-sm font-semibold text-sanctos-green">× {Number(factor.toFixed(3))}</span>
            </div>
            <ul className="mt-5 divide-y divide-sanctos-sand">
              {ingredients.map((line, index) => <li key={index} className="flex justify-between gap-4 py-3 text-sm"><span>{line}</span><strong className="text-right text-sanctos-green">{parseIngredient(line, factor)}</strong></li>)}
            </ul>
            <p className="mt-4 rounded-xl bg-sanctos-sand/50 p-3 text-xs leading-5 text-sanctos-navy/60">Only clearly stated numeric quantities are scaled. Units are not converted. Seasoning, thickening agents, leavening, cooking liquid, pan size and cooking time may not scale linearly; review these manually.</p>
            <button onClick={() => update({ screen: "plan" })} className="mt-6 rounded-full bg-sanctos-green px-5 py-3 text-sm font-semibold text-white">Back to preparation plan</button>
          </section>
        )}

        {session.screen === "plate-prep" && (
          <section className="mx-auto max-w-3xl rounded-[2rem] border border-sanctos-sand bg-white p-6 sm:p-8">
            <button onClick={() => update({ screen: "plan" })} className="mb-6 text-sm font-semibold text-sanctos-green">← Back to plan</button>
            <p className="text-xs font-bold uppercase tracking-wider text-sanctos-green">Plate Prep</p>
            <h2 className="mt-2 font-serif text-3xl">Get everything ready.</h2>
            <p className="mt-2 text-sm leading-6 text-sanctos-navy/60">Organise the meal around its own ingredients, cooking method and the way you like to eat. There is no one plate model for every cuisine.</p>
            <div className="mt-6 space-y-3">
              {ingredients.map((item, index) => <label key={index} className="flex items-center gap-3 rounded-xl bg-alive-bg p-3 text-sm"><input type="checkbox" checked={session.checkedIngredients.includes(index)} onChange={e => update({ checkedIngredients: e.target.checked ? [...session.checkedIngredients, index] : session.checkedIngredients.filter(x => x !== index) })} className="h-4 w-4 accent-sanctos-green" />{item}</label>)}
            </div>
            <p className="mt-4 text-xs text-sanctos-navy/45">{session.checkedIngredients.length} of {ingredients.length} ingredients prepared.</p>
            <button onClick={() => update({ screen: "plan" })} className="mt-6 rounded-full bg-sanctos-green px-5 py-3 text-sm font-semibold text-white">Return to plan</button>
          </section>
        )}

        {session.screen === "cook" && (
          <section className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center justify-between"><button onClick={() => update({ screen: "plan" })} className="text-sm font-semibold text-sanctos-green">← Preparation plan</button><span className="text-xs text-sanctos-navy/50">{progress}% complete</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-sanctos-sand"><div className="h-full rounded-full bg-sanctos-green transition-all" style={{ width: progress + "%" }} /></div>
            <div className="rounded-[2rem] border border-sanctos-sand bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-sanctos-green">Cooking workspace</p>
              <h2 className="mt-2 font-serif text-3xl">{session.mealName}</h2>
              <p className="mt-1 text-sm text-sanctos-navy/55">Preparing {session.servings} servings</p>
              {session.restrictions.trim() && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Dietary requirements noted: {session.restrictions}. This preview cannot verify allergen safety.</p>}
              <div className="mt-7 grid gap-7 md:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <h3 className="font-serif text-xl">Ingredients</h3>
                  <ul className="mt-3 space-y-3">{ingredients.map((item, index) => <li key={index}><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={session.checkedIngredients.includes(index)} onChange={e => update({ checkedIngredients: e.target.checked ? [...session.checkedIngredients, index] : session.checkedIngredients.filter(x => x !== index) })} className="mt-0.5 accent-sanctos-green" /><span className={session.checkedIngredients.includes(index) ? "text-sanctos-navy/40 line-through" : ""}>{parseIngredient(item, factor)}</span></label></li>)}</ul>
                </div>
                <div>
                  <h3 className="font-serif text-xl">Cooking steps</h3>
                  <ol className="mt-3 space-y-3">{steps.map((step, index) => <li key={index} className="flex gap-3 rounded-xl bg-alive-bg p-3"><input type="checkbox" checked={session.completedSteps.includes(index)} onChange={e => update({ completedSteps: e.target.checked ? [...session.completedSteps, index] : session.completedSteps.filter(x => x !== index), activeStep: index })} className="mt-1 accent-sanctos-green" /><button onClick={() => update({ activeStep: index })} className="text-left text-sm leading-6"><span className="mr-2 text-xs font-bold text-sanctos-green">{index + 1}.</span>{step}</button></li>)}</ol>
                </div>
              </div>
              <div className="mt-7 rounded-2xl border border-sanctos-sand p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-serif text-xl">Cooking timer</h3><p className="text-xs text-sanctos-navy/50">Timer recovery is stored on this device in this preview.</p></div><p className="font-mono text-3xl tabular-nums" aria-live="off">{timerLabel}</p></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.timerStatus === "idle" || session.timerStatus === "elapsed" ? <><input aria-label="Timer minutes" type="number" min="1" max="240" value={timerInput} onChange={e => setTimerInput(e.target.value)} className="w-24 rounded-xl border border-sanctos-sand px-3 py-2 text-sm" /><button onClick={startTimer} className="rounded-xl bg-sanctos-green px-4 py-2 text-sm font-semibold text-white">Start timer</button></> : session.timerStatus === "running" ? <button onClick={pauseTimer} className="rounded-xl bg-sanctos-green px-4 py-2 text-sm font-semibold text-white">Pause</button> : <button onClick={resumeTimer} className="rounded-xl bg-sanctos-green px-4 py-2 text-sm font-semibold text-white">Resume</button>}
                  {session.timerStatus !== "idle" && <button onClick={resetTimer} className="rounded-xl border border-sanctos-sand px-4 py-2 text-sm font-semibold">Reset</button>}
                </div>
                {session.timerStatus === "elapsed" && <p role="status" className="mt-3 text-sm font-semibold text-sanctos-green">Timer complete.</p>}
              </div>
              <div className="mt-7 flex flex-wrap justify-between gap-3"><button onClick={() => update({ activeStep: Math.max(0, session.activeStep - 1) })} disabled={session.activeStep === 0} className="rounded-full border border-sanctos-sand px-5 py-3 text-sm font-semibold disabled:opacity-30">Previous step</button><button onClick={() => update({ activeStep: Math.min(Math.max(steps.length - 1, 0), session.activeStep + 1) })} disabled={session.activeStep >= steps.length - 1} className="rounded-full border border-sanctos-sand px-5 py-3 text-sm font-semibold disabled:opacity-30">Next step</button></div>
              <button onClick={finishCooking} disabled={!steps.length || session.completedSteps.length !== steps.length} className="mt-5 w-full rounded-full bg-sanctos-green py-3 text-sm font-semibold text-white disabled:opacity-40">Complete meal</button>
            </div>
          </section>
        )}

        {session.screen === "complete" && (
          <section className="mx-auto max-w-2xl rounded-[2rem] border border-sanctos-sand bg-white p-6 text-center sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sanctos-sand text-2xl text-sanctos-green">✓</div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-sanctos-green">Meal completed</p>
            <h2 className="mt-2 font-serif text-3xl">How did it go?</h2>
            <p className="mt-2 text-sm text-sanctos-navy/60">{session.mealName} · {session.servings} servings</p>
            <label className="mt-6 block text-left text-sm font-semibold">Optional note<textarea value={feedbackNote} onChange={e => setFeedbackNote(e.target.value)} rows={3} placeholder="What would you keep or change next time?" className="mt-2 w-full rounded-xl border border-sanctos-sand p-3 font-normal outline-none focus:border-sanctos-green" /></label>
            <p className="mt-3 text-left text-xs leading-5 text-sanctos-navy/45">Feedback is not uploaded or saved to your Sanctos profile in this preview.</p>
            <button onClick={() => { setSession(emptySession); setFeedbackNote(""); }} className="mt-6 w-full rounded-full bg-sanctos-green py-3 text-sm font-semibold text-white">Return to Ahuva</button>
          </section>
        )}
      </div>
    </main>
  );
}
