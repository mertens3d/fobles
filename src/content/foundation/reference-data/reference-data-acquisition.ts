// @source-path [fobles] src/content/foundation/reference-data/reference-data-acquisition.ts

import type { FoblesDataAcquisition, FoblesDataAcquisitionOptions } from "./reference-data.types.ts";
import { openFoblesDataSession } from "./reference-data-service.ts";

export function openFoblesDataAcquisition(
  options: FoblesDataAcquisitionOptions,
): Promise<FoblesDataAcquisition | undefined> {
  const { workOperation, ...rest } = options;
  return openFoblesDataSession({ ...rest, workSession: workOperation });
}
