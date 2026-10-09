/**
 * 装配层的取数逻辑（纯函数，无 JSX）——和 camera.mjs 同一个理由：
 * 章节边界、HUD 区间、字幕块是 QC 判据的直接对象（章卡在不在、HUD 有没有空档、字幕压不压内容区），
 * 留在 Root.jsx 里就只能靠渲染出来用肉眼验，node 里一行都跑不了。
 *
 * ⚠ 帧号一律 1-based 含端点，与 tts_build 写出的 timeline 和分镜表同源；
 *    Remotion 的 useCurrentFrame() 是 0-based，换算只在装配层做一次（N = frame + 1）。
 */

export const toFrames = (v, fps) => Math.round(Number(v) * fps);

/** 字幕块：优先用 timeline 给的 1-based 绝对帧号，其次按秒换算（+1 换成 1-based）。 */
export function captionBlocks(captions, fps) {
  return (captions || []).map((c, i) => {
    const from = Number.isFinite(c.from) ? Math.round(c.from) : toFrames(c.start, fps) + 1;
    const to = Number.isFinite(c.to) ? Math.round(c.to) : toFrames(c.end, fps);
    return {id: c.id || `cap-${i + 1}`, text: String(c.text ?? ''), from, to: Math.max(from, to)};
  });
}

/**
 * 章节：timeline 有则用；没有时整片算一章。
 * 单章也要返回条目而不是空数组 —— 进度条按 chapters.length 等宽分槽，
 * 空数组会让 fresh clone 跑通例时直接崩在第一帧。
 *
 * ⚠ `to` 是**内容末帧**（本章最后一句的字幕末帧），不是下一章的前一帧：
 *    tts_build 只写每章 `from`（= 本章首句首帧），章与章之间有 CHAPTER_GAP≈45 帧静音。
 *    把 `to` 补成 next.from−1 会把这段留白吃掉，章节卡窗口 (prevTo+3 … curFrom−9) 就只剩 1 帧，
 *    结果是「卡片一闪而过 + HUD 全程不歇」；正确取法是留白仍然归上一句，卡片占留白中间那段。
 *    没有句子数据时才退回 next.from−1（说明这条 timeline 本来就没留白信息）。
 */
export function chaptersOf(timeline, totalFrames, fps) {
  const ch = timeline?.chapters || timeline?.chapter_list;
  const sentences = timeline?.sentences || [];
  const lastFrameOfChapter = new Map();
  for (const s of sentences) {
    const n = s.chapter ?? 1;
    const to = Number.isFinite(s.to) ? Math.round(s.to) : NaN;
    if (Number.isFinite(to)) lastFrameOfChapter.set(n, Math.max(lastFrameOfChapter.get(n) ?? 0, to));
  }
  if (Array.isArray(ch) && ch.length) {
    const list = ch.map((c, i) => ({
      n: c.n ?? i + 1,
      title: String(c.title ?? c.name ?? ''),
      tech: c.tech ?? c.subtitle ?? '',
      from: Math.round(Number.isFinite(c.from) ? c.from : toFrames(c.start, fps) + 1),
      to: Number.isFinite(c.to) ? Math.round(c.to) : NaN,
    }));
    for (let i = 0; i < list.length; i++) {
      if (Number.isFinite(list[i].to)) continue;
      const next = list[i + 1];
      const spoken = lastFrameOfChapter.get(list[i].n);
      list[i].to = Number.isFinite(spoken) ? Math.max(list[i].from, spoken) : Math.max(list[i].from, next ? next.from - 1 : totalFrames);
    }
    return list;
  }
  return [{n: 1, title: String(timeline?.title ?? timeline?.name ?? ''), tech: timeline?.tech ?? '', from: 1, to: totalFrames}];
}


/**
 * 顶部 HUD 小节名。
 * ⚠ HUD 标的是**当前小节**（名词短语），不是章名的重复：顶栏比章节进度条细一档，
 *    因为它回答「这一小节在讲什么」，进度条回答「整片走到哪」。
 *    所以 timeline.hud 存在时优先用它（按句 id 区间取帧），只有章节信息时才退回章名。
 * ⚠ 相邻条目之间不留空档（QC 判「HUD 空白闪一下」），**但章节卡期间必须歇**：
 *    全屏压黑 + 顶栏还在 = 两层抢注意力，样片这里是让顶栏随卡片淡出的。
 *    所以只有「不是过场窗口」的空档才续期到下一条的 from−1。
 */
export function hudEntries(timeline, chapters, totalFrames) {
  const hud = timeline?.hud;
  const byId = new Map((timeline?.sentences || []).map((s) => [String(s.id), s]));
  const windows = chapterCardWindows(chapters);
  const acrossCard = (a, b) => windows.some((w) => a < w.to && b > w.from);
  if (Array.isArray(hud) && hud.length) {
    const list = hud
      .map((e) => {
        const from = Math.round(Number.isFinite(e.from) ? e.from : (byId.get(String(e.fromS))?.from ?? chapters?.[0]?.from ?? 1)) + Number(e.fromOffset ?? 0);
        const to = Math.round(Number.isFinite(e.to) ? e.to : (byId.get(String(e.toS))?.to ?? totalFrames)) + Number(e.toOffset ?? 0);
        return {from, to: Math.max(from, to), text: String(e.text ?? ''), tech: e.tech ?? '', w: e.w, size: e.size};
      })
      .filter((e) => e.text);
    for (let i = 0; i < list.length - 1; i++) {
      const next = list[i + 1];
      if (list[i].to < next.from - 1 && !acrossCard(list[i].to, next.from)) list[i].to = next.from - 1;
    }
    return list;
  }
  return (chapters || []).filter((c) => c.title).map((c) => ({from: c.from, to: c.to, text: c.title, tech: c.tech}));
}

/**
 * HUD 空档清单（QC 用）：既不是过场窗口、又没有任何小节名覆盖的**帧段**。
 * ⚠ 只判「该有字的地方没字」：首条之前（片头）与末条之后（片尾）本来就该空，
 *    而 fadeIn(10)/淡出(8) 的交叠窗口会造成几帧的假空档 —— 所以限制 minFrames，
 *    否则每次跑都报三条噪声，真漏了小节名反而看不出来。
 */
export function hudBlankSpans(hud, chapters, opts = {}) {
  const list = hud || [];
  const from = opts.from ?? (list.length ? Math.min(...list.map((e) => e.from)) : 1);
  const to = opts.to ?? (list.length ? Math.max(...list.map((e) => e.to)) : Infinity);
  const minFrames = opts.minFrames ?? 12;
  const windows = chapterCardWindows(chapters);
  const covered = (a, b) => list.some((e) => e.from <= a && e.to >= b);
  const marks = [from, to + 1];
  for (const e of list) marks.push(e.from, e.to + 1);
  const uniq = [...new Set(marks.filter((b) => Number.isFinite(b) && b >= from && b <= to + 1))].sort((a, b) => a - b);
  const blanks = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    const a = uniq[i];
    const b = uniq[i + 1] - 1;
    if (b < a || covered(a, b)) continue;
    // 过场窗口要从空档里**扣掉**而不是整段放过：卡片只占中间那几十帧，
    // 扣完剩下的碎片不足 minFrames 就不算漏（淡入 10 / 淡出 8 的交叠正是造出这种碎片）。
    for (const [p0, p1] of subtractIntervals(a, b, windows.map((w) => [w.from, w.to - 1]))) {
      if (p1 - p0 + 1 >= minFrames) blanks.push({from: p0, to: p1, frames: p1 - p0 + 1});
    }
  }
  return blanks;
}

/** 区间减法：[a,b] 去掉若干 [c,d]，剩下按帧连续的段。 */
export function subtractIntervals(a, b, cuts) {
  let segs = [[a, b]];
  for (const [c, d] of cuts || []) {
    const out = [];
    for (const [s, e] of segs) {
      if (d < s || c > e) {
        out.push([s, e]);
        continue;
      }
      if (c > s) out.push([s, c - 1]);
      if (d < e) out.push([d + 1, e]);
    }
    segs = out;
  }
  return segs;
}




/** 章节卡窗口：上一章内容末 +3 … 本章首 −9（长度 = 章间距 − 12 帧，样片实测约 33–44 帧），第 1 章不出卡。 */
export function chapterCardAt(chapters, N) {
  for (let i = 1; i < (chapters || []).length; i++) {
    const start = chapters[i - 1].to + 3;
    const end = Math.max(start + 1, chapters[i].from - 9);
    if (N >= start && N < end) return {chapter: chapters[i], index: i, start, end};
  }
  return null;
}

/** 全部章节卡窗口（HUD 续期与 QC 都要用它判「这段留白是过场还是漏了」）。 */
export function chapterCardWindows(chapters) {
  const out = [];
  for (let i = 1; i < (chapters || []).length; i++) {
    const start = chapters[i - 1].to + 3;
    out.push({n: chapters[i].n, from: start, to: Math.max(start + 1, chapters[i].from - 9)});
  }
  return out;
}


/**
 * 章节卡与镜头的冲突检查（分镜阶段就能判，不用等渲染）：
 * 卡片期间底下仍是上一章末拍或本章首镜头，画面在动 + 全屏压黑 = 两层都在抢注意力。
 * 返回落在卡片窗口内的镜头（应为 0 个，或该镜头本身是过场）。
 */
export function scenesUnderChapterCard(chapters, scenes, fps = 30) {
  const out = [];
  for (let i = 1; i < (chapters || []).length; i++) {
    const start = chapters[i - 1].to + 3;
    const end = Math.max(start + 1, chapters[i].from - 9);
    for (const s of scenes || []) {
      const s0 = Math.round(Number(s.start) * fps) + 1;
      const s1 = Math.round((Number(s.start) + Number(s.duration)) * fps);
      if (s1 >= start && s0 < end) out.push({scene: s.id, card: {from: start, to: end}, scene_frames: {from: s0, to: s1}});
    }
  }
  return out;
}
