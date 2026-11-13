// @source-path [fobles] src/content/foundation/reference-data/model/graph-collapse.ts

import { GRAPH_COLLAPSE_KEY } from "./model.const.js";
import type { GraphCollapseKey } from "./model.types.js";

export function isGraphCollapseKey(value: unknown): value is GraphCollapseKey {
  return typeof value === "string" && Object.values(GRAPH_COLLAPSE_KEY).some((collapseKey) => collapseKey === value);
}
