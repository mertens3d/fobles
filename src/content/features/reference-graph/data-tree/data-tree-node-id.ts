import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";
import { createDataTreeNonItemNode } from "./data-tree-node-factory";
import { createSyntheticProvenance } from "./data-tree-provenance.types";
import type { DataTreeNonItemNode } from "./data-tree.types";
import { createPageLayoutItemsByDeviceId, createLayoutSectionDataTree } from "./layout-data-tree-builder";

export function createLayoutDataTree(
  graphReferenceResult: SitecoreHarvestResult
): DataTreeNonItemNode {
  const treeNodeId = CONST.FOBLES.REFERENCE_GRAPH.NODE_ID
    .MAIN_LAYOUT_BOX_NODE_ID;

  const pageLayoutItemsByDeviceId = createPageLayoutItemsByDeviceId(
    graphReferenceResult.layoutSectionFields ??
    []
  );

  return createDataTreeNonItemNode({
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
    ).map((layout) => createLayoutSectionDataTree(
      layout,
      pageLayoutItemsByDeviceId
    )
    ),
  });
}
