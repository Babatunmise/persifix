"use client";

import { useState, type FormEvent } from "react";
import { calculateHouseholdPotShares, calculateKnownAddedSodium } from "@/lib/ahuva-serving-intelligence.mjs";

type Props = {
  initialPeople: string;
  mealName: string;
  ingredients: string;
};

export default function AhuvaServingReview({ initialPeople, mealName, ingredients }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [people, setPeople] = useState(/^[1-8]$/.test(initialPeople) ? initialPeople : "");
  const [potQuantity, setPotQuantity] = useState("");
  const [potUnit, setPotUnit] = useState<"ladles" | "bowls" | "cups">("ladles");
  const [saltType, setSaltType] = useState("table");
  const [saltAmount, setSaltAmount] = useState("");
  const [otherSource, setOtherSource] = useState("unknown");
  const [seasoningMatch, setSeasoningMatch] = useState("about_the_same");
  const [labelSodium, setLabelSodium] = useState("");
  const [labelServings, setLabelServings] = useState("");
  const [ingredientChange, setIngredientChange] = useState("about_the_same");
  const [changeNote, setChangeNote] = useState("");
  const [review, setReview] = useState<ReturnType<typeof calculateKnownAddedSodium> | null>(null);
  const [potDistribution, setPotDistribution] = useState<ReturnType<typeof calculateHouseholdPotShares> | null>(null);

  const hasRice = /\b(rice|jollof|pilaf)\b/i.test(mealName + " " + ingredients);
  const hasProtein = /\b(chicken|beef|fish|turkey|pork|lamb|tofu|beans|lentils|egg)\b/i.test(ingredients);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!people) return;
    const result = calculateKnownAddedSodium({
      tableSaltTeaspoons: saltType === "none" ? 0 : saltType === "table" && saltAmount !== "" ? Number(saltAmount) : null,
      labelSodiumMgPerServing: otherSource === "label" && labelSodium !== "" ? Number(labelSodium) : null,
      labelServingsUsed: otherSource === "label" && labelServings !== "" ? Number(labelServings) : null,
      people: Number(people),
    });
    setReview(result);
    setPotDistribution(calculateHouseholdPotShares({ totalUnits: potQuantity === "" ? null : Number(potQuantity), unit: potUnit, people: Number(people) }));
  }

  return (
    <section className="mt-7 rounded-3xl border border-[#DCE7D9] bg-[#F7FAF5] p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Ahuva · Before you serve</p>
      <h4 className="mt-1 font-serif text-2xl text-[#183D30]">Let’s get the servings right.</h4>
      <p className="mt-2 text-sm leading-6 text-[#68796E]">When the pot is ready, tell me what actually went into it. I’ll share the pot fairly and show you a practical way to build each plate.</p>
      {!expanded ? (
        <button type="button" onClick={() => setExpanded(true)} className="mt-5 rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white">The meal is ready</button>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div>
            <label htmlFor="ahuva-pot-people" className="block text-sm font-semibold text-[#29483B]">How many people will share this pot?</label>
            <select id="ahuva-pot-people" value={people} onChange={(event) => { setPeople(event.target.value); setReview(null); setPotDistribution(null); }} required className="mt-2 w-full rounded-xl border border-[#DCE4DA] bg-white px-4 py-3 text-sm text-[#29483B]">
              <option value="" disabled>Choose the number sharing</option>
              {Array.from({ length: 20 }, (_, index) => String(index + 1)).map((number) => <option key={number} value={number}>{number} {number === "1" ? "person" : "people"}</option>)}
            </select>
            <div className="mt-4">
              <label htmlFor="ahuva-pot-quantity" className="block text-sm font-semibold text-[#29483B]">How many of your usual bowls or ladles does the pot fill?</label>
              <p className="mt-1 text-xs leading-5 text-[#718477]">Optional. Count using the same bowl or level ladle each time. No weighing scale needed.</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input id="ahuva-pot-quantity" type="number" min="0.25" max="1000" step="0.25" value={potQuantity} onChange={(event) => { setPotQuantity(event.target.value); setReview(null); setPotDistribution(null); }} placeholder="e.g. 8" className="min-w-0 rounded-xl border border-[#DCE4DA] bg-white px-3 py-3 text-sm text-[#29483B]" />
                <select aria-label="Household measure" value={potUnit} onChange={(event) => { setPotUnit(event.target.value as "ladles" | "bowls" | "cups"); setReview(null); setPotDistribution(null); }} className="min-w-0 rounded-xl border border-[#DCE4DA] bg-white px-3 py-3 text-sm text-[#29483B]">
                  <option value="ladles">Level ladles</option>
                  <option value="bowls">Your bowls</option>
                  <option value="cups">Standard cups</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E9DF] bg-white p-4">
            <p className="text-sm font-semibold text-[#29483B]">Did you follow the salt and seasoning guidance?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[{ value: "about_the_same", label: "About the same" }, { value: "less", label: "I used less" }, { value: "more", label: "I used more" }, { value: "unsure", label: "I’m not sure" }].map((option) => <button key={option.value} type="button" aria-pressed={seasoningMatch === option.value} onClick={() => { setSeasoningMatch(option.value); setReview(null); }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${seasoningMatch === option.value ? "border-[#315B49] bg-[#EAF1E8] text-[#315B49]" : "border-[#DCE4DA] bg-white text-[#718477]"}`}>{option.label}</button>)}
            </div>
            <p className="mt-4 text-sm font-semibold text-[#29483B]">How much fine table salt went into the whole pot?</p>
            <p className="mt-1 text-xs leading-5 text-[#718477]">Use the amount for the entire pot, not just your plate. If you used coarse, sea or a salt substitute, choose the option below; teaspoon estimates vary by type.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <select aria-label="Salt type" value={saltType} onChange={(event) => { setSaltType(event.target.value); setReview(null); }} className="min-w-0 rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-3 text-sm text-[#29483B]">
                <option value="table">Fine table salt</option>
                <option value="other">Other / not sure</option>
                <option value="none">No salt added</option>
              </select>
              <input aria-label="Teaspoons of fine table salt" type="number" min="0" max="30" step="0.125" value={saltAmount} onChange={(event) => { setSaltAmount(event.target.value); setReview(null); }} disabled={saltType !== "table"} placeholder="Teaspoons used" className="min-w-0 rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-3 text-sm text-[#29483B] disabled:opacity-40" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E9DF] bg-white p-4">
            <p className="text-sm font-semibold text-[#29483B]">Did you add stock cubes, sauces or packaged seasoning?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {([{ value: "none", label: "No" }, { value: "label", label: "Yes, I have the label" }, { value: "unknown", label: "Yes / not sure, no label" }]).map((option) => <button key={option.value} type="button" aria-pressed={otherSource === option.value} onClick={() => { setOtherSource(option.value); setReview(null); }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${otherSource === option.value ? "border-[#315B49] bg-[#EAF1E8] text-[#315B49]" : "border-[#DCE4DA] bg-white text-[#718477]"}`}>{option.label}</button>)}
            </div>
            {otherSource === "label" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-[#68796E]">Sodium per label serving (mg)<input type="number" min="0" max="100000" step="1" value={labelSodium} onChange={(event) => { setLabelSodium(event.target.value); setReview(null); }} required className="mt-2 w-full rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-3 text-sm text-[#29483B]" /></label>
                <label className="text-xs font-medium text-[#68796E]">Number of label servings used<input type="number" min="0" max="100" step="0.25" value={labelServings} onChange={(event) => { setLabelServings(event.target.value); setReview(null); }} required className="mt-2 w-full rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-3 text-sm text-[#29483B]" /></label>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#E2E9DF] bg-white p-4">
            <p className="text-sm font-semibold text-[#29483B]">Did the main ingredients end up close to the amounts you intended?</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([{ value: "about_the_same", label: "Yes, about the same" }, { value: "changed", label: "I changed them" }, { value: "not_measured", label: "I didn’t measure" }]).map((option) => <button key={option.value} type="button" aria-pressed={ingredientChange === option.value} onClick={() => setIngredientChange(option.value)} className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold ${ingredientChange === option.value ? "border-[#315B49] bg-[#EAF1E8] text-[#315B49]" : "border-[#DCE4DA] bg-white text-[#718477]"}`}>{option.label}</button>)}
            </div>
            {ingredientChange === "changed" && <textarea value={changeNote} onChange={(event) => setChangeNote(event.target.value)} maxLength={500} placeholder="What changed? For example, more rice, less chicken, extra vegetables…" className="mt-3 w-full rounded-xl border border-[#DCE4DA] bg-[#FBFCF9] px-3 py-3 text-sm text-[#29483B]" />}
          </div>

          <button type="submit" disabled={!people || (otherSource === "label" && (!labelSodium || !labelServings))} className="w-full rounded-full bg-[#183D30] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Work out my servings</button>

          {review && review.ok && (
            <div className="rounded-2xl border border-[#DCE7D9] bg-white p-4 sm:p-5" aria-live="polite">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718477]">Your pot · {review.people} {review.people === 1 ? "person" : "people"}</p>
              <h5 className="mt-1 font-serif text-xl text-[#183D30]">Share the pot into {review.people} portions.</h5>
              {potDistribution && potDistribution.ok && potDistribution.status === "measured" ? (
                <p className="mt-2 text-sm leading-6 text-[#405C4D]">Your pot fills about {potDistribution.totalUnits} {potDistribution.unit}. Shared between {potDistribution.people}, that is about <strong>{potDistribution.unitsPerPerson} {potDistribution.unit} per person</strong>. Use the same level scoop or bowl when dividing it.</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#405C4D]">Start by dividing the cooked food into {review.people} roughly equal shares. That gives everyone a fair starting point; individual appetites and needs can differ.</p>
              )}
              {review.status === "estimate" ? (
                <div className="mt-4 rounded-xl bg-[#F6F8F3] p-4">
                  <p className="text-sm font-semibold text-[#29483B]">Known added sodium estimate</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[#183D30]">{review.knownAddedSodiumMg.toLocaleString()} mg for the pot</p>
                  <p className="mt-1 text-sm text-[#68796E]">About {review.knownAddedSodiumPerShareMg.toLocaleString()} mg per equal share.</p>
                  <ul className="mt-3 space-y-1 text-xs leading-5 text-[#718477]">{review.sources.map((source) => <li key={source.name}>{source.name}: {source.sodiumMg.toLocaleString()} mg · {source.basis}</li>)}</ul>
                  <p className="mt-3 text-xs leading-5 text-[#87958A]">This estimate includes only the sources entered here. It excludes natural sodium in food and any unmeasured salt, stock, sauces or seasonings. It is not the meal’s total sodium or a personal blood-pressure assessment.</p>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#F6F8F3] p-4 text-sm leading-6 text-[#68796E]">I don’t have enough measured information to estimate the pot’s added sodium. We can still work out a practical plate; I won’t guess the missing amount.</p>
              )}
              <div className="mt-4">
                <p className="font-semibold text-[#29483B]">A practical plate guide</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {hasRice && <div className="rounded-xl bg-[#F8F9F5] p-3"><p className="text-sm font-semibold text-[#29483B]">Rice or other cooked grain</p><p className="mt-1 text-sm leading-6 text-[#68796E]">½ cup cooked is one standard grain serving — roughly a cupped hand. It is a reference, not a limit on what you personally need.</p></div>}
                  {hasProtein && <div className="rounded-xl bg-[#F8F9F5] p-3"><p className="text-sm font-semibold text-[#29483B]">Protein</p><p className="mt-1 text-sm leading-6 text-[#68796E]">Use your palm as a quick visual guide for a piece of cooked chicken, fish or meat. Cut and thickness change the actual weight.</p></div>}
                  <div className="rounded-xl bg-[#F8F9F5] p-3"><p className="text-sm font-semibold text-[#29483B]">Vegetables</p><p className="mt-1 text-sm leading-6 text-[#68796E]">When available, aim to give non-starchy vegetables about half the plate. A fist is a handy rough visual reference for a cup of chopped vegetables.</p></div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#87958A]">These are practical visual starting points, not a personalised calorie prescription. The right amount also depends on body size, appetite, activity, age and individual dietary needs. If the pot is saltier than planned, don’t skip food or make your serving too small; consider an unsalted vegetable side and keep the rest of the day’s sodium in mind.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[#315B49]">
                <a href="https://www.cdc.gov/salt/about/" target="_blank" rel="noreferrer" className="underline underline-offset-2">CDC · Salt and sodium</a>
                <a href="https://www.nhlbi.nih.gov/health/dash/following-dash" target="_blank" rel="noreferrer" className="underline underline-offset-2">NHLBI · DASH serving examples</a>
              </div>
              {ingredientChange === "changed" && changeNote.trim() && <p className="mt-3 text-xs leading-5 text-[#718477]">You noted these changes: {changeNote.trim()}. This first version records them but does not recalculate the meal’s energy or nutrient content.</p>}
              <p className="mt-4 text-xs font-semibold text-[#315B49]">Your usual cooking method stays yours. Ahuva helps you portion it with confidence.</p>
            </div>
          )}
          {review && !review.ok && <p role="alert" className="text-sm text-[#92532F]">Please check the quantities and try again.</p>}
        </form>
      )}
    </section>
  );
}
