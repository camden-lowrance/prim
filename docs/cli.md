# CLI Reference

Generated from the Prim CLI command definitions.

Regenerate:

```bash
npm run docs:cli
```

## prim

```text
Usage: prim [options] [command]

Machine-native coordination primitives for agentic software work.

Options:
  -V, --version                   output the version number
  --project <name>                use a Prim project namespace
  --repo <path>                   use a repo with an installed .prim.json
                                  manifest
  --actor <actor>                 actor id for appended events (default:
                                  "agent:cli")
  --json                          print JSON output (default: true)
  -h, --help                      display help for command

Commands:
  status [options]                Show open and completed work from the selected
                                  ledger.
  report [options]                Show a compact activity report.
  subject <type> <id>             Show projected state for a subject.
  project                         Manage Prim project namespaces.
  observe <type> <id>             Return canonical projected state for a
                                  subject.
  issue [options] <subject...>    Document a new work item.
  record [options] <type> <id>    Append a fact, finding, note, risk, or
                                  evidence item.
  ask [options] <type> <id>       Create a guidance request or unresolved
                                  question.
  decide [options] <type> <id>    Record a decision.
  claim [options] <type> <id>     Mark an actor as actively working a scope.
  handoff [options] <type> <id>   Transfer or release context.
  link [options] <type> <id>      Attach an external artifact reference.
  complete [options] <type> <id>  Mark a subject or scope complete.
  help [command]                  display help for command
```

## prim status

```text
Usage: prim status [options]

Show open and completed work from the selected ledger.

Options:
  --completed-limit <number>  max completed subjects to include (default: 0)
  --stale-hours <number>      include stale active subjects at or above this age
                              in hours
  -h, --help                  display help for command
```

## prim report

```text
Usage: prim report [options]

Show a compact activity report.

Options:
  --since <date-or-today>  report start date (default: "today")
  -h, --help               display help for command
```

## prim subject

```text
Usage: prim subject [options] <type> <id>

Show projected state for a subject.

Arguments:
  type        subject type
  id          subject id

Options:
  -h, --help  display help for command
```

## prim project

```text
Usage: prim project [options] [command]

Manage Prim project namespaces.

Options:
  -h, --help                display help for command

Commands:
  init [options] <repo>     Create a Prim namespace for a target repo.
  install [options] <repo>  Create a Prim namespace and install .prim.json in
                            the target repo.
  help [command]            display help for command
```

## prim project init

```text
Usage: prim project init [options] <repo>

Create a Prim namespace for a target repo.

Arguments:
  repo           target repo path

Options:
  --name <name>  Prim project name
  --force        overwrite existing config (default: false)
  -h, --help     display help for command
```

## prim project install

```text
Usage: prim project install [options] <repo>

Create a Prim namespace and install .prim.json in the target repo.

Arguments:
  repo           target repo path

Options:
  --name <name>  Prim project name
  --force        overwrite existing config or manifest (default: false)
  -h, --help     display help for command
```

## prim observe

```text
Usage: prim observe [options] <type> <id>

Return canonical projected state for a subject.

Arguments:
  type        subject type
  id          subject id

Options:
  -h, --help  display help for command
```

## prim issue

```text
Usage: prim issue [options] <subject...>

Document a new work item.

Arguments:
  subject                 issue id, or subject type and id

Options:
  --title <title>         issue title
  --body <body>           issue body
  --priority <priority>   priority
  --source-type <type>    source type
  --source-id <id>        source id
  --source-url <url>      source URL
  --source-title <title>  source title
  -h, --help              display help for command
```

## prim record

```text
Usage: prim record [options] <type> <id>

Append a fact, finding, note, risk, or evidence item.

Arguments:
  type                   subject type
  id                     subject id

Options:
  --kind <kind>          record kind
  --body <body>          record body
  --confidence <number>  confidence from 0 to 1
  -h, --help             display help for command
```

## prim ask

```text
Usage: prim ask [options] <type> <id>

Create a guidance request or unresolved question.

Arguments:
  type                   subject type
  id                     subject id

Options:
  --question <question>  question text
  --blocking             mark as blocking (default: false)
  -h, --help             display help for command
```

## prim decide

```text
Usage: prim decide [options] <type> <id>

Record a decision.

Arguments:
  type                       subject type
  id                         subject id

Options:
  --decision <decision>      decision text
  --rationale <rationale>    decision rationale
  --closes-question-id <id>  question id to close
  -h, --help                 display help for command
```

## prim claim

```text
Usage: prim claim [options] <type> <id>

Mark an actor as actively working a scope.

Arguments:
  type             subject type
  id               subject id

Options:
  --scope <scope>  claimed scope
  -h, --help       display help for command
```

## prim handoff

```text
Usage: prim handoff [options] <type> <id>

Transfer or release context.

Arguments:
  type                 subject type
  id                   subject id

Options:
  --summary <summary>  handoff summary
  --from <actor>       source actor
  --to <actor>         target actor
  -h, --help           display help for command
```

## prim link

```text
Usage: prim link [options] <type> <id>

Attach an external artifact reference.

Arguments:
  type             subject type
  id               subject id

Options:
  --type <type>    external reference type
  --id <id>        external reference id
  --url <url>      external reference URL
  --title <title>  external reference title
  -h, --help       display help for command
```

## prim complete

```text
Usage: prim complete [options] <type> <id>

Mark a subject or scope complete.

Arguments:
  type                 subject type
  id                   subject id

Options:
  --summary <summary>  completion summary
  --scope <scope>      completed scope
  -h, --help           display help for command
```
