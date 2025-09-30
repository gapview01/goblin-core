import { Adapter, AdapterEncodeResult, AdapterSimulationResult } from "../types/adapter";

export async function simulateEncodedPlan(
  adapter: Adapter,
  encoded: AdapterEncodeResult["encoded"],
): Promise<AdapterSimulationResult> {
  return adapter.simulate(encoded);
}
