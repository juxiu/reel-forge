import {commandAgent} from "./command.mjs";

export function createAgentProvider(env = process.env) {
  if (!env.AGENT_COMMAND) return null;
  const args = env.AGENT_ARGS ? JSON.parse(env.AGENT_ARGS) : [];
  return {
    run(input) {
      return commandAgent({
        input,
        command: env.AGENT_COMMAND,
        args,
      });
    },
  };
}
