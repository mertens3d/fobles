// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/layout-collector/layout-collector.ts

import { XMLParser } from "fast-xml-parser";
import { extensionLog } from "../../../../../logger";
import { findFieldInput } from "../../helpers/harvest-helpers";
import { readRenderingAttribute } from "./rendering-xml-attributes";
import type { SitecoreLayoutXml } from "./sitecore-layout-xml-schema.types";
import { factoryItemGraphNodeData, type ItemGraphNodeData, type LayoutDevice, type LayoutPlacement, type LayoutSectionField, type ScControl } from "../../../../reference-data/model/sitecore-item.types";
import type { HarvestContext } from "../../../sitecore-harvester.types";

export const collectLayouts = async (harvestContext: HarvestContext): Promise<void> => {
  harvestContext.result.layoutSectionFields = [processLayoutFieldValue(harvestContext, "Renderings"), processLayoutFieldValue(harvestContext, "Final renderings")];
};

const processLayoutFieldValue = (harvestContext: HarvestContext, layoutName: string): LayoutSectionField => {
  const sectionFieldHtml = findFieldInput(harvestContext.doc, layoutName);
  const layoutSectionField: LayoutSectionField = { name: layoutName, devices: [], rawMarkup: sectionFieldHtml?.value };
  const xml = sectionFieldHtml?.value;
  if (!xml) return layoutSectionField;
  const rawProcessedXml = processLayoutXml(xml);
  extensionLog.debug("Processed layout XML:", rawProcessedXml);
  if (!rawProcessedXml) return layoutSectionField;

  for (const device of rawProcessedXml.r.d) {
    const controls = (device.r ?? []).map((rendering): { placeholderPath: string; control: ScControl } => ({
      placeholderPath: readRenderingAttribute(rendering, "ph") || "(no placeholder)",
      control: {
        rendering: factoryItemGraphNodeData({ scItemId: readRenderingAttribute(rendering, "id") }),
        datasource: createDatasourceItem(readRenderingAttribute(rendering, "ds"), harvestContext.rootItem.scItemPath),
        uid: rendering.uid,
        parameters: parseParameters(readRenderingAttribute(rendering, "par")),
        p_before: rendering["p:before"],
        p_after: rendering["p:after"],
        rawData: rendering,
      },
    }));
    const deviceData: LayoutDevice = {
      scDeviceItem: factoryItemGraphNodeData({ scItemId: device.id }),
      scPageLayoutItem: device.l ? factoryItemGraphNodeData({ scItemId: device.l }) : undefined,
      placements: createLayoutPlacements(controls),
      rawData: device,
    };
    layoutSectionField.devices.push(deviceData);
  }

  return layoutSectionField;
};

export function createLayoutPlacements(controls: ReadonlyArray<{ placeholderPath: string; control: ScControl }>): LayoutPlacement[] {
  const roots: LayoutPlacement[] = [];
  const placementsByPath = new Map<string, LayoutPlacement>();

  for (const entry of controls) {
    const rawPath = entry.placeholderPath || "(no placeholder)";
    const segments = splitPlaceholderPath(rawPath);
    let children = roots;
    let currentPath = "";
    let placement: LayoutPlacement | undefined;

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      placement = placementsByPath.get(currentPath);
      if (!placement) {
        placement = { path: currentPath, name: segment, sourcePaths: [], placements: [], controls: [] };
        placementsByPath.set(currentPath, placement);
        children.push(placement);
      }
      if (!placement.sourcePaths.includes(rawPath)) placement.sourcePaths.push(rawPath);
      children = placement.placements;
    }

    placement?.controls.push(entry.control);
  }

  return roots;
}

function splitPlaceholderPath(rawPath: string): string[] {
  const segments = rawPath.split("/").filter(Boolean).map(stripDynamicPlaceholderSuffix);
  return segments.length > 0 ? segments : [rawPath];
}

function stripDynamicPlaceholderSuffix(segment: string): string {
  return segment.replace(/-\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}-\d+$/i, "");
}

function createDatasourceItem(datasource: string | undefined, currentItemPath: string | undefined): ItemGraphNodeData | undefined {
  if (!datasource) return undefined;
  const item = factoryItemGraphNodeData();
  if (datasource.toLowerCase().startsWith("local:")) {
    if (currentItemPath) item.scItemPath = currentItemPath + datasource.slice("local:".length);
  } else if (datasource.startsWith("/")) {
    item.scItemPath = datasource;
  } else {
    item.scItemId = datasource;
  }
  return item;
}

function parseParameters(raw?: string): Record<string, string> {
  return Object.fromEntries(Array.from(new URLSearchParams(raw ?? "")).filter(([, value]) => value.trim().length > 0));
}

function processLayoutXml(xml: string): SitecoreLayoutXml | undefined {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", isArray: (_name, jPath) => jPath === "r.d" || jPath === "r.d.r" });
  try {
    return parser.parse(xml) as SitecoreLayoutXml;
  } catch (error) {
    extensionLog.error("Failed to parse layout XML", { error });
    return undefined;
  }
}
