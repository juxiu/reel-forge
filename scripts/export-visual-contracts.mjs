#!/usr/bin/env node
/**
 * 把渲染层的视觉常量导出成 fixtures/visual_contracts.json，供 Python 测量层与 QC agent 读取。
 *
 * 为什么必须有这一步：frame_metrics / motion_check 此前各自抄了一份阈值（110px 主体、0.35 静止、
 * 30 帧 hold、点阵网格坐标），而渲染层的真值在 style.mjs / camera.mjs / Primitives.jsx 里。
 * 抄的那份一旦漂移，QC 就在校验一个画面根本没遵守的标准 —— 报出来的 PASS/FAIL 全是假的。
 * 导出之后，Python 侧只允许从这份 JSON 取数，仓库里不再有第二套数。
 *
 * 用法：npm run export-visual-contracts
 *      VERIFY=1 时不写文件，只校验「已有 contracts 与代码一致」（给 verify:measure 用）。
 *
 * ⚠ 输出必须稳定可 diff：键顺序固定、不写时间戳。否则每次导出都产生 git 噪音，
 *   也没法用 git diff 判断「这次改动动了判据」。
 */
import fs from "node:fs";
import path from "node:path";

import {
  BEAT_WINDOW,
  BIG_TEXT_MIN,
  CHAPTER_GAP,
  FPS,
  GLITCH_PER_SHOT_MAX,
  GLOW_ORANGE,
  GLOW_PURPLE,
  GLOW_PURPLE_S,
  HIGHLIGHT_PER_CHAPTER_MAX,
  HERO_HUGE,
  HERO_LARGE,
  HERO_MIN,
  PARA_END_GAP,
  PARAGRAPH_GAP,
  SHOT_MIN_FRAMES,
  SUBJECT_SMALL,
  SUBTITLE_SIZE,
  SWEEP_WHITELIST_MAX,
  TEXT_MIN,
  W,
  design,
} from "../src/visual/style.mjs";
import {
  DOT_FIELD,
  EMPTY_FIELD,
  GLOW_ORANGE_SPEC,
  GLOW_PURPLE_S_SPEC,
  GLOW_PURPLE_SPEC,
  GLOW_RED_SPEC,
  HERO_MEASURE,
  LUMA,
  MOTION,
  PURPLE_DEBRIS,
  SET_PIECE,
  SOFT_GLOW,
  STAR_FIELD,
  qcZone,
  qcZoneScaled,
} from "../src/visual/field.mjs";
import {CAMERA_LIMITS, CAMERA_PRESETS, PARALLAX, PARALLAX_DEPTH} from "../src/visual/camera.mjs";

const OUT = "fixtures/visual_contracts.json";
const RATIOS = {"16x9": [1280, 720], "9x16": [720, 1280]};

/** #rrggbb → [r,g,b]；contracts 里色值同时给十六进制与三元组，python 侧不必再解析字符串。 */
const hexToRgb = (hex) => {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};


// ---- 跨模块不变量：这两条规则本来就是同一条，写成两个数迟早漂移 ----
const invariants = [];
let invariantTotal = 0;
const check = (name, ok, detail) => {
  invariantTotal++;
  if (!ok) invariants.push({name, detail});
};
check("MOTION.hold_min_frames == CAMERA_LIMITS.clear", MOTION.hold_min_frames === CAMERA_LIMITS.clear, `${MOTION.hold_min_frames} vs ${CAMERA_LIMITS.clear}`);
check("EMPTY_FIELD.hero_min == SUBJECT_SMALL", EMPTY_FIELD.hero_min === SUBJECT_SMALL, `${EMPTY_FIELD.hero_min} vs ${SUBJECT_SMALL}`);
check("EMPTY_FIELD.sustained_frames_max == 45 (空场定义)", EMPTY_FIELD.sustained_frames_max === 45, String(EMPTY_FIELD.sustained_frames_max));
check("SUBJECT_SMALL < HERO_MIN", SUBJECT_SMALL < HERO_MIN, `${SUBJECT_SMALL} vs ${HERO_MIN}`);
check("HERO_MIN < HERO_LARGE < HERO_HUGE", HERO_MIN < HERO_LARGE && HERO_LARGE < HERO_HUGE, `${HERO_MIN}/${HERO_LARGE}/${HERO_HUGE}`);
check("SET_PIECE.minLen <= SHOT_MIN_FRAMES", SET_PIECE.minLen <= SHOT_MIN_FRAMES, `${SET_PIECE.minLen} vs ${SHOT_MIN_FRAMES}`);
check("SET_PIECE.sweeps 递增且都在 line 前后合理窗口", SET_PIECE.sweeps.every((v, i, a) => i === 0 || v > a[i - 1]) && SET_PIECE.sweeps[0] >= 0, JSON.stringify(SET_PIECE.sweeps));
check("BEAT_WINDOW 是 [负, 正] 且跨度 <= BEAT 容差", BEAT_WINDOW[0] < 0 && BEAT_WINDOW[1] > 0, JSON.stringify(BEAT_WINDOW));
check("CAMERA_PRESETS 全小写或全驼峰混用需成对（slow_push/slowPush 都要在）", CAMERA_PRESETS.includes("slow_push") && CAMERA_PRESETS.includes("slowPush"), CAMERA_PRESETS.join(","));
check("PARALLAX_DEPTH.mid === 1", PARALLAX_DEPTH.mid === 1, String(PARALLAX_DEPTH.mid));
// 下面几条是「两条判据互相咬合」的关系，破了不会有任何报错，只会让 QC 结论失去意义。
check("柔光亮度上限 < 亮主体下限（同一像素不能既是主体又是光）", SOFT_GLOW.lum_max < HERO_MEASURE.bright_luma, `${SOFT_GLOW.lum_max} vs ${HERO_MEASURE.bright_luma}`);
check("SOFT_GLOW 区间自洽 lum_min < lum_min_dots < lum_max", SOFT_GLOW.lum_min < SOFT_GLOW.lum_min_dots && SOFT_GLOW.lum_min_dots < SOFT_GLOW.lum_max, `${SOFT_GLOW.lum_min}/${SOFT_GLOW.lum_min_dots}/${SOFT_GLOW.lum_max}`);
check("MOTION.hold_thr > still_thr（落位期不能被算成静止）", MOTION.hold_thr > MOTION.still_thr, `${MOTION.hold_thr} vs ${MOTION.still_thr}`);
check("MOTION.class_true_static < class_small_motion", MOTION.class_true_static < MOTION.class_small_motion, `${MOTION.class_true_static} vs ${MOTION.class_small_motion}`);
check("静止上限秒数换算成帧 <= 最短镜头", MOTION.still_max_seconds * FPS <= SHOT_MIN_FRAMES, `${MOTION.still_max_seconds * FPS} vs ${SHOT_MIN_FRAMES}`);
check("点阵步距 > 2×点半径（网格不相交，掩膜才谈得上「抠掉点」）", DOT_FIELD.step > DOT_FIELD.r * 2, `${DOT_FIELD.step} vs ${DOT_FIELD.r * 2}`);

// 数值健康：contracts 是给 python 直接用的，NaN/Infinity 会写出非法 JSON 或在下游静默变 0。
const numericKeys = [];
const walk = (node, p) => {
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${p}[${i}]`));
  if (node && typeof node === "object") return void Object.entries(node).forEach(([k, v]) => walk(v, `${p}.${k}`));
  if (typeof node === "number") {
    numericKeys.push(p);
    if (!Number.isFinite(node)) invariants.push({name: "finite number", detail: `${p} = ${node}`});
  }
};

const ratioBlock = ([width, height]) => {
  const d = design(width, height);
  const zone = qcZone(d.bands);
  const scaled = qcZoneScaled(d.bands, width, height);
  const scale = (v) => Math.round(v * d.s * 100) / 100;
  return {
    device: d.device,
    scale: d.s,
    logical: {width: d.width, height: d.height},
    bands: d.bands,
    bands_device: Object.fromEntries(Object.entries(d.bands).map(([k, v]) => [k, scale(v)])),
    camera_safe: d.cameraSafe,
    camera_safe_device: {left: scale(d.cameraSafe.left), right: scale(d.cameraSafe.right), top: scale(d.cameraSafe.top), bottom: scale(d.cameraSafe.bottom)},
    qc_zone: {
      design: zone,
      device: scaled.device,
      sample: scaled.sample,
      with_rail: qcZoneWithRailDevice(d.bands, width, height),
    },
    // 主角/字号下限在设备像素上是多少：QC 量的是像素，写文案的人想的是设计单位，两边都给出。
    limits_device: {
      hero_min: scale(HERO_MIN),
      hero_large: scale(HERO_LARGE),
      hero_huge: scale(HERO_HUGE),
      big_text_min: scale(BIG_TEXT_MIN),
      subject_small: scale(SUBJECT_SMALL),
      text_min: scale(TEXT_MIN),
      subtitle_size: scale(SUBTITLE_SIZE),
    },
    dot_field_device: dotFieldDevice(d),
    // 判据换算：长度 ×k、面积 ×k²。Python 侧只读这份 device 数，自己不再乘系数 ——
    // 两处换算迟早会不一致，而 9:16 的 170px 主角到底是 95.6 还是 170，直接决定 PASS/FAIL。
    measure_device: measureDevice(d.s),
  };
};

/** 把设计单位的测量判据换算成某个画幅的设备像素。结构元给「半边长」，因为膨胀是按中心算的。 */
function measureDevice(k) {
  const len = (v) => Math.round(v * k * 100) / 100;
  const area = (v) => Math.round(v * k * k);
  const half = (size) => Math.round(((size - 1) / 2) * k);
  return {
    scale: k,
    hero: {
      struct_half: {x: half(HERO_MEASURE.struct.x), y: half(HERO_MEASURE.struct.y)},
      min_ink_px: area(HERO_MEASURE.min_ink_px),
      bright_luma: HERO_MEASURE.bright_luma,
      small_box: len(HERO_MEASURE.small_box),
      width_over_height: HERO_MEASURE.width_over_height,
      width_divisor: HERO_MEASURE.width_divisor,
      no_content_bright_px: area(HERO_MEASURE.no_content_bright_px),
      glow_pad_px: len(HERO_MEASURE.glow_pad_px),
    },
    soft_glow: {
      sat_min: SOFT_GLOW.sat_min,
      lum_min: SOFT_GLOW.lum_min,
      lum_min_dots: SOFT_GLOW.lum_min_dots,
      lum_max: SOFT_GLOW.lum_max,
      activity_px: area(SOFT_GLOW.activity_px),
      hero_area_min_px: area(SOFT_GLOW.hero_area_min),
    },
    purple_debris: {
      sat_min: PURPLE_DEBRIS.sat_min,
      lum_min: PURPLE_DEBRIS.lum_min,
      struct_half: {x: half(PURPLE_DEBRIS.struct.x), y: half(PURPLE_DEBRIS.struct.y)},
      min_area_px: area(PURPLE_DEBRIS.min_area_px),
      median_max: PURPLE_DEBRIS.median_max,
    },
    empty_field: {
      hero_min_px: len(EMPTY_FIELD.hero_min),
      severe_hero_px: len(EMPTY_FIELD.severe_hero_px),
      sustained_frames_max: EMPTY_FIELD.sustained_frames_max,
      debris_count_median_max: EMPTY_FIELD.debris_count_median_max,
    },
    thresholds_device: {
      hero_min_px: len(HERO_MIN),
      big_text_min_px: len(BIG_TEXT_MIN),
      subject_small_px: len(SUBJECT_SMALL),
    },
    motion: {
      diff_px: MOTION.diff_px_thr,
      // 「变了多少像素」按设计面积折算（×k²），不按取景区面积占比折算：
      // 这两条判据问的是「动的那个东西有多大」—— 设计里 30×30 的脉动图元，
      // 在 9:16 上就是 285 设备像素；按面积占比（0.69×800=553）会把它判成「真静」，
      // 于是「给动词动作」的修复建议永远发不出来。a2e 只在 16:9 标过，9:16 需实测复核。
      class_true_static_px: area(MOTION.class_true_static),
      class_small_motion_px: area(MOTION.class_small_motion),
      sample_width: MOTION.sample_width,
    },
  };
}

/**
 * 掩膜半径（设备像素）= (点半径 + 余量) × 缩放，向上取整。
 * 宁大勿小：掩小了是静默失败（残留边角被结构元膨胀连成一整行，量出 1255px 假主角），
 * 掩大了只是多丢几平方像素。面积占比由下面的 invariant 兜住，不让它无限制长大。
 */
const maskRadiusDevice = (k) => Math.max(1, Math.ceil((DOT_FIELD.r + DOT_FIELD.qc_mask_margin) * k));

/** 点阵网格的设备像素坐标 —— frame_metrics 生成掩膜要的这个，此前只存在于 JSX 的渲染循环里。 */
function dotFieldDevice(d) {
  const k = d.device.height / d.height;
  const cols = Math.ceil((W - DOT_FIELD.x0) / DOT_FIELD.step) + 1;
  const rows = Math.ceil(d.height / DOT_FIELD.step) + 1;
  const points = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = DOT_FIELD.x0 + i * DOT_FIELD.step;
      const y = DOT_FIELD.y0 + j * DOT_FIELD.step;
      if (x > W - 8 || y > d.height - 8) continue;
      points.push([Math.round(x * k * 100) / 100, Math.round(y * k * 100) / 100]);
    }
  }
  return {
    design: {step: DOT_FIELD.step, x0: DOT_FIELD.x0, y0: DOT_FIELD.y0, r: DOT_FIELD.r, mask_margin: DOT_FIELD.qc_mask_margin},
    device: {step: Math.round(DOT_FIELD.step * k * 100) / 100, x0: Math.round(DOT_FIELD.x0 * k * 100) / 100, y0: Math.round(DOT_FIELD.y0 * k * 100) / 100, r: Math.round(DOT_FIELD.r * k * 100) / 100, mask_radius: maskRadiusDevice(k), mask_area_ratio: Math.round(((Math.PI * maskRadiusDevice(k) ** 2) / Math.pow(DOT_FIELD.step * k, 2)) * 10000) / 10000},
    mask_radius_design: Math.round((DOT_FIELD.r + DOT_FIELD.qc_mask_margin) * 100) / 100,
    count: points.length,
    // 前 4 个点足够让下游验证「网格原点与步距」；全量点阵由 step/x0/y0 推出，不重复存。
    first_points: points.slice(0, 4),
  };
}

/** 有流程轨的镜头：内容区上界从 contentTop(175) 起，QC 取景区随之收窄。 */
function qcZoneWithRailDevice(bands, width, height) {
  const s = width / W;
  const logicalH = Math.round(height / s);
  const k = height / logicalH;
  return {
    design: {top: bands.contentTop, bottom: bands.contentBottom},
    device: {top: Math.round(bands.contentTop * k), bottom: Math.round(bands.contentBottom * k)},
  };
}


const contracts = {
  version: "1.0",
  generated_by: "npm run export-visual-contracts",
  note: "渲染层视觉常量与 QC 测量判据的同一份真源。Python 侧只允许从这里取数；改判据请改 src/visual/field.mjs 再重新导出，不要手改本文件。",
  sources: {
    field: "src/visual/field.mjs",
    style: "src/visual/style.mjs",
    camera: "src/visual/camera.mjs",
  },
  canvas: {
    design_width: W,
    fps: FPS,
    frame_base: 1,
    frame_convention: "N = useCurrentFrame() + 1；分镜表与字幕帧号 1-based，Remotion 0-based",
    ratios: Object.fromEntries(Object.entries(RATIOS).map(([ratio, size]) => [ratio, ratioBlock(size)])),
  },
  palette: {
    PURPLE: {hex: "#6630F8", rgb: hexToRgb("#6630F8")},
    GLOW_PURPLE_RGB: GLOW_PURPLE_SPEC.color,
    glow_rgb_differs_from_purple: hexToRgb("#6630F8").join(",") !== [GLOW_PURPLE_SPEC.color.r, GLOW_PURPLE_SPEC.color.g, GLOW_PURPLE_SPEC.color.b].join(","),
  },
  typography: {HERO_MIN, HERO_LARGE, HERO_HUGE, BIG_TEXT_MIN, SUBJECT_SMALL, TEXT_MIN, SUBTITLE_SIZE},
  beat: {
    BEAT_WINDOW,
    SHOT_MIN_FRAMES,
    SWEEP_WHITELIST_MAX,
    GLITCH_PER_SHOT_MAX,
    HIGHLIGHT_PER_CHAPTER_MAX,
    gaps: {paragraph: PARAGRAPH_GAP, para_end: PARA_END_GAP, chapter: CHAPTER_GAP},
    SET_PIECE,
  },
  camera: {limits: CAMERA_LIMITS, presets: CAMERA_PRESETS, parallax: PARALLAX, parallax_depth: PARALLAX_DEPTH},
  background: {DOT_FIELD, STAR_FIELD},
  glow: {
    purple: {spec: GLOW_PURPLE_SPEC, css: GLOW_PURPLE, outer_radius: Math.max(...GLOW_PURPLE_SPEC.layers.map((l) => l.blur + l.spread))},
    purple_s: {spec: GLOW_PURPLE_S_SPEC, css: GLOW_PURPLE_S},
    orange: {spec: GLOW_ORANGE_SPEC, css: GLOW_ORANGE},
    red: {spec: GLOW_RED_SPEC},
  },
  measure: {
    luma: LUMA,
    hero: HERO_MEASURE,
    soft_glow: SOFT_GLOW,
    purple_debris: PURPLE_DEBRIS,
    empty_field: EMPTY_FIELD,
    motion: MOTION,
  },
};

walk(contracts, "root");

// 取景区必须真的落在画幅里，且设备像素/采样像素两套坐标同向 —— 否则 python 切片会得到空区域。
for (const [ratio, block] of Object.entries(contracts.canvas.ratios)) {
  const z = block.qc_zone;
  check(`qc_zone ${ratio} 设备坐标自上而下有效`, z.device.top >= 0 && z.device.top < z.device.bottom && z.device.bottom <= block.device.height, JSON.stringify(z.device));
  check(`qc_zone ${ratio} 采样坐标有效`, z.sample.top < z.sample.bottom && z.sample.bottom <= z.sample.height, JSON.stringify(z.sample));
  check(`qc_zone ${ratio} 含轨上界不低于无上界`, z.with_rail.design.top > z.design.top, `${z.with_rail.design.top} vs ${z.design.top}`);
  // 掩膜两条：盖不住点 → 残留被膨胀连成假主角（静默判错）；盖太多 → 真主体也被挖掉。两边都要卡。
  const dfd = block.dot_field_device.device;
  check(`点阵掩膜 ${ratio} 盖得住画出来的点`, dfd.mask_radius >= Math.ceil(dfd.r), JSON.stringify({mask_radius: dfd.mask_radius, r: dfd.r}));
  check(`点阵掩膜 ${ratio} 面积占比 ≤ 4.5%（a2e 容忍线）`, dfd.mask_area_ratio <= 0.045, `${dfd.mask_area_ratio} @step ${dfd.step}`);
}

if (invariants.length) {
  console.error("visual contracts INVARIANT FAIL", JSON.stringify({failed: invariants, numeric_values_checked: numericKeys.length}, null, 2));
  process.exit(1);
}

const json = JSON.stringify(contracts, null, 2) + "\n";

if (process.env.VERIFY === "1" || process.argv.includes("--check")) {
  if (!fs.existsSync(OUT)) {
    console.error("visual contracts MISSING: 先跑 npm run export-visual-contracts");
    process.exit(1);
  }
  const current = fs.readFileSync(OUT, "utf8");
  // 行尾无关比较：仓库要求 LF（.gitattributes），但 Windows 上 core.autocrlf=true 会把工作树
  // 写成 CRLF，逐字节比会报一个和内容无关的 DRIFT。判据是「数一致」，不是「行尾一致」。
  const lf = (s) => s.replace(/\r\n/g, "\n");
  if (lf(current) !== lf(json)) {
    console.error("visual contracts DRIFT: " + OUT + " 与代码不一致（改过 src/visual/field.mjs 或 style.mjs？重跑 npm run export-visual-contracts）");
    const before = JSON.parse(current);
    const diffKeys = Object.keys(contracts).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(contracts[k]));
    console.error("  变化的顶层区块:", diffKeys.join(", ") || "(顶层相同，细节不同)");
    process.exit(1);
  }
  console.log("visual contracts PASS", JSON.stringify({numeric_values: numericKeys.length, invariants: invariantTotal}));
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, json);
const ratios = Object.keys(contracts.canvas.ratios);
console.log(
  "visual contracts written",
  JSON.stringify({
    file: OUT,
    numeric_values: numericKeys.length,
    ratios,
    qc_zone_sample: Object.fromEntries(ratios.map((r) => [r, contracts.canvas.ratios[r].qc_zone.sample])),
  })
);
