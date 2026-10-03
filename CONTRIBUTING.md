# Contributing

Bug reports, documentation improvements, accessibility fixes, and focused code changes are welcome. Search existing issues before opening a new one. For a substantial feature or dependency change, open an issue first to agree on the scope.

## Local setup

1. Fork the repository and clone your fork.
2. Install Node.js 24 and pnpm 10.34.1, matching `.nvmrc` and `package.json`. If you use nvm, run `nvm install` and `nvm use`.
3. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
4. Open <http://localhost:3000/builder>.

No environment variables or service accounts are required for local development. The preview needs access to Shopify's CDN. Pages and saved components live in your browser's IndexedDB; export anything you want to keep before clearing site data.

The [README](README.md#how-it-works) maps the source files to their responsibilities. The app uses Solid; React JSX is an export format.

## Making changes

- Keep each pull request focused on one change, following the existing patterns.
- Add regression tests for behavior changes. Tests use Vitest and live beside the code as `*.test.ts` or `*.test.tsx` files. Keep route tests outside `src/routes` so the route generator does not treat them as routes. Use `pnpm test:watch` for feedback while editing.
- Preserve keyboard access and accessible names when changing the UI.
- Update the docs when behavior or setup changes.
- `src/routeTree.gen.ts` is generated. Change the route files and run `pnpm generate-routes` instead of editing it by hand.
- If dependencies change, commit the updated `pnpm-lock.yaml`. Keep the bundled font license files with the fonts.

Before opening a pull request, run the same checks as CI:

```bash
pnpm check
pnpm typecheck
pnpm test:coverage
pnpm build
```

Pure logic tests run in Node. DOM and UI tests opt into happy-dom with `// @vitest-environment happy-dom`. Tests use the installed v1 and v2 manifests and exercise editor commands, history, validation, rendering, clipboard, WebMCP, dialogs, startup, exports and routes. Persistence tests run the real storage code against fake-indexeddb, with controlled locks and broadcast messages for multi-tab scenarios.

`pnpm test:coverage` measures all application TypeScript, including files that tests do not import. Only tests, test helpers and the generated route tree are excluded. It enforces 95% statement, line and function coverage and 85% branch coverage. Open `coverage/index.html` to inspect remaining gaps; do not exclude application code just to meet the thresholds.

These tests do not load Shopify's CDN runtime. Geometry, popovers, browser locks and the iframe readiness handshake are simulated. Route tests exercise loaders, metadata, handlers and client rendering; they do not hydrate the SSR document shell. For editor changes, also check the affected interaction in `/builder`: insert and edit a component, undo and redo, export, and reload to check persistence. Actual browser layout, trusted pointer events, Polaris behavior, hydration and cross-tab browser coordination still need browser checks. Check both Polaris versions when changing the catalog, nesting rules, renderer, or code generation. Include screenshots for visible changes and note the browser you tested.

Explain the problem, what changed, and how you verified it. Link the related issue if there is one. Do not include unrelated formatting or generated build output.

## Issues and questions

Use the issue templates for bugs and feature requests; a blank issue is fine for questions. For a bug, include reproduction steps, expected and actual behavior, browser and OS versions, the selected Polaris version, and a small HTML/JSX example when relevant. Remove credentials, personal data, and private shop information from examples and screenshots. Do not post security vulnerabilities in public issues.

## Working together

Be respectful, assume good intent, and keep feedback focused on the work. Harassment, discrimination, and sharing someone else's private information are not acceptable. Maintainers may remove abusive content or restrict participation.

Contributions are made under the project's [MIT License](LICENSE).
