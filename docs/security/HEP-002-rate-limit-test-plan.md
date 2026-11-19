# HEP-002 Rate-Limit Hardening — Verification Plan

**Target:** PR #5, branch `hep-002/rate-limit-hardening`  
**Execution:** after isolated database migration testing and when the Vercel deployment quota is available  
**Production changes:** prohibited until all pre-deployment checks pass

## A. Pre-migration checks

- [ ] Confirm the Supabase `private` schema is not listed in API Settings → Exposed schemas.
- [ ] Confirm the production RPC signatures and current application call sites.
- [ ] Confirm the proposed migration preserves the old three-argument signature.
- [ ] Confirm the old signature ignores `p_limit` and `p_window_seconds`.
- [ ] Confirm the one-argument signature is available for the updated application.
- [ ] Confirm the migration grants no direct table privileges to `PUBLIC`, `anon`, `authenticated` or `service_role`.
- [ ] Confirm only the private helper can write the rate-limit table.

## B. Database tests in an isolated environment

Use synthetic test users only. Do not use actual patient data.

- [ ] Anonymous execution of both public RPC signatures is denied.
- [ ] Authenticated execution of the one-argument RPC succeeds for valid endpoints.
- [ ] Authenticated execution of the legacy three-argument RPC succeeds but ignores supplied limit/window values.
- [ ] Invalid endpoint values are rejected.
- [ ] Direct SELECT against `private.api_rate_limits` is denied to API roles.
- [ ] Direct INSERT, UPDATE and DELETE against `private.api_rate_limits` are denied to API roles.
- [ ] User A cannot read or modify User B's counter.
- [ ] Counter updates remain atomic under concurrent requests.
- [ ] The configured limits are fixed at: kitchen 12, narrator 10, journal 8, meds-followup 6, report 3 per 60-second window.
- [ ] Exceeded limits return `allowed = false` and a positive retry interval.
- [ ] Reset occurs after the fixed 60-second window.
- [ ] Public wrappers are SECURITY INVOKER.
- [ ] Private helper has an empty search path and is not in an exposed schema.
- [ ] Supabase security advisors no longer report the public SECURITY DEFINER rate-limit RPC.

## C. Application build and route tests

- [ ] Run lint and type checks.
- [ ] Run the production Next.js build.
- [ ] Verify all five routes still authenticate correctly.
- [ ] Verify the new one-argument RPC call works for all five routes.
- [ ] Verify 401 for missing/invalid authentication.
- [ ] Verify 400/415/413 validation paths remain correct.
- [ ] Verify 429 and `Retry-After` for each endpoint's limit.
- [ ] Verify rate-limit storage failure fails closed with 503.
- [ ] Verify Kitchen and Narrator remain unavailable while external AI approval is absent.
- [ ] Verify journal text is not transmitted externally.
- [ ] Verify missed-dose endpoint returns only the safe, non-dose-specific guidance.
- [ ] Verify report data is fetched only under the authenticated user's ownership filters.

## D. Coordinated rollout

1. Apply the verified database migration first. The old three-argument RPC remains available and now enforces fixed limits, so the currently deployed API code continues to work.
2. Verify both RPC signatures in the database.
3. Deploy the updated application once the complete batch has passed review.
4. Verify the new one-argument RPC calls on all five API routes.
5. Keep the legacy three-argument wrapper until old clients are no longer expected to call it; it is safe because caller-supplied policy values are ignored.
6. Do not merge or deploy the test-only PR #4 page.
7. Do not merge PR #5 until build, migration and runtime verification are complete.

## E. Stop conditions

Stop the rollout and do not deploy application code if:
- the migration fails;
- the private schema is exposed through the API;
- either public wrapper is SECURITY DEFINER;
- API roles can directly mutate the counter table;
- the legacy signature still honours caller-supplied limits;
- cross-account counter isolation fails;
- any protected route regresses;
- Kitchen or Narrator transmits health data without approved safeguards.
