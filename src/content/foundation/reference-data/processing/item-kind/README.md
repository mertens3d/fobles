# Structural backend contracts

## Agents: composition and lifetime

- Foundation never imports Shell. `createStructuralRuntimeDriver(scope, options)` requires `options.createSession`; identity, origin, settings, clock, and raw-base fallback remain injectable.
- Harvesting-lease contention is bounded by `HARVESTING_LEASE.ACQUISITION_TIMEOUT_MS`; structural cancellation prevents waiting work from entering the leased callback. Do not interrupt editor-state restoration once the callback has begun.
- Shell startup registers `shell/work-session/structural-work-session.ts`, which supplies background WorkSessions through `configureStructuralWorkSession` and returns the structural-settings subscription disposer. History/Options callers keep the existing discovery facade.
- `finish()` is idempotent, drains dependent background refreshes, completes work, and guarantees cancellation/release even when completion rejects. Foreground session retention semantics are unchanged.

## Agents: parent facts and convergence

- `StructuralDriver.parent(id, fresh?)` returns `StructuralRead<string | undefined> | undefined`, not a bare GUID. Its verification timestamp includes path Quick Info when needed.
- The existing parent collector/cache fact is authoritative. Path-only parents resolve through exact verified Quick Info; unavailable or mismatched results never become inferred GUIDs. Verified path reads populate the existing GUID Quick Info alias.
- Stale parent facts and stale negative item metadata queue one bounded fresh follow-up. Follow-up reads force current Quick Info, parent facts, and template bases after the first driver's refreshes finish; unavailable refreshes do not create an infinite queue.
- Ordinary Known Site matches never walk ancestors. Stale/settings-invalidated roots validate by GUID; discovery resumes only when the matching root was removed or moved away. Lookup itself never resumes discovery.

## Agents: settings and isolation

- Root-setting fingerprints invalidate fresh Known Sites within the service. Shell also calls `invalidateStructuralSettings()` on settings changes, covering scopes not previously observed; failed validation retains metadata and stays eligible for retry.
- Known Site fingerprints are service-local validation bookkeeping, not new Known Site/history storage fields. Stored roots start unproven in every service instance; cached labels remain immediately available while one ID validation establishes provenance. Successful validation certifies the exact settings snapshot used for classification.
- Template-derived kinds use the driver's `readDerived`/`writeDerived` hooks and persist with their dependency/settings fingerprint under `templateDerived` on the template key. Recheck direct bases/root resolutions before reuse; stale/incomplete computations never overwrite certified facts. Path-based Template/Unknown overrides remain item-local.
- Preserve canonical origin/database isolation and template-owned language-independent direct bases. Automatic discovery never invokes Raw Values fallback: prefer friendly field reference controls, raw inputs already visible, or explicitly readable cached full-section base values (preserving verification age). Missing/hidden/unreadable bases remain unavailable, never an invented empty list. The harvesting leased raw-mode fallback remains available through explicit `templateBasesFallback` injection; normal parent/Quick Info reads never toggle editor settings. Do not copy direct bases or memberships onto content/history records.
- Focused coverage lives in `tests/unit/item-kind/`, `tests/unit/structural/`, and `tests/unit/workers/work-session-lanes.test.ts`. Runtime composition is required: isolated service tests do not replace the build's architecture-boundary check or browser validation of background registrations.

## Agents: discovery diagnosis

- Runtime path: `content/item-history/item-history-manager.ts` defers visits to `structural-discovery.ts`; `structural-discovery-service.ts` walks verified Quick Info and parent facts to the nearest fully classified Site; `template-structural-service.ts` resolves configured base paths through exact Quick Info and builds direct-base inheritance before saving Known Sites.
- Parent path resolution is `structural-runtime-driver.ts` → `parent()` → cached/live `get-parent` → `quickInfo({ kind: "path", value: parentItem.scItemPath })` when no GUID exists. Exact path identity is required; no guessed GUIDs or names.
- Structured `extensionLog` events cover accepted enqueue, start/result, cached Known Site path matches/misses, exact Quick Info path verification, found Sites, validation results (including unavailable reads), configured-root misses, missing templates/direct bases/parents, read failures, and walk termination (root, cycle, limit, missing item, unconfirmed/confirmed Site), carrying origin/database scope and target. Do not log full settings collections or harvested payloads. These are acquisition/transition diagnostics, not polling logs. No live Sitecore root cause is proven by unit fixtures alone.
- History's unknown Site prefix applies only to Content-category paths within `/sitecore/content`, not Content catch-all paths elsewhere (System, Media Library, etc.). Known Site labels and stored item names remain unchanged.