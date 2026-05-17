#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const tsxBin = resolve(
  rootDir,
  process.platform === "win32" ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx"
);
const entry = resolve(rootDir, "packages/cli/src/index.ts");
const result = spawnSync(tsxBin, [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
