import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { Plan, Receipt, Step } from "../types/plan";
import { readJsonFile, writeJsonFile } from "../utils/jsonfile";

export interface ReceiptStore {
  save(receipt: Receipt): Promise<void>;
  list(): Promise<Receipt[]>;
  get(id: string): Promise<Receipt | undefined>;
}

const RECEIPTS_DIR = join(process.cwd(), ".goblin", "receipts");

export function createReceiptFromPlan(
  plan: Plan,
  txids: string[],
  metadata?: Record<string, unknown>,
): Receipt {
  return {
    id: randomUUID(),
    planId: plan.id,
    chain: plan.chain,
    steps: plan.steps.map((step: Step) => ({ ...step })),
    txids,
    createdAt: new Date().toISOString(),
    metadata,
  };
}

export class JsonFileReceiptStore implements ReceiptStore {
  constructor(private readonly basePath = RECEIPTS_DIR) {}

  private pathFor(id: string): string {
    return join(this.basePath, `${id}.json`);
  }

  async save(receipt: Receipt): Promise<void> {
    await writeJsonFile(this.pathFor(receipt.id), receipt);
  }

  async list(): Promise<Receipt[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const receipts: Receipt[] = [];
      for (const file of files.filter((f) => f.endsWith(".json"))) {
        const data = await readJsonFile<Receipt>(join(this.basePath, file));
        if (data) {
          receipts.push(data);
        }
      }
      return receipts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async get(id: string): Promise<Receipt | undefined> {
    return readJsonFile<Receipt>(this.pathFor(id));
  }
}
