import type { NodeKind } from "../../../../constants/_base/_base.types";
import type { FoblesStrategy } from "../../../../constants/constants.types";
import type { FieldReference } from "../../../field-reference-resolution/field-reference-resolution.types";
import type { FieldReferenceConfidence } from "../../../field-reference-resolution/field-reference-resolution.types";
import type { SitecoreDeviceXml, SitecoreRenderingXml } from "../../harvesting/collectors/section-collector/layout-collector/layout-collector.types";
import type { GRAPH_COLLAPSE_KEY } from "./model.const";

export type GraphCollapseKey = (typeof GRAPH_COLLAPSE_KEY)[keyof typeof GRAPH_COLLAPSE_KEY];

export type ExpandedByCollapseKey = Record<GraphCollapseKey, boolean>;

export type GraphPresentationState = {
  kind: NodeKind;
  collapseKey: GraphCollapseKey;
  branch?: ReferenceModelBranch;
  relationshipToParent?: RelationshipToParent;
  reverse?: boolean;
};

export type ReferenceModelNodeOptions = {
  treeNodeId: string;
  kind: NodeKind;
  collapseKey: GraphCollapseKey;
  provenance: ReferenceModelProvenance;
  branch?: ReferenceModelBranch;
  relationshipToParent: RelationshipToParent;
  reverse?: boolean;
  truncation?: ReferenceModelTruncation;
  children?: ReferenceModelNode[];
};

export type ReferenceModelItemNodeOptions = ReferenceModelNodeOptions & { scItem: ItemGraphNodeData };

export type ReferenceModelNonItemNodeOptions = ReferenceModelNodeOptions & { name: string };

export type ReferenceModelProvenance =
  | { type: "sitecore-item"; item: ItemGraphNodeData; rawData?: Partial<ScControl["rawData"]> }
  | { type: "section"; section: SitecoreHarvestSection }
  | { type: "section-field"; fieldName: string; fieldValue: string; field: SitecoreHarvestField }
  | {
      type: "field-reference";
      item: ItemGraphNodeData;
      sectionName: string;
      fieldName: string;
      sourceValue: string;
      confidence: FieldReferenceConfidence;
      strategy?: FoblesStrategy;
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
  | {
      type: "placeholder";
      placeholderPath: string;
      displayName: string;
      rawData?: Array<Partial<ScControl["rawData"]>>;
    }
  | { type: "layout-xml"; label: string; rawMarkup: string }
  | { type: "synthetic"; label: string };

export type RelationshipToParent = "contained" | "related";

export type ReferenceModelBranch =
  "parent" | "children" | "layouts" | "referrers" | "customFields" | "standardFields" | "template";

export type ReferenceModelTruncation = { availableCount: number; includedCount: number; truncated: boolean };

export type ReferenceModelNodeBase = {
  treeNodeId: string;
  provenance: ReferenceModelProvenance;
  truncation?: ReferenceModelTruncation;
  children: ReferenceModelNode[];
};

export type ReferenceModelItemNode = ReferenceModelNodeBase & { nodeType: "item"; scItem: ItemGraphNodeData };

export type ReferenceModelNonItemNode = ReferenceModelNodeBase & { nodeType: "nonItem"; name: string };

export type ReferenceModelNode = ReferenceModelItemNode | ReferenceModelNonItemNode;

export type PlaceholderTreeNode = { path: string; placeholders: PlaceholderTreeNode[]; controls: ScControl[] };

export type ItemHarvestFacts = {
  parent?: { parent: ItemGraphNodeData | undefined };
  children?: { childItems: readonly ItemGraphNodeData[] };
  referrers?: { referrers: readonly ItemGraphNodeData[] };
  customSections?: { sections: readonly SitecoreHarvestSection[] };
  standardSections?: { sections: readonly SitecoreHarvestSection[] };
  layout?: { layoutSectionFields: readonly LayoutSectionField[] };
};

export type ItemGraphNodeData = {
  type: "scItem";
  scItemName: string | undefined;
  scItemId: string | undefined;
  link: string | undefined;
  scItemPath: string | undefined;
  scTemplate: ItemGraphNodeData | undefined;
  scItemIcon: string | undefined;
  rawMarkup: string | undefined;
  facts?: ItemHarvestFacts;
};

export type RootItem = ItemGraphNodeData & { scItemId: string };

export type SitecoreHarvestSection = { name: string; fields: readonly SitecoreHarvestField[] };

export type SitecoreHarvestField = {
  label: string;
  value: string | undefined;
  links: readonly HarvestFieldLink[];
  rawMarkup: string | undefined;
};

export type HarvestFieldLink = FieldReference & { valueItem: ItemGraphNodeData };

export type LayoutSectionField = { name: string | undefined; devices: LayoutDevice[]; rawMarkup: string | undefined };

export type LayoutPlacement = {
  path: string;
  name: string;
  sourcePaths: string[];
  placements: LayoutPlacement[];
  controls: ScControl[];
};

export type ScControl = {
  uid: string | undefined;
  rendering: ItemGraphNodeData;
  datasource: ItemGraphNodeData | undefined;
  parameters: Record<string, string>;
  p_before: string | undefined;
  p_after: string | undefined;
  rawData: SitecoreRenderingXml;
};

export type LayoutDevice = {
  scDeviceItem: ItemGraphNodeData;
  scPageLayoutItem: ItemGraphNodeData | undefined;
  placements: LayoutPlacement[];
  rawData: SitecoreDeviceXml;
};

export type TreeChildNode = {
  name: string | undefined;
  itemId: string;
  // Diagnostics only: the raw tree-row outerHTML this was parsed from.
  rawMarkup: string | undefined;
};
