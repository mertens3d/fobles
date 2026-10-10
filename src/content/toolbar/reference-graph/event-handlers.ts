// @source-path [fobles] src/content/toolbar/reference-graph/event-handlers.ts

import { extensionLog } from "../../logger";
import { hideActiveTooltip, toggleTooltip } from "./graph-tooltip";
import { closeReferenceGraphProgressModal, initializeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { HARVEST_STEPS } from "../../sitecore-harvester/harvest-steps";

function getEventNode(event: cytoscape.EventObject): cytoscape.NodeSingular {
    return event.target as cytoscape.NodeSingular;
}

function getNodeLink(node: cytoscape.NodeSingular): string | undefined {
    const link: unknown = node.data("link");
    return typeof link === "string" ? link : undefined;
}

export function attachGraphEventHandlers(cy: cytoscape.Core,
    container: HTMLElement,
    harvestForLink: (link: string, filters: SitecoreHarvestFiltersState,) => Promise<SitecoreHarvestResult | undefined>,
    doc: Document,
    getCurrentFilters: () => SitecoreHarvestFiltersState,
    graphHistory: SitecoreHarvestResult[],
    getCurrentGraph: () => SitecoreHarvestResult,
    renderGraph: (newGraph: SitecoreHarvestResult) => void,
): void {
    cy.on("mouseover", "node", (event: cytoscape.EventObject) => {
        const node = getEventNode(event);
        container.style.cursor = getNodeLink(node) ? "pointer" : "default";
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
        const node = getEventNode(event);
        const link = getNodeLink(node);
        const originalEvent: unknown = event.originalEvent;
        const mouseEvent = originalEvent instanceof MouseEvent ? originalEvent : undefined;

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
            toggleTooltip(node);
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
        const node = getEventNode(event);
        const link = getNodeLink(node);
        if (!link) return;
        hideActiveTooltip();

        extensionLog.debug("Reference graph: re-rooting at clicked node", { link });
        let cancelled = false;
        openReferenceGraphProgressModal(doc, () => {
            cancelled = true;
            closeReferenceGraphProgressModal(doc);
        });

        const filters = getCurrentFilters();

        initializeReferenceGraphProgressModal(
            doc,
            HARVEST_STEPS,
            filters,
        );

        void harvestForLink(link, filters).then((newGraph) => {
            closeReferenceGraphProgressModal(doc);
            // Not every item has a Layout section (templates, media, etc.) - expected, not an error.
            if (cancelled || !newGraph) return;
            graphHistory.push(getCurrentGraph());
            renderGraph(newGraph);
        });
    });
}
