import {isCameraPreset} from "../visual/camera.mjs";
import {REPAIR_ACTIONS} from "../shots/plan.mjs";

/** 分镜层（plan-audit）报出来的 token；它们的真值不在 render-IR 里，处理方式完全不同。 */
export const PLAN_TOKENS = new Set(Object.keys(REPAIR_ACTIONS));

/**
 * 像素层 token → 能不能只在 render-IR 上动一下。
 *
 * 这张表存在的理由很具体：以前 frame_metrics / motion_check 报出来的东西在 qc.mjs 里被压成
 * 两个类型（freeze / motion_too_low），于是「主角太小」和「停留不够」都会走同一条修复动作
 * （加大运镜幅度）—— 前者画面没救，后者把静止换成了 decorative-motion，正是基准里的反例。
 * python 侧现在给出 classification 与 repair_hint，这里必须按 token 分流，改不动的就明说改不动。
 *
 * ir:false 不是「没办法了」，是「在这里动手等于假修复」：值不在 render-IR 里（素材、幕底掩膜、
 * 镜头时长、抽帧配置），硬调 hero_scale / camera amount 只会让下一轮重渲染烧掉同样的问题。
 *
 * 这里也没有 caption_overlap：字幕带和画面内容的分离是**构造出来的**（Primitives 的 Subtitle 只占
 * bands.subTop…subBottom，frame_metrics 的取景区 qc_zone 明确排除字幕带），所以没有任何 QC 会报这个
 * token；而老实现写的 scene.caption_safe 字段渲染层从不读 —— 留着它就等于允许「改一个没人读的字段」
 * 冒充修复。真要做字幕重叠检测，得先有一个能报出该 token 的量，再谈路由。
 */
export const PIXEL_REPAIRS = {
  hero_too_small: {ir: "hero-scale", fix: "raise-hero-scale-in-ir"},
  // ⚠ 元素动作**不是**可修字段：motion[] 里 target≠stage 的项（enter/transform 的 preset 与 amount）
  //   在 IR 里有位置，但渲染层没有读者 —— plan.mjs 只 `motion.find(m => m.type === 'camera')`，
  //   入场一律走 plan 的 BEAT_WINDOW + SoftIn/drawOn。
  //   以前这条按 python 分类放行「小面积动作」，把 amount 0.04→0.075 并记成一次画面改动：
  //   重渲染后画面逐像素相同，报告却写着「修过了」，repair-cycle 白烧一轮 ——
  //   与本文件开头 scene.caption_safe 那段点名的形状一模一样，所以三个分类全部回分镜。
  //   （分类照旧进痕与报告，它决定分镜该补动作还是该剪镜头，只是不构成一次自动修复。）
  motion_too_low: {ir: false, fix: "add-or-retime-element-motion-in-storyboard"},
  freeze: {ir: false, fix: "add-verb-action-or-cut-in-storyboard"},
  hold_too_short: {ir: false, fix: "extend-hold-before-exit-or-merge-shots"},
  // 主角光晕在图元/镜头 recipe 上（Primitives 的 glow、scene.light），render-IR 场景层没有可直接
  // 验证的开关 —— 没跑过真实渲染之前，不假装「调个字段就亮了」。
  glow_missing: {ir: false, fix: "turn-on-hero-glow-in-shot-primitive"},
  purple_debris: {ir: false, fix: "replace-or-desaturate-purple-asset"},
  background_debris: {ir: false, fix: "fix-backdrop-mask-or-decoration-layer"},
  motion_sample_too_sparse: {ir: false, fix: "re-measure-with-smaller-frame-step"},
  frame_metrics_missing: {ir: false, fix: "check-timeline-and-extracted-frames"},
  // visual regression 已降级为 advisory（分数与画面质量反向相关）。放进修复循环等于
  // 每轮拿一个反向指标去推 hero_scale —— 明确写死「不修、也不升级」，别让它从后门回来。
  visual_regression_fail: {ir: false, advisory: true, fix: null},
};

/** 一条像素 issue 该怎么走。unknown 也归到「改不动」：宁可显式交人工，不要静默忽略。 */
export function pixelRoute(issue) {
  const entry = PIXEL_REPAIRS[issue?.type];
  if (!entry) return {known: false, ir: false, advisory: false, fix: null};
  if (entry.advisory) return {known: true, ir: false, advisory: true, fix: null};
  return {known: true, ir: Boolean(entry.ir), advisory: false, fix: entry.fix};
}

/**
 * 把 QC issue 分流。
 *
 * pixel：frame_metrics / motion_check / 媒体探针报的「画面不对」—— 可以在 IR 上调参数重试。
 * plan ：buildPlan 在渲染前就说出「这镜的数据做不到合规画面」—— 只有两种能在 IR 上真改，
 *        其余必须回分镜/文案。混进 pixel 那一路一起「加大 hero_scale」就是假修复：
 *        长句被放得更大更挤，重渲染一轮，问题原样还在。
 */
export function classifyIssues(issues) {
  const plan = (issues || []).filter((issue) => PLAN_TOKENS.has(issue.type));
  const pixel = (issues || []).filter((issue) => !PLAN_TOKENS.has(issue.type));
  // 像素侧再分一刀：能在 IR 上真改的，和只能回分镜/素材/重测的。
  // 不改 escalate 的原有含义（分镜层改不动的那些），调用方的计数语义保持稳定。
  const routed = pixel.map((issue) => ({issue, route: pixelRoute(issue)}));
  return {
    plan,
    pixel,
    auto: plan.filter((issue) => REPAIR_ACTIONS[issue.type]?.auto),
    escalate: plan.filter((issue) => !REPAIR_ACTIONS[issue.type]?.auto),
    pixel_auto: routed.filter((x) => x.route.ir).map((x) => x.issue),
    pixel_stuck: routed.filter((x) => !x.route.ir && !x.route.advisory).map((x) => x.issue),
  };
}

/** 分镜整改：只动 IR 里真实存在、且渲染层确实会读的字段。返回是否真的改了画面。 */
function repairPlanIssue(next, issue) {
  // issue_node 同 repairScene：整片级（layout-*）的分镜问题也会被广播到每个镜头，
  // 痕里记住问题原本挂在谁身上，报告才不会把一条问题写成 N 条。
  const trace = (patch) => {
    next.repair_trace = [...(next.repair_trace || []), {type: issue.type, issue_node: issue.node ?? null, source_ref: next.source_ref || null, ...patch}];
  };
  if (issue.type === "camera-unknown-preset") {
    let changed = false;
    const known = (value) => typeof value === "string" && isCameraPreset(value);
    if (next.camera && !known(next.camera)) {
      trace({action: "replace-camera-preset", from: next.camera, to: "push"});
      next.camera = "push";
      changed = true;
    }
    next.motion = (next.motion || []).map((item) => {
      if (item.target !== "stage" || !item.preset || known(item.preset)) return item;
      changed = true;
      trace({action: "replace-camera-preset", from: item.preset, to: "push"});
      return {...item, preset: "push"};
    });
    // 不响就说明坏预设来自镜头文件的 recipe.camera（IR 改不到），必须回分镜。
    if (!changed) trace({action: "escalate", reason: "unknown preset declared in the shot recipe, not in the IR", fix: issue.fix || null});
    return changed;
  }
  if (issue.type === "accent-overflow") {
    const hits = (next.elements || []).filter((el) => el && el.id === issue.item && (el.active || el.focus));
    if (!hits.length) {
      trace({action: "escalate", reason: "duplicate accent comes from recipe accent_index, not an IR element", fix: issue.fix || null});
      return false;
    }
    next.elements = next.elements.map((el) => (el && el.id === issue.item && (el.active || el.focus) ? {...el, active: false, focus: undefined} : el));
    trace({action: "clear-active", item: issue.item});
    return true;
  }
  trace({action: "escalate", fix: issue.fix || REPAIR_ACTIONS[issue.type]?.fix || null, reason: "not representable in render-IR; fix the storyboard copy/data"});
  return false;
}

export function repairScene(scene, issues) {
  const next = structuredClone(scene);
  for (const issue of issues) {
    if (PLAN_TOKENS.has(issue.type)) {
      repairPlanIssue(next, issue);
      continue;
    }
    const route = pixelRoute(issue);
    // issue_node 记进痕：整片级问题（node="layout-16x9"）会被广播到每个镜头，
    // 只按镜头去重的话，一条全局问题会被报成 N 条「都没人修」。
    const trace = (patch) => {
      next.repair_trace = [...(next.repair_trace || []), {type: issue.type, issue_node: issue.node ?? null, source_ref: next.source_ref || null, ...patch}];
    };
    // advisory 指标连留痕都不写：写了就像「处理过了」，而它其实一步都没做。
    if (route.advisory) continue;

    if (route.fix === "raise-hero-scale-in-ir") {
      next.hero_scale = Math.min(1.7, Number(next.hero_scale || 1) + 0.18);
      trace({action: "raise-hero-scale", to: next.hero_scale});
      continue;
    }
    // 其余（含 unknown token、含 motion_too_low 的三个分类）一律显式承认改不动，
    // 并把 python 侧的 repair_hint 与 classification 原样带出去 —— 分镜要看这两样才知道补什么。
    trace({action: "escalate", reason: issue.repair_hint || null, classification: issue.classification ?? null, fix: route.fix, known: route.known});
  }
  return next;
}

function ratioForRenderIR(renderIR) {
  if (Number(renderIR.width) > Number(renderIR.height)) return "16x9";
  if (Number(renderIR.height) > Number(renderIR.width)) return "9x16";
  return null;
}

function applicableIssues(renderIR, issues) {
  const ratio = ratioForRenderIR(renderIR);
  return (issues || []).filter((issue) => !issue.ratio || issue.ratio === ratio);
}

export function repairRenderIR(renderIR, issues) {
  const byNode = new Map();
  for (const issue of applicableIssues(renderIR, issues)) {
    if (!issue.node) continue;
    if (!byNode.has(issue.node)) byNode.set(issue.node, []);
    byNode.get(issue.node).push(issue);
  }

  const ratio = ratioForRenderIR(renderIR);
  const layoutIssues = byNode.get("layout-" + ratio) || [];
  const layoutTypes = new Set(layoutIssues.map((issue) => issue.type));

  return {
    ...renderIR,
    scenes: renderIR.scenes.map((scene) => {
      const scoped = byNode.get(scene.id) || [];
      const fallback = layoutTypes.size ? [...layoutIssues] : [];
      return scoped.length || fallback.length
        ? repairScene(scene, [...scoped, ...fallback])
        : scene;
    }),
  };
}

const withoutTrace = (scene) => {
  const {repair_trace, ...rest} = scene;
  return rest;
};

/**
 * 修复 + 分类汇报。
 *
 * changed_nodes        ：IR 里**画面相关字段**真的变了的镜头（去掉 repair_trace 再比）。
 * trace_only_nodes     ：只多了一条留痕、画面一个像素都不会变的镜头。
 * auto_fixes           ：分镜层里 IR 能自修的那几条。
 * pixel_fixes          ：像素层里 IR 真改了的那几条 token。
 * escalations          ：这一轮**没人能自动修**的问题 —— 分镜层改不动的 + 像素层改不动的，
 *                        带 layer 区分是回分镜还是回素材/重测，带 hint 把 python 的修复方向原样送出。
 *
 * 有这个区分，scripts/repair.mjs 才能做到「本轮没有任何画面相关改动时不再重渲染」。
 * 以前它只判 changed_nodes.length，而 changed_nodes 是整段 JSON 比对，
 * 只要写进一条 repair_trace 就算「修过了」，于是循环会拿同一份画面再渲一遍。
 */
export function repairRenderIRWithReport(renderIR, issues) {
  const ir = repairRenderIR(renderIR, issues);
  const changedNodes = [];
  const traceOnly = [];
  const stuck = new Map();
  const fixed = new Map();
  ir.scenes.forEach((scene, index) => {
    const before = renderIR.scenes[index];
    if (JSON.stringify(withoutTrace(before)) !== JSON.stringify(withoutTrace(scene))) changedNodes.push(scene.id);
    else if ((scene.repair_trace || []).length !== (before.repair_trace || []).length) traceOnly.push(scene.id);
    // 只算本轮新增的痕。repair_trace 是累积写回 IR 的，上一轮的 escalate 条目还在场景里；
    // 全量扫的话，一条早已回分镜改过的问题会被每一轮重新报成「没人修」。
    const prior = (before.repair_trace || []).length;
    for (const entry of (scene.repair_trace || []).slice(prior)) {
      // 问题挂在整片上时用整片的节点名：scene.id 是广播出来的落点，不是问题的归属。
      const node = entry.issue_node || scene.id;
      const key = node + "/" + entry.type;
      if (entry.action === "escalate") {
        if (!stuck.has(key)) {
          stuck.set(key, {
            node,
            type: entry.type,
            fix: entry.fix || REPAIR_ACTIONS[entry.type]?.fix || null,
            detail: entry.detail || null,
            hint: entry.reason || null,
            // 分类跟着 escalate 一路到报告：motion_check 分出的「真静 / 小面积动作 / 有动作」
            // 对应分镜里三件不同的活（补动作、加大幅度、剪镜头）。丢了它，回分镜的人只能重跑一遍测量。
            classification: entry.classification ?? null,
            layer: PLAN_TOKENS.has(entry.type) ? "plan" : "pixel",
          });
        }
      } else if (!fixed.has(key)) {
        fixed.set(key, {node, type: entry.type, action: entry.action});
      }
    }
  });
  const {auto, escalate} = classifyIssues(issues);
  // 表格（PIXEL_REPAIRS / REPAIR_ACTIONS）只回答「这类问题原则上能不能在 IR 上动手」；
  // 这一轮到底有没有人接手，看 repairScene 留下的痕。以前 escalations 由表格直接算，
  // 于是「小面积动作」永远算自动可修 —— 哪怕镜头里根本没有可加大的元素动作、
  // 画面一个字节都没变，报告照样写着已修。
  const escalations = [...stuck.values(), ...escalate
    .filter((issue) => !stuck.has(issue.node + "/" + issue.type))
    .map((issue) => ({
      node: issue.node,
      type: issue.type,
      fix: issue.fix || REPAIR_ACTIONS[issue.type]?.fix || pixelRoute(issue).fix || null,
      detail: issue.detail || null,
      hint: issue.repair_hint || null,
      layer: "plan",
    }))];
  return {
    ir,
    changed_nodes: changedNodes,
    trace_only_nodes: traceOnly,
    auto_fixes: auto,
    // 去重：同一个 token 命中多个镜头时，这里回答的是「哪类问题真被 IR 改了」，
    // 具体改了哪些镜头看 changed_nodes。
    pixel_fixes: [...new Set([...fixed.values()].map((entry) => entry.type))],
    escalations,
  };
}

export function makeRepairPlan(report, maxRetries = 2) {
  const {plan, pixel, auto, escalate, pixel_auto: pixelAuto, pixel_stuck: pixelStuck} = classifyIssues(report?.issues);
  return {
    maxRetries,
    status: report?.status === "PASS" ? "not-needed" : "pending",
    issues: report?.issues || [],
    nodes: [...new Set((report?.issues || []).map((issue) => issue.node).filter(Boolean))],
    // 分镜/像素各自能修几条要分开说：只有值得再渲一轮的才该触发 rerender，
    // 而「值得再渲」= 有 IR 真改动，不等于「有 issue」。
    breakdown: {
      plan: plan.length,
      pixel: pixel.length,
      auto_fixable: auto.length,
      needs_storyboard: escalate.length,
      pixel_fixable: pixelAuto.length,
      needs_asset_or_storyboard: pixelStuck.length,
    },
    escalations: [...escalate, ...pixelStuck].map((issue) => ({
      node: issue.node,
      type: issue.type,
      fix: issue.fix || REPAIR_ACTIONS[issue.type]?.fix || pixelRoute(issue).fix || null,
      detail: issue.detail || null,
      hint: issue.repair_hint || null,
      layer: PLAN_TOKENS.has(issue.type) ? "plan" : "pixel",
    })),
  };
}
