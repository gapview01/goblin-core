import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../src/policy";
import { Plan } from "../src/types";

describe("PolicyEngine", () => {
  it("flags programs and slippage outside policy", () => {
    const engine = new PolicyEngine({
      allowlist: {
        allowedPrograms: ["AllowedProgram"],
        allowedMints: ["AllowedMint"],
        maxSlippageBps: 50,
        maxApprovalMinutes: 5,
      },
      risk: {
        blockNewPrograms: true,
        blockUnverifiedMints: true,
        maxTxPerRun: 2,
      },
    });

    const plan: Plan = {
      id: "plan-1",
      chain: "solana",
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: "swap-1",
          verb: "swap",
          params: {
            programId: "UnknownProgram",
            fromMint: "UnknownMint",
            toMint: "AllowedMint",
            slippageBps: 75,
            approvalMinutes: 10,
          },
        },
        {
          id: "stake-1",
          verb: "stake",
          params: {},
        },
        {
          id: "swap-2",
          verb: "swap",
          params: { programId: "AllowedProgram", fromMint: "AllowedMint" },
        },
      ],
    };

    const result = engine.validate(plan);

    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.join(" ")).toContain("UnknownProgram");
    expect(result.issues.join(" ")).toContain("slippage");
    expect(result.issues.join(" ")).toContain("exceeds policy cap");
  });
});
