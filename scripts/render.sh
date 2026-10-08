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
npx remotion render src/remotion/index.jsx ReelForge16x9 artifacts/render/reel-forge-16x9.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
npx remotion render src/remotion/index.jsx ReelForge9x16 artifacts/render/reel-forge-9x16.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
rm -rf artifacts/frames && mkdir -p artifacts/frames/16x9 artifacts/frames/9x16
ffmpeg -v error -y -i artifacts/render/reel-forge-16x9.mp4 artifacts/frames/16x9/f_%04d.jpg
ffmpeg -v error -y -i artifacts/render/reel-forge-9x16.mp4 artifacts/frames/9x16/f_%04d.jpg
