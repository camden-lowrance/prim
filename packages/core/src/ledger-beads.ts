import type { LedgerBackend } from "./ledger";
import type { LedgerQuery, PrimEvent, SubjectRef } from "./types";

export class BeadsLedgerBackend implements LedgerBackend {
  async append(_event: PrimEvent): Promise<PrimEvent> {
    throw new Error("BeadsLedgerBackend is not implemented yet.");
  }

  async listEvents(_subject: SubjectRef): Promise<PrimEvent[]> {
    throw new Error("BeadsLedgerBackend is not implemented yet.");
  }

  async query(_query: LedgerQuery): Promise<PrimEvent[]> {
    throw new Error("BeadsLedgerBackend is not implemented yet.");
  }
}

