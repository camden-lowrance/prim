import { initProjectConfig, installProjectConfig } from "../../core/src/project-config";
import type { InitProjectResult, InstallProjectResult } from "../../core/src/project-config";
import { invokePrim } from "../../core/src/invoke";
import { JsonlLedgerBackend } from "../../core/src/ledger-jsonl";
import { resolveRuntimeLedgerPath } from "../../core/src/project-config";
import { PRIM_OPS, type ExternalRef, type PrimInvokeRequest, type PrimOp } from "../../core/src/types";

interface ProjectInitArgs {
  repoPath?: string;
  githubRepo?: string;
  project?: string;
  force: boolean;
}

async function main(argv: string[]): Promise<void> {
  const [group, command, ...rest] = argv;

  if (isPrimitiveOp(group)) {
    const request = parsePrimitiveArgs(group, command, rest);
    const ledgerPath = await resolveRuntimeLedgerPath();
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const result = await invokePrim(request, ledger);

    console.log(
      JSON.stringify(
        {
          ledger: ledgerPath,
          ...result
        },
        null,
        2
      )
    );

    if (!result.accepted) {
      process.exitCode = 1;
    }
    return;
  }

  if (group === "project" && (command === "init" || command === "install")) {
    const args = parseProjectInitArgs(rest);
    if (!args.repoPath || !args.githubRepo) {
      throw new Error(projectUsage());
    }

    const result =
      command === "install"
        ? await installProjectConfig({
            repoPath: args.repoPath,
            githubRepo: args.githubRepo,
            project: args.project,
            force: args.force
          })
        : await initProjectConfig({
            repoPath: args.repoPath,
            githubRepo: args.githubRepo,
            project: args.project,
            force: args.force
          });

    console.log(
      JSON.stringify(
        {
          command,
          project: result.config.project,
          repo_path: result.config.repo_path,
          github_repo: result.config.github_repo,
          ledger: result.config.ledger,
          config_path: result.configPath,
          config_written: result.configWritten,
          ledger_created: result.ledgerCreated,
          ...(isInstallResult(result)
            ? {
                manifest_path: result.manifestPath,
                manifest_written: result.manifestWritten
              }
            : {})
        },
        null,
        2
      )
    );
    return;
  }

  throw new Error(projectUsage());
}

function parsePrimitiveArgs(
  op: PrimOp,
  subjectType: string | undefined,
  argv: string[]
): PrimInvokeRequest {
  const [subjectId, ...rest] = argv;
  if (!subjectType || !subjectId) {
    throw new Error(primitiveUsage());
  }

  return {
    op,
    actor: {
      id: "agent:cli",
      kind: "agent"
    },
    subject: {
      type: subjectType,
      id: subjectId
    },
    input: parsePrimitiveInput(op, rest)
  };
}

function parsePrimitiveInput(op: PrimOp, argv: string[]): Record<string, unknown> {
  if (op === "observe") {
    if (argv.length > 0) {
      throw new Error(`unknown argument: ${argv[0]}`);
    }
    return {};
  }

  if (op === "claim") {
    const flags = parseFlags(argv, ["scope"]);
    return { scope: requireFlag(flags, "scope") };
  }

  if (op === "record") {
    const flags = parseFlags(argv, ["kind", "body", "confidence"], ["body"]);
    const confidence = flags.confidence ? Number(flags.confidence) : undefined;
    if (flags.confidence && Number.isNaN(confidence)) {
      throw new Error("--confidence must be a number");
    }
    return {
      kind: requireFlag(flags, "kind"),
      body: requireFlag(flags, "body"),
      ...(confidence === undefined ? {} : { confidence })
    };
  }

  if (op === "link") {
    const flags = parseFlags(argv, ["type", "id", "url", "title"], ["title"]);
    const target: ExternalRef = {
      type: requireFlag(flags, "type"),
      ...(flags.id ? { id: flags.id } : {}),
      ...(flags.url ? { url: flags.url } : {}),
      ...(flags.title ? { title: flags.title } : {})
    };
    return { target };
  }

  if (op === "complete") {
    const flags = parseFlags(argv, ["summary", "scope"], ["summary"]);
    return {
      summary: requireFlag(flags, "summary"),
      ...(flags.scope ? { scope: flags.scope } : {})
    };
  }

  throw new Error(`CLI primitive not supported yet: ${op}`);
}

function parseProjectInitArgs(argv: string[]): ProjectInitArgs {
  const parsed: ProjectInitArgs = { force: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--repo") {
      parsed.repoPath = readValue(argv, (index += 1), arg);
    } else if (arg === "--github") {
      parsed.githubRepo = readValue(argv, (index += 1), arg);
    } else if (arg === "--project") {
      parsed.project = readValue(argv, (index += 1), arg);
    } else if (arg === "--force") {
      parsed.force = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function parseFlags(
  argv: string[],
  allowed: string[],
  multiValue: string[] = []
): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith("--")) {
      throw new Error(`unknown argument: ${flag}`);
    }

    const name = flag.slice(2);
    if (!allowed.includes(name)) {
      throw new Error(`unknown argument: ${flag}`);
    }

    if (multiValue.includes(name)) {
      const values: string[] = [];
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) {
        values.push(argv[(index += 1)]);
      }
      if (values.length === 0) {
        throw new Error(`missing value for ${flag}`);
      }
      parsed[name] = values.join(" ");
    } else {
      parsed[name] = readValue(argv, (index += 1), flag);
    }
  }

  return parsed;
}

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value) {
    throw new Error(`missing --${name}`);
  }
  return value;
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`missing value for ${flag}`);
  }
  return value;
}

function isInstallResult(
  result: InitProjectResult | InstallProjectResult
): result is InstallProjectResult {
  return "manifestPath" in result;
}

function projectUsage(): string {
  return `${primitiveUsage()}
usage: prim project <init|install> --repo <path> --github <owner/repo>`;
}

function primitiveUsage(): string {
  return [
    "usage: prim observe issue <id>",
    "usage: prim claim issue <id> --scope <scope>",
    "usage: prim record issue <id> --kind <kind> --body <body>",
    "usage: prim link issue <id> --type <type> (--id <id> | --url <url>)",
    "usage: prim complete issue <id> --summary <summary>"
  ].join("\n");
}

function isPrimitiveOp(value: string | undefined): value is PrimOp {
  return Boolean(value && PRIM_OPS.includes(value as PrimOp));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
