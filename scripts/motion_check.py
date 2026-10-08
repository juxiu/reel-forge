#!/usr/bin/env python3
import argparse,glob,os
import numpy as np
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument("frames",nargs="?",default="artifacts/frames/16x9");ap.add_argument("--threshold",type=float,default=.35);a=ap.parse_args()
files=sorted(glob.glob(os.path.join(a.frames,"*.jpg")));prev=None;run=best=0
for f in files:
 im=np.asarray(Image.open(f).convert("L").resize((320,180)),dtype=np.float32)
 d=0 if prev is None else float(np.abs(im-prev).mean());prev=im
 if d<a.threshold:run+=1;best=max(best,run)
 else:run=0
print("motion_check:",{"frames":len(files),"longest_low_change_frames":best,"status":"FAIL" if best>90 else "PASS"})
if best>90:raise SystemExit(1)
