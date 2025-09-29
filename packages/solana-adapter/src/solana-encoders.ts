import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Plan, Step } from "@goblin/core";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export type ReadVerb = "balance" | "tokenBalance" | "quote";

export interface SolanaReadRequest {
  stepId: string;
  verb: ReadVerb;
  account: PublicKey;
  mint?: PublicKey;
  amount?: number;
}

export interface SolanaTransactionPlan {
  stepId: string;
  transaction: Transaction;
  description: string;
}

export interface SolanaEncodedPlan {
  plan: Plan;
  transactions: SolanaTransactionPlan[];
  reads: SolanaReadRequest[];
  summaries: string[];
}

function parsePublicKey(value: unknown, field: string): PublicKey {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a base58 encoded public key string.`);
  }
  return new PublicKey(value);
}

function addMemo(transaction: Transaction, text: string): void {
  const instruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, "utf8"),
  });
  transaction.add(instruction);
}

function encodeWrap(step: Step, summaries: string[]): SolanaTransactionPlan {
  const owner = parsePublicKey(step.params.owner, "owner");
  const lamports = Number(step.params.amountLamports ?? step.params.amount ?? 0);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error(`Wrap step ${step.id} must include a positive amountLamports.`);
  }
  const transferIx = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: owner,
    lamports,
  });
  const transaction = new Transaction();
  transaction.add(transferIx);
  addMemo(transaction, `wrap:${lamports}`);
  summaries.push(`Wrap ${lamports} lamports into wSOL for ${owner.toBase58()}.`);
  return {
    stepId: step.id,
    transaction,
    description: `Wrap ${lamports} lamports`,
  };
}

function encodeUnwrap(step: Step, summaries: string[]): SolanaTransactionPlan {
  const owner = parsePublicKey(step.params.owner, "owner");
  const lamports = Number(step.params.amountLamports ?? step.params.amount ?? 0);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error(`Unwrap step ${step.id} must include a positive amountLamports.`);
  }
  const transferIx = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: owner,
    lamports,
  });
  const transaction = new Transaction();
  transaction.add(transferIx);
  addMemo(transaction, `unwrap:${lamports}`);
  summaries.push(`Unwrap ${lamports} lamports of wSOL for ${owner.toBase58()}.`);
  return {
    stepId: step.id,
    transaction,
    description: `Unwrap ${lamports} lamports`,
  };
}

function encodeSwap(step: Step, summaries: string[]): SolanaTransactionPlan {
  const owner = parsePublicKey(step.params.owner, "owner");
  const amount = Number(step.params.amount ?? 0);
  const fromMint = typeof step.params.fromMint === "string" ? step.params.fromMint : "unknown";
  const toMint = typeof step.params.toMint === "string" ? step.params.toMint : "unknown";
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Swap step ${step.id} must include a positive amount.`);
  }
  const transferIx = SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: owner,
    lamports: 0,
  });
  const transaction = new Transaction();
  transaction.add(transferIx);
  addMemo(transaction, `swap:${amount}:${fromMint}->${toMint}`);
  summaries.push(
    `Swap ${amount} from ${fromMint} to ${toMint} for ${owner.toBase58()} (mock route).`,
  );
  return {
    stepId: step.id,
    transaction,
    description: `Swap ${amount} units from ${fromMint} to ${toMint}`,
  };
}

function encodeStake(step: Step, summaries: string[]): SolanaTransactionPlan {
  const programId =
    typeof step.params.programId === "string"
      ? new PublicKey(step.params.programId)
      : SystemProgram.programId;
  const transaction = new Transaction();
  const instruction = new TransactionInstruction({
    keys: [],
    programId,
    data: Buffer.from(`stake:${step.id}`, "utf8"),
  });
  transaction.add(instruction);
  summaries.push(`Stake request encoded for program ${programId.toBase58()}.`);
  return { stepId: step.id, transaction, description: `Stake via ${programId.toBase58()}` };
}

function encodeUnstake(step: Step, summaries: string[]): SolanaTransactionPlan {
  const programId =
    typeof step.params.programId === "string"
      ? new PublicKey(step.params.programId)
      : SystemProgram.programId;
  const transaction = new Transaction();
  const instruction = new TransactionInstruction({
    keys: [],
    programId,
    data: Buffer.from(`unstake:${step.id}`, "utf8"),
  });
  transaction.add(instruction);
  summaries.push(`Unstake request encoded for program ${programId.toBase58()}.`);
  return { stepId: step.id, transaction, description: `Unstake via ${programId.toBase58()}` };
}

function encodeBalance(step: Step, summaries: string[]): SolanaReadRequest {
  const account = parsePublicKey(step.params.account, "account");
  summaries.push(`Fetch SOL balance for ${account.toBase58()}.`);
  return {
    stepId: step.id,
    verb: "balance",
    account,
  };
}

function encodeTokenBalance(step: Step, summaries: string[]): SolanaReadRequest {
  const account = parsePublicKey(step.params.account, "account");
  const mint =
    typeof step.params.mint === "string" && step.params.mint.length > 0
      ? new PublicKey(step.params.mint)
      : undefined;
  summaries.push(`Fetch SPL token balance for ${account.toBase58()}.`);
  return {
    stepId: step.id,
    verb: "tokenBalance",
    account,
    mint,
  };
}

function encodeQuote(step: Step, summaries: string[]): SolanaReadRequest {
  const owner = parsePublicKey(step.params.owner ?? step.params.account ?? step.params.wallet, "owner");
  const amount = Number(step.params.amount ?? 0);
  const request: SolanaReadRequest = {
    stepId: step.id,
    verb: "quote",
    account: owner,
    amount: Number.isFinite(amount) ? amount : undefined,
  };
  const fromMint = typeof step.params.fromMint === "string" ? step.params.fromMint : "N/A";
  const toMint = typeof step.params.toMint === "string" ? step.params.toMint : "N/A";
  summaries.push(`Request quote for ${amount} ${fromMint} to ${toMint}.`);
  return request;
}

export function encodePlan(plan: Plan): SolanaEncodedPlan {
  const transactions: SolanaTransactionPlan[] = [];
  const reads: SolanaReadRequest[] = [];
  const summaries: string[] = [];

  for (const step of plan.steps) {
    switch (step.verb) {
      case "wrap":
        transactions.push(encodeWrap(step, summaries));
        break;
      case "unwrap":
        transactions.push(encodeUnwrap(step, summaries));
        break;
      case "swap":
        transactions.push(encodeSwap(step, summaries));
        break;
      case "stake":
        transactions.push(encodeStake(step, summaries));
        break;
      case "unstake":
        transactions.push(encodeUnstake(step, summaries));
        break;
      case "balance":
        reads.push(encodeBalance(step, summaries));
        break;
      case "tokenBalance":
        reads.push(encodeTokenBalance(step, summaries));
        break;
      case "quote":
        reads.push(encodeQuote(step, summaries));
        break;
      default:
        summaries.push(`No encoder implemented for verb ${step.verb}.`);
    }
  }

  return {
    plan,
    transactions,
    reads,
    summaries,
  };
}
