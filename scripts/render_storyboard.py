#!/usr/bin/env python3
"""分镜表渲染：把 script/storyboard_src.md 里的 {S01.from}/{C1}/{TOTAL-6} 帧号占位换成真实帧号。

用法（默认值就是流水线里的路径，`npm run storyboard` 不用带参数）：
  python3 scripts/render_storyboard.py [--timeline script/timeline.json]
      [--src script/storyboard_src.md] [--out 分镜表.md]

路径可覆盖是给 scripts/verify-storyboard.mjs 用的：那一门用**合成时间轴**把这条链
（render_storyboard → selfcheck）在秒级跑通并做变异测试。以前这两个脚本只读固定路径，
于是「分镜表自检」从来没被执行过 —— 而 CI 里 `npm run selfcheck` 挂了才发现格式对不上。
"""
import argparse
import json
import re

ap = argparse.ArgumentParser()
ap.add_argument("--timeline", default="script/timeline.json")
ap.add_argument("--src", default="script/storyboard_src.md")
ap.add_argument("--out", default="分镜表.md")
args = ap.parse_args()

# 缺文件要给一句话，不要 FileNotFoundError 回溯：这一步在流水线里紧跟 TTS，
# 最常见的失败就是「配音还没跑」，回溯只会让人先去查 python。
try:
    tl = json.load(open(args.timeline, encoding="utf-8"))
except FileNotFoundError:
    raise SystemExit(f"缺时间轴 {args.timeline}：先跑 npm run tts（它写出 script/timeline.json）")
try:
    source = open(args.src, encoding="utf-8").read()
except FileNotFoundError:
    raise SystemExit(f"缺分镜源文件 {args.src}")

S = {x["id"]: x for x in tl["sentences"]}
C = {x["n"]: x["from"] for x in tl["chapters"]}
total = tl["total_frames"]
TOKEN_RX = r"\{(S\d+|C\d+|TOTAL)(?:\.(from|to|c\d+))?([+-]\d+)?\}"


def repl(m):
    key, field, off = m.group(1), m.group(2), int(m.group(3) or 0)
    # 未知句子/章节号以前是裸 KeyError 回溯。报出 token 本身：分镜表里写错一个 S07，
    #  traceback 里只有 'S07'，看不出它是哪一格。
    if key == "TOTAL":
        v = total
    elif key.startswith("C"):  # C1 / C2 … 章节起始帧
        if int(key[1:]) not in C:
            raise SystemExit(f"分镜里有 {m.group(0)}，但时间轴没有第 {key[1:]} 章（章节到 {max(C) if C else '无'} 为止）")
        v = C[int(key[1:])]
    else:
        if key not in S:
            raise SystemExit(f"分镜里有 {m.group(0)}，但时间轴没有句子 {key}（共 {len(S)} 句）")
        s = S[key]
        if field == "to":
            v = s["to"]
        elif field and field.startswith("c"):
            index = int(field[1:]) - 1
            if not s.get("subs") or index >= len(s["subs"]):
                raise SystemExit(f"{key} 没有第 {index + 1} 个子句（subs），但分镜写了 {m.group(0)}")
            v = s["subs"][index]["from"]
        else:
            v = s["from"]
    return str(v + off)


out = re.sub(TOKEN_RX, repl, source)
# 先验残留再写文件：写完再抛错会在仓库里留一份「半渲染」的分镜表，
# 下一轮 selfcheck 会拿它当输入，报出一堆和真因无关的帧号问题。
left = re.findall(r"\{[^}]+\}", out)
if left:
    raise SystemExit("unresolved storyboard tokens: " + str(left[:5]))
open(args.out, "w", encoding="utf-8").write(out)
print("storyboard PASS", args.out)
