# Contributing to Fobles

Thank you for helping improve Fobles.

## Development Setup

1. Install Node.js 24.
2. Run `npm install`.
3. Copy `.env.example` to `.env` only if you will run Sitecore browser tests.
4. Run `npm run build:extension`.

Load `dist/unpacked/` as an unpacked extension in Edge or Chrome when testing browser behavior.

## Useful Checks

```text
npm run check:node
npm run typecheck:extension
npm run build:extension
npm run test:e2e:list
```

Authenticated Sitecore E2E tests require access to a Sitecore environment and must use local, uncommitted configuration. Do not add real endpoints, credentials, cookies, authentication state, browser profiles, logs, or test artifacts to a pull request.

## Pull Requests

- Keep changes focused and explain the user-visible or developer-visible behavior.
- Update documentation and tests when behavior changes.
- Run the relevant checks before opening a pull request.
- Do not edit generated files in `dist/unpacked/` directly; update source files and run the build instead.
- Keep secrets and private Sitecore information out of commits and issue discussions.

The project is currently all rights reserved and does not yet publish an operative contribution license. Pull requests may be submitted for discussion, but submission does not grant project rights until final contribution and licensing terms are published. Sign commits with `git commit -s` to record the Developer Certificate of Origin; see <https://developercertificate.org/> for the terms.
