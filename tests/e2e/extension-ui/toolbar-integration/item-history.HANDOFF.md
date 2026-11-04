# Item history e2e failures: handoff for Copilot Chat

Delete this file once the cause is fixed.

## Problem

Every test in `item-history.spec.ts` fails inside `openHistoryEditor` (`item-history.helpers.ts`) at
`expect(historyLink(frame, initial.name)).toBeVisible()`. The History panel shows "No item history yet".
"Strategy droplink" is just the item the test opens (`STRATEGY_SCENARIOS.DROP_LINK`, GUID `25fb9977-cc90-4e3c-b036-cafaae676303`).

The same flow works when run manually in a normal browser (open the item by `fo=` URL or from the tree).
It only fails under the Playwright test run.

## Facts established

- Content script console error in tests: `[Fobles] Item history: visit writer failed Error: Item history writer did not respond`.
  - Source: `src/shared/item-history/item-history-client.ts` throws this only when `chrome.runtime.sendMessage` resolves to a non-object (`undefined`).
  - An error reply from the writer would have carried its own message instead, so nothing replied.
  - The error appears during the login redirect and again at cleanup. It is not yet proven to come from the final Content Editor page.
- In the test, the service worker is alive and `chrome.runtime.onMessage.hasListeners()` is `true`.
- In the test, `chrome.storage.local` holds only `persistedLogEntries`. There is no history key. The save never happens.
- A temporary trace in `handleHistoryMessage` (`src/background/item-history-registration.ts`, stored in `globalThis.__historyTrace`) is
  absent in the test. The handler for `FOBLES_ITEM_HISTORY_CHANGE` has not run in the worker, or the loaded build is not the current one.
- `dist/unpacked/background.js` was confirmed to contain the temporary `history-writer` logging after the build.
- Worker console output is not reaching the test log, despite `worker.on("console")` in `tests/fixtures/playwright-page-diagnostic-handlers.ts`.
- Only one other background listener exists (`src/background/index.ts`). It does not answer history messages.
- Every test starts with Options, Storage, "Clear all stored settings", then enables developer logging and persisted logs.

## Hypotheses still open

1. The test's browser loads a different copy of the extension than `dist/unpacked` (check `TEST_CONSTB.extensionPath` and the
   `--load-extension` args in `tests/fixtures/playwright.ts`). The worker URL in the test is `chrome-extension://mdieddbiieaoblbfobgnleibkdlifelg/background.js`.
   In the test, confirm which folder that ID maps to and whether the file there contains `history-writer`.
2. The content script never sends the initial visit on this page, or sends it before the worker listener is registered
   (module-level `chrome.runtime.onMessage.addListener(handleHistoryMessage)` in `item-history-registration.ts`, imported from `background/index.ts`).
   Compare the timing against the `WORKER_READY` messages.
3. `sendMessage` from the content script's frame is not reaching the worker (for example the sender is an iframe, and the capture runs
   in the frame that holds the Quick Info table). Log `window === window.top` and `location.href` where `requestHistoryChange` is called.
4. "Clear all stored settings" in the Options page wipes something the history path needs (for example, the stored scope or a flag the capture depends on).
   Try the test without that step.

## Suggested next steps

1. Verify the loaded extension build: in the test, read the worker's script source, or the extension folder it loaded from, and
   grep for `history-writer`.
2. In `openHistoryEditor`, after `openContentEditor`, call `worker.evaluate` to send a `FOBLES_ITEM_HISTORY_CHANGE` message through
   `chrome.runtime.sendMessage` from an extension page, to prove the handler works under Playwright.
3. Add temporary logging in `src/content/item-history/item-history-manager.ts` to show which frame calls `requestHistoryChange`, and whether
   it is called after login.
4. Fix the cause, then remove the temporary code listed below.

## Temporary code to remove before committing

- `src/background/item-history-registration.ts`: `console.warn` lines and the `__historyTrace` code.
  `git checkout -- src/background/item-history-registration.ts` restores the original, if nothing else changed there.
- `tests/e2e/extension-ui/toolbar-integration/item-history.helpers.ts`: `logHistoryDiagnostics` and its call in `openHistoryEditor`.
- `tests/fixtures/playwright-page-diagnostic-handlers.ts`: the service worker `console` listener is optional diagnostics.
  The `started`/`closed` logging can stay.

## Commands

- Typecheck: `npm run typecheck:extension`
- Build (tests load `dist/unpacked`): `npm run build:extension`
- Test discovery: `npm run test:e2e -- --project=edge --list`
- Run one test with VS Code's Playwright runner, not a new npm script.
