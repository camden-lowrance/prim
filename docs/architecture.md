# Architecture

Prim starts small.

```text
Agent / Human / Adapter
        |
JSON primitive
        |
Prim API
        |
Validation + transition rules
        |
Ledger append/query
        |
State projection
        |
Adapters / MCP / read-only views
```

## Modules

- `packages/core`: schemas, transition rules, ledger interface, projector, invoke path
- `packages/server`: HTTP `POST /v1/invoke`
- `packages/mcp`: stdio MCP tools
- `packages/adapters/github`: GitHub mapping stub
- `examples`: repeatable local demo

## Event Model

Events are append-only JSON.

```json
{
  "id": "evt_...",
  "ts": "2026-05-17T00:00:00.000Z",
  "op": "record",
  "actor": { "id": "agent:thread-a", "kind": "agent" },
  "subject": { "type": "issue", "id": "AUTH-142" },
  "input": {},
  "result": { "accepted": true },
  "links": [],
  "meta": { "schema_version": "0.1.0" }
}
```

`observe` is read-only and is not appended.

## Projected State

The projector derives current state from events:

```text
events[] -> subject_state
```

State includes:

- `status`
- `claims`
- `open_questions`
- `decisions`
- `records`
- `links`
- `handoffs`
- `recent_events`
- `next_valid_ops`

## Transition Rules

Current rules are minimal:

- `observe`, `record`, and `ask` are always allowed.
- `claim` rejects an active claim on the same scope by another actor.
- `decide` can close an open question by `closes_question_id`.
- `link` deduplicates in projection and returns a warning on duplicate.
- `complete` rejects while blocking questions remain.
- completed subjects only allow `observe`, `record`, and `link`.

`complete` is a semantic assertion by the actor. Core does not inspect GitHub,
Jira, Linear, CI, or deploy state. Adapters and agents must check the external
source of truth before calling `complete`.

For GitHub-backed work, Prim stays in progress while the PR is merely open,
green, or awaiting review. The subject is completed only after GitHub says the
work is done, normally through a merge or closed issue.

## Beads Path

Current backend:

- `JsonlLedgerBackend`

Planned backend:

- `BeadsLedgerBackend`

Integration path:

1. Map Prim subjects to Beads issue IDs or Beads metadata.
2. Store each Prim event as structured Beads data or an attached JSON event.
3. Query Beads by subject key.
4. Keep Prim projection logic outside Beads at first.
5. Add drift checks between Beads state and external adapters.

Beads should be the durable agent memory backend. Prim should stay the primitive and transition layer.

## Temporal Path

Temporal is not required for the MVP.

Later, Prim can append semantic events and let Temporal execute durable side effects:

- sync GitHub comments
- wait for CI
- retry Jira updates
- run adapter reconciliation
- schedule drift checks

Prim should not become Temporal. Prim handles semantic state. Temporal handles durable execution.

## Open Questions

- Should rejected transition attempts also be appended?
- Should `handoff` release claims by default?
- Should `decide` support matching questions by text, or only explicit IDs?
- Should `complete` close claims automatically?
- What is the exact Beads storage mapping?
- Should the first read-only dashboard be CLI-only or browser-based?
- What drift checks belong in core versus adapters?
- Should external systems ever write directly, or only through adapters?
