#!/usr/bin/env python3
import json
import os
import re
import sys

def fail(message):
    raise SystemExit(message)

def read_text(path):
    if not os.path.exists(path):
        fail("missing artifact: " + path)
    return open(path, encoding="utf8").read()

storyboard = read_text("分镜表.md")
timeline = json.load(open("script/timeline.json", encoding="utf8"))

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

for bad in [
    "run-p1.mjs",
    "run-p2.mjs",
    "run-p3.mjs",
    "run-p4.mjs",
    "run-p5.mjs",
    "run-p6.mjs",
    "run-p7.mjs",
]:
    if os.path.exists("scripts/" + bad):
        fail("obsolete entry remains: " + bad)

print("selfcheck PASS", len(shots), "shots")
