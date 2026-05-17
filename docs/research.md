# Research

Date: 2026-05-17

Question:

```text
Does a project already provide agent-native JSON primitives, an append-only semantic ledger, state projection, MCP interface, Beads-like durable memory, GitHub/Jira adapters, and no role-based orchestration?
```

Short answer: not as one small layer.

## Closest Existing Projects

| Project | What it solves | Gap for Prim | Recommendation |
| --- | --- | --- | --- |
| [Beads](https://github.com/gastownhall/beads) | Persistent structured memory and dependency-aware issue graph for coding agents. | It is a ledger and memory backend, not a primitive protocol over semantic state transitions. | Integrate. Treat as preferred durable backend. |
| [Gas Town](https://github.com/gastownhall/gastown) | Multi-agent workspace manager using Beads, workspaces, workers, and persistent agent work state. | It is a larger workspace and coordination product. Prim should be smaller and protocol-shaped. | Learn from it. Do not compete directly. |
| [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) | Durable agent orchestration, streaming, memory, human-in-loop, and persistence. | It is an orchestration runtime. Prim should not define graphs or agent loops. | Integrate later if useful. Do not compete. |
| [Temporal](https://temporal.io/) | Durable execution, retries, timers, workflow state, and long-running processes. | It does not define semantic agent work primitives. | Integrate later for side effects. |
| [MCP](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) | Standard tool/resource/prompt interface for models and clients. | It is a tool protocol, not a work-state ledger or projection model. | Use as access layer. |
| [Letta](https://github.com/letta-ai/letta) | Stateful agents with advanced memory and self-improving context. | It centers agent memory and agent runtime, not external primitive coordination across tools. | Watch. Integrate only if useful. |
| [OpenHands](https://github.com/OpenHands/OpenHands) | AI-driven software development agent, CLI, GUI, SDK, and integrations. | It is an agent product/runtime. Prim is not an agent. | Ignore for MVP except adapter lessons. |
| [Agent Protocol](https://github.com/agi-inc/agent-protocol) | Common REST interface for interacting with agents as services. | It addresses task/step/artifact interaction with agents, not canonical shared work state. | Ignore for MVP. |
| [CrewAI](https://github.com/crewAIInc/crewAI) | Role-playing agents, crews, flows, and automation orchestration. | It is explicitly role and orchestration focused. | Do not compete. Use as contrast. |
| [AG2](https://github.com/ag2ai/ag2) | Multi-agent framework for conversational agent systems. | It focuses on agent collaboration and runtime behavior, not an append-only semantic work ledger. | Do not compete. |
| [MetaGPT](https://github.com/FoundationAgents/MetaGPT) | Software-company-style multi-agent process with PM, architect, engineer roles and SOPs. | It is the pattern Prim is trying not to copy. | Use as contrast. |
| [Semantic Kernel Agent Orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/) | Microsoft agent orchestration patterns like concurrent, sequential, handoff, group chat, and Magentic. | It is an orchestration framework. | Do not compete. |

## Finding

The closest match is Beads plus a thin primitive layer.

Beads gives durable agent-readable memory and graph state. Prim should not replace that. Prim should define the small JSON operation surface, validation, transitions, and projection contract above it.

Gas Town is the closest full product in spirit, but it is broader than Prim. It manages workspaces, workers, and agent operations. Prim should be narrow enough to fit inside other systems, including FS Flow-like systems.

Most other projects solve agent execution, agent orchestration, or model tool access. They do not solve the exact shared semantic state layer.

## Recommendation

Build Prim as:

```text
primitive protocol + state transition semantics
```

Do not build:

- a role-based framework
- a workflow runner
- a chatbot
- a replacement for Beads
- a replacement for Temporal
- a replacement for GitHub, Jira, or Linear

MVP priority:

1. JSON primitive schema
2. append/query ledger interface
3. JSONL backend
4. Beads backend stub
5. projector
6. HTTP invoke endpoint
7. MCP tools
8. GitHub adapter stub

