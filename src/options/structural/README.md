# Structural Options

## Agents: contracts and ownership

- Site/Page/Tenant classification base paths are immutable application constants and are not exposed as Options fields. Structural Options only persists diagnostics plus Known Sites administration.
- The temporary user-facing title is `Site discovery`; internal structural contracts retain their names. Maximum age belongs only to Runtime Settings (`structuralCache.maxUnvalidatedAgeMs`); legacy sync age fields are ignored. Save uses the existing `settings-actions`/`settings-button` layout, not a grid-stretched button.
- The diagnostic toggle uses shared structural `showToolbarDiagnostics` (off by default), independent of the Developer button and debug logging. Preserve it in every settings draft round-trip.
- Known Sites scope selection uses canonical origin/database keys, preserving ports and excluding language. Scope changes unmount the previous panel; pending reads must not replace subscription updates.
- User-facing Known Sites copy says “Sitecore environment and database”; internal scope identifiers and storage keys are unchanged.
- Known Sites edits/removals/clear go exclusively through `mutateKnownSites`; background owns writes and validation timestamps. Manual edits are not live Sitecore validation.
- Scoped maintenance uses `requestStructuralCommand`; Options never imports content code or opens extension-origin IndexedDB. Background accepts only the exact trusted Options URL, probes canonical-origin tabs (including port), and delegates once to a verified matching database in the top-level Content Editor. Missing tabs, unverified databases, disconnected content scripts, and maintenance errors surface as failures; execution is never retried in another tab.
- Invalidation removes only scoped `templateBases`, clears scope-local derived metadata, and marks Known Sites unvalidated without deleting rows. Rediscovery performs that same invalidation then schedules Known Site roots and current scoped History through the existing background WorkSession driver. Success means scheduled, not completed; unrelated cache facts and History are unchanged.
- Unit tests live under `tests/unit/options/`; authored browser coverage lives under `tests/e2e/parallel/options/structural-settings.spec.ts` and uses `createFoblesStep`. No live Sitecore or History E2E is needed for this UI.