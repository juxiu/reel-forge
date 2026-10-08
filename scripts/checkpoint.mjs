import fs from "node:fs";
import {initCheckpoints, readCheckpoints, resolveCheckpoint} from "../src/runtime/checkpoints.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const name = process.argv[2] || "pilot-preview";
const action = process.argv[3] || "show";

if (action === "show") {
  console.log(JSON.stringify(initCheckpoints(project.project_id), null, 2));
} else {
  console.log(JSON.stringify(resolveCheckpoint(project.project_id, name, action), null, 2));
}
