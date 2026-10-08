#!/bin/sh
set -eu
PROJECT_ID=$(node -e 'console.log(require("./fixtures/project.json").project_id)')
if [ "${AUTO_APPROVE:-0}" = "1" ]; then
  node scripts/checkpoint.mjs pilot-preview approved >/dev/null
else
  node scripts/checkpoint.mjs pilot-preview pending >/dev/null 2>&1 || true
  STATUS=$(node -e 'const fs=require("fs");const p="artifacts/"+process.argv[1]+"/runtime/checkpoints.json";const s=JSON.parse(fs.readFileSync(p,"utf8"));console.log(s.checkpoints["pilot-preview"]?.status||"pending")' "$PROJECT_ID")
  test "$STATUS" = "approved" || { echo "render blocked: pilot-preview checkpoint not approved"; exit 2; }
fi
mkdir -p artifacts/render artifacts/frames/16x9 artifacts/frames/9x16
npx remotion render src/remotion/index.jsx ReelForge16x9 artifacts/render/reel-forge-16x9.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
npx remotion render src/remotion/index.jsx ReelForge9x16 artifacts/render/reel-forge-9x16.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
rm -rf artifacts/frames && mkdir -p artifacts/frames/16x9 artifacts/frames/9x16
ffmpeg -v error -y -i artifacts/render/reel-forge-16x9.mp4 artifacts/frames/16x9/f_%04d.jpg
ffmpeg -v error -y -i artifacts/render/reel-forge-9x16.mp4 artifacts/frames/9x16/f_%04d.jpg
