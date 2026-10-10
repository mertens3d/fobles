import tippy, { type Instance as TippyInstance } from "tippy.js";
import { extensionLog } from "../../logger";
import type { ReferenceGraphResult } from "./reference-graph.types";
import { hideActiveTooltip, toggleTooltip } from "./graph-tooltip";
import { closeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";

export function attachGraphEventHandlers(cy: cytoscape.Core, 
    container: HTMLElement,
    harvestForLink: (link: string) => Promise<ReferenceGraphResult | undefined>,
    doc: Document,
    graphHistory: ReferenceGraphResult[],
    getCurrentGraph: () => ReferenceGraphResult,
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

        extensionLog.debug("Reference graph: re-rooting at clicked node", { link });
        let cancelled = false;
        openReferenceGraphProgressModal(doc, () => {
            cancelled = true;
            closeReferenceGraphProgressModal(doc);
        });
        void harvestForLink(link).then((newGraph) => {
            closeReferenceGraphProgressModal(doc);
            // Not every item has a Layout section (templates, media, etc.) - expected, not an error.
            if (cancelled || !newGraph) return;
            graphHistory.push(getCurrentGraph());
            renderGraph(newGraph);
        });
    });
}

