#!/bin/sh
set -eu
mkdir -p artifacts/render artifacts/frames
npx remotion render src/remotion/index.jsx ReelForge16x9 artifacts/render/reel-forge-16x9.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
npx remotion render src/remotion/index.jsx ReelForge9x16 artifacts/render/reel-forge-9x16.mp4 --codec=h264 --crf=16 --concurrency=4 --log=error
rm -rf artifacts/frames && mkdir -p artifacts/frames/16x9
ffmpeg -v error -y -i artifacts/render/reel-forge-16x9.mp4 artifacts/frames/16x9/f_%04d.jpg
