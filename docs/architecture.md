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
Jira, Linear, CI, deploy state, documents, scripts, or prompt context. Adapters
and agents must check the configured completion source before calling
`complete`.

For external-workflow-backed work, Prim stays in progress while intermediate
lifecycle steps are merely open, green, approved, running, or awaiting review.
The subject is completed only after the configured completion source is done.

## Lifecycle Overlays

Prim projects a cross-lifecycle view from the ledger plus linked external
stores and coordinators. A project can use different stores for different
lifecycle parts:

- intake
- planning
- code
- review
- test
- deploy
- handoff
- completion

Plugins connect each store. Projections write useful Prim state back to those
stores. Prim should not copy every field from those stores.

Lifecycle coordinators execute work outside Prim. Examples include Temporal,
agent orchestration, CI, deploy automation, queues, schedulers, and browser
automation. Coordinators can read Prim state and write back records, links, and
evidence. Prim should not copy their full internal state.

Coordinators do not add new Prim actions. They interact with Prim through the
same primitive vocabulary. Their internal actions stay native to the coordinator
and are recorded in Prim only at ledger boundaries.

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

Later, Prim can append semantic events and let Temporal execute durable side
effects:

- sync GitHub comments
- wait for CI
- retry Jira updates
- run adapter reconciliation
- schedule drift checks

Prim should not become Temporal. Prim handles semantic state. Temporal handles
durable execution.

## Agent Orchestration Path

Agent orchestration is also a lifecycle coordinator. It can decide which agents
run, how they split work, and when they retry. Prim should not own those loops.

Prim should provide the shared state surface for orchestrators:

- current subject state
- active claims
- blockers
- valid next operations
- linked artifacts
- evidence records

The orchestrator performs work. Prim records the ledger.

## Open Questions

- Should rejected transition attempts also be appended?
- Should `handoff` release claims by default?
- Should `decide` support matching questions by text, or only explicit IDs?
- Should `complete` close claims automatically?
- What is the exact Beads storage mapping?
- Should the first read-only dashboard be CLI-only or browser-based?
- What drift checks belong in core versus adapters?
- Should external systems ever write directly, or only through adapters?
