# Runtime Settings

## Agents: tuning contracts

- Schema/types and defaults live in `runtime-settings.types.ts` and `runtime-settings.const.ts`; normalization, loading, and live storage observation live in `runtime-settings.ts`. Import types/constants directly; do not add re-export barrels.
- The existing Runtime Settings JSON editor uses the same normalizer and local `fobles-runtime-settings` object. New fields appear automatically when loading older stored objects.
- `structuralCache.maxUnvalidatedAgeMs`: positive safe-integer milliseconds (maximum `Number.MAX_SAFE_INTEGER`), default 604800000 (seven days). Structural reads, classification, and Known Sites validation use this tuning. Ignore legacy sync structural `maxAgeMs`; do not migrate it over runtime values.
- `workerPool.backgroundIntertaskCooldownMs`: integer milliseconds from 0 through 2147483647 (the browser timer limit), default 1000; zero disables the delay. Out-of-range values reset to defaults, avoiding timer-overflow wakeup loops. Per-host pool cooldown starts when an admitted background task settles, not when it starts or merely queues. Foreground tasks bypass it. Retries retain their atomic background reservation and bypass intertask cooldown; background max-one still applies.
- Cooldown wakeups are cancellable, rearmed on scheduling/settings changes, and cleared on pool disposal. Only unadmitted background work needs a cooldown wakeup; foreground-only queues and background retry reservations do not. Intentional background queue wait does not consume task execution budget or count as a pool-health stall.
- Focused coverage: `tests/unit/options/runtime-settings.test.ts`, `tests/unit/workers/worker-background-cooldown.test.ts`, and `tests/unit/structural/`.