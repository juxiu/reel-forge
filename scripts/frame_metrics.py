#!/usr/bin/env python3
import argparse, glob, json, math, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--frames", default="artifacts/frames/16x9")
ap.add_argument("--render-ir", default="")
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
    frame_no = int(os.path.splitext(os.path.basename(filename))[0].split("_")[-1]) - 1
    rows.append({
        "frame": frame_no,
        "file": os.path.basename(filename),
        "bright_ratio": bright_ratio,
        "black_ratio": black_ratio,
        "change": change,
    })
    prev = image

def longest_low_change(items, threshold=0.35):
    run = 0
    longest = 0
    for row in items:
        if row["change"] < threshold:
            run += 1
            longest = max(longest, run)
        else:
            run = 0
    return longest

summary = {
    "frames": len(rows),
    "max_bright_ratio": max((row["bright_ratio"] for row in rows), default=0),
    "max_black_ratio": max((row["black_ratio"] for row in rows), default=0),
    "mean_change": float(np.mean([row["change"] for row in rows])) if rows else 0,
    "longest_low_change_run": longest_low_change(rows),
}

scenes = []
if args.render_ir and os.path.exists(args.render_ir):
    ir = json.load(open(args.render_ir, encoding="utf8"))
    fps = int(ir.get("fps", 30))
    for scene in ir.get("scenes", []):
        start = round(float(scene["start"]) * fps)
        end = max(start, math.ceil((float(scene["start"]) + float(scene["duration"])) * fps) - 1)
        scene_rows = [row for row in rows if start <= row["frame"] <= end]
        longest = longest_low_change(scene_rows)
        scenes.append({
            "id": scene["id"],
            "from": start,
            "to": end,
            "frames": len(scene_rows),
            "longest_low_change_run": longest,
            "status": "FAIL" if longest > 90 else "PASS",
        })

summary["scenes"] = scenes
scene_failed = any(scene["status"] == "FAIL" for scene in scenes)
summary["status"] = "FAIL" if summary["longest_low_change_run"] > 90 or scene_failed else "PASS"

os.makedirs(os.path.dirname(args.out), exist_ok=True)
with open(args.out, "w", encoding="utf8") as handle:
    json.dump({"summary": summary, "frames": rows}, handle, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False))
if summary["status"] != "PASS":
    raise SystemExit(1)
