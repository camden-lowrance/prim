# How Prim Works

Prim is a CLI over an append-only JSONL ledger.

```text
command -> validate -> append event -> project state -> print JSON
```

## Files

Runtime files are written under `data/`, which is ignored by git.

Default ledger:

```text
data/prim-events.jsonl
```

Project ledger:

```text
data/projects/<project>/events.jsonl
```

Target repo manifest:

```text
.prim.json
```

The manifest points a target git repo back to its Prim project ledger. It should stay local.

## Event Shape

Every mutating primitive appends one event.

```json
{
  "id": "evt_...",
  "ts": "2026-05-17T00:00:00.000Z",
  "op": "record",
  "actor": { "id": "agent:cli", "kind": "agent" },
  "subject": { "type": "issue", "id": "123" },
  "input": {
    "kind": "finding",
    "body": "Refresh-token cache is stale after rotation."
  },
  "result": { "accepted": true },
  "links": [],
  "meta": { "schema_version": "0.1.0" }
}
```

`observe` is read-only and does not append an event.

## Subject State

State is rebuilt from events.

```json
{
  "subject": { "type": "issue", "id": "123" },
  "status": "in_progress",
  "issue": {},
  "claims": [],
  "open_questions": [],
  "decisions": [],
  "records": [],
  "links": [],
  "handoffs": [],
  "recent_events": [],
  "next_valid_ops": [],
  "warnings": []
}
```

The ledger is source data. Projected state is derived data.

## Commands

Run the continuity demo:

```bash
npm run demo
```

The full CLI reference is generated from the command definitions:

```bash
npm run docs:cli
```

Create a subject:

```bash
prim issue 123 --title "Fix auth" --body "Track this work"
```

Claim work:

```bash
prim claim issue 123 --scope implementation
```

Record a fact:

```bash
prim record issue 123 --kind finding --body "Refresh-token cache is stale after rotation."
```

Ask a blocking question:

```bash
prim ask issue 123 --question "Preserve legacy behavior?" --blocking
```

Record a decision:

```bash
prim decide issue 123 --decision "Preserve behavior for one release." --closes-question-id evt_...
```

Link external evidence:

```bash
prim link issue 123 --type change_request --id review#456 --url https://example.com/review/456
```

Complete work:

```bash
prim complete issue 123 --summary "Merged and verified."
```

Read state:

```bash
prim subject issue 123
prim status
prim report --since today
```

## Project Selection

Use the current repo or default ledger:

```bash
prim status
```

Use a named project:

```bash
prim --project sample-app status
```

Use a target repo manifest:

```bash
prim --repo /path/to/sample-app status
```

Create project metadata:

```bash
prim project init /path/to/sample-app --name sample-app
```

Install a manifest into the target repo:

```bash
prim project install /path/to/sample-app --name sample-app
```

## Transition Rules

Current rules are small:

- `observe`, `record`, and `ask` are always allowed.
- `claim` rejects an active claim on the same scope by another actor.
- `decide` can close an open question by event ID.
- `link` deduplicates in projection.
- `complete` rejects while blocking questions remain.
- completed subjects only allow `observe`, `record`, and `link`.

## Current Limits

Prim is local-first today.

- JSONL is the only backend.
- Parallel multi-writer safety is not guaranteed.
- Idempotency keys are not implemented.
- Shared ledger backends are future work.
- There is no API server or protocol server.
