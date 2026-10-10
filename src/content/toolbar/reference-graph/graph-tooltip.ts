import type { TooltipData } from "./reference-graph.types";
import { type Instance as TippyInstance } from "tippy.js";

// Lazily creates one tippy instance per node on first click, cached on the node itself (cytoscape's
// scratchpad, not `data()` - this is view-only state, not graph data) so later clicks reuse it.
// Tracks the single currently-shown instance so clicking a different node always hides whichever
// other tooltip was still open; clicking the SAME node again toggles its tooltip off.
let activeReferenceGraphTooltip: TippyInstance | null = null;

export function buildTooltip(
  name: string | undefined,
  guid: string | undefined,
  path: string | undefined,
  placeholder: string | undefined = undefined): TooltipData {
  return { name, guid, path, placeholder };
}

export function hideActiveTooltip(): void {
    activeReferenceGraphTooltip?.hide();
    activeReferenceGraphTooltip = null;
}

function buildTooltipContent(data: TooltipData): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText =
    "background:#203047;color:#fff;padding:8px 10px;border-radius:4px;font:12px/1.6 sans-serif;max-width:320px;";

  const rows: Array<[string, string | undefined]> = [
    ["Name", data.name ?? undefined],
    ["GUID", data.guid ?? undefined],
    ["Path", data.path ?? undefined],
    ["Placeholder", data.placeholder ?? undefined],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => row[1] !== undefined);
  visibleRows.forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.style.cssText = index < visibleRows.length - 1 ? "margin-bottom:6px;" : "";
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

export function toggleTooltip(node: cytoscape.NodeSingular): void {
    const tip = getOrCreateTooltip(node);
    if (activeReferenceGraphTooltip === tip) {
        tip.hide();
        activeReferenceGraphTooltip = null;
        return;
    }
    activeReferenceGraphTooltip?.hide();
    activeReferenceGraphTooltip = tip;
    tip.show();
}

function getOrCreateTooltip(node: cytoscape.NodeSingular): TippyInstance {
    let tip = node.scratch("_foblesTooltip") as TippyInstance | undefined;
    if (!tip) {
        tip = node.popper({ content: () => buildTooltipContent(node.data("tooltip") as TooltipData) }) as TippyInstance;
        node.scratch("_foblesTooltip", tip);
        node.on("remove", () => tip?.destroy());
    }
    return tip;
}
