import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {PALETTE, safeArea, clamp01, easeOut} from "../visual/style.mjs";

export function Backdrop() {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const tall = config.height > config.width;
  const phase = frame / 48;
  const cols = tall ? 6 : 9;
  const rows = tall ? 7 : 8;
  const count = cols * rows;
  const dots = Array.from({length: count}, function(_, i) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = ((col + 0.5) / cols) * config.width;
    const y = ((row + 0.5) / rows) * config.height;
    const dx = Math.sin(phase + i * 0.7) * 7;
    const dy = Math.cos(phase * 0.8 + i * 0.4) * 5;
    const opacity = 0.08 + ((i * 17) % 8) / 100;
    return <div key={i} style={{position: "absolute", left: x + dx, top: y + dy, width: 2.5, height: 2.5, borderRadius: 999, background: PALETTE.purple, opacity}} />;
  });

  return <div style={{position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 44%, rgba(73,53,152,.28) 0%, rgba(5,5,7,0) 56%)"}}>
    {dots}
    <div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,.025),transparent 18%,transparent 78%,rgba(255,255,255,.02))"}} />
  </div>;
}

export function Hud({title = "REEL FORGE", chapter = ""}) {
  const config = useVideoConfig();
  const area = safeArea(config.width, config.height);
  return <div style={{position: "absolute", left: area.left, top: area.top - 28, display: "flex", gap: 12, alignItems: "center", fontFamily: "Arial,sans-serif", fontWeight: 700, letterSpacing: 3, color: PALETTE.grey, fontSize: 18}}>
    <span style={{padding: "7px 12px", border: "1px solid " + PALETTE.line, borderRadius: 999, background: "rgba(0,0,0,.7)"}}>{title}</span>
    {chapter ? <span style={{padding: "7px 12px", border: "1px solid " + PALETTE.purple + "66", borderRadius: 999, color: PALETTE.purpleLight, background: "rgba(19,15,38,.8)"}}>{chapter}</span> : null}
  </div>;
}

export function ProgressBar({chapters = [], totalFrames = 1}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const area = safeArea(config.width, config.height);
  const progress = clamp01(frame / Math.max(1, totalFrames - 1));
  const count = Math.max(1, chapters.length);
  const widthPx = config.width - area.left - area.right;
  return <div style={{position: "absolute", left: area.left, right: area.right, bottom: 16, height: 5, background: "#262631", display: "flex"}}>
    {Array.from({length: count}, function(_, i) {
      const from = chapters[i] ? chapters[i].from : Math.round((i / count) * totalFrames);
      const to = chapters[i + 1] ? chapters[i + 1].from : totalFrames;
      const p = clamp01((frame - from) / Math.max(1, to - from));
      return <div key={i} style={{height: "100%", width: widthPx / count, background: PALETTE.purple, opacity: Math.max(0.18, p)}} />;
    })}
    <div style={{position: "absolute", left: progress * widthPx - 1, width: 2, height: 13, top: -4, background: PALETTE.white, boxShadow: "0 0 12px rgba(125,104,255,.65)"}} />
  </div>;
}

export function Captions({captions = []}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const area = safeArea(config.width, config.height);
  const current = captions.find(function(caption) { return frame / 30 >= caption.start && frame / 30 < caption.end; });
  if (!current) return null;
  const text = String(current.text);
  const maxChars = config.width > config.height ? 18 : 12;
  const fontSize = text.length > maxChars ? 34 : 44;
  return <div style={{position: "absolute", left: area.left, right: area.right, bottom: 34, padding: "10px 16px", fontFamily: "Arial,sans-serif", fontSize, fontWeight: 800, lineHeight: 1.18, textAlign: "center", color: PALETTE.white, WebkitTextStroke: "2px #000", paintOrder: "stroke fill", textShadow: "0 3px 12px rgba(0,0,0,.9)"}}>{text}</div>;
}

export function ChapterCard({timeline}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const chapters = timeline && Array.isArray(timeline.chapters) ? timeline.chapters : [];
  const chapter = chapters.slice().reverse().find(function(item) { return frame >= item.from - 1; });
  if (!chapter || chapter.n <= 1 || !(frame >= chapter.from - 1 && frame < chapter.from - 1 + 36)) return null;
  const p = easeOut((frame - (chapter.from - 1)) / 22);
  return <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.72)", opacity: p, zIndex: 20}}>
    <div style={{textAlign: "center", fontFamily: "Arial,sans-serif", transform: "translateY(" + ((1 - p) * 34) + "px)"}}>
      <div style={{fontSize: 20, letterSpacing: 7, color: PALETTE.purpleLight}}>CHAPTER {chapter.n}</div>
      <div style={{marginTop: 18, fontSize: Math.min(82, config.width * 0.075), fontWeight: 900, color: PALETTE.white}}>{chapter.title}</div>
    </div>
  </div>;
}

export function EndingCredit({show = false, startFrame = 0}) {
  if (!show) return null;
  const frame = useCurrentFrame();
  const p = easeOut((frame - startFrame) / 24);
  return <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", opacity: p, zIndex: 30}}>
    <div style={{textAlign: "center", fontFamily: "Arial,sans-serif", color: PALETTE.white}}>
      <div style={{fontSize: 18, letterSpacing: 5, color: PALETTE.grey}}>REEL FORGE</div>
      <div style={{marginTop: 14, fontSize: 56, fontWeight: 900}}>built by code</div>
      <div style={{marginTop: 14, fontSize: 18, color: PALETTE.grey}}>facts → narration → storyboard → render → QC</div>
    </div>
  </div>;
}
