# HEP-002 Rate-Limit Hardening — Verification Plan

**Target:** PR #5, branch `hep-002/rate-limit-hardening`  
**Latest automated run:** [GitHub Actions 44569188702](https://github.com/Babatunmise/persifix/actions/runs/44569188702)  
**Production changes:** none; production rollout remains blocked pending the release gates below

## A. Pre-migration checks

- [ ] Confirm the Supabase `private` schema is absent from API Settings → Exposed schemas.
- [x] Confirm the production RPC signature and current application call sites.
- [x] Confirm the migration preserves the old three-argument signature.
- [x] Confirm the old signature ignores `p_limit` and `p_window_seconds`.
- [x] Confirm the one-argument signature is available for the updated application.
- [x] Confirm the migration grants no direct table privileges to `PUBLIC`, `anon`, `authenticated` or `service_role`.
- [x] Confirm only the private helper has the intended write path to the rate-limit table.

## B. Database tests — disposable PostgreSQL 17

All checked items below passed in the latest GitHub Actions run. Synthetic users only; no patient data.

- [x] Anonymous execution of both public RPC signatures is denied.
- [x] Authenticated execution of the one-argument RPC succeeds for valid endpoints.
- [x] Authenticated execution of the legacy three-argument RPC succeeds but ignores supplied limit/window values.
- [x] Invalid endpoint values are rejected.
- [x] Direct SELECT against `private.api_rate_limits` is denied to API roles.
- [x] Direct INSERT, UPDATE and DELETE against `private.api_rate_limits` are denied to API roles.
- [x] API roles have no direct access to other users' counters; synthetic users receive independent counters.
- [ ] Counter updates under concurrent requests are not yet stress-tested.
- [x] Fixed limits are enforced: kitchen 12, narrator 10, journal 8, meds-followup 6, report 3 per 60-second window.
- [x] Exceeded limits return `allowed = false` and a positive retry interval.
- [x] Expired windows reset.
- [x] Public wrappers are SECURITY INVOKER.
- [x] Private helper is SECURITY DEFINER with an empty search path.
- [ ] Confirm `private` is not in Supabase API Exposed schemas.
- [ ] Rerun Supabase security advisors after the production migration; current production findings remain.

## C. Application validation

- [x] Targeted ESLint on the six HEP-002 API/security files.
- [x] TypeScript check: `npx tsc --noEmit`.
- [x] Production build: `npm run build`.
- [ ] Verify all five routes against the migrated database after coordinated rollout.
- [ ] Verify 401 for missing/invalid authentication after rollout.
- [ ] Verify 400/415/413 validation paths after rollout.
- [ ] Verify 429 and `Retry-After` for all five endpoint limits after rollout.
- [ ] Verify rate-limit storage failure fails closed with 503 in the deployed environment.
- [x] Preserve the existing fail-closed controls for Kitchen and Narrator while external AI approval is absent.
- [x] Preserve the rule that journal text and patient-specific facts are not sent to the external AI provider.
- [x] Preserve the existing ownership-scoped report queries and the completed 28/28 cross-account table checks.

**Lint scope note:** full-repository lint currently reports unrelated JSX-escaping errors in Gym and Home UI files. PR #5's six API/security files lint successfully; the full application typecheck and build pass.

## D. Coordinated rollout

1. Confirm `private` is not an exposed API schema.
2. Obtain Executive Office approval for the private limiter RLS/access model and the outstanding residual-risk decisions.
3. Apply the reviewed database migration first. It retains the legacy three-argument RPC and makes caller-supplied policy values ineffective.
4. Verify both RPC signatures and rerun Supabase security advisors.
5. Deploy the updated application once, after the Vercel quota is available and the complete batch is approved.
6. Verify all five routes, rate-limit responses and `Retry-After`.
7. Keep the legacy three-argument wrapper until old application instances no longer call it.
8. PR #4 has been closed without merging; do not reintroduce its temporary test-only page.
9. Keep PR #5 unmerged until production rollout and runtime verification pass.

## E. Stop conditions

Stop rollout and do not deploy application code if:
- the private schema is exposed through the API;
- the migration fails;
- either public wrapper is SECURITY DEFINER;
- API roles can directly read or mutate the counter table;
- the legacy signature honours caller-supplied limits;
- cross-account counter isolation fails;
- any protected route regresses;
- Kitchen or Narrator transmits health data without approved safeguards.
