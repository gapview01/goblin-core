import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Plan, Step } from "@goblin/core";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface SolanaEncodedStep {
  step: Step;
  instructions: TransactionInstruction[];
}

export interface SolanaEncodedPlan {
  payer: PublicKey;
  steps: SolanaEncodedStep[];
  readOnlySteps: Step[];
}

function getPayer(plan: Plan): PublicKey {
  const key = plan.metadata?.walletPublicKey;
  if (!key) {
    throw new Error("Plan metadata must include walletPublicKey for Solana execution.");
  }
  return new PublicKey(key);
}

function encodeWrap(step: Step, payer: PublicKey): TransactionInstruction[] {
  const amount = Number(step.params.amountLamports ?? 0);
  if (!amount) {
    throw new Error("Wrap step requires amountLamports param.");
  }
  const mint = new PublicKey((step.params.mint as string) ?? NATIVE_MINT.toBase58());
  const owner = new PublicKey((step.params.owner as string) ?? payer.toBase58());
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const ix: TransactionInstruction[] = [];
  ix.push(createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint));
  ix.push(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: ata,
      lamports: amount,
    }),
  );
  ix.push(createSyncNativeInstruction(ata));
  return ix;
}

function encodeUnwrap(step: Step, payer: PublicKey): TransactionInstruction[] {
  const mint = new PublicKey((step.params.mint as string) ?? NATIVE_MINT.toBase58());
  const owner = new PublicKey((step.params.owner as string) ?? payer.toBase58());
  const ata = getAssociatedTokenAddressSync(mint, owner);
  return [createCloseAccountInstruction(ata, payer, owner, [], TOKEN_PROGRAM_ID)];
}

function encodeSwap(step: Step, payer: PublicKey): TransactionInstruction[] {
  const memoText = `SWAP ${step.params.amountLamports ?? "?"} from ${step.params.fromMint} to ${step.params.toMint}`;
  const data = Buffer.from(memoText, "utf8");
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [
        {
          pubkey: payer,
          isSigner: true,
          isWritable: false,
        },
      ],
      data,
    }),
  ];
}

export function encodePlan(plan: Plan): SolanaEncodedPlan {
  const payer = getPayer(plan);
  const transactionalSteps: SolanaEncodedStep[] = [];
  const readOnlySteps: Step[] = [];

  for (const step of plan.steps) {
    switch (step.verb) {
      case "wrap":
        transactionalSteps.push({ step, instructions: encodeWrap(step, payer) });
        break;
      case "unwrap":
        transactionalSteps.push({ step, instructions: encodeUnwrap(step, payer) });
        break;
      case "swap":
        transactionalSteps.push({ step, instructions: encodeSwap(step, payer) });
        break;
      default:
        readOnlySteps.push(step);
    }
  }

  return {
    payer,
    steps: transactionalSteps,
    readOnlySteps,
  };
}
