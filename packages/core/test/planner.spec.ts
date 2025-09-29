import { describe, expect, it } from "vitest";
import { Planner } from "../src/planner";
import { TaskSpec } from "../src/types";

describe("Planner", () => {
  it("creates a plan with validated verbs", () => {
    const task: TaskSpec = {
      chain: "solana",
      steps: [
        { verb: "balance", params: { account: "ExampleAccount" } },
        { verb: "wrap", params: { owner: "OwnerPubkey", amountLamports: 1_000_000 } },
      ],
    };

    const plan = Planner.createPlan(task);

    expect(plan.chain).toBe("solana");
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].verb).toBe("balance");
    expect(plan.steps[1].verb).toBe("wrap");
    expect(plan.steps[0].id).toBeDefined();
    expect(plan.createdAt).toBeDefined();
  });
});
