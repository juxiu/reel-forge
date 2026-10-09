import fs from 'node:fs';

/**
 * 装配取数回归（src/visual/timeline.mjs，纯函数、node 直接跑）。
 *
 * 判的是「覆盖层的帧号从哪来」这一件事，而它是三类真事故的共同源头：
 *   · 章节卡只剩 1 帧（章 to 被补成 next.from−1，把章间留白吃掉）；
 *   · 顶栏在两句之间空白几十帧（hud 区间没接上），或反过来在章节卡期间还压着一行字；
 *   · 全新 clone 打不开包（index.jsx 静态 import 了 gitignore 的 script/timeline.json）。
 * 这些都能在不渲染的情况下算，所以没有理由留给肉眼。
 */

const fails = [];
const ok = (c, m) => {
  if (!c) fails.push(m);
};
const eq = (a, b, m) => ok(a === b, `${m}（期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}）`);
const eqJson = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}（期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}）`);

const {captionBlocks, chaptersOf, chapterCardAt, chapterCardWindows, hudEntries, hudBlankSpans, scenesUnderChapterCard} = await import('../src/visual/timeline.mjs');

const FPS = 30;

// ---- 1) 章节：tts_build 只给 from，to 必须是「本章内容末帧」而不是下一章前一帧 ----
const tl = {
  fps: FPS,
  total_frames: 900,
  chapters: [{n: 1, title: '问题', from: 46}, {n: 2, title: '构建', from: 420}, {n: 3, title: '取舍', from: 700}],
  sentences: [
    {id: 'S01', chapter: 1, from: 46, to: 120},
    {id: 'S08', chapter: 1, from: 121, to: 372},
    {id: 'S12', chapter: 2, from: 421, to: 500},
    {id: 'S18', chapter: 2, from: 501, to: 654},
    {id: 'S20', chapter: 3, from: 701, to: 800},
    {id: 'S24', chapter: 3, from: 801, to: 880},
  ],
  hud: [
    {fromS: 'S01', toS: 'S01', text: '为什么需要'},
    {fromS: 'S08', toS: 'S18', text: '切分与入库', tech: 'Chunk & Index'},
    {fromS: 'S20', toS: 'S24', text: '召回权衡'},
  ],
};
const ch = chaptersOf(tl, 900, FPS);
eqJson(ch.map((c) => [c.from, c.to]), [[46, 372], [420, 654], [700, 880]], '章 to 取本章最后一句的末帧');
ok(ch.every((c) => Number.isFinite(c.from) && Number.isFinite(c.to) && c.to >= c.from), '章界不得是 NaN 或倒挂');

// ---- 2) 章节卡窗口：上一章末 +3 … 本章首 −9，要有可看时长 ----
const wins = chapterCardWindows(ch);
eqJson(wins.map((w) => [w.from, w.to]), [[375, 411], [657, 691]], '卡片窗口 = 章间留白的中间那段');
let cardFrames = 0;
for (let N = 1; N <= 900; N++) if (chapterCardAt(ch, N)) cardFrames += 1;
ok(cardFrames >= 40, `章节卡总时长 ${cardFrames} 帧太短（两张卡各应 30+ 帧）`);
ok(cardFrames <= 120, `章节卡总时长 ${cardFrames} 帧太长（卡片是导航不是过场）`);
eq(chapterCardAt(ch, ch[1].from), null, '本章首帧起不再显示卡片（章卡不能让位给下一章的画面）');

// ---- 3) HUD：按句 id 取帧；章间留白不续期；漏了小节名要能报出来 ----
const hud = hudEntries(tl, ch, 900);
eqJson(hud.map((e) => [e.from, e.to, e.text]), [[46, 120, '为什么需要'], [121, 654, '切分与入库'], [701, 880, '召回权衡']], 'hud 由 fromS/toS 解析成帧号');
ok(hud.every((e) => e.text), 'HUD 条目不得有空文本（空胶囊 = 顶栏缺字）');
eqJson(hudBlankSpans(hud, ch), [], '正常分镜不应报 HUD 空档');
const dropped = [{...hud[0]}, {...hud[1], to: 500}, {...hud[2]}];
const blanks = hudBlankSpans(dropped, ch);
ok(blanks.length === 1 && blanks[0].from <= 561 && blanks[0].to >= 640, `漏写一节小节名应被报出来（实得 ${JSON.stringify(blanks)}）`);
const fallback = hudEntries({...tl, hud: undefined}, ch, 900);
eqJson(fallback.map((e) => e.text), ['问题', '构建', '取舍'], '没有 hud 声明时退回章名');

// ---- 4) 字幕块：1-based、秒→帧、to 不早于 from ----
const caps = captionBlocks([{id: 'c1', start: 1.6, end: 4.025}, {from: 50, to: 80, text: 'x'}, {from: 90, to: 85, text: '倒挂'}], FPS);
eq(caps[0].from, 49, '秒制字幕块换算成 1-based 帧号');
eq(caps[1].from, 50, '已给帧号时不再二次换算');
ok(caps[2].to >= caps[2].from, 'to 早于 from 的字幕块必须被纠正');
eq(captionBlocks(null, FPS).length, 0, 'captions 缺失时返回空数组而不是崩');

// ---- 5) 卡片期间不该有镜头在动 ----
const clash = scenesUnderChapterCard(ch, [{id: 'scene-012', start: 420 / FPS - 1, duration: 6}], FPS);
ok(clash.length === 1 && clash[0].scene === 'scene-012', '跨章界的镜头应被点名为「与章节卡打架」');
ok(scenesUnderChapterCard(ch, [{id: 'scene-001', start: 0, duration: 4}], FPS).length === 0, '章内镜头不该误报');

// ---- 6) 打包不再依赖 gitignore 的运行产物 ----
{
  const entry = fs.readFileSync('src/remotion/index.jsx', 'utf8');
  ok(!/from\s*['"]\.\.\/\.\.\/script\/timeline\.json['"]/.test(entry), 'index.jsx 仍在静态 import script/timeline.json（fresh clone 打包必失败）');
  ok(/from\s*['"]\.\/timeline\.gen\.mjs['"]/.test(entry), 'index.jsx 应从 src/remotion/timeline.gen.mjs 装载时间轴');
  ok(fs.existsSync('src/remotion/timeline.gen.mjs'), 'timeline.gen.mjs 占位文件必须提交进仓库');
  const gen = fs.readFileSync('src/remotion/timeline.gen.mjs', 'utf8');
  ok(/export\s+const\s+timeline\s*=/.test(gen), 'timeline.gen.mjs 必须导出 timeline');
}

if (fails.length) {
  console.error('TIMELINE GATE FAIL');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('TIMELINE GATE PASS', JSON.stringify({chapters: ch.length, hud: hud.length, card_frames: cardFrames}));
