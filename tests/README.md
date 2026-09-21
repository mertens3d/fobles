# Testing Fobles

Playwright end-to-end tests live in `tests/e2e/` and exercise the extension against a real Sitecore environment.

## Setup

1. Copy `.env.example` to `.env` and set `SITECORE_TEST_ENVIRONMENTS` to your local endpoint.
2. Install browsers once: `npx playwright install`.
3. Run `npm run test:e2e`. Sitecore's auth cookies appear to be session-only, so a separate
   login-then-close step never survives to the next run - if a test hits a login form, it prints a
   banner and waits (no need to touch Playwright Inspector); log in by hand in that same browser
   window and the test continues automatically once the login form disappears.

## Running Tests

```text
npm run test:e2e
npm run test:e2e:debug
```

To verify Playwright configuration and test discovery without opening a browser or contacting Sitecore:

```text
npm run test:e2e:list
```

## Sitecore Test Login Warning

If you're prompted to log in on every run even within the same test session, or Content Editor
doesn't load after logging in, the Sitecore active-user limit may be full. Use Sitecore's Kick
User tool to free an existing session, then try again.

All tests share one persistent browser profile (`tests/test-artifacts/browser-profile`), which
only one process can open at a time - `playwright.config.ts` forces `workers: 1` and the
`browserContext` fixture is worker-scoped (`fixtures/playwright.ts`) so the whole run shares a
single browser instance instead of racing to open the same profile from multiple processes.

If a run gets force-killed (crash, closing the terminal, a second Ctrl+C), its browser process can
be left running and holding that profile lock - every later run then fails immediately with
"Opening in existing browser session". Run `npm run test:e2e:unlock` to find and kill any leftover
`msedge.exe` processes locking the profile.

### Stopping A Run Safely

**Warning:** stopping a run mid-test leaves the Sitecore session logged in, which keeps its
active-user slot occupied until the session eventually expires on its own - repeated force-stops
can exhaust the available slots for everyone. To stop cleanly, press **Ctrl+C once** and let
Playwright finish interrupting (it still runs fixture teardown, which logs the session out) -
don't press Ctrl+C again or close the terminal window, since that force-kills the process before
teardown can run.

## Strategy Scenario Coverage

Sitecore test data for each field strategy lives under `/sitecore/system/Modules/Fobles Testing/Strategy Scenarios`
(serialized in `tests/items-fobles/`), one content item per strategy with `0x`/`1x`/`3x`/`10x`
fields to exercise different source-list sizes. Quick-review checklist only — not the source of
truth; check the serialized items themselves for what actually exists, and whether a Playwright
spec actually consumes each one yet.

### Hardcoded Expected Values

Each `strategies/*.spec.ts` file hardcodes its own expected values (item GUIDs, resolved paths,
button text) as consts rather than reading them from the serialized YAML at runtime - tests
should assert against a fixed, independent expectation, not "whatever the data currently says"
(otherwise a real regression could pass silently). These consts were harvested by hand by looking
up the relevant item's own YAML file under `tests/items-fobles/serialization/` and reading its
`Path:`/`ID:` value directly. If the underlying test data changes (an item is renamed, moved, or
re-pulled), the consts don't update automatically - re-harvest them the same way and update the
spec file.

General approach per field type: one field instance with no value, one with a single value, and
— only for field types that actually support multiple selections (lists) — additional variations
across list sizes (currently `0x`/`1x`/`3x`/`10x`).

`quick-info-section`, `reference-links`, and `template-path` don't get dedicated content items -
they operate on Sitecore's own built-in Quick Info panel, item references, and template link,
which every item already has. Any existing scenario item exercises them.

- [x] drop-link
- [x] droplist
- [x] drop-tree
- [x] file
- [x] general-link
- [x] icon
- [x] image
- [x] internal-link
- [x] multilist-options
- [x] multilist-with-search
- [x] quick-info-section (no dedicated item needed - see note above)
- [x] reference-links (no dedicated item needed - see note above; has its own spec under `tests/e2e/editor/`, unlike quick-info-section/template-path)
- [ ] style-checklist (new - operates on Presentation Details -> Controls -> Edit's "Styles" checkbox widget, not a regular content item field; no test yet)
- [x] tag-list
- [x] template-path (no dedicated item needed - see note above)
- [x] tree-list
- [x] treelist-ex

## Editor Scenario Coverage

`tests/e2e/editor/` tests the editor-strategies (`src/content/features/augmentor/editor-
strategies/`) - these decorate a piece of Content Editor's own UI chrome rather than a single
Sitecore field, so unlike `strategies/*.spec.ts` they don't toggle Fobles on before locating their
target: that UI chrome (e.g. the "Links" gallery) often only exists in the DOM *after* an extra
Sitecore interaction (a ribbon click, a gallery open), so Fobles is toggled on last, once it's
already present for it to decorate.

- [x] reference-links
- [x] quick-info-section (exception to the toggle-last rule above - its Quick Info panel target is
  always present in the DOM already, so it toggles Fobles on first like `strategies/*.spec.ts` does)
- [ ] template-path
