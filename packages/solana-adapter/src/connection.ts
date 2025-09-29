import { Connection } from "@solana/web3.js";

let cachedConnection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (cachedConnection) {
    return cachedConnection;
  }
  const endpoint = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  cachedConnection = new Connection(endpoint, "confirmed");
  return cachedConnection;
}
