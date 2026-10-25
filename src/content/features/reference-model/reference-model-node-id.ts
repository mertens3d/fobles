// @source-path [fobles] src/content/features/reference-model/reference-model-node-id.ts

import { CONST } from "../../../constants/const";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { GRAPH_COLLAPSE_KEY } from "../reference-graph/graph-nodes/graph-collapse.types";
import { createPageLayoutItemsByDeviceId, createLayoutSectionReferenceModel } from "./layout-reference-model-builder";
import { createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { createSyntheticProvenance } from "./reference-model-provenance.types";
import type { ReferenceModelNonItemNode } from "./reference-model.types";

export function createLayoutReferenceModel(
  graphReferenceResult: SitecoreHarvestResult
): ReferenceModelNonItemNode {
  const treeNodeId = CONST.FOBLES.REFERENCE_GRAPH.NODE_ID
    .MAIN_LAYOUT_BOX_NODE_ID;

  const pageLayoutItemsByDeviceId = createPageLayoutItemsByDeviceId(
    graphReferenceResult.layoutSectionFields ??
    []
  );

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: "Layouts",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
      .STRUCTURAL,
    provenance: createSyntheticProvenance("Layouts"),
    collapseKey: GRAPH_COLLAPSE_KEY.LAYOUTS,
    branch: "layouts",
    relationshipToParent: "related",
    children: (
      graphReferenceResult.layoutSectionFields ??
      []
    ).map((layout) => createLayoutSectionReferenceModel(
      layout,
      pageLayoutItemsByDeviceId
    )
    ),
  });
}
