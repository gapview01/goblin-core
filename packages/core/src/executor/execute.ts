import { Adapter, AdapterExecutionResult, AdapterSimulationResult, UnsignedTransactionsResult } from "../types/adapter";
import { Plan, Preview } from "../types/plan";
import { PolicyHook, getDefaultPolicyHook } from "../types/policy";
import { WalletAdapter } from "../types/wallet";
import { SimulationError, PolicyViolationError } from "../utils/errors";
import { buildPreview, PreviewOptions } from "./preview";
import { simulateEncodedPlan } from "./simulator";
import { JsonFileReceiptStore, ReceiptStore, createReceiptFromPlan } from "./receipts";

export type ExecutionMode = "retail" | "machine";

export interface ExecutePipelineOptions {
  policyHook?: PolicyHook;
  receiptStore?: ReceiptStore;
  previewOptions?: PreviewOptions;
  mode?: ExecutionMode;
  skipSimulation?: boolean;
}

export interface ExecutePipelineResult {
  preview: Preview;
  simulation?: AdapterSimulationResult;
  execution?: AdapterExecutionResult;
  unsigned?: UnsignedTransactionsResult;
}

export async function runExecutionPipeline(
  adapter: Adapter,
  plan: Plan,
  wallet: WalletAdapter | undefined,
  options: ExecutePipelineOptions = {},
): Promise<ExecutePipelineResult> {
  const policy = options.policyHook ?? getDefaultPolicyHook();
  const validation = await policy.validate(plan);
  if (!validation.ok) {
    throw new PolicyViolationError("Policy validation failed", validation.issues);
  }

  const encoded = await adapter.encode(plan);
  const preview = buildPreview(plan, {
    ...options.previewOptions,
    encoded: encoded.encoded,
    feeEstimateLamports: encoded.feeEstimateLamports,
  });

  let simulationResult: AdapterSimulationResult | undefined;
  if (!options.skipSimulation) {
    const simulation = await simulateEncodedPlan(adapter, encoded.encoded);
    if (!simulation.ok) {
      throw new SimulationError("Simulation failed", simulation.messages);
    }
    simulationResult = simulation;
  }

  const receiptStore = options.receiptStore ?? new JsonFileReceiptStore();
  const executionOutcome = await adapter.execute(encoded.encoded, wallet);

  if ("unsignedTxs" in executionOutcome) {
    return {
      preview,
      simulation: simulationResult,
      unsigned: executionOutcome,
    };
  }

  const execution = executionOutcome as AdapterExecutionResult;
  const receipts = execution.receipts.length
    ? execution.receipts
    : [createReceiptFromPlan(plan, execution.txids, execution.metadata)];

  for (const receipt of receipts) {
    await receiptStore.save(receipt);
  }

  return {
    preview,
    simulation: simulationResult,
    execution: { ...execution, receipts },
  };
}
