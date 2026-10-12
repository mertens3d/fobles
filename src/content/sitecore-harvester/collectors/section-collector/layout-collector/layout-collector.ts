import { findFieldInput } from "../../helpers/harvest-helpers";
import { factoryItemGraphNodeData, type HarvestContext, type HarvestGraphControl, type LayoutDevice, type LayoutSectionField } from "../../../sitecore-harvester.types";
import { XMLParser } from "fast-xml-parser";
import type { SitecoreLayoutXml } from "./sitecore-layout-xml-schema.types";

// export const collectLayout = async (harvestContext: HarvestContext) => {
//     const layouts = await collectLayouts(harvestContext);

//     // const sharedLayoutInput = findFieldInput(harvestContext.doc, "Renderings");
//     // const sharedLayoutData: LayoutData = {
//     //     sectionField: sharedLayoutInput,
//     //     devices: [],
//     // };
//     // await collectDevices(sharedLayoutData, harvestContext);

//     // const finalLayoutInput = findFieldInput(harvestContext.doc, "Final renderings") ?? sharedLayoutInput;
//     // const sharedDevice = sharedLayoutInput?.value
//     //     ? parseDevice(sharedLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
//     //     : { layoutId: undefined, controls: [] };
//     // const finalDevice = finalLayoutInput?.value
//     //     ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
//     //     : { layoutId: undefined, controls: [] };

//     // const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;

//     // const layoutDetailsQuickInfo = layoutId ? await resolveQuickInfoForRenderingId(layoutId, harvestContext.signal) : undefined;
//     // harvestContext.result.layouts.sharedLayoutName = layoutDetailsQuickInfo?.itemName;
//     // harvestContext.result.layouts.sharedLayoutLink = layoutId ? buildFoblesUrl(layoutId) : undefined;
//     // harvestContext.result.layouts.sharedLayoutPath = layoutDetailsQuickInfo?.itemPath;
// };

export const collectLayouts = async (harvestContext: HarvestContext): Promise<void> => {
    const layoutsArray: LayoutSectionField[] = [];

    layoutsArray.push( processLayoutFieldValue(harvestContext, "Renderings"));
    layoutsArray.push( processLayoutFieldValue(harvestContext, "Final renderings"));

    // const sharedLayoutData : LayoutData = {
    //   sectionField: findFieldInput(harvestContext.doc, "Renderings"),
    //   devices: undefined,
    // };
    // layoutsArray.push(sharedLayoutData);

    // const finalLayoutData : LayoutData = {
    //   sectionField: findFieldInput(harvestContext.doc, "Final renderings"),
    //   devices: undefined,
    // };
    // layoutsArray.push(finalLayoutData);

    // setDevices(sharedLayoutData);
    // setDevices(finalLayoutData);
    harvestContext.result.layoutSectionFields = layoutsArray;
    return Promise.resolve();
};

const processLayoutFieldValue =  (harvestContext: HarvestContext, layoutName: string): LayoutSectionField => {
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

                for (const rendering of device.r) {
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

    // await collectDevices(layoutSectionField, harvestContext);
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

// export const collectControls = async (harvestContext: HarvestContext): Promise<void> => {
//     const sharedLayoutInput = findFieldInput(harvestContext.doc, "Renderings");
//     const finalLayoutInput = findFieldInput(harvestContext.doc, "Final renderings") ?? sharedLayoutInput;
//     const finalDevice = finalLayoutInput?.value
//         ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
//         : { layoutId: undefined, controls: [] };

//     const enrichedControls = await Promise.all(

//         finalDevice.controls.map(async (control) => {
//             const details = control.renderingId ? await resolveQuickInfoForRenderingId(control.renderingId, harvestContext.signal) : undefined;
//             return {
//                 ...control,
//                 name: details?.itemName ?? undefined,
//                 path: details?.itemPath ?? undefined,
//                 template: details?.template ?? undefined,
//                 link: control.renderingId ? buildFoblesUrl(control.renderingId) : undefined,
//                 datasourceLink: resolveDatasourceLink(control.datasource, harvestContext.rootItem.path ?? undefined),
//             };
//         })
//     );
//     harvestContext.result.layouts.controls = enrichedControls;
// };

// const collectDeviceControls = (device: LayoutDevice, harvestContext: HarvestContext) => {
//     device.controls.map(async (control) => {
//         const details = control.renderingId ? await resolveQuickInfoForRenderingId(control.renderingId, harvestContext.signal) : undefined;
//         return {
//             ...control,
//             name: details?.itemName ?? undefined,
//             path: details?.itemPath ?? undefined,
//             template: details?.template ?? undefined,
//             link: control.renderingId ? buildFoblesUrl(control.renderingId) : undefined,
//             datasourceLink: resolveDatasourceLink(control.datasource, harvestContext.rootItem.path ?? undefined),
//         };
//     })
// };

// const collectDevices = async (layoutData: LayoutSectionField, harvestContext: HarvestContext) => {

//     if (layoutData.sectionFieldHtml?.value) {
//         layoutData.devices = parseDevices(layoutData.sectionFieldHtml.value, CONST.SITECORE.DEVICES.DEFAULT);
//     } else {
//         layoutData.devices = [];
//     }

//     if (layoutData.devices && layoutData.devices.length > 0) {
//         // layoutData.devices = [{ layoutId: undefined, controls: [], LayoutName: undefined, LayoutLink: undefined, LayoutPath: undefined }];
//         for (const device of layoutData.devices) {
//             const layoutDetailsQuickInfo = device.layoutView?.itemId ? await resolveQuickInfoForRenderingId(device.layoutView?.itemId ?? "", harvestContext.signal) : undefined;
//             if (device.layoutView?.itemId) {
//                 let templateLink = undefined;
//                 if (layoutDetailsQuickInfo?.template?.id) {
//                     templateLink = buildFoblesUrl(layoutDetailsQuickInfo?.template?.id);
//                 }
//                 device.layoutView = {
//                     name: layoutDetailsQuickInfo?.itemName,
//                     path: layoutDetailsQuickInfo?.itemPath,
//                     template: {
//                         path: layoutDetailsQuickInfo?.template?.path ?? undefined,
//                         link: templateLink,
//                         itemId: layoutDetailsQuickInfo?.template?.id ?? undefined,
//                         name: undefined,
//                         template: undefined,
//                     },
//                     link: device.layoutView?.itemId ? buildFoblesUrl(device.layoutView?.itemId) : undefined,
//                     itemId: device.layoutView?.itemId ?? undefined,
//                 };
//             }
//             collectDeviceControls(device, harvestContext);
//         }

//     }

// };