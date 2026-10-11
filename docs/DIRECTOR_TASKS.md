# Director System Task Bus

Branch: `feat/director-preflight-system`
Checkpoint: source audit and first contract/preflight implementation.
Execution state is based on repository changes only; checks have **not** been executed in a checkout during this run.

| Task ID | Goal | Depends on | Files / outputs | Status | Latest result / blocker |
|---|---|---|---|---|---|
| DIRECTOR-AUDIT | Map source data, current branch and existing gates | — | README, package.json, ARCHITECTURE, SKILL, production IR, registry, verify-fast | PARTIAL | Main branch inspected; repository checkout/CI runtime unavailable through the current GitHub file interface |
| DIRECTOR-CONTRACT | Define STYLE_BIBLE and SHOTBOOK contract | DIRECTOR-AUDIT | docs/DIRECTOR_PLAN.md, docs/STYLE_BIBLE.md, schemas/shotbook.schema.json | IMPLEMENTED-UNTESTED | Schema and docs committed to feature branch; contract test added |
| DIRECTOR-PLANNING | Define story/visual decisions and unresolved-field policy | DIRECTOR-CONTRACT | director plan field mapping; IR adapter | PARTIAL | Current adapter derives fields from IR and labels unknown authorial decisions unresolved; no live Director Agent prompt change yet |
| DIRECTOR-INTEGRATION | Connect SHOTBOOK to production identities | DIRECTOR-CONTRACT, DIRECTOR-AUDIT | scripts/preflight/validate-director.mjs | IMPLEMENTED-UNTESTED | Reads both production IRs, script, timeline and registry; emits artifact SHOTBOOK plus report; runtime not yet verified |
| PREFLIGHT-STATIC | Validate IDs, mapping, time, required data and structured findings | DIRECTOR-INTEGRATION | scripts/preflight/validate-director.mjs | IMPLEMENTED-UNTESTED | Deterministic rules authored; must run in checkout and add negative fixture tests |
| PREFLIGHT-LAYOUT | Geometry, text bounds, safe zones and collision checks | DIRECTOR-CONTRACT, DIRECTOR-AUDIT | Existing visual contracts / browser measurement integration | BLOCKED | No measured geometry implementation added; requires inspection of current layout/measurement interfaces before coding |
| PREFLIGHT-RISK | Compute weighted risk and select visual evidence | DIRECTOR-CONTRACT, PREFLIGHT-STATIC | risk score + validationPlan in generated SHOTBOOK/report | PARTIAL | Risk scoring/report selection implemented; actual still/short-preview generation and review-evidence ingestion not implemented |
| DIRECTOR-REVIEW | Independent review protocol and repair schema | DIRECTOR-CONTRACT, PREFLIGHT-RISK | docs/DIRECTOR_PLAN.md, report findings shape | PARTIAL | Findings are structured; independent review agent prompt, evidence capture and verification workflow remain |
| DIRECTOR-CI | Run director checks in fast CI | PREFLIGHT-STATIC, DIRECTOR-CONTRACT | package.json, scripts/verify-fast.mjs | IMPLEMENTED-UNTESTED | Commands added to fast list; workflow-level CI and observed run still need verification |
| DIRECTOR-ACCEPTANCE | Run positive/negative/boundary tests and close defects | all above | test results, acceptance report | BLOCKED | Cannot claim PASS until commands execute in a repository checkout and remaining layout/review work is resolved |

## Checkpoint discipline

- Each task must record goal, dependencies, modified files, checks executed, latest result and blockers.
- Parallelize only tasks that do not change shared contracts.
- A missing check is not a pass.
- Static PASS, keyframe review PASS and full-render PASS are distinct states.
- Do not mark the system complete while PREFLIGHT-LAYOUT, visual evidence generation, independent review, or acceptance remain unresolved.
