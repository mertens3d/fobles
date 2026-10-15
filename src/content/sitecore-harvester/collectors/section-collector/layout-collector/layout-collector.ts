// @source-path [fobles] src/content/sitecore-harvester/collectors/section-collector/layout-collector/layout-collector.ts

import { findFieldInput } from "../../helpers/harvest-helpers";
import { factoryItemGraphNodeData, type HarvestContext, type ScControl, type ItemGraphNodeData, type LayoutDevice, type LayoutSectionField } from "../../../sitecore-harvester.types";
import { XMLParser } from "fast-xml-parser";
import type { SitecoreLayoutXml } from "./sitecore-layout-xml-schema.types";
import { extensionLog } from "../../../../logger";

export const collectLayouts = async (harvestContext: HarvestContext): Promise<void> => {
    const layoutsArray: LayoutSectionField[] = [];

    layoutsArray.push(processLayoutFieldValue(harvestContext, "Renderings"));
    layoutsArray.push(processLayoutFieldValue(harvestContext, "Final renderings"));

    harvestContext.result.layoutSectionFields = layoutsArray;
    return Promise.resolve();
};
const processLayoutFieldValue = (
    harvestContext: HarvestContext,
    layoutName: string,
): LayoutSectionField => {
    const sectionFieldHtml = findFieldInput(
        harvestContext.doc,
        layoutName,
    );

    const layoutSectionField: LayoutSectionField = {
        name: layoutName,
        devices: [],
        rawMarkup: sectionFieldHtml?.value,
    };

    const xml = sectionFieldHtml?.value;

    if (xml) {
        const rawProcessedXml = processLayoutXml(xml);

       extensionLog.debug("Processed layout XML:", rawProcessedXml);

        if (rawProcessedXml) {
            for (const device of rawProcessedXml.r.d) {
                const scPageLayoutItem = factoryItemGraphNodeData({
                    scItemId: device.l,
                });

                const scDeviceItem = factoryItemGraphNodeData({
                    scItemId: device.id,
                });

                const deviceData: LayoutDevice = {
                    scDeviceItem: scDeviceItem,
                    scPageLayoutItem: device.l
                        ? scPageLayoutItem
                        : undefined,
                    scControls: [],
                };

                for (const rendering of device.r ?? []) {
                    const renderingItem = factoryItemGraphNodeData({ scItemId: rendering["s:id"] });

                    const datasourceItem = createDatasourceItem(
                        rendering["s:ds"],
                        harvestContext.rootItem.scItemPath,
                    );

                    const control: ScControl = {
                        rendering: renderingItem,
                        datasource: datasourceItem,
                        placeholder: rendering["s:ph"],
                        uid: rendering.uid,
                        parameters: parseParameters(rendering["s:par"]),
                        p_before: rendering["p:before"],
                        p_after: rendering["p:after"],
                    };

                    deviceData.scControls.push(control);
                }

                layoutSectionField.devices.push(deviceData);
            }
        }
    }

    return layoutSectionField;
};

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
            item.scItemPath =
                currentItemPath +
                datasource.slice("local:".length);
        }
    } else if (datasource.startsWith("/")) {
        item.scItemPath = datasource;
    } else {
        item.scItemId = datasource;
    }

    return item;
}

function parseParameters(raw?: string): Record<string, string> {
    return Object.fromEntries(new URLSearchParams(raw ?? ""));
}

function processLayoutXml(xml: string): SitecoreLayoutXml | undefined {
    let result: SitecoreLayoutXml | undefined;
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        isArray: (_name, jPath) =>
            jPath === "r.d" ||
            jPath === "r.d.r",
    });
    try {
        result = parser.parse(xml) as SitecoreLayoutXml;

    } catch (error) {
        console.error("Failed to parse layout XML:", error);
    }
    return result;
}