#!/usr/bin/env python3
"""纯 stdlib 的图像分析原语（连通域 / 亮度 / 饱和度 / 掩膜运行长）。

代替 numpy + scipy.ndimage：frame_metrics 的「主体尺度、柔光面积、紫色碎片」全部建立在
二值图的连通域统计上，scipy 用 binary_dilation + label 一行搞定，纯 python 照抄那两行会慢到不可用
（1280×720 逐像素 union-find）。所以这里换成**游程（run-length）表示**：

  · 一行里的连续 True 段是一个 run (x0, x1)；
  · 矩形结构元的膨胀 = 每个 run 横向长 grow_x、纵向覆盖 y±grow_y 的若干行；
  · 相邻行之间区间重叠 → 同一个物体（union-find 合并）。

结果与 scipy 的「先膨胀再 label」等价，复杂度随 run 数而非像素数增长：
满屏星点约 4k run，一帧 <0.1 s；同样口径逐像素要 90 万次循环。

⚠ 判据数值一律来自 fixtures/visual_contracts.json（由 src/visual/field.mjs 导出），
  本模块不内联任何阈值，否则又回到「QC 自说自话」。
"""
import math


class ContractError(Exception):
    pass


def load_contracts(path):
    import json

    try:
        with open(path, encoding="utf8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        raise ContractError(f"{path} 不存在：先跑 npm run export-visual-contracts")
    for block in ("canvas", "measure", "typography", "beat", "camera"):
        if block not in data:
            raise ContractError(f"{path} 缺 {block} 区块，版本不匹配（重跑 npm run export-visual-contracts）")
    return data


def ratio_block(contracts, ratio):
    blocks = contracts["canvas"]["ratios"]
    if ratio not in blocks:
        raise ContractError(f"contracts 里没有画幅 {ratio}，有：{', '.join(blocks)}")
    return blocks[ratio]


def frame_ratio(path):
    """从文件名/路径推画幅（artifacts/frames/16x9/f_0001.png）。"""
    import os
    import re

    m = re.search(r"(16x9|9x16|4x5|1x1)", path.replace(os.sep, "/"))
    return m.group(1) if m else "16x9"


# ---------------- 逐像素口径 ----------------
def luma_row(row, channels, coeffs, divisor):
    """Rec.601 整数近似，与 contracts.measure.luma 同源。"""
    if channels == 1:
        return list(row)
    if channels == 3:
        kr, kg, kb = coeffs
        return [
            (row[i] * kr + row[i + 1] * kg + row[i + 2] * kb) // divisor
            for i in range(0, len(row), 3)
        ]
    if channels == 4:
        kr, kg, kb = coeffs
        return [
            (row[i] * kr + row[i + 1] * kg + row[i + 2] * kb) // divisor
            for i in range(0, len(row), 4)
        ]
    raise ContractError(f"未接通道数 {channels}")


def sat_row(row, channels):
    """sat = (max-min)/max（不是 HSL 的 S）。灰底 sat=0，纯色 sat=1。"""
    if channels == 1:
        return [0.0] * len(row)
    step = channels
    out = []
    for i in range(0, len(row), step):
        px = row[i : i + 3] if step >= 3 else row[i : i + step]
        mx = max(px)
        out.append(((mx - min(px)) / mx) if mx > 0 else 0.0)
    return out


def rgb_columns(row, channels):
    """(r_row, g_row, b_row)，灰底三列相同。"""
    if channels == 1:
        return list(row), list(row), list(row)
    stride = channels
    r = row[0::stride]
    g = row[1::stride]
    b = row[2::stride]
    return list(r), list(g), list(b)


# ---------------- 游程与连通域 ----------------
def runs(mask):
    """list[(x0, x1)]，x1 不含。空 mask 返回 []。"""
    out = []
    x0 = None
    for x, v in enumerate(mask):
        if v and x0 is None:
            x0 = x
        elif not v and x0 is not None:
            out.append((x0, x))
            x0 = None
    if x0 is not None:
        out.append((x0, len(mask)))
    return out


class _DSU:
    __slots__ = ("p",)

    def __init__(self):
        self.p = []

    def add(self):
        self.p.append(len(self.p))
        return len(self.p) - 1

    def find(self, i):
        p = self.p
        while p[i] != i:
            p[i] = p[p[i]]
            i = p[i]
        return i

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


def objects(runs_per_row, grow_x=0, grow_y=0, width=None, min_ink=0):
    """矩形结构元膨胀 + 4-连通 label，返回物体列表（按 ink 降序）。

    每项 {y0,y1,x0,x1,h,w,ink}，坐标是**膨胀后**的（scipy 的 find_objects 量的是膨胀图，
    所以 13×41 的结构元会把 h 抬高 12、w 抬高 40 —— 阈值 h<60 是按这个口径定的，
    换成源坐标去比就会系统性偏小，判定全错）。

    纵向连通距离 = lo+hi+1：膨胀后两段共享一行（<=lo+hi）或行相邻（=lo+hi+1）都算同一物体。
    grow_x / grow_y 传「半宽高」：scipy 的 np.ones((13, 41)) 对应 grow_y=6、grow_x=20。
    """
    lo_y = hi_y = grow_y
    dsu = _DSU()
    # 1) 横向膨胀 + 每行合并成不相交区间
    row_intervals = {}
    for y, rr in enumerate(runs_per_row):
        if not rr:
            continue
        grown = []
        for (x0, x1) in rr:
            gx0 = max(0, x0 - grow_x)
            gx1 = x1 + grow_x
            if width is not None:
                gx1 = min(width, gx1)
            grown.append((gx0, gx1, dsu.add(), x0, x1))
        grown.sort()
        merged = []
        for gx0, gx1, nid, x0, x1 in grown:
            if merged and gx0 <= merged[-1][1]:
                last = merged[-1]
                last[1] = max(last[1], gx1)
                dsu.union(last[2][0], nid)
                last[2].append(nid)
                last[3].append((x0, x1, y))
            else:
                merged.append([gx0, gx1, [nid], [(x0, x1, y)]])
        row_intervals[y] = merged

    # 2) 纵向连通。膨胀后两段的关系只有两种，判据不同：
    #    · 共享目标行（行距 <= lo+hi）：在同一行里列区间**相接**（ia[1]==ib[0]）就是连成一片的
    #      同一串 True 像素 → 同物体；
    #    · 只是行相邻（行距 == lo+hi+1）：4-连通要求**同一列**，相接的列不算。
    #    ⚠ 混用一种判据两边都错：统一用严格重叠会漏掉「错位但相碰」的连通（碎片数虚高），
    #      统一用 <= 会把对角线上的星点连成一串（主体尺度虚高）。独占端点写法，x1 不含。
    rows_sorted = sorted(row_intervals)
    for ai, a in enumerate(rows_sorted):
        for b in rows_sorted[ai + 1 :]:
            distance = b - a
            if distance > lo_y + hi_y + 1:
                break
            share_rows = distance <= lo_y + hi_y
            for ia in row_intervals[a]:
                for ib in row_intervals[b]:
                    hit = (ia[0] <= ib[1] and ib[0] <= ia[1]) if share_rows else (ia[0] < ib[1] and ib[0] < ia[1])
                    if hit:
                        dsu.union(ia[2][0], ib[2][0])

    # 3) 汇总：bbox 取膨胀坐标，ink 累加源 run 长度
    groups = {}
    for y in rows_sorted:
        for interval in row_intervals[y]:
            root = dsu.find(interval[2][0])
            g = groups.get(root)
            if g is None:
                g = groups[root] = {"y0": 1 << 30, "y1": -1, "x0": 1 << 30, "x1": -1, "ink": 0}
            g["y0"] = min(g["y0"], max(0, y - lo_y))
            g["y1"] = max(g["y1"], min(len(runs_per_row) - 1, y + hi_y))
            for (x0, x1, _sy) in interval[3]:
                gx0 = max(0, x0 - grow_x)
                gx1 = x1 + grow_x - 1
                if width is not None:
                    gx1 = min(width - 1, gx1)
                g["x0"] = min(g["x0"], gx0)
                g["x1"] = max(g["x1"], gx1)
            g["ink"] += sum(x1 - x0 for (x0, x1, _sy) in interval[3])
    out = []
    for g in groups.values():
        if g["ink"] < min_ink:
            continue
        g["h"] = g["y1"] - g["y0"] + 1
        g["w"] = g["x1"] - g["x0"] + 1
        out.append(g)
    out.sort(key=lambda g: -g["ink"])
    return out


def largest_area(mask_rows):
    """4-连通最大块面积（scipy: label(sub) 后 bincount 的最大值）。柔光主角区用它。

    objects() 已按 ink 降序，直接取第一个；写成 max(gen, 0) 会变成「生成器 vs 0」的比较。
    """
    objs = objects([runs(m) for m in mask_rows])
    return objs[0]["ink"] if objs else 0


# ---------------- 统计 ----------------
def median(values):
    vals = sorted(values)
    if not vals:
        return 0.0
    n = len(vals)
    mid = n // 2
    return float(vals[mid]) if n % 2 else (vals[mid - 1] + vals[mid]) / 2.0


def longest_run(flags):
    run = best = 0
    for v in flags:
        run = run + 1 if v else 0
        if run > best:
            best = run
    return best


# ---------------- 读图与重采样（替掉 PIL） ----------------
def _ppm_header(data, pos):
    """读 PPM 头的 3 个 token（宽/高/maxval），跳过空白与 # 注释。"""
    toks = []
    n = len(data)
    while len(toks) < 3:
        while pos < n and data[pos:pos + 1] in b" \t\r\n":
            pos += 1
        if pos < n and data[pos:pos + 1] == b"#":
            nl = data.find(b"\n", pos)
            pos = n if nl < 0 else nl + 1
            continue
        start = pos
        while pos < n and data[pos:pos + 1] not in b" \t\r\n":
            pos += 1
        if start == pos:
            raise ContractError("PPM 头不完整（读不到 宽/高/maxval）")
        toks.append(int(data[start:pos]))
    return toks, min(pos + 1, n)


def read_ppm(path):
    """P3(ASCII)/P6(二进制) 单帧 RGB。visual-benchmark 的参考资产就是 P3，标准库读得动。"""
    import pngio

    with open(path, "rb") as handle:
        data = handle.read()
    if data[:2] not in (b"P3", b"P6"):
        raise ContractError(f"{path} 不是 PPM(P3/P6)，实际文件头 {data[:2]!r}")
    (width, height, maxval), pos = _ppm_header(data, 2)
    if maxval <= 0:
        raise ContractError(f"{path} maxval={maxval} 非法")
    tail = data[pos:]
    vals = list(tail) if data[:2] == b"P6" else [int(t) for t in tail.split()]
    need = width * height * 3
    if len(vals) < need:
        raise ContractError(f"{path} 只有 {len(vals)} 个分量，{width}×{height}×3 需要 {need}")
    vals = vals[:need]
    if maxval != 255:
        k = 255.0 / maxval
        vals = [min(255, int(v * k + 0.5)) for v in vals]
    rows = [bytearray(vals[y * 3 * width:(y + 1) * 3 * width]) for y in range(height)]
    return pngio.Image(width, height, 3, rows)


def load_rgb(path):
    """统一解码入口：PNG（成片帧）与 PPM（benchmark 参考图）都返回 pngio.Image。

    两边必须走同一套解码 —— 参考图和被测帧不在一个坐标系里时，cosine similarity 量的是格式差异。
    """
    import os

    ext = os.path.splitext(path)[1].lower()
    if ext == ".png":
        import pngio

        return pngio.read(path)
    if ext in (".ppm", ".pnm"):
        return read_ppm(path)
    raise ContractError(
        f"{path}: 只认 PNG / PPM。JPEG 要 Pillow，而测量层刻意不装它 —— "
        "缺依赖时宁可在这里报错，也不要让 QC 静默不跑。"
    )


def _axis_weights(span, out):
    """目标像素中心 → 源坐标（边缘钳位），返回 [(i0, i1, t)]。
    不钳位的话首/末像素会拿 0.75 权重去插一个不存在的行，边框亮度被系统性带偏。"""
    toks = []
    for i in range(out):
        f = (i + 0.5) * span / out - 0.5
        if f <= 0:
            toks.append((0, 0, 0.0))
        elif f >= span - 1:
            toks.append((span - 1, span - 1, 0.0))
        else:
            i0 = int(math.floor(f))
            toks.append((i0, min(span - 1, i0 + 1), f - i0))
    return toks


def resize_bilinear(img, out_w, out_h):
    """双线性重采样，返回 out_h 行、每行 out_w×3 的 float（0–255）。

    替掉 PIL 的 LANCZOS：纯 stdlib 做不了 6-tap Lanczos，也没必要 —— embedding 只需要一个
    确定性的、跨画幅稳定的缩略描述。代价是读数与旧版不可比，所以描述符版本必须一起改
    （见 scripts/visual_regression.py 的 DESCRIPTOR）。
    """
    if img.channels != 3:
        img = img.to_rgb()
    w, h, src = img.width, img.height, img.rows
    cols = _axis_weights(w, out_w)
    rows_w = _axis_weights(h, out_h)
    out = []
    for y0, y1, ty in rows_w:
        top, bot = src[y0], src[y1]
        row = []
        for x0, x1, tx in cols:
            a0, a1 = x0 * 3, x1 * 3
            for c in range(3):
                a = top[a0 + c] + (top[a1 + c] - top[a0 + c]) * tx
                b = bot[a0 + c] + (bot[a1 + c] - bot[a0 + c]) * tx
                row.append(a + (b - a) * ty)
        out.append(row)
    return out
