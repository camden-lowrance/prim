import type {
  ClaimItem,
  DecisionItem,
  ExternalRef,
  HandoffItem,
  OpenQuestion,
  PrimEvent,
  PrimOp,
  RecordItem,
  SubjectRef,
  SubjectState
} from "./types";

export function projectSubjectState(
  subject: SubjectRef,
  events: PrimEvent[]
): SubjectState {
  const sorted = events
    .filter(
      (event) =>
        event.subject.type === subject.type && event.subject.id === subject.id
    )
    .sort((a, b) => a.ts.localeCompare(b.ts));

  const records: RecordItem[] = [];
  const openQuestions = new Map<string, OpenQuestion>();
  const decisions: DecisionItem[] = [];
  const claims = new Map<string, ClaimItem>();
  const links = new Map<string, ExternalRef>();
  const handoffs: HandoffItem[] = [];
  let completed = false;

  for (const event of sorted) {
    switch (event.op) {
      case "record":
        records.push({
          id: event.id,
          ts: event.ts,
          actor: event.actor,
          kind: String(event.input.kind),
          body: String(event.input.body),
          confidence:
            typeof event.input.confidence === "number"
              ? event.input.confidence
              : undefined
        });
        break;

      case "ask":
        openQuestions.set(event.id, {
          id: event.id,
          ts: event.ts,
          actor: event.actor,
          question: String(event.input.question),
          blocking: Boolean(event.input.blocking),
          status: "open"
        });
        break;

      case "decide": {
        const closesQuestionId =
          typeof event.input.closes_question_id === "string"
            ? event.input.closes_question_id
            : undefined;
        if (closesQuestionId) {
          openQuestions.delete(closesQuestionId);
        }
        decisions.push({
          id: event.id,
          ts: event.ts,
          actor: event.actor,
          decision: String(event.input.decision),
          rationale:
            typeof event.input.rationale === "string"
              ? event.input.rationale
              : undefined,
          closes_question_id: closesQuestionId
        });
        break;
      }

      case "claim": {
        const scope = String(event.input.scope);
        claims.set(scope, {
          id: event.id,
          ts: event.ts,
          actor: event.actor,
          scope
        });
        break;
      }

      case "handoff":
        handoffs.push({
          id: event.id,
          ts: event.ts,
          actor: event.actor,
          from: typeof event.input.from === "string" ? event.input.from : undefined,
          to: typeof event.input.to === "string" ? event.input.to : undefined,
          summary: String(event.input.summary)
        });
        break;

      case "link": {
        const target = event.input.target as ExternalRef;
        links.set(linkKey(target), target);
        break;
      }

      case "complete":
        completed = true;
        break;
    }
  }

  const openQuestionValues = Array.from(openQuestions.values());
  const claimValues = Array.from(claims.values());
  const hasBlockingQuestions = openQuestionValues.some((question) => question.blocking);
  const status = completed
    ? "complete"
    : hasBlockingQuestions
      ? "blocked"
      : claimValues.length > 0 && records.length > 0
        ? "in_progress"
        : claimValues.length > 0
          ? "claimed"
          : sorted.length > 0
            ? "proposed"
            : "unknown";

  const state: SubjectState = {
    subject,
    status,
    claims: claimValues,
    open_questions: openQuestionValues,
    decisions,
    records,
    links: Array.from(links.values()),
    handoffs,
    recent_events: sorted.slice(-10),
    next_valid_ops: nextValidOps(status, hasBlockingQuestions),
    warnings: []
  };

  return state;
}

export function linkKey(target: ExternalRef): string {
  return [target.type, target.id ?? "", target.url ?? ""].join(":");
}

function nextValidOps(status: SubjectState["status"], blocked: boolean): PrimOp[] {
  if (status === "complete") {
    return ["observe", "record", "link"];
  }

  const ops: PrimOp[] = [
    "observe",
    "record",
    "ask",
    "decide",
    "claim",
    "handoff",
    "link"
  ];

  if (!blocked) {
    ops.push("complete");
  }

  return ops;
}

