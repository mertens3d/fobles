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
npm run test:e2e -- --project=edge --list
```

## Sitecore Test Login Warning

If login returns to IdentityServer or Content Editor does not load, the Sitecore active-user limit may be full. Use Sitecore's Kick User tool to free an existing session, then try again.
