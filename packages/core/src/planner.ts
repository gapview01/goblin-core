import { randomUUID } from "crypto";
import { Plan, Step, TaskSpec, TaskStepInput, Verb } from "./types";

const SUPPORTED_VERBS: Verb[] = [
  "balance",
  "tokenBalance",
  "wrap",
  "unwrap",
  "quote",
  "swap",
  "stake",
  "unstake",
];

function assertVerb(verb: Verb): void {
  if (!SUPPORTED_VERBS.includes(verb)) {
    throw new Error(`Unsupported verb: ${verb}`);
  }
}

function normalizeStep(input: TaskStepInput, index: number): Step {
  const verb = input.verb;
  assertVerb(verb);
  return {
    id: input.id ?? `${verb}-${index + 1}`,
    verb,
    params: input.params ?? {},
  };
}

export class Planner {
  public static createPlan(task: TaskSpec): Plan {
    if (!task) {
      throw new Error("Task specification is required");
    }
    if (task.chain !== "solana") {
      throw new Error(`Unsupported chain: ${task.chain}`);
    }
    if (!task.steps || task.steps.length === 0) {
      throw new Error("Task must include at least one step");
    }

    const steps = task.steps.map((step, index) => normalizeStep(step, index));

    return {
      id: task.id ?? randomUUID(),
      chain: task.chain,
      steps,
      createdAt: new Date().toISOString(),
    };
  }
}

export function createPlan(task: TaskSpec): Plan {
  return Planner.createPlan(task);
}
