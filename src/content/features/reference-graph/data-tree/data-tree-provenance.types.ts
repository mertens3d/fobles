// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-provenance.types.ts

import type { FoblesStrategy } from "../../augmentor/fobles.types";
import type { FieldReferenceConfidence } from "../../../field-reference-resolution/field-reference.types";
import type {
  ItemGraphNodeData,
  LayoutDevice,
  ScControl,
  SitecoreHarvestField,
  SitecoreHarvestSection,
} from "../../../sitecore-harvester/sitecore-harvester.types";

export type DataTreeProvenance =
  | {
    type: "sitecore-item";
    item: ItemGraphNodeData;
    rawData?: Partial<ScControl["rawData"]>;
  }
  | {
    type: "section";
    section: SitecoreHarvestSection;
  }
  | {
    type: "section-field";
    fieldName: string;
    fieldValue: string;
    field: SitecoreHarvestField;
  }
  | {
    type: "field-reference";
    item: ItemGraphNodeData;
    sectionName: string;
    fieldName: string;
    sourceValue: string;
    confidence: FieldReferenceConfidence;
    strategy?: FoblesStrategy;
  }
  | {
    type: "layout-device";
    device: LayoutDevice;
  }
  | {
    type: "rendering-control";
    control: ScControl;
  }
  | {
    type: "rendering-parameter";
    parameterName: string;
    parameterValue: string;
    decodedValue: string;
    isItemReference: boolean;
    rawData: Partial<ScControl["rawData"]>;
  }
  | {
    type: "placeholder";
    placeholderPath: string;
    displayName: string;
    rawData: Array<Partial<ScControl["rawData"]>>;
  }
  | {
    type: "layout-xml";
    label: string;
    rawMarkup: string;
  }
  | {
    type: "synthetic";
    label: string;
  };

export function createSitecoreItemProvenance(
  item: ItemGraphNodeData,
): DataTreeProvenance {
  return {
    type: "sitecore-item",
    item: { ...item },
  };
}

export function createSyntheticProvenance(
  label: string,
): DataTreeProvenance {
  return {
    type: "synthetic",
    label,
  };
}

export function createFieldReferenceProvenance(
  item: ItemGraphNodeData,
  sectionName: string,
  fieldName: string,
  sourceValue: string,
  confidence: FieldReferenceConfidence,
  strategy: FoblesStrategy | undefined,
): DataTreeProvenance {
  return {
    type: "field-reference",
    item: { ...item },
    sectionName,
    fieldName,
    sourceValue,
    confidence,
    strategy,
  };
}