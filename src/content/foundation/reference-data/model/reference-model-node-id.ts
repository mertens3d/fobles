// @source-path [fobles] src/content/foundation/reference-data/model/reference-model-node-id.ts

import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestResult } from "../../harvesting/harvesting.types";
import { GRAPH_COLLAPSE_KEY } from "./model.const.ts";
import { createPageLayoutItemsByDeviceId, createLayoutSectionReferenceModel } from "./layout-reference-model-builder.ts";
import { createReferenceModelNonItemNode } from "./reference-model-node-factory.ts";
import { createSyntheticProvenance } from "./reference-model-provenance.ts";
import type { ReferenceModelNonItemNode } from "./model.types.ts";

export function createLayoutReferenceModel(graphReferenceResult: SitecoreHarvestResult): ReferenceModelNonItemNode {
  const treeNodeId = CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID;

  const pageLayoutItemsByDeviceId = createPageLayoutItemsByDeviceId(graphReferenceResult.layoutSectionFields ?? []);

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: "Layouts",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    provenance: createSyntheticProvenance("Layouts"),
    collapseKey: GRAPH_COLLAPSE_KEY.LAYOUTS,
    branch: "layouts",
    relationshipToParent: "related",
    children: (graphReferenceResult.layoutSectionFields ?? []).map((layout) =>
      createLayoutSectionReferenceModel(layout, pageLayoutItemsByDeviceId),
    ),
  });
}
