import {buildRepairPlan} from "../src/qc/repair-loop.mjs";
import {makeRepairPlan, repairRenderIR} from "../src/repair/engine.mjs";

const report = {
  status: "FAIL",
  issues: [
    {node: "scene-1", type: "motion_too_low"},
    {node: "scene-1", type: "hero_too_small"},
  ],
};
const p = buildRepairPlan(report, {maxRetries: 2});
if (p.nodes.length !== 1 || p.nodes[0].issues.length !== 2 || p.maxRetries !== 2) throw new Error("repair loop plan failed");
const ir = {
  width: 1280, height: 720, fps: 30,
  scenes: [{
    id: "scene-1",
    start: 0, duration: 4,
    hero_scale: 1,
    elements: [{id: "hero", type: "card", text: "x"}],
    motion: [{target: "stage", type: "camera", amount: 0.04}],
  }],
};
const repaired = repairRenderIR(ir, report.issues);
if (!(repaired.scenes[0].hero_scale > 1) || !(repaired.scenes[0].motion[0].amount > 0.04)) throw new Error("repair patch failed");
const plan = makeRepairPlan(report, 2);
if (plan.nodes.length !== 1) throw new Error("repair engine plan failed");
console.log("repair PASS");
