import { CONST } from "../../../../constants/const";
import type { ProcessingStatus } from "../lifecycle/processing-state";

export function iconForProcessingState(
  status: ProcessingStatus | undefined,
  itemIcon: string | undefined,
): string | undefined {
  let icon = itemIcon;

  if (status === "pending" || status === "enriching") {
    icon = CONST.SITECORE.ICONS.PROCESSING_STATE.HOURGLASS;
  } else if (status === "stale") {
    icon = CONST.SITECORE.ICONS.PROCESSING_STATE.REFRESH;
  } else if (status === "failed" || status === "unverified" || status === "not-found") {
    icon = CONST.SITECORE.ICONS.PROCESSING_STATE.WARNING;
  }

  return icon;
}