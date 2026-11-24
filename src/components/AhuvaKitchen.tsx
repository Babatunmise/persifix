"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/supabase";

type Ingredient = { name: string; amount: number; unit: string };
type Recipe = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  time: number;
  servings: number;
  image: string;
  ingredients: Ingredient[];
  steps: string[];
  note: string;
};

const RECIPES: Recipe[] = [
  {
    id: "tomato-rice",
    name: "One-pot tomato rice",
    cuisine: "West African",
    description: "A comforting, tomato-rich rice with peppers, onion and warming spices.",
    time: 35,
    servings: 4,
    image: "🍅",
    ingredients: [
      { name: "Long-grain rice", amount: 2, unit: "cups" },
      { name: "Fresh tomatoes", amount: 4, unit: "medium" },
      { name: "Red bell pepper", amount: 1, unit: "large" },
      { name: "Onion", amount: 1, unit: "medium" },
      { name: "Unsalted stock or water", amount: 2.5, unit: "cups" },
      { name: "Ground paprika", amount: 1, unit: "tsp" },
    ],
    steps: [
      "Rinse the rice until the water runs mostly clear, then set it aside.",
      "Blend the tomatoes and red pepper into a coarse mixture.",
      "Soften the chopped onion in a little oil, then add the tomato mixture and spices.",
      "Cook the tomato base until reduced and fragrant.",
      "Stir in the rice and stock or water. Cover and cook gently until the rice is tender.",
      "Rest for 5 minutes, fluff gently and taste before serving.",
    ],
    note: "Keep your preferred flavour profile. Use unsalted stock and season gradually; the final taste depends on the ingredients you choose.",
  },
  {
    id: "herb-pasta",
    name: "Lemony herb pasta",
    cuisine: "Mediterranean",
    description: "A bright weeknight pasta with garlic, lemon, greens and fresh herbs.",
    time: 25,
    servings: 2,
    image: "🍋",
    ingredients: [
      { name: "Pasta", amount: 180, unit: "g" },
      { name: "Spinach", amount: 2, unit: "cups" },
      { name: "Garlic", amount: 2, unit: "cloves" },
      { name: "Lemon", amount: 1, unit: "whole" },
      { name: "Olive oil", amount: 1, unit: "tbsp" },
      { name: "Fresh parsley", amount: 2, unit: "tbsp" },
    ],
    steps: [
      "Bring a pot of water to a boil and cook the pasta according to its packet.",
      "Warm olive oil gently and cook the sliced garlic until fragrant.",
      "Add spinach and stir until just wilted.",
      "Add lemon zest, a squeeze of lemon and a splash of pasta water.",
      "Toss the drained pasta through the sauce and finish with parsley.",
    ],
    note: "Choose the pasta shape you enjoy. A little pasta water helps the sauce cling without needing a heavy addition.",
  },
  {
    id: "lentil-bowl",
    name: "Warm lentil and vegetable bowl",
    cuisine: "Global",
    description: "A flexible, fibre-rich bowl with lentils, roasted vegetables and a yoghurt dressing.",
    time: 40,
    servings: 3,
    image: "🥕",
    ingredients: [
      { name: "Cooked lentils", amount: 2, unit: "cups" },
      { name: "Carrots", amount: 2, unit: "medium" },
      { name: "Courgette", amount: 1, unit: "medium" },
      { name: "Plain yoghurt", amount: 0.5, unit: "cup" },
      { name: "Ground cumin", amount: 1, unit: "tsp" },
      { name: "Lemon juice", amount: 1, unit: "tbsp" },
    ],
    steps: [
      "Heat the oven to 200°C and cut the vegetables into bite-sized pieces.",
      "Toss the vegetables with oil and cumin, then roast until tender and lightly browned.",
      "Warm the cooked lentils in a small pan with a splash of water.",
      "Mix yoghurt with lemon juice and a little black pepper.",
      "Arrange lentils and vegetables in bowls and finish with the dressing.",
    ],
    note: "Use any vegetables you have that roast well. If using canned lentils, check the label and rinse them if appropriate.",
  },
];

function calculateAge(dob: string | null) {
  if (!dob) return 40;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth() - birthDate.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

const formatAmount = (value: number) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));

export default function AhuvaKitchen() {
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(4);
  const [checked, setChecked] = useState<number[]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [dailySummary, setDailySummary] = useState({ caloriesConsumed: 0, caloriesTarget: 2000, caloriesBurned: 0, sodiumConsumed: 0, loaded: false });

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    let active = true;
    async function loadExistingDailySummary() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active || !userData.user) return;
      const userId = userData.user.id;
      let caloriesTarget = 2000;
      const { data: profile } = await supabase.from("profiles")
        .select("gender, date_of_birth, height, height_unit, weight, weight_unit, goals")
        .eq("id", userId).maybeSingle();
      if (profile) {
        let weightKg = profile.weight || 70;
        if (profile.weight_unit === "lb") weightKg *= 0.453592;
        let heightCm = profile.height || 170;
        if (profile.height_unit === "in") heightCm *= 2.54;
        const age = calculateAge(profile.date_of_birth);
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        if (profile.gender === "male") bmr += 5;
        else if (profile.gender === "female") bmr -= 161;
        else bmr -= 78;
        let tdee = bmr * 1.2;
        if (profile.goals?.includes("lose_weight")) tdee -= 500;
        caloriesTarget = Math.round(Math.max(tdee, 1200));
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [mealResult, workoutResult] = await Promise.all([
        supabase.from("meal_logs").select("calories, sodium_mg").eq("user_id", userId).gte("created_at", today.toISOString()),
        supabase.from("workout_logs").select("calories_burned").eq("user_id", userId).gte("created_at", today.toISOString()),
      ]);
      if (!active) return;
      const meals = mealResult.data || [];
      const workouts = workoutResult.data || [];
      setDailySummary({
        caloriesConsumed: meals.reduce((sum, row) => sum + (Number(row.calories) || 0), 0),
        sodiumConsumed: meals.reduce((sum, row) => sum + (Number(row.sodium_mg) || 0), 0),
        caloriesBurned: workouts.reduce((sum, row) => sum + (Number(row.calories_burned) || 0), 0),
        caloriesTarget,
        loaded: true,
      });
    }
    void loadExistingDailySummary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (timerRunning && seconds === 0) setTimerRunning(false);
  }, [timerRunning, seconds]);

  const filters = ["All", "West African", "Mediterranean", "Global"];
  const visibleRecipes = useMemo(
    () => activeFilter === "All" ? RECIPES : RECIPES.filter((recipe) => recipe.cuisine === activeFilter),
    [activeFilter],
  );

  function openRecipe(recipe: Recipe) {
    setSelected(recipe);
    setServings(recipe.servings);
    setChecked([]);
    setCompleted([]);
    setSeconds(0);
    setTimerRunning(false);
    setNotice("");
  }

  function scaledAmount(amount: number) {
    if (!selected) return amount;
    return amount * servings / selected.servings;
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setNotice("Ahuva's live conversational service is not connected yet. Your message has not been sent or stored.");
    setMessage("");
  }

  function startTimer() {
    const minutes = Number(timerMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) return;
    setSeconds(Math.round(minutes * 60));
    setTimerRunning(true);
  }

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-alive-bg pb-28 text-sanctos-navy">
      <header className="sticky top-0 z-30 border-b border-sanctos-navy/5 bg-alive-bg/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sanctos-green">My Sanctos</p>
            <h1 className="font-serif text-3xl tracking-tight">Ahuva<span className="ml-2 text-sm font-sans font-medium text-sanctos-green">Kitchen</span></h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sanctos-green/20 bg-white px-3 py-2 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-sanctos-green" aria-hidden="true" />
            Awake
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pt-4 sm:px-8">
        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-sanctos-sand bg-white p-4 sm:grid-cols-4" aria-label="Existing daily food and activity summary">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/45">Calories recorded</p><p className="mt-1 text-lg font-semibold tabular-nums">{dailySummary.loaded ? dailySummary.caloriesConsumed.toLocaleString() : "—"} <span className="text-xs font-normal text-sanctos-navy/50">kcal</span></p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/45">Daily target</p><p className="mt-1 text-lg font-semibold tabular-nums">{dailySummary.loaded ? (dailySummary.caloriesTarget + dailySummary.caloriesBurned).toLocaleString() : "—"} <span className="text-xs font-normal text-sanctos-navy/50">kcal</span></p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/45">Sodium recorded</p><p className="mt-1 text-lg font-semibold tabular-nums">{dailySummary.loaded ? dailySummary.sodiumConsumed.toLocaleString() : "—"} <span className="text-xs font-normal text-sanctos-navy/50">mg</span></p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-sanctos-navy/45">Activity calories</p><p className="mt-1 text-lg font-semibold tabular-nums">{dailySummary.loaded ? dailySummary.caloriesBurned.toLocaleString() : "—"} <span className="text-xs font-normal text-sanctos-navy/50">kcal</span></p></div>
          <p className="col-span-2 text-[10px] leading-4 text-sanctos-navy/40 sm:col-span-4">Existing Sanctos log summary. Historical entries may contain estimates; these figures are not a verified nutritional analysis.</p>
        </section>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-10">
        <section className="min-w-0">
          <div className="mb-8 rounded-[2rem] bg-sanctos-navy p-6 text-white sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl" aria-hidden="true">✳</div>
              <div>
                <p className="font-serif text-xl">Your kitchen, your way.</p>
                <p className="text-xs text-white/60">A thoughtful space for everyday food decisions.</p>
              </div>
            </div>
            <h2 className="max-w-xl font-serif text-3xl leading-tight sm:text-4xl">What sounds good today?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Start with what you love, what you have, or the time you can spare. Good food should still feel like yours.</p>
            <form onSubmit={sendMessage} className="mt-6 flex gap-2 rounded-2xl bg-white p-2">
              <label htmlFor="ahuva-prompt" className="sr-only">Tell Ahuva what you would like to cook</label>
              <input id="ahuva-prompt" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="e.g. I have tomatoes, rice and 30 minutes..." className="min-w-0 flex-1 bg-transparent px-3 text-sm text-sanctos-navy outline-none placeholder:text-sanctos-navy/40" />
              <button type="submit" className="rounded-xl bg-sanctos-green px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Send</button>
            </form>
            {notice && <p role="status" className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs leading-5 text-white/80">{notice}</p>}
          </div>

          {selected ? (
            <section aria-labelledby="recipe-title" className="rounded-[2rem] border border-sanctos-sand bg-white p-5 shadow-sm sm:p-7">
              <button onClick={() => setSelected(null)} className="mb-5 text-sm font-semibold text-sanctos-green hover:underline">← Back to ideas</button>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sanctos-green">{selected.cuisine} · {selected.time} min</p>
                  <h2 id="recipe-title" className="mt-2 font-serif text-3xl">{selected.name}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-sanctos-navy/65">{selected.description}</p>
                </div>
                <div className="text-5xl" aria-hidden="true">{selected.image}</div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-alive-bg p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-sanctos-navy/50">Servings</p>
                  <p className="mt-1 text-sm font-semibold">{servings} portions</p>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label="Decrease servings" onClick={() => setServings((value) => Math.max(1, value - 1))} className="h-10 w-10 rounded-full border border-sanctos-sand bg-white text-lg">−</button>
                  <span className="min-w-6 text-center font-semibold tabular-nums">{servings}</span>
                  <button aria-label="Increase servings" onClick={() => setServings((value) => Math.min(20, value + 1))} className="h-10 w-10 rounded-full border border-sanctos-sand bg-white text-lg">+</button>
                </div>
              </div>

              <div className="mt-7 grid gap-8 md:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <h3 className="font-serif text-xl">Ingredients</h3>
                  <p className="mt-1 text-xs text-sanctos-navy/50">Quantities adjust with servings.</p>
                  <ul className="mt-4 space-y-3">
                    {selected.ingredients.map((ingredient, index) => (
                      <li key={ingredient.name} className="flex items-start gap-3 text-sm">
                        <input id={`ingredient-${index}`} type="checkbox" checked={checked.includes(index)} onChange={(event) => setChecked((items) => event.target.checked ? [...items, index] : items.filter((item) => item !== index))} className="mt-0.5 h-4 w-4 accent-sanctos-green" />
                        <label htmlFor={`ingredient-${index}`} className={checked.includes(index) ? "text-sanctos-navy/40 line-through" : ""}>{ingredient.name}<span className="ml-2 font-semibold text-sanctos-green">{formatAmount(scaledAmount(ingredient.amount))} {ingredient.unit}</span></label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-serif text-xl">Cooking steps</h3>
                  <p className="mt-1 text-xs text-sanctos-navy/50">Tick each step as you go.</p>
                  <ol className="mt-4 space-y-4">
                    {selected.steps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <input id={`step-${index}`} type="checkbox" checked={completed.includes(index)} onChange={(event) => setCompleted((items) => event.target.checked ? [...items, index] : items.filter((item) => item !== index))} className="mt-1 h-4 w-4 accent-sanctos-green" />
                        <label htmlFor={`step-${index}`} className="text-sm leading-6">{step}</label>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-7 rounded-2xl bg-sanctos-sand/50 p-4">
                <p className="text-sm font-semibold">A little kitchen note</p>
                <p className="mt-1 text-sm leading-6 text-sanctos-navy/70">{selected.note}</p>
              </div>

              <div className="mt-6 rounded-2xl border border-sanctos-sand p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg">Kitchen timer</h3>
                    <p className="text-xs text-sanctos-navy/50">This preview timer runs while this page stays open.</p>
                  </div>
                  <p className="font-mono text-2xl tabular-nums" aria-live="off">{timerLabel}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label htmlFor="timer-minutes" className="sr-only">Timer minutes</label>
                  <input id="timer-minutes" type="number" min="1" max="180" value={timerMinutes} onChange={(event) => setTimerMinutes(event.target.value)} className="w-20 rounded-xl border border-sanctos-sand px-3 py-2 text-sm" />
                  <button onClick={startTimer} className="rounded-xl bg-sanctos-green px-4 py-2 text-sm font-semibold text-white">Start timer</button>
                  <button onClick={() => setTimerRunning(false)} className="rounded-xl border border-sanctos-sand px-4 py-2 text-sm font-semibold">Pause</button>
                  <button onClick={() => { setTimerRunning(false); setSeconds(0); }} className="rounded-xl border border-sanctos-sand px-4 py-2 text-sm font-semibold">Reset</button>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-sanctos-navy/45">Stage 1 interactive preview: progress and timer state are held in this page only. Persistent cooking sessions and background-safe timers are planned for a later implementation stage. Nutritional values are intentionally not estimated in this preview.</p>
            </section>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sanctos-green">A few places to begin</p>
                  <h2 className="mt-1 font-serif text-2xl">Ideas for your table</h2>
                </div>
                <span className="text-xs text-sanctos-navy/45">Illustrative recipes</span>
              </div>
              <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter recipes">
                {filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${activeFilter === filter ? "bg-sanctos-navy text-white" : "border border-sanctos-sand bg-white text-sanctos-navy/65"}`}>{filter}</button>)}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleRecipes.map((recipe) => (
                  <article key={recipe.id} className="overflow-hidden rounded-[1.7rem] border border-sanctos-sand bg-white shadow-sm">
                    <div className="flex h-32 items-center justify-center bg-sanctos-sand/45 text-6xl" aria-hidden="true">{recipe.image}</div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-sanctos-green"><span>{recipe.cuisine}</span><span>{recipe.time} min</span></div>
                      <h3 className="mt-2 font-serif text-xl">{recipe.name}</h3>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-sanctos-navy/60">{recipe.description}</p>
                      <button onClick={() => openRecipe(recipe)} className="mt-4 w-full rounded-full bg-sanctos-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-sanctos-green">Explore recipe</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[1.7rem] border border-sanctos-sand bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sanctos-green">Ahuva's approach</p>
            <h2 className="mt-2 font-serif text-2xl">Food first. You always.</h2>
            <p className="mt-3 text-sm leading-6 text-sanctos-navy/65">Your culture, preferences and everyday life belong in the kitchen. Health context should guide support without taking over the conversation.</p>
          </section>
          <section className="rounded-[1.7rem] bg-sanctos-sand/55 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sanctos-navy/55">Designed for real life</p>
            <ul className="mt-3 space-y-3 text-sm text-sanctos-navy/75">
              <li className="flex gap-2"><span aria-hidden="true">✓</span> Different cuisines and food traditions</li>
              <li className="flex gap-2"><span aria-hidden="true">✓</span> Flexible portions and ingredients</li>
              <li className="flex gap-2"><span aria-hidden="true">✓</span> Clear, practical cooking steps</li>
              <li className="flex gap-2"><span aria-hidden="true">✓</span> Nutrition information only when supported by data</li>
            </ul>
          </section>
          <section className="rounded-[1.7rem] border border-sanctos-sand bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sanctos-green">Stage 1 preview</p>
            <p className="mt-2 text-sm leading-6 text-sanctos-navy/65">This interface demonstrates the companion and cooking workspace direction. Live AI, saved preferences, persistent sessions and verified nutrition calculations are not active in this preview.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
