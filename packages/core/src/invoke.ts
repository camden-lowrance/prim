import { nanoid } from "nanoid";
import type { LedgerBackend } from "./ledger";
import { parseInvokeRequest } from "./schema";
import { projectSubjectState } from "./projector";
import { validateTransition } from "./transitions";
import {
  PRIM_SCHEMA_VERSION,
  type ExternalRef,
  type InvokeResult,
  type PrimEvent,
  type PrimInvokeRequest
} from "./types";

export async function invokePrim(
  raw: unknown,
  ledger: LedgerBackend
): Promise<InvokeResult> {
  const request = parseInvokeRequest(raw);
  const events = await ledger.listEvents(request.subject);
  const state = projectSubjectState(request.subject, events);

  if (request.op === "observe") {
    return {
      accepted: true,
      state
    };
  }

  const check = validateTransition(request, state);
  if (!check.accepted) {
    return {
      accepted: false,
      error: check.reason,
      warnings: check.warnings,
      state
    };
  }

  const event = createEvent(
    request as PrimInvokeRequest & { op: PrimEvent["op"] },
    check.warnings
  );
  await ledger.append(event);
  const nextState = projectSubjectState(request.subject, [...events, event]);

  return {
    accepted: true,
    event_id: event.id,
    state: nextState,
    warnings: check.warnings
  };
}

function createEvent(
  request: PrimInvokeRequest & { op: PrimEvent["op"] },
  warnings: string[]
): PrimEvent {
  return {
    id: `evt_${nanoid(16)}`,
    ts: new Date().toISOString(),
    op: request.op,
    actor: request.actor,
    subject: request.subject,
    input: request.input,
    result: {
      accepted: true,
      warnings: warnings.length > 0 ? warnings : undefined
    },
    links: extractLinks(request),
    meta: {
      schema_version: PRIM_SCHEMA_VERSION
    }
  };
}

function extractLinks(request: PrimInvokeRequest): ExternalRef[] {
  if (request.op === "link") {
    return [request.input.target as ExternalRef];
  }
  return [];
}
