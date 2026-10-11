import { getParentPath } from "../../../shared/path-helpers";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import type { HarvestContext } from "../sitecore-harvester.types";

export const collectParent = async (harvestContext: HarvestContext) => {
    const parentPath = getParentPath(harvestContext.rootItem.path ?? undefined);
    const parent = {
        name: parentPath?.split("/").filter(Boolean).pop() ?? undefined,
        itemId: "",
        link: parentPath ? buildFoblesUrl(parentPath) : undefined,
        path: parentPath,
        template: undefined,
        templateLink: undefined,
    };

    harvestContext.result.parent = parent;
    return Promise.resolve();
};