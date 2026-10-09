import fs from "node:fs";
import {CAMERA_LIMITS} from "../src/visual/camera.mjs";
import {STILL_FRAMES_PER_SCENE, expectedGroupSizes, groupCountOf, groupIdOf, maxShotsPerGroup} from "../src/build/limits.mjs";

/**
 * 参考片蓝图门。
 *
 * 原来这里把「镜头总数 / 组数 / 组名允许范围 / 每镜 still 数」四个数写死在**校验脚本**里，而它们描述的
 * 数量同时是**被校验产物**（`fixtures/reference-shot-blueprint.json`）自己声明的字段。
 * 两份独立硬编码的后果：换一部片（例如 2–3 分钟中文校验片的 24–32 镜 / 4–6 组）
 * 必须来改这个脚本，而改脚本本身又没有门守着 —— 论述见
 * `docs/knowledge/agent-protocol.md` §7、§8.8。
 *
 * 现在数量一律从蓝图派生，判据换成「蓝图是否自洽 + 是否符合分组公式」：
 *   1. `shot_count` 必须等于 `shots.length`（蓝图删成 43 条而 shot_count 还写 44 → 红）。
 *   2. 组名必须是 `G1…G{group_count}` 连续，且 `group_count === ceil(shots / perGroup)`。
 *   3. 每条 shot 的 `group` 必须等于 `groupIdOf(镜头号)` —— 分组公式与
 *      `build-groups.mjs` / `materialize-shots.mjs` / `verify-shots.mjs` 同源（`src/build/limits.mjs`）。
 *   4. 每组条数必须等于 `expectedGroupSizes()` 的分布（前组装满、末组装余数）。
 *   5. `settle_frames ≥ CAMERA_LIMITS.clear`（原来这里独立写死 30），
 *      `still_kinds` 条数 = `STILL_FRAMES_PER_SCENE`（原来独立写死 6）。
 *   6. QC 至少一轮且带复验：`qc.rounds` 不再是「恰好 2」—— 2 是这张蓝图的属性，
 *      不是判据；判据是「有 QC 轮次且建模了复验」。
 * ⚠ 仍然只读蓝图、不看盘上镜头文件，也不渲染 —— 那些是 `verify:authored-shots` 与
 *    `verify:shots` 的活（而 `verify:authored-shots` 不在本地链里，见 agent-protocol §7 位置提醒）。
 */

const sample = JSON.parse(fs.readFileSync("fixtures/reference-shot-blueprint.json", "utf8"));
const shots = sample.shots || [];
if (!Array.isArray(shots) || shots.length === 0) throw new Error("blueprint 没有 shots[] —— 这道门没有可判的对象");
if (sample.shot_count !== shots.length) throw new Error(`blueprint 自相矛盾：shot_count=${sample.shot_count} 而 shots.length=${shots.length}`);

const perGroup = maxShotsPerGroup();
const seen = new Set();
for (const shot of shots) {
  if (seen.has(shot.shot_id)) throw new Error("duplicate shot " + shot.shot_id);
  seen.add(shot.shot_id);
  const number = Number(String(shot.shot_id).replace(/^[A-Za-z]+/, ""));
  if (!Number.isInteger(number) || number < 1) throw new Error(`shot_id「${shot.shot_id}」取不出 1-based 镜头号`);
  if (shot.group !== groupIdOf(number, perGroup)) throw new Error(`${shot.shot_id}: group=${shot.group}，但分组公式（每 ${perGroup} 镜一组）给的是 ${groupIdOf(number, perGroup)}`);
  if (!(shot.settle_frames >= CAMERA_LIMITS.clear)) throw new Error(`settle_frames ${shot.settle_frames} < 相机最短让位帧 ${CAMERA_LIMITS.clear} for ${shot.shot_id}`);
  // ⚠ 「恰好」在这里是对的，因为蓝图是**参考片那 44 镜的实录**（没有一镜声明 highlight），不是要求。
  //   一旦蓝图开始记录高光镜头（或有人把它当规范用），这一行必须换成 `stillFramesMin(shot)` 的下限判定，
  //   否则它会与 `verify-still-benchmark` 的 ≥10 打架 —— 那是 §4 记录过的老矛盾的复现方式。
  if (!Array.isArray(shot.still_kinds) || shot.still_kinds.length !== STILL_FRAMES_PER_SCENE) {
    throw new Error(`still_kinds 必须恰好 ${STILL_FRAMES_PER_SCENE} 项（真源 src/build/limits.mjs）for ${shot.shot_id}`);
  }
}

const groupNumbers = [...new Set(shots.map((shot) => Number(String(shot.group).replace(/^G/, ""))))].sort((a, b) => a - b);
if (groupNumbers.some((n) => !Number.isInteger(n) || n < 1)) throw new Error("组名必须形如 G1…Gn");
if (groupNumbers.some((n, i) => n !== i + 1)) throw new Error(`组号不连续：${groupNumbers.join(",")} —— 断号意味着中间某组被删光而蓝图没重导`);
if (sample.group_count !== groupNumbers.length) throw new Error(`blueprint 自相矛盾：group_count=${sample.group_count} 而实有 ${groupNumbers.length} 组`);
const expectGroups = groupCountOf(shots.length, perGroup);
if (groupNumbers.length !== expectGroups) throw new Error(`${shots.length} 镜按每 ${perGroup} 镜一组应分 ${expectGroups} 组，实分 ${groupNumbers.length} 组`);

const counts = new Map();
for (const shot of shots) counts.set(shot.group, (counts.get(shot.group) || 0) + 1);
const sizes = groupNumbers.map((n) => counts.get("G" + n) || 0);
const expected = expectedGroupSizes(shots.length, perGroup);
if (sizes.join(",") !== expected.join(",")) throw new Error(`每组条数 ${sizes.join(",")} 与分组公式的期望 ${expected.join(",")} 不一致（每组上限 ${perGroup}，MAX_SHOTS_PER_GROUP 可改）`);

if (!Number.isInteger(sample.qc?.rounds) || sample.qc.rounds < 1) throw new Error("参考片必须至少建模 1 轮 QC");
if (sample.qc.recheck !== true) throw new Error("参考片必须建模复验（qc.recheck === true）");

console.log("reference sample PASS", JSON.stringify({
  shots: shots.length,
  groups: sizes.length,
  per_group: sizes.join("/"),
  max_per_group: perGroup,
  qc_rounds: sample.qc.rounds,
  settle_min: CAMERA_LIMITS.clear,
  still_kinds: STILL_FRAMES_PER_SCENE,
}));
