"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

const GOALS = [
  { value: "lose_weight", label: "Lose weight" },
  { value: "lower_bp", label: "Lower blood pressure" },
  { value: "reduce_stress", label: "Reduce stress" },
  { value: "healthy_habits", label: "Build healthy habits" },
  { value: "sleep_better", label: "Sleep better" },
];

export default function Onboarding() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [dob, setDob] = useState("");

  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("in");
  const [heightCm, setHeightCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");

  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
        return;
      }
      const meta = data.user.user_metadata as { full_name?: string; name?: string };
      const autoName = meta.full_name || meta.name || "";
      if (autoName && !name) setName(autoName);
      setCheckingAuth(false);
    });
  }, [router, name]);

  function toggleGoal(value: string) {
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  }

  function heightInInches(): number | null {
    const f = feet ? Number(feet) : 0;
    const i = inches ? Number(inches) : 0;
    if (!f && !i) return null;
    return f * 12 + i;
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError("Please enter your name.");
      if (!dob) return setError("Please enter your date of birth.");
    }
    setStep(step + 1);
  }

  async function finish() {
    if (goals.length === 0) return setError("Please choose at least one goal.");

    const heightValue =
      heightUnit === "cm" ? (heightCm ? Number(heightCm) : null) : heightInInches();

    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      name: name.trim(),
      gender,
      date_of_birth: dob,
      height: heightValue,
      height_unit: heightUnit,
      weight: weight ? Number(weight) : null,
      weight_unit: weightUnit,
      goals,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/home");
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-navy">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-between text-xs text-green">
          <span>Step {step} of 3</span>
          <span>{step === 1 ? "About you" : step === 2 ? "Your body" : "Your goals"}</span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-navy">Let&apos;s get to know you</h2>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-navy/20 bg-white text-navy"
            />
            <div>
              <label className="text-sm text-navy mb-1 block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-navy/20 bg-white text-navy"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-navy mb-1 block">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-navy/20 bg-white text-navy"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-navy">A few measurements</h2>
            <p className="text-xs text-green">Optional — you can add these later.</p>

            <div>
              <label className="text-sm text-navy mb-1 block">Height</label>
              <div className="flex gap-2 items-center">
                {heightUnit === "in" ? (
                  <>
                    <input
                      type="number"
                      placeholder="ft"
                      value={feet}
                      onChange={(e) => setFeet(e.target.value)}
                      className="w-20 px-3 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                    />
                    <span className="text-navy text-sm">ft</span>
                    <input
                      type="number"
                      placeholder="in"
                      value={inches}
                      onChange={(e) => setInches(e.target.value)}
                      className="w-20 px-3 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                    />
                    <span className="text-navy text-sm">in</span>
                  </>
                ) : (
                  <input
                    type="number"
                    placeholder="cm"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                  />
                )}
                <select
                  value={heightUnit}
                  onChange={(e) => setHeightUnit(e.target.value as "cm" | "in")}
                  className="px-3 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                >
                  <option value="in">ft/in</option>
                  <option value="cm">cm</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-navy mb-1 block">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as "kg" | "lb")}
                  className="px-3 py-3 rounded-lg border border-navy/20 bg-white text-navy"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-navy">What are your goals?</h2>
            <p className="text-xs text-green">Pick as many as apply.</p>
            <div className="space-y-2">
              {GOALS.map((g) => {
                const selected = goals.includes(g.value);
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGoal(g.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border flex items-center gap-3 ${
                      selected
                        ? "bg-navy text-background border-navy"
                        : "bg-white text-navy border-navy/20"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                        selected ? "bg-background text-navy border-background" : "border-navy/30"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-lg border border-navy text-navy font-semibold"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 py-3 rounded-lg bg-navy text-background font-semibold"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-navy text-background font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Finish"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}