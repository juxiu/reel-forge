import fs from 'node:fs';
import path from 'node:path';

/**
 * 渲染基座回归（纯函数层，node 直接跑，不需要 node_modules）。
 *
 * 这里断言的是**能被机器判的画法规则**，也就是 reference/motion-vocabulary.md 与
 * docs/VISUAL_GRAMMAR.md 里那些量化条款的可执行版本：节拍窗口、离场停留、运镜能否在末拍前停住、
 * 主角字号下限、一镜一紫、图标必须注册、帧号 1-based、确定性。
 *
 * ⚠ 这些判据以前只写在文档里，靠渲染完肉眼比对——所以「主角比解说早登场」「每一镜都在呼吸式缩放」
 *    这种改动没人拦得住。文档说的规则和代码执行的规则必须是同一份，这里就是那份代码。
 * ⚠ 它同样**不覆盖 JSX**：排版坐标怎么落到屏幕上、字体是否真的装上，仍要等能渲染的那一轮。
 */

const fails = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
};
const eq = (a, b, msg) => ok(a === b, `${msg}（期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}）`);
const eqJson = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}（期望 ${JSON.stringify(b)}，实得 ${JSON.stringify(a)}）`);

const {design, BEAT_WINDOW, TEXT_MIN, BIG_TEXT_MIN, HERO_MIN, SWEEP_WHITELIST_MAX, GLITCH_PER_SHOT_MAX, HIGHLIGHT_PER_CHAPTER_MAX} = await import('../src/visual/style.mjs');
const {BEAT} = await import('../src/visual/easing.mjs');
const {CAMERA_LIMITS, CAMERA, camAt, cameraKeysFromMotion, cameraSettlesBeforeExit, slowPushKeys, camCenterY, isCameraPreset, cameraVocabulary, staticKeys} = await import('../src/visual/camera.mjs');
const {buildPlan, shotFrames, exitPlan, beatFrames, KNOWN_ICONS} = await import('../src/shots/plan.mjs');

// ---- 1) 设计空间与样片像素对齐 ----
const wide = design(1280, 720);
eq(wide.s, 1, '16:9 缩放系数应为 1（逻辑像素=实际像素）');
eq(wide.height, 720, '16:9 逻辑高度');
eq(wide.bands.subTop, 637, '16:9 字幕带上沿 y637');
eq(wide.bands.subBottom, 690, '16:9 字幕带下沿 y690');
eq(wide.bands.barTop, 687, '16:9 进度条带 y687');
eq(wide.bands.contentBottom, 620, '内容区下边 = subTop − 17');
eqJson([wide.bands.left, wide.bands.right], [60, 1220], '左右安全区 x60–1220');

const tall = design(720, 1280);
eq(tall.s, 0.5625, '9:16 按宽度映射 s=0.5625');
eq(tall.height, 2276, '9:16 逻辑高度 2276');
eq(tall.bands.subTop, 2193, '9:16 字幕带仍贴底（logicalH−83）');
ok(tall.bands.contentBottom < tall.bands.subTop, '9:16 内容区不得压进字幕带');

// ---- 2) 运镜：帧数预算 + 必须在末拍前停住 ----
{
  const bands = wide.bands;
  const len = 120;
  for (const preset of ['push', 'pan', 'pull', 'scroll', undefined]) {
    const keys = cameraKeysFromMotion([{type: 'camera', target: 'stage', preset, amount: 0.12}], 1, len, bands);
    ok(keys && keys.length >= 2, `motion preset=${preset} 应生成 keys`);
    const last = keys[keys.length - 1];
    ok(last.f <= len - CAMERA_LIMITS.clear, `运镜结束帧必须 ≤ len−${CAMERA_LIMITS.clear}（preset=${preset}，实得 ${last.f}/${len}）`);
    ok(last.s <= CAMERA_LIMITS.maxScale + 1e-6, `推近不得超过 ${CAMERA_LIMITS.maxScale}（preset=${preset}，s=${last.s}）`);
    if (preset === 'scroll') {
      // 滚动扫的是内容区，两端不贴边：越过 contentBottom 就是把元素甩进字幕带
      for (const k of keys) ok(k.y >= bands.contentTop && k.y <= bands.contentBottom, `scroll 取景 y=${k.y} 越出内容区 ${bands.contentTop}–${bands.contentBottom}`);
    } else {
      ok(Math.abs(last.y - camCenterY(bands)) <= 1, `相机应对准内容区中心 y=${camCenterY(bands)}（preset=${preset}，y=${last.y}）`);
    }
    ok(cameraSettlesBeforeExit(keys, len), `cameraSettlesBeforeExit 应为真（preset=${preset}）`);
  }
  // 短镜头：留给运镜的空间不足时，宁可不运（镜头不能全程在动）
  const short = cameraKeysFromMotion([{type: 'camera', target: 'stage', preset: 'push', amount: 0.12}], 1, 34, bands);
  ok(!short, '34 帧镜头不该有运镜（可运窗口只剩 4 帧，硬做一定捅进末拍）');
  const shortFallback = slowPushKeys(1, 34, bands);
  ok(cameraSettlesBeforeExit(shortFallback, 34), '短镜头的兜底机位必须是静止的且能在末拍前停住');
  eq(shortFallback.length, 1, '短镜头兜底 = 单关键帧静止机位');
  // 兜底慢推同样避开末拍
  const fallback = slowPushKeys(1, 120, bands);
  ok(fallback[fallback.length - 1].f <= 120 - BEAT.CAMERA_CLEAR, '无声明运镜时的慢推也必须避开末拍');
  eq(camAt(0, CAMERA.push(1, {len: 30})).s, 1, 'camAt 首帧前应取首关键帧值（不是 0）');
  eq(camAt(999, CAMERA.push(1, {len: 30, to: 1.3})).s, 1.3, 'camAt 末帧后停在末值');
}

// ---- 2b) 运镜词表：门 / 修复 / 渲染三处必须同源，且每个名字都有画面实现 ----
{
  const bands = wide.bands;
  const vocab = cameraVocabulary();
  // 'slowPush' 是表里的驼峰项，渲染层查表前先 toLowerCase：曾经 includes() 查不到 →
  // plan 对一个能正确执行的声明报 camera-unknown-preset，而 authored 门用原样字符串判它合法。
  ok(isCameraPreset('slowPush') && isCameraPreset('slow_push'), 'slowPush / slow_push 归一后都应在词表内');
  eqJson(staticKeys(1, bands), [{f: 1, x: 640, y: camCenterY(bands), s: 1}], '静止机位 = 单关键帧、s=1、对准内容区中心');
  for (const preset of vocab) {
    const scene = {id: 'scene-vocab', start: 0, duration: 4, camera: preset, motion: [{type: 'camera', target: 'stage', preset, amount: 0.06}]};
    const plan = buildPlan({scene, recipe: {}, captions: [], fps: 30, bands, logicalH: wide.height});
    ok(!plan.issues.some((m) => String(m).startsWith('camera-unknown-preset')), `词表内的 ${preset} 不该被判成未知预设：${plan.issues.join(' | ')}`);
    const first = plan.camera.keys[0];
    const last = plan.camera.keys[plan.camera.keys.length - 1];
    const moved = plan.camera.keys.length > 1 && (last.s !== first.s || last.x !== first.x || last.y !== first.y);
    if (preset === 'static' || preset === 'none') {
      ok(!moved, `声明 ${preset} 却生成了会动的相机（keys=${JSON.stringify(plan.camera.keys)}）—— 词表里的名字得有真实现`);
    } else {
      ok(moved, `声明 ${preset} 却没生成对应运镜（keys=${JSON.stringify(plan.camera.keys)}）`);
    }
    ok(cameraSettlesBeforeExit(plan.camera.keys, 120), `${preset} 的相机必须在末拍前停住`);
  }
  const bogus = buildPlan({scene: {id: 'scene-bogus', start: 0, duration: 4, camera: 'orbit'}, recipe: {}, captions: [], fps: 30, bands, logicalH: wide.height});
  ok(bogus.issues.some((m) => String(m).startsWith('camera-unknown-preset')), '渲染层不认识的 camera 名必须出声，不能静默退化成慢推');

  // grammar（生产者侧的门）与渲染层同源：orbit/zoom/slide 不能再被放行，pull/scroll 不能再被误杀。
  const {lintVisualGrammar} = await import('../src/visual/grammar.mjs');
  const beatRow = (type) => [{
    id: 'beat-v', hero: {type: 'concept', size: 'large'}, state_change: 'enter -> transform -> settle',
    camera: {type, amount: 0.04, duration_frames: 120}, duration: 4, asset_need: 'diagram', settle_frames: 30,
    composition: {focus: 'hero-plus-flow', hero_weight: 0.68}, light: {mode: 'hero-key', key_intensity: 0.8, accent: 'purple'},
  }];
  for (const dead of ['orbit', 'zoom', 'slide']) {
    ok(lintVisualGrammar(beatRow(dead)).includes('beat-v:invalid-camera'), `grammar 不能再放行渲染层没有实现的 ${dead}`);
  }
  for (const live of ['pull', 'scroll', 'handoff', 'slow_push', 'parallax']) {
    ok(!lintVisualGrammar(beatRow(live)).includes('beat-v:invalid-camera'), `grammar 不能再拒绝渲染层真能执行的 ${live}`);
  }
}

// ---- 3) 离场节拍预算 ----
{
  const p = exitPlan(120, 30);
  eq(p.hold, 30, 'settle_frames=30 → 末拍停留 30 帧');
  eq(p.exitAt, 90, '离场起点 = len − hold（90 帧起离场，90–120 共 31 帧含落位帧）');
  ok(p.exitAt >= 1 && p.exitAt <= 120, '离场起点必须落在镜头内');
  const def = exitPlan(200);
  ok(def.hold >= BEAT.EXIT_HOLD_MIN && def.hold <= BEAT.EXIT_HOLD_MAX, `缺省停留须落在 ${BEAT.EXIT_HOLD_MIN}–${BEAT.EXIT_HOLD_MAX}`);
  const tooShort = exitPlan(20, 45);
  ok(tooShort.exitAt >= 1, '镜头短于停留预算时离场起点不得为负');
}

// ---- 4) buildPlan：真实 fixture，两种画幅 ----
const irWide = JSON.parse(fs.readFileSync('fixtures/render-ir-16x9.json', 'utf8'));
const irTall = JSON.parse(fs.readFileSync('fixtures/render-ir-9x16.json', 'utf8'));
const captions = JSON.parse(fs.readFileSync('fixtures/captions.json', 'utf8'));
const registryIcons = new Set(KNOWN_ICONS);

function checkFilm(ir, label) {
  const d = design(ir.width, ir.height);
  for (const scene of ir.scenes || []) {
    const plan = buildPlan({scene, recipe: {shot_id: scene.id, variant: scene.variant || 'generic', settle_frames: 30}, captions, fps: ir.fps, bands: d.bands, logicalH: d.height});
    const tag = `${label}/${scene.id}`;
    // 4.1 节拍窗口： shipped fixture 必须**全部落窗**，且一条 issue 都不该有。
    //     只判「违规有没有出声」是不够的——排布逻辑坏掉时 issue 会跟着变多，画面照样不合规。
    const layoutIssues = plan.issues.filter((s) => /^beat-window-overflow|^beat-after-exit|^icon-unregistered|^accent-overflow|^text-below-min/.test(s));
    ok(layoutIssues.length === 0, `${tag} 排版/节拍层缺陷未解决：${layoutIssues.join(' ; ')}`);
    for (const it of plan.items) {
      const inWindow = it.beat >= BEAT_WINDOW[0] && it.beat <= BEAT_WINDOW[1];
      ok(inWindow, `${tag} 元素 ${it.id} beat=${it.beat} 出窗（限 ${BEAT_WINDOW[0]}…${BEAT_WINDOW[1]}）`);
      ok(it.f0 <= plan.exit.exitAt, `${tag} ${it.id} 入场帧 ${it.f0} 晚于离场起点 ${plan.exit.exitAt}`);
    }

    // 4.2 一镜一紫
    const actives = plan.items.filter((it) => it.active).length;
    ok(actives <= 1, `${tag} active 图元 ${actives} 个 > 1（紫只给当前重点）`);
    // 4.3 图标必须注册
    for (const it of plan.items) {
      if (it.icon) ok(registryIcons.has(it.icon), `${tag} 图标 ${it.icon} 不在 ICONS 注册表里`);
    }
    // 4.4 主角排版下限
    if (plan.hero && plan.hero.kind !== 'number') {
      ok(plan.hero.size >= BIG_TEXT_MIN || plan.issues.length > 0, `${tag} 主角字号 ${plan.hero.size} < ${BIG_TEXT_MIN} 且未记 issue`);
      ok(!/…$|\.\.\.$/.test(String(plan.hero.text || '')), `${tag} 主角文案被省略号截断（分镜缺陷必须出声，不能靠渲染层兜）`);
    }
    // 4.5 主角入场也在节拍窗口内
    if (plan.hero) {
      const heroBeat = plan.hero.f0 - plan.subFrom;
      ok(heroBeat >= BEAT_WINDOW[0] && heroBeat <= BEAT_WINDOW[1] || plan.subFrom === 1, `${tag} 主角 beat=${heroBeat} 出窗`);
      ok(plan.hero.f0 >= 1, `${tag} 主角入场帧 < 1`);
    }
    // 4.6 配角不得压进字幕带 / 顶部 HUD
    for (const it of plan.items) {
      if (!Number.isFinite(it.y)) continue;
      ok(it.y >= d.bands.contentTopNoRail - 200 && it.y <= d.bands.contentBottom + 40, `${tag} ${it.id} y=${it.y} 越出内容区`);
    }
    // 4.7 确定性：同样输入两次构建必须逐字节相同
    const again = buildPlan({scene, recipe: {shot_id: scene.id, variant: scene.variant || 'generic', settle_frames: 30}, captions, fps: ir.fps, bands: d.bands, logicalH: d.height});
    eq(JSON.stringify(again.items) + JSON.stringify(again.issues), JSON.stringify(plan.items) + JSON.stringify(plan.issues), `${tag} 同一输入两次构建结果不同（确定性被破坏）`);
  }
}
checkFilm(irWide, '16x9');
checkFilm(irTall, '9x16');

// ---- 5) 字幕块与镜头帧号同源 ----
{
  const scene = {id: 'scene-001', start: 1.5, duration: 4};
  const {f0, len} = shotFrames(scene, 30);
  eq(f0, 45, '镜头全局起始帧（0-based 世界帧）');
  eq(len, 120, '镜头帧数');
  const caps = beatFrames([{id: 'a'}, {id: 'b'}, {id: 'c'}, {id: 'd'}, {id: 'e'}], [{localFrom: 11}, {localFrom: 40}], 200);
  ok(caps.every((c) => c.beat >= BEAT_WINDOW[0] && c.beat <= BEAT_WINDOW[1]), `5 件元素配 2 块字幕应全部落窗（实得 ${caps.map((c) => c.beat).join(',')}）`);
  ok(caps.every((c) => c.f0 >= 1), '元素入场帧不得排到镜头开始之前');
  ok(caps[3].f0 > caps[2].f0, '跨到第二块字幕后仍要逐件错峰');
}

// ---- 6) 片级效果预算常量 ----
ok(SWEEP_WHITELIST_MAX <= 2, '紫光横扫全片预算 ≤2');
ok(GLITCH_PER_SHOT_MAX <= 1, '每镜头 GlitchIn ≤1');
ok(HIGHLIGHT_PER_CHAPTER_MAX <= 1, '每章高光 ≤1');

// ---- 6.5) 字体角色：文档说「数字用 Orbitron」，图元的默认值就必须真的是它 ----
// 上游 lessons.md:64 的原话是「Counter 的默认字族是 FONT_HEAVY 不是 Orbitron，与风格指南冲突 ——
// 四个组同时反馈并各自绕开自建了一份」。本仓库只有一个渲染层，不会「各自自建」，
// 但同一颗雷照样会中：family 不给默认值 → CText 的 FONT_HEAVY 生效 → 数字用 Noto 画，
// 而 emFor(family) 又按字体串取宽度系数，EM_ORB=1.2 也一起失效（宽度模型与字形同时错档）。
// 用源码文本判而不是跑渲染：JSX 在 node 里跑不了；把默认值删掉这道 pin 必须变红（已做变异验证）。
{
  const fxPath = path.join('src', 'remotion', 'Fx.jsx');
  const fx = fs.readFileSync(fxPath, 'utf8').split(/\r?\n/);
  const sig = fx.find((l) => /^export const BigNumber = \(/.test(l)) || '';
  ok(sig.length > 0, `${fxPath} 里找不到 BigNumber 的签名 —— 这道 pin 自己失效了`);
  ok(/family\s*=\s*FONT_ORB/.test(sig), 'BigNumber 的 family 没有默认值 FONT_ORB：数字会落到 CText 的 FONT_HEAVY（style-guide.md §6 字体角色表与 Fx.jsx 注释都写的是 Orbitron）');
  ok(/^import .*FONT_ORB.*from '\.\.\/visual\/style\.mjs'/m.test(fx.join('\n')), 'Fx.jsx 没从 style.mjs import FONT_ORB（默认值写成未定义名 = 运行时 ReferenceError）');
}

// ---- 7) 确定性：源码不得用 Math.random / Date.now 影响画面 ----
{
  const bad = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx|mjs|js)$/.test(e.name)) {
        const body = fs
          .readFileSync(p, 'utf8')
          .split('\n')
          .filter((line) => !/^\s*(\/\/|\*)/.test(line))
          .join('\n');
        if (/Math\.random\s*\(/.test(body)) bad.push(`${path.relative(process.cwd(), p).replace(/\\/g, '/')}: Math.random()`);
        if (/\bnew Date\(\)|Date\.now\(\)/.test(body) && /src\/(remotion|shots|visual)/.test(p.replace(/\\/g, '/'))) bad.push(`${path.relative(process.cwd(), p).replace(/\\/g, '/')}: 墙上时钟进入画面层`);
      }
    }
  };
  walk(path.join('src', 'remotion'));
  walk(path.join('src', 'shots'));
  walk(path.join('src', 'visual'));
  for (const b of bad) fails.push(`确定性破口：${b}（同一帧每次渲染不同 → QC 复测和视觉回归全部失去意义）`);
}

if (fails.length) {
  console.error('RENDER LAYER GATE FAIL');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('RENDER LAYER GATE PASS', JSON.stringify({scenes: (irWide.scenes || []).length + (irTall.scenes || []).length, icons: KNOWN_ICONS.length, beats: BEAT.CAMERA_MIN}));
