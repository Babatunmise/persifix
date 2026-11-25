# AHUVA-002 — Initial Architecture Submission (Superseded)

**Status:** Superseded by corrected version 1.0.0 following Argus's AHUVA-002 review.

The initial submission is retained in Git history for auditability. It is not the authoritative architecture package and must not be used as the migration source.

Use the following corrected, consolidated artifacts for Argus Gate A review:

1. [Corrected architecture v1.0.0](./AHUVA-002-corrected-architecture-v1.0.0.md)
2. [Authoritative SQL definition v1.0.0](./AHUVA-002-schema-v1.0.0.sql)
3. [PR #7 head gap assessment](./AHUVA-002-PR7-head-assessment-1f086008.md)

Key corrections include canonical `ahuva_saved_recipes`, explicit six-category consent classification, trusted server-side consent enforcement, separate session and persistent constraints, reconciled retention/deletion, verified Supabase backup limitations, offline cache protection, Ireland hosting and cross-border processing review, atomic revision/idempotency protocol, and safety-restrictive conflict handling.

**Approval state:** Gate A pending. Gate B not authorised. No migration or database change has been performed. External AI remains disabled. HEP-002 is unchanged. PR #7 remains draft and unmerged.
