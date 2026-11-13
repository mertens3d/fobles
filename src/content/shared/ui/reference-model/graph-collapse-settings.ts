// @source-path [fobles] src/content/shared/ui/reference-model/graph-collapse-settings.ts

import { STORAGE } from "../../../../constants/extension.const";
import { getStorageValue, setStorageValue } from "../../../../shared/storage/storage";
import { isGraphCollapseKey } from "../../../foundation/reference-data/model/graph-collapse";
import { DEFAULT_EXPANDED_BY_COLLAPSE_KEY } from "../../../foundation/reference-data/model/model.const";
import type { ExpandedByCollapseKey } from "../../../foundation/reference-data/model/model.types";
import type { GraphCollapseKey } from "../../../foundation/reference-data/model/model.types";

export async function getExpandedByCollapseKey(): Promise<ExpandedByCollapseKey> {
  const result = await getStorageValue<unknown>([STORAGE.KEY.REFERENCE_GRAPH.EXPANDED_BY_COLLAPSE_KEY], "local");

  const storedValue = result[STORAGE.KEY.REFERENCE_GRAPH.EXPANDED_BY_COLLAPSE_KEY];

  const expandedByCollapseKey: ExpandedByCollapseKey = { ...DEFAULT_EXPANDED_BY_COLLAPSE_KEY };

  if (storedValue && typeof storedValue === "object") {
    Object.entries(storedValue).forEach(([key, value]) => {
      if (isGraphCollapseKey(key) && typeof value === "boolean") {
        expandedByCollapseKey[key] = value;
      }
    });
  }

  return expandedByCollapseKey;
}

export async function setExpandedByCollapseKey(expandedByCollapseKey: ExpandedByCollapseKey): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.REFERENCE_GRAPH.EXPANDED_BY_COLLAPSE_KEY]: expandedByCollapseKey }, "local");
}

export async function setExpandedStateForCollapseKey(collapseKey: GraphCollapseKey, expanded: boolean): Promise<void> {
  const expandedByCollapseKey = await getExpandedByCollapseKey();

  expandedByCollapseKey[collapseKey] = expanded;

  await setExpandedByCollapseKey(expandedByCollapseKey);
}
