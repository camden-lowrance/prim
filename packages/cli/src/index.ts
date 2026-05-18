import { Command } from "commander";
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

interface LedgerSelection {
  project?: string;
  repoPath?: string;
}

const program = new Command();

program
  .name("prim")
  .description("Machine-native coordination primitives for agentic software work.")
  .version("0.1.0")
  .option("--project <name>", "use a Prim project namespace")
  .option("--repo <path>", "use a repo with an installed .prim.json manifest")
  .option("--actor <actor>", "actor id for appended events", "agent:cli")
  .option("--json", "print JSON output", true)
  .showHelpAfterError();

program
  .command("status")
  .description("Show open and completed work from the selected ledger.")
  .action(run(async (command) => {
    const ledgerPath = await resolveCliLedgerPath(selection(command));
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const events = await ledger.query({});
    writeJson({
      ledger: ledgerPath,
      ...buildStatus(events)
    });
  }));

program
  .command("report")
  .description("Show a compact activity report.")
  .option("--since <date-or-today>", "report start date", "today")
  .action(run(async (options, command) => {
    const ledgerPath = await resolveCliLedgerPath(selection(command));
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const events = await ledger.query({});
    writeJson({
      ledger: ledgerPath,
      ...buildReport(events, parseSince(options.since))
    });
  }));

program
  .command("subject")
  .description("Show projected state for a subject.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .action(run(async (type, id, command) => {
    const ledgerPath = await resolveCliLedgerPath(selection(command));
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const subject = { type, id };
    const events = await ledger.listEvents(subject);
    writeJson({
      ledger: ledgerPath,
      state: projectSubjectState(subject, events)
    });
  }));

const project = program.command("project").description("Manage Prim project namespaces.");

project
  .command("init")
  .description("Create a Prim namespace for a target repo.")
  .argument("<repo>", "target repo path")
  .option("--name <name>", "Prim project name")
  .option("--force", "overwrite existing config", false)
  .action(run(async (repo, options) => {
    const result = await initProjectConfig({
      repoPath: repo,
      project: options.name,
      force: options.force
    });
    writeProjectResult("init", result);
  }));

project
  .command("install")
  .description("Create a Prim namespace and install .prim.json in the target repo.")
  .argument("<repo>", "target repo path")
  .option("--name <name>", "Prim project name")
  .option("--force", "overwrite existing config or manifest", false)
  .action(run(async (repo, options) => {
    const result = await installProjectConfig({
      repoPath: repo,
      project: options.name,
      force: options.force
    });
    writeProjectResult("install", result);
  }));

program
  .command("observe")
  .description("Return canonical projected state for a subject.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .action(runPrimitive((type, id) => request("observe", subject(type, id), {})));

program
  .command("issue")
  .description("Document a new work item.")
  .argument("<subject...>", "issue id, or subject type and id")
  .requiredOption("--title <title>", "issue title")
  .requiredOption("--body <body>", "issue body")
  .option("--priority <priority>", "priority")
  .option("--source-type <type>", "source type")
  .option("--source-id <id>", "source id")
  .option("--source-url <url>", "source URL")
  .option("--source-title <title>", "source title")
  .action(runPrimitive((subjectArgs, options) => {
    const target = subjectFromIssueArgs(subjectArgs);
    return request("issue", target, {
      title: options.title,
      body: options.body,
      ...(options.priority ? { priority: options.priority } : {}),
      ...parseIssueSource(options)
    });
  }));

program
  .command("record")
  .description("Append a fact, finding, note, risk, or evidence item.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--kind <kind>", "record kind")
  .requiredOption("--body <body>", "record body")
  .option("--confidence <number>", "confidence from 0 to 1", parseNumber)
  .action(runPrimitive((type, id, options) =>
    request("record", subject(type, id), {
      kind: options.kind,
      body: options.body,
      ...(options.confidence === undefined ? {} : { confidence: options.confidence })
    })
  ));

program
  .command("ask")
  .description("Create a guidance request or unresolved question.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--question <question>", "question text")
  .option("--blocking", "mark as blocking", false)
  .action(runPrimitive((type, id, options) =>
    request("ask", subject(type, id), {
      question: options.question,
      blocking: options.blocking
    })
  ));

program
  .command("decide")
  .description("Record a decision.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--decision <decision>", "decision text")
  .option("--rationale <rationale>", "decision rationale")
  .option("--closes-question-id <id>", "question id to close")
  .action(runPrimitive((type, id, options) =>
    request("decide", subject(type, id), {
      decision: options.decision,
      ...(options.rationale ? { rationale: options.rationale } : {}),
      ...(options.closesQuestionId
        ? { closes_question_id: options.closesQuestionId }
        : {})
    })
  ));

program
  .command("claim")
  .description("Mark an actor as actively working a scope.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--scope <scope>", "claimed scope")
  .action(runPrimitive((type, id, options) =>
    request("claim", subject(type, id), { scope: options.scope })
  ));

program
  .command("handoff")
  .description("Transfer or release context.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--summary <summary>", "handoff summary")
  .option("--from <actor>", "source actor")
  .option("--to <actor>", "target actor")
  .action(runPrimitive((type, id, options) =>
    request("handoff", subject(type, id), {
      summary: options.summary,
      ...(options.from ? { from: options.from } : {}),
      ...(options.to ? { to: options.to } : {})
    })
  ));

program
  .command("link")
  .description("Attach an external artifact reference.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .requiredOption("--type <type>", "external reference type")
  .option("--id <id>", "external reference id")
  .option("--url <url>", "external reference URL")
  .option("--title <title>", "external reference title")
  .action(runPrimitive((type, id, options) => {
    const target: ExternalRef = {
      type: options.type,
      ...(options.id ? { id: options.id } : {}),
      ...(options.url ? { url: options.url } : {}),
      ...(options.title ? { title: options.title } : {})
    };
    return request("link", subject(type, id), { target });
  }));

program
  .command("complete")
  .description("Mark a subject or scope complete.")
  .argument("<type>", "subject type")
  .argument("<id>", "subject id")
  .option("--summary <summary>", "completion summary")
  .option("--scope <scope>", "completed scope")
  .action(runPrimitive((type, id, options) =>
    request("complete", subject(type, id), {
      ...(options.summary ? { summary: options.summary } : {}),
      ...(options.scope ? { scope: options.scope } : {})
    })
  ));

await program.parseAsync(process.argv);

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function run<T extends unknown[]>(handler: (...args: T) => Promise<void>) {
  return (...args: T) =>
    handler(...args).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

function runPrimitive<T extends unknown[]>(
  buildRequest: (...args: T) => PrimInvokeRequest
) {
  return run(async (...args: T) => {
    const command = args.at(-1);
    if (!(command instanceof Command)) {
      throw new Error("internal CLI error: missing command context");
    }
    const ledgerPath = await resolveCliLedgerPath(selection(command));
    const ledger = new JsonlLedgerBackend(ledgerPath);
    const primRequest = buildRequest(...args);
    primRequest.actor = actor(command);
    const result = await invokePrim(primRequest, ledger);
    writeJson({
      ledger: ledgerPath,
      ...result
    });

    if (!result.accepted) {
      process.exitCode = 1;
    }
  });
}

function selection(command: Command): LedgerSelection {
  const options = {
    ...program.opts(),
    ...(typeof command.opts === "function" ? command.opts() : {})
  };
  return {
    project: options.project,
    repoPath: options.repo
  };
}

function actor(command: Command) {
  const options = {
    ...program.opts(),
    ...(typeof command.opts === "function" ? command.opts() : {})
  };
  return {
    id: options.actor,
    kind: "agent"
  };
}

async function resolveCliLedgerPath(selection: LedgerSelection): Promise<string> {
  try {
    return await resolveRuntimeLedgerPath(process.cwd(), process.env, selection);
  } catch (error) {
    const target = selection.project
      ? `--project ${selection.project}`
      : selection.repoPath
        ? `--repo ${selection.repoPath}`
        : "current context";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `failed to resolve ledger for ${target} from ${process.cwd()}: ${message}`
    );
  }
}

function request(
  op: PrimOp,
  target: SubjectRef,
  input: Record<string, unknown>
): PrimInvokeRequest {
  return {
    op,
    actor: {
      id: "agent:cli",
      kind: "agent"
    },
    subject: target,
    input
  };
}

function subject(type: string, id: string): SubjectRef {
  return { type, id };
}

function subjectFromIssueArgs(args: string[]): SubjectRef {
  if (args.length === 1) {
    return subject("issue", args[0]);
  }
  if (args.length === 2) {
    return subject(args[0], args[1]);
  }
  throw new Error("usage: prim issue <id> or prim issue <subject-type> <subject-id>");
}

function parseIssueSource(options: Record<string, string | undefined>): {
  source?: ExternalRef;
} {
  if (
    !options.sourceType &&
    !options.sourceId &&
    !options.sourceUrl &&
    !options.sourceTitle
  ) {
    return {};
  }

  if (!options.sourceType) {
    throw new Error("missing --source-type");
  }

  if (!options.sourceId && !options.sourceUrl) {
    throw new Error("source requires --source-id or --source-url");
  }

  return {
    source: {
      type: options.sourceType,
      ...(options.sourceId ? { id: options.sourceId } : {}),
      ...(options.sourceUrl ? { url: options.sourceUrl } : {}),
      ...(options.sourceTitle ? { title: options.sourceTitle } : {})
    }
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error("expected a number");
  }
  return parsed;
}

function writeProjectResult(
  command: string,
  result: InitProjectResult | InstallProjectResult
): void {
  writeJson({
    command,
    project: result.config.project,
    repo_path: result.config.repo_path,
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
  });
}

function isInstallResult(
  result: InitProjectResult | InstallProjectResult
): result is InstallProjectResult {
  return "manifestPath" in result;
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

function subjectKey(target: SubjectRef): string {
  return `${target.type}:${target.id}`;
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
