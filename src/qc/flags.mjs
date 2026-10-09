/**
 * QC 报告（frame_metrics.py / motion_check.py）→ 可路由 issue 的映射层。
 *
 * 单独立一个模块而不是写在 scripts/qc.mjs 里，原因有两个：
 *  1. 这张映射表决定 Repair 往哪个方向动手，是判据级逻辑，该能被单独测；
 *  2. 写在 qc.mjs 里就只能靠「跑一次真实渲染」才能验证，而渲染在这个仓库里经常跑不了 ——
 *     于是映射错了也永远没人知道（历史上它把一切都压成 freeze / motion_too_low）。
 *
 * token 的名字就是修复路由的键，两侧共用：Python 侧在 scripts/frame_metrics.py、
 * scripts/motion_check.py 里 flags.append({"token": ...})，这里一一对应，
 * src/repair/engine.mjs 的 PIXEL_REPAIRS 必须覆盖同一集合（有测试守着）。
 */

/** 与 Python 侧一致：只有 high/medium 阻断；low 是警告，进报告但不进修复循环。 */
export const BLOCKING_SEVERITIES = new Set(["high", "medium"]);

export const FLAG_TOKENS = [
  "hero_too_small",
  "glow_missing",
  "purple_debris",
  "background_debris",
  "freeze",
  "frame_metrics_missing",
  "motion_too_low",
  "hold_too_short",
  "motion_sample_too_sparse",
];

const row = (scene, flag, ratio) => ({
  node: scene.id,
  type: flag.token,
  ratio,
  severity: flag.severity || null,
  detail: flag.detail || null,
  // classification / repair_hint 由 motion_check 给出（真静 / 小面积动作 / 有动作）。
  // 丢掉它们就等于把「该改分镜」的问题送去「加大运镜」。
  classification: flag.classification || null,
  repair_hint: flag.repair_hint || null,
});

/**
 * 把一份 QC 报告摊成 {issues, warnings}。
 *
 * status 是 Python 侧算好的（scene.status / summary.status），这里只翻译、不重判：
 * 两处各判一次迟早会给出两个不同的结论。
 */
export function reportToIssues(report, ratio, source) {
  const issues = [];
  const warnings = [];
  const scenes = report?.summary?.scenes || [];
  for (const scene of scenes) {
    if (!scene || scene.status === "PASS") continue;
    const flags = scene.flags || [];
    // FAIL 却不带任何 flag：只剩一个状态字，没东西可路由。显式造一条 *_fail，别静默丢。
    if (!flags.length) {
      if (scene.status === "FAIL") issues.push({node: scene.id, type: source + "_fail", ratio});
      continue;
    }
    for (const flag of flags) {
      const blocking = scene.status === "FAIL" && BLOCKING_SEVERITIES.has(flag.severity);
      (blocking ? issues : warnings).push(row(scene, flag, ratio));
    }
  }
  // 整体 FAIL 但没有任何镜头被判 FAIL（例如解码错误）：问题真实存在，得有一条能看的 issue。
  if (report?.summary?.status === "FAIL" && !scenes.some((scene) => scene.status === "FAIL")) {
    issues.push({node: "layout-" + ratio, type: source + "_fail", ratio});
  }
  return {issues, warnings};
}
