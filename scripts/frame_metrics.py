#!/usr/bin/env python3
import argparse,glob,os
import numpy as np
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument("--frames",default="artifacts/frames/16x9");ap.add_argument("--out",default="artifacts/qc/frame_metrics.md");a=ap.parse_args()
files=sorted(glob.glob(os.path.join(a.frames,"*.jpg")));rows=[];prev=None
for f in files:
 im=np.asarray(Image.open(f).convert("L").resize((320,180)),dtype=np.int16)
 bright=int((im>170).sum()); change=0 if prev is None else float(np.abs(im-prev).mean()); prev=im
 rows.append((os.path.basename(f),bright,change))
longest=cur=0
for _,b,c in rows:
 cur=cur+1 if c<.35 else 0;longest=max(longest,cur)
os.makedirs(os.path.dirname(a.out),exist_ok=True)
open(a.out,"w",encoding="utf8").write("# Frame Metrics\n\nframes: %d\n\nmax bright pixels: %d\nlongest low-change run: %d frames\n"%(len(rows),max((r[1] for r in rows),default=0),longest))
print(a.out)
