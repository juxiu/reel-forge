import fs from "node:fs";

const skill = fs.readFileSync("SKILL.md", "utf8");
if (!skill.startsWith("---\n")) throw new Error("SKILL.md frontmatter missing");
const end = skill.indexOf("\n---\n", 4);
if (end < 0) throw new Error("SKILL.md frontmatter malformed");
const frontmatter = skill.slice(4, end);
const body = skill.slice(end + 5);

for (const field of ["name:", "description:"]) {
  if (!frontmatter.split("\n").some(line => line.startsWith(field))) throw new Error("SKILL.md missing frontmatter field: " + field);
}
const required = ["# reel-forge Skill","## 目标","## 何时使用","## 输入契约","## 硬性原则","## 执行阶段","## 两级验证策略","## Skill 完成定义"];
for (const section of required) {
  if (!body.includes(section)) throw new Error("SKILL.md missing section: " + section);
}
for (const token of ["tts-word-boundary","npm run verify:fast","npm run skill --"]){
  if (!body.includes(token)) throw new Error("SKILL.md missing contract token: " + token);
}
const match = /^name:\s*(.+)$/m.exec(frontmatter);
const name = match ? match[1].trim() : "";
if (name !== "reel-forge") throw new Error("invalid skill name: " + name);

const script = fs.readFileSync("scripts/skill.mjs","utf8");
for (const token of ["--source","--auto-approve","scripts/run-production.mjs","scripts/visual_regression.py","verify:production"]) {
  if (!script.includes(token)) throw new Error("skill runner missing token: " + token);
}
console.log("skill contract PASS", JSON.stringify({name, sections: required.length, cli:"npm run skill"}));
