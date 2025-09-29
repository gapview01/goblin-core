import { ExecutionResult, WalletAdapter, createReceipt } from "@goblin/core";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getSolanaConnection } from "./connection";
import { SolanaEncodedPlan } from "./solana-encoders";

export async function executeEncodedPlan(
  encoded: SolanaEncodedPlan,
  wallet: WalletAdapter,
): Promise<ExecutionResult> {
  if (!wallet.publicKey) {
    throw new Error("Wallet public key is required for execution.");
  }

  const connection = getSolanaConnection();
  const feePayer = new PublicKey(wallet.publicKey);
  const txids: string[] = [];

  if (encoded.transactions.length === 0) {
    return {
      ok: true,
      txids,
      receipts: [createReceipt(encoded.plan, txids)],
    };
  }

  const latestBlockhash = await connection.getLatestBlockhash();

  for (const { transaction, stepId } of encoded.transactions.map((entry) => ({
    transaction: entry.transaction,
    stepId: entry.stepId,
  }))) {
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = feePayer;

    const signedTx = (await wallet.signTransaction(transaction)) as Transaction;
    if (!(signedTx instanceof Transaction)) {
      throw new Error(`Wallet failed to return a Transaction for step ${stepId}.`);
    }

    const raw = signedTx.serialize();
    const signature = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    txids.push(signature);
  }

  return {
    ok: true,
    txids,
    receipts: [createReceipt(encoded.plan, txids)],
  };
}
