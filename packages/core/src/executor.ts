import { Adapter, WalletAdapter } from "./wallet";
import { ExecutionResult, Plan } from "./types";
import { PolicyEngine } from "./policy";
import {
  JsonFileReceiptStore,
  ReceiptStore,
  createReceipt,
  mergeExecutionWithReceipts,
} from "./receipts";

export interface ExecuteOptions {
  policy?: PolicyEngine;
  receiptStore?: ReceiptStore;
  skipSimulation?: boolean;
}

export async function executePlan(
  adapter: Adapter,
  plan: Plan,
  wallet: WalletAdapter,
  options: ExecuteOptions = {},
): Promise<ExecutionResult> {
  if (!wallet || !wallet.publicKey || typeof wallet.signTransaction !== "function") {
    throw new Error("A wallet adapter with a signTransaction method is required.");
  }

  const policy = options.policy;
  if (policy) {
    const validation = policy.validate(plan);
    if (!validation.ok) {
      throw new Error(`Policy validation failed: ${validation.issues.join("; ")}`);
    }
  }

  const encoded = await adapter.encode(plan);

  if (!options.skipSimulation) {
    const simulation = await adapter.simulate(encoded);
    if (!simulation.ok) {
      throw new Error(`Simulation failed: ${simulation.messages.join(" | ")}`);
    }
  }

  const execution = await adapter.execute(encoded, wallet);
  const receipts = execution.receipts.length > 0 ? execution.receipts : [createReceipt(plan, execution.txids)];
  const store = options.receiptStore ?? new JsonFileReceiptStore();
  for (const receipt of receipts) {
    await store.save(receipt);
  }
  return mergeExecutionWithReceipts(plan, { ...execution, receipts });
}
