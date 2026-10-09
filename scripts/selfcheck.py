#!/usr/bin/env python3
"""分镜表自检：帧号、时间轴覆盖、镜头时长、持续动作、末拍稳定期、Glitch/扫光白名单。

用法（默认值即流水线路径，`npm run selfcheck` 不带参数）：
  python3 scripts/selfcheck.py [--storyboard 分镜表.md] [--timeline script/timeline.json]

路径可覆盖给 scripts/verify-storyboard.mjs 用：那条门用合成时间轴把
render_storyboard → selfcheck 整链跑通，并对每条判据做变异（少了判据的门禁等于没有门禁）。
"""
import argparse
import json
import os
import re
import sys

ap = argparse.ArgumentParser()
ap.add_argument("--storyboard", default="分镜表.md")
ap.add_argument("--timeline", default="script/timeline.json")
ap.add_argument("--check-obsolete", default=".", help="检查 run-pN.mjs 是否残留的目录（默认当前目录=仓库根）")
args = ap.parse_args()


def fail(message):
    raise SystemExit(message)


def read_text(path, hint):
    if not os.path.exists(path):
        # 「先跑 npm run tts / storyboard」是这里唯一的真原因，回溯不会说出来。
        # hint 由调用方给：路径可覆盖之后还按文件名后缀猜是哪个产物会猜错 ——
        # verify-storyboard.mjs 传进来的副本就叫 storyboard-*.md，它缺的其实是时间轴。
        fail(f"missing artifact: {path}（{hint}）")
    return open(path, encoding="utf8").read()


storyboard = read_text(args.storyboard, "先跑 npm run storyboard：它把 script/storyboard_src.md 渲染成分镜表")
try:
    timeline = json.loads(read_text(args.timeline, "先跑 npm run tts：它写出 script/timeline.json"))
except json.JSONDecodeError as err:
    # 配音跑到一半被打断就会留下半截 JSON；裸回溯只会让人去查 python。
    fail(f"时间轴不是合法 JSON：{args.timeline}（{err.msg} 第 {err.lineno} 行第 {err.colno} 列）——重跑 npm run tts")

if re.search(r"\{(?:S\d+|C\d+|TOTAL)(?:\.[^}]+)?[+-]?\d*\}", storyboard):
    fail("unresolved storyboard token")

shots = []
for match in re.finditer(r"^\| (SC\d+) \| (\d+)–(\d+) \| ([^|]+) \| ([^|]+) \| (.+?) \|$", storyboard, re.M):
    sid, a, b, beat, visual, motion = match.groups()
    shots.append({
        "id": sid,
        "from": int(a),
        "to": int(b),
        "beat": beat.strip(),
        "visual": visual.strip(),
        "motion": motion.strip(),
    })

# 一行都没匹配上 = 分镜表表格格式变了，不是「这条片没镜头」。
# 以前这里会走到下面的 coverage 判断，报一个 0 != 14 的假原因。
if not shots:
    fail("分镜表里没有解析到任何 | SCnn | 起–止 | … | 表格行：格式变了还是这一版根本没用表格？" +
         f"（{args.storyboard}）")

sentences = timeline.get("sentences", [])
if len(shots) != len(sentences):
    fail("storyboard/timeline coverage mismatch: %d != %d" % (len(shots), len(sentences)))

prev_to = 0
for index, shot in enumerate(shots):
    sentence = sentences[index]
    if shot["from"] != int(sentence["from"]) or shot["to"] != int(sentence["to"]):
        fail("timeline mismatch: %s" % shot["id"])
    if shot["to"] < shot["from"]:
        fail("invalid shot range: " + shot["id"])
    if shot["from"] < prev_to:
        fail("shot overlap: " + shot["id"])
    if shot["to"] - shot["from"] + 1 < 120:
        fail("shot too short (<120f): " + shot["id"])
    if not re.search(r"continuous\s*:", shot["motion"], re.I):
        fail("missing continuous action: " + shot["id"])
    hold = re.search(r"(?:hold|停留)\s*:\s*(\d+)f", shot["motion"], re.I)
    if not hold or int(hold.group(1)) < 30:
        fail("insufficient settle hold (<30f): " + shot["id"])
    prev_to = shot["to"]

glitch_line = next((line for line in storyboard.splitlines() if "闪烁白名单" in line), "")
glitch_whitelist = set(re.findall(r"\b(SC\d+)\b", glitch_line))
for shot in shots:
    used = len(re.findall(r"\bGlitchIn\b|\bglitch\b", shot["visual"] + " " + shot["motion"], re.I))
    allowed = 1 if shot["id"] in glitch_whitelist else 0
    if used > allowed:
        fail("glitch over whitelist: " + shot["id"])

light_line = next((line for line in storyboard.splitlines() if "扫光白名单" in line), "")
for shot in shots:
    used = len(re.findall(r"\bLightSweep\b|\bStageLine\b|\bGhostText\b", shot["visual"] + " " + shot["motion"]))
    allowed = 1 if light_line and shot["id"] in light_line else 0
    if used > allowed:
        fail("light-sweep over whitelist: " + shot["id"])

# 这些是老的一次性入口脚本；留着就说明有人还在按老流程跑生产。
for bad in [
    "run-p1.mjs",
    "run-p2.mjs",
    "run-p3.mjs",
    "run-p4.mjs",
    "run-p5.mjs",
    "run-p6.mjs",
    "run-p7.mjs",
]:
    if os.path.exists(os.path.join(args.check_obsolete, "scripts", bad)):
        fail("obsolete entry remains: " + bad)

print("selfcheck PASS", len(shots), "shots")
