import {commandAgent} from "./command.mjs";

export function createAgentProvider(env = process.env) {
  if (!env.AGENT_COMMAND) return null;
  const args = env.AGENT_ARGS ? JSON.parse(env.AGENT_ARGS) : [];
  // 0 / 非法值 = 不限时（保持既有行为）。设成毫秒数就是一次硬超时：
  // 卡住的 agent 以前会把 build-groups / qc 整步挂住且没有任何输出。
  const timeoutMs = Number(env.AGENT_TIMEOUT_MS || 0) || 0;
  return {
    run(input) {
      return commandAgent({
        input,
        command: env.AGENT_COMMAND,
        args,
        timeoutMs,
      });
    },
  };
}
