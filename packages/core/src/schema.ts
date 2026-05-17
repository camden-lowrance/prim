import { z } from "zod";
import { PRIM_OPS, type PrimInvokeRequest } from "./types";

export const actorSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1)
});

export const subjectSchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1)
});

export const externalRefSchema = z
  .object({
    type: z.string().min(1),
    id: z.string().min(1).optional(),
    url: z.string().url().optional(),
    title: z.string().min(1).optional()
  })
  .refine((value) => value.id || value.url, {
    message: "target requires id or url"
  });

const baseInvokeSchema = z.object({
  op: z.enum(PRIM_OPS),
  actor: actorSchema.default({ id: "system:unknown", kind: "system" }),
  subject: subjectSchema,
  input: z.record(z.string(), z.unknown()).default({})
});

const inputSchemas = {
  observe: z.object({}).passthrough(),
  issue: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    priority: z.string().min(1).optional()
  }),
  record: z.object({
    kind: z.string().min(1),
    body: z.string().min(1),
    confidence: z.number().min(0).max(1).optional()
  }),
  ask: z.object({
    question: z.string().min(1),
    blocking: z.boolean().default(false)
  }),
  decide: z.object({
    decision: z.string().min(1),
    rationale: z.string().min(1).optional(),
    closes_question_id: z.string().min(1).optional()
  }),
  claim: z.object({
    scope: z.string().min(1),
    actor: z.string().min(1).optional()
  }),
  handoff: z.object({
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
    summary: z.string().min(1)
  }),
  link: z.object({
    target: externalRefSchema
  }),
  complete: z.object({
    summary: z.string().min(1).optional(),
    scope: z.string().min(1).optional()
  })
} as const;

export function parseInvokeRequest(raw: unknown): PrimInvokeRequest {
  const request = baseInvokeSchema.parse(raw);
  const input = inputSchemas[request.op].parse(request.input);
  return {
    ...request,
    input
  };
}

