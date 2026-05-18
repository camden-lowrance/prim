import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { LedgerBackend } from "./ledger";
import type { LedgerQuery, PrimEvent, SubjectRef } from "./types";

export class JsonlLedgerBackend implements LedgerBackend {
  constructor(private readonly filePath: string) {}

  async append(event: PrimEvent): Promise<PrimEvent> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
    return event;
  }

  async listEvents(subject: SubjectRef): Promise<PrimEvent[]> {
    return (await this.query({ subject })).sort((a, b) => a.ts.localeCompare(b.ts));
  }

  async query(query: LedgerQuery = {}): Promise<PrimEvent[]> {
    const events = await this.readAll();
    let filtered = events;

    if (query.subject) {
      filtered = filtered.filter(
        (event) =>
          event.subject.type === query.subject?.type &&
          event.subject.id === query.subject?.id
      );
    }

    if (query.op) {
      filtered = filtered.filter((event) => event.op === query.op);
    }

    if (query.limit && query.limit > 0) {
      filtered = filtered.slice(-query.limit);
    }

    return filtered;
  }

  private async readAll(): Promise<PrimEvent[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return raw
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as PrimEvent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

