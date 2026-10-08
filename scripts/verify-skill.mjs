import fs from "node:fs";

const text = fs.readFileSync("SKILL.md", "utf8");
if (!text.startsWith("---\n")) throw new Error("SKILL.md frontmatter missing");
const end = text.indexOf("\n---\n", 4);
if (end < 0) throw new Error("SKILL.md frontmatter malformed");
const frontmatter = text.slice(4, end);
const body = text.slice(end + 5);

for (const field of ["name:", "description:"]) {
  if (!frontmatter.split("\n").some(line => line.startsWith(field))) throw new Error("SKILL.md missing frontmatter field: " + field);
}
const required = ["# reel-forge Skill","## 目标","## 何时使用","## 输入契约","## 硬性原则","## 执行阶段","## 两级验证策略","## Skill 完成定义"];
for (const section of required) {
  if (!body.includes(section)) throw new Error("SKILL.md missing section: " + section);
}
for (const token of ["tts-word-boundary","npm run verify:fast"]) {
  if (!body.includes(token)) throw new Error("SKILL.md missing contract token: " + token);
}
const match = /^name:\s*(.+)$/m.exec(frontmatter);
const name = match ? match[1].trim() : "";
if (name !== "reel-forge") throw new Error("invalid skill name: " + name);
console.log("skill contract PASS", JSON.stringify({name, sections: required.length}));