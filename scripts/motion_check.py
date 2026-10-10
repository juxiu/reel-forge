#!/usr/bin/env python3
"""节奏体检：持续动作 + 末拍落位停留（纯 stdlib，帧必须是 PNG）。

用法：
  npm run motion-check -- --frames artifacts/frames/16x9 \
      --render-ir fixtures/render-ir-16x9.json --out artifacts/<pid>/qc/motion_16x9.json

量什么（全部只在 QC 取景区内，HUD 和字幕带不参与）：
  · 最长静止  取景区 320 宽灰度平均变化 < still_thr 的最长连续段，判据 ≤ still_max_seconds
  · hold      离场开始前最后一段「无大面积变化」（< hold_thr）的连续帧数，判据 ≥ hold_min_frames
  · still%    只报不判 —— 为它给静止物体加漂浮/呼吸是把指标当目标
  · 分类      只有真的超时才算：中位变化像素 < class_true_static → 真静（该给动词动作）；
              < class_small_motion → 小面积动作（该加大幅度）；否则「有动作」（是运镜问题，回分镜）

判据数值一律来自 fixtures/visual_contracts.json，本文件不内联阈值。
「无大面积变化」的口径：落位后只剩动词动作/慢推/呼吸时尾段变化 0.4–1.2，
入场、22 帧滑入、33 帧推近、整组平移是 2.5–15 —— 所以 hold 量的是「版面落定后停了多久」，
不是「完全不动了多久」；离场前先灭光的那几帧算离场，已从 hold 里扣掉。

内存：3600 帧的全分辨率图肯定存不下，这里逐帧流过，每帧只留标量（变化值、区亮度），
分类阶段再按窗口重开那几十帧。慢一点，但不会 OOM，也不需要 PIL。
"""
import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pngio  # noqa: E402
import vision  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--frames", default="artifacts/frames/16x9")
ap.add_argument("--render-ir", default="")
ap.add_argument("--report", default="artifacts/qc/motion.json")
ap.add_argument("--contracts", default="fixtures/visual_contracts.json")
ap.add_argument("--step", type=int, default=None, help="抽帧步长（帧），默认取 contracts 的 motion.step")
ap.add_argument("--max-frames", type=int, default=0, help="调试用：只处理前 N 帧")
args = ap.parse_args()

try:
    C = vision.load_contracts(args.contracts)
except vision.ContractError as err:
    raise SystemExit(str(err))

ratio = vision.frame_ratio(args.frames)
BLOCK = vision.ratio_block(C, ratio)
MD = BLOCK["measure_device"]
M = C["measure"]["motion"]
SAMPLE = BLOCK["qc_zone"]["sample"]
ZONE = BLOCK["qc_zone"]["device"]
COEF = C["measure"]["luma"]["coeffs"]
DIV = C["measure"]["luma"]["divisor"]
STEP = int(args.step) if args.step else int(M["step"])
if STEP < 1:
    raise SystemExit(f"抽帧步长必须 ≥ 1（收到 {STEP}）")
STILL_THR = M["still_thr"]
HOLD_THR = M["hold_thr"]
STILL_MAX_S = M["still_max_seconds"]
HOLD_MIN = M["hold_min_frames"]
EXIT_K = M["exit_brightness_k"]
EXIT_TAIL = M["exit_tail_frames"]
GLOW_OFF = M["glow_off_frames"]
DIFF_PX = MD["motion"]["diff_px"]
CLS_TRUE_STATIC = MD["motion"]["class_true_static_px"]
CLS_SMALL_MOTION = MD["motion"]["class_small_motion_px"]
SAMPLE_W = MD["motion"]["sample_width"]

if not os.path.isdir(args.frames):
    raise SystemExit(f"帧目录不存在：{args.frames}（先 npm run render）")


def frame_no(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    digits = "".join(ch for ch in stem if ch.isdigit())
    return int(digits) if digits else 0


# 按帧号数值排序，不能按文件名字典序：ffmpeg 的 f_%04d 对 ≥10000 帧会写出 5 位名，
# 字典序下 f_10000 排在 f_9999 前面 —— 帧差就成了乱序相邻帧的差值，判据数字全错却不报错。
files = sorted(
    (p for p in (os.path.join(args.frames, n) for n in os.listdir(args.frames)) if p.lower().endswith(".png")),
    key=frame_no,
)
if not files:
    raise SystemExit(
        f"{args.frames} 里没有 PNG 帧。motion_check 只读 PNG（JPEG 需要 Pillow，测量层刻意不依赖它）；"
        "scripts/render.sh 抽帧出的是 f_%04d.png。"
    )


def zone_rows(small):
    """采样图上的取景区行：sample 坐标由 contracts 换算好，这里只切片，不再乘系数。"""
    top = max(0, min(small.height, SAMPLE["top"]))
    bottom = max(top, min(small.height, SAMPLE["bottom"]))
    return small.rows[top:bottom]


def row_mean(rows):
    flat = [v for row in rows for v in row]
    return (sum(flat) / len(flat)) if flat else 0.0


def mean_abs_diff(a_rows, b_rows):
    total = 0
    count = 0
    for a, b in zip(a_rows, b_rows):
        n = min(len(a), len(b))
        total += sum(abs(a[j] - b[j]) for j in range(n))
        count += n
    return (total / count) if count else 0.0


# ---- 第一遍：逐帧流过，只留标量 ----
first_no = frame_no(files[0])
series = []  # [{frame, file, change, bright}]  change 为 None 表示该组第一帧（无参照）
prev = None
errors = []
for path in files:
    rel = frame_no(path) - first_no
    if rel % STEP:
        continue
    try:
        img = pngio.read(path)
    except pngio.PngError as err:
        errors.append({"file": os.path.basename(path), "error": str(err)})
        continue
    small = img.scale_to_width(SAMPLE_W)
    zone = zone_rows(small)
    luma = [vision.luma_row(row, small.channels, COEF, DIV) for row in zone]
    change = None if prev is None else mean_abs_diff(prev, luma)
    prev = luma
    series.append({"frame": frame_no(path) - 1, "file": path, "change": change, "bright": round(row_mean(luma), 3)})

if not series:
    raise SystemExit("一帧都没解出来，见 decode_errors")

FPS = int(C["canvas"]["fps"])


def longest_run(values, thr):
    """返回 (最长段长度, 该段最后一个元素的下标)。分类阶段要用下标定位窗口，
    只返回长度的话就只知道「静止了多久」，不知道「是哪一段」。"""
    run = best = end = 0
    for i, v in enumerate(values):
        if v is not None and v < thr:
            run += 1
            if run > best:
                best, end = run, i
        else:
            run = 0
    return best, end


def classify(window):
    """对超时静止窗口做全分辨率变化像素中位数（这是唯一需要回头重解帧的地方）。"""
    prev_full = None
    changes = []
    for item in window:
        try:
            img = pngio.read(item["file"])
        except pngio.PngError as err:
            errors.append({"file": os.path.basename(item["file"]), "error": str(err)})
            continue
        rgb = img if img.channels == 3 else img.to_rgb()
        top = max(0, min(rgb.height, ZONE["top"]))
        bottom = max(top, min(rgb.height, ZONE["bottom"]))
        lum = [vision.luma_row(row, 3, COEF, DIV) for row in rgb.crop_rows(top, bottom).rows]
        if prev_full is not None:
            n = 0
            for a, b in zip(prev_full, lum):
                m = min(len(a), len(b))
                n += sum(1 for j in range(m) if abs(a[j] - b[j]) > DIFF_PX)
            changes.append(n)
        prev_full = lum
    return int(vision.median(changes)) if changes else 0


def scene_range(scene, fps):
    start = round(float(scene["start"]) * fps)
    return start, max(start, math.ceil((float(scene["start"]) + float(scene["duration"])) * fps) - 1)


scenes = []
if args.render_ir and os.path.exists(args.render_ir):
    with open(args.render_ir, encoding="utf8") as handle:
        ir = json.load(handle)
    fps = int(ir.get("fps", FPS))
    for scene in ir.get("scenes", []):
        start, end = scene_range(scene, fps)
        picked = [s for s in series if start <= s["frame"] <= end]
        # diffs[j] 是 picked[j+1] 相对 picked[j] 的变化：镜头第一帧没有「上一帧」在同一个镜头里，
        # 跟上一镜头末尾的差值不能算进本镜头的节奏（切镜头本来就该有大变化）。
        diffs = [s["change"] for s in picked[1:]]
        if len(picked) < 3:
            scenes.append({
                "id": scene["id"], "from": start, "to": end, "frames": len(picked),
                "status": "WARN", "flags": [{"token": "motion_sample_too_sparse", "severity": "low",
                                             "detail": f"{STEP} 帧步长下只剩 {len(picked)} 帧，判不了节奏"}],
            })
            continue
        still_pct = round(100.0 * sum(1 for v in diffs if v < STILL_THR) / len(diffs), 1)
        best, end_i = longest_run(diffs, STILL_THR)
        longest_s = round(best * STEP / fps, 2)
        # 末拍稳定期：先剔掉尾部已在离场的帧（区亮度 < 尾段中位 × EXIT_K），再从最后可见帧往前数「无大面积变化」
        bright = [s["bright"] for s in picked]
        tail = bright[-EXIT_TAIL:] if len(bright) >= EXIT_TAIL else bright
        ref = vision.median(tail)
        e = len(bright) - 1
        while e > 0 and bright[e] < EXIT_K * ref:
            e -= 1
        exited = e < len(bright) - 1
        hold = 0
        k = e
        while k > 0:
            cur = picked[k]["change"]
            if cur is None or cur >= HOLD_THR:
                break
            hold += STEP
            k -= 1
        if exited:
            hold = max(0, hold - GLOW_OFF)
        flags = []
        verdict_class = None
        if longest_s > STILL_MAX_S and best > 0:
            # diffs[end_i-best+1 .. end_i] ↔ picked[end_i-best+2 .. end_i+1]
            window = picked[max(1, end_i - best + 2) : end_i + 2]
            cp = classify(window)
            verdict_class = "真静" if cp < CLS_TRUE_STATIC else ("小面积动作" if cp < CLS_SMALL_MOTION else "有动作")
            flags.append({
                "token": "motion_too_low",
                "severity": "medium",
                "detail": f"静止 {longest_s}s > {STILL_MAX_S}s；{window[0]['frame']}-{window[-1]['frame']} 变化像素中位 {cp} → {verdict_class}",
                "classification": verdict_class,
                "changed_px_median": cp,
                "repair_hint": "真静→给主角加动词动作；小面积动作→加大现有动作幅度；有动作→是运镜/切换问题，回分镜",
            })
        if exited and hold < HOLD_MIN:
            flags.append({"token": "hold_too_short", "severity": "medium", "detail": f"hold {hold} 帧 < {HOLD_MIN}（离场/前挂末拍/并镜头，不是加动作）"})
        scenes.append({
            "id": scene["id"],
            "from": start,
            "to": end,
            "frames": len(picked),
            "still_pct": still_pct,
            "longest_static_seconds": longest_s,
            "hold_frames": hold,
            "hold_advisory": not exited,
            "exited": exited,
            "flags": flags,
            "status": "FAIL" if any(f["severity"] in ("high", "medium") for f in flags) else ("WARN" if flags else "PASS"),
        })
else:
    print("motion_check: 未给 --render-ir，只出全片曲线，不判镜头", file=sys.stderr)

whole_diffs = [s["change"] for s in series if s["change"] is not None]
summary = {
    "frames": len(series),
    "ratio": ratio,
    "step": STEP,
    "fps": FPS,
    "thresholds": {"still": STILL_THR, "hold": HOLD_THR, "still_max_seconds": STILL_MAX_S, "hold_min_frames": HOLD_MIN},
    "mean_change": round(sum(whole_diffs) / len(whole_diffs), 4) if whole_diffs else 0,
    "longest_low_change_frames": longest_run(whole_diffs, STILL_THR)[0] * STEP,
    "scenes": scenes,
    "decode_errors": errors[:20],
}
summary["blocking"] = sum(1 for s in scenes if s["status"] == "FAIL")
summary["warnings"] = sum(1 for s in scenes if s["status"] == "WARN")
summary["status"] = "FAIL" if summary["blocking"] else ("PASS" if scenes or not errors else "FAIL")

os.makedirs(os.path.dirname(args.report) or ".", exist_ok=True)
with open(args.report, "w", encoding="utf8") as handle:
    json.dump({"summary": summary, "series": [{k: v for k, v in s.items() if k != "file"} for s in series]}, handle, ensure_ascii=False, indent=2)

print(f"判据：最长静止 ≤{STILL_MAX_S}s；hold ≥{HOLD_MIN} 帧（~ = 该镜头不离场，只供参考）；still% 只报不判；抽帧步长 {STEP}")
print(f"{'scene':10s} {'len':>6s} {'still%':>7s} {'longest':>8s} {'hold':>6s}  verdict")
for s in scenes:
    mark = "~" if s.get("hold_advisory") else " "
    print(f"{s['id']:10s} {(s['to'] - s['from'] + 1) / FPS:5.1f}s {s.get('still_pct', 0):6.0f}% "
          f"{s.get('longest_static_seconds', 0):7.1f}s {s.get('hold_frames', 0):4d}f{mark}  "
          + (" ".join(f["token"] for f in s["flags"]) or "OK"))
print(json.dumps({"frames": summary["frames"], "status": summary["status"], "blocking": summary["blocking"], "warnings": summary["warnings"]}, ensure_ascii=False))
if errors:
    print("  decode errors: " + json.dumps(errors[:3], ensure_ascii=False), file=sys.stderr)
if summary["status"] != "PASS":
    raise SystemExit(1)
