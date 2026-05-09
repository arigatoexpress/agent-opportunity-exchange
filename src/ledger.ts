import { mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Receipt } from "./types.js";

const DEFAULT_LEDGER_PATH = "data/receipts/receipts.jsonl";

export async function appendReceipt(receipt: Receipt, path = process.env.AOE_RECEIPT_LEDGER_PATH ?? DEFAULT_LEDGER_PATH): Promise<string> {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await appendFile(
    resolved,
    `${JSON.stringify({
      schemaVersion: 1,
      kind: "aoe.receipt.simulated_x402.v1",
      receipt,
    })}\n`,
    "utf8",
  );
  return resolved;
}
