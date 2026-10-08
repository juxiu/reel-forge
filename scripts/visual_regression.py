#!/usr/bin/env python3
import argparse,json,math,os,glob
import numpy as np
from PIL import Image

def load_image(path):
    im=Image.open(path).convert("RGB")
    return np.asarray(im.resize((32,18),Image.Resampling.LANCZOS),dtype=np.float32)/255.0

def embedding(image):
    gray=image.mean(axis=2)
    small=gray.reshape(6,3,32,18).mean(axis=(1,3))
    channels=[image[:,:,i].reshape(6,3,32,18).mean(axis=(1,3)) for i in range(3)]
    dx=np.abs(np.diff(gray,axis=1)).reshape(6,3,31,18).mean(axis=(2,3))
    dy=np.abs(np.diff(gray,axis=0)).reshape(6,3,32,17).mean(axis=(2,3))
    v=np.concatenate([small.flatten(),*(c.flatten() for c in channels),dx.flatten(),dy.flatten()])
    v=v.astype(np.float32)
    n=float(np.linalg.norm(v))
    return v/(n if n else 1.0)

def cosine(a,b): return float(np.dot(a,b)/(max(1e-8,np.linalg.norm(a)*np.linalg.norm(b))))

def entropy(gray):
    hist,_=np.histogram((gray*255).astype(np.uint8),bins=32,range=(0,255),density=True)
    p=hist[hist>0]; return float(-(p*np.log2(p)).sum()) if len(p) else 0.0

def saliency(image):
    gray=image.mean(axis=2)
    dx=np.zeros_like(gray); dy=np.zeros_like(gray)
    dx[:,1:]=np.abs(gray[:,1:]-gray[:,:-1]); dy[1:,:]=np.abs(gray[1:,:]-gray[:-1,:])
    w=dx+dy+0.15*gray
    total=float(w.sum())
    if total<=1e-8: return np.array([.5,.5],dtype=np.float32)
    yy,xx=np.mgrid[0:w.shape[0],0:w.shape[1]]
    return np.array([float((xx*w).sum()/total)/(w.shape[1]-1),float((yy*w).sum()/total)/(w.shape[0]-1)],dtype=np.float32)

def scene_features(images):
    grays=[im.mean(axis=2) for im in images]
    edges=[]
    for g in grays:
        dx=np.abs(np.diff(g,axis=1)); dy=np.abs(np.diff(g,axis=0))
        edges.append(float((dx.mean()+dy.mean())/2))
    edge=float(np.mean(edges))
    ent=float(np.mean([entropy(g) for g in grays]))/5.0
    complexity=float(np.clip(0.55*min(1,edge/0.18)+0.45*min(1,ent),0,1))
    bright_bottom=float(np.mean([((im[int(im.shape[0]*.72):].mean(axis=2))>.68).mean() for im in images]))
    text_score=float(np.clip(1-(bright_bottom-0.08)/0.18,0,1)) if bright_bottom>0.08 else 1.0
    cents=[saliency(im) for im in images]
    spread=float(np.mean([np.linalg.norm(c-cents[0]) for c in cents[1:]])) if len(cents)>1 else 0.0
    hero=float(np.clip(1-spread/0.38,0,1))
    layout=[]
    for im in images:
        g=im.mean(axis=2).reshape(6,3,32,18).mean(axis=(2,3))
        layout.append(g.flatten()-g.mean())
    sims=[cosine(layout[0],x) for x in layout[1:]]
    stability=float(np.clip(np.mean(sims) if sims else 1,0,1))
    return {"visual_complexity":round(complexity,3),"text_density":round(text_score,3),"hero_consistency":round(hero,3),"layout_stability":round(stability,3)}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--frames",required=True)
    ap.add_argument("--render-ir",required=True)
    ap.add_argument("--benchmark",default="fixtures/visual-benchmark.json")
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    manifest=json.load(open(args.benchmark,encoding="utf8"))
    ir=json.load(open(args.render_ir,encoding="utf8"))
    positives=[(x,embedding(load_image(x["image"]))) for x in manifest["positives"]]
    anti=[(x,embedding(load_image(x["image"]))) for x in manifest["anti"]]
    thresholds=manifest["thresholds"]
    samples=manifest["sampling"]["positions"]
    reports=[]
    for scene in ir.get("scenes",[]):
        imgs=[]
        frame_files=[]
        start=int(round(float(scene["start"])*ir["fps"]))
        end=max(start,start+int(round(float(scene["duration"])*ir["fps"]))-1)
        for pos in samples:
            frame=min(end,max(start,int(round(start+(end-start)*pos))))
            matches=glob.glob(os.path.join(args.frames,f"*_{frame+1:04d}.jpg"))
            if not matches: matches=glob.glob(os.path.join(args.frames,f"*_{frame+1:04d}.jpeg"))
            if not matches: raise SystemExit(f"missing sampled frame {scene['id']} f{frame}")
            frame_files.append(matches[0]); imgs.append(load_image(matches[0]))
        frame_scores=[]
        anti_scores=[]
        for img in imgs:
            e=embedding(img)
            eligible=[item for item in positives if not item[0].get("variant") or scene.get("variant") in item[0]["variant"]]
            if not eligible: eligible=positives
            vals=sorted([(cosine(e,v),item["id"]) for item,v in eligible],reverse=True)
            frame_scores.append(vals[:manifest["sampling"]["top_k_positive"]])
            anti_scores.extend((cosine(e,v),item["id"]) for item,v in anti)
        positive=float(np.mean([x[0] for row in frame_scores for x in row]))
        positive_best=max(x[0] for row in frame_scores for x in row)
        anti_max,anti_id=max(anti_scores)
        reference=float(np.clip(.78*positive+.22*(1-anti_max),0,1))
        features=scene_features(imgs)
        status="FAIL" if reference<thresholds["pass"] or anti_max>thresholds["anti_fail"] else "PASS"
        band="excellent" if reference>=thresholds["excellent"] else ("reference" if reference>=thresholds["reference"] else ("pass" if status=="PASS" else "fail"))
        reports.append({"scene":scene["id"],"ratio":os.path.basename(args.out).replace("visual_regression_","").replace(".json",""),"frames":frame_files,"positive_similarity":round(positive,3),"positive_best":round(positive_best,3),"anti_similarity":round(anti_max,3),"nearest_anti":anti_id,"reference_similarity":round(reference,3),"quality_band":band,"status":status,**features})
    result={"version":"1.0","embedding":"visual-pixel-v1","status":"FAIL" if any(x["status"]=="FAIL" for x in reports) else "PASS","scenes":reports}
    os.makedirs(os.path.dirname(args.out),exist_ok=True)
    json.dump(result,open(args.out,"w",encoding="utf8"),ensure_ascii=False,indent=2)
    print(json.dumps({"status":result["status"],"scenes":len(reports),"embedding":result["embedding"]},ensure_ascii=False))
    raise SystemExit(1 if result["status"]!="PASS" else 0)

if __name__=="__main__": main()
