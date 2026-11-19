# HEP-002 — Clinical safety review register

Status: OPEN — clinical sign-off required.

## Isolated pending review

1. Medication follow-up: the previous prompt advised taking a missed dose when remembered unless near the next dose, and advised not taking it after dizziness. This is medication/formulation-specific and cannot be safely generalised. The endpoint now returns a neutral referral to the patient leaflet or pharmacist/prescriber. No dose-specific instruction is generated. Clinical review required before restoring tailored advice.
2. Kitchen sodium calculation: existing dictionary values and fallback estimate are retained unchanged. Ingredient amounts are multiplied by dictionary values without verified unit normalisation; unknown ingredients use a fixed fallback. These values are not validated clinical nutrition data.
3. Kitchen calorie calculation: the client currently estimates calories as 0.8 multiplied by estimated sodium when saving a meal. This is not a defensible calorie calculation and must not be treated as nutritional truth. It is flagged for clinical/product correction; no replacement formula is introduced in this security remediation.
4. BP classification and narrator: no classification thresholds or deterministic BP classification rules were changed. The narrator now receives only systolic/diastolic values and is instructed not to diagnose or recommend treatment. Its language and escalation behavior still require clinician review.
5. Report: report averages are computed from user-owned BP readings. Journal excerpts are excluded because the source/storage/consent model was not verified. The PDF remains a summary of logged data, not a clinical assessment.

## Required clinical decisions

- Approve a medication-specific missed-dose decision pathway, including dizziness, only after review by a qualified clinician/pharmacist.
- Validate sodium dictionary sources, units, ingredient quantities, serving calculations, and uncertainty labels.
- Remove or replace the sodium-derived calorie placeholder using a validated nutrition source and formula.
- Approve BP thresholds, emergency escalation wording, and report interpretation before any clinical classification is presented.
