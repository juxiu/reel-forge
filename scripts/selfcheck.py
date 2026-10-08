#!/usr/bin/env python3
import json,re,sys,os
sb=open("分镜表.md",encoding="utf8").read();tl=json.load(open("script/timeline.json",encoding="utf8"))
if re.search(r"\{(?:S|C|TOTAL)",sb):raise SystemExit("unresolved storyboard token")
shots=re.findall(r"^\| (SC\d+) \| (\d+)–(\d+) \|",sb,re.M)
if len(shots)!=len(tl["sentences"]):raise SystemExit("storyboard/timeline coverage mismatch")
prev=0
for sid,a,b in shots:
 if a<prev:raise SystemExit("shot overlap: "+sid)
 prev=b
for bad in ["run-p1.mjs","run-p2.mjs","run-p3.mjs","run-p4.mjs","run-p5.mjs","run-p6.mjs","run-p7.mjs"]:
 if os.path.exists("scripts/"+bad):raise SystemExit("obsolete entry remains: "+bad)
print("selfcheck PASS",len(shots),"shots")
