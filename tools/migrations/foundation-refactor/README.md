# Foundation refactor - Phase 4: Reference Model

UI refinements:
- expands Auditor help with tree shortcuts, statuses, and data-origin meanings;
- changes cleanup recovery presentation from red/error language to Fobles blue success/information styling;
- replaces the quick-action magnifier with a rows/list glyph and normalizes its width.

Architecture moves:
- `src/content/features/reference-model/components` to `src/content/shared/ui/reference-model`;
- remaining `src/content/features/reference-model` headless model code to `src/content/foundation/reference-data/model`.

Run:

```powershell
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-phase4-migration.ps1
```

The UI patch fails closed if current source shapes cannot be recognized. `phase4-ui-report.json` records changed files or the blocking mismatch. The migration then dry-runs, applies, writes `foundation-migration-report.json`, and runs `npm run build:extension`.
