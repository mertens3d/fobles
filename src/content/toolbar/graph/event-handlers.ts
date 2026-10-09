import tippy, { type Instance as TippyInstance } from "tippy.js";
import { closeRenderingGraphProgressModal, openRenderingGraphProgressModal } from "./rendering-graph-modal";
import { extensionLog } from "../../logger";
import type { ReferenceGraphResult } from "./rendering-graph.types";
import type { TooltipData } from "./graph.types";

export function attachGraphEventHandlers(cy: cytoscape.Core, 
    container: HTMLElement,
    harvestForLink: (link: string) => Promise<ReferenceGraphResult | undefined>,
    doc: Document,
    graphHistory: ReferenceGraphResult[],
    currentGraph: ReferenceGraphResult,
    renderGraph: (newGraph: ReferenceGraphResult) => void,
): void {
    cy.on("mouseover", "node", (event) => {
        container.style.cursor = event.target.data("link") ? "pointer" : "default";
    });
    cy.on("mouseout", "node", () => {
        container.style.cursor = "default";
    });

    // Click vs double-click on the same node both fire "tap" (twice, for a double-click) before
    // cytoscape's own "dbltap" also fires - a short pending timer tells them apart: a second tap
    // arriving before it elapses cancels the single-click (tooltip) action in favor of "dbltap"'s
    // navigate action below, same debounce technique used for any click/dblclick disambiguation.
    let pendingTapTimeout: ReturnType<typeof setTimeout> | null = null;
    cy.on("tap", "node", (event) => {
        const link = event.target.data("link");
        const mouseEvent = event.originalEvent as MouseEvent | undefined;
        if (mouseEvent?.ctrlKey || mouseEvent?.metaKey) {
            if (link) window.open(link, "_blank", "noopener,noreferrer");
            return;
        }
        if (!link) return;

        if (pendingTapTimeout) {
            clearTimeout(pendingTapTimeout);
            pendingTapTimeout = null;
            return;
        }
        pendingTapTimeout = setTimeout(() => {
            pendingTapTimeout = null;
            toggleTooltip(event.target);
        }, 250);
    });

    // Tapping the empty canvas (not a node) dismisses whichever tooltip is still open.
    cy.on("tap", (event) => {
        if (event.target === cy) hideActiveTooltip();
    });

    cy.on("dbltap", "node", (event) => {
        if (pendingTapTimeout) {
            clearTimeout(pendingTapTimeout);
            pendingTapTimeout = null;
        }
        const link = event.target.data("link");
        if (!link) return;
        hideActiveTooltip();

        extensionLog.debug("Rendering graph: re-rooting at clicked node", { link });
        let cancelled = false;
        openRenderingGraphProgressModal(doc, () => {
            cancelled = true;
            closeRenderingGraphProgressModal(doc);
        });
        void harvestForLink(link).then((newGraph) => {
            closeRenderingGraphProgressModal(doc);
            // Not every item has a Layout section (templates, media, etc.) - expected, not an error.
            if (cancelled || !newGraph) return;
            graphHistory.push(currentGraph);
            renderGraph(newGraph);
        });
    });
}

// Lazily creates one tippy instance per node on first click, cached on the node itself (cytoscape's
// scratchpad, not `data()` - this is view-only state, not graph data) so later clicks reuse it.
// Tracks the single currently-shown instance so clicking a different node always hides whichever
// other tooltip was still open; clicking the SAME node again toggles its tooltip off.
let activeRenderingGraphTooltip: TippyInstance | null = null;

function toggleTooltip(node: cytoscape.NodeSingular): void {
    const tip = getOrCreateTooltip(node);
    if (activeRenderingGraphTooltip === tip) {
        tip.hide();
        activeRenderingGraphTooltip = null;
        return;
    }
    activeRenderingGraphTooltip?.hide();
    activeRenderingGraphTooltip = tip;
    tip.show();
}

export function hideActiveTooltip(): void {
    activeRenderingGraphTooltip?.hide();
    activeRenderingGraphTooltip = null;
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
