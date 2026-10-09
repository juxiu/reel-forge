#!/usr/bin/env python3
"""视觉回归记录（纯 stdlib）：每个 scene/ratio 采样几帧，与 positive/anti 基准做 cosine 相似度。

用法：
  npm run visual-regression -- --frames artifacts/frames/16x9 \
      --render-ir fixtures/render-ir-16x9.json --out artifacts/<pid>/qc/visual_regression_16x9.json

⚠ 这一层是**回归记录**，不是交付门（gate: advisory / blocking: false）：
基准资产是 fixtures/visual-references/ 里 64×36 的合成图，描述符是确定性的像素特征，不是
CLIP/SigLIP 那种语义模型。实测下来它与画面质量**反向相关**（画面更密、构图更实时分数更低），
所以只用来做 run-to-run 的位移监控；交付判定交给 frame_metrics / motion_check / 文字出处门。

DESCRIPTOR 从 visual-pixel-v1 升到 v2 的原因（不是改名玩）：
  · 缩放核从 PIL 的 LANCZOS/BILINEAR 换成纯 stdlib 的双线性 + 面积平均；
  · 旧实现先把浮点量化成 uint8 再缩放，新版全程浮点。
两者的读数不可比，所以任何 v1 的历史 record 都不能和 v2 放一起看差值。
"""
import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vision  # noqa: E402

DESCRIPTOR = "visual-pixel-v2"
THUMB = (128, 72)  # 与基准图共同的缩略坐标系
GRID = (12, 8)  # 描述符网格：灰度 + R/G/B + 横向/纵向梯度 = 6 段 × 96 维
# THUMB/GRID 是**描述符本身**：改它们等于换一把尺子，必须连同 DESCRIPTOR 一起升版本。
# 打分权重不是尺子而是判据，所以它住在 fixtures/visual-benchmark.json 的 scoring 里，
# 和 pass/reference/excellent/anti_fail 同一处可调（见 WEIGHTS 的读取）。


def clip01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)


def load_image(path):
    """任意尺寸 PNG/PPM → THUMB 的 float 行（0–1，3 通道）。"""
    img = vision.load_rgb(path)
    big = vision.resize_bilinear(img, THUMB[0], THUMB[1])
    return [[v / 255.0 for v in row] for row in big]


def width_of(a):
    """RGB 行数组的「像素宽」（一行有 3×宽 个浮点数）。"""
    return len(a[0]) // 3 if a else 0


def gray_rows(a):
    return [[(row[i] + row[i + 1] + row[i + 2]) / 3.0 for i in range(0, len(row), 3)] for row in a]


def channel_rows(a, c):
    return [[row[i + c] for i in range(0, len(row), 3)] for row in a]


def _box_weights(span, out):
    """目标格覆盖的源区间 + 重叠长度（面积平均，缩小时不掺进窗外的像素）。"""
    toks = []
    for i in range(out):
        lo = i * span / out
        hi = (i + 1) * span / out
        a = int(math.floor(lo))
        b = min(span - 1, int(math.ceil(hi)) - 1)
        if b < a:
            b = a
        weights = [(idx, min(hi, idx + 1) - max(lo, idx)) for idx in range(a, b + 1)]
        toks.append([p for p in weights if p[1] > 0])
    return toks


def reduce2d(a, out_w, out_h):
    """面积平均重采样到 out_w×out_h（替掉 PIL 的 BILINEAR 缩小）。"""
    h = len(a)
    w = len(a[0]) if h else 0
    if not h or not w:
        return [[0.0] * out_w for _ in range(out_h)]
    wx = _box_weights(w, out_w)
    wy = _box_weights(h, out_h)
    out = []
    for ys in wy:
        row = []
        for xs in wx:
            acc = norm = 0.0
            for iy, fy in ys:
                line = a[iy]
                for ix, fx in xs:
                    acc += line[ix] * fy * fx
                    norm += fy * fx
            row.append(acc / norm if norm else 0.0)
        out.append(row)
    return out


def flatten(a):
    return [v for row in a for v in row]


def diff_abs(a, axis):
    """|np.diff|：axis=1 横向（每行少一列），axis=0 纵向（少一行）。"""
    if axis == 1:
        return [[abs(row[i + 1] - row[i]) for i in range(len(row) - 1)] for row in a]
    return [[abs(cur - prev) for cur, prev in zip(a[y + 1], a[y])] for y in range(len(a) - 1)]


def norm(v):
    return math.sqrt(sum(x * x for x in v))


def normalize(v):
    n = norm(v)
    return [x / n for x in v] if n else v


def cosine(a, b):
    d = sum(x * y for x, y in zip(a, b))
    return d / max(1e-8, norm(a) * norm(b))


def embedding(image):
    """灰度 + RGB 三通道 + 横/纵梯度，各压成 GRID 网格后拼成 6×96 维向量并归一化。"""
    gray = gray_rows(image)
    small = reduce2d(gray, GRID[0], GRID[1])
    chans = [reduce2d(channel_rows(image, c), GRID[0], GRID[1]) for c in range(3)]
    dx = reduce2d(diff_abs(gray, 1), GRID[0], GRID[1])
    dy = reduce2d(diff_abs(gray, 0), GRID[0], GRID[1])
    v = []
    for block in [small] + chans + [dx, dy]:
        v.extend(flatten(block))
    return normalize(v)


def entropy(gray):
    """32 桶直方图熵，与 numpy 的 histogram(uint8(v*255), bins=32, range=(0,255)) 同分桶口径。"""
    hist = [0] * 32
    for row in gray:
        for v in row:
            hist[min(31, int(int(v * 255) * 32 / 255))] += 1
    total = sum(hist)
    if not total:
        return 0.0
    p = [n / total for n in hist if n]
    return -sum(x * math.log2(x) for x in p)


def saliency(image):
    gray = gray_rows(image)
    w = len(gray[0])
    h = len(gray)
    total = 0.0
    sx = sy = 0.0
    for y in range(h):
        line = gray[y]
        for x in range(w):
            dx = abs(line[x + 1] - line[x]) if x + 1 < w else 0.0
            dy = abs(gray[y + 1][x] - line[x]) if y + 1 < h else 0.0
            weight = dx + dy + 0.15 * line[x]
            total += weight
            sx += x * weight
            sy += y * weight
    if total <= 1e-8:
        return [0.5, 0.5]
    return [sx / total / max(1, w - 1), sy / total / max(1, h - 1)]


def scene_features(images):
    # 每帧一张灰度图（整幅，不是首行）——后面的边缘/熵/底部亮带都要用到垂直方向。
    grays = [gray_rows(im) for im in images]
    edges = []
    for g in grays:
        w = len(g[0])
        dx = sum(sum(abs(row[i + 1] - row[i]) for i in range(w - 1)) for row in g)
        dy = sum(sum(abs(g[y + 1][x] - g[y][x]) for x in range(w)) for y in range(len(g) - 1))
        edges.append((dx / (len(g) * (w - 1)) + dy / ((len(g) - 1) * w)) / 2)
    edge = sum(edges) / len(edges)
    ent = sum(entropy(g) for g in grays) / len(grays) / 5.0
    complexity = clip01(0.55 * min(1, edge / 0.18) + 0.45 * min(1, ent))
    bottoms = []
    for g in grays:
        start = int(len(g) * 0.72)
        band = g[start:] or g[-1:]
        w = len(band[0])
        hits = sum(1 for row in band for v in row if v > 0.68)
        bottoms.append(hits / (len(band) * w))
    bright_bottom = sum(bottoms) / len(bottoms)
    text_score = clip01(1 - (bright_bottom - 0.08) / 0.18) if bright_bottom > 0.08 else 1.0
    cents = [saliency(im) for im in images]
    spread = sum(cos_distance(c, cents[0]) for c in cents[1:]) / (len(cents) - 1) if len(cents) > 1 else 0.0
    hero = clip01(1 - spread / 0.38)
    layouts = [flatten(reduce2d(g, 6, 4)) for g in grays]
    base = centered(layouts[0])
    stability = sum(cosine(base, centered(x)) for x in layouts[1:]) / (len(layouts) - 1) if len(layouts) > 1 else 1.0
    return {
        "visual_complexity": round(complexity, 3),
        "text_density": round(text_score, 3),
        "hero_consistency": round(hero, 3),
        "layout_stability": round(clip01(stability), 3),
    }


def cos_distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def centered(v):
    m = sum(v) / len(v)
    return [x - m for x in v]


def sampled_frame(start, end, pos):
    return min(end, max(start, int(round(start + (end - start) * pos))))


def frame_path(frames_dir, frame):
    """帧号 → 文件。渲染出的是 1 基编号的 f_%04d.png（见 scripts/render.sh）。"""
    path = os.path.join(frames_dir, "f_%04d.png" % (frame + 1))
    if not os.path.exists(path):
        raise SystemExit(
            f"缺采样帧 {path}。visual_regression 只读 PNG；如果成片是别的编号方式，"
            "先确认 scripts/render.sh 的抽帧步长与序号（QC 按「文件名编号=真实帧号」换算时长）"
        )
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--render-ir", required=True)
    ap.add_argument("--benchmark", default="fixtures/visual-benchmark.json")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    manifest = json.load(open(args.benchmark, encoding="utf8"))
    ir = json.load(open(args.render_ir, encoding="utf8"))
    if manifest.get("embedding") != DESCRIPTOR:
        raise SystemExit(
            f"基准清单 embedding={manifest.get('embedding')!r} 与本脚本 {DESCRIPTOR!r} 不一致："
            "不同描述符的 cosine 读数不可比，混在一起算 delta 会造出一个假回归信号。"
            "（重生成基准或按 scripts/visual_regression.py 头部说明对齐版本）"
        )
    # 清单和判据先校验，再解码基准图：判据读不懂的时候，不该先花几秒解码再告诉你跑不了。
    scoring = manifest.get("scoring") or {}
    pw, aw = scoring.get("positive_weight"), scoring.get("anti_weight")
    if pw is None or aw is None or abs((pw + aw) - 1) > 1e-9:
        raise SystemExit(
            "fixtures/visual-benchmark.json 的 scoring 不完整（positive_weight + anti_weight 必须等于 1）："
            "reference_similarity 两个分量各占多少是判据，判据只允许住在清单里，"
            "不允许散在测量脚本里当一个没人复查的字面量。"
        )
    thresholds = manifest["thresholds"]
    for key in ("pass", "reference", "excellent", "anti_fail"):
        v = thresholds.get(key)
        if not isinstance(v, (int, float)) or not 0 < v <= 1:
            raise SystemExit(f"fixtures/visual-benchmark.json thresholds.{key} 缺失或不在 (0,1]：{v!r}")
    positives = [(x, embedding(load_image(x["image"]))) for x in manifest["positives"]]
    anti = [(x, embedding(load_image(x["image"]))) for x in manifest["anti"]]
    samples = manifest["sampling"]["positions"]
    fps = int(ir["fps"])
    reports = []
    for scene in ir.get("scenes", []):
        start = int(round(float(scene["start"]) * fps))
        end = max(start, start + int(round(float(scene["duration"]) * fps)) - 1)
        frame_files = [frame_path(args.frames, sampled_frame(start, end, pos)) for pos in samples]
        imgs = [load_image(p) for p in frame_files]
        frame_scores = []
        anti_scores = []
        for img in imgs:
            e = embedding(img)
            eligible = [item for item in positives if not item[0].get("variant") or scene.get("variant") in item[0]["variant"]] or positives
            vals = sorted([(cosine(e, v), item["id"]) for item, v in eligible], reverse=True)
            frame_scores.append(vals[: manifest["sampling"]["top_k_positive"]])
            anti_scores.extend((cosine(e, v), item["id"]) for item, v in anti)
        flat_scores = [x for row in frame_scores for x in row]
        positive = sum(x[0] for x in flat_scores) / len(flat_scores)
        positive_best_score, positive_best_id = max(flat_scores)
        anti_max, anti_id = max(anti_scores)
        reference = clip01(pw * positive + aw * (1 - anti_max))
        status = "FAIL" if reference < thresholds["pass"] or anti_max > thresholds["anti_fail"] else "PASS"
        band = (
            "excellent" if reference >= thresholds["excellent"]
            else ("reference" if reference >= thresholds["reference"] else ("pass" if status == "PASS" else "fail"))
        )
        reports.append({
            "scene": scene["id"],
            "ratio": os.path.basename(args.out).replace("visual_regression_", "").replace(".json", ""),
            "frames": frame_files,
            "positive_similarity": round(positive, 3),
            "positive_best": round(positive_best_score, 3),
            # 记下「最像哪张参考图」而不是只留一个数：变体过滤（variant）到底生效没有、
            # 回归位移是往哪个方向走的，只看分数都答不出来。
            "nearest_positive": positive_best_id,
            "anti_similarity": round(anti_max, 3),
            "nearest_anti": anti_id,
            "reference_similarity": round(reference, 3),
            "quality_band": band,
            "status": status,
            **scene_features(imgs),
        })

    previous = {}
    if os.path.exists(args.out):
        try:
            previous = {s["scene"]: s for s in json.load(open(args.out, encoding="utf8")).get("scenes", [])}
        except Exception:
            previous = {}
    for scene in reports:
        old = previous.get(scene["scene"])
        if old and old.get("reference_similarity") is not None:
            scene["reference_similarity_delta"] = round(scene["reference_similarity"] - float(old["reference_similarity"]), 3)
        else:
            scene["reference_similarity_delta"] = None

    result = {
        "version": "3.0",
        "embedding": DESCRIPTOR,
        # 把当次用的判据一并写进记录：分数漂了以后，得能分清是画面变了还是权重/阈值变了。
        "scoring": scoring,
        "thresholds": thresholds,
        "gate": "advisory",
        "blocking": False,
        "rationale": (
            "reference assets are 64x36 synthetic fixtures and the descriptor is a deterministic pixel "
            "signature (v2: stdlib bilinear + area-average, float throughout), not a semantic model; measured "
            "against them, objectively denser and better composed frames score lower. Recorded as a run-to-run "
            "regression signal only. Delivery is gated by frame/motion metrics and text provenance instead. "
            "v1 readings (PIL LANCZOS, uint8-quantized) are not comparable with v2."
        ),
        "status": "FAIL" if any(x["status"] == "FAIL" for x in reports) else "PASS",
        "scenes": reports,
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    json.dump(result, open(args.out, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    deltas = [s["reference_similarity_delta"] for s in reports if s.get("reference_similarity_delta") is not None]
    print(json.dumps({
        "status": result["status"],
        "gate": result["gate"],
        "scenes": len(reports),
        "embedding": result["embedding"],
        "mean_reference_similarity": round(sum(s["reference_similarity"] for s in reports) / max(1, len(reports)), 3),
        "mean_delta_vs_previous": round(sum(deltas) / len(deltas), 3) if deltas else None,
    }, ensure_ascii=False))
    raise SystemExit(0)


if __name__ == "__main__":
    main()
