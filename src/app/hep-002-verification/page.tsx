"use client";

import { useState } from "react";
import { supabase } from "@/supabase";

type TestResult = {
  endpoint: string;
  status: number | null;
  passed: boolean;
  detail: string;
};

const checks = [
  { endpoint: "/api/journal", body: {} },
  { endpoint: "/api/kitchen", body: {} },
  { endpoint: "/api/meds-followup", body: {} },
  { endpoint: "/api/narrator", body: {} },
  { endpoint: "/api/report", body: {} },
];

export default function Hep002VerificationPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setPassword("");
    if (error) {
      setMessage("Sign-in failed. Check the email, password, and account verification.");
      return;
    }
    setSignedIn(true);
    setMessage("Signed in. You can now run the five authentication checks.");
  }

  async function runChecks() {
    setBusy(true);
    setMessage("");
    setResults([]);
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      setSignedIn(false);
      setBusy(false);
      setMessage("Your session has expired. Sign in again to continue.");
      return;
    }

    const completed: TestResult[] = [];
    for (const check of checks) {
      try {
        const response = await fetch(check.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify(check.body),
          cache: "no-store",
        });
        const passed = response.status === 400;
        completed.push({
          endpoint: check.endpoint,
          status: response.status,
          passed,
          detail: passed
            ? "Authenticated request reached route validation; no health data was submitted."
            : response.status === 401
              ? "The API rejected this session as unauthenticated."
              : `Unexpected response. HTTP ${response.status}.`,
        });
      } catch {
        completed.push({
          endpoint: check.endpoint,
          status: null,
          passed: false,
          detail: "Network request failed.",
        });
      }
      setResults([...completed]);
    }
    setBusy(false);
    const passedCount = completed.filter((item) => item.passed).length;
    setMessage(`${passedCount} of 5 authentication checks passed. These checks do not yet establish cross-user data isolation.`);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setSignedIn(false);
    setResults([]);
    setMessage("Signed out of the test session.");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] px-5 py-10 text-[#171717]">
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Hephaestus · HEP-002</p>
          <h1 className="text-3xl font-semibold tracking-tight">Authenticated API verification</h1>
          <p className="text-sm leading-6 text-neutral-600">
            A temporary test page for verifying that a signed-in Sanctos account is accepted by the five protected API routes.
          </p>
        </header>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold">Before you begin</h2>
          <p className="text-sm leading-6 text-neutral-600">
            Use the dedicated test account you created. Your password is sent directly to Supabase Auth for sign-in; this page does not send it to the Sanctos API routes or display/store it itself. The checks send empty test payloads only. They do not read, create, change, or delete health records and do not call external AI services.
          </p>
        </div>

        {!signedIn ? (
          <form onSubmit={signIn} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <h2 className="text-lg font-semibold">Sign in to the test environment</h2>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-700"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Password</span>
              <input
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-700"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold">Test account signed in</p>
              <p className="text-sm text-neutral-600">Your password is no longer held in the form.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={runChecks} disabled={busy} className="rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Running checks…" : "Run five authentication checks"}
              </button>
              <button onClick={signOut} disabled={busy} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                Sign out
              </button>
            </div>
          </div>
        )}

        {message && <p role="status" className="rounded-lg bg-neutral-100 p-3 text-sm">{message}</p>}

        {results.length > 0 && (
          <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <h2 className="text-lg font-semibold">Results</h2>
            <ul className="divide-y divide-neutral-100">
              {results.map((result) => (
                <li key={result.endpoint} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{result.endpoint}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{result.detail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${result.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {result.status === null ? "Network error" : `HTTP ${result.status}`}
                    {" · "}{result.passed ? "PASS" : "CHECK"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs leading-5 text-neutral-500">
          This is a temporary verification utility, not a patient-facing feature. Do not enter real patient information here. HEP-002 remains open until the remaining ownership-isolation and regression checks are completed.
        </p>
      </section>
    </main>
  );
}
