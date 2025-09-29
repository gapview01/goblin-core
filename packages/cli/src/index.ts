#!/usr/bin/env node
import { Command } from "commander";
import { promises as fs } from "fs";
import path from "path";
import { JsonFileReceiptStore, Plan, TaskSpec, WalletAdapter, formatReceipt } from "@goblin/core";
import { PolicyEngine, createPlan as sdkCreatePlan, preview as sdkPreview, run as sdkRun, simulate as sdkSimulate } from "@goblin/sdk";
import { createSolanaAdapter } from "@goblin/solana-adapter";

const NON_CUSTODIAL_WARNING = "You sign every action. We never hold funds.";
const RECEIPT_DIRECTORY = path.resolve(process.cwd(), ".goblin/receipts");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const resolved = path.resolve(filePath);
  const contents = await fs.readFile(resolved, "utf8");
  return JSON.parse(contents) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const resolved = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(data, null, 2), "utf8");
}

async function loadPolicy(allowlistPath?: string, riskPath?: string): Promise<PolicyEngine | undefined> {
  if (!allowlistPath && !riskPath) {
    return undefined;
  }
  return PolicyEngine.fromFiles({ allowlistPath, riskPath });
}

function logWarning(): void {
  console.log(`\n⚠️  ${NON_CUSTODIAL_WARNING}\n`);
}

function resolveWallet(spec: string | undefined): WalletAdapter {
  const option = spec ?? "mock";
  if (option === "mock") {
    return {
      publicKey: "11111111111111111111111111111111",
      async signTransaction(tx: unknown): Promise<unknown> {
        console.log("Mock wallet signing transaction (no funds moved). Use a real adapter for production.");
        return tx;
      },
    };
  }
  if (option.startsWith("adapter:")) {
    throw new Error(`Wallet adapter ${option} is not implemented in the CLI demo.`);
  }
  throw new Error(`Unknown wallet spec: ${option}`);
}

async function withErrorHandling(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}

function printPreview(plan: Plan, summary: string, risks: string[]): void {
  console.log(`Plan ${plan.id}`);
  console.log(summary);
  if (risks.length > 0) {
    console.log("Risks:");
    for (const risk of risks) {
      console.log(` - ${risk}`);
    }
  } else {
    console.log("Risks: none detected by policy.");
  }
}

const program = new Command();
program
  .name("goblin")
  .description("Plan, preview, simulate, and execute airdrop eligibility actions.")
  .version("0.1.0");

program
  .command("plan")
  .description("Create a plan from a task specification.")
  .requiredOption("--task <path>", "Path to the task JSON file.")
  .option("--out <path>", "Destination for the generated plan JSON.")
  .action((options: { task: string; out?: string }) =>
    withErrorHandling(async () => {
      const task = await readJsonFile<TaskSpec>(options.task);
      const plan = sdkCreatePlan(task);
      if (options.out) {
        await writeJsonFile(options.out, plan);
        console.log(`Plan saved to ${path.resolve(options.out)}.`);
      } else {
        console.log(JSON.stringify(plan, null, 2));
      }
    }),
  );

program
  .command("preview")
  .description("Preview a plan against policy constraints.")
  .requiredOption("--plan <path>", "Path to the plan JSON file.")
  .option("--policy <path>", "Allowlist policy JSON file.")
  .option("--risk <path>", "Risk policy JSON file.")
  .action((options: { plan: string; policy?: string; risk?: string }) =>
    withErrorHandling(async () => {
      const plan = await readJsonFile<Plan>(options.plan);
      const adapter = createSolanaAdapter();
      const policy = await loadPolicy(options.policy, options.risk);
      const preview = await sdkPreview(adapter, plan, policy);
      logWarning();
      printPreview(plan, preview.summary, preview.risks);
      if (preview.feeEstimate) {
        console.log(`Estimated fees: ${preview.feeEstimate}`);
      }
    }),
  );

program
  .command("simulate")
  .description("Simulate a plan without executing transactions.")
  .requiredOption("--plan <path>", "Path to the plan JSON file.")
  .option("--policy <path>", "Allowlist policy JSON file.")
  .option("--risk <path>", "Risk policy JSON file.")
  .action((options: { plan: string; policy?: string; risk?: string }) =>
    withErrorHandling(async () => {
      const plan = await readJsonFile<Plan>(options.plan);
      const adapter = createSolanaAdapter();
      const policy = await loadPolicy(options.policy, options.risk);
      const result = await sdkSimulate(adapter, plan, policy);
      logWarning();
      if (!result.ok) {
        console.log("Simulation blocked by policy: ");
        for (const message of result.messages) {
          console.log(` - ${message}`);
        }
        return;
      }
      console.log(`Simulation succeeded with ${result.txCount} transaction(s).`);
      for (const message of result.messages) {
        console.log(` - ${message}`);
      }
    }),
  );

program
  .command("run")
  .description("Execute a previously simulated plan.")
  .requiredOption("--plan <path>", "Path to the plan JSON file.")
  .option("--policy <path>", "Allowlist policy JSON file.")
  .option("--risk <path>", "Risk policy JSON file.")
  .option("--wallet <spec>", "Wallet adapter spec (default: mock).", "mock")
  .action((options: { plan: string; policy?: string; risk?: string; wallet: string }) =>
    withErrorHandling(async () => {
      const plan = await readJsonFile<Plan>(options.plan);
      const adapter = createSolanaAdapter();
      const policy = await loadPolicy(options.policy, options.risk);
      const preview = await sdkPreview(adapter, plan, policy);
      logWarning();
      console.log("Preview before execution:");
      printPreview(plan, preview.summary, preview.risks);
      const simulation = await sdkSimulate(adapter, plan, policy);
      if (!simulation.ok) {
        console.log("Execution aborted because simulation failed:");
        for (const message of simulation.messages) {
          console.log(` - ${message}`);
        }
        return;
      }
      const wallet = resolveWallet(options.wallet);
      const result = await sdkRun(adapter, plan, wallet, policy);
      console.log(`Execution complete. Submitted ${result.txids.length} transaction(s).`);
      if (result.txids.length > 0) {
        console.log("Transactions:");
        for (const txid of result.txids) {
          console.log(` - https://solscan.io/tx/${txid}`);
        }
      }
      console.log(`Receipts stored under ${RECEIPT_DIRECTORY}.`);
    }),
  );

program
  .command("receipts")
  .description("List or show saved execution receipts.")
  .option("--list", "List all receipts.")
  .option("--show <id>", "Display a specific receipt by ID.")
  .action((options: { list?: boolean; show?: string }) =>
    withErrorHandling(async () => {
      const store = new JsonFileReceiptStore();
      if (options.list) {
        const receipts = await store.list();
        if (receipts.length === 0) {
          console.log("No receipts found.");
          return;
        }
        console.log("Receipts:");
        for (const receipt of receipts) {
          console.log(` - ${receipt.id} (${receipt.createdAt})`);
        }
        return;
      }
      if (options.show) {
        const receipt = await store.get(options.show);
        if (!receipt) {
          console.log(`Receipt ${options.show} not found.`);
          return;
        }
        console.log(formatReceipt(receipt));
        return;
      }
      console.log("Specify --list or --show <id> to manage receipts.");
    }),
  );

program.parseAsync(process.argv);
