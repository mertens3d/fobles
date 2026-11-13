import type { LayoutCollectionFailure } from "./layout-collector.types.js";
// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/layout-collector/layout-collector.ts

import { XMLParser } from "fast-xml-parser";
import { extensionLog } from "../../../../../logger";
import { findFieldInput } from "../../helpers/harvest-helpers";
import { isGuidLike } from "../../../../sitecore/guid";
import { readRenderingAttribute } from "./rendering-xml-attributes";
import type { SitecoreLayoutXml } from "./layout-collector.types";
import { factoryItemGraphNodeData } from "../../../../reference-data/model/sitecore-item.js";
import type { LayoutDevice } from "../../../../reference-data/model/model.types";
import type { ScControl } from "../../../../reference-data/model/model.types";
import type { LayoutPlacement } from "../../../../reference-data/model/model.types";
import type { LayoutSectionField } from "../../../../reference-data/model/model.types";
import type { ItemGraphNodeData } from "../../../../reference-data/model/model.types";
import type { HarvestContext } from "../../../harvesting.types.js";

export const collectLayouts = (harvestContext: HarvestContext): Promise<LayoutCollectionFailure | undefined> => {
  const collected = [processLayoutFieldValue(harvestContext, "Renderings"), processLayoutFieldValue(harvestContext, "Final renderings")];
  harvestContext.result.layoutSectionFields = collected.map(({ field }) => field);
  return Promise.resolve(collected.find(({ failure }) => failure)?.failure);
};

const processLayoutFieldValue = (harvestContext: HarvestContext, layoutName: string): { field: LayoutSectionField; failure?: LayoutCollectionFailure } => {
  const sectionFieldHtml = findFieldInput(harvestContext.doc, layoutName);
  const layoutSectionField: LayoutSectionField = { name: layoutName, devices: [], rawMarkup: sectionFieldHtml?.value };
  const xml = sectionFieldHtml?.value;

  if (!xml) {
    return { field: layoutSectionField, failure: { code: "layout-unavailable", message: `${layoutName} field is unavailable`, details: { layoutName, fieldPresent: Boolean(sectionFieldHtml) } } };
  }

  const rawProcessedXml = processLayoutXml(xml);
  extensionLog.debug("Processed layout XML:", rawProcessedXml);

  const devices = rawProcessedXml?.r?.d;
  if (!Array.isArray(devices)) {
    extensionLog.warn("Layout collector: parsed layout does not contain a device collection", {
      layoutName,
      rawMarkupLength: xml.length,
      parsedRootKeys: rawProcessedXml && typeof rawProcessedXml === "object" ? Object.keys(rawProcessedXml) : [],
      renderingRootKeys: rawProcessedXml?.r && typeof rawProcessedXml.r === "object" ? Object.keys(rawProcessedXml.r) : [],
    });
    return { field: layoutSectionField, failure: { code: "layout-malformed", message: `${layoutName} XML does not contain a device collection`, details: { layoutName, rawMarkupLength: xml.length, parsedRootKeys: rawProcessedXml && typeof rawProcessedXml === "object" ? Object.keys(rawProcessedXml) : [], renderingRootKeys: rawProcessedXml?.r && typeof rawProcessedXml.r === "object" ? Object.keys(rawProcessedXml.r) : [] } } };
  }

  for (const device of devices) {
    const controls = (device.r ?? []).map((rendering): { placeholderPath: string; control: ScControl } => ({
      placeholderPath: readRenderingAttribute(rendering, "ph") || "(no placeholder)",
      control: {
        rendering: factoryItemGraphNodeData({ scItemId: readRenderingAttribute(rendering, "id") }),
        datasource: createDatasourceItem(readRenderingAttribute(rendering, "ds"), harvestContext.rootItem.scItemPath),
        uid: rendering.uid,
        parameters: parseReferenceParameters(readRenderingAttribute(rendering, "par")),
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

  return { field: layoutSectionField };
};

export function createLayoutPlacements(
  controls: ReadonlyArray<{ placeholderPath: string; control: ScControl }>,
): LayoutPlacement[] {
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

      if (!placement.sourcePaths.includes(rawPath)) {
        placement.sourcePaths.push(rawPath);
      }
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

function createDatasourceItem(
  datasource: string | undefined,
  currentItemPath: string | undefined,
): ItemGraphNodeData | undefined {
  if (!datasource) {
    return undefined;
  }

  const item = factoryItemGraphNodeData();

  if (datasource.toLowerCase().startsWith("local:")) {
    if (currentItemPath) {
      item.scItemPath = currentItemPath + datasource.slice("local:".length);
    }
  } else if (datasource.startsWith("/")) {
    item.scItemPath = datasource;
  } else {
    item.scItemId = datasource;
  }

  return item;
}

function isSitecorePath(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("/sitecore/") || normalized.startsWith("sitecore/") || normalized.startsWith("local:");
}

function parseReferenceParameters(raw?: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(new URLSearchParams(raw ?? "")).filter(([, value]) => {
      const candidate = value.trim();
      return candidate.length > 0 && (isGuidLike(candidate) || isSitecorePath(candidate));
    }),
  );
}

export function processLayoutXml(xml: string): SitecoreLayoutXml | undefined {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (_name, jPath) => jPath === "r.d" || jPath === "r.d.r",
  });

  try {
    return parser.parse(xml) as SitecoreLayoutXml;
  } catch (error) {
    extensionLog.error("Failed to parse layout XML", { error });
    return undefined;
  }
}
