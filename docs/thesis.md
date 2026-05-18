# Thesis

Stop building systems designed for humans. Build systems designed for agents.

Most agent frameworks copy human organizations. They model managers, reviewers, planners, crews, meetings, and handoffs. That may be useful for demos, but it is not the main missing layer.

Agents need a small shared state surface:

- durable facts
- valid operations
- state transitions
- replayable history
- synchronization across threads
- links to external artifacts
- drift detection

The core equation:

```text
ledger + shared primitives > orchestration
```

## Claim

The hard part is not making an agent write code.

The hard part is making fresh agent threads know:

- what is true now
- what changed
- what remains open
- what work is claimed
- what is blocked
- what artifact proves progress
- what action is valid next

That is coordination fidelity.

## Prim

Prim is a machine-native coordination substrate.

It accepts JSON primitive calls, validates them, appends events to a durable ledger, and returns projected state.

```text
JSON event in
JSON state out
```

Agents are interchangeable clients. They do not need identity theater. They need to read canonical state and write valid events.

## Non-Goal

Prim is not an orchestration framework.

It should not define PM agents, reviewer agents, architect agents, crews, swarms, or manager loops.

Those are client choices. Prim only owns primitive semantics and projected state.

## Relation To FS Flow

FS Flow coordinates FARMserver work across Jira, GitHub, git worktrees, Beads, readiness gates, executor output, and handoff state.

Prim keeps the reusable part:

- state is outside the chat
- operations are explicit
- transition rules are checked
- external systems are reconciled
- fresh threads can continue without story reconstruction

Prim does not copy external trackers. GitHub, Jira, Linear, prompts, logs, and
documents are sources to rehydrate from or projections to write back to. Prim
stores the agent ledger around that work.

FS Flow remains a full workflow authority for one environment. Prim is the small open primitive layer.
