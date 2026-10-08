import fs from "node:fs";
import {initCheckpoints, resolveCheckpoint} from "../src/runtime/checkpoints.mjs";

const project = JSON.parse(fs.readFileSync("fixtures/project.json", "utf8"));
const name = process.argv[2] || "pilot-preview";
const status = process.argv[3] || "approved";

console.log(JSON.stringify(resolveCheckpoint(project.project_id, name, status), null, 2));
