# Foundation refactor - explicit phase runner

Phase 5 moves:

```text
src/content/shared/reference-model-processing
→ src/content/foundation/reference-data/processing
```

Run from the repository root:

```powershell
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-foundation-migration.ps1 -Phase 5
```

The runner explicitly selects `phases/05-reference-model-processing.json`, copies it to the migration engine's active move map, performs a dry-run validation, applies the move, rewrites relative imports and `@source-path` comments, writes `foundation-migration-report.json`, then runs `npm run build:extension`.

Old phase-specific wrappers are intentionally not used. The explicit `-Phase` argument prevents an old wrapper name from silently executing a newer move map.
