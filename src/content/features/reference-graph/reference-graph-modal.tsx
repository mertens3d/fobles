// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx

import { createRoot } from "react-dom/client";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import {
  disposeBackgroundWorkerPool,
} from "../../sitecore-harvester/worker-pool/worker-pool-client";
import {
  closeReferenceGraphProgressModal,
} from "./build-progress";
import {
  createCloseButton,
} from "./close-button";
import {
  disposeActiveEnrichmentController,
} from "./enrichment/enrichment-controller";
import type {
  HarvestForLink,
} from "./graph.types";
import type {
  PreparedReferenceGraph,
} from "./prepared-reference-graph.types";
import {
  ReferenceGraphApp,
} from "./reference-graph-app";

export function openReferenceGraphModal(
  doc: Document,
  preparedGraph:
    PreparedReferenceGraph,
  harvestForLink:
    HarvestForLink,
): void {
  doc
    .getElementById(
      REFERENCE_GRAPH.DOM.IDS.DIALOG_ID,
    )
    ?.remove();

  const dialog =
    doc.createElement("dialog");

  dialog.id = REFERENCE_GRAPH.DOM.IDS.DIALOG_ID;

  dialog.className = "fobles-reference-graph";

  const closeButton =
    createCloseButton(
      doc,
      dialog,
    );

  const appHost =
    doc.createElement("div");

  appHost.style.cssText =
    "position:relative;width:100%;height:100%;";

  const appRoot =
    createRoot(appHost);

  dialog.append(
    closeButton,
    appHost,
  );

  doc.body.appendChild(
    dialog,
  );

  dialog.addEventListener(
    "close",
    () => {
      disposeActiveEnrichmentController();

      closeReferenceGraphProgressModal(
        doc,
      );

      appRoot.unmount();

      void disposeBackgroundWorkerPool()
        .finally(() => {
          dialog.remove();
        });
    },
    {
      once: true,
    },
  );

  dialog.showModal();

  appRoot.render(
    <ReferenceGraphApp
      doc={doc}
      initialPreparedGraph={
        preparedGraph
      }
      harvestForLink={
        harvestForLink
      }
    />,
  );
}