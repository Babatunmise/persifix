"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form State
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [medName, setMedName] = useState("");
  const [supplyCount, setSupplyCount] = useState("");
  const [dosesPerDay, setDosesPerDay] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (data) {
          setHeightCm(data.height_cm?.toString() || "");
          setWeightKg(data.weight_kg?.toString() || "");
          setMedName(data.medication_name || "");
          setSupplyCount(data.supply_count?.toString() || "");
          setDosesPerDay(data.doses_per_day?.toString() || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const session = await ensureAnonymousSession();
      if (!session) throw new Error("No active session.");

      const supabase = createClient();
      
      const payload = {
        id: session.user.id,
        height_cm: heightCm ? parseInt(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        medication_name: medName || null,
        supply_count: supplyCount ? parseInt(supplyCount) : null,
        doses_per_day: dosesPerDay ? parseInt(dosesPerDay) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;
      setMessage("Profile saved successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#121212] text-[#F9F8F6] flex items-center justify-center">Loading...</div>;
  }

  return (
    <Container className="py-12 min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F9F8F6]">Edit Profile</h1>
          <Link href="/settings" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
            Back to Settings
          </Link>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Physical Metrics */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-2">Physical Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Height (cm)</label>
                <input type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Weight (kg)</label>
                <input type="number" inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]" />
              </div>
            </div>
          </div>

          {/* Medication Supply Loop */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500 mb-2">Medication Supply</h2>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Medication Name</label>
              <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g., Amlodipine" className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Pills Left</label>
                <input type="number" inputMode="numeric" value={supplyCount} onChange={(e) => setSupplyCount(e.target.value)} className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Doses / Day</label>
                <input type="number" inputMode="numeric" value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)} className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]" />
              </div>
            </div>
          </div>

          {message && <p className="text-center text-sm text-[#2E5B44] font-medium">{message}</p>}

          <button type="submit" disabled={isSaving} className="w-full rounded-full bg-[#2E5B44] py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </Container>
  );
}