import { describe, expect, it } from "vitest";
import { createPlan } from "../src/executor/planner";
import { allowAllPolicy, getDefaultPolicyHook, setDefaultPolicyHook } from "../src/types/policy";

describe("policy hooks", () => {
  it("allows overriding the default policy hook", async () => {
    const customIssues = ["custom block"];
    const customPolicy = {
      async validate() {
        return { ok: false, issues: customIssues };
      },
    };

    const original = getDefaultPolicyHook();
    setDefaultPolicyHook(customPolicy);

    const plan = createPlan("solana");
    const result = await customPolicy.validate(plan);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(customIssues);

    setDefaultPolicyHook(original);
    const allowAllResult = await allowAllPolicy.validate(plan);
    expect(allowAllResult.ok).toBe(true);
  });
});
