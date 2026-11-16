// @source-path [fobles] src/content/shared/ui/work-progress/work-progress.types.ts

import type { WorkProgressSnapshot } from "../../../foundation/workers/progress/work-progress.types";

export type WorkProgressProps = {
  snapshot: WorkProgressSnapshot | undefined;
  idleLabel?: string;
  others?: number;
};
