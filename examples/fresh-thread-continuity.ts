import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface PrimOutput {
  accepted?: boolean;
  event_id?: string;
  state?: {
    status: string;
    open_questions: Array<{ id: string }>;
    decisions: unknown[];
    records: unknown[];
    links: unknown[];
    recent_events: Array<{ actor: { id: string } }>;
  };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "packages", "cli", "src", "index.ts");
const project = "fresh-thread-continuity";
const subject = ["issue", "AUTH-142"];

rmSync(path.join(root, "data", "projects", project), {
  force: true,
  recursive: true
});

console.log("Prim fresh-thread continuity demo");
console.log("");

run(["project", "init", ".", "--name", project, "--force"], "Init demo ledger");

prim(
  "agent:a",
  [
    "issue",
    subject[1],
    "--title",
    "Refresh-token compatibility",
    "--body",
    "Track the coordination state for the auth compatibility fix."
  ],
  "Agent A creates the subject"
);

prim(
  "agent:a",
  [
    "record",
    ...subject,
    "--kind",
    "finding",
    "--body",
    "Root cause likely caused by stale refresh-token cache invalidation.",
    "--confidence",
    "0.72"
  ],
  "Agent A records state"
);

prim(
  "agent:a",
  [
    "ask",
    ...subject,
    "--question",
    "Should legacy refresh-token behavior be preserved for one release cycle?",
    "--blocking"
  ],
  "Agent A asks a blocking question"
);

const observedByB = prim(
  "agent:b",
  ["observe", ...subject],
  "Agent B observes canonical state"
);
const questionId = observedByB.state?.open_questions[0]?.id;

if (!questionId) {
  throw new Error("demo expected one open question");
}

prim(
  "agent:b",
  [
    "decide",
    ...subject,
    "--decision",
    "Preserve legacy refresh-token behavior for one release cycle.",
    "--rationale",
    "Reduces migration risk for active sessions.",
    "--closes-question-id",
    questionId
  ],
  "Agent B records a decision"
);

prim(
  "agent:b",
  [
    "link",
    ...subject,
    "--type",
    "change_request",
    "--id",
    "review#442",
    "--url",
    "https://example.com/review/442"
  ],
  "Agent B links an external ref"
);

const observedByC = prim(
  "agent:c",
  ["observe", ...subject],
  "Agent C observes and can continue"
);

prim(
  "agent:c",
  [
    "complete",
    ...subject,
    "--summary",
    "Decision recorded, external ref linked, and no blocking questions remain."
  ],
  "Agent C completes the subject"
);

const finalState = prim(
  "agent:c",
  ["subject", ...subject],
  "Final projected state"
);

console.log("");
console.log("Fresh threads do not need prior chat history.");
console.log("They observe canonical operational state.");
console.log("");
console.log(
  JSON.stringify(
    {
      subject: subject.join(":"),
      status_before_completion: observedByC.state?.status,
      final_status: finalState.state?.status,
      records: finalState.state?.records.length,
      open_questions: finalState.state?.open_questions.length,
      decisions: finalState.state?.decisions.length,
      links: finalState.state?.links.length,
      recent_actors: [
        ...new Set(
          finalState.state?.recent_events.map((event) => event.actor.id) ?? []
        )
      ]
    },
    null,
    2
  )
);

function prim(actor: string, args: string[], label: string): PrimOutput {
  return run(["--project", project, "--actor", actor, ...args], label);
}

function run(args: string[], label: string): PrimOutput {
  console.log(`\n# ${label}`);
  console.log(`$ prim ${args.map(shellArg).join(" ")}`);

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", cliPath, ...args],
    {
      cwd: root,
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `command failed: prim ${args.join(" ")}`,
        result.stdout,
        result.stderr
      ].join("\n")
    );
  }

  const output = JSON.parse(result.stdout) as PrimOutput;
  printSummary(output);
  return output;
}

function printSummary(output: PrimOutput): void {
  if (output.event_id) {
    console.log(`event: ${output.event_id}`);
  }

  if (output.state) {
    console.log(`status: ${output.state.status}`);
    console.log(`open_questions: ${output.state.open_questions.length}`);
    console.log(`decisions: ${output.state.decisions.length}`);
    console.log(`links: ${output.state.links.length}`);
  } else if (output.accepted !== undefined) {
    console.log(`accepted: ${output.accepted}`);
  }
}

function shellArg(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
