# Fobles Project TODO

## Planned

- [ ] Finalize and publish the project license and contribution terms. Until then, `LICENSE` is an all-rights-reserved notice and `LICENSE-DRAFT.md` is non-binding.
- [ ] Add a GitHub Actions workflow for safe static validation: Node version, `npm ci`, extension typecheck, extension build, and Playwright test discovery.
- [ ] Document the rationale for broad host permissions in the store submission: Fobles supports arbitrary Sitecore hosts and applies Sitecore path eligibility checks at runtime.
- [ ] Add a release packaging command that creates a store-ready archive from `dist/unpacked/` into `dist/packed/`.
- [ ] Define the release process for version updates, Git tags, and GitHub Releases.
- [ ] Decide how unpacked development settings should migrate to the eventual store extension ID.
- [ ] Investigate the circular import between `src/content/features/quick-menu` and `src/content/features/proxy-buttons` (`quick-menu` imports `setProxyButtonsVisible` from `proxy-buttons`, which imports `setQuickMenuVisible` from `quick-menu`). Works today but is fragile under refactors and blocks tree-shaking/isolated testing.
- [ ] `src/content/toolbar/elements.ts`, `handlers.ts`, and `index.ts` import `quick-menu` and `proxy-buttons` directly, tightly coupling the generic toolbar shell to two specific feature implementations. Best-practice suggestion: define a small shared "togglable panel" interface (e.g. `{ isPinned, isVisible, setVisible, setPinned }`) that `quick-menu`/`proxy-buttons` implement, and have the toolbar shell depend on that interface/registry instead of importing the concrete features directly.

## Known Limitations

- Authenticated Sitecore end-to-end tests require a configured private environment and interactive login. They are not run by ordinary hosted CI.
- `dist/unpacked/` and `test-artifacts/` are generated local output and are intentionally ignored by Git.
