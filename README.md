# Prim

The primitives your agent needs.

Prim is a small durability layer for agent threads.

It gives agents a simple way to keep work state outside chat:

- what is true
- what changed
- what is claimed
- what is blocked
- what evidence exists
- what action is valid next

Prim is CLI-first. It is not an API server, protocol server, workflow engine, dashboard, or role framework.

## Core Idea

```text
simple primitives + append-only ledger + projected state
```

Agents write small events. Prim validates those events, appends them to a local ledger, and projects the current state.

The primitive vocabulary is intentionally small:

```text
observe
issue
record
ask
decide
claim
handoff
link
complete
```

## Quickstart

Prim needs Node to run. A target project only needs to be a git repo.

No hosted tracker, server, protocol, or external service is required.

```bash
npm install
npm run check
npm run demo
npm link
```

The demo runs real CLI commands and shows three fresh actors continuing from
the same ledger.

Run from npm with npx:

```bash
npx @camden-lowrance/prim@latest --help
```

From any git repo:

```bash
prim project install .
prim status
```

Create a work subject:

```bash
prim issue 123 --title "Fix auth" --body "Track this work"
```

Claim work:

```bash
prim claim issue 123 --scope implementation
```

Record useful facts:

```bash
prim record issue 123 --kind finding --body "Refresh-token cache is stale after rotation."
```

Link external evidence if you have it:

```bash
prim link issue 123 --type change_request --id review#456 --url https://example.com/review/456
```

Read state:

```bash
prim subject issue 123
prim status
```

Complete work:

```bash
prim complete issue 123 --summary "Merged and verified."
```

CLI output is JSON so agents can parse it directly.

## Local Repo Use

Run without `npm link`:

```bash
npm exec -- prim status
```

Read a report:

```bash
prim report --since today
```

## Project Namespaces

Prim can track separate project ledgers without being vendored into those projects.

Create a namespace:

```bash
prim project init /path/to/sample-app
```

Install a small manifest in a target repo:

```bash
prim project install /path/to/sample-app
```

Read a project ledger:

```bash
prim --project sample-app status
prim --repo /path/to/sample-app status
```

Runtime data lives under `data/` and is ignored by git.

## Backend Scope

The current backend is local-first JSONL.

It is meant for simple local agent use. Parallel multi-writer safety is not
guaranteed yet. A central or shared ledger backend is future work.

## What Prim Is Not

Prim should stay small.

It is not:

- an API server
- a protocol server
- a dashboard
- a chat app
- a workflow engine
- an agent role system
- a replacement for external tools

Bring whatever tools you want. Those tools keep their own state. Prim keeps the small agent ledger around them.

## Docs

- [How Prim works](docs/how-it-works.md)
- [CLI reference](docs/cli.md)
