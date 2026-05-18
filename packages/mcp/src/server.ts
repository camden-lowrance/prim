import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { invokePrim } from "../../core/src/invoke";
import { JsonlLedgerBackend } from "../../core/src/ledger-jsonl";
import { resolveRuntimeLedgerPath } from "../../core/src/project-config";
import { actorSchema, externalRefSchema, subjectSchema } from "../../core/src/schema";
import type { PrimOp } from "../../core/src/types";

const ledgerPath = await resolveRuntimeLedgerPath();
const ledger = new JsonlLedgerBackend(ledgerPath);

const server = new McpServer({
  name: "prim",
  version: "0.1.0"
});

const baseShape = {
  actor: actorSchema.optional(),
  subject: subjectSchema
};

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function defaultActor(op: PrimOp) {
  return {
    id: `agent:mcp:${op}`,
    kind: "agent"
  };
}

server.registerTool(
  "prim_observe",
  {
    description: "Return canonical projected state for a subject.",
    inputSchema: z.object(baseShape)
  },
  async ({ actor, subject }) =>
    jsonResult(
      await invokePrim(
        { op: "observe", actor: actor ?? defaultActor("observe"), subject, input: {} },
        ledger
      )
    )
);

server.registerTool(
  "prim_issue",
  {
    description: "Document a new work item in the Prim ledger.",
    inputSchema: z.object({
      ...baseShape,
      title: z.string().min(1),
      body: z.string().min(1),
      priority: z.string().min(1).optional(),
      source: externalRefSchema.optional()
    })
  },
  async ({ actor, subject, title, body, priority, source }) =>
    jsonResult(
      await invokePrim(
        {
          op: "issue",
          actor: actor ?? defaultActor("issue"),
          subject,
          input: { title, body, priority, source }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_record",
  {
    description: "Append a structured fact, finding, claim, note, risk, or evidence item.",
    inputSchema: z.object({
      ...baseShape,
      kind: z.string().min(1),
      body: z.string().min(1),
      confidence: z.number().min(0).max(1).optional()
    })
  },
  async ({ actor, subject, kind, body, confidence }) =>
    jsonResult(
      await invokePrim(
        {
          op: "record",
          actor: actor ?? defaultActor("record"),
          subject,
          input: { kind, body, confidence }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_ask",
  {
    description: "Create a guidance request or unresolved question.",
    inputSchema: z.object({
      ...baseShape,
      question: z.string().min(1),
      blocking: z.boolean().default(false)
    })
  },
  async ({ actor, subject, question, blocking }) =>
    jsonResult(
      await invokePrim(
        {
          op: "ask",
          actor: actor ?? defaultActor("ask"),
          subject,
          input: { question, blocking }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_decide",
  {
    description: "Record a decision and optional question closure.",
    inputSchema: z.object({
      ...baseShape,
      decision: z.string().min(1),
      rationale: z.string().min(1).optional(),
      closes_question_id: z.string().min(1).optional()
    })
  },
  async ({ actor, subject, decision, rationale, closes_question_id }) =>
    jsonResult(
      await invokePrim(
        {
          op: "decide",
          actor: actor ?? defaultActor("decide"),
          subject,
          input: { decision, rationale, closes_question_id }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_claim",
  {
    description: "Mark an actor as actively working a scope.",
    inputSchema: z.object({
      ...baseShape,
      scope: z.string().min(1)
    })
  },
  async ({ actor, subject, scope }) =>
    jsonResult(
      await invokePrim(
        {
          op: "claim",
          actor: actor ?? defaultActor("claim"),
          subject,
          input: { scope }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_handoff",
  {
    description: "Transfer or release context for another actor or thread.",
    inputSchema: z.object({
      ...baseShape,
      from: z.string().min(1).optional(),
      to: z.string().min(1).optional(),
      summary: z.string().min(1)
    })
  },
  async ({ actor, subject, from, to, summary }) =>
    jsonResult(
      await invokePrim(
        {
          op: "handoff",
          actor: actor ?? defaultActor("handoff"),
          subject,
          input: { from, to, summary }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_link",
  {
    description: "Attach an external artifact reference.",
    inputSchema: z.object({
      ...baseShape,
      target: externalRefSchema
    })
  },
  async ({ actor, subject, target }) =>
    jsonResult(
      await invokePrim(
        {
          op: "link",
          actor: actor ?? defaultActor("link"),
          subject,
          input: { target }
        },
        ledger
      )
    )
);

server.registerTool(
  "prim_complete",
  {
    description: "Mark a subject or scope complete when blockers are closed.",
    inputSchema: z.object({
      ...baseShape,
      summary: z.string().min(1).optional(),
      scope: z.string().min(1).optional()
    })
  },
  async ({ actor, subject, summary, scope }) =>
    jsonResult(
      await invokePrim(
        {
          op: "complete",
          actor: actor ?? defaultActor("complete"),
          subject,
          input: { summary, scope }
        },
        ledger
      )
    )
);

await server.connect(new StdioServerTransport());
