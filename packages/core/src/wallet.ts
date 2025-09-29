import { Chain, ExecutionResult, Plan, SimulationResult } from "./types";

export interface WalletAdapter {
  publicKey: string;
  signTransaction: (tx: unknown) => Promise<unknown>;
}

export interface Adapter {
  chain: Chain;
  encode: (plan: Plan) => Promise<unknown>;
  simulate: (encoded: unknown) => Promise<SimulationResult>;
  execute: (encoded: unknown, wallet: WalletAdapter) => Promise<ExecutionResult>;
}
