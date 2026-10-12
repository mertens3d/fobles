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
    dialog.style.cssText =
        "width:90vw;height:85vh;padding:0;border:none;border-radius:4px;";

    const toolbarStyle = doc.createElement("style");

    toolbarStyle.textContent = `
        #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button {
            border: 1px solid #2f6fed;
            background: #eaf1fc;
            color: #203047;
            border-radius: 4px;
            padding: 5px 12px;
            font-size: 12px;
            font-family: sans-serif;
            cursor: pointer;
        }

        #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button:hover:not(:disabled) {
            background: #d7e4fb;
        }

        #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button--close {
            border-color: #d13f3f;
            background: #fbe9e9;
        }

        #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button--close:hover {
            background: #f6d4d4;
        }
    `;

    const closeButton = createCloseButton(
        doc,
        dialog,
    );

    const appHost = doc.createElement("div");

    appHost.style.cssText =
        "position:relative;width:100%;height:100%;";

    const appRoot = createRoot(appHost);

    dialog.append(
        toolbarStyle,
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
