# Fobles Project TODO

## Planned

- [ ] Finalize and publish the project license and contribution terms. Until then, `LICENSE` is an all-rights-reserved notice and `LICENSE-DRAFT.md` is non-binding.
- [ ] Add a GitHub Actions workflow for safe static validation: Node version, `npm ci`, extension typecheck, extension build, and Playwright test discovery.
- [ ] Document the rationale for broad host permissions in the store submission: Fobles supports arbitrary Sitecore hosts and applies Sitecore path eligibility checks at runtime.
- [ ] Add a release packaging command that creates a store-ready archive from `dist/unpacked/` into `dist/packed/`.
- [ ] Define the release process for version updates, Git tags, and GitHub Releases.
- [ ] Decide how unpacked development settings should migrate to the eventual store extension ID.
- [ ] Investigate the circular import between `src/content/toolbar/quick-menu` and `src/content/toolbar/proxy-buttons.ts` (`quick-menu` imports `setProxyButtonsVisible` from `proxy-buttons.ts`, which imports `setQuickMenuVisible` from `quick-menu`). Works today but is fragile under refactors and blocks tree-shaking/isolated testing.
- [ ] `src/content/features/quick-menu/kick-users.ts` and `ai-pages.ts` are organizational anomalies: they're non-UI command/action logic that doesn't fit `toolbar/` (rendering-only) or `features/augmentor/` (Sitecore-page-manipulation commands) cleanly. Likely belong in `augmentor/` once revisited, since they do manipulate the real Sitecore page (kicking users, reading item info) - just not yet moved there.
- [ ] `toggleTreeButtons` in `src/content/features/augmentor/treeNodeFobles/index.ts` nests 6 function declarations (~150 lines) inside one outer function. Hoist them to module-level functions (parameterizing on `buttonClass` where needed) so the real dispatch logic (existing buttons? clear : walk) isn't buried after the helpers, and so each helper can be tested/read in isolation.

## Known Limitations

- Authenticated Sitecore end-to-end tests require a configured private environment and interactive login. They are not run by ordinary hosted CI.
- `dist/unpacked/` and `tests/test-artifacts/` are generated local output and are intentionally ignored by Git.
