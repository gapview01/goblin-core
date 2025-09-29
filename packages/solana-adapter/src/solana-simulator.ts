import { SimulationResult } from "@goblin/core";
import { getSolanaConnection } from "./connection";
import { SolanaEncodedPlan } from "./solana-encoders";

export async function simulateEncodedPlan(encoded: SolanaEncodedPlan): Promise<SimulationResult> {
  const messages: string[] = [...encoded.summaries];
  const connection = getSolanaConnection();

  for (const read of encoded.reads) {
    try {
      switch (read.verb) {
        case "balance": {
          const lamports = await connection.getBalance(read.account);
          messages.push(`Balance for ${read.account.toBase58()}: ${lamports} lamports.`);
          break;
        }
        case "tokenBalance": {
          const balance = await connection.getTokenAccountBalance(read.account);
          messages.push(
            `Token balance for ${read.account.toBase58()}: ${balance.value.uiAmountString ?? "0"}.`,
          );
          break;
        }
        case "quote": {
          messages.push(
            `Quote request prepared for ${read.account.toBase58()} amount ${read.amount ?? "unspecified"}.`,
          );
          break;
        }
        default:
          messages.push(`Read verb ${read.verb} not recognized.`);
      }
    } catch (error) {
      messages.push(`Read step ${read.stepId} skipped: ${(error as Error).message}`);
    }
  }

  return {
    ok: true,
    messages,
    txCount: encoded.transactions.length,
  };
}
