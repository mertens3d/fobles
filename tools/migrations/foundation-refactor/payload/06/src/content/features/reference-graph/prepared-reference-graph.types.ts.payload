// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.types.ts
import type cytoscape from "cytoscape";
import type { PreparedReferenceModel } from "../../foundation/reference-data/acquisition/prepare-reference-model";

// The Reference Model Foundation prepared, plus Graph's own Cytoscape projection of it. Same shape the Graph UI has
// always consumed; the projection is now Graph's job instead of part of acquiring the model.
export type PreparedReferenceGraph = PreparedReferenceModel & {
  graphElements: cytoscape.ElementDefinition[];
};
