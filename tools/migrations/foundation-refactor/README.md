# Foundation refactor

Run from the repository root. Commit first so Git can undo a phase.

```powershell
# validate only - changes nothing, writes foundation-migration-report.json
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-foundation-migration.ps1 -Phase 6 -DryRun

# validate, apply, then run build:extension and the boundary check
pwsh -NoProfile -File .\tools\migrations\foundation-refactor\invoke-foundation-migration.ps1 -Phase 6
```

Do not extract the payload over the repository by hand. The migration applies it, and it applies it only after every
import has been re-resolved against the post-migration layout.

## Phase 6 - Foundation: Sitecore access, acquisition, and headless contracts (was planned as phases 6-8)

Moves:

| From | To |
| --- | --- |
| `content/sitecore-data` | `foundation/sitecore/data` |
| `features/augmentor/shared/guid.ts` | `foundation/sitecore/guid.ts` |
| `toolbar/jump-flyout/quick-info.ts` | `foundation/sitecore/quick-info.ts` |
| `content/macros` | `foundation/sitecore/macros` |
| `shell/work-session/work-session.types.ts` | `foundation/workers/session/work-session.types.ts` |
| `shell/health/health.types.ts` | `foundation/diagnostics/health.types.ts` |
| `shared/ui/reference-controls/lifecycle.types.ts` | `foundation/reference-data/progress/lifecycle.types.ts` |
| `features/reference-graph/lifecycle/{acquire-reference-model,root-cache-flow,root-revision}.ts` | `foundation/reference-data/acquisition/` |
| `shared/data/fobles-data-service.ts` | `foundation/reference-data/reference-data-service.ts` |

Symbol relocations (every importer is split and re-pointed):

- `buildFoblesUrl`, `normalizeFoblesValue`: `features/augmentor/helper.ts` to `foundation/sitecore/fobles-url.ts`
- `getCurrentItemId`: `toolbar/jump-flyout/ai-pages.ts` to `foundation/sitecore/current-item.ts`

Code changes:

- `prepareReferenceModel` (Foundation) returns the model, node lookup and processing state. `prepareReferenceGraph` (Graph) wraps it and
  adds the Cytoscape elements. `PreparedReferenceGraph` keeps its exact shape.
- Acquisition no longer projects Graph elements. Graph derives them from a new `onModelReady` hook that runs before processing starts,
  so the first Graph render sees the same initial processing state as before.

Stale imports that were already broken before the phase (for example a test pointing at a file an earlier refactor moved) do not
block it. They are left exactly as they are and listed under "PRE-EXISTING stale imports". A broken import in a file this phase
moves still blocks, because its path cannot be recalculated. Two such test imports are redirected to their current files in the
phase file; the rest need a human decision.

`node tools/scripts/dev/check-boundaries.mjs` reports any import that crosses the layers the wrong way; it exits 1 if it finds one.

Earlier phase files (01-05) are history; their source paths no longer exist.
