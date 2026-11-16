// @source-path [fobles] src/content/shared/ui/work-progress/use-work-progress.ts

import { useEffect, useState } from "react";
import {
  getWorkProgressSnapshots,
  subscribeWorkProgress,
} from "../../../foundation/workers/progress/work-progress-registry";
import type { WorkProgressSnapshot } from "../../../foundation/workers/progress/work-progress.types";

export function useWorkProgressSnapshots(): readonly WorkProgressSnapshot[] {
  const [snapshots, setSnapshots] = useState<readonly WorkProgressSnapshot[]>(getWorkProgressSnapshots);
  useEffect(() => subscribeWorkProgress(setSnapshots), []);
  return snapshots;
}

export function useWorkProgress(sessionId: string): WorkProgressSnapshot | undefined {
  return useWorkProgressSnapshots().find((snapshot) => snapshot.sessionId === sessionId);
}
