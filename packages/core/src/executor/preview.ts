import { AdapterEncodeResult } from "../types/adapter";
import { Plan, Preview, Step } from "../types/plan";

export interface PreviewOptions {
  feeFormatter?: (lamports: number) => string;
  adapterMetadata?: Record<string, string>;
  encoded?: AdapterEncodeResult["encoded"];
  feeEstimateLamports?: number;
}

const VERB_DESCRIPTIONS: Record<string, string> = {
  balance: "Check SOL balance",
  tokenBalance: "Check token balance",
  wrap: "Wrap SOL into WSOL",
  unwrap: "Unwrap WSOL back into SOL",
  quote: "Fetch a price quote",
  swap: "Swap one token for another",
  stake: "Stake tokens",
  unstake: "Unstake tokens",
  approve: "Approve token spending",
};

function describeStep(step: Step, metadata?: Record<string, string>): string {
  const base = VERB_DESCRIPTIONS[step.verb] ?? `Perform ${step.verb}`;
  const humanContract = metadata?.[String(step.params.contract ?? "")] ?? "";
  const detailParts: string[] = [];
  if (step.params.amountLamports) {
    detailParts.push(`${Number(step.params.amountLamports) / 1_000_000_000} SOL`);
  }
  if (step.params.fromMint && step.params.toMint) {
    detailParts.push(`from ${(metadata?.[String(step.params.fromMint)] ?? step.params.fromMint) as string}`);
    detailParts.push(`to ${(metadata?.[String(step.params.toMint)] ?? step.params.toMint) as string}`);
  }
  const details = detailParts.length > 0 ? ` (${detailParts.join(", ")})` : "";
  const contractSuffix = humanContract ? ` via ${humanContract}` : "";
  return `${base}${details}${contractSuffix}`;
}

function riskHintsForStep(step: Step): string[] {
  switch (step.verb) {
    case "swap":
      return ["Token prices can move quickly; confirm slippage limits before signing."];
    case "wrap":
    case "unwrap":
      return ["Wrapping and unwrapping briefly locks SOL; ensure you have rent and fees covered."];
    default:
      return [];
  }
}

export function buildPreview(plan: Plan, options: PreviewOptions = {}): Preview {
  const summarySteps = plan.steps.map((step, index) => `${index + 1}. ${describeStep(step, options.adapterMetadata)}`);
  const summary = `Plan ${plan.id} on ${plan.chain} has ${plan.steps.length} step(s):\n${summarySteps.join("\n")}`;
  const risks = Array.from(new Set(plan.steps.flatMap((step) => riskHintsForStep(step))));
  const preview: Preview = {
    planId: plan.id,
    summary,
    risks,
  };

  if (options.feeEstimateLamports !== undefined) {
    const formatted = options.feeFormatter?.(options.feeEstimateLamports);
    preview.feeEstimate = formatted ?? `${options.feeEstimateLamports} lamports`;
  }

  if (options.encoded) {
    preview.encoded = options.encoded;
  }

  return preview;
}
