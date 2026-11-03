// @source-path [fobles] src/content/toolbar/history/use-history-tooltip.ts

import { useEffect, useRef } from "react";
import tippy from "tippy.js";
import type { HistoryItem } from "../../../shared/item-history/item-history.types.ts";
import { HISTORY_CLASS, HISTORY_TEXT, HISTORY_UI } from "./history.const.ts";
import { historyGuid } from "./history-navigation.ts";

export function useHistoryTooltip(item: HistoryItem) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const anchor = ref.current;
    let cleanup: (() => void) | undefined;
    if (anchor) {
      const doc = anchor.ownerDocument;
      const content = [
        `${HISTORY_TEXT.PATH}: ${item.path}`,
        `${HISTORY_TEXT.GUID}: ${historyGuid(item.id)}`,
        `${HISTORY_TEXT.LAST_VISITED}: ${new Date(item.lastVisitedAt).toLocaleString()}`,
      ].join("\n");
      const tooltip = tippy(anchor, {
        allowHTML: false,
        animation: false,
        appendTo: () => doc.body,
        aria: { content: "describedby", expanded: false },
        content,
        delay: [HISTORY_UI.TOOLTIP_DELAY, 0],
        render: () => {
          const popper = doc.createElement("div");
          popper.className = HISTORY_CLASS.TOOLTIP;
          popper.setAttribute("role", "tooltip");
          popper.textContent = content;
          return { popper };
        },
        trigger: "mouseenter focus",
      });
      cleanup = () => tooltip.destroy();
    }
    return cleanup;
  }, [item.id, item.lastVisitedAt, item.path]);

  return ref;
}