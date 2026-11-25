"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Message = { role: "ahuva" | "you"; text: string };
type Stage = "discover" | "prepare" | "cook" | "complete";

const quickStarts = [
  { title: "I know what I want to cook", detail: "Start with a meal in mind.", prompt: "I know what I want to cook." },
  { title: "Use what I already have", detail: "Build around ingredients in my kitchen.", prompt: "Help me make something with what I already have." },
  { title: "Make my usual meal work better", detail: "Keep the food I love. Help me adapt it.", prompt: "Help me improve a meal I already enjoy." },
  { title: "I need a practical meal", detail: "Work around my time and situation.", prompt: "Help me organise a practical meal for today." },
];

const initialMessage: Message = {
  role: "ahuva",
  text: "I’m here. Tell me what you’re thinking of cooking, what you have, or what kind of help would make today easier.",
};

export default function AhuvaKitchen() {
  const [stage, setStage] = useState<Stage>("discover");
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [composer, setComposer] = useState("");
  const [task, setTask] = useState("");
  const [mealName, setMealName] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [servings, setServings] = useState(2);
  const [activeStep, setActiveStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<"plan" | "prep" | "cook">("plan");
  const [timerMinutes, setTimerMinutes] = useState("5");
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerPaused, setTimerPaused] = useState<number | null>(null);

  const ingredients = useMemo(
    () => ingredientsText.split("\n").map((item) => item.trim()).filter(Boolean),
    [ingredientsText],
  );
  const steps = useMemo(
    () => stepsText.split("\n").map((item) => item.trim()).filter(Boolean),
    [stepsText],
  );
  const remaining = timerEnd ? Math.max(0, timerEnd - now) : timerPaused ?? 0;
  const timerLabel = `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`;
  const progress = steps.length ? Math.round((completedSteps.length / steps.length) * 100) : 0;

  useEffect(() => {
    if (!timerEnd) return;
    const id = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= timerEnd) setTimerEnd(null);
    }, 500);
    return () => window.clearInterval(id);
  }, [timerEnd]);

  function begin(prompt: string) {
    const clean = prompt.trim();
    if (!clean) return;
    setTask(clean);
    setMessages((current) => [...current, { role: "you", text: clean }]);
    setStage("prepare");
    setWorkspaceTab("plan");
    setComposer("");
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    begin(composer);
  }

  function startTimer() {
    const minutes = Number(timerMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) return;
    setTimerPaused(null);
    setTimerEnd(Date.now() + Math.round(minutes * 60000));
    setNow(Date.now());
  }

  function pauseTimer() {
    if (!timerEnd) return;
    setTimerPaused(Math.max(0, timerEnd - Date.now()));
    setTimerEnd(null);
  }

  function resumeTimer() {
    if (timerPaused === null) return;
    setTimerEnd(Date.now() + timerPaused);
    setTimerPaused(null);
    setNow(Date.now());
  }

  function resetTimer() {
    setTimerEnd(null);
    setTimerPaused(null);
  }

  function resetSession() {
    setStage("discover");
    setMessages([initialMessage]);
    setTask("");
    setMealName("");
    setIngredientsText("");
    setStepsText("");
    setServings(2);
    setCheckedIngredients([]);
    setCompletedSteps([]);
    setActiveStep(0);
    setWorkspaceTab("plan");
    resetTimer();
  }

  return (
    <main className="min-h-screen bg-[#F8F6EF] pb-28 text-[#173B30]">
      <header className="sticky top-0 z-40 border-b border-[#173B30]/10 bg-[#F8F6EF]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173B30] text-lg text-[#F8F6EF]">a</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#527565]">Sanctos · Kitchen</p>
              <h1 className="font-serif text-2xl leading-none tracking-tight">Ahuva</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#173B30]/10 bg-white/70 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#D4A66A]" />
            <span className="text-[11px] font-medium text-[#527565]">Your Kitchen Guardian</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-7 lg:px-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#789080]">A more thoughtful way to cook</p>
            <p className="mt-1 text-sm text-[#527565]">Better decisions, without losing yourself.</p>
          </div>
          {stage !== "discover" && (
            <button onClick={resetSession} className="rounded-full border border-[#173B30]/15 px-3 py-2 text-xs font-semibold text-[#527565] transition hover:bg-white">
              New kitchen session
            </button>
          )}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
          <section className="overflow-hidden rounded-[28px] border border-[#173B30]/10 bg-white shadow-[0_12px_40px_rgba(23,59,48,0.045)]">
            <div className="border-b border-[#173B30]/8 bg-[#E8EFE5] px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#527565]">Your companion</p>
                  <h2 className="mt-1 font-serif text-2xl">Let’s figure it out together.</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#527565]/20 bg-white/70 font-serif text-xl text-[#527565]">a</div>
              </div>
            </div>

            <div className="flex min-h-[300px] flex-col gap-4 p-5 sm:min-h-[420px] sm:p-7">
              <div className="space-y-4" aria-live="polite">
                {messages.map((message, index) => (
                  <div key={index} className={message.role === "you" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[94%]"}>
                    {message.role === "ahuva" && <p className="mb-1.5 pl-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">Ahuva</p>}
                    <div className={message.role === "you"
                      ? "rounded-2xl rounded-br-md bg-[#173B30] px-4 py-3 text-sm leading-6 text-white"
                      : "rounded-2xl rounded-tl-md bg-[#F3F4EE] px-4 py-3 text-sm leading-6 text-[#29483B]"}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              {stage === "discover" && (
                <div className="mt-auto pt-3">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">A place to begin</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quickStarts.map((item) => (
                      <button key={item.title} onClick={() => begin(item.prompt)} className="rounded-2xl border border-[#173B30]/10 bg-[#FCFCF8] p-3 text-left transition hover:border-[#527565]/40 hover:bg-[#E8EFE5]/50">
                        <span className="block text-xs font-semibold text-[#173B30]">{item.title}</span>
                        <span className="mt-1 block text-[11px] leading-5 text-[#789080]">{item.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stage !== "discover" && (
                <div className="mt-auto rounded-2xl border border-[#DCE5D9] bg-[#F8FAF6] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">We’re working on</p>
                  <p className="mt-1 text-sm font-medium text-[#173B30]">{task}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#789080]">Your kitchen workspace is open alongside our conversation.</p>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="border-t border-[#173B30]/8 bg-[#FCFCF8] p-4 sm:p-5">
              <label htmlFor="ahuva-composer" className="sr-only">Message Ahuva</label>
              <div className="flex items-end gap-2 rounded-2xl border border-[#173B30]/12 bg-white p-2 focus-within:border-[#527565]/60">
                <textarea id="ahuva-composer" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Tell me what’s on your mind…" className="max-h-28 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-[#173B30] outline-none placeholder:text-[#9AA99D]" />
                <button type="submit" disabled={!composer.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173B30] text-lg text-white transition hover:bg-[#315B49] disabled:cursor-not-allowed disabled:opacity-30">↑</button>
              </div>
              <p className="mt-2 px-1 text-[10px] text-[#9AA99D]">Ahuva’s live intelligence will be connected in a later stage.</p>
            </form>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[28px] border border-[#173B30]/10 bg-white shadow-[0_12px_40px_rgba(23,59,48,0.045)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#173B30]/8 px-5 py-5 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789080]">Your active kitchen</p>
                <h2 className="mt-1 font-serif text-2xl">Kitchen workspace</h2>
              </div>
              <span className="rounded-full bg-[#E8EFE5] px-3 py-1.5 text-[10px] font-semibold text-[#527565]">{stage === "discover" ? "Ready when you are" : stage === "complete" ? "Meal complete" : "In progress"}</span>
            </div>

            {stage === "discover" ? (
              <div className="flex min-h-[440px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[520px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#E8EFE5] font-serif text-3xl text-[#527565]">✳</div>
                <h3 className="mt-5 max-w-sm font-serif text-3xl leading-tight text-[#173B30]">Your kitchen takes shape here.</h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#789080]">As we work through your meal, this space becomes your preparation plan, ingredient checklist, portion guide and cooking companion.</p>
                <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3 text-left">
                  {[
                    ["01", "Food preparation", "A clear plan for the meal."],
                    ["02", "Pot Math", "Adjust quantities with care."],
                    ["03", "Plate Prep", "Get ingredients ready."],
                    ["04", "Cooking workspace", "Follow each step and timer."],
                  ].map(([number, title, detail]) => (
                    <div key={number} className="rounded-2xl border border-[#173B30]/8 bg-[#FCFCF8] p-3">
                      <span className="text-[10px] font-bold tracking-widest text-[#B58C59]">{number}</span>
                      <p className="mt-2 text-xs font-semibold text-[#173B30]">{title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-[#789080]">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-1 border-b border-[#173B30]/8 px-4 pt-3 sm:px-6">
                  {(["plan", "prep", "cook"] as const).map((tab) => (
                    <button key={tab} onClick={() => setWorkspaceTab(tab)} className={workspaceTab === tab ? "border-b-2 border-[#315B49] px-3 py-3 text-xs font-bold capitalize text-[#173B30]" : "border-b-2 border-transparent px-3 py-3 text-xs font-medium capitalize text-[#9AA99D] hover:text-[#527565]"}>
                      {tab === "plan" ? "Meal plan" : tab === "prep" ? "Plate Prep" : "Cooking"}
                    </button>
                  ))}
                </div>

                {workspaceTab === "plan" && (
                  <div className="space-y-5 p-5 sm:p-7">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">Food preparation plan</p>
                      <h3 className="mt-1 font-serif text-2xl">Let’s get your meal organised.</h3>
                    </div>
                    <label className="block text-xs font-semibold text-[#527565]">What are we making?
                      <input value={mealName} onChange={(event) => setMealName(event.target.value)} placeholder="e.g. Jollof rice" className="mt-2 w-full rounded-xl border border-[#173B30]/12 bg-[#FCFCF8] px-4 py-3 text-sm font-normal text-[#173B30] outline-none focus:border-[#527565]" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                      <label className="block text-xs font-semibold text-[#527565]">Ingredients <span className="font-normal text-[#9AA99D]">· one per line</span>
                        <textarea rows={5} value={ingredientsText} onChange={(event) => setIngredientsText(event.target.value)} placeholder={"Rice\nTomatoes\nPepper\nOnion"} className="mt-2 w-full rounded-xl border border-[#173B30]/12 bg-[#FCFCF8] px-4 py-3 text-sm font-normal leading-6 text-[#173B30] outline-none focus:border-[#527565]" />
                      </label>
                      <div className="sm:w-36">
                        <label className="block text-xs font-semibold text-[#527565]">Servings
                          <div className="mt-2 flex items-center justify-between rounded-xl border border-[#173B30]/12 bg-[#FCFCF8] p-2">
                            <button type="button" onClick={() => setServings((value) => Math.max(1, value - 1))} aria-label="Decrease servings" className="h-8 w-8 rounded-lg bg-white text-lg">−</button>
                            <span className="text-sm font-semibold tabular-nums">{servings}</span>
                            <button type="button" onClick={() => setServings((value) => Math.min(30, value + 1))} aria-label="Increase servings" className="h-8 w-8 rounded-lg bg-white text-lg">+</button>
                          </div>
                        </label>
                      </div>
                    </div>
                    <label className="block text-xs font-semibold text-[#527565]">Cooking steps <span className="font-normal text-[#9AA99D]">· one per line</span>
                      <textarea rows={4} value={stepsText} onChange={(event) => setStepsText(event.target.value)} placeholder={"Prepare the ingredients\nCook the sauce\nAdd the rice and cook until tender"} className="mt-2 w-full rounded-xl border border-[#173B30]/12 bg-[#FCFCF8] px-4 py-3 text-sm font-normal leading-6 text-[#173B30] outline-none focus:border-[#527565]" />
                    </label>
                    <div className="flex flex-wrap gap-2 border-t border-[#173B30]/8 pt-4">
                      <button onClick={() => setWorkspaceTab("prep")} disabled={!ingredients.length} className="rounded-full border border-[#527565]/40 px-4 py-2.5 text-xs font-semibold text-[#527565] disabled:opacity-30">Open Plate Prep</button>
                      <button onClick={() => setWorkspaceTab("cook")} disabled={!mealName.trim() || !ingredients.length || !steps.length} className="rounded-full bg-[#173B30] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#315B49] disabled:opacity-30">Enter Cooking Workspace</button>
                    </div>
                    <p className="text-[10px] leading-5 text-[#9AA99D]">This is the workspace foundation. Ahuva is not yet generating or validating recipes, quantities or clinical adaptations.</p>
                  </div>
                )}

                {workspaceTab === "prep" && (
                  <div className="p-5 sm:p-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">Plate Prep</p>
                    <h3 className="mt-1 font-serif text-2xl">Get everything ready.</h3>
                    <p className="mt-2 text-sm leading-6 text-[#789080]">Tick ingredients as you prepare them. Your checklist stays alongside the conversation.</p>
                    {ingredients.length ? (
                      <div className="mt-5 space-y-2">
                        {ingredients.map((item, index) => (
                          <label key={index} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#F3F5EF] p-3 text-sm text-[#29483B]">
                            <input type="checkbox" checked={checkedIngredients.includes(index)} onChange={(event) => setCheckedIngredients((current) => event.target.checked ? [...current, index] : current.filter((value) => value !== index))} className="h-4 w-4 accent-[#315B49]" />
                            <span className={checkedIngredients.includes(index) ? "text-[#9AA99D] line-through" : ""}>{item}</span>
                          </label>
                        ))}
                      </div>
                    ) : <p className="mt-5 rounded-xl bg-[#FCFCF8] p-4 text-sm text-[#789080]">Add ingredients in your meal plan to build the checklist.</p>}
                    <p className="mt-4 text-xs text-[#789080]">{checkedIngredients.length} of {ingredients.length} ingredients prepared</p>
                  </div>
                )}

                {workspaceTab === "cook" && (
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">Cooking workspace</p>
                        <h3 className="mt-1 font-serif text-2xl">{mealName || "Your meal"}</h3>
                        <p className="mt-1 text-xs text-[#789080]">{servings} servings · Cook at your own pace</p>
                      </div>
                      <span className="rounded-full bg-[#E8EFE5] px-3 py-1.5 text-xs font-semibold text-[#527565]">{progress}% complete</span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E8EFE5]"><div className="h-full rounded-full bg-[#527565] transition-all" style={{ width: progress + "%" }} /></div>
                    <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                      <div>
                        <h4 className="font-serif text-lg">Ingredients</h4>
                        <ul className="mt-3 space-y-2">
                          {ingredients.map((item, index) => <li key={index} className="flex items-start gap-2 text-xs leading-5 text-[#527565]"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#D4A66A]" />{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-serif text-lg">Your cooking steps</h4>
                        {steps.length ? (
                          <ol className="mt-3 space-y-2">
                            {steps.map((step, index) => (
                              <li key={index} className={activeStep === index ? "rounded-xl border border-[#B9CBBB] bg-[#F3F6F0] p-3" : "rounded-xl border border-[#173B30]/8 p-3"}>
                                <div className="flex items-start gap-2">
                                  <input type="checkbox" checked={completedSteps.includes(index)} onChange={(event) => setCompletedSteps((current) => event.target.checked ? [...current, index] : current.filter((value) => value !== index))} className="mt-1 h-4 w-4 accent-[#315B49]" />
                                  <button onClick={() => setActiveStep(index)} className="text-left text-xs leading-5 text-[#29483B]"><span className="mr-2 font-bold text-[#B58C59]">{String(index + 1).padStart(2, "0")}</span>{step}</button>
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : <p className="mt-3 text-xs text-[#789080]">Add your cooking steps in the meal plan.</p>}
                      </div>
                    </div>
                    <div className="mt-6 rounded-2xl border border-[#173B30]/10 bg-[#FCFCF8] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#789080]">Kitchen timer</p><p className="mt-1 font-mono text-3xl tabular-nums text-[#173B30]">{timerLabel}</p></div>
                        <div className="flex flex-wrap gap-2">
                          {timerEnd || timerPaused !== null ? (
                            <button onClick={timerEnd ? pauseTimer : resumeTimer} className="rounded-full bg-[#173B30] px-4 py-2 text-xs font-semibold text-white">{timerEnd ? "Pause" : "Resume"}</button>
                          ) : (
                            <><input aria-label="Timer minutes" type="number" min="1" max="240" value={timerMinutes} onChange={(event) => setTimerMinutes(event.target.value)} className="w-16 rounded-full border border-[#173B30]/15 px-3 py-2 text-xs" /><button onClick={startTimer} className="rounded-full bg-[#173B30] px-4 py-2 text-xs font-semibold text-white">Start timer</button></>
                          )}
                          <button onClick={resetTimer} className="rounded-full border border-[#173B30]/15 px-4 py-2 text-xs font-semibold text-[#527565]">Reset</button>
                        </div>
                      </div>
                      {remaining === 0 && !timerEnd && timerPaused === null && <p className="mt-2 text-xs font-semibold text-[#527565]" role="status">Timer ready.</p>}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button onClick={() => setActiveStep((value) => Math.max(0, value - 1))} disabled={activeStep === 0} className="rounded-full border border-[#173B30]/15 px-4 py-2 text-xs font-semibold text-[#527565] disabled:opacity-30">Previous step</button>
                      <button onClick={() => setActiveStep((value) => Math.min(Math.max(steps.length - 1, 0), value + 1))} disabled={!steps.length || activeStep >= steps.length - 1} className="rounded-full border border-[#173B30]/15 px-4 py-2 text-xs font-semibold text-[#527565] disabled:opacity-30">Next step</button>
                    </div>
                    {steps.length > 0 && completedSteps.length === steps.length && <button onClick={() => setStage("complete")} className="mt-5 w-full rounded-full bg-[#315B49] py-3 text-sm font-semibold text-white">Complete meal</button>}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
