# Testing Fobles

Playwright end-to-end tests live in `tests/e2e/` and exercise the extension against a real Sitecore environment.

## Setup

1. Copy `.env.example` to `.env` and set `SITECORE_TEST_ENVIRONMENTS` to your local endpoint.
2. Install browsers once: `npx playwright install`.
3. Run `npm run test:e2e:login` to open a browser for manual Sitecore login and save the persistent profile under `test-artifacts/`.

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

If login returns to IdentityServer or Content Editor does not load, the Sitecore active-user limit may be full. Use Sitecore's Kick User tool to free an existing session, then try again.

## Strategy Scenario Coverage

Sitecore test data for each field strategy lives under `/sitecore/system/Modules/Fobles Testing/Strategy Scenarios`
(serialized in `authoring/items-folbles/`), one content item per strategy with `0x`/`1x`/`3x`/`10x`
fields to exercise different source-list sizes. Quick-review checklist only — not the source of
truth; check the serialized items themselves for what actually exists, and whether a Playwright
spec actually consumes each one yet.

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
- [x] reference-links (no dedicated item needed - see note above)
- [x] tag-list
- [x] template-path (no dedicated item needed - see note above)
- [x] tree-list
- [x] treelist-ex
