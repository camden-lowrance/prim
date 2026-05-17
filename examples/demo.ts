import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { invokePrim } from "../packages/core/src/invoke";
import { JsonlLedgerBackend } from "../packages/core/src/ledger-jsonl";

const ledgerPath = resolve(process.cwd(), "data/demo-events.jsonl");
await rm(ledgerPath, { force: true });

const ledger = new JsonlLedgerBackend(ledgerPath);
const subject = { type: "issue", id: "AUTH-142" };
const agentA = { id: "agent:thread-a", kind: "agent" };
const agentB = { id: "agent:thread-b", kind: "agent" };
const agentC = { id: "agent:thread-c", kind: "agent" };

await invokePrim(
  {
    op: "record",
    actor: agentA,
    subject,
    input: {
      kind: "claim",
      body: "Root cause appears to be stale refresh-token cache invalidation.",
      confidence: 0.72
    }
  },
  ledger
);

await invokePrim(
  {
    op: "ask",
    actor: agentA,
    subject,
    input: {
      question: "Should legacy refresh-token behavior be preserved for one release cycle?",
      blocking: true
    }
  },
  ledger
);

const observedByB = await invokePrim(
  { op: "observe", actor: agentB, subject, input: {} },
  ledger
);

const questionId = observedByB.state?.open_questions[0]?.id;

await invokePrim(
  {
    op: "decide",
    actor: agentB,
    subject,
    input: {
      decision: "Preserve legacy refresh-token behavior for one release cycle.",
      rationale: "Reduces migration risk for existing sessions.",
      closes_question_id: questionId
    }
  },
  ledger
);

await invokePrim(
  {
    op: "link",
    actor: agentC,
    subject,
    input: {
      target: {
        type: "github_pr",
        id: "org/repo#442",
        url: "https://github.com/org/repo/pull/442"
      }
    }
  },
  ledger
);

const finalObservation = await invokePrim(
  { op: "observe", actor: agentC, subject, input: {} },
  ledger
);

const events = await ledger.query({ subject });

console.log(
  JSON.stringify(
    {
      ledger_path: ledgerPath,
      final_state: finalObservation.state,
      event_stream: events.map((event) => ({
        id: event.id,
        ts: event.ts,
        op: event.op,
        actor: event.actor.id,
        input: event.input
      }))
    },
    null,
    2
  )
);

