"use client";

import { useState } from "react";
import { supabase } from "@/supabase";

type Fixture = { table: string; id: string; label: string };
type Result = { test: string; passed: boolean; detail: string };
const isAccessDenied = (error: { code?: string; status?: number } | null | undefined) => !!error && (error.code === "42501" || error.status === 401 || error.status === 403);

const specs = [
  { table: "bp_readings", label: "Blood-pressure readings", values: (userId: string) => ({ user_id: userId, systolic: 117, diastolic: 76, pulse: 65 }) },
  { table: "meal_logs", label: "Meal logs", values: (userId: string) => ({ user_id: userId, meal_type: "breakfast", description: "HEP-002 synthetic test meal", calories: 100, sodium_mg: 10 }) },
  { table: "weight_logs", label: "Weight logs", values: (userId: string) => ({ user_id: userId, weight: 70, weight_unit: "kg" }) },
  { table: "workout_logs", label: "Workout logs", values: (userId: string) => ({ user_id: userId, activity_type: "HEP-002 synthetic test", duration_mins: 5, calories_burned: 10 }) },
  { table: "sanctuary_logs", label: "Sanctuary logs", values: (userId: string) => ({ user_id: userId, activity_type: "HEP-002 synthetic test", duration_mins: 1 }) },
  { table: "medications", label: "Medications", values: (userId: string) => ({ user_id: userId, name: "HEP-002 synthetic test", dosage: "1 test unit", frequency: "Once", pills_remaining: 1 }) },
] as const;

export default function Hep002VerificationPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [phase, setPhase] = useState<"create" | "attack" | "cleanup" | "done">("create");
  const [results, setResults] = useState<Result[]>([]);
  const [cleanupRequired, setCleanupRequired] = useState<Fixture[]>([]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("Connecting securely to Supabase Auth…");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(`Sign-in failed: ${error.message}`); return; }
      setSignedIn(true); setMessage("Signed in. Continue with the step shown below.");
    } catch (error) {
      setMessage(`Could not reach Supabase Auth: ${error instanceof Error ? error.message : "Unknown connection error"}`);
    } finally { setBusy(false); setPassword(""); }
  }

  async function createFixtures() {
    setBusy(true); setResults([]);
    const created: Fixture[] = [];
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      if (ownerId && auth.user.id !== ownerId) throw new Error("Sign in with the first test account.");
      setOwnerId(auth.user.id);
      for (const spec of specs) {
        const { data, error } = await (supabase.from(spec.table as any) as any).insert(spec.values(auth.user.id)).select("id").single();
        if (error || !data) throw new Error(`Could not create synthetic ${spec.label} fixture: ${error?.message || "No record returned"}`);
        created.push({ table: spec.table, id: data.id, label: spec.label });
      }
      const medication = created.find((item) => item.table === "medications");
      if (!medication) throw new Error("Medication fixture missing.");
      const { data: medLog, error: medLogError } = await supabase.from("medication_logs").insert({
        user_id: auth.user.id, medication_id: medication.id, status: "taken",
      }).select("id").single();
      if (medLogError || !medLog) throw new Error(`Could not create synthetic medication-log fixture: ${medLogError?.message || "No record returned"}`);
      created.push({ table: "medication_logs", id: medLog.id, label: "Medication logs" });
      for (const fixture of created) {
        const { data, error } = await (supabase.from(fixture.table as any) as any).select("id").eq("id", fixture.id);
        if (error || data?.length !== 1) throw new Error(`Owner positive control failed for ${fixture.label}.`);
      }
      setOwnerId(auth.user.id); setFixtures(created); setPhase("attack");
      setResults([{ test: "Owner positive controls", passed: true, detail: `First account created and read all ${created.length} synthetic records.` }]);
      setMessage("Synthetic records created. Sign out, then sign in with the second test account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fixture setup failed.");
      if (created.length) setMessage((error instanceof Error ? error.message : "Fixture setup failed.") + " Some fixtures may have been created; sign back in with the first account and use cleanup if the page recorded them.");
      setFixtures(created);
      if (created.length) setPhase("cleanup");
    } finally { setBusy(false); }
  }

  async function runIsolation() {
    if (!ownerId || fixtures.length === 0) return;
    setBusy(true); setResults([]);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");
      if (auth.user.id === ownerId) throw new Error("This is the first account. Sign out and sign in with the second test account.");
      const out: Result[] = [];
      const cleanupFixtures = [...fixtures];
      for (const fixture of fixtures) {
        const client = supabase.from(fixture.table as any) as any;
        const { data: rows, error: selectError } = await client.select("id").eq("id", fixture.id);
        const readDenied = selectError ? isAccessDenied(selectError) : (rows?.length ?? 0) === 0;
        out.push({ test: `${fixture.label}: cross-account read`, passed: readDenied, detail: selectError ? `Request denied: ${selectError.message}` : `${rows?.length ?? 0} rows visible; expected 0.` });
        const updateValues = fixture.table === "bp_readings" ? { systolic: 118 } : fixture.table === "weight_logs" ? { weight: 71 } : fixture.table === "meal_logs" ? { description: "unauthorised change" } : fixture.table === "medications" ? { name: "unauthorised change" } : fixture.table === "medication_logs" ? { status: "missed" } : { activity_type: "unauthorised change" };
        const { data: updated, error: updateError } = await client.update(updateValues).eq("id", fixture.id).select("id");
        const updateDenied = updateError ? isAccessDenied(updateError) : (updated?.length ?? 0) === 0;
        out.push({ test: `${fixture.label}: cross-account update`, passed: updateDenied, detail: updateError ? `Request denied: ${updateError.message}` : `${updated?.length ?? 0} rows changed; expected 0.` });
        const { data: deleted, error: deleteError } = await client.delete().eq("id", fixture.id).select("id");
        const deleteDenied = deleteError ? isAccessDenied(deleteError) : (deleted?.length ?? 0) === 0;
        out.push({ test: `${fixture.label}: cross-account delete`, passed: deleteDenied, detail: deleteError ? `Request denied: ${deleteError.message}` : `${deleted?.length ?? 0} rows deleted; expected 0.` });
        const spoofValues = fixture.table === "bp_readings" ? { user_id: ownerId, systolic: 119, diastolic: 77, pulse: 66 }
          : fixture.table === "meal_logs" ? { user_id: ownerId, meal_type: "snack", description: "spoof test", calories: 1, sodium_mg: 1 }
          : fixture.table === "weight_logs" ? { user_id: ownerId, weight: 71, weight_unit: "kg" }
          : fixture.table === "workout_logs" ? { user_id: ownerId, activity_type: "spoof test", duration_mins: 1, calories_burned: 1 }
          : fixture.table === "sanctuary_logs" ? { user_id: ownerId, activity_type: "spoof test", duration_mins: 1 }
          : fixture.table === "medications" ? { user_id: ownerId, name: "spoof test", dosage: "1", frequency: "Once", pills_remaining: 1 }
          : { user_id: ownerId, medication_id: fixtures.find((item) => item.table === "medications")?.id, status: "taken" };
        const { data: inserted, error: insertError } = await client.insert(spoofValues).select("id").maybeSingle();
        const insertDenied = insertError ? isAccessDenied(insertError) : false;
        if (inserted?.id) cleanupFixtures.push({ table: fixture.table, id: inserted.id, label: `${fixture.label} (unexpected spoof insert)` });
        out.push({ test: `${fixture.label}: spoofed-owner insert`, passed: insertDenied, detail: insertError ? (isAccessDenied(insertError) ? "Database rejected the cross-account insert." : `Unexpected database error: ${insertError.message}`) : inserted?.id ? `Insert unexpectedly succeeded; cleanup ID recorded: ${inserted.id}` : "No inserted row was returned; this is not a verified denial." });
      }
      setFixtures(cleanupFixtures);
      setResults(out);
      const passed = out.filter((item) => item.passed).length;
      setPhase("cleanup");
      setMessage(`${passed} of ${out.length} cross-account checks passed. Sign out, sign back in with the first account, then clean up the synthetic records.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cross-account test failed."); }
    finally { setBusy(false); }
  }

  async function cleanup() {
    if (!ownerId || fixtures.length === 0) return;
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user || auth.user.id !== ownerId) throw new Error("Sign in with the first test account to clean up.");
      const deferred = fixtures.filter((fixture) => fixture.table === "sanctuary_logs");
      for (const fixture of [...fixtures].filter((item) => item.table !== "sanctuary_logs").reverse()) {
        const { error } = await (supabase.from(fixture.table as any) as any).delete().eq("id", fixture.id).eq("user_id", ownerId).select("id");
        if (error) throw new Error(`Cleanup not confirmed for ${fixture.label}: ${error.message}`);
      }
      setCleanupRequired(deferred); setFixtures([]); setPhase("done");
      setMessage(deferred.length ? "User-accessible synthetic records were removed. The sanctuary_logs fixture has no user-level DELETE policy, so its exact test ID is listed below for engineering-side cleanup." : "All synthetic test records were deleted successfully. Verification run complete.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Cleanup failed."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await supabase.auth.signOut(); setSignedIn(false); setMessage("Signed out. Sign in with the account requested in the next step."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] px-5 py-10 text-[#171717]">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Hephaestus · HEP-002</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sensitive-data isolation verification</h1>
          <p className="text-sm leading-6 text-neutral-600">A temporary test of two real Sanctos test accounts across seven sensitive data tables.</p>
        </header>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
          <h2 className="font-semibold">Safety</h2>
          <p className="text-sm leading-6 text-neutral-600">This creates only artificial test entries in your two test accounts: a sample BP reading, meal, weight, workout, sanctuary activity, medication and medication log. Do not enter real health information. The second account attempts read, update, delete and spoofed-owner insert operations. All synthetic entries are removed at the end. Keep this page open throughout.</p>
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
            {phase === "create" && <button onClick={createFixtures} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating synthetic entries…" : "Create first-account test entries"}</button>}
            {phase === "attack" && <button onClick={runIsolation} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Testing isolation…" : "Run second-account isolation tests"}</button>}
            {phase === "cleanup" && <button onClick={cleanup} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Removing synthetic entries…" : "Delete all synthetic test entries"}</button>}
            {phase !== "done" && <button onClick={signOut} disabled={busy} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Sign out</button>}
          </div>
        )}
        {message && <p role="status" className="rounded-xl bg-white p-4 text-sm leading-6">{message}</p>}
        {results.length > 0 && <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3"><h2 className="font-semibold">Test results</h2>{results.map((result, index) => <div key={index} className="flex items-start justify-between gap-4 border-t border-neutral-100 pt-3 text-sm"><div><p className="font-medium">{result.test}</p><p className="mt-1 text-neutral-600">{result.detail}</p></div><span className={result.passed ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{result.passed ? "PASS" : "CHECK"}</span></div>)}</div>}
        {cleanupRequired.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 space-y-2"><h2 className="font-semibold">Engineering cleanup required</h2><p className="text-sm">These exact synthetic rows could not be deleted through the user account because the table has no DELETE policy. Send these IDs back to Hephaestus for controlled cleanup.</p>{cleanupRequired.map((item) => <p key={item.id} className="break-all font-mono text-xs">{item.table}: {item.id}</p>)}</div>}
        <p className="text-xs leading-5 text-neutral-500">Temporary HEP-002 development verification only. No production code or database schema is changed by this page.</p>
      </section>
    </main>
  );
}
