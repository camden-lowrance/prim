#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const entry = resolve(rootDir, "packages/cli/src/index.ts");
const tsxLoader = pathToFileURL(resolve(rootDir, "node_modules/tsx/dist/loader.mjs")).href;
const result = spawnSync(process.execPath, ["--import", tsxLoader, entry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit"
});

process.exit(result.status ?? 1);
