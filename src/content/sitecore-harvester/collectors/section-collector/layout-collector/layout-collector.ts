import { findFieldInput } from "../../helpers/harvest-helpers";
import { parseDevice } from "../../helpers/layout-parsing";
import { resolveQuickInfoForRenderingId } from "../../helpers/harvest-helpers";
import { buildFoblesUrl } from "../../../../features/augmentor/helper";
import { CONST } from "../../../../../constants/const";
import type { HarvestContext } from "../../../sitecore-harvester.types";

export const collectLayout = async (harvestContext: HarvestContext) => {

    const sharedLayoutInput = findFieldInput(harvestContext.doc, "Renderings");
    const finalLayoutInput = findFieldInput(harvestContext.doc, "Final renderings") ?? sharedLayoutInput;
    const sharedDevice = sharedLayoutInput?.value
        ? parseDevice(sharedLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
        : { layoutId: undefined, controls: [] };
    const finalDevice = finalLayoutInput?.value
        ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
        : { layoutId: undefined, controls: [] };
    const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;

    const layoutDetailsQuickInfo = layoutId ? await resolveQuickInfoForRenderingId(layoutId, harvestContext.signal) : undefined;
    harvestContext.result.sharedLayoutName = layoutDetailsQuickInfo?.itemName;
    harvestContext.result.sharedLayoutLink = layoutId ? buildFoblesUrl(layoutId) : undefined;
    harvestContext.result.sharedLayoutPath = layoutDetailsQuickInfo?.itemPath;
};
