# Lifecycle Overlays

Prim sits around existing workflows. It does not replace GitHub, Jira, Linear,
deploy systems, review systems, scripts, documents, chat, or prompt-only work.

The right framing is plugins, overlays, coordinators, and projections.

- Plugins connect Prim to external stores.
- Overlays show the current lifecycle state across those stores.
- Coordinators run lifecycle steps outside Prim.
- Projections write useful Prim state back out to those stores.

When another system owns a lifecycle part, that system remains the source of
truth for that part. Prim records the agent ledger across the whole work item.

## Lifecycle Stores

A project can configure one or more external stores by lifecycle part.

```text
intake       prompt, GitHub issue, Jira ticket, Linear issue, document
planning     document, issue comments, Prim records
code         git branch, worktree, GitHub repo
review       GitHub PR review, Linear state, Jira status, document signoff
test         CI, local test logs, deploy preview checks
deploy       Vercel, Railway, Fly, internal deploy system
handoff      chat, document, ticket comment, Prim record
completion   source ticket state, merged PR, accepted deploy, human signoff
```

Not every project needs every store. A lifecycle part can be missing, local, or
owned by multiple systems. Example: Jira can own issue tracking while GitHub
owns code, PRs, and CI.

## Lifecycle Coordinators

Stores hold lifecycle state. Coordinators run lifecycle work.

Examples:

```text
Temporal                 durable waits, retries, schedules, reconciliation
agent orchestration      planner/executor/reviewer loops, multi-agent runs
CI                       test execution and status reporting
deploy automation        rollout, preview, rollback, health checks
queues and schedulers    background work, polling, deferred follow-up
browser automation       logged-in checks, screenshots, human-review flows
```

Prim should not become these systems. Prim records what was started, claimed,
blocked, linked, decided, verified, and completed. Coordinators can read Prim
state, perform work, and write back records, links, and evidence.

Coordinators do not change Prim actions. They use the same primitive vocabulary:

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

Coordinator internals stay outside Prim. Prim only records ledger boundaries:
claim taken, workflow started, artifact linked, blocker found, decision made,
evidence produced, handoff made, or completion asserted.

## Normal Shape

```text
Create or choose the source work item
Create or observe the Prim subject
prim claim <subject-type> <subject-id> --scope <scope>
Link active lifecycle artifacts
Record useful facts while working
Start or observe coordinators as needed
Project useful state back to external stores
Wait for the configured completion source
Record final evidence
prim complete <subject-type> <subject-id> --summary "..."
```

Useful record kinds:

```text
finding
decision
blocker
test_evidence
review_evidence
deploy_evidence
merge_evidence
```

These are record kinds, not new Prim primitives.

## Completion Rule

`prim complete` means the configured completion source says the work is done.

Examples:

- GitHub: PR merged or issue closed by a valid path.
- Jira or Linear: ticket reaches the accepted done state.
- Deploy workflow: deploy is finished and verified.
- Review workflow: required approval or signoff is complete.
- Prompt-only work: requested work is done and verified.

Do not complete a Prim subject just because an intermediate lifecycle step
passed. At that point the Prim subject is still active. Use `record` and `link`
to show the evidence.

## Sources And Projections

Any lifecycle store can be a source:

```bash
npm exec -- prim issue 123 --title "Fix auth" --body "Rehydrate from GitHub" --source-type github_issue --source-id owner/repo#123 --source-url https://github.com/owner/repo/issues/123
npm exec -- prim issue JIRA-123 --title "Fix auth" --body "Rehydrate from Jira" --source-type jira_issue --source-id JIRA-123 --source-url https://jira.example.com/browse/JIRA-123
npm exec -- prim issue local-cleanup --title "Clean up local docs" --body "Created from prompt" --source-type prompt --source-id prompt-2026-05-17
```

Any lifecycle store can also receive projections later, such as comments,
summaries, status updates, or links from Prim records. Prim should not mirror
every external field. It stores only the agent coordination state:

- claim
- active artifact links
- findings
- decisions
- blockers
- test evidence
- review evidence
- deploy evidence
- handoff notes
- final completion summary

## Adapter Rule

Plugins and adapters translate between Prim and external systems. They should
reconcile, link, and project useful facts. They should not make Prim a clone of
the source system.

GitHub, Jira, Linear, CI, deploy tools, documents, scripts, and chat keep their
native primitives. Prim keeps the cross-lifecycle agent ledger.

Coordinator plugins should expose actions such as start, observe, retry, cancel,
or wait through their native systems. Prim should store the fact and evidence of
those actions, not the coordinator's whole internal state.

## GitHub Example

```text
Create or choose GitHub issue
prim observe issue <number>
prim claim issue <number> --scope implementation
Create branch or worktree
prim link issue <number> --type branch --id <branch>
Record useful facts while working
Push branch
Open PR
prim link issue <number> --type github_pr --url <pr-url>
Wait for GitHub CI and review
Merge PR
Record final merge or verification evidence
prim complete issue <number> --summary "..."
```

## Split-Store Example

```text
Jira owns the issue
GitHub owns the code branch and PR
GitHub Actions owns CI
Vercel owns deploy preview
Temporal owns a retrying reconciliation workflow
An agent orchestrator owns a review loop
Prim owns claim, links, findings, decisions, blockers, evidence, and handoff
Jira done state is the completion source
```
