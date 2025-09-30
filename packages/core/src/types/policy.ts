import { Plan } from "./plan";

export interface PolicyValidation {
  ok: boolean;
  issues: string[];
}

export interface PolicyHook {
  validate(plan: Plan): Promise<PolicyValidation>;
}

class AllowAllPolicy implements PolicyHook {
  async validate(): Promise<PolicyValidation> {
    return { ok: true, issues: [] };
  }
}

let defaultPolicyHook: PolicyHook = new AllowAllPolicy();

export function setDefaultPolicyHook(hook: PolicyHook): void {
  defaultPolicyHook = hook;
}

export function getDefaultPolicyHook(): PolicyHook {
  return defaultPolicyHook;
}

export const allowAllPolicy = new AllowAllPolicy();
