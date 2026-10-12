// @source-path [fobles] src/content/toolbar/reference-graph/reference-graph-modal.tsx

import { createRoot } from "react-dom/client";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type {
    SitecoreHarvestFiltersState,
    SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import { createCloseButton } from "./close-button";
import {
    setActiveReferenceGraphDialog,
} from "./cytoscape/cytoscape-config";
import { ReferenceGraphApp } from "./reference-graph-app";

export function openReferenceGraphModal(
    doc: Document,
    graph: SitecoreHarvestResult,
    harvestForLink: (
        link: string,
        filters: SitecoreHarvestFiltersState,
    ) => Promise<SitecoreHarvestResult | undefined>,
): void {
    doc.getElementById(
        REFERENCE_GRAPH.DIALOG_ID,
    )?.remove();

    const dialog = doc.createElement("dialog");

    dialog.id = REFERENCE_GRAPH.DIALOG_ID;
    dialog.className = "fobles-reference-graph";

    const closeButton = createCloseButton(
        doc,
        dialog,
    );

    const appHost = doc.createElement("div");

    appHost.style.cssText =
        "position:relative;width:100%;height:100%;";

    const appRoot = createRoot(appHost);

    dialog.append(
        closeButton,
        appHost,
    );

    doc.body.appendChild(dialog);

    setActiveReferenceGraphDialog(dialog);

    dialog.addEventListener("close", () => {
        appRoot.unmount();
        setActiveReferenceGraphDialog(undefined);
        dialog.remove();
    });

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });

    dialog.showModal();

    appRoot.render(
        <ReferenceGraphApp
            doc={doc}
            initialGraph={graph}
            harvestForLink={harvestForLink}
        />,
    );
}
