# Goblin Core SDK API

This document outlines the public TypeScript entrypoints exported by `@goblin/sdk`. The SDK wraps the lower-level primitives in `@goblin/core` and is safe to consume from Node.js or browser-based TypeScript projects.

## Types

The SDK re-exports the following types from `@goblin/core`:

- `Chain` – currently "solana" or "evm"
- `Plan`, `Step`, `Verb` – plan structure definitions
- `Preview` – human-readable plan summary
- `SimulationResult` – results from adapter simulations
- `Receipt` – persisted execution receipts

## Functions

### `createPlan(chain: Chain, options?: CreatePlanOptions): Plan`

Create a plan either from a preset (`airdrop-lite`, `balance-check`, …) or by supplying explicit steps. `CreatePlanOptions` allows you to provide:

- `preset` – the preset task name (default: `airdrop-lite`)
- `steps` – custom steps array (overrides the preset)
- `context` – metadata for presets, including `walletPublicKey`
- `metadata` – additional plan metadata to persist

### `previewPlan({ adapter, plan }: { adapter: Adapter; plan: Plan; }): Promise<Preview>`

Runs the encoding step against the provided adapter and produces a plain-English summary and risk hints. The preview includes fee estimates if provided by the adapter.

### `simulatePlan({ adapter, plan }: { adapter: Adapter; plan: Plan; }): Promise<SimulationResult>`

Encodes the plan with the adapter and invokes `adapter.simulate(encoded)` to produce aggregate simulation logs. Policies can be layered on top of this by injecting a custom `PolicyHook` via `setDefaultPolicyHook` in `@goblin/core`.

### `executePlan({ adapter, plan, wallet }: { adapter: Adapter; plan: Plan; wallet?: WalletAdapter; }): Promise<ExecutionResult | { unsignedTxs: unknown[] }>`

Runs the full Policy → Preview → Simulate → Execute pipeline:

1. `PolicyHook.validate(plan)` (defaults to allow-all)
2. `adapter.encode(plan)`
3. `adapter.simulate(encoded)` (skippable when warranted)
4. `adapter.execute(encoded, wallet)`
5. Receipts persisted to `.goblin/receipts/`

- **Retail mode**: Provide a `WalletAdapter` with `publicKey` and `signTransaction`. The adapter will sign and submit transactions, returning `ExecutionResult` with txids and receipts.
- **Machine mode**: Omit `wallet` to receive `{ unsignedTxs }` (base64-encoded Solana `VersionedTransaction`s). Callers must sign and submit them externally, then can persist receipts by calling into `JsonFileReceiptStore` if desired.

### `listReceipts(store?: JsonFileReceiptStore): Promise<Receipt[]>`

Utility helper that reads the receipt directory. Callers can provide a custom store (for example a cloud-backed implementation) that conforms to the `ReceiptStore` interface.

## Example

```ts
import { createPlan, previewPlan, simulatePlan, executePlan } from "@goblin/sdk";
import { createSolanaAdapter } from "@goblin/solana-adapter";

async function run() {
  const adapter = createSolanaAdapter();
  const plan = createPlan("solana", {
    preset: "airdrop-lite",
    context: { walletPublicKey: "YourWalletPublicKey" },
  });

  const preview = await previewPlan({ adapter, plan });
  console.log(preview.summary);

  const simulation = await simulatePlan({ adapter, plan });
  if (!simulation.ok) throw new Error(simulation.messages.join("\n"));

  const execution = await executePlan({ adapter, plan });
  if ("unsignedTxs" in execution) {
    console.log("Unsigned transactions ready for external signing:", execution.unsignedTxs);
  }
}
```

## Custom policy hooks

`@goblin/core` exposes `setDefaultPolicyHook` so private policy engines can plug in without leaking logic into the public repo. Inject your hook at process startup before calling any SDK helpers.

```ts
import { setDefaultPolicyHook } from "@goblin/core";

setDefaultPolicyHook({
  async validate(plan) {
    // Check slippage caps, allowlists, etc.
    return { ok: true, issues: [] };
  },
});
```
