import { createHash } from "crypto";

export function createDeterministicId(input: string, prefix = "goblin"): string {
  const hash = createHash("sha256").update(input).digest("hex");
  return `${prefix}-${hash.slice(0, 16)}`;
}
