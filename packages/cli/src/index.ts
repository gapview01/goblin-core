#!/usr/bin/env node
import { Command } from "commander";
import { promises as fs } from "fs";
import { dirname, resolve } from "path";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import {
  ExecutionResult,
  JsonFileReceiptStore,
  Plan,
  Preview,
  Receipt,
  SimulationResult,
  WalletAdapter,
} from "@goblin/core";
import { createPlan as sdkCreatePlan, executePlan as sdkExecutePlan, listReceipts, previewPlan, simulatePlan } from "@goblin/sdk";
import { createSolanaAdapter } from "@goblin/solana-adapter";

const NON_CUSTODIAL_WARNING =
  "Goblin never sees your private keys. Use injected signers or export unsigned transactions for external signing.";

async function readJsonFile<T>(pathLike: string): Promise<T> {
  const filePath = resolve(pathLike);
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

async function writeJsonFile(pathLike: string, data: unknown): Promise<void> {
  const filePath = resolve(pathLike);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function ensureWalletMetadata(plan: Plan, walletAddress?: string): Plan {
  if (!walletAddress) {
    return plan;
  }
  const updated: Plan = {
    ...plan,
    metadata: { ...plan.metadata, walletPublicKey: walletAddress },
  };
  return updated;
}

async function loadKeypair(pathLike: string): Promise<Keypair> {
  const filePath = resolve(pathLike);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as number[] | { secretKey: number[] };
  if (Array.isArray(parsed)) {
    return Keypair.fromSecretKey(new Uint8Array(parsed));
  }
  if (Array.isArray(parsed.secretKey)) {
    return Keypair.fromSecretKey(new Uint8Array(parsed.secretKey));
  }
  throw new Error("Unsupported keypair file format. Provide JSON array of numbers.");
}

function createWalletAdapter(keypair: Keypair): WalletAdapter {
  return {
    publicKey: keypair.publicKey.toBase58(),
    async signTransaction(tx: unknown): Promise<unknown> {
      const transaction = tx as VersionedTransaction;
      transaction.sign([keypair]);
      return transaction;
    },
  };
}

async function outputPreview(preview: Preview): Promise<void> {
  console.log("\n=== Preview ===");
  console.log(preview.summary);
  if (preview.feeEstimate) {
    console.log(`Estimated fees: ${preview.feeEstimate}`);
  }
  if (preview.risks.length > 0) {
    console.log("Risks:");
    for (const risk of preview.risks) {
      console.log(` - ${risk}`);
    }
  } else {
    console.log("Risks: none identified by default policy.");
  }
}

function outputSimulation(simulation: SimulationResult): void {
  console.log("\n=== Simulation ===");
  console.log(simulation.ok ? "Simulation OK" : "Simulation failed");
  console.log(`Transactions: ${simulation.txCount}`);
  for (const message of simulation.messages) {
    console.log(` - ${message}`);
  }
}

function outputExecution(result: ExecutionResult): void {
  console.log("\n=== Execution ===");
  console.log(`Submitted ${result.txids.length} transaction(s).`);
  for (const txid of result.txids) {
    console.log(` - ${txid}`);
  }
  console.log("Receipt IDs:");
  for (const receipt of result.receipts) {
    console.log(` - ${receipt.id}`);
  }
}

async function runPlanCommand(options: {
  preset: string;
  chain: "solana" | "evm";
  out?: string;
  wallet?: string;
}): Promise<void> {
  const plan = sdkCreatePlan(options.chain, {
    preset: options.preset as never,
    context: options.wallet ? { walletPublicKey: options.wallet } : undefined,
  });
  const finalPlan = ensureWalletMetadata(plan, options.wallet);
  if (options.out) {
    await writeJsonFile(options.out, finalPlan);
    console.log(`Plan saved to ${resolve(options.out)}.`);
  } else {
    console.log(JSON.stringify(finalPlan, null, 2));
  }
}

async function runPreviewCommand(options: { plan: string; cluster: string }): Promise<void> {
  const plan = await readJsonFile<Plan>(options.plan);
  const adapter = createSolanaAdapter({ connectionConfig: { cluster: options.cluster as never } });
  const preview = await previewPlan({ adapter, plan });
  console.log(`\n${NON_CUSTODIAL_WARNING}\n`);
  await outputPreview(preview);
}

async function runSimulateCommand(options: { plan: string; cluster: string }): Promise<void> {
  const plan = await readJsonFile<Plan>(options.plan);
  const adapter = createSolanaAdapter({ connectionConfig: { cluster: options.cluster as never } });
  const simulation = await simulatePlan({ adapter, plan });
  console.log(`\n${NON_CUSTODIAL_WARNING}\n`);
  outputSimulation(simulation);
}

async function runExecuteCommand(options: {
  plan: string;
  cluster: string;
  mode: "retail" | "machine";
  keypair?: string;
}): Promise<void> {
  let plan = await readJsonFile<Plan>(options.plan);
  const adapter = createSolanaAdapter({ connectionConfig: { cluster: options.cluster as never } });

  let wallet: WalletAdapter | undefined;
  if (options.mode === "retail") {
    if (!options.keypair) {
      throw new Error("Retail mode requires --keypair pointing to a local Solana keypair JSON file.");
    }
    const keypair = await loadKeypair(options.keypair);
    wallet = createWalletAdapter(keypair);
    plan = ensureWalletMetadata(plan, wallet.publicKey);
  }

  const preview = await previewPlan({ adapter, plan });
  const simulation = await simulatePlan({ adapter, plan });
  console.log(`\n${NON_CUSTODIAL_WARNING}\n`);
  await outputPreview(preview);
  outputSimulation(simulation);
  if (!simulation.ok) {
    console.error("Simulation failed. Execution halted.");
    return;
  }

  if (options.mode === "machine") {
    if (!plan.metadata?.walletPublicKey) {
      throw new Error("Plan metadata must include walletPublicKey for machine mode execution.");
    }
    const result = await sdkExecutePlan({ adapter, plan });
    if (!("unsignedTxs" in result)) {
      console.log("Adapter returned signed execution unexpectedly. Returning transactions as base64.");
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log("\nUnsigned transactions (base64):");
    for (const tx of result.unsignedTxs) {
      console.log(` - ${tx}`);
    }
    return;
  }
  if (!wallet) {
    throw new Error("Wallet was not initialized for retail execution.");
  }
  const execution = await sdkExecutePlan({ adapter, plan, wallet });
  if ("unsignedTxs" in execution) {
    console.log("Adapter returned unsigned transactions even in retail mode:");
    console.log(JSON.stringify(execution, null, 2));
    return;
  }
  outputExecution(execution);
}

async function runReceiptsCommand(options: { list?: boolean; show?: string }): Promise<void> {
  const store = new JsonFileReceiptStore();
  if (options.list) {
    const receipts = await listReceipts(store);
    if (receipts.length === 0) {
      console.log("No receipts found.");
      return;
    }
    console.log("\nReceipts:");
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
    printReceipt(receipt);
    return;
  }
  console.log("Specify --list or --show <id> to inspect receipts.");
}

function printReceipt(receipt: Receipt): void {
  console.log(`Receipt ${receipt.id}`);
  console.log(`Plan: ${receipt.planId}`);
  console.log(`Chain: ${receipt.chain}`);
  console.log(`Created: ${receipt.createdAt}`);
  console.log("Steps:");
  for (const step of receipt.steps) {
    console.log(` - ${step.verb}`);
  }
  console.log("Transactions:");
  for (const txid of receipt.txids) {
    console.log(` - ${txid}`);
  }
}

const program = new Command();
program
  .name("goblin")
  .description("Plan → Preview → Simulate → Execute non-custodial Solana workflows.")
  .version("0.1.0");

program
  .command("plan")
  .description("Create a plan from a preset.")
  .requiredOption("--preset <name>", "Preset task name, e.g. airdrop-lite")
  .requiredOption("--chain <chain>", "Target chain", "solana")
  .option("--wallet <address>", "Wallet public key for metadata")
  .option("--out <path>", "Destination file for the plan JSON")
  .action((opts) =>
    runPlanCommand({
      preset: opts.preset,
      chain: opts.chain,
      out: opts.out,
      wallet: opts.wallet,
    }).catch((error) => {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }),
  );

program
  .command("preview")
  .description("Generate a human-readable preview for a plan.")
  .requiredOption("--plan <path>", "Path to a plan JSON file")
  .option("--cluster <cluster>", "Solana cluster", "devnet")
  .action((opts: { plan: string; cluster: string }) =>
    runPreviewCommand({ plan: opts.plan, cluster: opts.cluster }).catch((error) => {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }),
  );

program
  .command("simulate")
  .description("Simulate plan transactions without sending them.")
  .requiredOption("--plan <path>", "Path to a plan JSON file")
  .option("--cluster <cluster>", "Solana cluster", "devnet")
  .action((opts: { plan: string; cluster: string }) =>
    runSimulateCommand({ plan: opts.plan, cluster: opts.cluster }).catch((error) => {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }),
  );

program
  .command("execute")
  .description("Execute a plan in retail or machine mode.")
  .requiredOption("--plan <path>", "Path to a plan JSON file")
  .option("--cluster <cluster>", "Solana cluster", "devnet")
  .option("--mode <mode>", "retail or machine", "retail")
  .option("--keypair <path>", "Local Solana keypair JSON (required for retail mode)")
  .action((opts: { plan: string; cluster: string; mode: "retail" | "machine"; keypair?: string }) =>
    runExecuteCommand({ plan: opts.plan, cluster: opts.cluster, mode: opts.mode, keypair: opts.keypair }).catch((error) => {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }),
  );

program
  .command("receipts")
  .description("List or show stored receipts.")
  .option("--list", "List receipts")
  .option("--show <id>", "Display a single receipt")
  .action((opts: { list?: boolean; show?: string }) =>
    runReceiptsCommand(opts).catch((error) => {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }),
  );

program.parseAsync(process.argv);
