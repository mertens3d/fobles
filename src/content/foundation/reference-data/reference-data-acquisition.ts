// @source-path [fobles] src/content/foundation/reference-data/reference-data-acquisition.ts
import { openFoblesDataSession, type FoblesDataSession } from "./reference-data-service";
import type { WorkSession } from "../workers/session/work-session.types";

export type FoblesDataAcquisition = FoblesDataSession;

export type LegacyOptions = Parameters<typeof openFoblesDataSession>[0];

export type FoblesDataAcquisitionOptions = Omit<LegacyOptions, "workSession"> & { workOperation: WorkSession };

export function openFoblesDataAcquisition(
  options: FoblesDataAcquisitionOptions,
): Promise<FoblesDataAcquisition | undefined> {
  const { workOperation, ...rest } = options;
  return openFoblesDataSession({ ...rest, workSession: workOperation });
}
