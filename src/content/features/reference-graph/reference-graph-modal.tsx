// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx

import type cytoscape from "cytoscape";
import { createRoot } from "react-dom/client";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { disposeBackgroundWorkerPool } from "../../sitecore-harvester/worker-pool/worker-pool-client";
import { closeReferenceGraphProgressModal } from "./build-progress";
import { createCloseButton } from "./close-button";
import { setActiveReferenceGraphDialog } from "./cytoscape/cytoscape-config";
import type { HarvestForLink } from "./graph.types";
import { ReferenceGraphApp } from "./reference-graph-app";

export function openReferenceGraphModal(
  doc: Document,
  graph: SitecoreHarvestResult,
  initialElements: cytoscape.ElementDefinition[],
  harvestForLink: HarvestForLink,
): void {
  doc.getElementById(REFERENCE_GRAPH.DIALOG_ID)?.remove();

  const dialog = doc.createElement("dialog");

  dialog.id = REFERENCE_GRAPH.DIALOG_ID;

  dialog.className = "fobles-reference-graph";

  const closeButton = createCloseButton(doc, dialog);

  const appHost = doc.createElement("div");

  appHost.style.cssText = "position:relative;width:100%;height:100%;";

  const appRoot = createRoot(appHost);

  dialog.append(closeButton, appHost);

  doc.body.appendChild(dialog);

  setActiveReferenceGraphDialog(dialog);

  dialog.addEventListener("close", () => {
    closeReferenceGraphProgressModal(doc);

    appRoot.unmount();

    setActiveReferenceGraphDialog(undefined);

    void disposeBackgroundWorkerPool();

    dialog.remove();
  });

  dialog.showModal();

  appRoot.render(
    <ReferenceGraphApp
      doc={doc}
      initialGraph={graph}
      initialElements={initialElements}
      harvestForLink={harvestForLink}
    />,
  );
}
