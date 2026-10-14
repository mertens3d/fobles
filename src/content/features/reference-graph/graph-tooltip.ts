// @source-path [fobles] src/content/features/reference-graph/graph-tooltip.ts

import { type Instance as TippyInstance } from "tippy.js";
import type { TooltipData } from "./graph-nodes/graph-node.types";

// Lazily creates one tippy instance per node on first click, cached on the node itself.
let activeReferenceGraphTooltip: TippyInstance | null = null;

export function hideActiveTooltip(): void {
  activeReferenceGraphTooltip?.hide();
  activeReferenceGraphTooltip = null;
}

export function buildTooltipContent(
  data: TooltipData,
): HTMLElement {
  const container = document.createElement("div");

  container.style.cssText =
    "background:#203047;color:#fff;padding:8px 10px;border-radius:4px;font:12px/1.6 sans-serif;max-width:320px;";

  const rows: Array<[string, string | undefined]> = [
    ["Name", data.name],
    ["GUID", data.guid],
    ["Path", data.path],
    ["Placeholder", data.placeholder],
  ];

  const visibleRows = rows.filter(
    (row): row is [string, string] =>
      row[1] !== undefined,
  );

  visibleRows.forEach(([label, value], index) => {
    const row = document.createElement("div");

    row.style.cssText =
      index < visibleRows.length - 1
        ? "margin-bottom:6px;"
        : "";

    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;

    const valueText = document.createElement("span");
    valueText.style.fontWeight = "400";
    valueText.textContent = value;

    row.append(strong, valueText);
    container.appendChild(row);
  });

  return container;
}

export function toggleTooltip(
  node: cytoscape.NodeSingular,
): void {
  const tip = getOrCreateTooltip(node);

  if (activeReferenceGraphTooltip === tip) {
    tip.hide();
    activeReferenceGraphTooltip = null;
  } else {
    activeReferenceGraphTooltip?.hide();
    activeReferenceGraphTooltip = tip;
    tip.show();
  }
}

function getOrCreateTooltip(
  node: cytoscape.NodeSingular,
): TippyInstance {
  let tip = node.scratch("_foblesTooltip") as
    | TippyInstance
    | undefined;

  if (!tip) {
    tip = node.popper({
      content: () =>
        buildTooltipContent(
          node.data("tooltip") as TooltipData,
        ),
    }) as TippyInstance;

    node.scratch("_foblesTooltip", tip);
    node.on("remove", () => tip?.destroy());
  }

  return tip;
}