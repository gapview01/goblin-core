import { Connection } from "@solana/web3.js";
import {
  Adapter,
  AdapterEncodeResult,
  AdapterExecutionResult,
  Plan,
  UnsignedTransactionsResult,
  createReceiptFromPlan,
} from "@goblin/core";
import { createSolanaConnection, ConnectionConfig } from "./solana/connection";
import { encodePlan, SolanaEncodedPlan } from "./solana/encode";
import { simulateEncodedPlan } from "./solana/simulate";
import { executeEncodedPlan, ExecuteConfig } from "./solana/execute";

export interface SolanaAdapterConfig {
  connection?: Connection;
  connectionConfig?: ConnectionConfig;
  commitment?: "processed" | "confirmed" | "finalized";
}

interface EncodedPayload {
  plan: Plan;
  solana: SolanaEncodedPlan;
}

function assertPayload(encoded: AdapterEncodeResult["encoded"]): EncodedPayload {
  if (!encoded || typeof encoded !== "object") {
    throw new Error("Unsupported encoded payload for Solana adapter.");
  }
  const payload = encoded as EncodedPayload;
  if (!payload.solana || !payload.plan) {
    throw new Error("Encoded payload missing solana plan or base plan.");
  }
  return payload;
}

export function createSolanaAdapter(config: SolanaAdapterConfig = {}): Adapter {
  const connection = config.connection ?? createSolanaConnection(config.connectionConfig);
  const executeConfig: ExecuteConfig = { commitment: config.commitment };

  return {
    chain: "solana",
    async encode(plan: Plan): Promise<AdapterEncodeResult> {
      const solana = encodePlan(plan);
      return {
        encoded: { plan, solana },
        metadata: {
          readOnlySteps: solana.readOnlySteps.length,
        },
        feeEstimateLamports: solana.steps.length * 5_000,
      };
    },
    async simulate(encoded: AdapterEncodeResult["encoded"]) {
      const payload = assertPayload(encoded);
      return simulateEncodedPlan(connection, payload.solana);
    },
    async execute(
      encoded: AdapterEncodeResult["encoded"],
      wallet,
    ): Promise<AdapterExecutionResult | UnsignedTransactionsResult> {
      const payload = assertPayload(encoded);
      const result = await executeEncodedPlan(connection, payload.solana, wallet, executeConfig);
      if ("unsignedTxs" in result) {
        return result;
      }
      const execution = result as AdapterExecutionResult;
      return {
        ...execution,
        receipts:
          execution.receipts.length > 0
            ? execution.receipts
            : [
                createReceiptFromPlan(payload.plan, execution.txids, {
                  chainSpecific: {
                    blockhash: result.metadata?.blockhash,
                    lastValidBlockHeight: result.metadata?.lastValidBlockHeight,
                  },
                }),
              ],
      };
    },
    async getContractMetadata() {
      return {
        So11111111111111111111111111111111111111112: "Wrapped SOL",
      };
    },
  };
}
