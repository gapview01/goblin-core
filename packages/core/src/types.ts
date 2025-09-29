export type Chain = "solana";

export type Verb =
  | "balance"
  | "tokenBalance"
  | "wrap"
  | "unwrap"
  | "quote"
  | "swap"
  | "stake"
  | "unstake";

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
}

export interface Preview {
  planId: string;
  chain: Chain;
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

export interface ExecutionResult {
  ok: boolean;
  txids: string[];
  receipts: Receipt[];
}

export interface Receipt {
  id: string;
  planId: string;
  chain: Chain;
  steps: Step[];
  txids: string[];
  createdAt: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

export interface TaskStepInput {
  id?: string;
  verb: Verb;
  params?: Record<string, unknown>;
}

export interface TaskSpec {
  id?: string;
  chain: Chain;
  steps: TaskStepInput[];
}
