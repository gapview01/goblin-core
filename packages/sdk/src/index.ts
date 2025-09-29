import {
  Adapter,
  ExecutionResult,
  JsonFileReceiptStore,
  Plan,
  Planner,
  PolicyEngine,
  Preview,
  SimulationResult,
  TaskSpec,
  WalletAdapter,
  executePlan,
  previewPlan as corePreview,
  simulatePlan as coreSimulate,
} from "@goblin/core";

export type { Chain, ExecutionResult, Plan, Preview, SimulationResult, Step, TaskSpec, Verb } from "@goblin/core";

export function createPlan(task: TaskSpec): Plan {
  return Planner.createPlan(task);
}

export async function preview(
  adapter: Adapter,
  plan: Plan,
  policy?: PolicyEngine,
): Promise<Preview> {
  return corePreview(adapter, plan, policy);
}

export async function simulate(
  adapter: Adapter,
  plan: Plan,
  policy?: PolicyEngine,
): Promise<SimulationResult> {
  if (policy) {
    const validation = policy.validate(plan);
    if (!validation.ok) {
      return {
        ok: false,
        messages: validation.issues,
        txCount: 0,
      };
    }
  }
  return coreSimulate(adapter, plan);
}

export async function run(
  adapter: Adapter,
  plan: Plan,
  wallet: WalletAdapter,
  policy?: PolicyEngine,
): Promise<ExecutionResult> {
  const store = new JsonFileReceiptStore();
  return executePlan(adapter, plan, wallet, { policy, receiptStore: store });
}

export { Planner, PolicyEngine };
