import { Connection, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { SolanaEncodedPlan } from "./encode";
import { withRetry } from "./connection";

export interface PreparedTransactions {
  transactions: VersionedTransaction[];
  blockhash: string;
  lastValidBlockHeight: number;
}

export async function prepareUnsignedTransactions(
  connection: Connection,
  encoded: SolanaEncodedPlan,
): Promise<PreparedTransactions> {
  const latestBlockhash = await withRetry(() => connection.getLatestBlockhash());
  const transactions = encoded.steps.map(({ instructions }) => {
    const message = new TransactionMessage({
      payerKey: encoded.payer,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();
    return new VersionedTransaction(message);
  });

  return {
    transactions,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  };
}
