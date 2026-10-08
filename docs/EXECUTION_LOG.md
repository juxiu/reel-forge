# Execution Log

| Stage | Result | Evidence |
|---|---|---|
| P0 | PASS | Actions run 37738234477 |
| P1 | PASS | verify:p1 + claim coverage negative regression |
| P2 | PASS | verify:p2 + timeline overlap negative regression |
| P3 | PASS | verify:p3 on core CI run 37738661398 |
| P4 | FIXED → VERIFYING | registerRoot issue found from run 37738661398; fixed in 098c2f0515f... |
| P5 | FIXED → VERIFYING | missing visual.objects + RenderIR nesting issues found from CI; fixed in 395fdca518... |
| P6 | FIXED → VERIFYING | clean CI missing upstream scene artifact; fixed in 2a4bb16ef1... |
| P7 | VERIFYING | batch/cache gate wired into verify-advanced |

## Distributed verification

- `.github/workflows/verify.yml`: core / Remotion / HyperFrames parallel jobs.
- `.github/workflows/verify-advanced.yml`: QC / Batch parallel jobs.

## Current runs

- verify run 37738856934: latest main pipeline after P6 fix.
- verify-advanced run 37738856901: latest advanced pipeline after P6 fix.
