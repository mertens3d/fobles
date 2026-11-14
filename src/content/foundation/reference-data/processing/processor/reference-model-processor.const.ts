// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-processor.const.ts

import type { ProcessingStatus } from "../processing.types.ts";

export const DEFAULT_MAX_LIVE_IN_FLIGHT = 4;

export const NON_TERMINAL_STATUSES: ReadonlySet<ProcessingStatus | undefined> = new Set([
  undefined,
  "pending",
  "cached",
  "enriching",
]);
