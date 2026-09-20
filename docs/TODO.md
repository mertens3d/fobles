# Fobles Project TODO

## Planned

- [ ] Finalize and publish the project license and contribution terms. Until then, `LICENSE` is an all-rights-reserved notice and `LICENSE-DRAFT.md` is non-binding.
- [ ] Document the rationale for broad host permissions in the store submission: Fobles supports arbitrary Sitecore hosts and applies Sitecore path eligibility checks at runtime.
- [ ] Add a release packaging command that creates a store-ready archive from `dist/unpacked/` into `dist/packed/`.
- [ ] Define the release process for version updates, Git tags, and GitHub Releases.
- [ ] Decide how unpacked development settings should migrate to the eventual store extension ID.
- [ ] Investigate adding ESLint (with a TypeScript config) to the project - no linter currently exists (no `lint` script, no ESLint devDependency). Would let `.github/workflows/ci.yml` require lint alongside typecheck/build.
- [ ] Investigate the circular import between `src/content/toolbar/quick-menu` and `src/content/toolbar/proxy-buttons.ts` (`quick-menu` imports `setProxyButtonsVisible` from `proxy-buttons.ts`, which imports `setQuickMenuVisible` from `quick-menu`). Works today but is fragile under refactors and blocks tree-shaking/isolated testing.
- [ ] `src/content/features/quick-menu/kick-users.ts` and `ai-pages.ts` are organizational anomalies: they're non-UI command/action logic that doesn't fit `toolbar/` (rendering-only) or `features/augmentor/` (Sitecore-page-manipulation commands) cleanly. Likely belong in `augmentor/` once revisited, since they do manipulate the real Sitecore page (kicking users, reading item info) - just not yet moved there.
- [ ] `toggleTreeButtons` in `src/content/features/augmentor/treeNodeFobles/index.ts` nests 6 function declarations (~150 lines) inside one outer function. Hoist them to module-level functions (parameterizing on `buttonClass` where needed) so the real dispatch logic (existing buttons? clear : walk) isn't buried after the helpers, and so each helper can be tested/read in isolation.
- [ ] `Strategy General Link Anchor` field (tests/items-folbles, `/sitecore/system/Modules/Fobles Testing/Strategy Scenarios/Strategy general link`) has no value yet - `Internal`/`External`/`Media`/`Email`/`JavaScript` are all confirmed real values now. Set it via Content Editor's real "Insert Anchor" dialog and `ser pull`.
- [ ] `Strategy Image Content Hub` field has no value yet - waiting on a real Content Hub link to test against.
- [ ] Strategy Tag List field doesn't render the real Tag List widget - falls back to a plain pipe-delimited-GUID text box instead of the two-pane tree+select UI `sc-taglist.ts` expects (`td[rowspan] > .scScrollbox` + `select.scContentControlMultilistBox`), so `tests/e2e/strategies/tag-list.spec.ts` is temporarily skipped (`test.describe.skip`). Likely cause: the field's datasource items (`Fobles Data Item`, shared with other strategy tests) only inherit Sitecore's generic Standard template, not whatever "Tagging" section template real Tag items need (possibly `/sitecore/templates/System/Templates/Sections/Tagging`, unverified GUID `{0AA6D3F8-C9D0-401F-83AA-A41433C24767}`). Needs: confirm that template exists/its real GUID in this instance, then either add it as a base template to the shared test data or give Tag List its own dedicated datasource, and un-skip the test.
  - Update: the "Strategy Tag List 0x/1x/3x/10x" template fields' `Type` value was also found to be the invalid string `"Tag List"` (Sitecore silently renders a blank Type dropdown for a value it doesn't recognize) - fixed to the correct `"Taglist"` and pulled. Even accounting for that, still suspect something more fundamentally wrong with how this Sitecore instance's Taglist field type behaves - worth deeper investigation before assuming the datasource-template theory above is the whole story.

## Known Limitations

- Authenticated Sitecore end-to-end tests require a configured private environment and interactive login. They are not run by ordinary hosted CI.
- `dist/unpacked/` and `tests/test-artifacts/` are generated local output and are intentionally ignored by Git.
