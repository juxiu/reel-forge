#!/usr/bin/env python3
import json,re,os
tl=json.load(open("script/timeline.json",encoding="utf-8"))
S={x["id"]:x for x in tl["sentences"]};C={x["n"]:x["from"] for x in tl["chapters"]};total=tl["total_frames"]
def repl(m):
    key,field,off=m.group(1),m.group(2),int(m.group(3) or 0)
    if key=="TOTAL":v=total
    elif key.startswith("C"):v=C[int(key[1:])]
    else:
      s=S[key]
      v=s["from"] if field=="from" else s["to"] if field=="to" else s["subs"][int(field[1:])-1]["from"] if field and field.startswith("c") else s["from"]
    return str(v+off)
src=open("script/storyboard_src.md",encoding="utf-8").read()
out=re.sub(r"\{(S\d+|C\d+|TOTAL)(?:\.(from|to|c\d+))?([+-]\d+)?\}",repl,src)
open("分镜表.md","w",encoding="utf-8").write(out)
left=re.findall(r"\{[^}]+\}",out)
if left:raise SystemExit("unresolved storyboard tokens: "+str(left[:5]))
print("storyboard PASS")
