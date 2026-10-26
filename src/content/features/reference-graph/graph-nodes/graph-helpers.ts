// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-helpers.ts

import { slugify } from "../../../foundation/reference-data/model/slugify";

export function kindClass(kind: string): string {
  return `fobles-reference-graph-kind-${slugify(kind)}`;
}