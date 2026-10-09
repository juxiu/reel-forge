#!/usr/bin/env python3
"""vision.objects() 的暴力对照测试：与小尺寸网格上的「逐像素膨胀 + 4-连通 flood fill」比。

只在开发期跑（verify:measure 会调用它），因为暴力法 O(pixels*struct) 只适合几十像素的图。
"""
import random
import sys

sys.path.insert(0, "scripts")
import vision  # noqa: E402


def brute(runs_per_row, nrows, ncols, gy, gx):
    grid = [[0] * ncols for _ in range(nrows)]
    src = [[0] * ncols for _ in range(nrows)]
    for y, rr in enumerate(runs_per_row):
        for x0, x1 in rr:
            for x in range(x0, x1):
                src[y][x] = 1
    for y, rr in enumerate(runs_per_row):
        for x0, x1 in rr:
            for yy in range(max(0, y - gy), min(nrows, y + gy + 1)):
                for xx in range(max(0, x0 - gx), min(ncols, x1 + gx)):
                    grid[yy][xx] = 1
    seen = [[False] * ncols for _ in range(nrows)]
    out = []
    for y in range(nrows):
        for x in range(ncols):
            if not grid[y][x] or seen[y][x]:
                continue
            stack = [(y, x)]
            seen[y][x] = True
            ys = []
            xs = []
            while stack:
                cy, cx = stack.pop()
                ys.append(cy)
                xs.append(cx)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < nrows and 0 <= nx < ncols and grid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
            ink = sum(src[cy][cx] for cy, cx in zip(ys, xs))
            out.append({"y0": min(ys), "y1": max(ys), "x0": min(xs), "x1": max(xs), "ink": ink,
                        "h": max(ys) - min(ys) + 1, "w": max(xs) - min(xs) + 1})
    return out


def canon(objs):
    return sorted((o["y0"], o["y1"], o["x0"], o["x1"], o["ink"]) for o in objs if o["ink"] > 0)


random.seed(20261009)
bad = 0
cases = 0
for trial in range(220):
    nrows = random.randint(3, 14)
    ncols = random.randint(3, 16)
    density = random.choice([0.06, 0.12, 0.2, 0.35, 0.6])
    runs_per_row = []
    for _ in range(nrows):
        mask = [random.random() < density for _ in range(ncols)]
        runs_per_row.append(vision.runs(mask))
    for gx, gy in ((0, 0), (1, 0), (0, 1), (2, 1), (3, 2), (20, 6)):
        if gx >= ncols and gy >= nrows:
            continue
        cases += 1
        mine = vision.objects(runs_per_row, grow_x=gx, grow_y=gy, width=ncols)
        ref = brute(runs_per_row, nrows, ncols, gy, gx)
        if canon(mine) != canon(ref):
            bad += 1
            if bad <= 3:
                print("MISMATCH gx=%d gy=%d grid=%dx%d" % (gx, gy, nrows, ncols))
                print("  mine:", canon(mine))
                print("  ref :", canon(ref))
                print("  runs:", runs_per_row)

print("vision.objects brute-force:", "PASS" if bad == 0 else f"FAIL {bad}/{cases}", f"({cases} cases)")
sys.exit(0 if bad == 0 else 1)
