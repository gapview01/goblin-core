import { Connection } from "@solana/web3.js";
import { AdapterSimulationResult } from "@goblin/core";
import { SolanaEncodedPlan } from "./encode";
import { prepareUnsignedTransactions } from "./transactions";
import { withRetry } from "./connection";

export async function simulateEncodedPlan(
  connection: Connection,
  encoded: SolanaEncodedPlan,
): Promise<AdapterSimulationResult> {
  if (encoded.steps.length === 0) {
    return { ok: true, messages: ["No transactions to simulate."], txCount: 0 };
  }

  const prepared = await prepareUnsignedTransactions(connection, encoded);
  const messages: string[] = [];
  let ok = true;

  for (const tx of prepared.transactions) {
    const result = await withRetry(() =>
      connection.simulateTransaction(tx, {
        sigVerify: false,
      }),
    );
    if (result.value.err) {
      ok = false;
      messages.push(`Simulation error: ${JSON.stringify(result.value.err)}`);
    }
    if (result.value.logs) {
      messages.push(...result.value.logs);
    }
  }

  return {
    ok,
    messages,
    txCount: prepared.transactions.length,
    metadata: {
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
    },
  };
}
