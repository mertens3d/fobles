# Agent365 Repository Instructions

Add repository-specific instructions here. This file is read at runtime and does not require rebuilding the extension.


# Fobles Coding Instructions

## Source Authority and Retrieval

- Treat current repository source as authoritative.
- Never guess missing types, properties, contracts, symbols, filenames, or paths.
- Fobles synchronized project root:
  `C:\Users\gregory.mertens\OneDrive - Kestra Financial\Projects\fobles`
- Before coding, retrieve the current owning source and relevant dependency closure.
- For TypeScript/TSX stored through OneDrive, prefer `.ts.txt` / `.tsx.txt` proxy files.
- Prefer retrieval in this order:
  1. Current authoritative AI package supplied for the task.
  2. Current synchronized OneDrive/SharePoint repository source.
  3. Exact targeted `.ts.txt` / `.tsx.txt` proxy lookup.
  4. Search-based AI package request when the owning file is unknown.
- Empty, weak, noisy, or Expired Microsoft 365 search results do not prove a file is unavailable.
- Do not request files from Gregory until established retrieval methods have been exhausted.
- When exact paths are unknown, request a search-based package rather than inventing filenames.

## Dependency Closure

Before changing a symbol or contract:

- Inspect imports recursively through:
  - types
  - constants
  - hooks
  - components
  - stores
  - services
  - utilities
- Inspect downstream consumers.
- Determine the implementation actually referenced by the import graph.
- For additions, moves, renames, or deletions:
  - inspect every consumer/importer
  - update every affected consumer
  - search for stale paths and names
  - verify imports resolve
- Check persistence and runtime boundaries.
- Check related UI/styling behavior.

## Coding Rules

- Preserve the first-line source header:
  `// @source-path [fobles] ...`
- Do not introduce barrels or re-exports.
- Avoid magic strings when an existing constant exists.
- Use existing `.types.ts` architecture for shared types.
- Prefer existing shared infrastructure over feature-specific implementations.
- Do not silently refactor, optimize, simplify, or reorganize unrelated code.
- Keep implementation self-documenting.
- Preserve existing contracts unless the requested change explicitly requires modifying them.

## TypeScript / TSX Style

- Preserve the project's compact formatting.
- Target approximately 140 columns where readable.
- Keep ordinary declarations, signatures, calls, expressions, imports, and simple conditions on one line when they fit.
- One statement per line.
- Use structural multiline blocks where needed for readability.
- Exactly one blank line before file/block-level functions.
- JSX/TSX Markdown fences use `ts`, not `jsx` or `tsx`.

## Fobles Window Architecture

`FoblesWindow` is the shared floating-window implementation.

`FoblesWindow` owns:

- title-bar chrome
- close/minimize controls
- geometry
- drag
- resize
- persistence
- z-order/focus
- portal behavior
- minimize/restore behavior

`FoblesClientWindow` owns nested/client-window behavior including clickaway boundaries.

`FoblesDetailsWindow` is the standard details-window composition.

Client content:

- knows nothing about its container
- does not position itself as a window
- does not implement window chrome
- does not implement close/minimize
- does not implement drag/resize
- does not implement persistence
- does not implement clickaway

`DetailsPanel` is content markup, not a window.

`CopyButton`:

- is standalone and data-agnostic
- receives the text provider from its host
- owns clipboard interaction
- owns Copy → Copied feedback
- owns feedback-reset timing
- does not know about windows or details panels

## Fobles Details Windows

Abstract structure:

    FoblesClientWindow
      FoblesWindow
        FoblesWindowTitleBar
          {client-provided title}
          {configured window controls}

        FoblesWindowClient
          {arbitrary client markup}

Details-window policies normally include:

- non-draggable
- non-resizable
- non-collapsible
- non-persistent
- clickaway dismissal
- shared Fobles close control

Details-window placement belongs to shared window policy, not feature CSS.

Feature-specific CSS must not recreate or override the Fobles window frame.

## Window Z-Index

- Sitecore splitter elements use z-index `100`.
- Fobles floating windows must therefore start above `100`.
- Current Fobles window base is `101`.
- Sitecore native modal/error dialogs must remain above ordinary Fobles windows.
- Treat z-index values semantically rather than scattering arbitrary values through feature CSS.

## Minimize / Restore

Each Fobles window owns its expanded geometry independently.

Expanded geometry consists of:

- left
- top
- width
- height

Rules:

- Double-click expanded title bar → minimize.
- Double-click minimized title bar → restore previous expanded geometry.
- Single-click must not restore.
- Expanded geometry must survive page reload through normal persistence.
- Minimized docking is presentation only.
- Docking must never overwrite logical expanded geometry.
- Minimized-window stack positioning must use collapse-only presentation state.
- Multiple minimized windows maintain stable dock order.
- Focusing a minimized window may change z-index but must not physically reorder/reposition the minimized stack.
- Collapse, restore, close, and creation may legitimately alter dock membership.
- When diagnosing geometry bugs, log:
  - storage key
  - logical state
  - restore rectangle
  - DOM rectangle
  - inline geometry
  - collapsed dock coordinates
  - collapsed ordering

## Worker Monitor

Terminology:

- Window: `Worker Monitor`
- Current/live group: `Worker State`
- Historical group: `Flight Recorder`

### Worker State

- Represents the pool's current worker objects.
- Includes workers still tracked/mounted during retirement.
- Display native runtime states rather than user-facing translations.
- Example native states:
  - `starting`
  - `idle`
  - `busy`
  - `retired`
- Diagnostics must not generate work simply to enrich diagnostics.
- `Item Name` is populated only when already known.
- If Item Name is unavailable, display `—`.
- Do not request Quick Info or other data merely to fill diagnostic columns.

Worker State columns should favor diagnostic density:

- Worker: fixed/narrow
- State: fixed/narrow
- Item Name: flexible
- Target Kind: fixed/narrow
- Active Task: flexible and comparatively wide
- URL: flexible
- No Progress: fixed
- Recoveries: fixed

Prefer a CSS Grid layout:

- fixed widths for bounded diagnostic values
- proportional `fr` space for Item Name, Active Task, and URL
- ellipsis when constrained
- 100% available width
- no horizontal scrollbar under ordinary window sizes

Column headings remain visible even with zero rows.

### Flight Recorder

- Contains terminal historical snapshots.
- Do not show queued/running lifecycle snapshots as historical records.
- Preserve final request/response diagnostic payloads where available.
- Column headings remain visible even with zero rows.

## Harvesting Terminology

Standard terminology:

- Harvesting
- Reference Harvesting
- Cache Validation
- fact: an individual cached fact

Reference Harvesting direction:

- queue based
- newly discovered items can be enqueued while processing
- completed jobs update a shared model
- Graph/Auditor consume incremental shared-model updates

Do not reintroduce Resolve/Resolving terminology where Harvesting terminology has replaced it.

## Layout Harvesting Failure Handling

- Validate parsed layout structure before accessing expected nested fields.
- Deterministic parser/collector failures are not worker-health failures.
- Do not destroy/recreate a healthy worker merely to retry the same deterministic malformed-input failure.
- Worker recovery remains appropriate for:
  - no response
  - iframe destruction
  - transport failure
  - document stale
  - timeout/no progress
- Log malformed layout diagnostics including:
  - layout field
  - raw markup length
  - parsed root keys
  - rendering-root keys
  - task/request identifiers
- Preserve editor-state restoration even when harvesting fails.

## Known Backlog / Constraints

Do not accidentally regress:

- Harvesting / Cache Validation terminology cleanup.
- Rename processing status/outcome `stale` to a self-documenting revision-mismatch term.
- Remove unused `verifiedAt` option from `cache.putFact`.
- Remove accidental `src/content/foundation/sitecore/data-selection-0108.zip`.
- Verify/delete `placeholder-reference-model-builder.ts` marked `// Delete Me`.
- Future classification harvesting:
  - itemClassification
  - templateInheritance
  - standardValues
  - siteAncestor
  - tenantAncestor
- Do not modify production merely to work around the known Playwright worker-iframe lifecycle failure.
- Do not alter `buildFoblesUrl()` / `fo` path behavior to sanitize paths.
- Foundation migrations should:
  - batch phases into one run
  - support dry-run validation
  - directly apply source edits

## Replacement ZIP Rules

For Fobles replacement ZIPs:

- Include only files actually changed.
- Base replacement files on the exact current source state.
- `inputSha256` must represent the exact destination version being replaced.
- Never chain packages using stale hashes.
- Include the standard agent sync marker under `agents/`.
- Marker contains:
  - unique GUID
  - UTC timestamp
  - package identity
- Validate manifest paths.
- Validate ZIP integrity.
- Validate dependency closure.
- Verify replacement imports resolve.
- Verify no stale names/paths remain.
- No prohibited re-exports.
- Files intended for deletion contain exactly:

      // Delete Me

- Do not call a ZIP validated unless applicable checks passed.
- Full extension build is not mandatory for delivery.
- Clearly distinguish static/closure validation from an actual successful build.

## ZIP Apply Idempotency

For each `write` operation calculate:

    currentSha = SHA(destination)
    inputSha   = manifest.inputSha256
    outputSha  = SHA(zip payload)

Behavior:

    currentSha == inputSha
        APPLY

    currentSha == outputSha
        SKIP
        "This change has already been applied"

    currentSha != inputSha && currentSha != outputSha
        CONFLICT

Requirements:

- No manifest-schema change required.
- Do not rewrite already-applied files.
- Already-applied state is successful, not a conflict.
- Preserve Apply Anyway behavior only for genuine conflicts.
- Conflict diagnostics should expose:
  - input SHA
  - output SHA
  - current SHA

## Validation Before Delivery

Before delivering Fobles code:

- inspect affected types
- inspect callers/consumers
- inspect persistence/runtime boundaries
- inspect related styling
- check stale imports/names
- run TypeScript/static validation when available
- perform package closure validation
- validate ZIP integrity
- never knowingly ship a compiler error

If Gregory reports a compiler/runtime error:

- correct it immediately
- continue the requested implementation
- do not stop at an apology or explanation



# Comments
 - The agent is allowed to add comments to new and existing code but must prefix the comment block or line with "Agent:"