import { initProjectConfig, installProjectConfig } from "../../core/src/project-config";
import type { InitProjectResult, InstallProjectResult } from "../../core/src/project-config";
import { invokePrim } from "../../core/src/invoke";
import { JsonlLedgerBackend } from "../../core/src/ledger-jsonl";
import { projectSubjectState } from "../../core/src/projector";
import { resolveRuntimeLedgerPath } from "../../core/src/project-config";
import {
  PRIM_OPS,
  type ExternalRef,
  type PrimEvent,
  type PrimInvokeRequest,
  type PrimOp,
  type SubjectRef,
  type SubjectState
} from "../../core/src/types";

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

  if (group === "subject") {
    const subject = parseSubjectArgs(command, rest);
    const ledgerPath = await resolveRuntimeLedgerPath();
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const events = await ledger.listEvents(subject);
    writeJson({
      ledger: ledgerPath,
      state: projectSubjectState(subject, events)
    });
    return;
  }

  if (group === "status") {
    const args = compactArgs([command, ...rest]);
    if (args.length > 0) {
      throw new Error(`unknown argument: ${args[0]}`);
    }
    const ledgerPath = await resolveRuntimeLedgerPath();
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const events = await ledger.query({});
    writeJson({
      ledger: ledgerPath,
      ...buildStatus(events)
    });
    return;
  }

  if (group === "report") {
    const flags = parseFlags(compactArgs([command, ...rest]), ["since"]);
    const since = parseSince(flags.since ?? "today");
    const ledgerPath = await resolveRuntimeLedgerPath();
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const events = await ledger.query({});
    writeJson({
      ledger: ledgerPath,
      ...buildReport(events, since)
    });
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

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function parseSubjectArgs(
  subjectType: string | undefined,
  argv: string[]
): SubjectRef {
  const [subjectId, ...rest] = argv;
  if (!subjectType || !subjectId) {
    throw new Error("usage: prim subject <subject-type> <subject-id>");
  }
  if (rest.length > 0) {
    throw new Error(`unknown argument: ${rest[0]}`);
  }
  return { type: subjectType, id: subjectId };
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

  if (op === "issue") {
    const flags = parseFlags(argv, ["title", "body", "priority"], ["title", "body"]);
    return {
      title: requireFlag(flags, "title"),
      body: requireFlag(flags, "body"),
      ...(flags.priority ? { priority: flags.priority } : {})
    };
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

interface SubjectSummary {
  subject: SubjectRef;
  status: SubjectState["status"];
  title?: string;
  priority?: string;
  last_event_ts?: string;
  claims: number;
  open_questions: number;
  links: number;
}

function buildStatus(events: PrimEvent[]) {
  const summaries = summarizeSubjects(events);
  return {
    total_events: events.length,
    active_subjects: summaries.filter((summary) => summary.status !== "complete"),
    completed_subjects: summaries.filter((summary) => summary.status === "complete"),
    last_event_ts: newestTimestamp(events)
  };
}

function buildReport(events: PrimEvent[], since: Date) {
  const sinceIso = since.toISOString();
  const sinceEvents = events.filter((event) => event.ts >= sinceIso);
  const summaries = summarizeSubjects(
    events.filter((event) => hasSubjectEventSince(event.subject, sinceEvents))
  );
  const completedKeys = new Set(
    sinceEvents
      .filter((event) => event.op === "complete")
      .map((event) => subjectKey(event.subject))
  );

  return {
    since: sinceIso,
    generated_at: new Date().toISOString(),
    total_events: sinceEvents.length,
    completed_work: summaries.filter((summary) =>
      completedKeys.has(subjectKey(summary.subject))
    ),
    open_work: summaries.filter((summary) => summary.status !== "complete"),
    decisions: sinceEvents
      .filter((event) => event.op === "decide")
      .map((event) => ({
        ts: event.ts,
        subject: event.subject,
        decision: event.input.decision,
        rationale: event.input.rationale
      })),
    test_evidence: sinceEvents
      .filter(
        (event) =>
          event.op === "record" && event.input.kind === "test_evidence"
      )
      .map((event) => ({
        ts: event.ts,
        subject: event.subject,
        body: event.input.body
      }))
  };
}

function summarizeSubjects(events: PrimEvent[]): SubjectSummary[] {
  const groups = groupEventsBySubject(events);
  return Array.from(groups.values())
    .map(({ subject, events: subjectEvents }) => {
      const state = projectSubjectState(subject, subjectEvents);
      const lastEvent = subjectEvents
        .slice()
        .sort((a, b) => a.ts.localeCompare(b.ts))
        .at(-1);
      return {
        subject,
        status: state.status,
        title: state.issue?.title,
        priority: state.issue?.priority,
        last_event_ts: lastEvent?.ts,
        claims: state.claims.length,
        open_questions: state.open_questions.length,
        links: state.links.length
      };
    })
    .sort((a, b) => (b.last_event_ts ?? "").localeCompare(a.last_event_ts ?? ""));
}

function groupEventsBySubject(events: PrimEvent[]): Map<
  string,
  { subject: SubjectRef; events: PrimEvent[] }
> {
  const groups = new Map<string, { subject: SubjectRef; events: PrimEvent[] }>();
  for (const event of events) {
    const key = subjectKey(event.subject);
    const group = groups.get(key) ?? { subject: event.subject, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return groups;
}

function hasSubjectEventSince(
  subject: SubjectRef,
  sinceEvents: PrimEvent[]
): boolean {
  const key = subjectKey(subject);
  return sinceEvents.some((event) => subjectKey(event.subject) === key);
}

function subjectKey(subject: SubjectRef): string {
  return `${subject.type}:${subject.id}`;
}

function newestTimestamp(events: PrimEvent[]): string | undefined {
  return events.map((event) => event.ts).sort().at(-1);
}

function parseSince(value: string): Date {
  if (value === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`invalid --since value: ${value}`);
  }
  return parsed;
}

function compactArgs(argv: Array<string | undefined>): string[] {
  return argv.filter((arg): arg is string => Boolean(arg));
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
usage: prim subject <subject-type> <subject-id>
usage: prim status
usage: prim report --since <date-or-today>
usage: prim project <init|install> --repo <path> --github <owner/repo>`;
}

function primitiveUsage(): string {
  return [
    "usage: prim observe <subject-type> <subject-id>",
    "usage: prim issue <subject-type> <subject-id> --title <title> --body <body> [--priority <priority>]",
    "usage: prim claim <subject-type> <subject-id> --scope <scope>",
    "usage: prim record <subject-type> <subject-id> --kind <kind> --body <body>",
    "usage: prim link <subject-type> <subject-id> --type <type> (--id <id> | --url <url>)",
    "usage: prim complete <subject-type> <subject-id> --summary <summary>",
    "",
    "examples:",
    "  prim issue issue 123 --title \"Add login\" --body \"Create a durable work item before linking GitHub\"",
    "  prim observe issue 123",
    "  prim claim repo_policy prim_dogfood/background-worker --scope implementation"
  ].join("\n");
}

function isPrimitiveOp(value: string | undefined): value is PrimOp {
  return Boolean(value && PRIM_OPS.includes(value as PrimOp));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
