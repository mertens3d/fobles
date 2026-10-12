import { getParentPath } from "../../../shared/path-helpers";
import { factoryItemGraphNodeData, type HarvestContext } from "../sitecore-harvester.types";

export const collectParent = async (harvestContext: HarvestContext) => {
    const parentPath = getParentPath(harvestContext.rootItem.path ?? undefined);
    const parent = factoryItemGraphNodeData();
    parent.name = parentPath?.split("/").filter(Boolean).pop() ?? undefined;
    parent.itemId = "";
    parent.link = undefined;
    parent.path = parentPath;
    parent.template = undefined;

    harvestContext.result.parent = parent;
    return Promise.resolve();
};