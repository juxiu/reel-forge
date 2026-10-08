#!/bin/sh
set -eu
SEC=${1:-30};START=${2:-0};FROM=$((START*30));TO=$((FROM+SEC*30-1))
mkdir -p artifacts/preview
npx remotion render src/remotion/index.jsx ReelForge16x9 artifacts/preview/preview.mp4 --codec=h264 --frames=${FROM}-${TO} --log=error
test -s artifacts/preview/preview.mp4
printf '%s\n' artifacts/preview/preview.mp4
