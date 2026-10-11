import { findFieldInput } from "../../helpers/harvest-helpers";
import { parseDevice } from "../../helpers/layout-parsing";
import { resolveQuickInfoForRenderingId } from "../../helpers/harvest-helpers";
import { resolveDatasourceLink } from "../../helpers/field-links";
import { buildFoblesUrl } from "../../../../features/augmentor/helper";
import type { HarvestContext } from "../../../sitecore-harvester.types";
import { CONST } from "../../../../../constants/const";

export const collectControls = async (harvestContext: HarvestContext) : Promise<void> => {
    const sharedLayoutInput = findFieldInput(harvestContext.doc, "Renderings");
          const finalLayoutInput = findFieldInput(harvestContext.doc, "Final renderings") ?? sharedLayoutInput;
          const finalDevice = finalLayoutInput?.value
            ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
            : { layoutId: undefined, controls: [] };
    
          const enrichedControls = await Promise.all(
    
            finalDevice.controls.map(async (control) => {
              const details = control.renderingId ? await resolveQuickInfoForRenderingId(control.renderingId, harvestContext.signal) : undefined;
              return {
                ...control,
                name: details?.itemName ?? undefined,
                path: details?.itemPath ?? undefined,
                template: details?.template ?? undefined,
                link: control.renderingId ? buildFoblesUrl(control.renderingId) : undefined,
                datasourceLink: resolveDatasourceLink(control.datasource, harvestContext.rootItem.path ?? undefined),
              };
            })
          );
          harvestContext.result.controls = enrichedControls;
};