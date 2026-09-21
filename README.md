# Fobles

Fobles is a Chrome and Edge extension that adds navigation and productivity helpers for Sitecore developers. The project is currently all rights reserved while its future license is being finalized.

See [LICENSE](LICENSE) for the current licensing status. [docs/LICENSE-DRAFT.md](docs/LICENSE-DRAFT.md) contains proposed noncommercial terms for discussion only and is not binding.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for development and pull request guidance, and [docs/SECURITY.md](docs/SECURITY.md) for vulnerability reporting.

## Requirements

- Node.js 24
- Microsoft Edge or Google Chrome for loading the unpacked extension
- Access to a Sitecore environment for browser integration tests

## Setup

```text
npm install
npm run build:extension
```

To run browser tests, install the Playwright browsers once:

```text
npx playwright install
```

Browser tests require a local `.env` file. Copy `.env.example` and set your own endpoint:

```text
SITECORE_TEST_ENVIRONMENTS=https://sitecore.example.invalid/sitecore|example|xp
```

Do not commit real endpoints, credentials, authentication state, or browser profiles.

## Load The Extension

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/unpacked/`.

After rebuilding, select **Reload** for the extension and refresh affected Sitecore tabs.

## Commands

```text
npm run build:extension
npm run typecheck:extension
npm run test:e2e
npm run test:e2e:debug
```

If a test hits a Sitecore login form, it pauses (Playwright Inspector) so you can log in manually in that same browser window, then resume.

To verify Playwright configuration and test discovery without opening a browser or contacting Sitecore:

```text
npm run test:e2e:list
```

This confirms that Playwright can load the configuration and discover the tests. It does not execute the tests or require Sitecore credentials.

## Continuous Integration

The Sitecore end-to-end tests are not suitable for ordinary hosted GitHub Actions because they require access to a private Sitecore environment and interactive authentication. They remain local or can run on a controlled self-hosted runner.

The repository can still add a safe GitHub Actions workflow for pull requests. That workflow would run Node validation, `npm ci`, the extension typecheck, the extension build, and Playwright test discovery without contacting Sitecore.

Adding that static validation workflow is a future task; it is intentionally separate from the authenticated Sitecore test run.

See [docs/TODO.md](docs/TODO.md) for deferred release, security, packaging, and CI work.

## Project Layout

```text
src/                 TypeScript and Sass source
  content/           Content script: features/, styles/, toolbar/
  background/        MV3 service worker
  options/           "Additional Settings" page logic
  popup/             Toolbar-icon popup logic
  shared/            Cross-surface code (content/ and options/)
  public/            Maintained manifest, HTML shells, icon
tests/               Playwright test source, configuration, and test-artifacts/
tools/scripts/       Build, development, and test helpers
dist/unpacked/       Generated browser-loadable extension
dist/packed/         Reserved for future release packages
docs/                Extended documentation
```

See [docs/EXTENSION.md](docs/EXTENSION.md) for extension usage and testing details.
