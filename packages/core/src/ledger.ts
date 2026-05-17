import type { LedgerQuery, PrimEvent, SubjectRef } from "./types";

export interface LedgerBackend {
  append(event: PrimEvent): Promise<PrimEvent>;
  listEvents(subject: SubjectRef): Promise<PrimEvent[]>;
  query(query: LedgerQuery): Promise<PrimEvent[]>;
}

