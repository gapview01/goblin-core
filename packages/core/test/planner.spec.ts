import { describe, expect, it } from "vitest";
import { createPlan } from "../src/executor/planner";

describe("planner", () => {
  it("creates an airdrop-lite plan with wallet metadata", () => {
    const plan = createPlan("solana", {
      preset: "airdrop-lite",
      context: { walletPublicKey: "DemoWallet111111111111111111111111111111" },
    });

    expect(plan.chain).toBe("solana");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.metadata?.walletPublicKey).toBe("DemoWallet111111111111111111111111111111");
    expect(plan.steps[0].id).toMatch(/step-/);
  });
});
