import { describe, expect, it } from "vitest";
import { Planner } from "@goblin/core";
import { SolanaAdapter } from "../src";

describe("SolanaAdapter", () => {
  it("encodes and simulates a simple plan", async () => {
    const adapter = new SolanaAdapter();
    const plan = Planner.createPlan({
      chain: "solana",
      steps: [
        {
          verb: "balance",
          params: { account: "11111111111111111111111111111111" },
        },
        {
          verb: "wrap",
          params: { owner: "11111111111111111111111111111111", amountLamports: 1_000 },
        },
      ],
    });

    const encoded = await adapter.encode(plan);
    const simulation = await adapter.simulate(encoded);

    expect(simulation.ok).toBe(true);
    expect(simulation.txCount).toBeGreaterThanOrEqual(1);
    expect(simulation.messages.length).toBeGreaterThan(0);
  });
});
