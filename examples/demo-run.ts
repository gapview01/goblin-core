import { createSolanaAdapter } from "@goblin/solana-adapter";
import { JsonFileReceiptStore, PolicyEngine, formatReceipt } from "@goblin/core";
import { createPlan, preview, run, simulate, TaskSpec } from "@goblin/sdk";

async function main(): Promise<void> {
  const task: TaskSpec = {
    chain: "solana",
    steps: [
      { verb: "balance", params: { account: "11111111111111111111111111111111" } },
      {
        verb: "swap",
        params: {
          owner: "11111111111111111111111111111111",
          fromMint: "So11111111111111111111111111111111111111112",
          toMint: "So11111111111111111111111111111111111111112",
          amount: 1,
        },
      },
    ],
  };

  const plan = createPlan(task);
  const adapter = createSolanaAdapter();
  const policy = await PolicyEngine.fromFiles({ allowlistPath: "policy/allowlist.example.json" });

  const previewResult = await preview(adapter, plan, policy);
  console.log("Preview:", previewResult.summary);
  console.log("Risks:", previewResult.risks);

  const simulation = await simulate(adapter, plan, policy);
  console.log("Simulation messages:", simulation.messages);

  const execution = await run(
    adapter,
    plan,
    {
      publicKey: "11111111111111111111111111111111",
      async signTransaction(tx: unknown) {
        return tx;
      },
    },
    policy,
  );

  const store = new JsonFileReceiptStore();
  const receipts = await store.list();
  console.log("Execution txids:", execution.txids);
  receipts.forEach((receipt) => console.log(formatReceipt(receipt)));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
