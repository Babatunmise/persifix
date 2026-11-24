"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import AhuvaKitchen from "@/components/AhuvaKitchen";
import { supabase } from "@/supabase";

export default function KitchenPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;
    async function verifyUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {
        router.replace("/");
        return;
      }
      setCheckingAccess(false);
    }
    void verifyUser();
    return () => { active = false; };
  }, [router]);

  if (checkingAccess) {
    return <main className="min-h-screen bg-alive-bg" aria-label="Loading Ahuva" />;
  }

  return (
    <>
      <AhuvaKitchen />
      <BottomNav />
    </>
  );
}
