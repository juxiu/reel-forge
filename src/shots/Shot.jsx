import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {PALETTE, safeArea, clamp01, easeOut} from "../visual/style.mjs";

export function ExplainerShot({scene}) {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  const area = safeArea(config.width, config.height);
  const len = Math.max(1, Math.round(scene.duration * config.fps));
  const enter = easeOut(Math.min(1, (frame + 1) / 22));
  const exit = clamp01((len - frame) / 12);
  const hold = Math.min(1, Math.max(0, (frame - 28) / 30));
  const push = 1 + Math.min(0.045, frame / Math.max(1, len) * 0.045);
  const drift = Math.sin(frame / 34) * 7;
  const tall = config.height > config.width;
  const cx = tall ? config.width / 2 : config.width * 0.52;
  const cy = tall ? config.height * 0.41 : config.height * 0.42;
  const cardW = tall ? config.width * 0.78 : Math.min(config.width * 0.7, 760);
  const cardH = tall ? 300 : 260;
  const titleSize = tall ? 48 : 62;
  const hero = scene.elements && scene.elements.find(function(item) { return item.id === "hero"; });
  const heroText = hero && hero.text ? hero.text : (scene.narration && scene.narration.text) || "Explainer";

  return <div style={{position: "absolute", inset: 0, opacity: exit}}>
    <div style={{position: "absolute", left: cx - cardW / 2, top: cy - cardH / 2 + drift + (1 - enter) * 48, width: cardW, height: cardH, transform: "scale(" + push + ")", opacity: enter}}>
      <div style={{position: "absolute", inset: 0, border: "2px solid " + PALETTE.line, borderRadius: 26, background: "linear-gradient(145deg,rgba(17,17,26,.96),rgba(8,8,13,.9))", boxShadow: "0 0 0 1px rgba(125,104,255,.15),0 0 52px rgba(85,64,196,.22)"}} />
      <div style={{position: "absolute", left: 26, top: 22, fontFamily: "Arial,sans-serif", fontSize: 18, letterSpacing: 4, color: PALETTE.purpleLight}}>CORE CONCEPT</div>
      <div style={{position: "absolute", left: 26, right: 26, top: 64, fontFamily: "Arial,sans-serif", fontWeight: 900, fontSize: titleSize, lineHeight: 1.08, color: PALETTE.white, textShadow: "0 0 22px rgba(125,104,255,.28)"}}>{heroText}</div>
      <div style={{position: "absolute", left: 26, bottom: 28, right: 26, height: 3, background: "linear-gradient(90deg," + PALETTE.purple + ",transparent)", opacity: 0.7}} />
      <div style={{position: "absolute", left: 34, right: 34, bottom: 48, height: 62}}>
        {[0, 1, 2].map(function(i) {
          const x = 34 + i * ((cardW - 100) / 3);
          const pulse = (Math.sin(frame / 10 + i * 1.3) + 1) / 2;
          return <React.Fragment key={i}>
            {i > 0 ? <div style={{position: "absolute", left: x - 50, top: 29, width: 52, height: 2, background: PALETTE.purple, opacity: 0.3 + 0.7 * pulse}} /> : null}
            <div style={{position: "absolute", left: x - 8, top: 21, width: 18, height: 18, borderRadius: 999, background: PALETTE.purpleLight, boxShadow: "0 0 18px rgba(125,104,255," + (0.25 + 0.55 * pulse).toFixed(2) + ")"}} />
          </React.Fragment>;
        })}
        <div style={{position: "absolute", left: 0, top: 22, width: cardW - 68, height: 2, background: "linear-gradient(90deg,transparent," + PALETTE.purple + ",transparent)", transform: "translateX(" + (((frame * 9) % (cardW + 60)) - 60) + "px)"}} />
      </div>
    </div>
    {!tall ? <div style={{position: "absolute", left: area.left, bottom: area.bottom + 56, maxWidth: 360, fontFamily: "Arial,sans-serif", fontSize: 20, lineHeight: 1.4, color: PALETTE.grey, opacity: 0.75 * hold}}>enter → transform → settle</div> : null}
  </div>;
}
