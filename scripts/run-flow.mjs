import{run as spawn}from"../src/runtime/spawn.mjs";
// 每一步都单独报「命令起不来」和「退出码非 0」：老写法把 status=null 当成 1 退出，
// Windows 上 python3 不存在时会表现成「某步失败」，看不出是环境缺工具。
const run=cmd=>{const r=spawn(cmd[0],cmd.slice(1),{stdio:"inherit"});if(r.error){console.error(cmd[0]+" 无法启动: "+r.error+"；参数: "+cmd.slice(1).join(" "));process.exit(127)}if(r.status!==0)process.exit(r.status??1)};
run(["node","scripts/run-production.mjs"]);run(["node","scripts/tts_build.mjs"]);run(["node","scripts/asr_second_pass.mjs"]);run(["python3","scripts/render_storyboard.py"]);run(["python3","scripts/selfcheck.py"]);run(["node","scripts/materialize-ir.mjs"]);run(["node","scripts/build-groups.mjs"]);run(["node","scripts/materialize-shots.mjs"]);
// 测量判据导出：Python 侧的 frame_metrics/motion_check 只读这份 JSON，
// 所以它必须在任何 QC 之前重新生成 —— 否则改了渲染常量却拿旧判据验收，PASS 是假的。
run(["node","scripts/export-visual-contracts.mjs"]);
// 渲染前的分镜合规审计：buildPlan 在渲染前就知道「这一镜的数据做不到合规画面」，
// 那就该停在这儿，而不是渲完两遍再看截图反推。exit 1 = 有阻断项，去改分镜/文案。
run(["node","scripts/plan-audit.mjs"]);
console.log("FLOW STOP: pilot preview is ready; run npm run preview, npm run pilot, then approve pilot-preview before full render.");
