# Agent365 Repository Instructions

# Fobles Repository Instructions

## Source Access

- Fobles synchronized project root: `C:\Users\gregory.mertens\OneDrive - Kestra Financial\Projects\fobles`.
- For TypeScript/TSX indexed through OneDrive, use `.ts.txt` / `.tsx.txt` SourceSync proxies.
- Fobles explanatory comments use the repository-specific `Agent:` prefix.

## Fobles Window Architecture

- `FoblesWindow` owns title-bar chrome, close/minimize controls, geometry, drag, resize, persistence, z-order/focus, portal behavior, and minimize/restore behavior.
- `FoblesClientWindow` owns nested/client-window behavior including clickaway boundaries.
- `FoblesDetailsWindow` is the standard details-window composition.
- Client content knows nothing about its window container and must not implement positioning, chrome, close/minimize, drag/resize, persistence, or clickaway.
- `DetailsPanel` is content markup, not a window.
- `CopyButton` is standalone and data-agnostic; it owns clipboard interaction, Copy → Copied feedback, and feedback-reset timing.

### Details Windows

- Structure: `FoblesClientWindow` → `FoblesWindow` → title bar/client content.
- Details-window policy is normally non-draggable, non-resizable, non-collapsible, non-persistent, clickaway-dismissed, with the shared Fobles close control.
- Placement belongs to shared window policy, not feature CSS.
- Feature CSS must not recreate or override the Fobles window frame.

### Z-Index

- Sitecore splitter elements use z-index `100`.
- Fobles floating windows start above `100`; current base is `101`.
- Sitecore native modal/error dialogs remain above ordinary Fobles windows.
- Treat z-index values semantically rather than scattering arbitrary numbers through feature CSS.

### Minimize / Restore

- Each window owns independent expanded geometry: left, top, width, height.
- Double-click expanded title bar → minimize; double-click minimized title bar → restore; single-click must not restore.
- Expanded geometry survives reload through normal persistence.
- Minimized docking is presentation-only and must never overwrite logical expanded geometry.
- Multiple minimized windows maintain stable dock order; focus may change z-index but not physical dock order.
- Collapse, restore, close, and creation may change dock membership.
- Geometry diagnostics include storage key, logical state, restore rectangle, DOM rectangle, inline geometry, collapsed coordinates, and collapsed ordering.

## Worker Monitor

- Window: `Worker Monitor`; live group: `Worker State`; historical group: `Flight Recorder`.
- Worker State represents current pool worker objects, including tracked/mounted workers during retirement.
- Display native runtime states (`starting`, `idle`, `busy`, `retired`) rather than translated states.
- Diagnostics must not create work merely to enrich diagnostics. Item Name is populated only when already known; otherwise display `—`.
- Worker State keeps headings visible with zero rows and favors diagnostic density: bounded fields fixed/narrow, Item Name/Active Task/URL flexible, no ordinary horizontal scrollbar.
- Flight Recorder contains terminal historical snapshots only; do not store queued/running lifecycle snapshots as history.
- Preserve final request/response diagnostic payloads when available; headings remain visible with zero rows.

## Harvesting Domain

- Standard terminology: Harvesting, Reference Harvesting, Cache Validation, and `fact` for one cached fact.
- Reference Harvesting is queue-based; newly discovered items may be enqueued during processing; completed jobs update the shared model; Graph/Auditor consume incremental shared-model updates.
- Do not reintroduce Resolve/Resolving terminology where Harvesting terminology has replaced it.

### Layout Harvesting Failures

- Validate parsed layout structure before accessing expected nested fields.
- Deterministic parser/collector failures are not worker-health failures; do not recreate a healthy worker to retry the same malformed input.
- Worker recovery remains appropriate for no response, iframe destruction, transport failure, document stale, and timeout/no progress.
- Malformed-layout diagnostics include layout field, raw markup length, parsed root keys, rendering-root keys, and task/request identifiers.
- Preserve editor-state restoration when harvesting fails.

## Known Constraints / Backlog

- Finish Harvesting / Cache Validation terminology cleanup.
- Rename processing status/outcome `stale` to a self-documenting revision-mismatch term.
- Remove unused `verifiedAt` option from `cache.putFact`.
- Remove accidental `src/content/foundation/sitecore/data-selection-0108.zip`.
- Verify/delete `placeholder-reference-model-builder.ts` marked `// Delete Me`.
- Future classification harvesting: `itemClassification`, `templateInheritance`, `standardValues`, `siteAncestor`, `tenantAncestor`.
- Do not modify production merely to work around the known Playwright worker-iframe lifecycle failure.
- Do not alter `buildFoblesUrl()` / `fo` path behavior to sanitize paths.
- Foundation migrations batch phases into one run, support dry-run validation, and apply source edits directly.

## Repository-Specific Code Preferences

- Prefer constants grouped into cohesive const objects rather than loose top-level single constants.
