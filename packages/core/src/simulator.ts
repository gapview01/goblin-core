import { Adapter } from "./wallet";
import { Plan, Preview, SimulationResult } from "./types";
import { PolicyEngine } from "./policy";

const LAMPORTS_PER_SOL = 1_000_000_000;

function estimateFees(txCount: number): string | undefined {
  if (txCount <= 0) {
    return undefined;
  }
  const estimatedLamports = txCount * 5_000; // conservative default estimate
  const sol = estimatedLamports / LAMPORTS_PER_SOL;
  return `~${sol.toFixed(6)} SOL (network fees)`;
}

function extractTransactionCount(encoded: unknown): number {
  if (!encoded) {
    return 0;
  }
  const maybeArray = (encoded as { transactions?: unknown }).transactions;
  if (Array.isArray(maybeArray)) {
    return maybeArray.length;
  }
  if (Array.isArray(encoded)) {
    return encoded.length;
  }
  return 0;
}

export class Simulator {
  constructor(private readonly adapter: Adapter) {}

  public async preview(plan: Plan, policy?: PolicyEngine): Promise<Preview> {
    const encoded = await this.adapter.encode(plan);
    const validation = policy ? policy.validate(plan) : { ok: true, issues: [] };
    const txCount = extractTransactionCount(encoded);
    return {
      planId: plan.id,
      chain: plan.chain,
      summary: `Plan ${plan.id} will run ${plan.steps.length} step(s) on ${plan.chain}.`,
      risks: validation.issues,
      feeEstimate: estimateFees(txCount),
      encoded,
    };
  }

  public async simulate(plan: Plan): Promise<SimulationResult> {
    const encoded = await this.adapter.encode(plan);
    return this.adapter.simulate(encoded);
  }
}

export async function previewPlan(
  adapter: Adapter,
  plan: Plan,
  policy?: PolicyEngine,
): Promise<Preview> {
  const simulator = new Simulator(adapter);
  return simulator.preview(plan, policy);
}

export async function simulatePlan(adapter: Adapter, plan: Plan): Promise<SimulationResult> {
  const simulator = new Simulator(adapter);
  return simulator.simulate(plan);
}
