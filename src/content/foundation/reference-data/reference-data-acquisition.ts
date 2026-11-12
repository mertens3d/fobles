// @source-path [Fobles] src/content/foundation/reference-data/reference-data-acquisition.ts

import type { FoblesDataAcquisition, FoblesDataAcquisitionOptions } from "./reference-data.types.js";
import { openFoblesDataSession } from "./reference-data-service";

export function openFoblesDataAcquisition(
  options: FoblesDataAcquisitionOptions,
): Promise<FoblesDataAcquisition | undefined> {
  const { workOperation, ...rest } = options;
  return openFoblesDataSession({ ...rest, workSession: workOperation });
}
