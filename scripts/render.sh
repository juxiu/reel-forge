#!/bin/sh
set -eu
PROJECT_ID=$(node -e 'console.log(require("./fixtures/project.json").project_id)')
CHECKPOINTS="length-language narration-signoff voiceover pilot-preview"
if [ "${AUTO_APPROVE:-0}" = "1" ]; then
  for CHECKPOINT in $CHECKPOINTS; do
    node scripts/checkpoint.mjs "$CHECKPOINT" approved >/dev/null
  done
else
  node scripts/checkpoint.mjs pilot-preview show >/dev/null 2>&1 || true
  PROJECT_ID="$PROJECT_ID" node - <<'NODE'
const fs=require("fs");
const p="artifacts/"+process.env.PROJECT_ID+"/runtime/checkpoints.json";
const s=JSON.parse(fs.readFileSync(p,"utf8"));
for (const name of ["length-language","narration-signoff","voiceover","pilot-preview"]) {
  const value=s.checkpoints?.[name];
  if (!value || value.status !== "approved" || !value.artifact_hash) {
    console.error("render blocked: checkpoint not approved:", name);
    process.exit(2);
  }
}
NODE
fi
mkdir -p artifacts/render artifacts/frames/16x9 artifacts/frames/9x16
# 抽帧工具缺席就别跑完两遍渲染才发现没帧可测（Remotion 全片渲染是这条流程里最贵的一步）。
for TOOL in ffmpeg; do
  command -v "$TOOL" >/dev/null 2>&1 || { echo "render blocked: 缺少 $TOOL（成片有了但 QC 读不到帧）"; exit 127; }
done
npx remotion render src/remotion/index.jsx ReelForge16x9 artifacts/render/reel-forge-16x9.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
npx remotion render src/remotion/index.jsx ReelForge9x16 artifacts/render/reel-forge-9x16.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
rm -rf artifacts/frames && mkdir -p artifacts/frames/16x9 artifacts/frames/9x16
# ⚠ 帧必须是 PNG，不能是 JPG：
#   · 测量层是纯标准库实现，JPEG 解码要 Pillow；缺依赖时 QC 会「静默不跑」，比慢更糟。
#   · JPEG 的 4:2:0 色度抽样会把紫雾（102,45,248）的绿通道糊掉，紫色碎片的 b>r>g 判据直接失真。
# 序号必须逐帧连续：frame_metrics / motion_check 都以「文件名里的编号 = 真实帧号」为准做步长换算，
# image2 的 select 抽帧会把编号重排成 1,2,3…，那样静止时长会被算成实际秒数的 1/step。
# 代价写在这儿：255s @30fps 是 7657 张 ×2 画幅，暗场 PNG 约 150–400KB/张，两个画幅约 3–6GB 临时盘。
#
# ⚠⚠ `-vsync 0` 在 ffmpeg ≥ 5 已废弃、9.0 直接报「Unrecognized option 'vsync'」并**中止抽帧**。
#    而抽帧失败会让 `artifacts/frames/` 保持空目录 —— 后面 frame_metrics / motion_check 读不到帧，
#    却在报告里表现为「没有测量结果」，看起来像数据缺失而不是抽帧根本没跑。
#    这里探测一次可用选项：新版用 `-fps_mode passthrough`，旧版退回 `-vsync 0`。
# ⚠ 这里**不用变量装多个 flag**：zsh 不对未加引号的变量做单词拆分，
#    同一段命令在 sh 下能跑、在 zsh 下会把 "-fps_mode passthrough" 当成一个参数传进去，
#    于是又变成「Unrecognized option」。显式分支没有这个歧义。
if ffmpeg -hide_banner -h full 2>&1 | grep -q -- '-fps_mode'; then
  extract() { ffmpeg -v error -y -i "$1" -fps_mode passthrough "artifacts/frames/$2/f_%04d.png"; }
  FPSMODE_OPT="-fps_mode passthrough"
else
  extract() { ffmpeg -v error -y -i "$1" -vsync 0 "artifacts/frames/$2/f_%04d.png"; }
  FPSMODE_OPT="-vsync 0"
fi
extract artifacts/render/reel-forge-16x9.mp4 16x9
extract artifacts/render/reel-forge-9x16.mp4 9x16
COUNT_16=$(ls artifacts/frames/16x9 2>/dev/null | wc -l | tr -d ' ')
COUNT_9=$(ls artifacts/frames/9x16 2>/dev/null | wc -l | tr -d ' ')
# 抽帧后必须核对张数：空目录会让下游「看起来像没有质量问题」而不是「帧没抽出来」。
if [ "$COUNT_16" -lt 1 ] || [ "$COUNT_9" -lt 1 ]; then
  echo "render blocked: 抽帧得到 0 张（16x9=$COUNT_16 9x16=$COUNT_9）—— 测量层会读不到帧并报成「无测量结果」" >&2
  exit 1
fi
echo "frames extracted: 16x9=$COUNT_16 9x16=$COUNT_9 (option: $FPSMODE_OPT)"
