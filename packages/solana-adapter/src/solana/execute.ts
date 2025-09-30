import { Connection, VersionedTransaction } from "@solana/web3.js";
import { AdapterExecutionResult, UnsignedTransactionsResult, WalletAdapter } from "@goblin/core";
import { SolanaEncodedPlan } from "./encode";
import { prepareUnsignedTransactions } from "./transactions";
import { withRetry } from "./connection";

export interface ExecuteConfig {
  commitment?: "processed" | "confirmed" | "finalized";
}

function ensureSigned(transaction: VersionedTransaction): VersionedTransaction {
  if (transaction.signatures.length === 0) {
    throw new Error("Signed transaction is missing signatures.");
  }
  return transaction;
}

export async function executeEncodedPlan(
  connection: Connection,
  encoded: SolanaEncodedPlan,
  wallet?: WalletAdapter,
  config: ExecuteConfig = {},
): Promise<AdapterExecutionResult | UnsignedTransactionsResult> {
  const prepared = await prepareUnsignedTransactions(connection, encoded);

  if (!wallet) {
    return {
      unsignedTxs: prepared.transactions.map((tx) => Buffer.from(tx.serialize()).toString("base64")),
      metadata: {
        blockhash: prepared.blockhash,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
      },
    };
  }

  const txids: string[] = [];
  const signedTransactions: VersionedTransaction[] = [];

  for (const tx of prepared.transactions) {
    const signed = (await wallet.signTransaction(tx)) as VersionedTransaction;
    signedTransactions.push(ensureSigned(signed));
  }

  for (const signed of signedTransactions) {
    const signature = await withRetry(() =>
      connection.sendTransaction(signed, {
        preflightCommitment: config.commitment ?? "confirmed",
        skipPreflight: false,
        maxRetries: 3,
      }),
    );
    txids.push(signature);
    await connection.confirmTransaction(
      {
        signature,
        blockhash: prepared.blockhash,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
      },
      config.commitment ?? "confirmed",
    );
  }

  return {
    ok: true,
    txids,
    receipts: [],
    metadata: {
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
    },
  };
}
