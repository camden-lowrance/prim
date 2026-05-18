import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface HelpTarget {
  title: string;
  args: string[];
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "packages", "cli", "src", "index.ts");
const outputPath = path.join(root, "docs", "cli.md");
const checkOnly = process.argv.includes("--check");

const targets: HelpTarget[] = [
  { title: "prim", args: [] },
  { title: "prim status", args: ["status"] },
  { title: "prim report", args: ["report"] },
  { title: "prim subject", args: ["subject"] },
  { title: "prim project", args: ["project"] },
  { title: "prim project init", args: ["project", "init"] },
  { title: "prim project install", args: ["project", "install"] },
  { title: "prim observe", args: ["observe"] },
  { title: "prim issue", args: ["issue"] },
  { title: "prim record", args: ["record"] },
  { title: "prim ask", args: ["ask"] },
  { title: "prim decide", args: ["decide"] },
  { title: "prim claim", args: ["claim"] },
  { title: "prim handoff", args: ["handoff"] },
  { title: "prim link", args: ["link"] },
  { title: "prim complete", args: ["complete"] }
];

const generated = [
  "# CLI Reference",
  "",
  "Generated from the Prim CLI command definitions.",
  "",
  "Regenerate:",
  "",
  "```bash",
  "npm run docs:cli",
  "```",
  "",
  targets.map(renderHelp).join("\n\n")
].join("\n") + "\n";

if (checkOnly) {
  if (!existsSync(outputPath)) {
    fail("docs/cli.md does not exist. Run npm run docs:cli.");
  }

  const current = readFileSync(outputPath, "utf8");
  if (current !== generated) {
    fail("docs/cli.md is out of date. Run npm run docs:cli.");
  }
} else {
  writeFileSync(outputPath, generated);
}

function renderHelp(target: HelpTarget): string {
  return [
    `## ${target.title}`,
    "",
    "```text",
    runHelp(target.args),
    "```"
  ].join("\n");
}

function runHelp(args: string[]): string {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", cliPath, ...args, "--help"],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    fail(
      [
        `failed to render help for prim ${args.join(" ")}`.trim(),
        result.stdout,
        result.stderr
      ].join("\n")
    );
  }

  return result.stdout.trimEnd();
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
