"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/");

      setEmail(userData.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, goals")
        .eq("id", userData.user.id)
        .single();

      if (profile) {
        setName(profile.name || "");
        setGoals(profile.goals || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return <main className="min-h-screen bg-alive-bg" />;

  return (
    <main className="min-h-screen bg-alive-bg flex flex-col max-w-md mx-auto relative pb-24">
      
      <header className="bg-alive-bg/85 backdrop-blur-xl pt-6 pb-4 px-6 sticky top-0 z-40 flex items-center gap-3">
        <button onClick={() => router.push("/home")} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sanctos-navy">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col justify-center">
          <span className="font-serif text-2xl tracking-tight text-sanctos-navy">Your Profile</span>
        </div>
      </header>

      <div className="px-6 flex flex-col gap-6 pt-2">
        
        <section className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-sanctos-navy flex items-center justify-center text-white mb-3">
            <span className="material-symbols-outlined text-[40px]">person</span>
          </div>
          <h2 className="font-serif text-2xl text-sanctos-navy">{name || "Friend"}</h2>
          <p className="text-sm text-sanctos-navy/60">{email}</p>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-sanctos-navy mb-2">Your Health Goals</h3>
          <div className="flex flex-wrap gap-2">
            {goals.length > 0 ? goals.map((goal) => (
              <span key={goal} className="bg-sanctos-sand text-sanctos-navy text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                {goal.replace("_", " ")}
              </span>
            )) : (
              <p className="text-sm text-sanctos-navy/50">No goals set.</p>
            )}
          </div>
        </section>

        <button 
          onClick={handleSignOut}
          className="w-full bg-red-50 text-red-600 rounded-full py-4 font-semibold border border-red-100 mt-4 hover:bg-red-100 transition-colors"
        >
          Sign Out
        </button>

      </div>

      <BottomNav />
    </main>
  );
}