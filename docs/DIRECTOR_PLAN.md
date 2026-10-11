# Director Plan Contract

Status: **v1 adapter contract**. The current production source remains `fixtures/render-ir-16x9.json` plus its paired `fixtures/render-ir-9x16.json`; `script/timeline.json` remains the timing authority. This document does not declare the authored decisions below to be AI-reviewed: deterministic values are explicitly labeled as source-derived.

## Narrative freeze

Each chapter/segment should answer: what question is being resolved, what the audience knows before and after, what causal or structural relation must become clear, and how the segment hands off to the next. Do not turn narration keywords into visual labels unless the label explains a relation.

## Decision ownership

- Director: narrative purpose, visual relationship, metaphor, hero, continuity, risk and validation intent.
- Build agent: maps a locked decision to existing stage topology/components and reports structured change requests when it cannot comply.
- Independent reviewer: evaluates the decision against source IR and selected visual evidence; implementation self-report is not evidence.
- Deterministic preflight: validates identities, source mapping, timing, geometry budgets and declared risk. It does not claim to prove aesthetic quality.

## Production identity

`scene.id` is the stable identity. `source_ref.script_id` maps it to the script segment; `source_ref.segment_index` must agree with the segment order. The 16:9 IR is the current adapter input and the 9:16 IR must preserve scene IDs, order and duration. Registry entries in `src/shots/registry.jsx` are checked against those IDs.

## Field mapping for the current IR

| SHOTBOOK field | Current source / adapter |
|---|---|
| shotId | `scene.id` |
| narrationBeat | `source_ref.script_id` and matching script segment / timeline sentence |
| storyPurpose | `narrative_job` |
| visualRelationship | director decision when present; otherwise explicit `unclassified` requiring review |
| visualMetaphor | explicit authored value when present; otherwise `not-applicable` or unresolved |
| heroElement | `elements` entry selected as hero, if present |
| layerPlan | stage/background + scene elements + text overlays, using actual project interfaces |
| entryState / keyAction / holdState / exitState | authored recipe/IR motion when represented; otherwise unresolved, never inferred as visually proven |
| transitionIntent / continuityIds | authored fields when present; otherwise unresolved |
| timing | scene start/duration, fps and timeline sentence/subtitle frames |
| layoutBudget | composition safe margin, project visual contracts and subtitle budget |
| assetManifest | actual referenced files and license metadata; absent manifest is a blocking dependency for external media |
| motionRecipe | `variant`, `motion` and mapped scene recipe |
| riskLevel | computed by `scripts/preflight/validate-director.mjs` |
| validationPlan | computed deterministic checks plus risk-selected preview checks |

The adapter must report unresolved fields instead of fabricating director decisions. Migration to a richer authored SHOTBOOK is incremental and must keep `shotId` tied to the same production scene identity.

## Gate semantics

- **BLOCK**: deterministic contradiction, missing production mapping, malformed source, invalid timing, duplicate IDs, invalid contract, or missing required dependency.
- **WARN**: unresolved authored intent, unverified asset provenance, or missing evidence that can only be judged visually.
- **VISUAL_REVIEW**: a selected still/short preview is required. A static pass never implies motion or full-render pass.
- **PASS**: only the checks listed in the report passed; it is not a global production approval.

Run `npm run verify:director-preflight`. The report is written under `artifacts/<project_id>/preflight/director-report.json`; no complete video render is performed.

## High-risk review evidence

The preflight report includes `sourceFingerprint`, a SHA-256 over the active 16:9 IR, 9:16 IR, script, timeline and shot registry. A high-risk shot is not cleared by a verbal claim or by an old report. After producing evidence with the existing single-shot preview/debug workflow, an independent reviewer must write `artifacts/<project_id>/preflight/visual-review.json` in this shape:

```json
{
  "status": "approved",
  "sourceFingerprint": "<exact sourceFingerprint from the latest director-report.json>",
  "reviewedShots": [
    {
      "shotId": "scene-001",
      "status": "approved",
      "evidence": "artifacts/debug/16x9/scene-001/contact-sheet.png",
      "reviewer": "independent-director-agent",
      "findings": []
    }
  ]
}
```

The evidence path must point to an actual artifact and the reviewer must not be the implementation agent. This initial adapter validates the review record and fingerprint, but it does not yet generate previews automatically or verify the visual contents of the referenced image; acceptance remains incomplete until that workflow is automated and independently tested.
