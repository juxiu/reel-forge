#!/usr/bin/env python3
import argparse, glob, json, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("frames", nargs="?", default="artifacts/frames/16x9")
ap.add_argument("--threshold", type=float, default=0.35)
ap.add_argument("--report", default="artifacts/qc/motion.json")
args = ap.parse_args()

files = sorted(glob.glob(os.path.join(args.frames, "*.jpg")))
prev = None
run = 0
best = 0
changes = []
for filename in files:
    image = np.asarray(Image.open(filename).convert("L").resize((320, 180)), dtype=np.float32)
    diff = 0.0 if prev is None else float(np.abs(image - prev).mean())
    changes.append(diff)
    prev = image
    if diff < args.threshold:
        run += 1
        best = max(best, run)
    else:
        run = 0

summary = {
    "frames": len(files),
    "threshold": args.threshold,
    "mean_change": float(np.mean(changes)) if changes else 0,
    "longest_low_change_frames": best,
    "status": "FAIL" if best > 90 else "PASS",
}

os.makedirs(os.path.dirname(args.report), exist_ok=True)
with open(args.report, "w", encoding="utf8") as handle:
    json.dump({"summary": summary}, handle, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False))
if summary["status"] != "PASS":
    raise SystemExit(1)
