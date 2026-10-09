import fs from "node:fs";
// 描述符名字住在两个语言里：fixtures/visual-benchmark.json（清单）和 scripts/visual_regression.py（DESCRIPTOR）。
// 这里以前把它硬编码成某个字面量，于是「换了实现 → 换了清单 → 门禁照绿」：
// 名字一漂，两边比的就不是同一把尺子，而 cosine 读数跨版本根本不可比。
// 现在从脚本源码里把 DESCRIPTOR 抠出来对撞，谁漂谁炸。
const manifest=JSON.parse(fs.readFileSync("fixtures/visual-benchmark.json","utf8"));
const source=fs.readFileSync("scripts/visual_regression.py","utf8");
const declared=source.match(/^DESCRIPTOR\s*=\s*"([^"]+)"/m)?.[1];
if(!declared) throw new Error("scripts/visual_regression.py 里找不到 DESCRIPTOR 常量");
if(manifest.embedding!==declared) throw new Error(`embedding drift: benchmark=${manifest.embedding} visual_regression.py=${declared}`);
if(!/^visual-pixel-v[1-9]\d*$/.test(manifest.embedding)) throw new Error("unexpected visual embedding provider: "+manifest.embedding);
const t=manifest.thresholds||{};
if(!(t.pass>0 && t.pass<t.reference && t.reference<t.excellent && t.excellent<=1)) throw new Error("visual thresholds must satisfy 0 < pass < reference < excellent <= 1");
if(!(t.anti_fail>0 && t.anti_fail<=1)) throw new Error("invalid anti_fail threshold");
// reference_similarity = positive_weight×正例相似 + anti_weight×(1-反例最大)。权重就是判据，
// 判据必须和阈值住在同一个清单里；visual_regression.py 读的是同一份，两边都校验才不会各说各话。
const sc=manifest.scoring||{};
if(!(sc.positive_weight>0 && sc.anti_weight>0)) throw new Error("scoring weights must be positive");
if(Math.abs(sc.positive_weight+sc.anti_weight-1)>1e-9) throw new Error("scoring weights must sum to 1");
const sampling=manifest.sampling||{};
const positions=sampling.positions||[];
if(!positions.length || positions.some(p=>!(typeof p==="number"&&p>=0&&p<=1))) throw new Error("sampling.positions must be numbers in [0,1]");
if(!(sampling.top_k_positive>=1)) throw new Error("sampling.top_k_positive must be >= 1");
const all=[...(manifest.positives||[]),...(manifest.anti||[])];
if(new Set(all.map(x=>x.id)).size!==all.length) throw new Error("duplicate visual reference id");
if(!manifest.anti?.length) throw new Error("anti-reference set is empty");
for(const item of all){
  if(!item.image || !fs.existsSync(item.image) || !fs.statSync(item.image).size) throw new Error("visual reference missing: "+item.id);
  // 测量层只有标准库：参考图必须是 vision.load_rgb 认得的格式（PNG/PPM），别塞 JPEG 进来。
  if(!/\.(png|ppm|pnm)$/i.test(item.image)) throw new Error("visual reference must be PNG/PPM (stdlib-decodable): "+item.id+" "+item.image);
}
const ppm=fs.readFileSync(manifest.positives[0].image,"utf8");
if(!ppm.startsWith("P3")) throw new Error("visual references must be readable PPM assets");
console.log("visual benchmark PASS",JSON.stringify({positives:manifest.positives.length,anti:manifest.anti.length,embedding:manifest.embedding,thresholds:t}));
