# Prim

Prim is a machine-native coordination substrate for agentic software work.

Prim proves that agents do not need orchestration.
They need shared state, valid operations, and durable memory.

The bottleneck in software delivery is not code generation.
It is coordination fidelity.

Prim does not replace Jira, GitHub, Linear, Temporal, or your SDLC.
It gives agents a machine-native state layer that synchronizes across them.
External systems are sources and projections. Prim stores the agent ledger:
what was claimed, what was decided, what evidence exists, and what changed.

## Shape

```text
JSON event in
JSON state out
```

Prim exposes a small primitive vocabulary:

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

The ledger is append-only. Current state is projected from events.

## First Pass

This repo includes:

- TypeScript core primitive handling
- Zod request validation
- JSONL ledger backend
- projected subject state
- minimal transition rules
- HTTP `POST /v1/invoke`
- MCP stdio server with one tool per primitive
- GitHub adapter stub
- lifecycle overlay guidance in `docs/lifecycle-overlays.md`
- repeatable `AUTH-142` demo

## Run

```bash
npm install
npm run check
npm run demo
```

Start the HTTP API:

```bash
npm run server
```

Then invoke:

```bash
curl -X POST http://localhost:8787/v1/invoke \
  -H "content-type: application/json" \
  -d "{\"op\":\"observe\",\"actor\":{\"id\":\"agent:curl\",\"kind\":\"agent\"},\"subject\":{\"type\":\"issue\",\"id\":\"AUTH-142\"},\"input\":{}}"
```

`examples/auth-142.json` is a sequence file for humans. For the HTTP endpoint, send one object at a time.

Start the MCP server:

```bash
npm run mcp
```

Runtime JSONL files are written under `data/` and ignored by git.

Read projected ledger state:

```bash
npm exec -- prim issue 123 --title "Add login" --body "Rehydrate this work from a prompt" --source-type prompt --source-id prompt-2026-05-17
npm exec -- prim issue 456 --title "Fix auth" --body "Rehydrate from GitHub" --source-type github_issue --source-id owner/repo#456 --source-url https://github.com/owner/repo/issues/456
npm exec -- prim subject issue 123
npm exec -- prim status
npm exec -- prim report --since today
```

Use `prim issue` to document the ledger subject that agents coordinate around.
Use `prim link` to attach GitHub PRs, issue URLs, documents, logs, or other
external artifacts. Do not mirror every tracker field into Prim.

For external-workflow-backed work, each lifecycle part can have its own source
of truth. Jira can own issue tracking while GitHub owns code and PRs. Deploy
tools can own deploy state. Documents can own signoff. Prim records the agent
ledger across those stores. Do not run `prim complete` until the configured
completion source is done. See `docs/lifecycle-overlays.md`.

Ledger commands accept explicit selection when cwd is not enough:

```bash
npm exec -- prim --project rei-miner status
npm exec -- prim --repo C:\Users\camde\Documents\GitHub\rei-miner status
```

## Project Namespaces

Prim is managed as a sidecar control layer. Target repositories keep their own
code truth. Prim stores coordination truth under `data/projects/<project>/`.

Initialize a target repo namespace:

```bash
npm exec -- prim project init --repo C:\Users\camde\Documents\GitHub\rei-miner --github vvvanguards/rei-miner
```

That writes:

```text
data/projects/rei-miner/project.json
data/projects/rei-miner/events.jsonl
```

Install the minimal target-repo manifest:

```bash
npm exec -- prim project install --repo C:\Users\camde\Documents\GitHub\rei-miner --github vvvanguards/rei-miner
```

That also writes `rei-miner/.prim.json`. It does not vendor Prim code into the target repo.

Run the HTTP or MCP servers against that namespace:

```bash
$env:PRIM_PROJECT = "rei-miner"
npm run server
```

## Position

Prim should integrate with Beads for durable agent memory, with Temporal for long-running effects, and with GitHub/Jira/Linear/deploy tools/documents as plugins and projections.

Prim should not become:

- an agent role system
- a PM dashboard
- a workflow graph builder
- a replacement for source control or issue trackers
- a chat app

## FS Flow Lineage

FS Flow proved this pattern in a real professional workflow: put workflow truth in a reconciled control plane, not in chat or markdown.

Prim is the smaller open-source core of that idea. FS Flow is FARMserver-specific. Prim is the general primitive protocol and state-transition layer.
