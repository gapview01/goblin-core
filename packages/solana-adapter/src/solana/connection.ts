import { Connection, Commitment, clusterApiUrl } from "@solana/web3.js";

export interface ConnectionConfig {
  endpoint?: string;
  cluster?: "mainnet-beta" | "testnet" | "devnet";
  commitment?: Commitment;
  timeoutMs?: number;
  retry?: {
    attempts: number;
    delayMs: number;
  };
}

export function createSolanaConnection(config: ConnectionConfig = {}): Connection {
  const endpoint = config.endpoint ?? clusterApiUrl(config.cluster ?? "devnet");
  return new Connection(endpoint, {
    commitment: config.commitment ?? "confirmed",
    disableRetryOnRateLimit: false,
  });
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 250): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
