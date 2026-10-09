#!/usr/bin/env python3
"""测量层自测：不用 ffmpeg、不用 PIL、不用 numpy，纯合成 PNG 验证 frame_metrics 量得对不对。

为什么需要它：这台机器上没有 ffmpeg / numpy / Pillow，真实帧根本进不了测量层；
如果只写脚本不跑，就等于回到「门禁永远绿，因为从没执行过」。
合成帧因此是必需的：它让整条测量链（PNG 解码 → 取景区 → 掩膜 → 连通域 → 判据 → flags）
在任何一台只有标准库的机器上都可验证。

跑法：python3 scripts/test_measurement.py
"""
import json
import math
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import pngio  # noqa: E402
import vision  # noqa: E402
from visual_regression import DESCRIPTOR  # noqa: E402  描述符名字只在这一处，别在测试里再抄一遍

CONTRACTS = os.path.join(ROOT, "fixtures", "visual_contracts.json")
C = vision.load_contracts(CONTRACTS)
BLOCK = vision.ratio_block(C, "16x9")
DFD = BLOCK["dot_field_device"]["device"]
ZONE = BLOCK["qc_zone"]["device"]
W, H = BLOCK["device"]["width"], BLOCK["device"]["height"]
# 子进程也按 UTF-8 输出，否则 Windows 上它写 GBK、这边按 UTF-8 读，错误信息全是乱码。
CHILD_ENV = dict(os.environ, PYTHONIOENCODING="utf-8")


def blank(base=(11, 12, 17)):
    """整帧底色。逐像素 extend 在 1280×720 上一帧要几百 ms，光造 6 条测试片就要几分钟；
    先造一行再复制 H 份，同样的东西几 ms。"""
    row = bytearray(bytes(base) * W)
    return [bytearray(row) for _ in range(H)]


def rect(rows, x0, y0, x1, y1, color):
    """填充矩形按整行切片写入：逐像素写一个 300×200 的块是 6 万次赋值，纯 python 不该这么花。"""
    left, right = max(0, x0), min(W, x1)
    if right <= left:
        return
    span = bytes(color) * (right - left)
    for y in range(max(0, y0), min(H, y1)):
        rows[y][left * 3 : right * 3] = span


def disc(rows, cx, cy, r, color):
    for y in range(max(0, int(cy - r)), min(H, int(cy + r) + 1)):
        dy = y - cy
        for x in range(max(0, int(cx - r)), min(W, int(cx + r) + 1)):
            if (x - cx) ** 2 + dy ** 2 <= r * r:
                i = x * 3
                rows[y][i : i + 3] = bytes(color)


def with_dots(rows):
    """按 contracts 的网格画幕底点，亮度故意过 bright_luma 线：掩膜没生效就会被数成碎屑。

    半径取 ceil(设备点半径)：SVG 圆有抗锯齿边，实际亮的 footprint 只会比几何半径大，
    画小了就测不出「掩膜盖不住点」这个真 bug（r 曾写成 6.7、掩膜只有 5，就是这么漏的）。
    """
    r = max(1, math.ceil(DFD["r"]))
    y = DFD["y0"]
    while y < H:
        x = DFD["x0"]
        while x < W:
            disc(rows, x, y, r, (207, 224, 255))
            x += DFD["step"]
        y += DFD["step"]
    return rows


def write_film(directory, hero_wh, frames, glow=True, purple_pieces=0):
    os.makedirs(directory, exist_ok=True)
    x0, y0 = 400, 220
    for n in range(1, frames + 1):
        rows = blank()
        with_dots(rows)
        if glow:
            # 主角外柔光：sat>0.25、lum 落在 22–110 之间（紫雾）
            rect(rows, x0 - 40, y0 - 40, x0 + hero_wh[0] + 40, y0 + hero_wh[1] + 40, (60, 30, 110))
        rect(rows, x0, y0, x0 + hero_wh[0], y0 + hero_wh[1], (245, 245, 245))
        for k in range(purple_pieces):
            rect(rows, 120 + k * 90, 500, 120 + k * 90 + 40, 540, (102, 48, 248))
        pngio.write(os.path.join(directory, "f_%04d.png" % n), W, H, 3, rows)


def write_ir(path, scenes):
    with open(path, "w", encoding="utf8") as handle:
        json.dump({"fps": 30, "scenes": scenes}, handle)


def write_clip(directory, frames, move_from=None, move_to=None, move_dx=6, black_from=None, hero=(300, 200), pulse=None):
    """给 motion_check 造「有动作 / 落位 / 离场」的短片。move_from=None 就是整片静止。

    动作刻意做成**整块主角平移**：hold 判的是「无大面积变化」（<1.5），只让一个角闪一下会把 diff
    压到静止区间，那就变成在测静止而不是测停留。离场用整帧压黑（真实片尾是灭光+压黑）。

    pulse=(宽, 高, 亮度, "shift"|"toggle", 位移)：一个每帧都在动、但**均摊亮度变化很小**的暗块。
    静止判据（灰度均值 <0.35）会把它算成静止，而分类判据（变化像素数）能看出它真的在动 ——
    「真静 / 小面积动作 / 有动作」三档就是靠这个差别分开的，两档都得能构造出来才谈得上验证。
    亮度取 60–72：Δ>25 才计入变化像素，又 <bright_luma(120) 所以不会被当成主角。
    """
    os.makedirs(directory, exist_ok=True)
    x0, y0 = 300, 220
    hw, hh = hero
    end = move_to if move_to is not None else frames + 1
    for n in range(1, frames + 1):
        if black_from is not None and n >= black_from:
            pngio.write(os.path.join(directory, "f_%04d.png" % n), W, H, 3, blank((0, 0, 0)))
            continue
        rows = blank()
        with_dots(rows)
        # 过了 move_to 就停在落位处（不是弹回原点）：否则「落位」变成一次反向大位移，hold 量不到东西。
        dx = (min(n, end - 1) - move_from) * move_dx if move_from is not None and n >= move_from else 0
        rect(rows, x0 + dx, y0, x0 + dx + hw, y0 + hh, (245, 245, 245))
        if pulse:
            pw, ph, level, mode, shift = pulse
            g = (level, level, level)
            px0, py0 = 200, 480  # 取景区内的空位，别压到主角
            if mode == "toggle":
                if n % 2 == 0:
                    rect(rows, px0, py0, px0 + pw, py0 + ph, g)
            else:
                off = (n % 2) * shift
                rect(rows, px0 + off, py0, px0 + off + pw, py0 + ph, g)
        pngio.write(os.path.join(directory, "f_%04d.png" % n), W, H, 3, rows)


def run_motion(frames_dir, ir_path, out_path, extra=()):
    cmd = [
        sys.executable,
        os.path.join(HERE, "motion_check.py"),
        "--frames", frames_dir,
        "--render-ir", ir_path,
        "--report", out_path,
        "--contracts", CONTRACTS,
    ] + list(extra)
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", env=CHILD_ENV)


def run_metrics(frames_dir, ir_path, out_path, extra=()):
    cmd = [
        sys.executable,
        os.path.join(HERE, "frame_metrics.py"),
        "--frames",
        frames_dir,
        "--render-ir",
        ir_path,
        "--out",
        out_path,
        "--contracts",
        CONTRACTS,
    ] + list(extra)
    # 子进程 print 的是中文；Windows 上 text=True 默认按 locale(GBK) 解，会直接 UnicodeDecodeError
    # 把 stdout 变成 None —— 门禁自己在什么设备上都会炸，比判据错更难查。
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", env=CHILD_ENV)
    return proc


results = []
tmp = os.path.join(ROOT, "artifacts", "_measure_fixture")
shutil.rmtree(tmp, ignore_errors=True)


def expect(name, cond, detail=""):
    results.append({"case": name, "ok": bool(cond), "detail": detail})
    print(("ok   " if cond else "FAIL ") + name + (" — " + str(detail) if detail and not cond else ""))


# 前置条件：本文件画的点必须和渲染层一样被掩膜盖住，否则「碎屑 ≈0」只是掩膜碰巧赢了一次。
expect("contracts 掩膜半径 ≥ 设备点半径", DFD["mask_radius"] >= math.ceil(DFD["r"]), {k: DFD[k] for k in ("r", "mask_radius")})


# ---- 案例 1：合规主角（300×200）→ 应 PASS，主体尺度约 212（含 12 行结构元膨胀）----
# 这里刻意把两个步长压到最小（motion-step 1 / step 6）：判据本身要逐帧验，
# 采样密度留给案例 5 单独验，两件事混在一起就分不清「量错了」还是「没量到」。
good = os.path.join(tmp, "good", "16x9")
ir = os.path.join(tmp, "ir.json")
write_film(good, (300, 200), 60)
write_ir(ir, [{"id": "scene-1", "start": 0, "duration": 2}])
proc = run_metrics(good, ir, os.path.join(tmp, "good.json"), ["--motion-step", "1", "--step", "6"])
data = json.load(open(os.path.join(tmp, "good.json"), encoding="utf8")) if os.path.exists(os.path.join(tmp, "good.json")) else {}
scene = (data.get("summary", {}).get("scenes") or [{}])[0]
expect("合成帧可解码", data.get("summary", {}).get("frames") == 60, data.get("summary", {}).get("frames"))
expect("合规片 exit 0", proc.returncode == 0, proc.stdout + proc.stderr)
expect("主体尺度 = 高 200 + 结构元 12", abs(scene.get("hero_median_px", 0) - 212) <= 2, scene.get("hero_median_px"))
expect("点阵被掩膜抠掉（背景碎屑 ≈0）", scene.get("debris_median", 99) < 5, scene.get("debris_median"))
expect("主角柔光被测到", scene.get("glow_hero_median_px2", 0) > BLOCK["measure_device"]["soft_glow"]["hero_area_min_px"], scene.get("glow_hero_median_px2"))
expect("无 flag", not scene.get("flags"), scene.get("flags"))

# ---- 案例 2：主角太小（90×60）→ hero_too_small，退出码 1 ----
bad = os.path.join(tmp, "small", "16x9")
write_film(bad, (90, 60), 60, glow=False)
proc = run_metrics(bad, ir, os.path.join(tmp, "small.json"))
data2 = json.load(open(os.path.join(tmp, "small.json"), encoding="utf8"))
scene2 = data2["summary"]["scenes"][0]
tokens = [f["token"] for f in scene2["flags"]]
expect("小主角 exit 1", proc.returncode == 1, proc.returncode)
expect("报 hero_too_small", "hero_too_small" in tokens, tokens)

# ---- 案例 3：静止 2 秒 > 上限 → freeze ----
still = os.path.join(tmp, "still", "16x9")
write_film(still, (300, 200), 120)
write_ir(os.path.join(tmp, "ir2.json"), [{"id": "scene-1", "start": 0, "duration": 4}])
proc = run_metrics(still, os.path.join(tmp, "ir2.json"), os.path.join(tmp, "still.json"))
data3 = json.load(open(os.path.join(tmp, "still.json"), encoding="utf8"))
scene3 = data3["summary"]["scenes"][0]
expect("全静止片报 freeze", "freeze" in [f["token"] for f in scene3["flags"]], scene3["flags"])
expect("静止帧数换算正确", scene3["longest_static_frames"] >= C["measure"]["motion"]["still_max_seconds"] * 30, scene3["longest_static_frames"])

# ---- 案例 4：紫色碎片 ≥ 阈值 → purple_debris ----
messy = os.path.join(tmp, "messy", "16x9")
write_film(messy, (300, 200), 40, purple_pieces=12)
proc = run_metrics(messy, ir, os.path.join(tmp, "messy.json"))
data4 = json.load(open(os.path.join(tmp, "messy.json"), encoding="utf8"))
scene4 = data4["summary"]["scenes"][0]
expect("紫碎片被数出来", scene4["purple_median"] >= 8, scene4["purple_median"])
expect("报 purple_debris", "purple_debris" in [f["token"] for f in scene4["flags"]], scene4["flags"])

# ---- 案例 4b：不给步长时必须用 contracts 的值，并且真的少解码（成本旋钮生效）----
dense = run_metrics(good, ir, os.path.join(tmp, "dense.json"))
data5 = json.load(open(os.path.join(tmp, "dense.json"), encoding="utf8"))
s = data5["summary"]
M = C["measure"]["motion"]
expect("默认步长取自 contracts", s["motion_step"] == M["step"] and s["analysis_step"] == M["analysis_step"], {k: s[k] for k in ("motion_step", "analysis_step")})
expect("帧差按 motion.step 少解码", s["frames"] == 60 // M["step"], s["frames"])
expect("全分辨率分析按公倍数", s["analyzed"] == 60 // s["analysis_every"], s["analyzed"])
expect("合规片在默认采样下仍 exit 0", dense.returncode == 0, dense.stdout + dense.stderr)

# ---- 案例 5：JPEG/坏 PNG 必须显式失败，不能静默 ----
broken = os.path.join(tmp, "broken", "16x9")
os.makedirs(broken, exist_ok=True)
with open(os.path.join(broken, "f_0001.png"), "wb") as handle:
    handle.write(b"\xff\xd8\xff" + b"not a png")
proc = run_metrics(broken, ir, os.path.join(tmp, "broken.json"))
expect("非 PNG 帧直接报错退出", proc.returncode != 0 and "PNG" in (proc.stdout + proc.stderr), (proc.stdout + proc.stderr)[:200])

# ---- 案例 6：contracts 缺失时不许静默通过 ----
proc = subprocess.run(
    [sys.executable, os.path.join(HERE, "frame_metrics.py"), "--frames", good, "--contracts", "fixtures/nope.json", "--out", os.path.join(tmp, "x.json")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
    errors="replace",
    env=CHILD_ENV,
)
out = (proc.stdout or "") + (proc.stderr or "")
expect("缺 contracts 明确报错", proc.returncode != 0 and "export-visual-contracts" in out, out[:200])

# ================= motion_check =================
MM = C["measure"]["motion"]
MD16 = BLOCK["measure_device"]["motion"]
CLS_TRUE = MD16["class_true_static_px"]
CLS_SMALL = MD16["class_small_motion_px"]
write_ir(os.path.join(tmp, "ir4s.json"), [{"id": "scene-1", "start": 0, "duration": 4}])


def motion_case(name, **layout):
    d = os.path.join(tmp, name, "16x9")
    write_clip(d, 120, **layout)
    proc = run_motion(d, os.path.join(tmp, "ir4s.json"), os.path.join(tmp, name + ".json"))
    rep = json.load(open(os.path.join(tmp, name + ".json"), encoding="utf8")) if os.path.exists(os.path.join(tmp, name + ".json")) else {}
    scene = (rep.get("summary", {}).get("scenes") or [{}])[0]
    return proc, scene


# ---- 案例 7：整片真静 → motion_too_low，且分类必须说「真静」（修复方向是加动词动作）----
proc, s_true = motion_case("m_true_static")
toks = [f["token"] for f in s_true.get("flags", [])]
expect("全静止被抓住", "motion_too_low" in toks, toks)
expect("分类=真静", (s_true.get("flags") or [{}])[0].get("classification") == "真静", (s_true.get("flags") or [{}])[0])
expect("静止秒数按步长换算", s_true.get("longest_static_seconds", 0) >= MM["still_max_seconds"], s_true.get("longest_static_seconds"))
expect("节奏不达标 exit 1", proc.returncode == 1, proc.returncode)

# ---- 案例 8：逐帧大面积动作 → 不报静止 ----
_proc, s_move = motion_case("m_moving", move_from=1, move_to=121)
expect("持续动作不误报", "motion_too_low" not in [f["token"] for f in s_move.get("flags", [])], s_move.get("flags"))
expect("动作片 still% 很低", s_move.get("still_pct", 100) < 20, s_move.get("still_pct"))

# ---- 案例 9：动完落位、停留够久且不离场 → hold 只参考不判 ----
_proc, s_hold = motion_case("m_hold", move_from=1, move_to=61)
expect("落位停留被量到", s_hold.get("hold_frames", 0) >= MM["hold_min_frames"], s_hold.get("hold_frames"))
expect("不离场的 hold 只带 ~", s_hold.get("hold_advisory") is True and not s_hold.get("flags"), {k: s_hold.get(k) for k in ("hold_advisory", "exited", "flags")})

# ---- 案例 10：离场前没停够 → hold_too_short（这是「推后离场/并镜头」，不是「加动作」）----
proc, s_exit = motion_case("m_exit", move_from=1, move_to=91, black_from=109)
expect("离场被识别", s_exit.get("exited") is True, s_exit.get("exited"))
expect("停留不足被抓", "hold_too_short" in [f["token"] for f in s_exit.get("flags", [])], s_exit.get("flags"))
expect("扣掉灭光帧", s_exit.get("hold_frames", 99) <= 60 - MM["glow_off_frames"], s_exit.get("hold_frames"))
expect("hold 不达标 exit 1", proc.returncode == 1, proc.returncode)


def classified(name, pulse):
    """静止但画面里确有东西在动：均值口径判成静止，像素数口径给出「动的是多大的东西」。"""
    _proc, scene = motion_case(name, pulse=pulse)
    flag = (scene.get("flags") or [{}])[0]
    return flag


# ---- 案例 12：小面积动作（40×40 每帧横移 16，Δluma 48）→ 分类=小面积动作 ----
flag_small = classified("m_small", (40, 40, 60, "shift", 16))
expect("小面积动作被判成静止（均值口径）", "motion_too_low" in flag_small.get("token", ""), flag_small)
expect("分类=小面积动作", flag_small.get("classification") == "小面积动作", {k: flag_small.get(k) for k in ("classification", "changed_px_median")})
expect("变化像素落在 800–2500", CLS_TRUE <= flag_small.get("changed_px_median", -1) < CLS_SMALL, flag_small.get("changed_px_median"))

# ---- 案例 13：有动作（50×60 整块闪现，Δluma 60）→ 分类=有动作，修复方向回分镜 ----
flag_big = classified("m_wash", (50, 60, 72, "toggle", 0))
expect("分类=有动作", flag_big.get("classification") == "有动作", {k: flag_big.get(k) for k in ("classification", "changed_px_median")})
expect("变化像素 ≥ 小动作上限", flag_big.get("changed_px_median", 0) >= CLS_SMALL, flag_big.get("changed_px_median"))
expect("「有动作」给的hint 是回分镜", "回分镜" in flag_big.get("repair_hint", ""), flag_big.get("repair_hint"))

# ---- 案例 11：PNG-only 与采样步长也要在 motion_check 上成立 ----
bad_dir = os.path.join(tmp, "m_empty", "16x9")
os.makedirs(bad_dir, exist_ok=True)
proc = run_motion(bad_dir, os.path.join(tmp, "ir4s.json"), os.path.join(tmp, "m_empty.json"))
expect("没有 PNG 帧就明确失败", proc.returncode != 0 and "PNG" in (proc.stdout or "") + (proc.stderr or ""), (proc.stdout or "") + (proc.stderr or "")[:160])
proc = run_motion(os.path.join(tmp, "m_hold", "16x9"), os.path.join(tmp, "ir4s.json"), os.path.join(tmp, "m_dense.json"), ["--step", "1"])
dense = json.load(open(os.path.join(tmp, "m_dense.json"), encoding="utf8"))["summary"]
expect("step 覆盖生效（逐帧解码）", dense["step"] == 1 and dense["frames"] == 120, {k: dense[k] for k in ("step", "frames")})

# ================= visual_regression（回归记录层，非阻断）=================
def run_visual(frames_dir, ir_path, out_path, benchmark="fixtures/visual-benchmark.json", extra=()):
    cmd = [
        sys.executable,
        os.path.join(HERE, "visual_regression.py"),
        "--frames", frames_dir,
        "--render-ir", ir_path,
        "--benchmark", benchmark,
        "--out", out_path,
    ] + list(extra)
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", env=CHILD_ENV)


def write_banded_film(directory, frames, y0, y1):
    """无点阵、单块高亮：把亮块放在取景区上半（y<518）或下半（y≥518），
    专门用来验 scene_features 读的是**整幅灰度图的底部亮带**。numpy 时代那版只取到第 0 行，
    这种差别它照样能蒙混过关。"""
    os.makedirs(directory, exist_ok=True)
    for n in range(1, frames + 1):
        rows = blank()
        rect(rows, 400, y0, 700, y1, (245, 245, 245))
        pngio.write(os.path.join(directory, "f_%04d.png" % n), W, H, 3, rows)


DIMS = ["reference_similarity", "visual_complexity", "text_density", "hero_consistency", "layout_stability"]
write_ir(os.path.join(tmp, "ir2s.json"), [{"id": "scene-1", "start": 0, "duration": 2}])

# ---- 案例 14：整条链路（PNG 解码 → 缩略 → 描述符 → cosine → 场景特征）能在纯 stdlib 下跑完 ----
vr_out = os.path.join(tmp, "vr.json")
proc = run_visual(good, os.path.join(tmp, "ir2s.json"), vr_out)
vrep = json.load(open(vr_out, encoding="utf8")) if os.path.exists(vr_out) else {}
vscene = (vrep.get("scenes") or [{}])[0]
expect("visual_regression exit 0（无 numpy/PIL）", proc.returncode == 0, (proc.stdout or "") + (proc.stderr or ""))
expect("记录里嵌入名与脚本一致", vrep.get("embedding") == DESCRIPTOR, vrep.get("embedding"))
expect("记录仍是非阻断（不许悄悄改成阻断门）", vrep.get("gate") == "advisory" and vrep.get("blocking") is False, {k: vrep.get(k) for k in ("gate", "blocking")})
expect("五个场景维度都算出来了且落在 [0,1]", all(0.0 <= vscene.get(d, -1) <= 1.0 for d in DIMS), {d: vscene.get(d) for d in DIMS})
expect("采样帧号换算到 1 基 PNG 文件名", [os.path.basename(p) for p in vscene.get("frames", [])] == ["f_0013.png", "f_0031.png", "f_0048.png"], vscene.get("frames"))
ANTI_IDS = {x["id"] for x in json.load(open(os.path.join(ROOT, "fixtures", "visual-benchmark.json"), encoding="utf8"))["anti"]}
expect("反例命中有名字", vscene.get("nearest_anti") in ANTI_IDS, vscene.get("nearest_anti"))
expect("记录带着当次用的判据", vrep.get("scoring") and vrep.get("thresholds"), {k: vrep.get(k) for k in ("scoring", "thresholds")})

# ---- 案例 15：同一批帧跑两次读数必须完全一致（否则「回归位移」量的是抖动，不是改动）----
proc = run_visual(good, os.path.join(tmp, "ir2s.json"), vr_out)
second = json.load(open(vr_out, encoding="utf8"))["scenes"][0]
expect("重跑分数不变", second.get("reference_similarity") == vscene.get("reference_similarity"), {vscene.get("reference_similarity"): second.get("reference_similarity")})
expect("重跑 delta 归零", second.get("reference_similarity_delta") == 0, second.get("reference_similarity_delta"))

# ---- 案例 16：变体过滤真的生效（而不是"看起来跑了两次一样的数"）----
# 同一批帧、只换 scene.variant：no-variant 走全集回退，"code" 只允许和 structured-mechanism 比。
# 两次都必须给出对应的最近参考图，否则 variant 过滤就是一段从没被执行过的代码。
write_ir(os.path.join(tmp, "ircode.json"), [{"id": "scene-1", "start": 0, "duration": 2, "variant": "code"}])
proc = run_visual(good, os.path.join(tmp, "ircode.json"), os.path.join(tmp, "vr_code.json"))
code = json.load(open(os.path.join(tmp, "vr_code.json"), encoding="utf8"))["scenes"][0]
expect("变体场景只和该变体的参考图比", code.get("nearest_positive") == "structured-mechanism", code.get("nearest_positive"))
write_ir(os.path.join(tmp, "irunk.json"), [{"id": "scene-1", "start": 0, "duration": 2, "variant": "no-such-variant"}])
proc = run_visual(good, os.path.join(tmp, "irunk.json"), os.path.join(tmp, "vr_unk.json"))
unk = json.load(open(os.path.join(tmp, "vr_unk.json"), encoding="utf8"))["scenes"][0]
expect("无匹配变体时退回全集而不是空集", os.path.exists(os.path.join(tmp, "vr_unk.json")) and unk.get("nearest_positive"), proc.stderr)

# ---- 案例 17：底部亮带判据读的是下半幅，不是第 0 行 ----
write_ir(os.path.join(tmp, "ir14.json"), [{"id": "scene-1", "start": 0, "duration": 1.4}])
top = os.path.join(tmp, "vr_top", "16x9")
bottom = os.path.join(tmp, "vr_bottom", "16x9")
write_banded_film(top, 36, 100, 300)
write_banded_film(bottom, 36, 560, 700)
run_visual(top, os.path.join(tmp, "ir14.json"), os.path.join(tmp, "vr_top.json"))
run_visual(bottom, os.path.join(tmp, "ir14.json"), os.path.join(tmp, "vr_bottom.json"))
t_dens = json.load(open(os.path.join(tmp, "vr_top.json"), encoding="utf8"))["scenes"][0]["text_density"]
b_dens = json.load(open(os.path.join(tmp, "vr_bottom.json"), encoding="utf8"))["scenes"][0]["text_density"]
expect("亮带在下半幅被算进文字密度", b_dens < 0.8, b_dens)
expect("亮带在上半幅不算文字密度", t_dens == 1.0, t_dens)

# ---- 案例 18：描述符/帧缺失都必须拒绝，不能出一张「看起来正常」的记录 ----
bad_manifest = os.path.join(tmp, "vb_v1.json")
manifest = json.load(open(os.path.join(ROOT, "fixtures", "visual-benchmark.json"), encoding="utf8"))
manifest["embedding"] = "visual-pixel-v1"
with open(bad_manifest, "w", encoding="utf8") as handle:
    json.dump(manifest, handle)
proc = run_visual(good, os.path.join(tmp, "ir2s.json"), os.path.join(tmp, "vr_drift.json"), bad_manifest)
out = (proc.stdout or "") + (proc.stderr or "")
expect("描述符不一致时拒绝比较", proc.returncode != 0 and "不可比" in out, out[:200])
proc = run_visual(good, os.path.join(tmp, "ir4s.json"), os.path.join(tmp, "vr_missing.json"))
out = (proc.stdout or "") + (proc.stderr or "")
# good 只有 60 帧，而 4 秒场景的 50% 采样点落在第 60 帧（1 基 → f_0061.png）。
expect("缺采样帧时报出文件名而不是崩", proc.returncode != 0 and "f_0061.png" in out, out[:200])

# ---- 案例 19：判据（权重/阈值）只能住在清单里；清单缺项就拒绝出分，不许脚本自带一套 ----
for drop, token in [(("scoring",), "scoring"), (("thresholds",), "thresholds")]:
    stripped = json.load(open(os.path.join(ROOT, "fixtures", "visual-benchmark.json"), encoding="utf8"))
    for key in drop:
        stripped.pop(key, None)
    path = os.path.join(tmp, "vb_no_%s.json" % drop[0])
    with open(path, "w", encoding="utf8") as handle:
        json.dump(stripped, handle)
    proc = run_visual(good, os.path.join(tmp, "ir2s.json"), os.path.join(tmp, "vr_no_%s.json" % drop[0]), path)
    out = (proc.stdout or "") + (proc.stderr or "")
    expect("清单缺 %s 时拒绝打分" % drop[0], proc.returncode != 0 and token in out, out[:200])
    expect("缺判据时不出记录文件", not os.path.exists(os.path.join(tmp, "vr_no_%s.json" % drop[0])))

failed = [r for r in results if not r["ok"]]
print("MEASURE TEST", "PASS" if not failed else f"FAIL {len(failed)}/{len(results)}", json.dumps([r["case"] for r in failed], ensure_ascii=False))
sys.exit(0 if not failed else 1)
