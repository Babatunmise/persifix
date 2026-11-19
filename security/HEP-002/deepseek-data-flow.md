# HEP-002 — DeepSeek data-flow register

The four AI-connected routes inspected were journal, kitchen, medication follow-up, and narrator.

| Endpoint | Baseline information sent | Remediated information sent |
|---|---|---|
| /api/journal | Full free-text journal entry | No journal content or account identifier; only a generic request for a non-personalised supportive response |
| /api/kitchen | Full client-supplied chat transcript | Bounded transcript (maximum 12 messages; 1,200 chars each), direct identifier redaction for email/phone/SSN/date patterns; no user ID, profile, BP, medication, or stored patient records |
| /api/meds-followup | Free-form missed-dose reason embedded in prompt | No DeepSeek request; previous dose-specific advice isolated pending clinical review |
| /api/narrator | BP, age, goals, meal context, and medication-adherence context | Only systolic and diastolic values; no identity, age, goals, profile, or medication context |

## Safeguards and limitations

- The DeepSeek API key remains server-side.
- No account identifier is included in outbound messages.
- Journal entries are not transmitted.
- Medication follow-up no longer calls DeepSeek.
- Kitchen applies pattern-based redaction. This does not guarantee detection of names or all identifying details in arbitrary free text; a verified vendor privacy/data-processing safeguard or stronger de-identification control is still required before transmitting potentially identifying text.
- Narrator transmits health measurements without direct identity fields. DeepSeek contractual, retention, training-use, and regional processing safeguards were not verified in this remediation session. Do not represent this as HIPAA-compliant or otherwise certified.
- All four outbound calls now have timeouts; provider error bodies are not logged or returned to clients.
