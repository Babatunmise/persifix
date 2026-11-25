# AHUVA-002 — PR #7 Head Gap Assessment

**Assessment version:** 1.0.0  
**Repository:** Babatunmise/persifix  
**PR:** #7 — open, draft, unmerged  
**Branch:** feature/ahuva-definitive-realignment  
**Code head reviewed:** `1f0860085f1795b0ea7ed163c55af45afcbea682`  
**Base:** `main` at `4330dfbb852caca29a4b01bbb4c2f6b8fe048229`  
**Comparison:** 39 commits ahead, 0 behind; 16 changed files  
**Review method:** Fresh PR metadata, changed-file list, commit diff, source-file reads, combined status and workflow-run reads.  
**Scope:** Read-only assessment. No application runtime code was changed for this review.

> Subsequent commits adding this corrected architecture package and this assessment are documentation-only. The code findings below are tied to the exact code head above and remain applicable unless runtime source changes.

---

## 1. Executive result

PR #7 is still a **prototype, not an end-to-end Ahuva implementation**. The current branch contains the companion-led UI, local same-device recovery, deterministic Pot Math module, and a fail-closed API route. It does not yet contain server-authoritative cooking-session persistence, cross-device synchronisation, structured ingredient persistence, consent-enforced persistent restrictions/preferences, deterministic Clinical Guard, or verified deletion/retention behaviour.

The architecture documents are proposals only. No Ahuva migration exists in the branch's executable migration path, and no Ahuva schema or RLS validation has been run against a disposable database.

### Current status summary

| Area | Current status | Evidence / consequence |
|---|---|---|
| Companion-led entry and UI states | Implemented as prototype | `AhuvaKitchen.tsx` contains home, conversation, plan, Pot Math, Plate Prep, cooking and completion screens |
| Authentication page gate | Partially implemented | `src/app/ahuva/page.tsx` calls `supabase.auth.getUser()`; this is not database ownership enforcement |
| Local session recovery | Implemented, unsafe for final privacy model | Entire session object is written to `window.localStorage` |
| Server-side session persistence | Not implemented | No Ahuva session CRUD endpoint or database schema in runtime |
| Cross-device recovery | Not implemented | No server-authoritative session state or revision protocol |
| Structured ingredients and steps | Not implemented | UI stores ingredient/step content as newline-delimited strings |
| Persistent preferences | Not implemented | No consent-aware persistence path |
| Session/persistent constraints | Not implemented | Restrictions remain free text in the local session object |
| Deterministic Clinical Guard | Not implemented | No runtime allergen/derivative/cross-contact validation |
| Pot Math | Implemented, limited test coverage | 10 unit tests; expanded locale, boundary, density, parsing and culinary cases remain |
| Timers | Same-device prototype | Client clock and localStorage; no server-authoritative timer |
| Completion/history/saved recipes/feedback persistence | Not implemented | Completion feedback is local UI state; no server persistence |
| Individual/account deletion | Not implemented | No Ahuva deletion operations or propagation tests |
| Consent enforcement | Not implemented | No trusted server operation or consent ledger in runtime |
| Accessibility/responsive | Not adequately verified | No complete browser/accessibility evidence in this assessment |
| External AI | Deliberately blocked | API returns 503 after auth and shared rate limit; no provider call |
| HEP-002 | Existing protections retained | No HEP-002 code change is part of this assessment |

---

## 2. Direct source evidence

### 2.1 Local storage contains more than a harmless display cache

At the reviewed code head, `src/components/AhuvaKitchen.tsx` defines:

```ts
const STORAGE_KEY = "sanctos.ahuva.cooking-session.v1";
```

The `Session` object includes:
- task and intent;
- meal name and servings;
- ingredient and step text;
- free-text restrictions;
- checked ingredients and completed steps;
- active screen and resume screen;
- timer status, end timestamp and remaining duration;
- feedback text.

The component reads and writes the full object through `window.localStorage`. This is same-browser/same-origin recovery, not secure server persistence. The restrictions and feedback fields make this cache unsuitable as the final privacy design. Replace with minimal, account-bound IndexedDB cache/queue, exclude persistent health data and raw transcripts, and apply the corrected offline policy before production use.

### 2.2 Authentication is not persistence ownership

`src/app/ahuva/page.tsx` checks `supabase.auth.getUser()` and redirects unauthenticated users. This protects page entry but does not prove owner isolation for data operations. No Ahuva persistence API exists at this code head. All future read/write operations must authenticate server-side and derive user_id from the verified auth subject.

### 2.3 External AI is correctly fail-closed

`src/app/api/kitchen/route.ts`:
1. calls `authenticateRequest(req)`;
2. calls the shared `enforceRateLimit(auth.supabase, "kitchen")`;
3. returns HTTP 503 with a message that the request was not sent to an external AI provider.

No AI provider is called. This must remain unchanged until a separate Argus AI/privacy approval.

### 2.4 Pot Math is a useful baseline, not acceptance-complete

`src/lib/ahuva-pot-math.mjs` is a deterministic module. The current 10 tests cover unitless counts, fractions, mass and volume conversions, explicitly named US cup, ambiguous cup handling, non-linear ingredient review, unsupported units, invalid inputs and avoiding assumed density.

Missing expanded coverage includes mixed fractions, locale-specific aliases/decimal separators, negative/zero/overflow values, repeated conversion/rounding, source-backed food density, invalid preparation state, stale density source, parser ambiguity and broader culinary review. The existing tests do not establish a clinically safe calculation engine.

---

## 3. CI and deployment evidence at reviewed head

At `1f0860085f1795b0ea7ed163c55af45afcbea682`:

| Check | Observed result | Interpretation |
|---|---|---|
| Ahuva verification workflow run #47 | Completed, success | The committed Ahuva CI workflow passed for this head |
| HEP-002 validation workflow run #77 | Completed, success | HEP-002 validation passed for this head; no HEP-002 modification is authorised |
| Combined commit status: Vercel | Success | Vercel reported a successful status for the reviewed commit |
| PR state | Open, draft, unmerged | Not approved for merge or release |

A successful CI/build status does not prove complete browser UX, cross-device persistence, RLS, privacy, clinical safety or accessibility acceptance. The current Vercel success status is a deployment/check status, not production approval.

Manual authenticated browser journey, screenshots at mobile/tablet/desktop sizes, keyboard-only review, screen-reader review and independent experience scorecards remain outstanding.

---

## 4. Required implementation gap by workstream

### A. Persistent core
- Add authenticated server-side session create/read/update/complete/abandon/delete operations.
- Use the corrected schema and only after Gates A and B.
- Implement structured ingredients, steps, quantities, units, preparation status and stable child IDs.
- Persist timer state using server timestamps.
- Add cross-device recovery and explicit saved/pending/conflict/deleted UI states.

### B. Privacy and consent
- Implement append-only consent events and separate scopes for personalisation, health restrictions, religious restrictions and feedback learning.
- Apply the six-category consent matrix in the corrected architecture.
- Route all persistent writes through trusted server operations that verify current scope consent.
- Keep session-only restrictions effective without persistent-consent opt-in.
- Do not cache health restrictions in persistent browser storage or send them to external AI.

### C. Safety and calculations
- Implement deterministic ingredient identity/alias resolution and Clinical Guard.
- Recheck after every ingredient or plan adaptation.
- Unknown or ambiguous food/allergen/cross-contact evidence must remain not verified.
- Expand Pot Math tests to the corrected programme.
- Qualified clinical/allergen review is required before making clinical safety claims.

### D. Retention and deletion
- Implement individual deletion and account-deletion lifecycle.
- Implement scheduled purge for sessions, context, meals, feedback and calculations.
- Add session tombstones and deletion propagation.
- Verify provider backup capability; current connected Supabase organisation is Free, so automatic daily backup retention and a 35-day boundary are not available as currently configured.

### E. Verification
- Disposable migration validation requires explicit Gate B after Gate A.
- Run two-user/anonymous RLS tests, owner spoofing, consent withdrawal, deletion, idempotency, concurrency and offline recovery suites.
- Complete responsive, browser, keyboard and screen-reader verification.
- Keep AI-dependent acceptance separate from AI-independent acceptance.

---

## 5. Gate disposition

| Gate | Current disposition |
|---|---|
| A — Argus architecture approval | Pending corrected v1.0.0 package review |
| B — Disposable-environment migration validation | Not authorised |
| C — Reproducible migration/RLS/security evidence | Not started |
| D — Controlled implementation stage | Not authorised |

No database changes, migration creation/application, disposable migration execution, production modification, external AI activation, HEP-002 change, PR merge or production deployment is authorised by this assessment.

— **Hephaestus Engineering Office**
