import {
  Adapter,
  ExecutionResult,
  JsonFileReceiptStore,
  Plan,
  Preview,
  Receipt,
  SimulationResult,
  WalletAdapter,
  createPlan as coreCreatePlan,
  buildPreview,
  runExecutionPipeline,
} from "@goblin/core";
import type { CreatePlanOptions } from "@goblin/core";

export type { Chain, Plan, Preview, Receipt, SimulationResult, Step, Verb } from "@goblin/core";

export interface PreviewPlanOptions {
  adapter: Adapter;
  plan: Plan;
}

export interface SimulatePlanOptions {
  adapter: Adapter;
  plan: Plan;
}

export interface ExecutePlanOptions {
  adapter: Adapter;
  plan: Plan;
  wallet?: WalletAdapter;
}

export function createPlan(chain: Plan["chain"], options?: CreatePlanOptions): Plan {
  return coreCreatePlan(chain, options);
}

export async function previewPlan({ adapter, plan }: PreviewPlanOptions): Promise<Preview> {
  const encoded = await adapter.encode(plan);
  return buildPreview(plan, {
    feeEstimateLamports: encoded.feeEstimateLamports,
    adapterMetadata: adapter.getContractMetadata ? await adapter.getContractMetadata() : undefined,
    encoded: encoded.encoded,
  });
}

export async function simulatePlan({ adapter, plan }: SimulatePlanOptions): Promise<SimulationResult> {
  const encoded = await adapter.encode(plan);
  return adapter.simulate(encoded.encoded);
}

export async function executePlan({
  adapter,
  plan,
  wallet,
}: ExecutePlanOptions): Promise<ExecutionResult | { unsignedTxs: unknown[] }> {
  const store = new JsonFileReceiptStore();
  const result = await runExecutionPipeline(adapter, plan, wallet, { receiptStore: store });
  if (result.unsigned) {
    return result.unsigned;
  }
  if (!result.execution) {
    throw new Error("Adapter did not return execution result.");
  }
  return result.execution;
}

export async function listReceipts(store = new JsonFileReceiptStore()): Promise<Receipt[]> {
  return store.list();
}
