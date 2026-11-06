# Item history replacement delivery

## Install

Extract the replacement ZIP over the repository root. Paths are verified and repository-relative. The ZIP includes maintained source/tests/docs and the rebuilt unpacked extension. No files are deleted, so no deletion markers are required. Existing source-path headers are preserved.

Reload the unpacked extension and hard-refresh affected Sitecore tabs (Ctrl+F5). History uses device-local extension storage, partitioned by origin and database, not language. No Site grouping is added.

## Changed files

### Persistence and background
- [src/background/index.ts](../src/background/index.ts)
- [src/background/item-history-registration.ts](../src/background/item-history-registration.ts)
- [src/shared/storage/storage.ts](../src/shared/storage/storage.ts)
- [src/shared/logging/persisted-log-storage.ts](../src/shared/logging/persisted-log-storage.ts)
- [src/shared/item-history/item-history-client.ts](../src/shared/item-history/item-history-client.ts)
- [src/shared/item-history/item-history-model.ts](../src/shared/item-history/item-history-model.ts)
- [src/shared/item-history/item-history-repository.ts](../src/shared/item-history/item-history-repository.ts)
- [src/shared/item-history/item-history.const.ts](../src/shared/item-history/item-history.const.ts)
- [src/shared/item-history/item-history.types.ts](../src/shared/item-history/item-history.types.ts)
- [src/shared/item-history/README.md](../src/shared/item-history/README.md)

### Capture and shared Sitecore parsing
- [src/content/index.ts](../src/content/index.ts)
- [src/content/logger.ts](../src/content/logger.ts)
- [src/constants/sitecore.ts](../src/constants/sitecore.ts)
- [src/content/foundation/sitecore/quick-info.ts](../src/content/foundation/sitecore/quick-info.ts)
- [src/content/foundation/sitecore/data/sitecore-data-identity.ts](../src/content/foundation/sitecore/data/sitecore-data-identity.ts)
- [src/content/item-history/item-history-manager.ts](../src/content/item-history/item-history-manager.ts)
- [src/content/item-history/quick-info-observer.ts](../src/content/item-history/quick-info-observer.ts)
- [src/content/item-history/quick-info.ts](../src/content/item-history/quick-info.ts)
- [src/content/item-history/item-history.const.ts](../src/content/item-history/item-history.const.ts)
- [src/content/item-history/item-history.types.ts](../src/content/item-history/item-history.types.ts)
- [src/content/item-history/README.md](../src/content/item-history/README.md)

### React UI, navigation and styling
- [src/content/toolbar/toolbar-app.tsx](../src/content/toolbar/toolbar-app.tsx)
- [src/content/toolbar/use-toolbar-drag.ts](../src/content/toolbar/use-toolbar-drag.ts)
- [src/content/toolbar/history/history-trigger.tsx](../src/content/toolbar/history/history-trigger.tsx)
- [src/content/toolbar/history/history-row.tsx](../src/content/toolbar/history/history-row.tsx)
- [src/content/toolbar/history/history-navigation.ts](../src/content/toolbar/history/history-navigation.ts)
- [src/content/toolbar/history/handlers.ts](../src/content/toolbar/history/handlers.ts)
- [src/content/toolbar/history/use-history-scope.ts](../src/content/toolbar/history/use-history-scope.ts)
- [src/content/toolbar/history/use-history-store.ts](../src/content/toolbar/history/use-history-store.ts)
- [src/content/toolbar/history/use-history-tooltip.ts](../src/content/toolbar/history/use-history-tooltip.ts)
- [src/content/toolbar/history/history.const.ts](../src/content/toolbar/history/history.const.ts)
- [src/content/toolbar/history/history.types.ts](../src/content/toolbar/history/history.types.ts)
- [src/content/toolbar/history/_history.scss](../src/content/toolbar/history/_history.scss)
- [src/content/toolbar/history/README.md](../src/content/toolbar/history/README.md)
- [src/content/styles/_fobles-flyout.scss](../src/content/styles/_fobles-flyout.scss) — only LBolt's hover scaling removed.
- [src/content/styles/fobles-extension.scss](../src/content/styles/fobles-extension.scss)

### Tests and configuration
- [tests/unit/item-history/item-history-model.test.ts](../tests/unit/item-history/item-history-model.test.ts)
- [tests/unit/item-history/item-history-repository.test.ts](../tests/unit/item-history/item-history-repository.test.ts)
- [tests/unit/item-history/quick-info.test.ts](../tests/unit/item-history/quick-info.test.ts)
- [tests/unit/item-history/quick-info-observer.test.ts](../tests/unit/item-history/quick-info-observer.test.ts)
- [tests/e2e/parallel/item-history/item-history.spec.ts](../tests/e2e/parallel/item-history/item-history.spec.ts)
- [tests/e2e/parallel/item-history/item-history.helpers.ts](../tests/e2e/parallel/item-history/item-history.helpers.ts)
- [tests/e2e/toolbar-ui/hover.spec.ts](../tests/e2e/toolbar-ui/hover.spec.ts)
- [tests/item-history.tsconfig.json](../tests/item-history.tsconfig.json)
- [package.json](../package.json) — focused history validation scripts and happy-dom test dependency.
- [package-lock.json](../package-lock.json)
- [AGENTS.md](../AGENTS.md)
- [docs/store/PRIVACY_POLICY.md](store/PRIVACY_POLICY.md)
- This delivery report.

Build-generated files: the build stamp and unpacked extension output are regenerated, not hand-edited. The ZIP includes the complete unpacked extension directory.

## Validation

- Focused history unit tests: 28 passed, including normalization, classification, metadata updates, recency/deduplication/cap, scoping, Quick Info parsing, debouncing/filtering, unchanged snapshots, editor/database replacement and cleanup, and serialized persistence.
- Extension typecheck: passed.
- Focused history test typecheck: passed.
- Changed TypeScript/test lint: passed.
- Extension build (including Sass and architecture boundary checks): passed.
- Playwright discovery only: passed; 12 new history cases discovered, 99 total tests in 39 files.
- Consumer/import and stale-reference checks: performed for Quick Info, database identity, storage subscriptions, and removed LBolt scaling; no stale history query constants or growth assertions remain.
- Full test typecheck: blocked by 9 errors in 6 untouched auditor/reference-graph/cache unit-test files. New history tests have no errors.
- Dependency installation reported 14 audit findings (1 low, 13 moderate); no unrelated or breaking dependency remediation was applied.
- ZIP validation checks repository-relative entry names, byte-for-byte source/runtime matches, and preservation of existing source-path headers.

## Not run

No E2E tests were executed, as requested. No live Sitecore/browser UI validation or full unrelated unit suite was run. Sitecore serialization push/pull operations were not run.