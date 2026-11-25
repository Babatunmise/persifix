"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AhuvaKitchen from "@/components/AhuvaKitchen";
import { supabase } from "@/supabase";

export default function AhuvaPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    async function verifyUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !data.user) {
          router.replace("/");
          return;
        }
        setCheckingAccess(false);
      } catch {
        if (active) router.replace("/");
      }
    }
    void verifyUser();
    return () => { active = false; };
  }, [router]);

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-alive-bg px-6 text-sanctos-navy">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm">
          <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-sanctos-green/20 border-t-sanctos-green" />
          <span>Preparing your kitchen…</span>
        </div>
      </main>
    );
  }

  return (
    <>
      <AhuvaKitchen />
      <BottomNav />
    </>
  );
}
