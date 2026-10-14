// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx

import { createRoot } from "react-dom/client";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type {
    SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import { createCloseButton } from "./close-button";
import {
    setActiveReferenceGraphDialog,
} from "./cytoscape/cytoscape-config";
import { ReferenceGraphApp } from "./reference-graph-app";
import type { HarvestForLink } from "./graph.types";
import { disposeBackgroundWorkerPool } from "../../sitecore-harvester/worker-pool/worker-pool-client";
import { closeReferenceGraphProgressModal } from "./build-progress";

export function openReferenceGraphModal(
    doc: Document,
    graph: SitecoreHarvestResult,
    harvestForLink: HarvestForLink,
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

    dialog.addEventListener(
        "close",
        () => {
            closeReferenceGraphProgressModal(
                doc,
            );

            appRoot.unmount();

            setActiveReferenceGraphDialog(
                undefined,
            );

            void disposeBackgroundWorkerPool();

            dialog.remove();
        },
    );

    dialog.showModal();

    appRoot.render(
        <ReferenceGraphApp
            doc={doc}
            initialGraph={graph}
            harvestForLink={harvestForLink}
        />,
    );
}
