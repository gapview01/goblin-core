# Contributing to Goblin Core

Thanks for your interest in contributing! Goblin Core is an Apache-2.0 licensed project and welcomes issues, pull requests, and ideas that help the community build safe, non-custodial tooling.

## How to contribute

1. **Discuss** – Open an issue to propose features, report bugs, or ask questions. Please search existing issues first.
2. **Fork & branch** – Create a feature branch from `main` (or the latest release branch).
3. **Follow the style** – Use the provided ESLint and Prettier configuration. TypeScript sources should pass `npm run lint` and `npm run build`.
4. **Add tests** – Include unit tests with Vitest where practical. Ensure `npm test` passes locally.
5. **Document** – Update README or inline docs when behavior changes.
6. **Pull request** – Submit a PR with a clear description of the change. Link related issues and describe testing performed.

## Development scripts

```bash
npm install        # install dependencies
npm run lint       # static analysis
npm run build      # compile workspace packages
npm test           # run unit tests
```

## Code style

- Use TypeScript with strict checks.
- Prefer pure functions in the planner/policy layers; avoid side-effects unless necessary.
- Never request or store seed phrases or private keys. Wallet interactions must go through adapter-provided `signTransaction` callbacks.
- Keep CLI output clear and human readable. Always show the non-custodial warning before any signing workflow.

## Reporting security issues

If you discover a vulnerability, please follow the process outlined in [SECURITY.md](./SECURITY.md). Never open a public issue for sensitive reports.

## License

By contributing, you agree that your contributions will be licensed under the Apache License, Version 2.0.
