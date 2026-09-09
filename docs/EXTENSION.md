# Fobles for Sitecore

Chrome and Edge extension that adds keyboard shortcuts and navigation helpers for Sitecore editors.

## Development Setup

From the project root:

```text
npm install
npm run build:extension
```

To run Sitecore browser tests, copy `.env.example` to `.env` and set
`SITECORE_TEST_ENVIRONMENTS` to your local endpoint. Real endpoints and
credentials must remain in the ignored `.env` file.

To run the browser tests, install the Playwright browsers once:

```text
npx playwright install
```

## Load Unpacked

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `dist/unpacked/` folder.

After changing source files, run `npm run build:extension`, then select **Reload** for the extension and refresh affected Sitecore tabs.

## Source Layout

- `src/extension/`: content-script and background-script source.
- `src/features/`: Fobles feature implementations.
- `src/styles/`: Sass source for the extension stylesheet.
- `src/extension/`: maintained manifest, options, popup, and entrypoint assets.
- `dist/unpacked/`: generated browser package loaded by the browser.
- `tests/e2e/`: Playwright browser integration tests.

## Testing

```text
npm run test:e2e:login
npm run test:e2e
```

Use `npm run test:e2e:debug` when stepping through a test interactively.

## Usage

- **Ctrl+Shift+E** (or **Cmd+Shift+E** on Mac): Toggle Fobles on or off.
- Select **AI Pages mappings** from the extension popup to map Sitecore content roots to AI Pages.

### AI Pages Quick Jump

Add one group per Sitecore account, then map that group's content roots to AI Pages sites. A group stores the organization and tenant name; each site root stores its Content Editor path and AI Pages site.

For example:

```text
Organization: org_Ab12Cd34Ef56
Tenant name: tenant_Ab12Cd34Ef56
Root: /sitecore/content/ExampleTenant/example-site-123
Site: example-site-123
```

The **AI Pages** Quick Jump action uses the active Content Editor item's ID, path, language, and version. When multiple roots match an item path, the most specific root is used.
