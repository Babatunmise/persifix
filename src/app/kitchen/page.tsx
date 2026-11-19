"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

function calculateAge(dob: string | null) {
  if (!dob) return 40;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

type Message = { role: "user" | "assistant"; content: string };
type PlanData = { pot_prep: string; plate_prep: string; closing_note: string; estimated_sodium: number; ingredients_list: any[]; };

export default function KitchenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Daily targets
  const [baseCalorieTarget, setBaseCalorieTarget] = useState(2000);
  const [sodiumTarget, setSodiumTarget] = useState(1500);

  // Daily consumed/burned
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [sodiumConsumed, setSodiumConsumed] = useState(0);

  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadToday() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, date_of_birth, height, height_unit, weight, weight_unit, goals")
        .eq("id", userData.user.id)
        .single();

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
        if (profile.goals && profile.goals.includes("lose_weight")) tdee -= 500;

        setBaseCalorieTarget(Math.round(Math.max(tdee, 1200)));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase.from("meal_logs").select("calories, sodium_mg").gte("created_at", today.toISOString());
      if (logs) {
        setCaloriesConsumed(logs.reduce((sum, log) => sum + log.calories, 0));
        setSodiumConsumed(logs.reduce((sum, log) => sum + log.sodium_mg, 0));
      }

      const { data: workouts } = await supabase.from("workout_logs").select("calories_burned").gte("created_at", today.toISOString());
      if (workouts) setCaloriesBurned(workouts.reduce((sum, log) => sum + log.calories_burned, 0));

      setLoading(false);
    }
    loadToday();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, plan]);

  const totalCalorieTarget = baseCalorieTarget + caloriesBurned;
  const calLeft = Math.max(totalCalorieTarget - caloriesConsumed, 0);
  const sodiumLeft = Math.max(sodiumTarget - sodiumConsumed, 0);
  const calPercent = Math.min((caloriesConsumed / totalCalorieTarget) * 100, 100);
  const sodiumPercent = Math.min((sodiumConsumed / sodiumTarget) * 100, 100);

  function startCookingChat() {
    setShowChat(true);
    setMessages([
      { role: "assistant", content: "What are we making today? 😊" }
    ]);
    setPlan(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const newMessages = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Authentication required");
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();

      if (data.status === "asking") {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      } else if (data.status === "ready") {
        // The AI is done asking questions. Show the Plan.
        setPlan({
          pot_prep: data.plan.pot_prep,
          plate_prep: data.plan.plate_prep,
          closing_note: data.plan.closing_note,
          estimated_sodium: data.estimated_sodium,
          ingredients_list: data.ingredients_list
        });
        setMessages(prev => [...prev, { role: "assistant", content: "I've got everything I need! Here is your Guardian Plan." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "I lost my connection for a second. Could you repeat that?" }]);
    } finally {
      setIsTyping(false);
    }
  }

  async function saveToVault() {
    if (!plan) return;
    setSavingMeal(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Save meal with new schema requirements
    const { error } = await supabase.from("meal_logs").insert({
      user_id: userData.user.id,
      meal_type: "dinner", // Default for now
      description: messages.find(m => m.role === "user")?.content || "Home Cooked Meal",
      calories: Math.round(plan.estimated_sodium * 0.8), // Rough estimate for calories if AI didn't provide
      sodium_mg: plan.estimated_sodium,
      pot_prep: plan.pot_prep,
      plate_prep: plan.plate_prep,
      chat_transcript: messages,
    });

    if (!error) {
      setSodiumConsumed(prev => prev + plan.estimated_sodium);
      // Update calories roughly based on sodium (placeholder)
      setCaloriesConsumed(prev => prev + Math.round(plan.estimated_sodium * 0.8));
      
      setShowChat(false);
      setPlan(null);
      setMessages([]);
    } else {
      alert("Failed to save meal.");
    }
    setSavingMeal(false);
  }

  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-2xl tracking-tight text-sanctos-navy">Kitchen</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sanctos-green opacity-70"></span>
          </div>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        {/* Daily Targets */}
        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-semibold text-sanctos-navy">Calories Left</span>
              <div className="flex items-center gap-1.5">
                {caloriesBurned > 0 && (
                  <span className="text-[10px] font-bold text-sanctos-green bg-sanctos-green/10 px-1.5 py-0.5 rounded">+{caloriesBurned}</span>
                )}
                <span className="text-xs font-semibold text-sanctos-navy/60">{calLeft} kcal</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-sanctos-sand/50 overflow-hidden">
              <div className="h-full bg-sanctos-green rounded-full transition-all duration-500" style={{ width: `${calPercent}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-semibold text-sanctos-navy">Sodium Left (DASH)</span>
              <span className="text-xs font-semibold text-sanctos-navy/60">{sodiumLeft} mg</span>
            </div>
            <div className="h-2 rounded-full bg-sanctos-sand/50 overflow-hidden">
              <div className="h-full bg-sanctos-navy rounded-full transition-all duration-500" style={{ width: `${sodiumPercent}%` }} />
            </div>
          </div>
        </section>

        {/* Entry Point Cards */}
        <section className="flex flex-col gap-3">
          <button 
            onClick={startCookingChat}
            className="bg-sanctos-sand rounded-3xl p-5 text-left flex items-start gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-sanctos-navy shrink-0">
              <span className="material-symbols-outlined text-[24px]">skillet</span>
            </div>
            <div>
              <h2 className="font-serif text-xl text-sanctos-navy mb-1">Cooking right now?</h2>
              <p className="text-xs text-sanctos-navy/70 leading-relaxed">
                Let's run the Pot Math together to keep your sodium safe.
              </p>
            </div>
          </button>

          <button className="bg-white rounded-3xl p-5 text-left flex items-start gap-4 shadow-sm opacity-60">
            <div className="w-12 h-12 rounded-full bg-sanctos-sand flex items-center justify-center text-sanctos-navy shrink-0">
              <span className="material-symbols-outlined text-[24px]">restaurant</span>
            </div>
            <div>
              <h2 className="font-serif text-xl text-sanctos-navy mb-1">Eating out today?</h2>
              <p className="text-xs text-sanctos-navy/70 leading-relaxed">
                Get smart menu negotiation strategies.
              </p>
            </div>
          </button>

          <button className="bg-white rounded-3xl p-5 text-left flex items-start gap-4 shadow-sm opacity-60">
            <div className="w-12 h-12 rounded-full bg-sanctos-sand flex items-center justify-center text-sanctos-navy shrink-0">
              <span className="material-symbols-outlined text-[24px]">cookie</span>
            </div>
            <div>
              <h2 className="font-serif text-xl text-sanctos-navy mb-1">Need a snack?</h2>
              <p className="text-xs text-sanctos-navy/70 leading-relaxed">
                Cravings happen. Let's fit them into your jar.
              </p>
            </div>
          </button>
        </section>
      </div>

      {/* CONVERSATIONAL CHAT OVERLAY */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-alive-bg flex flex-col animate-in slide-in-from-bottom-full duration-300">
          
          {/* Chat Header */}
          <div className="bg-alive-bg/85 backdrop-blur-xl px-6 py-4 border-b border-sanctos-sand/50 flex items-center gap-3">
            <button onClick={() => setShowChat(false)} className="text-sanctos-navy/60 hover:text-sanctos-navy">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sanctos-green">spa</span>
              <span className="font-serif text-xl text-sanctos-navy">DASH Guardian</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-3xl px-5 py-3 text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-sanctos-navy text-white rounded-br-sm" 
                    : "bg-sanctos-sand text-sanctos-navy rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-sanctos-sand text-sanctos-navy rounded-3xl rounded-bl-sm px-5 py-4">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-sanctos-navy/40 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-sanctos-navy/40 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-sanctos-navy/40 rounded-full animate-bounce delay-150" />
                  </span>
                </div>
              </div>
            )}

            {/* THE GUARDIAN PLAN CARD */}
            {plan && (
              <div className="mt-6 border-t border-sanctos-sand/60 pt-6 pb-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-md border border-sanctos-sand">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-2xl text-sanctos-navy">Guardian Plan</h3>
                    <span className="bg-sanctos-sand/50 text-sanctos-navy text-xs font-bold px-3 py-1 rounded-full">
                      {plan.estimated_sodium} mg sodium
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-alive-bg rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-sanctos-navy flex items-center gap-2 mb-2">
                        🍲 Pot Preparation
                      </h4>
                      <p className="text-sm text-sanctos-navy/80 leading-relaxed">{plan.pot_prep}</p>
                    </div>

                    <div className="bg-alive-bg rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-sanctos-navy flex items-center gap-2 mb-2">
                        🍽️ Plate Preparation
                      </h4>
                      <p className="text-sm text-sanctos-navy/80 leading-relaxed">{plan.plate_prep}</p>
                    </div>
                  </div>

                  <p className="text-sm italic text-sanctos-navy/60 mt-4 mb-6">
                    "{plan.closing_note}"
                  </p>

                  <button 
                    onClick={saveToVault}
                    disabled={savingMeal}
                    className="w-full bg-sanctos-green text-white rounded-full py-4 font-semibold disabled:opacity-50"
                  >
                    {savingMeal ? "Updating Vault..." : "Log Meal to Vault"}
                  </button>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {!plan && (
            <div className="p-4 bg-alive-bg border-t border-sanctos-sand/50 pb-safe">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 bg-white px-5 py-3 rounded-full outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy shadow-sm"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-12 h-12 rounded-full bg-sanctos-navy text-white flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">arrow_upward</span>
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </main>
  );
}