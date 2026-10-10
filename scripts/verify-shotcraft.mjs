import fs from "node:fs";
import path from "node:path";

const raw = String(process.env.VIDEO_SHOTCRAFT_DIR || "").trim();
if (!raw) {
  console.log("video-shotcraft SKIP: VIDEO_SHOTCRAFT_DIR 未设置；这是可选参考库，不会自动下载。");
  process.exit(0);
}

const root = path.resolve(raw);
const requiredFiles = [
  "README.md",
  "SKILL.md",
  "LICENSE",
  "gallery/api/library.json",
  "references/shots/ATTRIBUTION.md",
  "assets/audio/ATTRIBUTION.md",
  "demos/README.md",
];
const missing = requiredFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  console.error("video-shotcraft FAIL: 目录不是完整的仓库根目录或缺少文件", JSON.stringify({root, missing}, null, 2));
  process.exit(1);
}

const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
if (!/Apache License[\s\S]{0,300}Version 2\.0/i.test(license)) {
  console.error("video-shotcraft FAIL: LICENSE 未识别为 Apache License 2.0；请人工检查许可证变化。");
  process.exit(1);
}

JSON.parse(fs.readFileSync(path.join(root, "gallery/api/library.json"), "utf8"));

function countFiles(dir, predicate) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(file, predicate);
    else if (predicate(file)) count++;
  }
  return count;
}

const cards = countFiles(path.join(root, "references/shots"), (file) =>
  file.toLowerCase().endsWith(".md") && path.basename(file).toLowerCase() !== "attribution.md");
const demos = countFiles(path.join(root, "demos"), (file) => file.toLowerCase().endsWith(".tsx"));
if (cards < 1 || demos < 1) {
  console.error("video-shotcraft FAIL: 找不到镜头卡或 Remotion demo", JSON.stringify({root, cards, demos}, null, 2));
  process.exit(1);
}
console.log("video-shotcraft PASS", JSON.stringify({root, license: "Apache-2.0 (repository LICENSE only; review per-file media licenses separately)", cards, demos}, null, 2));
