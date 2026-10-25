# Foundation refactor - Phase 2: harvesting

Moves `src/content/sitecore-harvester` to `src/content/foundation/harvesting`.

The migration tool resolves every relative import against its original importer, applies the move map to both importer and target, recalculates every final relative specifier, updates `@source-path` comments, and writes `foundation-migration-report.json` before exiting for validation failures.

Run from the repository root:

```powershell
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-harvesting-migration.ps1
```

The wrapper performs a dry run, applies the migration only after validation succeeds, then runs `npm run build:extension`.
