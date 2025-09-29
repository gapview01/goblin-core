import { promises as fs } from "fs";
import path from "path";
import { Plan, ValidationResult } from "./types";

export interface AllowlistPolicy {
  allowedPrograms: string[];
  allowedMints: string[];
  maxSlippageBps?: number;
  maxApprovalMinutes?: number;
}

export interface RiskPolicy {
  blockNewPrograms?: boolean;
  blockUnverifiedMints?: boolean;
  maxTxPerRun?: number;
}

export interface PolicyConfig {
  allowlist?: AllowlistPolicy;
  risk?: RiskPolicy;
}

async function readJsonFile<T>(filePath: string | undefined): Promise<T | undefined> {
  if (!filePath) {
    return undefined;
  }
  const resolved = path.resolve(filePath);
  const data = await fs.readFile(resolved, "utf8");
  return JSON.parse(data) as T;
}

function valueIsNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function extractProgramId(params: Record<string, unknown>): string | undefined {
  const programId = params.programId ?? params.targetProgram ?? params.validatorProgram;
  return valueIsNonEmptyString(programId) ? programId : undefined;
}

function extractMintIds(params: Record<string, unknown>): string[] {
  const fields = ["mint", "fromMint", "toMint", "stakeMint"] as const;
  const mints: string[] = [];
  for (const field of fields) {
    const value = params[field];
    if (valueIsNonEmptyString(value)) {
      mints.push(value);
    }
  }
  return mints;
}

function extractSlippage(params: Record<string, unknown>): number | undefined {
  const value = params.slippageBps;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractApprovalMinutes(params: Record<string, unknown>): number | undefined {
  const value = params.approvalMinutes;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export class PolicyEngine {
  constructor(private readonly config: PolicyConfig = {}) {}

  public static async fromFiles(options: {
    allowlistPath?: string;
    riskPath?: string;
  }): Promise<PolicyEngine> {
    const [allowlist, risk] = await Promise.all([
      readJsonFile<AllowlistPolicy>(options.allowlistPath),
      readJsonFile<RiskPolicy>(options.riskPath),
    ]);
    return new PolicyEngine({ allowlist, risk });
  }

  public validate(plan: Plan): ValidationResult {
    const issues: string[] = [];
    const allowlist = this.config.allowlist;
    const risk = this.config.risk;

    if (risk?.maxTxPerRun && plan.steps.length > risk.maxTxPerRun) {
      issues.push(
        `Plan contains ${plan.steps.length} steps which exceeds policy cap of ${risk.maxTxPerRun}.`,
      );
    }

    for (const step of plan.steps) {
      const params = step.params ?? {};
      const programId = extractProgramId(params);
      const mints = extractMintIds(params);
      const slippage = extractSlippage(params);
      const approvalMinutes = extractApprovalMinutes(params);

      if (allowlist?.allowedPrograms && allowlist.allowedPrograms.length > 0) {
        if (programId && !allowlist.allowedPrograms.includes(programId)) {
          issues.push(`Step ${step.id} targets program ${programId} which is not on the allowlist.`);
        } else if (!programId && risk?.blockNewPrograms) {
          issues.push(`Step ${step.id} is missing a programId and risk policy blocks unknown programs.`);
        }
      }

      if (allowlist?.allowedMints && allowlist.allowedMints.length > 0) {
        for (const mint of mints) {
          if (!allowlist.allowedMints.includes(mint)) {
            issues.push(`Step ${step.id} references mint ${mint} which is not on the allowlist.`);
          }
        }
      } else if (risk?.blockUnverifiedMints) {
        for (const mint of mints) {
          issues.push(`Step ${step.id} references mint ${mint} but risk policy blocks unverified mints.`);
        }
      }

      if (
        allowlist?.maxSlippageBps !== undefined &&
        slippage !== undefined &&
        slippage > allowlist.maxSlippageBps
      ) {
        issues.push(
          `Step ${step.id} slippage ${slippage}bps exceeds maximum of ${allowlist.maxSlippageBps}bps.`,
        );
      }

      if (
        allowlist?.maxApprovalMinutes !== undefined &&
        approvalMinutes !== undefined &&
        approvalMinutes > allowlist.maxApprovalMinutes
      ) {
        issues.push(
          `Step ${step.id} approval window ${approvalMinutes} minutes exceeds maximum of ${allowlist.maxApprovalMinutes}.`,
        );
      }
    }

    return {
      ok: issues.length === 0,
      issues,
    };
  }

  public describe(plan: Plan): string {
    return `${plan.steps.length} steps across ${plan.chain} chain`;
  }
}
