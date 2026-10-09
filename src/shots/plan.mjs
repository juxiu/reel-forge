/**
 * 镜头分镜计划（纯函数层，无 JSX、不读 Remotion hooks）——
 * 把 RenderIR 的 scene + 镜头文件里的 SHOT_RECIPE 归一成**同一个渲染计划**，
 * 渲染层只认 plan，不再自己从 IR 里现取现算。
 *
 * 为什么要单独一层：
 *   1) 排版预算、节拍窗口、离场停留、运镜能否落位这些判据必须能在不渲染的情况下测（node 直接跑）；
 *   2) 之前 SemanticShots 在组件里现算 hero 文案并按字号预算「截断加省略号」，
 *      把「画面主体写了整句解说词」这个分镜缺陷藏成了画面上的省略号 —— 分镜缺陷要出声，不能兜。
 *
 * 术语：
 *   N   = 镜头内 1-based 帧号（Remotion 的 useCurrentFrame() 是 0-based，这里 +1；
 *         分镜表与字幕帧号也是 1-based，混用会整体偏一帧）
 *   len = 镜头总帧数
 *   f0  = 某元素的入场帧（相对镜头，1-based）
 */
import {BEAT, clamp01} from '../visual/easing.mjs';
import {
  cameraKeysFromMotion, cameraKeysFromPreset, presetHasParallax, PARALLAX_DEPTH,
  isCameraPreset, cameraVocabulary, staticKeys, slowPushKeys,
} from '../visual/camera.mjs';
import {EM_HEAVY, fitSize, textEm, textW} from '../visual/textfit.mjs';
import {BEAT_WINDOW, BIG_TEXT_MIN, HERO_MIN, TEXT_MIN} from '../visual/style.mjs';

// ---- 帧号与镜头时序 ----
export function shotFrames(scene, fps = 30) {
  const len = Math.max(1, Math.round((Number(scene?.duration) || 4) * fps));
  return {f0: Math.round((Number(scene?.start) || 0) * fps), len};
}

/**
 * 离场时序：末拍落位后必须停 EXIT_HOLD_MIN…MAX 帧再走。
 * 返回 {exitAt, hold}；exitAt = 离场开始帧（1-based N），hold = 实际静止帧数。
 */
export function exitPlan(len, settleFrames) {
  const want = Math.round(Number(settleFrames) || BEAT.EXIT_HOLD_MIN);
  const hold = Math.max(BEAT.EXIT_HOLD_MIN, Math.min(BEAT.EXIT_HOLD_MAX, want));
  const exitAt = Math.max(1, len - hold);
  return {exitAt, hold, len};
}

// ---- 画面文字的出身 ----
/** IR 里画面元素的文字优先级：显示文案 > 标题 > 原文。 */
const DISPLAY_KEYS = ['display', 'headline', 'short', 'label_text', 'text'];

const str = (v) => (v === undefined || v === null ? '' : String(v));

/** 元素语义类型推断（确定性，不靠模型）：先看声明 type/kind，再看文字形状。 */
export function kindOf(el) {
  const declared = str(el?.kind || el?.type).toLowerCase();
  if (declared) {
    if (/num|metric|counter|stat/.test(declared)) return 'number';
    if (/icon|symbol|glyph/.test(declared)) return 'icon';
    if (/code|snippet|json/.test(declared)) return 'code';
    if (/term|chip|pill|tag|label/.test(declared)) return 'term';
    if (/arrow|flow|link|edge|signal/.test(declared)) return 'flow';
    if (/card|box|panel|block/.test(declared)) return 'box';
  }
  const text = str(el?.display ?? el?.headline ?? el?.text).trim();
  if (text && /^[{[]/.test(text)) return 'code';
  if (text && /^[-+]?[\d,.]+\s*[%％]?$/.test(text)) return 'number';
  if (text && textEm(text) * 1 <= 6) return 'term';
  return 'box';
}

/** 图标 kind：只认 Icons.jsx 注册表里的键；分镜写了未登记的图标 → 出声（记进 issues），不当没写。 */
export const KNOWN_ICONS = ['doc', 'db', 'chunk', 'chip', 'lock', 'shield', 'key', 'link', 'person', 'rack', 'funnel', 'gauge', 'clock', 'scale', 'branch', 'wave', 'grid'];
export function iconOf(el) {
  const k = str(el?.icon ?? el?.symbol).toLowerCase();
  if (!k) return null;
  return KNOWN_ICONS.includes(k) ? k : `unknown:${k}`;
}

/** 数字主角的取值：优先 value/number 字段，其次从文字里解析第一个数。 */
export function valueOf(el) {
  const raw = el?.value ?? el?.number;
  if (raw !== undefined && raw !== null && Number.isFinite(Number(raw))) return Number(raw);
  const m = str(el?.display ?? el?.headline ?? el?.text).match(/-?\d[\d,]*(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

/**
 * 语义导演命中的关键词（matched_rules 里的词元）——这是现有 IR 里唯一**不是整句**的合法画面文案，
 * 所以它是分镜没给 display 时的兜底主角。分镜给了 display 就不用它。
 */
export function matchedTerm(scene) {
  for (const src of scene?.matched_rules || []) {
    const s = str(src).replace(/\\b/g, ' ').replace(/[\\^$.*+?()[\]{}|]/g, ' ');
    const parts = s.split('|').map((p) => p.trim()).filter(Boolean);
    const zh = parts.filter((p) => /^[㐀-䶿一-鿿]{2,6}$/.test(p));
    if (zh.length) return zh.sort((a, b) => b.length - a.length)[0];
    const en = parts.filter((p) => /^[a-zA-Z][a-zA-Z-]{2,14}$/.test(p));
    if (en.length) return en.sort((a, b) => b.length - a.length)[0];
  }
  return '';
}

/**
 * 主角文案：按**实测宽度**挑第一条装得下的候选；全部装不下就是分镜缺陷。
 * ⚠ 这里绝不省略号截断 —— 样片的画面主体是大字/大数字，不是被裁过的句子；
 *   把整句解说词塞进主角位是 storyboard 的问题，必须报 hero-overlong 让上游改文案。
 */
export function pickHero(scene, recipe, bands, logicalH = 720) {
  const els = elements(scene);
  const heroEl = els.find((e) => str(e?.id) === 'hero') || els.find((e) => str(e?.role).toLowerCase() === 'hero') || null;
  const size = heroSizeOf(scene, recipe, logicalH);
  // 主角可用宽度按构图模式给：single-hero 独占整幅；hero-plus-flow 给配角留出右侧图元带
  const full = bands ? bands.right - bands.left : 1160;
  const focus = str(scene?.composition?.focus || 'hero-plus-flow');
  const maxW = Math.round(focus === 'single-hero' ? full : full * 0.6);
  const issues = [];

  // authored 舞台镜：主角是**画出来**的（中心节点 / 面板 / 斜置平面），不是一行文案。
  // 以前这里一律去找主角文案，找不到就报 hero-overlong —— 于是组私有舞台（SC01 的中心节点那种）
  // 明明有 210px 的主角，仍被判成「主角文案装不下」，把分镜层已经解决的问题又变成一条阻断项。
  // 舞台镜的主角尺寸仍然照 hero_size / hero_scale 判（heroSizeOf 已在上面算好），
  // 缺的只是「主角得是一段文字」这个前提。
  if (recipe?.stage?.kind) {
    return {kind: 'stage', text: '', sub: str(recipe?.hero?.sub), size, maxW, issues, visual: true, minSize: Math.round(size * 0.78)};
  }

  const declared = [
    str(recipe?.hero?.display),
    str(recipe?.hero),
    str(scene?.hero?.display),
    heroTextOf(heroEl),
    str(scene?.key_terms?.[0]),
    matchedTerm(scene),
    str(recipe?.fallback_hero),
  ].filter(Boolean);

  // 纯数字主角（大数字型）
  const num = heroEl ? valueOf(heroEl) : null;
  const unit = str(heroEl?.unit ?? recipe?.hero?.unit);
  const sub = str(recipe?.hero?.sub ?? scene?.hero?.sub ?? heroEl?.sub);
  if (num !== null && str(heroEl?.kind ?? heroEl?.type).match(/num|metric/i)) {
    return {kind: 'number', value: num, text: str(heroEl?.display ?? heroEl?.text).trim() || String(num), unit, sub, size, maxW, issues};
  }

  // 字号下限：样片「先缩到 78%」，但不得缩穿大字型主角下限 BIG_TEXT_MIN(96)
  const floor = Math.max(BIG_TEXT_MIN, Math.round(size * 0.78));
  for (const cand of declared) {
    const single = cand.replace(/\s+/g, ' ').trim();
    if (textW(single, floor, EM_HEAVY) <= maxW) {
      const fitted = fitSize(single, maxW, size, floor, EM_HEAVY);
      return {kind: 'text', text: single, sub, size: fitted, minSize: floor, maxW, issues, squeezed: fitted < size};
    }
  }
  issues.push(`hero-overlong: ${scene?.id ?? scene?.scene_id ?? '?'} 主角候选 ${declared.length} 条都装不进 ${maxW}px（下限字号 ${floor}px）—— 改分镜文案，渲染层不截断`);
  const job = str(scene?.narrative_job || recipe?.narrative_job || '');
  // overlong 带数值：Repair/agent 需要知道「差多少」才能判断是改文案还是换变体，而不是重跑一遍渲染再看截图。
  return {kind: 'term', text: job || String(scene?.id ?? ''), sub, size: floor, minSize: floor, maxW, issues, overlong: {max_width: maxW, floor_size: floor, candidates: declared.length, longest_chars: Math.max(0, ...declared.map((c) => c.replace(/\s+/g, ' ').trim().length))}};
}

const heroTextOf = (el) => {
  if (!el) return '';
  for (const k of DISPLAY_KEYS) {
    const v = str(el[k]).replace(/\s+/g, ' ').trim();
    // 整句解说词（带句号且超 12 个宽度单位）不能当主角
    if (v && v.length > 1 && textEm(v) <= 12) return v;
  }
  return '';
};

/** 主角高度下限 HERO_MIN(170)，上限不超过内容区高度的一半多；hero_scale 由 Repair 写回 IR，这里必须读。 */
export function heroSizeOf(scene, recipe, logicalH = 720) {
  const base = Number(recipe?.hero_size ?? scene?.hero_size ?? 190);
  const scale = Number(scene?.hero_scale ?? recipe?.hero_scale ?? 1);
  const hi = Math.round(Math.max(HERO_MIN + 40, (logicalH - 200) * 0.52));
  return Math.round(Math.min(hi, Math.max(HERO_MIN, base * (Number.isFinite(scale) ? scale : 1))));
}

/** 画面元素清单：兼容 elements / visual.objects 两种 IR 写法。 */
export function elements(scene) {
  if (Array.isArray(scene?.elements)) return scene.elements;
  if (Array.isArray(scene?.visual?.objects)) return scene.visual.objects;
  return [];
}

/**
 * 配角清单（主角之外的东西）。
 * 整句解说词不进画面 —— 它已经在字幕带上了；这类元素降级为 subtitle-only 并记 issue。
 */
export function pickSupport(scene, recipe, hero) {
  const els = elements(scene).filter((e) => e && str(e?.id) !== 'hero' && str(e?.role).toLowerCase() !== 'hero');
  const authored = (recipe?.stage?.items || []).map(normalizeItem);
  if (authored.length) return authored;
  const out = [];
  for (const el of els) {
    const kind = kindOf(el);
    const text = str(el?.display ?? el?.headline ?? el?.label ?? el?.text).replace(/\s+/g, ' ').trim();
    if (kind === 'flow') {
      out.push({id: str(el.id) || `flow${out.length}`, kind: 'flow', icon: null, text: '', value: null, unit: str(el.unit)});
      continue;
    }
    if (!text) continue;
    if (textEm(text) > 12 && kind === 'box') {
      // 长句：不当画面元素（字幕已有），只留作分镜缺陷证据
      continue;
    }
    out.push({
      id: str(el.id) || `el${out.length}`,
      kind: kind === 'number' ? 'number' : kind === 'icon' ? 'icon' : kind === 'code' ? 'code' : 'term',
      icon: iconOf(el),
      text,
      value: kind === 'number' ? valueOf(el) : null,
      unit: str(el.unit),
      mark: str(el.mark) || null,
      props: el.props && typeof el.props === 'object' ? el.props : undefined,
      active: Boolean(el.active || el.focus),
    });
  }
  // 分镜没给配角时，按变体的语义骨架补（每种变体声明自己要几个什么件），保证信息密度不为零
  const skeleton = variantSkeleton(scene, recipe);
  const solidCount = out.filter((it) => it.kind !== 'flow').length; // flow 轨道不占配角名额
  const need = Math.max(0, (Number(recipe?.support_count ?? skeleton.count) || 0) - solidCount);
  const labels = recipe?.labels || skeleton.labels || [];
  for (let i = 0; i < need; i++) {
    const active = i === (Number(recipe?.accent_index ?? skeleton.accent ?? 0) || 0);
    const mark = variantOf(scene, recipe) === 'preference' ? (active ? 'check' : 'cross') : null;
    out.push({id: `sk${i}`, kind: 'term', icon: skeleton.icons?.[i] || null, text: str(labels[i] ?? skeleton.labels?.[i] ?? ''), value: null, unit: '', mark, active});
  }
  return out.filter((it) => it.kind === 'flow' || it.text || it.icon || it.value !== null);
}

const normalizeItem = (it) => ({
  id: str(it?.id),
  kind: str(it?.kind || 'term'),
  icon: iconOf(it),
  text: str(it?.display ?? it?.text).replace(/\s+/g, ' ').trim(),
  value: it?.value !== undefined ? Number(it.value) : null,
  unit: str(it?.unit),
  mark: str(it?.mark) || null,
  props: it?.props && typeof it.props === 'object' ? it.props : undefined,
  x: it?.x,
  y: it?.y,
  w: it?.w,
  h: it?.h,
  size: it?.size,
  f0: it?.f0,
  active: Boolean(it?.active),
  role: str(it?.role),
});

/**
 * 各变体的语义骨架：配角数量与标签位（真实文案由 IR/recipe 覆盖）。
 * ⚠ 图标只能取 ICONS 注册表里的键 —— 骨架里写没登记的键，画面会静默缺那块，所以过一遍 regIcon。
 */
const regIcon = (k) => (KNOWN_ICONS.includes(str(k).toLowerCase()) ? str(k).toLowerCase() : null);
function variantSkeleton(scene, recipe) {
  const variant = variantOf(scene, recipe);
  const S = {
    network: {count: 6, labels: ['输入', '校验', '转发', '重试', '落库', '观测'], icons: ['person', 'shield', 'link', 'clock', 'db', 'gauge']},
    split: {count: 3, labels: ['原文', '结构化', '可检验'], icons: ['doc', 'chunk', 'shield']},
    preference: {count: 3, accent: 2, labels: ['方案 A', '方案 B', '优选'], icons: ['scale', 'grid', 'shield']},
    structured: {count: 4, labels: ['header', 'payload', 'meta', 'policy'], icons: ['doc', 'doc', 'key', 'lock']},
    comparison: {count: 2, labels: ['改造前', '改造后'], icons: ['clock', 'gauge']},
    transformation: {count: 2, labels: ['BEFORE', 'AFTER'], icons: ['doc', 'shield']},
    sequence: {count: 3, labels: ['第一步', '第二步', '第三步'], icons: ['chunk', 'chip', 'db']},
    causal: {count: 3, labels: ['诱因', '机制', '结果'], icons: ['key', 'chip', 'gauge']},
    evidence: {count: 3, labels: ['主张', '来源 A', '实测 B'], icons: ['shield', 'doc', 'gauge']},
    code: {count: 3, labels: ['request', 'transform', 'verify'], icons: ['doc', 'chip', 'shield']},
    generic: {count: 3, labels: ['现象', '机制', '结论'], icons: ['wave', 'link', 'gauge']},
  };
  const s = S[variant] || S.generic;
  return {...s, icons: (s.icons || []).map(regIcon)};
}

export function variantOf(scene, recipe) {
  return str(recipe?.variant || scene?.variant || (recipe?.stage ? 'authored' : 'generic')).toLowerCase();
}

// ---- 节拍：元素入场帧 ----
/**
 * 元素入场帧必须落在**它自己那条字幕块起始帧**的 −6…+3 窗口里（样片逐帧实测），多元素按 STAGGER(2) 帧错峰。
 *
 * ⚠ 锚是「本元素对应的字幕块」，不是「整镜头的第一块字幕」。
 *    以前所有配角都锚在首块字幕上，7 件按 2 帧错峰排到 +8 —— 窗口是 −6…+3，等于第 5 件之后全部违规，
 *    而画面上表现为「解说说第三句时画面还在演第一句的东西」。正确做法是按块把元素均分下去
 *    （每块最多 4 件：10 帧窗口 / 2 帧错峰），块数不够时剩下的溢到最后一块并记 issue，
 *    因为「一块字幕配七件画面」本身是分镜缺陷，不该由渲染层兜。
 *
 * 每个元素带 `beat`（= f0 − 最近字幕块 localFrom），QC 直接按 −6…+3 判，不用重算。
 */
const BEAT_PER_BLOCK_MAX = 4; // 窗口 10 帧 ÷ 2 帧错峰
export function beatFrames(planSupport, capsOrSubFrom, len = Infinity) {
  const caps = Array.isArray(capsOrSubFrom) ? capsOrSubFrom : null;
  const blocks = caps && caps.length ? caps.map((c) => Math.max(1, c.localFrom)) : [Math.max(1, Number(capsOrSubFrom) || 1)];
  const n = planSupport.filter((it) => !(Number.isFinite(Number(it.f0)) && Number(it.f0) > 0)).length;
  const perBlock = Math.max(1, Math.min(BEAT_PER_BLOCK_MAX, Math.ceil(n / blocks.length)));
  const last = Math.max(1, len - BEAT.EXIT_HOLD_MIN);
  const fit = (v) => Math.max(1, Math.min(Math.round(v), last));
  /** beat 相对**离它最近的那块字幕**：QC 判的是「这场画面出现时，有没有一句正在说的字幕」，不是「当初排给了哪一块」。 */
  const beatOf = (f0) => {
    let best = blocks[0];
    for (const b of blocks) if (Math.abs(b - f0) < Math.abs(best - f0)) best = b;
    return f0 - best;
  };
  let bi = 0;
  let j = 0;
  return planSupport.map((it) => {
    const authored = Number(it.f0);
    if (Number.isFinite(authored) && authored > 0) {
      const f0 = fit(authored);
      return {...it, f0, beat: beatOf(f0)};
    }
    if (j >= perBlock && bi < blocks.length - 1) {
      bi += 1;
      j = 0;
    }
    const anchor = blocks[bi] + BEAT_WINDOW[0] + 2; // 窗口里取 −4 起排
    const f0 = fit(anchor + j * BEAT.STAGGER);
    const beat = beatOf(f0);
    j += 1;
    return {...it, f0, beat};
  });
}


/** 字幕块 → 镜头内 1-based 帧区间（与分镜同源，避免帧号两套系统）。 */
export function shotCaptions(captions, scene, fps = 30) {
  const {f0, len} = shotFrames(scene, fps);
  const start1 = f0 + 1;
  const end1 = f0 + len;
  return (captions || [])
    .map((c) => {
      const from = Math.round(Number(c.from ?? (Number(c.start) || 0) * fps)) + 1;
      const to = Math.round(Number(c.to ?? (Number(c.end) || 0) * fps));
      return {text: str(c.text), from, to, globalFrom: from};
    })
    .filter((c) => c.to >= start1 && c.from <= end1)
    .map((c) => ({...c, from: Math.max(c.from, start1), to: Math.min(c.to, end1 - 1), localFrom: Math.max(1, c.from - f0)}));
}

/** 首块字幕起始帧（相对镜头）：所有入场拍子以它为锚。 */
export function firstSubLocal(caps) {
  if (!caps || !caps.length) return 1;
  return Math.max(1, caps[0].localFrom);
}

// ---- 效果门控 ----
/**
 * 效果开关一律来自分镜声明，渲染层不自己加：
 *   glitch      该镜头核心术语的 12 帧闪烁（每镜头 ≤1 处）
 *   sweep       三轮紫光横扫（**全片 ≤2 处**，由 verify 层计数，这里只认声明）
 *   setPiece    登场型高光时刻（光环 + 舞台线 + 幽灵字 + 脉冲）
 */
export function effectsOf(scene, recipe) {
  const declared = new Set([...(Array.isArray(scene?.effects) ? scene.effects : []), ...(Array.isArray(recipe?.effects) ? recipe.effects : [])].map((e) => str(e).toLowerCase()));
  const fx = {...(scene?.fx || {}), ...(recipe?.fx || {})};
  const setPiece = Boolean(fx.set_piece || fx.setPiece) || declared.has('setpiece') || recipe?.highlight === true;
  return {
    glitch: Boolean(fx.glitch) || declared.has('glitch'),
    sweep: Boolean(fx.sweep) || declared.has('lightsweep') || declared.has('sweep'),
    setPiece,
    halo: Boolean(fx.halo) || declared.has('halo'),
    // ⚠ 强调脉冲是「高光时刻」的手势，不是每镜头的默认动作（每章 ≤1 处）。
    //    以前写 `fx.pulse !== false` —— 缺省即开，结果是每一镜主角都在 1→1.11→1 呼吸，
    //    最该被看出来的一句反而和其余十几句一样。现在只认显式声明或登场型高光。
    pulse: fx.pulse === true || declared.has('pulse') || setPiece,
  };
}


/** 主角打光强度：light.key_intensity（0–1），缺省 0.82。 */
export function keyLight(scene) {
  const k = Number(scene?.light?.key_intensity);
  return Number.isFinite(k) ? clamp01(k) : 0.82;
}

/**
 * 生成渲染计划。bands 为当前画幅的设计空间（design(w,h).bands），没有时按 16:9 兜底。
 * issues 非空 = 这一镜在现有分镜数据下做不到合规画面，交给 QC/Repair。
 */
export function buildPlan({scene, recipe = {}, captions = [], fps = 30, bands, logicalH = 720}) {
  const b = bands || defaultBands(logicalH);
  const {f0: globalF0, len} = shotFrames(scene, fps);
  const hero = pickHero(scene, recipe, b, logicalH);
  const supportRaw = pickSupport(scene, recipe, hero);
  const caps = shotCaptions(captions, scene, fps);
  const subFrom = firstSubLocal(caps);
  const items = beatFrames(supportRaw, caps, len);
  const exit = exitPlan(len, recipe.settle_frames ?? scene?.settle_frames);
  const motion = Array.isArray(scene?.motion) ? scene.motion : [];
  const motionCam = motion.find((m) => m && m.type === 'camera') || {};
  // 相机来源：**预设名**取 authored 声明（recipe.camera）优先，其次是 IR 的 motion.preset；
  // **位移强度**（amount）始终取 IR，因为那是 director 按解说密度算出来的、Repair 也会改写。
  // 以前只认 motion[]，44 个镜头的 camera 声明全部落空、统一渲染成慢推 —— 声明了却没人读，
  // 比没声明更糟：分镜表会让 QC 以为已经在管运镜。
  const declaredPreset = str(recipe?.camera) || str(scene?.camera) || str(motionCam.preset);
  const presetName = declaredPreset.toLowerCase();
  // 查表统一走 isCameraPreset（小写归一的集合），不写 `CAMERA_PRESETS.includes(presetName)`：
  // 表里留着 'slowPush' 这个驼峰项，归一后查不到 → 给一个本来正确的字段派整改项，
  // 而 authored 门用原样字符串查同一张表时判它合法 —— 同一份数据两处口径相反。
  const presetKnown = !presetName || isCameraPreset(presetName);
  const presetKeys = cameraKeysFromPreset(presetName, 1, len, b, {amount: Number(motionCam.amount ?? 0.06)});
  // 显式 static / none = 「这一镜不运镜」，不得退回兜底慢推，否则词表里的名字有一个是假的。
  const keys = presetKeys
    || (presetName === 'static' || presetName === 'none' ? staticKeys(1, b) : null)
    || cameraKeysFromMotion(motion, 1, len, b)
    || slowPushKeys(1, len, b);
  const parallaxOn = presetHasParallax(presetName) && keys.length > 1;
  const issues = [];
  // issues 是给人看的句子，repairs 是给 Repair 用的数据：谁违规、违规到什么值、应改成什么值。
  // 只给字符串的话，Repair 要么用正则回解引擎自己的报错文案（一改文案就失效），
  // 要么只能瞎调通用参数（hero_scale += 0.12 那种）—— 后者就是「假修复」。
  const repairs = [];
  const flag = (token, message, data = {}) => {
    issues.push(message);
    repairs.push({token, message, ...data});
  };
  // 主角层的违规（hero-overlong）在 heroOf 里就判掉了，这里统一转成结构化整改项。
  for (const message of hero?.issues || []) flag(String(message).split(':')[0].trim(), message, hero?.overlong || {});
  // 写了引擎不认识的相机名 = 会静默退回慢推。宁可出声，不要让分镜表骗 QC。
  if (presetName && !presetKnown) flag('camera-unknown-preset', `camera-unknown-preset: 「${declaredPreset}」不在运镜词表（${cameraVocabulary().join('/')}）内，本镜已退回慢推`, {declared: declaredPreset, fallback: 'slowpush'});
  // 主角也守节拍窗口：以前引擎里写死 f0=1，镜头比首句字幕早开几帧时主角会先于解说登场。
  if (hero) hero.f0 = Math.max(1, subFrom + BEAT_WINDOW[0] + 2);
  // 紫只给当前重点：同镜头 ≤1 个 active 图元，多余的降级为白/灰并出声
  let actives = 0;
  for (const it of items) {
    if (!it.active) continue;
    actives += 1;
    if (actives > 1) {
      it.active = false;
      flag('accent-overflow', `accent-overflow: ${str(it.id)} 同镜头第二个 active 图元已降级`, {item: str(it.id), action: 'clear-active'});
    }
  }
  for (const it of items) if (str(it.icon).startsWith('unknown:')) flag('icon-unregistered', `icon-unregistered: ${it.id} ${it.icon}`, {item: str(it.id), icon: str(it.icon)});
  for (const it of items) {
    if (!Number.isFinite(it.beat)) continue;
    if (it.beat < BEAT_WINDOW[0] || it.beat > BEAT_WINDOW[1]) flag('beat-window-overflow', `beat-window-overflow: ${str(it.id)} 相对最近字幕块 ${it.beat > 0 ? '+' : ''}${it.beat} 帧（限 ${BEAT_WINDOW[0]}…${BEAT_WINDOW[1]}）`, {item: str(it.id), beat: it.beat, f0: it.f0, window: BEAT_WINDOW});
  }
  if (items.length && Math.max(...items.map((it) => it.f0)) > exit.exitAt) {
    const late = items.filter((it) => it.f0 > exit.exitAt).map((it) => str(it.id));
    flag('beat-after-exit', `beat-after-exit: ${late.join('/')} 入场帧晚于离场起点 ${exit.exitAt}`, {items: late, exit_at: exit.exitAt});
  }
  // 字号下限只在「分镜显式写了字号」时判：渲染层的字号一律来自 fitSize/常量，实际显示值由 frame_metrics 从截图反查
  for (const it of items) if (Number.isFinite(it.size) && it.size < TEXT_MIN) flag('text-below-min', `text-below-min: ${it.id} ${it.size}px`, {item: str(it.id), size: it.size, min: TEXT_MIN});
  return {
    variant: variantOf(scene, recipe),
    globalF0,
    len,
    hero,
    items,
    links: (recipe.stage?.links || scene?.links || []).map((l) => ({from: str(l.from), to: str(l.to), f0: Number(l.f0) || subFrom})),
    bands: b,
    logicalH,
    caps,
    subFrom,
    exit,
    camera: {keys, preset: presetName || 'slowpush', depths: parallaxOn ? PARALLAX_DEPTH : null},
    fx: effectsOf(scene, recipe),
    key: keyLight(scene),
    focus: str(scene?.composition?.focus || 'hero-plus-flow'),
    issues,
    repairs,
    mirror: Boolean(recipe.mirror),
    authored: Boolean(recipe.stage),
  };
}

const defaultBands = (logicalH) => ({left: 60, right: 1220, hudTop: 28, hudBottom: 79, railTop: 118, railBottom: 162, contentTop: 175, contentTopNoRail: 100, contentBottom: logicalH - 100, subTop: logicalH - 83, subBottom: logicalH - 30, barTop: logicalH - 33, barBottom: logicalH});

/**
 * 渲染计划里可被 Repair 执行的整改令牌。
 *
 * ⚠ 为什么在 plan 层定义而不是让 QC 自己正则匹配 issue 文案：
 *   plan.issues 是**唯一**能在不渲染的情况下说出「这一镜为什么做不到合规画面」的地方。
 *   以前它只在内存里生成、没人读，于是「分镜声明与渲染能力不符」这类问题
 *   在 QC 报告里完全隐身，Repair 只能对着像素瞎猜。这里把它接出来。
 *
 * 每个令牌 = 一个可自动整改的动作；unknown 令牌原样进报告，交人工。
 */
/**
 * 分镜违规 → 整改动作。`auto` 的含义很具体：**这条流水线上有没有人能改它**。
 *
 * auto:true  只有两个 —— camera-unknown-preset 和 accent-overflow，因为它们的真值
 *            就在 render-IR 的 scene 里（`scene.camera` / `motion[].preset` /
 *            `elements[].active`），Repair 改 IR 就等于改画面。
 * auto:false 其余全部：节拍问题的 f0 写在镜头源文件（src/shots 下 Gn 目录里的 SCnn.jsx，
 *            recipe.stage.items）里，hero-overlong 缺的是**另写的画面文案**，
 *            icon-unregistered 要先注册图元。这些都不是 IR 字段能表达的，
 *            以前把 beat-* 标成 auto:true 是假的：没有任何代码会去改 authored f0，
 *            于是 Repair「修完」再渲染，画面一模一样，循环只会空转到重试耗尽。
 */
export const REPAIR_ACTIONS = {
  'beat-window-overflow': {fix: 'retime-authored-f0-in-shot-recipe', auto: false},
  'beat-after-exit': {fix: 'retime-authored-f0-in-shot-recipe', auto: false},
  'accent-overflow': {fix: 'clear-duplicate-active-flag-in-ir', auto: true},
  'icon-unregistered': {fix: 'register-icon-or-switch-to-text', auto: false},
  'text-below-min': {fix: 'raise-font-size-or-shorten-copy', auto: false},
  'hero-overlong': {fix: 'author-display-copy-shorter-than-narration', auto: false},
  'camera-unknown-preset': {fix: 'replace-ir-camera-preset-with-vocabulary', auto: true},
};

/** 把 plan 的结构化整改项透出给 QC/Repair；没有 repairs 时退回按 issues 文案前缀识别。 */
export function repairItems(plan) {
  const rows = plan?.repairs?.length
    ? plan.repairs
    : (plan?.issues || []).map((message) => ({token: String(message).split(':')[0].trim(), message}));
  return rows.map(({token, message, ...data}) => {
    const entry = REPAIR_ACTIONS[token] || null;
    return {token, message, fix: entry ? entry.fix : 'manual-review', auto: entry ? entry.auto : false, ...data};
  });
}
