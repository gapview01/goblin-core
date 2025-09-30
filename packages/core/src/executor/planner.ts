import { randomUUID } from "crypto";
import { Chain, Plan, Step, Verb } from "../types/plan";

export type PresetTask = "airdrop-lite" | "balance-check";

export interface PlannerContext {
  walletPublicKey?: string;
  amountLamports?: number;
  swapTargetMint?: string;
  wrapAmountLamports?: number;
}

export interface CreatePlanOptions {
  preset?: PresetTask;
  steps?: Step[];
  planId?: string;
  metadata?: Record<string, unknown>;
  context?: PlannerContext;
}

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function createStep(id: string, verb: Verb, params: Record<string, unknown>): Step {
  return { id, verb, params };
}

function presetSteps(preset: PresetTask, context: PlannerContext = {}): Step[] {
  switch (preset) {
    case "balance-check":
      return [
        createStep("step-1", "balance", { token: "SOL" }),
        createStep("step-2", "tokenBalance", { mint: context.swapTargetMint ?? USDC_MINT }),
      ];
    case "airdrop-lite":
    default: {
      const wrapAmount = context.wrapAmountLamports ?? 100_000_000; // 0.1 SOL
      const swapAmount = Math.floor(wrapAmount / 2);
      return [
        createStep("step-1", "balance", { token: "SOL" }),
        createStep("step-2", "wrap", {
          amountLamports: wrapAmount,
          mint: WSOL_MINT,
        }),
        createStep("step-3", "swap", {
          amountLamports: swapAmount,
          fromMint: WSOL_MINT,
          toMint: context.swapTargetMint ?? USDC_MINT,
          slippageBps: 50,
        }),
        createStep("step-4", "unwrap", {
          amountLamports: swapAmount,
          mint: WSOL_MINT,
        }),
      ];
    }
  }
}

export function createPlan(chain: Chain, options: CreatePlanOptions = {}): Plan {
  const steps = options.steps ?? presetSteps(options.preset ?? "airdrop-lite", options.context);
  const planId = options.planId ?? randomUUID();
  const metadata = { ...options.metadata };
  if (options.context?.walletPublicKey) {
    metadata.walletPublicKey = options.context.walletPublicKey;
  }
  return {
    id: planId,
    chain,
    steps,
    createdAt: new Date().toISOString(),
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}
