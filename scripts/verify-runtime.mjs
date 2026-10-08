import fs from "node:fs";
import {Execution} from "../src/core/runtime.mjs";
import {FileLock} from "../src/runtime/lock.mjs";
import {initCheckpoints, resolveCheckpoint, requireCheckpoint} from "../src/runtime/checkpoints.mjs";

const e = new Execution({project_id:"runtime-test",request:"test"});
e.emit("node.started",{node:"research"});
e.pause("review");
if (e.state.status !== "paused") throw new Error("pause");
e.resume();
e.complete();

const state = JSON.parse(fs.readFileSync(e.dir + "/state.json", "utf8"));
const restored = Execution.load({project_id:"runtime-test",request:"test"});
if (restored.state.status !== "completed" || restored.state.events.length !== state.events.length) {
  throw new Error("state restore");
}

const lock = FileLock.forProject("runtime-lock-test");
lock.acquire();
let blocked = false;
try {
  FileLock.forProject("runtime-lock-test").acquire();
} catch {
  blocked = true;
}
lock.release();
if (!blocked) throw new Error("project lock failed");

initCheckpoints("checkpoint-test");
resolveCheckpoint("checkpoint-test","pilot-preview","approved");
requireCheckpoint("checkpoint-test","pilot-preview");

console.log("runtime PASS");
