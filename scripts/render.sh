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
# 帧必须是 PNG，不能是 JPG：
#   · 测量层是纯标准库实现，JPEG 解码要 Pillow；缺依赖时 QC 会「静默不跑」，比慢更糟。
#   · JPEG 的 4:2:0 色度抽样会把紫雾（102,45,248）的绿通道糊掉，紫色碎片的 b>r>g 判据直接失真。
# 序号必须逐帧连续：frame_metrics / motion_check 都以「文件名里的编号 = 真实帧号」为准做步长换算，
# image2 的 select 抽帧会把编号重排成 1,2,3…，那样静止时长会被算成实际秒数的 1/step。
# 代价写在这儿：2 分钟 @30fps 是 3600 张 ×2 画幅，暗场 PNG 约 150–400KB/张，两个画幅约 1–3GB 临时盘。
ffmpeg -v error -y -i artifacts/render/reel-forge-16x9.mp4 -vsync 0 artifacts/frames/16x9/f_%04d.png
ffmpeg -v error -y -i artifacts/render/reel-forge-9x16.mp4 -vsync 0 artifacts/frames/9x16/f_%04d.png
