# Migration notes for private-policy integrations

Goblin Core intentionally omits proprietary policy, risk, and prompt logic. Private repositories can plug into the public executor through the following hooks.

## Policy engines

- `@goblin/core` exports `setDefaultPolicyHook(hook: PolicyHook)`.
- Call this once during application bootstrap to replace the allow-all default.
- The hook receives the full `Plan` and can perform arbitrary checks (allowlists, slippage, rate limits, heuristics, etc.).
- Return `{ ok: false, issues }` to block execution. Issues are rendered in the preview/simulation output.

```ts
import { setDefaultPolicyHook } from "@goblin/core";

setDefaultPolicyHook({
  async validate(plan) {
    const issues: string[] = [];
    // ...policy logic...
    const ok = issues.length === 0;
    return { ok, issues };
  },
});
```

## Prompt/UX surfaces

- The planner, preview builder, and receipt store are pure modules.
- Private UX layers can call `createPlan`, `buildPreview`, `runExecutionPipeline`, and `JsonFileReceiptStore` (or implement the `ReceiptStore` interface) without importing internal policy code.
- Prompt selection for agentic workflows should wrap around `preview.summary` and `preview.risks`. Add proprietary UX copy outside of this repo.

## Transaction relays

- Retail mode expects an injected `WalletAdapter` with a `signTransaction` callback.
- Machine mode receives `{ unsignedTxs }` containing base64-encoded Solana `VersionedTransaction`s. Private relays can sign, submit, and store receipts independently.

## Extending adapters

- Additional Solana verbs (for example `stake`, `unstake`, aggregator-backed `swap`) should live in a private repo and extend the `Adapter` contract.
- EVM support is stubbed (`createStubEvmAdapter`) and can be replaced with Permit2 / ERC-4337 aware adapters without touching the public code.

Keep the public surface area stable (types + hooks) so downstream integrators can trust the open-core contracts while private services add value via policy, data, and attestations.
