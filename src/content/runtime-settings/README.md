# Runtime Settings

## Agents: tuning contracts

- Schema/types and defaults live in `runtime-settings.types.ts` and `runtime-settings.const.ts`; normalization, loading, and live storage observation live in `runtime-settings.ts`. Import types/constants directly; do not add re-export barrels.
- The Runtime Settings JSON editor uses the same normalizer and local `fobles-runtime-settings` object. New fields appear automatically when loading older stored objects.
- `structuralCache.maxUnvalidatedAgeHours`: positive safe-integer hours, default 168 (seven days). Runtime consumers convert hours to milliseconds through `getStructuralCacheMaxUnvalidatedAgeMs()`.
- `workerPool.backgroundIntertaskCooldownMs`: integer milliseconds from 0 through 2147483647, default 1000; zero disables the delay.
