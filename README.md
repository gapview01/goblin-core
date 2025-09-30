# Goblin Core

Goblin Core is a public, Solana-first executor toolkit that turns curated presets into non-custodial workflows. It includes:

- ⚙️ A light planner that expands presets (such as `airdrop-lite`) into deterministic plan steps.
- 👀 Plain-English previews and guardrail simulations before any transaction is signed.
- 🪙 A Solana adapter that can either submit signed transactions (retail mode) or export **UNSIGNED** bundles (machine mode).
- 📦 An SDK and CLI so retail users and automation partners can orchestrate Plan → Preview → Simulate → Execute → Receipt flows.

The code in this repository never imports private Goblin services. Policy, prompts, and any proprietary orchestration plug in via documented interfaces.

## Non-custodial by design

Goblin Core never requests seed phrases and never stores private keys. Retail integrations inject a signer (for example a locally stored devnet keypair), while machine integrations receive unsigned transaction bundles that must be signed elsewhere.

## Repository layout

```
packages/
  core/             # Types, planner, preview, simulator, executor, receipt store, utilities
  solana-adapter/   # Public Solana adapter that encodes, simulates, and executes plans
  sdk/              # High-level helpers that wrap the core pipeline
  cli/              # `npx goblin …` commands for Plan → Preview → Simulate → Execute → Receipts
policy/             # Example policy data (no private logic)
examples/           # Sample presets and walkthrough assets
```

## Quick start

Prerequisites: Node.js 20+

```bash
npm install
npm run build
npm test
```

### Create and inspect a plan

```bash
# Create a plan using the built-in preset and persist it to plan.json
npx goblin plan --preset airdrop-lite --chain solana --wallet <YOUR_SOL_ADDRESS> --out plan.json

# Generate a preview (human-readable summary + risks)
npx goblin preview --plan plan.json --cluster devnet

# Run a simulation
npx goblin simulate --plan plan.json --cluster devnet
```

### Execute

Retail execution requires injecting your own signer (for example a local Solana keypair file with devnet funds):

```bash
npx goblin execute --plan plan.json --cluster devnet --mode retail --keypair ~/.config/solana/devnet.json
```

Machine integrations can export unsigned bundles instead:

```bash
npx goblin execute --plan plan.json --cluster devnet --mode machine > unsigned.json
```

Receipts are written under `.goblin/receipts/` after each successful execution.

### List receipts

```bash
npx goblin receipts --list
npx goblin receipts --show <receipt-id>
```

## SDK usage

See [API.md](./API.md) for end-to-end examples of the SDK entrypoints.

## Testing

- `npm run lint` – ESLint across the workspace
- `npm run build` – compile the TypeScript sources
- `npm test` – Vitest unit + integration tests (the Solana integration test uses a mocked connection and does not touch mainnet)

## Contributing

Review [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md) before opening a pull request. Goblin Core ships under the [Apache 2.0 license](./LICENSE); trademarks remain under [TRADEMARKS.md](./TRADEMARKS.md).
