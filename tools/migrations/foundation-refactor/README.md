# Foundation refactor - Phase 3: Sitecore data cache

Moves `src/content/sitecore-data-cache` to `src/content/foundation/cache/sitecore-data`.

Run from the repository root:

```powershell
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-sitecore-data-cache-migration.ps1
```

The wrapper performs a dry-run validation, applies the migration only after validation succeeds, recalculates relative imports and `@source-path` comments, writes `foundation-migration-report.json`, then runs `npm run build:extension`.
