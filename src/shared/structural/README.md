# Structural ItemKind and Known Sites

## Agents: ownership and storage

- ItemKind source is `src/content/foundation/reference-data/processing/item-kind/`; limits live in `item-kind-limits.const.ts` as `ITEM_KIND_LIMITS`. No obsolete `classification/` source files or compatibility barrel remain.
- `ITEM_KIND` and shared contracts live in `structural.const.ts` / `structural.types.ts`. Values are `page`, `site`, `tenant`, `template`, `unknown`; Tenant takes precedence over Site, then Page. Template paths take precedence over all three.
- Configured base paths default to `SITECORE.ITEM_KIND.BASE_TEMPLATE_PATHS`; they are resolved through trustworthy live/cache Quick Info, never guessed GUIDs. Settled missing paths differ from unavailable reads.
- Direct base facts are persisted as `templateBases` on the TEMPLATE GUID record, using the existing origin-scoped IndexedDB cache and a language-independent structural key. Content items never acquire membership or inherited-template lists.
- Derived ItemKind facts persist as `templateDerived` on the same language-independent TEMPLATE key, including kind, inherited IDs, completeness, and settings/dependency fingerprint. Each service checks current root resolutions and every visited direct-base timestamp/value before reuse. Only complete, nonstale computations are persisted; stale reads never recertify a derived result. Item path precedence is applied after template-kind reuse, never stored as content/history membership.
- Structural maximum age is the local Runtime Settings value `structuralCache.maxUnvalidatedAgeMs` (positive integer milliseconds, default seven days), not a shared sync setting. Legacy structural `maxAgeMs` is discarded, never migrated over runtime tuning. Cached Quick Info and direct bases use stale-while-revalidate. Quick Info age is its recorded fetch time, not LRU access time; old records without a fetch time are stale.
- Known Sites are local extension storage, keyed by canonical History origin/database normalization, including port but never language. Legacy unscoped keys are ignored. Rows contain only `id`, `name`, `path`, `templateId`, `validatedAt`; background mutations stamp validation time.
- Only `src/background/known-sites-registration.ts` writes Known Sites. Its queue survives failed writes and serializes read/modify/write; messages require matching content origin/extension ID or the exact trusted extension Options URL.
- Known Site matching uses longest case-insensitive path prefix at a segment boundary. Each new service treats stored settings provenance as unproven and validates a matched root once by ID, nonblocking for cached labels; successful roots are reused until settings or age invalidate them. Lookup never walks parents. Discovery walks cached/live parents to the nearest Site and stops at Content, cycles, or named limits.
- Runtime discovery uses `createWorkSession(WORK_SCHEDULING.BACKGROUND)` and completes the session after all refreshes. Automatic History/Site discovery never toggles Raw Values or Standard Fields: friendly base-template controls and readable cached section values are preferred; unavailable bases stay unresolved with diagnostics. The generic leased raw helper and its restoration tests remain available only through explicit `templateBasesFallback` injection, triggered by a successful base read with unavailable direct bases, never by parent/Quick Info reads.
- Scoped Options maintenance uses `structural-command.ts` / `structural-command.types.ts`; background registration delegates only to canonical-origin tabs whose top-frame content handler verifies an explicit current Content Editor database (no default-master assumption). Probes do not mutate; execution rechecks scope and is never retried across tabs after a failure.
- Invalidation serializes behind local discovery, removes only database-matching `templateBases`/`templateDerived` facts across languages, and resets scope-local validation fingerprints. Rediscovery captures Known Sites/current History inside that queued invalidation, after prior drivers drain, and schedules from that snapshot before releasing maintenance. Background `invalidate-validation` writes set only Known Sites `validatedAt` to zero (always stale), preserving rows and all other scopes. Cache item records, Quick Info, parent/custom facts, revisions, and History are untouched.
- Rediscovery performs the same invalidation then queues fresh Known Site root validation and fresh ancestor discovery for unique Known Site roots/current scoped History items. Responses acknowledge scheduling, not worker completion; later discovery failures retain existing structural logging. Scope is checked again after asynchronous waits before maintenance writes and scheduling.

## Agents: UI contracts

| Module | Export | Contract |
| --- | --- | --- |
| `src/content/foundation/reference-data/processing/item-kind/structural-discovery.ts` | `scheduleStructuralDiscovery(scope, visits): void` | Nonblocking; scope `{ origin, database }`, visits readonly `{ id, name, path }[]`. Call only on the current eligible Sitecore origin/database. Duplicate queued visits coalesce. |
| same | `lookupKnownSite(scope, path): Promise<KnownSite \| undefined>` | Storage-only longest-boundary lookup; returns stale data immediately and queues validation when needed. |
| `src/shared/known-sites/known-sites-repository.ts` | `readKnownSites(scope): Promise<KnownSite[]>` | Canonical scoped read; storage failures reject. |
| same | `subscribeKnownSites(scope, callback): () => void` | Changes only, not an initial read. |
| same | `mutateKnownSites(scope, change): Promise<KnownSite[]>` | Writer delegation. Changes: `{action: "remove", id}`, `{action: "clear"}`, or `{action: "upsert", site}`. UI administration normally uses remove/clear. |
| `src/shared/structural/structural-settings.ts` | `getStructuralSettings(): Promise<StructuralSettings>` | `{ baseTemplatePaths: { page: string[], site: string[], tenant: string[] }, showToolbarDiagnostics?: boolean }`. |
| same | `saveStructuralSettings(settings): Promise<void>` | Normalizes and writes sync settings. Empty path lists explicitly disable a category's bases. |
| same | `watchStructuralSettings(callback): () => void` | Sync changes only; returns unsubscribe. |
| `src/shared/structural/structural.types.ts` | `ItemKind`, `KnownSite`, `StructuralScope`, `StructuralVisit`, `StructuralSettings` | Shared types; do not import content/runtime code into Options. |

## Agents: integration and validation

- `showToolbarDiagnostics` is an optional backwards-compatible structural setting, normalized to false by default. Toolbar diagnostics observe it live and reuse the existing inline progress component; do not couple the setting to History or Options rendering.

- Background entry imports both Known Sites writer and structural command registration; content shell startup configures structural WorkSession composition and owns command listener disposal.
- ItemKind pure utilities and injectable discovery service are Node-testable. The runtime driver supports injected WorkSession/identity/clock for real-cache integration tests; freshness tuning comes from Runtime Settings.
- Unit coverage is in `tests/unit/structural/` and `tests/unit/item-kind/`. Validate TypeScript changes with `npm run typecheck:extension`, `npm run typecheck:tests`, and targeted ESLint; no E2E tests are required for this domain change.