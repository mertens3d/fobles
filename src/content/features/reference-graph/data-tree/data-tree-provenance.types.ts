// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-provenance.types.ts


import type {
  ItemGraphNodeData,
  LayoutDevice,
  ScControl,
  SitecoreHarvestField,
  SitecoreHarvestSection,
} from "../../../sitecore-harvester/sitecore-harvester.types";

// What harvested/synthetic source actually produced a DataTreeNode - kept separate from the
// node's own display fields (name/scItem) so the node-details panel and label resolver can
// inspect the real originating object instead of re-deriving meaning from display strings.
export type DataTreeProvenance =
  | { type: "sitecore-item"; item: ItemGraphNodeData }
  | { type: "section"; section: SitecoreHarvestSection }
  | {
      type: "section-field";
      fieldName: string;
      fieldValue: string;
      field: SitecoreHarvestField;
    }
  | { type: "layout-device"; device: LayoutDevice }
  | { type: "rendering-control"; control: ScControl }
  | {
      type: "rendering-parameter";
      parameterName: string;
      parameterValue: string;
      decodedValue: string;
      isItemReference: boolean;
    }
  | { type: "placeholder"; placeholderPath: string; displayName: string }
  | { type: "layout-xml"; label: string; rawMarkup: string }
  | { type: "synthetic"; label: string };

export function createSitecoreItemProvenance(
  item: ItemGraphNodeData,
): DataTreeProvenance {
  return { type: "sitecore-item", item };
}

export function createSyntheticProvenance(
  label: string,
): DataTreeProvenance {
  return { type: "synthetic", label };
}
