import { getParentPath } from "../../../shared/path-helpers";
import {
  factoryItemGraphNodeData,
  type HarvestContext,
} from "../sitecore-harvester.types";

export const collectParent = async (harvestContext: HarvestContext) => {
  const parentPath = getParentPath(
    harvestContext.rootItem.scItemPath ?? undefined,
  );
  const parent = factoryItemGraphNodeData({
    scItemPath: parentPath,
    scItemId: "",
    scItemName: parentPath?.split("/").filter(Boolean).pop() ?? undefined,
  });

  harvestContext.result.parent = parent;
  return Promise.resolve();
};
