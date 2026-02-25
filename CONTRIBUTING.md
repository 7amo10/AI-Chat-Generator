# Contributing to AI Chat Generator

Thank you for considering a contribution. This document explains how to set up a development environment, the conventions used in this project, and the process for submitting changes.

---

## Code of Conduct

By participating in this project you agree to abide by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behaviour to the project maintainers.

---

## Development Setup

**1. Fork and clone**

```bash
git clone https://github.com/your-username/ai-chat-generator.git
cd ai-chat-generator
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the development server**

```bash
npm run dev
```

The site is available at `http://localhost:4321`.

---

## Repository Layout

| Path | Purpose |
|---|---|
| `src/components/` | React islands and Astro UI components |
| `src/content/` | MDX content files (chats and plans) |
| `src/pages/` | Astro page routes and API endpoints |
| `src/styles/` | Global CSS with theme token system |
| `mcp/utils.mjs` | Pure utility functions shared by the server and tests |
| `mcp/server.mjs` | MCP server entry point |
| `scripts/` | CLI scaffolding helpers |
| `tests/` | Vitest unit tests |
| `.github/workflows/` | CI pipeline |

---

## Making Changes

### Branching

Use descriptive branch names:

```
feat/add-search-page
fix/mcp-filename-validation
docs/update-mcp-reference
refactor/extract-plan-utils
```

### Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org) specification:

```
feat: add full-text search to timeline
fix: validate filename before writing plan file
docs: expand MCP tools reference in docs page
refactor: extract readFrontmatter into shared utils
test: add coverage for buildFrontmatter edge cases
chore: update Three.js to 0.184.0
```

Use the imperative present tense in the subject line. Keep the subject under 72 characters.

### Code Style

- TypeScript is required for all `src/` files.
- `mcp/` and `scripts/` use plain ES modules (`.mjs`).
- `prefer-const` and `no-var` are enforced by ESLint.
- Avoid `any` in TypeScript where a more specific type is available.
- Do not add `console.log` to production code paths; use `console.error` only for genuine error reporting in scripts.

---

## Running the Test Suite

```bash
npm test                   # Single run, all tests
npm run test:watch         # Re-runs on file change
npm run test:coverage      # Generates a coverage report in coverage/
```

All tests must pass before submitting a pull request. New utility functions in `mcp/utils.mjs` or `src/lib/` should be accompanied by tests in `tests/`.

---

## Type Checking

```bash
npx astro check
```

There should be no TypeScript errors before opening a PR.

---

## Pull Request Process

1. Open a pull request against the `main` branch.
2. Fill in the PR template: describe what changed, why, and how to test it.
3. Ensure the CI pipeline (tests, type check, build) passes.
4. Request a review from a maintainer.
5. Address review comments with additional commits or force-push after a rebase.
6. A maintainer will squash-merge the PR once it is approved.

---

## Reporting Issues

Search existing issues before opening a new one. When filing a bug report, include:

- A clear and concise description of the problem.
- Steps to reproduce.
- The Node.js version (`node --version`) and operating system.
- Any relevant error output.

For feature requests, describe the use case and the proposed behaviour.

---

## Questions

For general questions or discussion, open a GitHub Discussion rather than an issue.
