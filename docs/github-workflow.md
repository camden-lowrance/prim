# GitHub-Backed Workflow

Prim sits around the GitHub workflow. It does not replace GitHub issues, pull
requests, checks, reviews, or merge state.

When GitHub has the work item, GitHub remains the source of truth for that
work item. Prim records the agent ledger around it.

## Normal Sequence

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

Useful record kinds:

```text
finding
decision
blocker
test_evidence
merge_evidence
```

These are record kinds, not new Prim primitives.

## Completion Rule

For GitHub-backed work, `prim complete` means the external source of truth says
the work is done. In normal GitHub flow, that means the PR is merged into the
target branch or the GitHub issue is closed by another valid path.

Do not complete a Prim subject just because a PR is open or CI is green. At
that point the Prim subject is still active. Use `record` and `link` to show
the PR and evidence.

## Source And Projection

GitHub can be a source:

```bash
npm exec -- prim issue 123 --title "Fix auth" --body "Rehydrate from GitHub" --source-type github_issue --source-id owner/repo#123 --source-url https://github.com/owner/repo/issues/123
```

GitHub can also receive projections later, such as comments or summaries from
Prim records. Either way, Prim should not mirror GitHub fields. It stores only
the agent coordination state:

- claim
- branch link
- PR link
- findings
- decisions
- blockers
- test evidence
- handoff notes
- final completion summary

## Prompt-Only Work

If the source is only a prompt, Prim may be the first durable work record:

```bash
npm exec -- prim issue local-cleanup --title "Clean up local docs" --body "Created from prompt" --source-type prompt --source-id prompt-2026-05-17
```

For prompt-only work, completion is local judgment: finish when the requested
work is done, verified, and no required follow-up remains.
