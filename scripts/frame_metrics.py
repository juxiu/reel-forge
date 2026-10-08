#!/usr/bin/env python3
import argparse, glob, json, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--frames", default="artifacts/frames/16x9")
ap.add_argument("--out", default="artifacts/qc/frame_metrics.json")
args = ap.parse_args()

files = sorted(glob.glob(os.path.join(args.frames, "*.jpg")))
rows = []
prev = None
for filename in files:
    image = np.asarray(Image.open(filename).convert("L").resize((320, 180)), dtype=np.int16)
    bright_ratio = float((image > 170).mean())
    black_ratio = float((image < 8).mean())
    change = 0.0 if prev is None else float(np.abs(image - prev).mean())
    rows.append({
        "file": os.path.basename(filename),
        "bright_ratio": bright_ratio,
        "black_ratio": black_ratio,
        "change": change,
    })
    prev = image

run = 0
longest = 0
for row in rows:
    if row["change"] < 0.35:
        run += 1
        longest = max(longest, run)
    else:
        run = 0

summary = {
    "frames": len(rows),
    "max_bright_ratio": max((row["bright_ratio"] for row in rows), default=0),
    "max_black_ratio": max((row["black_ratio"] for row in rows), default=0),
    "mean_change": float(np.mean([row["change"] for row in rows])) if rows else 0,
    "longest_low_change_run": longest,
    "status": "FAIL" if longest > 90 else "PASS",
}

os.makedirs(os.path.dirname(args.out), exist_ok=True)
with open(args.out, "w", encoding="utf8") as handle:
    json.dump({"summary": summary, "frames": rows}, handle, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False))
if summary["status"] != "PASS":
    raise SystemExit(1)
