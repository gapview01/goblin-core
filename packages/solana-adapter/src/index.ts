import { Adapter, Chain, ExecutionResult, Plan, SimulationResult, WalletAdapter } from "@goblin/core";
import { encodePlan, SolanaEncodedPlan } from "./solana-encoders";
import { simulateEncodedPlan } from "./solana-simulator";
import { executeEncodedPlan } from "./solana-executor";

export class SolanaAdapter implements Adapter {
  public readonly chain: Chain = "solana";

  public async encode(plan: Plan): Promise<SolanaEncodedPlan> {
    return encodePlan(plan);
  }

  public async simulate(encoded: unknown): Promise<SimulationResult> {
    return simulateEncodedPlan(encoded as SolanaEncodedPlan);
  }

  public async execute(encoded: unknown, wallet: WalletAdapter): Promise<ExecutionResult> {
    return executeEncodedPlan(encoded as SolanaEncodedPlan, wallet);
  }
}

export function createSolanaAdapter(): SolanaAdapter {
  return new SolanaAdapter();
}

export * from "./solana-encoders";
