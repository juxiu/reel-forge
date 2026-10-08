# Execution Log

| Stage | Result | Evidence |
|---|---|---|
| P0 | PASS | Actions run 37738234477 |
| P1 | PASS | verify:p1 + claim coverage negative regression |
| P2 | PASS | verify:p2 + timeline overlap negative regression |
| P3 | PASS | verify:p3 on core CI run 37738661398 |
| P4 | FIXED → VERIFYING | registerRoot issue found from run 37738661398; fixed in 098c2f0515f... |
| P5 | PASS | verify:p5 PASS on run 37738852451 after fixes |
| P6 | PASS | verify:p6 PASS on run 37738856901 after dependency fix |
| P7 | PASS | verify:p7 PASS on run 37738856901 |

## Distributed verification

- `.github/workflows/verify.yml`: core / Remotion / HyperFrames parallel jobs.
- `.github/workflows/verify-advanced.yml`: QC / Batch parallel jobs.

## Current runs

P4 remains the only open stage gate. Latest commit 1e34d0752c149558b8f3a969c7db3b0fe5174168 adds ffmpeg installation to the Remotion CI verification environment.

## Current runs

- verify run 37738856934: latest main pipeline after P6 fix.
- verify-advanced run 37738856901: latest advanced pipeline after P6 fix.
