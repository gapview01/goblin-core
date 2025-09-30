export type Chain = "solana" | "evm";

export type Verb =
  | "balance"
  | "tokenBalance"
  | "wrap"
  | "unwrap"
  | "quote"
  | "swap"
  | "stake"
  | "unstake"
  | "approve";

export interface Step {
  id: string;
  verb: Verb;
  params: Record<string, unknown>;
}

export interface Plan {
  id: string;
  chain: Chain;
  steps: Step[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Preview {
  planId: string;
  summary: string;
  risks: string[];
  feeEstimate?: string;
  encoded?: unknown;
}

export interface SimulationResult {
  ok: boolean;
  messages: string[];
  txCount: number;
}

export interface Receipt {
  id: string;
  planId: string;
  chain: Chain;
  steps: Step[];
  txids: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  ok: boolean;
  txids: string[];
  receipts: Receipt[];
}
