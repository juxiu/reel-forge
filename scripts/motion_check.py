#!/usr/bin/env python3
import argparse, glob, json, math, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("frames", nargs="?", default="artifacts/frames/16x9")
ap.add_argument("--render-ir", default="")
ap.add_argument("--threshold", type=float, default=0.35)
ap.add_argument("--report", default="artifacts/qc/motion.json")
args = ap.parse_args()

files = sorted(glob.glob(os.path.join(args.frames, "*.jpg")))
prev = None
changes = []
for filename in files:
    image = np.asarray(Image.open(filename).convert("L").resize((320, 180)), dtype=np.float32)
    diff = 0.0 if prev is None else float(np.abs(image - prev).mean())
    frame_no = int(os.path.splitext(os.path.basename(filename))[0].split("_")[-1]) - 1
    changes.append({"frame": frame_no, "file": os.path.basename(filename), "change": diff})
    prev = image

def longest_low_change(items):
    run = 0
    best = 0
    for item in items:
        if item["change"] < args.threshold:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best

summary = {
    "frames": len(changes),
    "threshold": args.threshold,
    "mean_change": float(np.mean([item["change"] for item in changes])) if changes else 0,
    "longest_low_change_frames": longest_low_change(changes),
}

scenes = []
if args.render_ir and os.path.exists(args.render_ir):
    ir = json.load(open(args.render_ir, encoding="utf8"))
    fps = int(ir.get("fps", 30))
    for scene in ir.get("scenes", []):
        start = round(float(scene["start"]) * fps)
        end = max(start, math.ceil((float(scene["start"]) + float(scene["duration"])) * fps) - 1)
        scene_rows = [row for row in changes if start <= row["frame"] <= end]
        longest = longest_low_change(scene_rows)
        scenes.append({
            "id": scene["id"],
            "from": start,
            "to": end,
            "frames": len(scene_rows),
            "longest_low_change_frames": longest,
            "status": "FAIL" if longest > 90 else "PASS",
        })

summary["scenes"] = scenes
scene_failed = any(scene["status"] == "FAIL" for scene in scenes)
summary["status"] = "FAIL" if summary["longest_low_change_frames"] > 90 or scene_failed else "PASS"

os.makedirs(os.path.dirname(args.report), exist_ok=True)
with open(args.report, "w", encoding="utf8") as handle:
    json.dump({"summary": summary}, handle, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False))
if summary["status"] != "PASS":
    raise SystemExit(1)
