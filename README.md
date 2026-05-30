# mortgage-decision-record-audit-stream

> **Mortgage Decision Record Audit Stream v0.1 draft.** Per-mortgage-application AI-tool-access events, hash-chained and signed, designed to bridge **MISMO** + **Fannie Mae URLA** semantics to the Kinetic Gain Protocol Suite audit-stream spine. The Operator surface that lets a lender's loan-origination system + vendor AI tool emit Suite-compliant audit events without changing field names.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

> Status: v0.1 draft. Schema at [`schema/mortgage-decision-event.schema.json`](./schema/mortgage-decision-event.schema.json), Node verifier at [`src/verify.mjs`](./src/verify.mjs), canonical example at [`examples/pacific-coast-2026q3/`](./examples/pacific-coast-2026q3/).

## Why this exists

Every AI-assisted mortgage decision touches at least one regulatory record-keeping obligation: **ECOA Reg B 12 CFR §1002.12** (25-month application record retention), **GLBA Safeguards 16 CFR Part 314** (vendor-monitoring log), **HMDA 12 CFR Part 1003** (LAR submission), **CFPB UDAAP** examination access, and Fair Housing Act §3604 documentation. The lender's loan-origination system (LOS) already knows the field names. The vendor AI tool already knows the recommendation it issued. What's missing is a uniform stream that names *which AI tool read which URLA field at which timestamp under which consent basis under which buyer-published Decision Card* — provable to a CFPB examiner, a DOJ fair-lending attorney, a HUD investigator, and a state DFPI / DFS / DSML / IDFPR examiner without forcing the lender to rebuild its LOS or the vendor to abandon MISMO.

This repo defines the schema + verifier for that stream.

## The shape

Each event is a JSON object with:

| Field group | Purpose |
| --- | --- |
| `event_id`, `timestamp`, `kind` | Append-only identity |
| `source` | The emitting system (LOS or vendor tool) |
| `subject_application_ref` | **Tokenized** loan-application ID — raw loan ID, applicant SSN, applicant name MUST NOT appear |
| `resource` | URLA section + optional MISMO XPath + tokenized resource ID + logical fields accessed |
| `action` / `outcome` | C/R/U/D/E + 0/4/8/12 codes (compatibility with healthcare audit semantics) |
| `agent` | Which AI tool, which Decision Card, optional principal (underwriter / loan officer) |
| `consent_basis` | Code + citation + URI to the consent record |
| `decision_card_ref` | Required pointer to the buyer-published Decision Card governing this access |
| `records_of_disclosure_status` | Whether the access was logged in the ECOA + GLBA records |
| `purpose_of_use`, `redaction_applied` | Free-text + applied tokenization/redaction list |
| `ai_recommendation` | OPTIONAL — recommendation, reason codes, model version, **`human_underwriter_required = true`** (invariant) |
| `signature` | Optional ed25519 signature on the canonical-JSON serialization |
| `prev_hash`, `hash` | Hash chain (SHA-256 over canonical-JSON of the event minus `hash`) |

## Invariants the verifier enforces

1. **Schema** — every event validates against the JSON Schema.
2. **Hash chain** — `events[0].prev_hash = "0"*64`; for `i > 0`, `events[i].prev_hash = events[i-1].hash`; for every event, `hash = sha256(canonical_json(event - {hash}))`.
3. **Canonical JSON** — keys sorted lexicographically at every level, no insignificant whitespace, UTF-8.
4. **Human-in-loop invariant** — every `mortgage.application.recommendation-produced` event MUST set `ai_recommendation.human_underwriter_required = true`. This is the ECOA Reg B + CFPB UDAAP guardrail; no autonomous adverse-action issuance.

The verifier exits **0** on success, **1** on schema failure, **2** on chain failure, **3** on human-in-loop violation, **4** on usage error.

## Canonical example

[`examples/pacific-coast-2026q3/source.json`](./examples/pacific-coast-2026q3/source.json) — three events from Pacific Coast Mortgage's 2026 Q3 stream:

1. **`mortgage.application.read`** — VendorR LoanDecision v5.2 reads URLA Section 2 income fields under the borrower's written-application consent basis, with `BorrowerName`, `BorrowerSSN`, `PropertyStreetAddress` redacted before reaching the model.
2. **`mortgage.application.recommendation-produced`** — VendorR issues a `decline` recommendation with reason codes `DTI_RATIO_HIGH` + `INCOME_VERIFICATION_INCOMPLETE`, model_version `5.2.7`, `human_underwriter_required: true`. (NOT a final decision.)
3. **`mortgage.application.adverse-action-evaluated`** — Pacific Coast's human underwriter issues the final adverse-action notice under 12 CFR §1002.9 (30-day window), with reasons reconciled against the 1002.9(b)(2) sample list.

Cross-references the [mls-data-access-vault-contract-profile](https://github.com/mizcausevic-dev/mls-data-access-vault-contract-profile) (the vault contract that authorized the AI tool's access), the [title-chain-evidence-incident-card-profile](https://github.com/mizcausevic-dev/title-chain-evidence-incident-card-profile) (when an adverse-action is contested), and the [respa-readiness-evidence-bundle](https://github.com/mizcausevic-dev/respa-readiness-evidence-bundle) (the broader RESPA/ECOA/HMDA bundle this stream feeds).

## Quick start

```bash
npm install
npm run build:examples   # seal the source drafts into a hash-chained NDJSON stream
npm run verify           # validate schema + chain + human-in-loop invariant
```

CI runs both on every push + PR.

## Composes with

| Repo | Role |
| --- | --- |
| [`evidence-bundle-spec`](https://github.com/mizcausevic-dev/evidence-bundle-spec) | Underlying audit-stream conventions |
| [`mls-data-access-vault-contract-profile`](https://github.com/mizcausevic-dev/mls-data-access-vault-contract-profile) | Vault contract governing what fields the AI tool may read |
| [`title-chain-evidence-incident-card-profile`](https://github.com/mizcausevic-dev/title-chain-evidence-incident-card-profile) | When AI behavior triggers a fair-lending incident |
| [`respa-readiness-evidence-bundle`](https://github.com/mizcausevic-dev/respa-readiness-evidence-bundle) | Broader RESPA / ECOA / HMDA / GLBA readiness bundle |
| [`mortgage-applicant-bias-coverage-lab`](https://github.com/mizcausevic-dev/mortgage-applicant-bias-coverage-lab) | Bias-coverage analyses derived from this stream |
| [`fhir-resource-access-audit`](https://github.com/mizcausevic-dev/fhir-resource-access-audit) | Sibling HealthTech audit-stream profile (FHIR/HIPAA instead) |
| [`student-data-access-audit-stream`](https://github.com/mizcausevic-dev/student-data-access-audit-stream) | Sibling EdTech audit-stream profile (CEDS/Ed-Fi/FERPA instead) |

## Compliance posture

PropTech-readiness scaffolding for ECOA Reg B 12 CFR §1002.12 recordkeeping, RESPA records-retention, HMDA LAR submission, GLBA Safeguards 16 CFR Part 314 vendor-monitoring logs, CFPB UDAAP examination access, and Fair Housing Act §3604 documentation. The schema + verifier support a lender's program toward those obligations but do not by themselves establish compliance with any of them. Per the standing public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "ECOA-compliant" or "CFPB-attested" without an external attestation.

## License

MIT — see [`LICENSE`](./LICENSE).
