#!/usr/bin/env python3
"""逐镜头构图 / 光 / 运动量化（纯 stdlib，帧必须是 PNG）。

用法：
  npm run frame-metrics -- --frames artifacts/frames/16x9 \
      --render-ir fixtures/render-ir-16x9.json --out artifacts/<pid>/qc/frame_metrics_16x9.json

每帧量（都只在 QC 取景区里，HUD 与字幕带不进统计）：
  · 主体尺度   最大亮团的「等效高度」：宽物体按 min(w, 4h)/2.5 折算，一行大字按整行计
  · 柔光面积   全区像素数 + 主角框内最大连通柔光块
  · 紫色碎片   实心紫（排除柔光雾）的连通块数
  · 背景碎屑   小于 small_box 的亮团数
  · 亮度/黑场占比、与上一帧的平均变化

每镜头判据的数值全部来自 fixtures/visual_contracts.json（npm run export-visual-contracts 导出），
本文件不内联任何阈值 —— 阈值一旦写死在这儿，改渲染层常量时 QC 还在按旧标准判 PASS。

采样密度同样来自 contracts：motion.step 是帧差步长，motion.analysis_step 是构图分析步长。
这台机器上没有 numpy/Pillow，纯 python 每帧都要完整 inflate，逐帧全分析一条 3 分钟片子要跑几小时；
把步长写进真源，成本就是可以算的，而不是「脚本能跑」和「实际跑不完」之间的玄学。

幕底是点阵（bg:'dots'）时先按 contracts 里的网格把点抠掉：不抠的话波前亮点会被数成背景碎屑，
而底色 #0b0c11 自带的那点蓝会整屏落进柔光判据，把空场检测整个屏蔽掉。
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
ap.add_argument("--out", default="artifacts/qc/frame_metrics.json")
# 两个步长都来自 contracts（MOTION.step / MOTION.analysis_step），默认值不是 0 的话就等于
# 「命令行没给也悄悄改了采样密度」；None 表示「按导出的判据办」，显式给值才覆盖。
ap.add_argument("--motion-step", type=int, default=None, help="帧差采样步长（帧），默认取 contracts 的 motion.step")
ap.add_argument("--step", type=int, default=None, help="全分辨率构图分析步长（帧），默认取 contracts 的 motion.analysis_step")
ap.add_argument("--contracts", default="fixtures/visual_contracts.json")
ap.add_argument("--bg", choices=["dots", "stars", "auto"], default="auto")
ap.add_argument("--max-frames", type=int, default=0, help="调试用：只处理前 N 帧")
args = ap.parse_args()

try:
    C = vision.load_contracts(args.contracts)
except vision.ContractError as err:
    raise SystemExit(str(err))

ratio = vision.frame_ratio(args.frames)
BLOCK = vision.ratio_block(C, ratio)
MD = BLOCK["measure_device"]
DFD = BLOCK["dot_field_device"]["device"]
ZONE = BLOCK["qc_zone"]["device"]
COEF = C["measure"]["luma"]["coeffs"]
DIV = C["measure"]["luma"]["divisor"]
MOTION = C["measure"]["motion"]
# 纯 python 没有 PIL 的 jpeg draft 解码，每帧都得完整 inflate 才能做帧差 —— 抽帧密度就是成本旋钮，
# 所以它必须写在判据真源里（field.mjs 的 MOTION），而不是每次由命令行现场拍脑袋。
MOTION_STEP = int(args.motion_step) if args.motion_step else int(MOTION["step"])
ANALYSIS_STEP = int(args.step) if args.step else int(MOTION["analysis_step"])
if MOTION_STEP < 1 or ANALYSIS_STEP < 1:
    raise SystemExit(f"步长必须 ≥ 1（收到 motion_step={MOTION_STEP}, analysis_step={ANALYSIS_STEP}）")
# 只有同时被两种采样命中的帧才值得解到全分辨率：真实间隔是两者公倍数（3 与 4 → 每 12 帧一次）。
ANALYSIS_EVERY = math.lcm(MOTION_STEP, ANALYSIS_STEP)
BG = args.bg if args.bg != "auto" else "dots"
SOFT_LO = MD["soft_glow"]["lum_min_dots"] if BG == "dots" else MD["soft_glow"]["lum_min"]
MASK_R = DFD["mask_radius"]
FRAME_W = BLOCK["device"]["width"]


def dot_intervals(y):
    """第 y 行被幕底点占用的列区间；主体、碎屑、柔光三处都要把它们挖掉。"""
    if BG != "dots" or DFD["step"] <= 0:
        return []
    dy = (y - DFD["y0"]) % DFD["step"]
    if min(dy, DFD["step"] - dy) > MASK_R:
        return []
    out = []
    x = DFD["x0"]
    while x < FRAME_W:
        out.append((max(0, int(x - MASK_R)), min(FRAME_W, int(x + MASK_R) + 1)))
        x += DFD["step"]
    return out


def subtract_runs(mask_runs, intervals):
    """从亮段里挖掉掩膜区间（区间很少，逐段裁剪比建全行掩膜便宜）。"""
    if not intervals:
        return mask_runs
    out = []
    for a, b in mask_runs:
        pieces = [(a, b)]
        for i0, i1 in intervals:
            nxt = []
            for p0, p1 in pieces:
                if i1 <= p0 or i0 >= p1:
                    nxt.append((p0, p1))
                    continue
                if p0 < i0:
                    nxt.append((p0, i0))
                if i1 < p1:
                    nxt.append((i1, p1))
            pieces = nxt
        out.extend(pieces)
    return out


def mean_diff(a_rows, b_rows):
    """两张采样灰度图的平均绝对差（与 contracts 的 still_thr 同口径）。"""
    total = 0
    count = 0
    for a, b in zip(a_rows, b_rows):
        m = min(len(a), len(b))
        total += sum(abs(a[j] - b[j]) for j in range(m))
        count += m
    return (total / count) if count else 0.0


def frame_stats(img, top, bottom):
    """一帧的构图/光测量。img 已 to_rgb()，top/bottom 是取景区的设备像素行。"""
    bright_runs = []
    soft_runs = []
    purple_runs = []
    soft_total = 0
    bright_total = 0
    sat_min = MD["soft_glow"]["sat_min"]
    lum_max = MD["soft_glow"]["lum_max"]
    hero_luma = MD["hero"]["bright_luma"]
    p_sat = MD["purple_debris"]["sat_min"]
    p_lum = MD["purple_debris"]["lum_min"]
    for y in range(top, bottom):
        row = img.rows[y - top]
        lum = vision.luma_row(row, 3, COEF, DIV)
        sat = vision.sat_row(row, 3)
        r, g, b = vision.rgb_columns(row, 3)
        intervals = dot_intervals(y)
        bright_runs.append(subtract_runs(vision.runs([v > hero_luma for v in lum]), intervals))
        soft_runs.append(subtract_runs(vision.runs([s > sat_min and SOFT_LO <= v <= lum_max for s, v in zip(sat, lum)]), intervals))
        purple_runs.append(
            subtract_runs(
                vision.runs([bb > rr and rr > gg and s > p_sat and v > p_lum for s, v, rr, gg, bb in zip(sat, lum, r, g, b)]),
                intervals,
            )
        )
        soft_total += sum(x1 - x0 for x0, x1 in soft_runs[-1])
        bright_total += sum(x1 - x0 for x0, x1 in bright_runs[-1])

    hero_objs = vision.objects(
        bright_runs,
        grow_x=MD["hero"]["struct_half"]["x"],
        grow_y=MD["hero"]["struct_half"]["y"],
        width=FRAME_W,
        min_ink=MD["hero"]["min_ink_px"],
    )
    small_box = MD["hero"]["small_box"]
    debris = sum(1 for o in hero_objs if o["h"] < small_box and o["w"] < small_box)
    hero_h = 0.0
    hero_box = None
    for o in hero_objs:
        size = max(o["h"], min(o["w"], MD["hero"]["width_over_height"] * o["h"]) / MD["hero"]["width_divisor"])
        if size > hero_h:
            hero_h = size
            hero_box = o
    if bright_total < MD["hero"]["no_content_bright_px"]:
        hero_h = 0.0
        hero_box = None

    glow_hero = 0
    if hero_box is not None:
        pad = int(MD["hero"]["glow_pad_px"])
        y0 = max(0, hero_box["y0"] - pad)
        y1 = min(len(soft_runs), hero_box["y1"] + pad + 1)
        x0 = max(0, hero_box["x0"] - pad)
        x1 = min(FRAME_W, hero_box["x1"] + pad + 1)
        band = []
        for row_runs in soft_runs[y0:y1]:
            mask = [False] * FRAME_W
            for a, b in row_runs:
                for x in range(max(a, x0), min(b, x1)):
                    mask[x] = True
            band.append(mask)
        glow_hero = vision.largest_area(band)

    purple_objs = vision.objects(
        purple_runs,
        grow_x=MD["purple_debris"]["struct_half"]["x"],
        grow_y=MD["purple_debris"]["struct_half"]["y"],
        width=FRAME_W,
        min_ink=MD["purple_debris"]["min_area_px"],
    )
    return {
        "hero_size": round(hero_h, 1),
        "hero_box": [hero_box["y0"] + top, hero_box["y1"] + top, hero_box["x0"], hero_box["x1"]] if hero_box else None,
        "glow_hero": glow_hero,
        "glow_total": soft_total,
        "purple_pieces": len(purple_objs),
        "small_objects": debris,
        "bright_px": bright_total,
    }


EMPTY_STATS = {"hero_size": 0.0, "hero_box": None, "glow_hero": 0, "glow_total": 0, "purple_pieces": 0, "small_objects": 0, "bright_px": 0}


def frame_no(name):
    stem = os.path.splitext(os.path.basename(name))[0]
    digits = "".join(ch for ch in stem if ch.isdigit())
    return int(digits) if digits else 0


if not os.path.isdir(args.frames):
    raise SystemExit(f"帧目录不存在：{args.frames}（先 npm run render）")
# 必须按帧号数值排序，不能按文件名字典序：ffmpeg 的 f_%04d 对 ≥10000 帧会写出 5 位名，
# 字典序下 f_10000 排在 f_9999 前面 —— 帧差就成了乱序相邻帧的差值，判据照样出 PASS/FAIL，
# 只是数字全错（本片 13235 帧，已越界）。按 frame_no 排序对任何补零宽度都成立。
files = sorted(
    (p for p in (os.path.join(args.frames, n) for n in os.listdir(args.frames)) if p.lower().endswith(".png")),
    key=frame_no,
)
if not files:
    raise SystemExit(
        f"{args.frames} 里没有 PNG 帧。scripts/render.sh 抽帧出的是 f_%04d.png；"
        "JPEG 要 Pillow，而测量层刻意不依赖它 —— 依赖缺失时 QC 会静默不跑，比慢更糟。"
    )
if args.max_frames:
    files = files[: args.max_frames]

sample_width = MD["motion"]["sample_width"]
first_no = frame_no(files[0])
rows = []
prev_small = None
skipped = 0
errors = []
for path in files:
    rel = frame_no(path) - first_no
    if rel % MOTION_STEP:
        skipped += 1
        continue
    try:
        img = pngio.read(path)
    except pngio.PngError as err:
        errors.append({"file": os.path.basename(path), "error": str(err)})
        continue
    small = img.scale_to_width(sample_width)
    small_luma = [vision.luma_row(r, small.channels, COEF, DIV) for r in small.rows]
    change = 0.0 if prev_small is None else mean_diff(prev_small, small_luma)
    prev_small = small_luma
    flat = [v for row in small_luma for v in row]
    total_px = len(flat) or 1
    black = sum(1 for v in flat if v < 8) / total_px
    bright_ratio = sum(1 for v in flat if v > 170) / total_px
    stats = None
    if rel % ANALYSIS_EVERY == 0:
        rgb = img if img.channels == 3 else img.to_rgb()
        top = max(0, min(rgb.height, ZONE["top"]))
        bottom = max(top, min(rgb.height, ZONE["bottom"]))
        if (top, bottom) != (ZONE["top"], ZONE["bottom"]):
            errors.append({"file": os.path.basename(path), "error": f"帧尺寸 {rgb.width}x{rgb.height} 与 contracts 画幅不符"})
        stats = frame_stats(rgb.crop_rows(top, bottom), top, bottom)
    rows.append({
        "frame": frame_no(path) - 1,
        "file": os.path.basename(path),
        "bright_ratio": round(bright_ratio, 5),
        "black_ratio": round(black, 5),
        "change": round(change, 4),
        "stats": stats,
    })

summary = {
    "frames": len(rows),
    "decoded_from": len(files),
    "analyzed": sum(1 for r in rows if r["stats"]),
    "ratio": ratio,
    "bg": BG,
    "zone": {"top": ZONE["top"], "bottom": ZONE["bottom"]},
    "contracts": args.contracts,
    # 下游把「静止区间」换算成秒时要乘的就是这两个数，不写出来的话它们只是本地变量。
    "motion_step": MOTION_STEP,
    "analysis_step": ANALYSIS_STEP,
    "analysis_every": ANALYSIS_EVERY,
    "frames_available": skipped + len(rows) + len(errors),
    "max_bright_ratio": max((r["bright_ratio"] for r in rows), default=0),
    "max_black_ratio": max((r["black_ratio"] for r in rows), default=0),
    "mean_change": round(sum(r["change"] for r in rows) / len(rows), 4) if rows else 0,
    "decode_errors": errors[:20],
}

scenes = []
if args.render_ir and os.path.exists(args.render_ir):
    with open(args.render_ir, encoding="utf8") as handle:
        ir = json.load(handle)
    fps = int(ir.get("fps", C["canvas"]["fps"]))
    still_thr = MOTION["still_thr"]
    hero_min_px = MD["thresholds_device"]["hero_min_px"]
    empty_hero_px = MD["empty_field"]["hero_min_px"]
    severe_hero_px = MD["empty_field"]["severe_hero_px"]
    activity_px = MD["soft_glow"]["activity_px"]
    for scene in ir.get("scenes", []):
        start = round(float(scene["start"]) * fps)
        end = max(start, math.ceil((float(scene["start"]) + float(scene["duration"])) * fps) - 1)
        picked = [r for r in rows if start <= r["frame"] <= end]
        measured = [(r["frame"], r["stats"]) for r in picked if r["stats"]]
        hero = [s["hero_size"] for _f, s in measured]
        glow_total = [s["glow_total"] for _f, s in measured]
        glow_hero = [s["glow_hero"] for _f, s in measured]
        purple = [s["purple_pieces"] for _f, s in measured]
        small = [s["small_objects"] for _f, s in measured]
        # 空场 = 没有够大的主体 **且** 没有大面积光活动（扫光/光线/光环阶段本来就没有主体）
        empty_flags = [h < empty_hero_px and g < activity_px for h, g in zip(hero, glow_total)]
        longest_empty = vision.longest_run(empty_flags) * ANALYSIS_EVERY
        solid = [h for h, g in zip(hero, glow_total) if h > 0 and not (h < empty_hero_px and g >= activity_px)]
        med_h = round(vision.median(solid), 1)
        min_h = int(min(hero)) if hero else 0
        longest_static = vision.longest_run([r["change"] < still_thr for r in picked]) * MOTION_STEP
        med_purple = round(vision.median(purple), 1)
        med_small = round(vision.median(small), 1)
        med_glow_hero = round(vision.median(glow_hero), 1)
        flags = []
        if not measured:
            flags.append({"token": "frame_metrics_missing", "severity": "medium", "detail": "镜头区间内没有可用帧"})
        else:
            if longest_empty > MD["empty_field"]["sustained_frames_max"]:
                low = [h for h, e in zip(hero, empty_flags) if e and h > 0]
                severe = bool(low) and vision.median(low) < severe_hero_px
                flags.append({
                    "token": "hero_too_small",
                    "severity": "high" if severe else "medium",
                    "detail": f"空场 {longest_empty} 帧（主体 < {empty_hero_px}px）",
                })
            elif med_h < hero_min_px:
                flags.append({"token": "hero_too_small", "severity": "low", "detail": f"主角中位 {med_h}px < {hero_min_px}px"})
            if med_glow_hero < MD["soft_glow"]["hero_area_min_px"]:
                flags.append({"token": "glow_missing", "severity": "low", "detail": f"主角区柔光中位 {med_glow_hero}px²"})
            if med_purple >= MD["purple_debris"]["median_max"]:
                flags.append({"token": "purple_debris", "severity": "low", "detail": f"紫色碎片中位 {med_purple} 块"})
            if med_small >= MD["empty_field"]["debris_count_median_max"]:
                flags.append({"token": "background_debris", "severity": "medium", "detail": f"背景碎屑中位 {med_small} 块"})
            if longest_static > MOTION["still_max_seconds"] * fps:
                flags.append({"token": "freeze", "severity": "medium", "detail": f"完全静止 {longest_static} 帧 > {MOTION['still_max_seconds']}s"})
        scenes.append({
            "id": scene["id"],
            "from": start,
            "to": end,
            "frames": len(picked),
            "measured": len(measured),
            "hero_median_px": med_h,
            "hero_min_px": min_h,
            "hero_min_contract_px": hero_min_px,
            "glow_hero_median_px2": med_glow_hero,
            "glow_total_median_px2": round(vision.median(glow_total), 1),
            "purple_median": med_purple,
            "debris_median": med_small,
            "longest_empty_frames": longest_empty,
            "longest_static_frames": longest_static,
            "flags": flags,
            "status": "FAIL" if any(f["severity"] in ("high", "medium") for f in flags) else ("WARN" if flags else "PASS"),
        })
else:
    print("frame_metrics: 未给 --render-ir，只出逐帧数据，不判镜头", file=sys.stderr)

summary["scenes"] = scenes
summary["blocking"] = sum(1 for s in scenes if s["status"] == "FAIL")
summary["warnings"] = sum(1 for s in scenes if s["status"] == "WARN")
summary["status"] = "FAIL" if (summary["blocking"] or errors) else "PASS"

os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
with open(args.out, "w", encoding="utf8") as handle:
    json.dump({"summary": summary, "frames": rows}, handle, ensure_ascii=False, indent=2)

print(json.dumps({k: summary[k] for k in ("frames", "analyzed", "ratio", "status", "blocking", "warnings")}, ensure_ascii=False))
for scene in scenes:
    if scene["flags"]:
        print("  " + scene["id"] + ": " + "；".join(f"{f['severity']}:{f['token']} {f['detail']}" for f in scene["flags"]))
if errors:
    print("  decode/scale errors: " + json.dumps(errors[:3], ensure_ascii=False), file=sys.stderr)
if summary["status"] != "PASS":
    raise SystemExit(1)
