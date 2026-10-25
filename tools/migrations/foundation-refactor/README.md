# Foundation refactor - Phase 1: workers

Moves `src/content/sitecore-worker` to `src/content/foundation/workers`.

The Node migration tool resolves every relative import against its original importer, applies the move map to both importer and target, and recalculates the final relative specifier. It also updates `@source-path` comments.

Run from the repository root:

```powershell
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-workers-migration.ps1
```

The wrapper performs a dry run, applies the migration, then runs `npm run build:extension`.

The migration fails before modifying files when it finds missing sources, existing destinations, ambiguous imports, or unresolved relative imports.

## Pre-existing stale imports

`move-map.json` includes explicit redirects for three stale unit-test imports created by the prior Reference Model processing move. Redirects are resolved before the workers move and rewritten to the current shared processing paths.

The migration report is always written before the tool exits for unresolved-import blocking diagnostics.
