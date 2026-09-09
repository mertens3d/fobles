# Fobles Project TODO

## Planned

- [ ] Finalize and publish the project license and contribution terms. Until then, `LICENSE` is an all-rights-reserved notice and `LICENSE-DRAFT.md` is non-binding.
- [ ] Add a GitHub Actions workflow for safe static validation: Node version, `npm ci`, extension typecheck, extension build, and Playwright test discovery.
- [ ] Document the rationale for broad host permissions in the store submission: Fobles supports arbitrary Sitecore hosts and applies Sitecore path eligibility checks at runtime.
- [ ] Add a release packaging command that creates a store-ready archive from `dist/unpacked/` into `dist/packed/`.
- [ ] Define the release process for version updates, Git tags, and GitHub Releases.
- [ ] Decide how unpacked development settings should migrate to the eventual store extension ID.

## Known Limitations

- Authenticated Sitecore end-to-end tests require a configured private environment and interactive login. They are not run by ordinary hosted CI.
- `dist/unpacked/` and `test-artifacts/` are generated local output and are intentionally ignored by Git.
