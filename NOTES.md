# Fobles cleanup - batch 1

Unzip over the repo root. Everything under `src/` has a verified path. Everything under `_path-unverified/` needs a manual move (see Blocked 7).

## Changed or new files
| File | Change |
|---|---|
| src/constants/partials/fobles-workers.const.ts | Added worker-iframe selector/class/timeout/flag/error-text/disposal constants to `WORKER_POOL` |
| src/content/foundation/workers/iframe/worker-iframe-host.ts | Magic strings -> `WORKER_POOL` |
| src/content/foundation/workers/iframe/worker-iframe-service.ts | Loose consts + error text -> `WORKER_POOL`; long lines wrapped; 3 comments -> AI NOTE |
| src/content/foundation/workers/transport/worker-target-service.ts | `USE_WORKER_IFRAMES` -> `WORKER_POOL.USE_WORKER_IFRAMES` |
| src/content/shell/work-session/work-session.ts | One statement per line; selector + timings -> `WORKER_POOL` |
| src/content/foundation/sitecore/quick-info.ts | 4-space -> 2-space; compacted; 1 comment -> AI NOTE |
| src/content/foundation/sitecore/quick-info.types.ts | Header comment removed; 1 comment -> AI NOTE |
| src/content/features/reference-graph/reference-graph-app.tsx | Expanded; loose consts -> `GRAPH_VIEWPORT`; props type moved |
| src/content/features/reference-graph/reference-graph-app.types.ts | NEW: `ReferenceGraphAppProps` |
| src/constants/graph-viewport.const.ts | NEW: `GRAPH_VIEWPORT` |
| src/content/features/auditor/checks/reference-resolved-check.ts | `REFERENCE_RESOLVED_CHECK_KEY/LABEL` + summaries -> `AUDIT_CHECK.REFERENCE_RESOLVED`; 2 inline types moved |
| src/content/features/auditor/checks/reference-resolved-check.types.ts | NEW |
| src/constants/audit-checks.const.ts | NEW: `AUDIT_CHECK` |
| src/constants/specialist-lock.const.ts | NEW: `SPECIALIST_LOCK` (`as const`) |
| _path-unverified/background-index/index.ts | One statement per line; lock strings -> `SPECIALIST_LOCK`; local types moved |
| _path-unverified/background-index/index.types.ts | NEW: 6 local types from index.ts |
| _path-unverified/toolbar/toolbar-placement.ts | Comments -> AI NOTE; one signature wrapped |

Reviewed, no change needed: shell-runtime.ts, worker-target.ts (types - see Blocked 2), fobles-workers.const.ts (aside from additions).

## Blocked / deferred
1. **Blank lines.** The SourceMirror reader strips blank lines, so I could not see yours. I inserted blank lines by my own rule (between top-level declarations and logical groups). Expect whitespace-only diff noise.
2. **Exported types left in logic files** (moving them needs every importer, and no re-exports allowed): `WorkerIframeTarget` and `PendingWorkerReady` (worker-iframe-service.ts), `WorkerTabTarget` and `WorkerTarget` (worker-target.ts), `WorkerIframeEmergencyCleanupResult` (worker-iframe-host.ts). Find importers: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'WorkerIframeTarget|WorkerTarget|WorkerTabTarget|WorkerIframeEmergencyCleanupResult'`
3. **Removed exports - fix importers.** `REFERENCE_RESOLVED_CHECK_KEY` and `REFERENCE_RESOLVED_CHECK_LABEL` no longer exist. Find importers: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'REFERENCE_RESOLVED_CHECK_'`
4. **quick-info.ts selectors** `"span"`, `"a"`, `input.scEditorHeaderQuickInfoInputID[readonly]`, `input.scEditorHeaderQuickInfoInput[readonly]` should go into `CONST.SITECORE.SELECTORS`. I cannot see that file, so they are unchanged.
5. **Lock message strings.** The content-side senders of the four `FOBLES_*_LOCK_*` strings probably hardcode them too. I could not see them; switch them to `SPECIALIST_LOCK`.
6. **JSX/CSS string literals** (class names, `.fobles-reference-graph-compound-group`, `"collapseKey"`, `"compoundGroup"`) left as is.
7. **Unverified paths.** index.ts and toolbar-placement.ts have no `@source-path` header. `index.ts` is assumed to be `src/background/index.ts`; `toolbar-placement.ts` is somewhere under `src/` (its imports resolve to `src/constants` and `src/shared`). Move them and `index.types.ts` beside them.
8. **Coverage.** 11 existing files processed of roughly 469. I can only open files that a relevance search returns; there is no directory listing, and searches returned mostly unrelated documents.

## Assumptions
- `CONST.FOBLES.WORKER_POOL` in const.ts references the `WORKER_POOL` object. If const.ts copies keys one by one, add the new keys there.
- No existing `AUDIT_CHECK`, `GRAPH_VIEWPORT` or `SPECIALIST_LOCK` export collides.
- `// @source-path [fobles]` headers are preserved where present and not added elsewhere.

## Verification
- Syntax-checked every `.ts`/`.tsx` here with the TypeScript parser: 0 errors.
- NOT type-checked or built (no repo access). Run `build:extension` after unzipping.
