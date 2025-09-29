import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { ExecutionResult, Plan, Receipt } from "./types";

export interface ReceiptStore {
  save(receipt: Receipt): Promise<void>;
  list(): Promise<Receipt[]>;
  get(id: string): Promise<Receipt | undefined>;
}

export class JsonFileReceiptStore implements ReceiptStore {
  private readonly directory: string;

  constructor(rootDirectory?: string) {
    const baseDir = rootDirectory ?? path.resolve(process.cwd(), ".goblin/receipts");
    this.directory = baseDir;
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true });
  }

  private receiptPath(id: string): string {
    return path.join(this.directory, `${id}.json`);
  }

  public async save(receipt: Receipt): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.receiptPath(receipt.id);
    await fs.writeFile(filePath, JSON.stringify(receipt, null, 2), "utf8");
  }

  public async list(): Promise<Receipt[]> {
    await this.ensureDirectory();
    const files = await fs.readdir(this.directory);
    const receipts: Receipt[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const content = await fs.readFile(path.join(this.directory, file), "utf8");
      receipts.push(JSON.parse(content) as Receipt);
    }
    return receipts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async get(id: string): Promise<Receipt | undefined> {
    try {
      const content = await fs.readFile(this.receiptPath(id), "utf8");
      return JSON.parse(content) as Receipt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }
}

export function createReceipt(plan: Plan, txids: string[]): Receipt {
  return {
    id: randomUUID(),
    planId: plan.id,
    chain: plan.chain,
    steps: plan.steps,
    txids,
    createdAt: new Date().toISOString(),
  };
}

export function formatReceipt(receipt: Receipt): string {
  const header = [`Receipt ${receipt.id}`, `Plan: ${receipt.planId}`, `Chain: ${receipt.chain}`];
  const stepSummary = receipt.steps.map((step, index) => `  ${index + 1}. ${step.verb}`);
  const txLinks = receipt.txids.map((txid) => `  https://solscan.io/tx/${txid}`);
  return [
    ...header,
    `Steps:`,
    ...stepSummary,
    `Transactions:`,
    ...(txLinks.length > 0 ? txLinks : ["  (no transactions recorded)"]),
    `Created: ${receipt.createdAt}`,
  ].join("\n");
}

export function mergeExecutionWithReceipts(plan: Plan, execution: ExecutionResult): ExecutionResult {
  const receipts = execution.receipts.length > 0 ? execution.receipts : [createReceipt(plan, execution.txids)];
  return {
    ...execution,
    receipts,
  };
}
