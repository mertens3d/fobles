import type { ComponentType } from "react";
import type { Instance } from "tippy.js";
import type { HistoryItem } from "../../../src/shared/item-history/item-history.types.ts";

export type HistoryTooltipHarnessProps = {
  doc: Document;
  mounted: boolean;
};

export type HistoryTooltipProbe = {
  items: HistoryItem[];
  logs: unknown[][];
  publish: (items: HistoryItem[]) => void;
  subscribers: Set<(items: HistoryItem[]) => void>;
};

export type HistoryTooltipBundle = {
  Harness: ComponentType<HistoryTooltipHarnessProps>;
  probe: HistoryTooltipProbe;
};

export type HistoryTooltipAnchor = HTMLAnchorElement & { _tippy: Instance };