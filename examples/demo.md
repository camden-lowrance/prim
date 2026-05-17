# Demo

Run:

```bash
npm run demo
```

What it proves:

1. Thread A records a finding on `AUTH-142`.
2. Thread A asks a blocking question.
3. Thread B observes canonical state from the ledger.
4. Thread B records a decision that closes the question.
5. Thread C links a GitHub PR and observes the final state.

The demo prints the projected state and the JSONL event stream.

