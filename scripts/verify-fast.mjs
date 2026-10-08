import {spawnSync} from "node:child_process";

const checks = [
  "verify:plan",
  "verify:contracts",
  "verify:approval",
  "verify:build",
  "verify:scheduler",
  "verify:store",
  "verify:visual",
  "verify:visual-grammar",
  "verify:semantic-director",
  "verify:repair",
  "verify:hyperframes",
  "verify:scene-contract",
];

const started = Date.now();
for (const name of checks) {
  const begin = Date.now();
  console.log("\n>>> " + name);
  const result = spawnSync("npm", ["run", name, "--silent"], {stdio: "inherit"});
  if (result.status !== 0) {
    console.error("\nFAST VERIFY FAIL", JSON.stringify({
      failed_check: name,
      elapsed_ms: Date.now() - started,
    }));
    process.exit(result.status ?? 1);
  }
  console.log("<<< " + name + " PASS " + (Date.now() - begin) + "ms");
}

console.log("\nFAST VERIFY PASS", JSON.stringify({
  checks: checks.length,
  elapsed_ms: Date.now() - started,
}));