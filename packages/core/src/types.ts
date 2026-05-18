export const PRIM_SCHEMA_VERSION = "0.1.0";

export const PRIM_OPS = [
  "observe",
  "issue",
  "record",
  "ask",
  "decide",
  "claim",
  "handoff",
  "link",
  "complete"
] as const;

export type PrimOp = (typeof PRIM_OPS)[number];

export type SubjectStatus =
  | "unknown"
  | "proposed"
  | "claimed"
  | "in_progress"
  | "blocked"
  | "complete";

export interface SubjectRef {
  type: string;
  id: string;
}

export interface ActorRef {
  id: string;
  kind: string;
}

export interface ExternalRef {
  type: string;
  id?: string;
  url?: string;
  title?: string;
}

export interface PrimInvokeRequest {
  op: PrimOp;
  actor: ActorRef;
  subject: SubjectRef;
  input: Record<string, unknown>;
}

export interface PrimEvent {
  id: string;
  ts: string;
  op: Exclude<PrimOp, "observe">;
  actor: ActorRef;
  subject: SubjectRef;
  input: Record<string, unknown>;
  result: {
    accepted: true;
    warnings?: string[];
  };
  links: ExternalRef[];
  meta: {
    schema_version: string;
  };
}

export interface RecordItem {
  id: string;
  ts: string;
  actor: ActorRef;
  kind: string;
  body: string;
  confidence?: number;
}

export interface OpenQuestion {
  id: string;
  ts: string;
  actor: ActorRef;
  question: string;
  blocking: boolean;
  status: "open";
}

export interface DecisionItem {
  id: string;
  ts: string;
  actor: ActorRef;
  decision: string;
  rationale?: string;
  closes_question_id?: string;
}

export interface ClaimItem {
  id: string;
  ts: string;
  actor: ActorRef;
  scope: string;
}

export interface HandoffItem {
  id: string;
  ts: string;
  actor: ActorRef;
  from?: string;
  to?: string;
  summary: string;
}

export interface IssueItem {
  id: string;
  ts: string;
  actor: ActorRef;
  title: string;
  body: string;
  priority?: string;
  source?: ExternalRef;
}

export interface SubjectState {
  subject: SubjectRef;
  status: SubjectStatus;
  issue?: IssueItem;
  claims: ClaimItem[];
  open_questions: OpenQuestion[];
  decisions: DecisionItem[];
  records: RecordItem[];
  links: ExternalRef[];
  handoffs: HandoffItem[];
  recent_events: PrimEvent[];
  next_valid_ops: PrimOp[];
  warnings: string[];
}

export interface InvokeResult {
  accepted: boolean;
  event_id?: string;
  state?: SubjectState;
  error?: string;
  warnings?: string[];
}

export interface LedgerQuery {
  subject?: SubjectRef;
  op?: PrimEvent["op"];
  limit?: number;
}

