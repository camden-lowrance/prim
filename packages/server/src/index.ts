import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { resolve } from "node:path";
import { JsonlLedgerBackend } from "../../core/src/ledger-jsonl";
import { invokePrim } from "../../core/src/invoke";

const app = new Hono();
const ledgerPath = process.env.PRIM_LEDGER_PATH ?? resolve(process.cwd(), "data/prim-events.jsonl");
const ledger = new JsonlLedgerBackend(ledgerPath);

app.get("/health", (context) =>
  context.json({
    ok: true,
    ledger: ledgerPath
  })
);

app.post("/v1/invoke", async (context) => {
  try {
    const body = await context.req.json();
    const result = await invokePrim(body, ledger);
    return context.json(result, result.accepted ? 200 : 409);
  } catch (error) {
    return context.json(
      {
        accepted: false,
        error: error instanceof Error ? error.message : "invalid request"
      },
      400
    );
  }
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Prim API listening on http://localhost:${info.port}`);
  console.log(`Ledger path: ${ledgerPath}`);
});

