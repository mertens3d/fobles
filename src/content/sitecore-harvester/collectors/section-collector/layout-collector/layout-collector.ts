import { findFieldInput } from "../../helpers/harvest-helpers";
import { factoryItemGraphNodeData, type HarvestContext, type HarvestGraphControl, type LayoutDevice, type LayoutSectionField } from "../../../sitecore-harvester.types";
import { XMLParser } from "fast-xml-parser";
import type { SitecoreLayoutXml } from "./sitecore-layout-xml-schema.types";

export const collectLayouts = async (harvestContext: HarvestContext): Promise<void> => {
    const layoutsArray: LayoutSectionField[] = [];

    layoutsArray.push(processLayoutFieldValue(harvestContext, "Renderings"));
    layoutsArray.push(processLayoutFieldValue(harvestContext, "Final renderings"));

    harvestContext.result.layoutSectionFields = layoutsArray;
    return Promise.resolve();
};

const processLayoutFieldValue = (harvestContext: HarvestContext, layoutName: string): LayoutSectionField => {
    const layoutSectionField: LayoutSectionField = {
        name: layoutName,
        sectionFieldHtml: findFieldInput(harvestContext.doc, layoutName),
        devices: [],
    };
    const xml = layoutSectionField.sectionFieldHtml?.value;
    if (xml) {

        const rawProcessedXMl = processLayoutXml(xml);
        if (rawProcessedXMl) {

            for (const device of rawProcessedXMl.r.d) {

                const layoutView = factoryItemGraphNodeData();
                layoutView.itemId = device.l;

                const deviceData: LayoutDevice = {
                    layoutView: layoutView,
                    deviceId: device.id,
                    controls: []
                };

                for (const rendering of device.r ?? []) {
                    const control: HarvestGraphControl = {

                        renderingId: rendering["s:id"],
                        name: undefined,
                        path: undefined,
                        template: undefined,
                        datasource: rendering["s:ds"],
                        datasourceLink: undefined,
                        placeholder: rendering["s:ph"],
                        uid: rendering.uid,
                        link: undefined,
                        parameters: parseParameters(rendering["s:par"]),
                        p_before: rendering["p:before"],
                        p_after: rendering["p:after"],
                    };
                    deviceData.controls.push(control);
                }

                layoutSectionField.devices.push(deviceData);
            }
        }
    }

    return layoutSectionField;
};

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