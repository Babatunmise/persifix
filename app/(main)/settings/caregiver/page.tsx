"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

export default function CaregiverPage() {
  const [inviteInput, setInviteInput] = useState("");
  const [selectedTier, setSelectedTier] = useState("Supporter");
  const [inviteSent, setInviteSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput) return;
    
    setIsSaving(true);
    setError("");
    
    try {
      const session = await ensureAnonymousSession();
      if (!session) throw new Error("No active session.");

      const supabase = createClient();
      const { error: dbError } = await supabase.from("caregiver_invites").insert({
        user_id: session.user.id,
        invitee_contact: inviteInput,
        tier: selectedTier,
      });

      if (dbError) throw dbError;

      setInviteSent(true);
      setInviteInput("");
      
      // Reset success message after 3 seconds
      setTimeout(() => setInviteSent(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to send invite. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const tiers = [
    { name: "Viewer", desc: "Can see your shared readings and trend summary." },
    { name: "Supporter", desc: "Receives a weekly summary of your averages." },
    { name: "Care Partner", desc: "Receives alerts if you log a high reading or miss meds." },
    { name: "Primary", desc: "Full access to your dashboard and medication schedule." },
  ];

  return (
    <Container className="py-12 min-h-screen pb-24">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F9F8F6]">Caregiver Circle</h1>
          <Link href="/settings" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
            Back
          </Link>
        </div>

        <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
          Health doesn't happen in isolation. Invite a family member or trusted friend to support your journey.
        </p>

        {/* Invite Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#F9F8F6] mb-4">Invite Someone</h2>
          
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <input 
                type="text" 
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Email or phone number" 
                className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#2E5B44]"
              />
            </div>
            
            <div>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2E5B44]"
              >
                {tiers.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              disabled={isSaving || !inviteInput}
              className="w-full rounded-xl bg-[#2E5B44] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? "Sending..." : "Send Invite"}
            </button>
          </form>

          {inviteSent && (
            <p className="text-[#2E5B44] text-xs mt-3 font-medium text-center">Invite saved successfully!</p>
          )}
          {error && (
            <p className="text-red-500 text-xs mt-3 font-medium text-center">{error}</p>
          )}
        </div>

        {/* Tiers Definition */}
        <div>
          <h2 className="text-lg font-semibold text-[#F9F8F6] mb-4">Access Tiers</h2>
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <div key={tier.name} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#2E5B44] bg-[#2E5B44]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Tier {index + 1}
                  </span>
                  <h3 className="font-semibold text-[#F9F8F6]">{tier.name}</h3>
                </div>
                <p className="text-sm text-neutral-400">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Container>
  );
}