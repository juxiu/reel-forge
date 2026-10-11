# Director System Task Bus

Branch: `feat/director-preflight-system`
Checkpoint: source audit and first contract/preflight implementation.
Execution state records the successful earlier GitHub Actions run for history, but both repository workflows are now temporarily removed at user request. Local verification commands remain. Current production mode is 16:9 only; the 9:16 IR is dormant.

| Task ID | Goal | Depends on | Files / outputs | Status | Latest result / blocker |
|---|---|---|---|---|---|
| DIRECTOR-AUDIT | Map source data, current branch and existing gates | — | README, package.json, ARCHITECTURE, SKILL, production IR, registry, verify-fast | PARTIAL | Main branch inspected; first CI run exposed the expected untracked runtime timeline boundary |
| DIRECTOR-CONTRACT | Define STYLE_BIBLE and SHOTBOOK contract | DIRECTOR-AUDIT | docs/DIRECTOR_PLAN.md, docs/STYLE_BIBLE.md, schemas/shotbook.schema.json | PASS-FAST-CI | Contract/schema integration and negative cases pass in GitHub Actions run 47 |
| DIRECTOR-PLANNING | Define story/visual decisions and unresolved-field policy | DIRECTOR-CONTRACT | director plan field mapping; IR adapter | PARTIAL | Current adapter derives fields from IR and labels unknown authorial decisions unresolved; no live Director Agent prompt change yet |
| DIRECTOR-INTEGRATION | Connect SHOTBOOK to production identities | DIRECTOR-CONTRACT, DIRECTOR-AUDIT | scripts/preflight/validate-director.mjs | PARTIAL | Source-only CI mode passes; production-release mode still needs a real generated timeline and runtime acceptance |
| PREFLIGHT-STATIC | Validate IDs, mapping, time, required data and structured findings | DIRECTOR-INTEGRATION | scripts/preflight/validate-director.mjs | IMPLEMENTED-TEST-PENDING | Source-only CI mode added after first run correctly exposed missing runtime timeline; second fast CI run is pending |
| PREFLIGHT-LAYOUT | Geometry, text bounds, safe zones and collision checks | DIRECTOR-CONTRACT, DIRECTOR-AUDIT | Existing visual contracts / browser measurement integration | BLOCKED | No measured geometry implementation added; requires inspection of current layout/measurement interfaces before coding |
| PREFLIGHT-RISK | Compute weighted risk and select visual evidence | DIRECTOR-CONTRACT, PREFLIGHT-STATIC | risk score + validationPlan in generated SHOTBOOK/report | PARTIAL | Weighted score and fingerprint-bound independent-review evidence are implemented; automatic preview generation and actual image-content verification remain |
| DIRECTOR-REVIEW | Independent review protocol and repair schema | DIRECTOR-CONTRACT, PREFLIGHT-RISK | docs/DIRECTOR_PLAN.md, report findings shape | PARTIAL | Findings are structured; independent review agent prompt, evidence capture and verification workflow remain |
| DIRECTOR-CI | Keep the repository free of GitHub Actions automation temporarily | PREFLIGHT-STATIC, DIRECTOR-CONTRACT | .github/workflows/ (removed), package.json, scripts/verify-fast.mjs | DISABLED-BY-REQUEST | GitHub workflow files removed; `npm run verify:fast` remains a manual local check |
| DIRECTOR-ACCEPTANCE | Run positive/negative/boundary tests and close defects | all above | test results, acceptance report | BLOCKED | Cannot claim PASS until commands execute in a repository checkout and remaining layout/review work is resolved |

## Checkpoint discipline

- Each task must record goal, dependencies, modified files, checks executed, latest result and blockers.
- Parallelize only tasks that do not change shared contracts.
- A missing check is not a pass.
- Static PASS, keyframe review PASS and full-render PASS are distinct states.
- Do not mark the system complete while PREFLIGHT-LAYOUT, visual evidence generation, independent review, or acceptance remain unresolved.


## Current operating scope (2026-10-11)

- GitHub Actions workflow files `.github/workflows/verify-fast.yml` and `.github/workflows/verify.yml` are removed from this feature branch.
- Active output ratio: `16:9` only. Remotion no longer registers `ReelForge9x16`; render, QC, repair, production verification and delivery require only 16:9 artifacts.
- `fixtures/render-ir-9x16.json` and portrait-oriented design tests are retained as dormant assets. They do not imply that a 9:16 video is currently produced or quality-approved.
- No fresh local test run has been performed through this GitHub file interface; prior GitHub Actions result is historical and will not rerun while workflow definitions are absent.
