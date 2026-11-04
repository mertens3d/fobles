# Item history E2E capture investigation

Keep this file until the initial-capture E2E failure is resolved; delete it afterward.

## Reproduction

Run only the initial-capture test through Playwright (no new npm script):

`npm run test:e2e -- --project=edge tests/e2e/extension-ui/toolbar-integration/item-history.spec.ts --grep "captures the initially selected"`

## Latest observations (2026-11-04)

- The test **fails without** the temporary diagnostics in `item-history.helpers.ts`: the History panel stays empty and the link assertion times out.
- It **passes with** a diagnostic `worker.evaluate()` call after pinning the panel. This makes the failure timing-sensitive; do not treat the diagnostic as the fix.
- The diagnostic compared the extension file on disk with `fetch(chrome.runtime.getURL("background.js"))` in the worker. Both reported no temporary `[Fobles][history-writer]` logging, and the extension URL was `chrome-extension://ecbfklnofeookkfcdbedgocnjnmgmaoj/background.js`.
- Despite both sources being clean, Playwright's service-worker console listener reported `[Fobles][history-writer] received` followed by `replying success` for a Sitecore sender at frame 0. The emitted code does not match the currently fetched bundle; investigate service-worker/profile caching or console event attribution before concluding which.
- On the passing run, the helper's immediate storage snapshot contained only `persistedLogEntries`; it was taken before the writer completed. The next log was a successful one-item reply, followed by the passing link assertion. Therefore the empty immediate snapshot and missing `__historyTrace` are not evidence that the final write failed.
- The earlier correlation run observed the real content request with its Sitecore URL and top-frame status, followed by a successful background reply and a passing test. Those request logs have since been removed from production source.
- `src/background/item-history-registration.ts`, `src/shared/item-history/item-history-client.ts`, and `src/content/item-history/item-history-manager.ts` currently have no temporary writer/request logging or `requestId` message field. The `tests/fixtures/playwright-page-diagnostic-handlers.ts` worker console listener remains enabled.
- `createBrowserProfile()` reuses `playwright/test-artifacts/FoblesTestDirectory<N>` and only rewrites `Default/Preferences`; it does not clear the persistent profile. This is a plausible contributor to stale worker code, not yet proven.

## Current temporary diagnostic

`tests/e2e/extension-ui/toolbar-integration/item-history.helpers.ts` compares the background script served by the active worker to the bundle on disk and prints the frame URL. Remove this helper and its call once the cause is established.

## Next checks

1. Correlate actual capture-send and background receipt timestamps on a failing run, including sender URL/frame ID; ensure logs are from the same current service-worker execution.
2. Record the history storage key/value **after** writer completion and compare it with the UI scope/read/subscription. Do not infer persistence from an early snapshot.
3. Test whether clearing or uniquely recreating only the extension service-worker cache in the persistent profile makes the clean test pass; avoid deleting useful browser/auth profile state without verifying effects.
4. After the fix, rebuild, run this single test once with temporary diagnostics removed, then remove this handoff. No E2E test scripts per suite/test should be added.
