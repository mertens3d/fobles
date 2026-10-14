// @source-path [fobles] src/content/features/reference-graph/cytoscape/cytoscape-config.ts

import cytoscapeDagre from "cytoscape-dagre";
import cytoscapeCoseBilkent from "cytoscape-cose-bilkent";
import cytoscapeFcose from "cytoscape-fcose";
import { extensionLog } from "../../../logger";
import cytoscapePopper from "cytoscape-popper";
import tippy from "tippy.js";
import cytoscape from "cytoscape";

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeFcose);

// dialog.showModal() renders the dialog in the browser's top layer, above everything else in
// the document - a tippy popper appended to document.body would render behind it. Tracking the
// open dialog here lets the popper factory append into it instead, so tooltips stay visible.
let activeReferenceGraphDialog: HTMLElement | undefined = undefined;
export const setActiveReferenceGraphDialog = (dialog: HTMLElement | undefined) => {
  activeReferenceGraphDialog = dialog;
};
export const getActiveReferenceGraphDialog = () => activeReferenceGraphDialog;

// Registers the popper <-> tippy bridge once per content-script load. Content/arrow are styled
// inline on our own div below rather than via tippy's own stylesheet, since importing CSS from a
// content-script .ts file would need its own esbuild/manifest wiring (not worth it for a POC).
cytoscape.use(
  cytoscapePopper((ref, content) =>
    tippy(document.createElement("div"), {
      getReferenceClientRect: ref.getBoundingClientRect,
      trigger: "manual",
      content,
      arrow: false,
      placement: "top",
      hideOnClick: false,
      appendTo: () => activeReferenceGraphDialog ?? document.body,
    }),
  ),
);
extensionLog.debug("Reference graph: cytoscape-popper/tippy bridge registered");