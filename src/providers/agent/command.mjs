import {runAsync} from "../../runtime/spawn.mjs";

/**
 * 外部 Agent provider：把 input 以 JSON 从 stdin 喂进去，期望 stdout 回一个 JSON。
 * 走 spawn 层的原因同 TTS provider —— 自定义命令写错名字时，
 * 要报「哪个命令起不来」，而不是裸 ENOENT 或退出码。
 *
 * `timeoutMs > 0` 时到点杀子进程并报「超时」，与「退出码非 0」分开：
 * 前者是 provider 挂了/卡住，后者是 provider 自己说不干。混在一句话里
 * 就没法决定该重跑还是该改命令。默认 0 = 不限（不改变既有行为）。
 */
export async function commandAgent({input, command, args = [], timeoutMs = 0}) {
  if (!command) throw new Error("agent provider missing command");
  const ms = Number(timeoutMs);
  const opts = {input: JSON.stringify(input)};
  if (Number.isFinite(ms) && ms > 0) opts.timeout = ms;
  const r = await runAsync(command, args, opts);
  if (r.timed_out) throw new Error(`agent command 超时被终止: ${command}（${ms}ms；用 AGENT_TIMEOUT_MS 调整）`);
  if (r.error) throw new Error(`agent command 无法启动: ${r.error}`);
  if (r.status !== 0) throw new Error(`agent failed: exit ${r.status ?? "signal " + r.signal}`);
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error("agent output is not JSON");
  }
}
