// @source-path [fobles] src/content/features/reference-graph/event-handlers.ts

import { extensionLog } from "../../logger";
import { closeReferenceGraphProgressModal, initializeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { PROGRESS_STEPS } from "../../sitecore-harvester/planner/harvest-steps";
import type { HarvestForLink } from "./graph.types";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

function getEventNode(event: cytoscape.EventObject): cytoscape.NodeSingular {
    return event.target as cytoscape.NodeSingular;
}

function getNodeLink(node: cytoscape.NodeSingular): string | undefined {
    const link: unknown = node.data("link");
    return typeof link === "string" ? link : undefined;
}

export function attachGraphEventHandlers(cy: cytoscape.Core,
    container: HTMLElement,
    harvestForLink: HarvestForLink,
    doc: Document,
    getCurrentFilters: () => SitecoreHarvestFiltersState,
    graphHistory: PreparedReferenceGraph[],
    getCurrentPreparedGraph: () => PreparedReferenceGraph,
    onGraphChange: (graph: SitecoreHarvestResult) => Promise<void>,
    onHistoryChange: (count: number) => void,
    onNodeSelect: (treeNodeId: string | undefined) => void,
): void {
    cy.on("mouseover", "node", (event: cytoscape.EventObject) => {
        const node = getEventNode(event);
        container.style.cursor = getNodeLink(node) ? "pointer" : "default";
    });
    cy.on("mouseout", "node", () => {
        container.style.cursor = "default";
    });

    let pendingContextTap: ReturnType<typeof setTimeout> | undefined;
    let lastContextTapNodeId: string | undefined;
    let lastContextTapAt = 0;
    cy.on("cxttap", (event) => {
        const node = event.target === cy ? undefined : getEventNode(event);
        const nodeId = node?.id();
        const now = performance.now();
        const isDoubleContextTap = Boolean(node && nodeId === lastContextTapNodeId && now - lastContextTapAt <= 350);
        if (pendingContextTap !== undefined) clearTimeout(pendingContextTap);
        if (isDoubleContextTap && node) {
            const visibleTarget = node.isParent() ? node.union(node.descendants(":visible")) : node;
            cy.fit(visibleTarget, 80);
            lastContextTapNodeId = undefined;
            lastContextTapAt = 0;
        } else {
            lastContextTapNodeId = nodeId;
            lastContextTapAt = now;
            const originalEvent = event.originalEvent instanceof MouseEvent ? event.originalEvent : undefined;
            const renderedPosition = event.renderedPosition;
            pendingContextTap = setTimeout(() => {
                const factor = originalEvent?.ctrlKey || originalEvent?.metaKey ? 1 / 1.2 : 1.2;
                const level = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
                cy.zoom({ level, renderedPosition });
                pendingContextTap = undefined;
            }, 350);
        }
    });

    // Selection has no visible artifact to suppress (unlike the old tooltip-toggle), so a
    // double-click's leading "tap" selecting the node right before "dbltap" re-roots it is
    // harmless - no debounce needed to tell single- from double-click apart anymore.
    cy.on("tap", "node", (event) => {
        const node = getEventNode(event);
        const link = getNodeLink(node);
        const originalEvent: unknown = event.originalEvent;
        const mouseEvent = originalEvent instanceof MouseEvent ? originalEvent : undefined;

        if (mouseEvent?.ctrlKey || mouseEvent?.metaKey) {
            if (link) window.open(link, "_blank", "noopener,noreferrer");
            return;
        }

        onNodeSelect(node.id());
    });

    // Tapping the empty canvas (not a node) clears the current selection.
    cy.on("tap", (event) => {
        if (event.target === cy) onNodeSelect(undefined);
    });

    cy.on("dbltap", "node", (event) => {
        const node = getEventNode(event);
        const link = getNodeLink(node);
        if (!link) return;

        extensionLog.debug("Reference graph: re-rooting at clicked node", { link });
        let cancelled = false;
        openReferenceGraphProgressModal(doc, () => {
            cancelled = true;
            closeReferenceGraphProgressModal(doc);
        });

        const filters = getCurrentFilters();

        initializeReferenceGraphProgressModal(
            doc,
            PROGRESS_STEPS,
            filters,
        );

        void harvestForLink(link, filters).then((newGraph) => {
            closeReferenceGraphProgressModal(doc);

            if (cancelled || !newGraph) return;

            graphHistory.push(getCurrentPreparedGraph());
            onHistoryChange(graphHistory.length);
            void onGraphChange(newGraph);
        });
    });
}
