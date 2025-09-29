# Goblin Core

Goblin Core is a Solana-first, non-custodial toolkit for planning, previewing, simulating, and executing a curated set of airdrop eligibility actions. The project ships an SDK, a Solana adapter, and a CLI that work together to provide safe, policy-driven workflows with preview and simulation guardrails before any transaction is signed.

## Features

- 🔒 **Non-custodial by design** – wallet integrations rely on injected signers; seed phrases are never requested or stored.
- 🧠 **Planner & policy engine** – build plans from simple task specs and enforce allowlists, slippage caps, and risk policies.
- 🧪 **Preview & simulate** – inspect planned steps and dry-run simulations before signing anything.
- 🧾 **Receipts** – every execution stores human-readable JSON receipts under `.goblin/receipts`.
- 🛠️ **CLI & SDK** – automate workflows or script them with TypeScript.

## Getting started

Prerequisites: Node.js 18+

```bash
npm install
npm run build
npm test
```

## CLI quick start

The CLI is published as part of the workspace. You can run it locally via `npx`:

```bash
npx goblin plan --task ./examples/simple-task.json --out plan.json
npx goblin preview --plan plan.json --policy ./policy/allowlist.example.json
npx goblin simulate --plan plan.json
npx goblin run --plan plan.json --wallet mock
npx goblin receipts --list
```

Each command prints a non-custodial warning. `run` will show the preview summary before execution and persist receipts.

## Packages

- `@goblin/core` – core types, planner, policy engine, simulator utilities, executor, and receipt store.
- `@goblin/solana-adapter` – Solana-specific encoding, simulation, and execution helpers backed by `@solana/web3.js`.
- `@goblin/sdk` – ergonomic helpers around the core planning, simulation, and execution flows.
- `@goblin/cli` – Commander-based CLI that orchestrates planning through receipts.

## Development

- `npm run lint` – run ESLint across the repo.
- `npm run build` – compile all workspace packages.
- `npm test` – execute the Vitest unit tests.

Pull requests and issues are welcome! Please review [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before participating.

## License

Licensed under the [Apache License 2.0](./LICENSE). See [NOTICE](./NOTICE) for attribution.

Goblin Core is a community project. The Goblin name and logo may be reserved — see [TRADEMARKS.md](./TRADEMARKS.md) for details.
