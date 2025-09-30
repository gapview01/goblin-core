import { Chain, ExecutionResult, Plan, SimulationResult } from "./plan";
import { WalletAdapter } from "./wallet";

export interface AdapterEncodeResult {
  encoded: unknown;
  feeEstimateLamports?: number;
  metadata?: Record<string, unknown>;
}

export interface AdapterSimulationResult extends SimulationResult {
  metadata?: Record<string, unknown>;
}

export interface AdapterExecutionResult extends ExecutionResult {
  metadata?: Record<string, unknown>;
}

export interface UnsignedTransactionsResult {
  unsignedTxs: unknown[];
  metadata?: Record<string, unknown>;
}

export interface Adapter {
  chain: Chain;
  encode: (plan: Plan) => Promise<AdapterEncodeResult>;
  simulate: (encoded: AdapterEncodeResult["encoded"]) => Promise<AdapterSimulationResult>;
  execute: (
    encoded: AdapterEncodeResult["encoded"],
    wallet?: WalletAdapter,
  ) => Promise<AdapterExecutionResult | UnsignedTransactionsResult>;
  getContractMetadata?: () => Promise<Record<string, string>>;
}
