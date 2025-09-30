import { Adapter, AdapterEncodeResult, AdapterSimulationResult, UnsignedTransactionsResult } from "../types/adapter";
import { Plan } from "../types/plan";

export interface EvmAdapterConfig {
  chainId: number;
  rpcUrl: string;
}

export function createStubEvmAdapter(): Adapter {
  return {
    chain: "evm",
    async encode(plan: Plan): Promise<AdapterEncodeResult> {
      throw new Error(`EVM encoding not yet implemented for plan ${plan.id}.`);
    },
    async simulate(): Promise<AdapterSimulationResult> {
      throw new Error("EVM simulation not yet implemented.");
    },
    async execute(): Promise<UnsignedTransactionsResult> {
      throw new Error("EVM execution not yet implemented.");
    },
  };
}
