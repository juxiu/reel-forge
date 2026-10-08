import fs from "node:fs";

const ratios = [
  ["16x9", "fixtures/render-ir-16x9.json"],
  ["9x16", "fixtures/render-ir-9x16.json"],
];

const issues = [];
for (const [ratio, file] of ratios) {
  if (!fs.existsSync(file)) {
    issues.push(ratio + ":missing-render-ir");
    continue;
  }
  const ir = JSON.parse(fs.readFileSync(file, "utf8"));
  const safe = ir.width > ir.height
    ? {left: 72, right: 72, top: 82, bottom: 122}
    : {left: 44, right: 44, top: 92, bottom: 184};

  if (!(ir.width > 0 && ir.height > 0 && ir.fps > 0)) issues.push(ratio + ":invalid-canvas");
  if (!(ir.duration > 0)) issues.push(ratio + ":invalid-duration");

  const ids = new Set();
  let previousEnd = 0;
  for (const scene of ir.scenes || []) {
    if (ids.has(scene.id)) issues.push(ratio + ":" + scene.id + ":duplicate");
    ids.add(scene.id);

    const start = Number(scene.start);
    const duration = Number(scene.duration);
    if (!(duration > 0)) issues.push(ratio + ":" + scene.id + ":invalid-duration");
    if (start < previousEnd - 0.01) issues.push(ratio + ":" + scene.id + ":overlap");
    previousEnd = Math.max(previousEnd, start + duration);

    if (!scene.variant) issues.push(ratio + ":" + scene.id + ":missing-variant");
    if (!Array.isArray(scene.elements) || !scene.elements.some((item) => item.id === "hero")) {
      issues.push(ratio + ":" + scene.id + ":missing-hero");
    }
    const camera = (scene.motion || []).find((item) => item.target === "stage");
    if (!camera || !(Number(camera.amount) > 0)) issues.push(ratio + ":" + scene.id + ":missing-camera-motion");
    if (!safe.left || !safe.bottom) issues.push(ratio + ":" + scene.id + ":invalid-safe-area");
  }

  if (Math.abs(previousEnd - Number(ir.duration)) > 0.1) {
    issues.push(ratio + ":duration-does-not-cover-scenes");
  }
}

if (issues.length) {
  console.error("scene contract FAIL");
  issues.forEach((issue) => console.error("- " + issue));
  process.exit(1);
}

console.log("scene contract PASS");
