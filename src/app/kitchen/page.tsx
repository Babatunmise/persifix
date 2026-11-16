"use client";

import { useEffect, useState } from "react";
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

  // Modal & AI States
  const [showFridgeModal, setShowFridgeModal] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [savingMeal, setSavingMeal] = useState(false);

  useEffect(() => {
    async function loadToday() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      // 1. Fetch Profile for BMR
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
        setSodiumTarget(1500);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Fetch Today's Meals
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("calories, sodium_mg")
        .gte("created_at", today.toISOString());

      if (logs) {
        setCaloriesConsumed(logs.reduce((sum, log) => sum + log.calories, 0));
        setSodiumConsumed(logs.reduce((sum, log) => sum + log.sodium_mg, 0));
      }

      // 3. Fetch Today's Workouts
      const { data: workouts } = await supabase
        .from("workout_logs")
        .select("calories_burned")
        .gte("created_at", today.toISOString());

      if (workouts) {
        setCaloriesBurned(workouts.reduce((sum, log) => sum + log.calories_burned, 0));
      }

      setLoading(false);
    }
    loadToday();
  }, [router]);

  // Dynamic Calculation: Base + Burned
  const totalCalorieTarget = baseCalorieTarget + caloriesBurned;
  const calLeft = Math.max(totalCalorieTarget - caloriesConsumed, 0);
  const sodiumLeft = Math.max(sodiumTarget - sodiumConsumed, 0);
  
  const calPercent = Math.min((caloriesConsumed / totalCalorieTarget) * 100, 100);
  const sodiumPercent = Math.min((sodiumConsumed / sodiumTarget) * 100, 100);

  async function generateRecipe() {
    if (!ingredients.trim()) return;
    setLoadingRecipe(true);
    setRecipe(null);

    const mealCalBudget = Math.max(Math.round(calLeft / 2), 300);
    const mealSodiumBudget = Math.max(Math.round(sodiumLeft / 2), 200);

    try {
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          calorieBudget: mealCalBudget,
          sodiumBudget: mealSodiumBudget,
        }),
      });
      const data = await res.json();
      if (res.ok && data.recipe) {
        setRecipe(data.recipe);
      } else {
        alert("The chef is busy right now. Try again.");
      }
    } catch (err) {
      alert("Something went wrong connecting to the chef.");
    } finally {
      setLoadingRecipe(false);
    }
  }

  async function logMeal() {
    if (!recipe) return;
    setSavingMeal(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return router.push("/");

    const { error } = await supabase.from("meal_logs").insert({
      user_id: userData.user.id,
      meal_type: "lunch",
      description: recipe.recipe_name,
      calories: recipe.calories,
      sodium_mg: recipe.sodium_mg,
    });

    if (!error) {
      setCaloriesConsumed(prev => prev + recipe.calories);
      setSodiumConsumed(prev => prev + recipe.sodium_mg);
      setShowFridgeModal(false);
      setRecipe(null);
      setIngredients("");
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
        
        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-semibold text-sanctos-navy">Calories Left</span>
              <div className="flex items-center gap-1.5">
                {caloriesBurned > 0 && (
                  <span className="text-[10px] font-bold text-sanctos-green bg-sanctos-green/10 px-1.5 py-0.5 rounded">
                    +{caloriesBurned}
                  </span>
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

        <section className="flex flex-col gap-3">
          <button 
            onClick={() => setShowFridgeModal(true)}
            className="bg-sanctos-sand rounded-3xl p-5 text-left flex items-start gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-sanctos-navy shrink-0">
              <span className="material-symbols-outlined text-[24px]">kitchen</span>
            </div>
            <div>
              <h2 className="font-serif text-xl text-sanctos-navy mb-1">What's in my fridge?</h2>
              <p className="text-xs text-sanctos-navy/70 leading-relaxed">
                Tell us your ingredients and our AI chef will craft a DASH-compliant meal.
              </p>
            </div>
          </button>
        </section>
      </div>

      {showFridgeModal && (
        <div className="fixed inset-0 z-50 bg-sanctos-navy/40 backdrop-blur-sm flex items-end justify-center sm:items-center p-4 pb-24">
          <div className="bg-alive-bg w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 fade-in max-h-[80vh] overflow-y-auto">
            
            <div className="flex justify-between items-center sticky top-0 bg-alive-bg pb-2">
              <h3 className="font-serif text-2xl text-sanctos-navy">Sanctos Chef</h3>
              <button 
                onClick={() => { setShowFridgeModal(false); setRecipe(null); setIngredients(""); }} 
                className="text-sanctos-navy/50 hover:text-sanctos-navy"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!recipe && !loadingRecipe && (
              <div className="space-y-4">
                <p className="text-sm text-sanctos-navy/70">
                  What ingredients do you have? We'll build a meal targeting ~{Math.round(calLeft / 2)} kcal and ~{Math.round(sodiumLeft / 2)}mg sodium.
                </p>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="e.g., Chicken breast, spinach, tomatoes, brown rice..."
                  rows={3}
                  className="w-full bg-sanctos-sand/50 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-sanctos-green text-sanctos-navy font-medium resize-none"
                />
                <button 
                  onClick={generateRecipe}
                  disabled={!ingredients.trim()}
                  className="w-full bg-sanctos-navy text-white rounded-full py-4 font-semibold disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined">cooking</span>
                  Generate Recipe
                </button>
              </div>
            )}

            {loadingRecipe && (
              <div className="py-10 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-sanctos-green animate-bounce">skillet</span>
                <p className="font-serif text-lg text-sanctos-navy italic animate-pulse">Our chef is crafting your meal...</p>
              </div>
            )}

            {recipe && !loadingRecipe && (
              <div className="space-y-4">
                <div className="bg-sanctos-sand rounded-2xl p-4">
                  <h4 className="font-serif text-xl text-sanctos-navy mb-1">{recipe.recipe_name}</h4>
                  <div className="flex gap-3 text-xs font-semibold text-sanctos-navy/70">
                    <span>{recipe.calories} kcal</span>
                    <span>•</span>
                    <span>{recipe.sodium_mg} mg sodium</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-sanctos-navy mb-2">Ingredients</h5>
                  <ul className="list-disc pl-5 text-sm text-sanctos-navy/80 space-y-1">
                    {recipe.ingredients.map((ing: string, i: number) => <li key={i}>{ing}</li>)}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-sanctos-navy mb-2">Instructions</h5>
                  <ol className="list-decimal pl-5 text-sm text-sanctos-navy/80 space-y-2">
                    {recipe.instructions.map((step: string, i: number) => <li key={i}>{step}</li>)}
                  </ol>
                </div>

                <button 
                  onClick={logMeal}
                  disabled={savingMeal}
                  className="w-full bg-sanctos-green text-white rounded-full py-4 font-semibold mt-4 disabled:opacity-50"
                >
                  {savingMeal ? "Logging..." : "Log This Meal"}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}