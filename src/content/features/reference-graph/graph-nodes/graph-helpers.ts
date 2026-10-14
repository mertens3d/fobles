// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-helpers.ts

import { slugify } from "../reference-graph-helper";

export function kindClass(kind: string): string {
  return `fobles-reference-graph-kind-${slugify(kind)}`;
}