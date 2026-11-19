"use client";

import { useState } from "react";
import { supabase } from "@/supabase";

type Result = { test: string; passed: boolean; detail: string };

export default function Hep002VerificationPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"create" | "attack" | "cleanup" | "done">("create");
  const [results, setResults] = useState<Result[]>([]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Connecting securely to Supabase Auth…");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`Sign-in failed: ${error.message}`);
        return;
      }
      setSignedIn(true);
      setMessage("Signed in. Continue with the step shown below.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown connection error";
      setMessage(`Could not reach Supabase Auth: ${detail}`);
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  async function createOwnerFixture() {
    setBusy(true);
    setResults([]);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      if (ownerId && auth.user.id !== ownerId) throw new Error("Sign in with the first test account for this step.");
      const { data, error } = await supabase
        .from("bp_readings")
        .insert({ user_id: auth.user.id, systolic: 117, diastolic: 76, pulse: 65 })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "Could not create the synthetic test record.");
      const { data: ownRows, error: readError } = await supabase
        .from("bp_readings").select("id").eq("id", data.id);
      if (readError || !ownRows || ownRows.length !== 1) throw new Error("The owner could not read the newly created test record.");
      setOwnerId(auth.user.id);
      setFixtureId(data.id);
      setPhase("attack");
      setMessage("Synthetic test record created and its owner can read it. Sign out, then sign in with your second test account.");
      setResults([{ test: "Owner positive control", passed: true, detail: "First account created and read its own synthetic blood-pressure record." }]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test setup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runSecondAccountTests() {
    if (!ownerId || !fixtureId) return;
    setBusy(true);
    setResults([]);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      if (auth.user.id === ownerId) throw new Error("This is the first account. Sign out and sign in with the second test account.");
      const out: Result[] = [];

      const { data: rows, error: selectError } = await supabase
        .from("bp_readings").select("id").eq("id", fixtureId);
      out.push({
        test: "Read first account's record",
        passed: !selectError && (rows?.length ?? 0) === 0,
        detail: selectError ? `Request error: ${selectError.message}` : `${rows?.length ?? 0} matching records visible; expected 0.`,
      });

      const { data: updated, error: updateError } = await supabase
        .from("bp_readings").update({ systolic: 118 }).eq("id", fixtureId).select("id");
      out.push({
        test: "Change first account's record",
        passed: !updateError && (updated?.length ?? 0) === 0,
        detail: updateError ? `Request error: ${updateError.message}` : `${updated?.length ?? 0} records changed; expected 0.`,
      });

      const { data: deleted, error: deleteError } = await supabase
        .from("bp_readings").delete().eq("id", fixtureId).select("id");
      out.push({
        test: "Delete first account's record",
        passed: !deleteError && (deleted?.length ?? 0) === 0,
        detail: deleteError ? `Request error: ${deleteError.message}` : `${deleted?.length ?? 0} records deleted; expected 0.`,
      });

      const { error: insertError } = await supabase.from("bp_readings").insert({
        user_id: ownerId, systolic: 119, diastolic: 77, pulse: 66,
      });
      out.push({
        test: "Create a record under first account's identity",
        passed: !!insertError,
        detail: insertError ? "Database rejected the cross-account insert." : "Insert unexpectedly succeeded; investigate immediately.",
      });

      setResults(out);
      const passed = out.filter((item) => item.passed).length;
      setPhase("cleanup");
      setMessage(`${passed} of 4 cross-account checks passed. Sign out, sign back in with the first account, then remove the synthetic test record.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cross-account test failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cleanupFixture() {
    if (!ownerId || !fixtureId) return;
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user || auth.user.id !== ownerId) {
        throw new Error("Sign in with the first test account to clean up its synthetic record.");
      }
      const { data, error } = await supabase.from("bp_readings")
        .delete().eq("id", fixtureId).eq("user_id", ownerId).select("id");
      if (error || data?.length !== 1) throw new Error(error?.message || "Cleanup could not be confirmed.");
      setFixtureId(null);
      setPhase("done");
      setMessage("Synthetic test record successfully deleted. Cross-account test is complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setSignedIn(false);
      setMessage("Signed out. Sign in with the account requested in the next step.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] px-5 py-10 text-[#171717]">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Hephaestus · HEP-002</p>
          <h1 className="text-3xl font-semibold tracking-tight">Two-account isolation verification</h1>
          <p className="text-sm leading-6 text-neutral-600">A temporary test using two real Sanctos test accounts and one synthetic blood-pressure record.</p>
        </header>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
          <h2 className="font-semibold">Safety</h2>
          <p className="text-sm leading-6 text-neutral-600">Only a clearly synthetic record (117/76, pulse 65) is created. No real health information is used. The second account attempts to read, change, delete, and create a record under the first account's identity. The page never displays your password or sends it to Sanctos API routes. The synthetic record is removed at the end.</p>
        </div>

        {!signedIn ? (
          <form onSubmit={signIn} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold">{phase === "create" ? "Step 1 — Sign in with the first test account" : phase === "attack" ? "Step 2 — Sign in with the second test account" : phase === "cleanup" ? "Step 3 — Sign back in with the first test account" : "Verification complete"}</h2>
            <label className="block space-y-1 text-sm"><span>Email</span><input className="w-full rounded-lg border border-neutral-300 px-3 py-2" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block space-y-1 text-sm"><span>Password</span><input className="w-full rounded-lg border border-neutral-300 px-3 py-2" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button disabled={busy || phase === "done"} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold">Account signed in</p>
            {phase === "create" && <button onClick={createOwnerFixture} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating test record…" : "Create first-account test record"}</button>}
            {phase === "attack" && <button onClick={runSecondAccountTests} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Testing isolation…" : "Run second-account isolation tests"}</button>}
            {phase === "cleanup" && <button onClick={cleanupFixture} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Cleaning up…" : "Delete synthetic test record"}</button>}
            <button onClick={signOut} disabled={busy || phase === "done"} className="ml-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Sign out</button>
          </div>
        )}

        {message && <p role="status" className="rounded-lg bg-neutral-100 p-3 text-sm">{message}</p>}
        {results.length > 0 && <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3"><h2 className="font-semibold">Results</h2><ul className="space-y-3">{results.map((r) => <li key={r.test} className="flex justify-between gap-4 text-sm"><span><strong>{r.test}</strong><br /><span className="text-xs text-neutral-600">{r.detail}</span></span><span className={r.passed ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>{r.passed ? "PASS" : "CHECK"}</span></li>)}</ul></section>}
        <p className="text-xs leading-5 text-neutral-500">Temporary development-branch test only. Do not enter real patient information. Keep this page open throughout the three steps so the synthetic record reference is retained. HEP-002 remains open until all verification and regression work is complete.</p>
      </section>
    </main>
  );
}
