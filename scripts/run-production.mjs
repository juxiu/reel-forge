import fs from "node:fs";
import {runProduction} from "../src/director/pipeline.mjs";
import {createAgentProvider} from "../src/providers/agent/index.mjs";
import {FileLock} from "../src/runtime/lock.mjs";
import {initCheckpoints} from "../src/runtime/checkpoints.mjs";

const project = JSON.parse(fs.readFileSync(process.argv[2] || "fixtures/project.json", "utf8"));
const scriptFile = process.argv[3] || "fixtures/script.json";
const script = fs.existsSync(scriptFile) ? JSON.parse(fs.readFileSync(scriptFile, "utf8")) : null;
const root = "artifacts";
const lock = FileLock.forProject(project.project_id, root);
lock.acquire();

try {
  initCheckpoints(project.project_id, root);
  const result = await runProduction(project, {
    script,
    agent: createAgentProvider(),
    root,
  });

  fs.mkdirSync(root + "/" + project.project_id, {recursive: true});
  for (const [name, value] of [
    ["research", result.research],
    ["script", result.script],
    ["beats", result.beats],
    ["scene", {project_id: project.project_id, scenes: result.scenes}],
    ["render-ir", result.renderIR],
  ]) {
    fs.writeFileSync(root + "/" + project.project_id + "/" + name + ".json", JSON.stringify(value, null, 2));
  }
  console.log("production PASS", result.execution.id);
} finally {
  lock.release();
}
