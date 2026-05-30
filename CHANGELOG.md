# Changelog

All notable changes to the Mortgage Decision Record Audit Stream.

## [0.1] — 2026-05-29

### Added

- Initial draft event schema (`schema/mortgage-decision-event.schema.json`).
- 7-kind event taxonomy: `mortgage.application.read` / `.search` / `.write` / `.export` / `.recommendation-produced` / `.adverse-action-evaluated` / `mortgage.deletion-requested`.
- 14-type resource taxonomy mapped to URLA sections 1-7 + 9 + credit + appraisal + title + Loan Estimate + Closing Disclosure + Adverse Action Notice, with optional MISMO XPath.
- 7-doctrine `consent_basis` taxonomy: `ecoa-written-application`, `respa-required-disclosure`, `fair-housing-required-collection`, `hmda-government-monitoring`, `glba-financial-privacy-rule-required`, `consumer-explicit-opt-in-granted`, `judicial-order-or-subpoena`.
- C/R/U/D/E action codes + 0/4/8/12 outcome codes (mirrors HIPAA / DICOM audit semantics for cross-vertical regulator literacy).
- `ai_recommendation` block with the `human_underwriter_required = true` invariant — ECOA Reg B + CFPB UDAAP guardrail against autonomous adverse-action issuance.
- Hash chain conventions (SHA-256 over canonical JSON of event minus `hash`; `prev_hash` of first event = 64 zero hex characters).
- Node verifier (`src/verify.mjs`) with distinct exit codes for schema (1) / chain (2) / human-in-loop (3) failures.
- Example builder (`src/build-examples.mjs`) that seals source drafts into a hash-chained NDJSON stream.
- Canonical example: Pacific Coast Mortgage 2026 Q3 stream — VendorR LoanDecision v5.2 read + recommendation + human-underwriter adverse-action sequence.
- CI workflow that runs `build:examples` + `verify` on every push + PR.

### Not yet

- Optional Rust + Go verifiers (planned; mirror fhir-resource-access-audit + student-data-access-audit-stream cadence).
- 50-state RESPA / fair-lending records-retention overlay (planned via `state-real-estate-ai-disclosure-tracker` sibling).
- Settlement-services (RESPA Section 8) event taxonomy (Phase 2).
- Commercial real estate (CRE) lending overlay (Phase 2).
