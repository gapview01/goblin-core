import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPlan } from "../src/executor/planner";
import { JsonFileReceiptStore, createReceiptFromPlan } from "../src/executor/receipts";

const TEMP_DIR = join(process.cwd(), "test-output", `receipts-${Date.now()}`);

describe("receipts", () => {
  let store: JsonFileReceiptStore;

  beforeEach(() => {
    store = new JsonFileReceiptStore(TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
  });

  it("persists and retrieves receipts", async () => {
    const plan = createPlan("solana");
    const receipt = createReceiptFromPlan(plan, ["tx-123"]);
    await store.save(receipt);

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].txids[0]).toBe("tx-123");

    const fetched = await store.get(receipt.id);
    expect(fetched?.planId).toBe(plan.id);
  });
});
