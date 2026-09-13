# Fobles Workspace Instructions

## Source And Runtime

- TypeScript source of truth: `src/extension/`, `src/features/`, and `src/styles/`.
- Maintained extension files: `src/extension/`.
- Runtime unpacked extension: `dist/unpacked/`.
- Do not edit generated `dist/unpacked/content.js`, `dist/unpacked/background.js`, or `dist/unpacked/fobles.css` directly.
- `src/extension/manifest.json`, `src/extension/popup.html`, `src/extension/popup.js`, `src/extension/options.html`, and `src/extension/options.js` are maintained files and may be edited directly when needed.
- Use `fobles` terminology for the active extension.

## Build And Validation

- Run `npm run typecheck:extension` after TypeScript changes.
- Run `npm run build:scss` after stylesheet-only changes.
- Run `npm run build:extension` after extension changes. It regenerates runtime bundles and copies the extension icon.
- Run `npm run test:e2e -- --project=edge --list` to verify Playwright test discovery.
- Generated test output is stored under `test-artifacts/` and should not be committed.
- Reload the unpacked extension and hard-refresh (Ctrl+F5) affected Sitecore tabs after manifest or content-script changes. A normal refresh can leave the old content script running against an invalidated extension context, causing `chrome.storage` reads to silently fall back to defaults.

## Extension Behavior

- Browser Site Access controls are authoritative; do not add a custom domain allowlist or dynamic content-script registration.
- Content scripts are registered for HTTP/HTTPS pages and decide eligibility using `src/extension/menu-path.ts`.
- Sitecore `default.aspx?xmlcontrol=...` pages must be explicitly allowlisted in `SITECORE.ALLOWED_XML_CONTROLS`.
- Preserve Sitecore layout when hiding an original control by using the existing Foble spacer helpers.
- Foble navigation targets the top-level tab for same-tab actions.

## Styling

- Foble field styles: `src/styles/_fobles.scss`.
- Extension toolbar entry stylesheet: `src/styles/fobles-extension.scss`.
- Generated runtime stylesheet: `dist/unpacked/fobles.css`.
- Read the current Sass file before editing because it may contain user changes.
