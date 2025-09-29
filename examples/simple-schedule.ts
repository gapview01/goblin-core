import { createPlan, Plan, TaskSpec } from "@goblin/sdk";

const task: TaskSpec = {
  chain: "solana",
  steps: [
    { verb: "balance", params: { account: "11111111111111111111111111111111" } },
    {
      verb: "wrap",
      params: { owner: "11111111111111111111111111111111", amountLamports: 500_000 },
    },
  ],
};

const plan: Plan = createPlan(task);
console.log(JSON.stringify(plan, null, 2));
