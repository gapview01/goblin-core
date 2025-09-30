import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { createPlan } from "@goblin/core";
import { createSolanaAdapter } from "../src";

class FakeConnection {
  async getLatestBlockhash() {
    return { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 123 };
  }

  async simulateTransaction() {
    return { value: { err: null, logs: ["simulated"] } };
  }

  async sendTransaction() {
    return "FakeSignature";
  }

  async confirmTransaction() {
    return { value: { err: null } };
  }
}

describe("solana adapter integration", () => {
  it("produces unsigned transactions in machine mode", async () => {
    const plan = createPlan("solana", {
      preset: "airdrop-lite",
      context: { walletPublicKey: Keypair.generate().publicKey.toBase58() },
    });
    const adapter = createSolanaAdapter({ connection: new FakeConnection() as any });
    const encoded = await adapter.encode(plan);

    const unsigned = await adapter.execute(encoded.encoded);
    expect("unsignedTxs" in unsigned).toBe(true);
    if ("unsignedTxs" in unsigned) {
      expect(unsigned.unsignedTxs.length).toBeGreaterThan(0);
    }
  });

  it("executes in retail mode with injected signer", async () => {
    const keypair = Keypair.generate();
    const plan = createPlan("solana", {
      preset: "airdrop-lite",
      context: { walletPublicKey: keypair.publicKey.toBase58() },
    });
    const adapter = createSolanaAdapter({ connection: new FakeConnection() as any });
    const encoded = await adapter.encode(plan);

    const wallet = {
      publicKey: keypair.publicKey.toBase58(),
      async signTransaction(tx: unknown) {
        const transaction = tx as VersionedTransaction;
        transaction.sign([keypair]);
        return transaction;
      },
    };

    const result = await adapter.execute(encoded.encoded, wallet);
    expect("unsignedTxs" in result).toBe(false);
    if (!("unsignedTxs" in result)) {
      expect(result.ok).toBe(true);
      expect(result.txids[0]).toBe("FakeSignature");
      expect(result.receipts.length).toBeGreaterThan(0);
      expect(result.receipts[0].planId).toBe(plan.id);
    }
  });
});
