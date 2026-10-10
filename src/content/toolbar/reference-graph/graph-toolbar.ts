import { buildBackButton } from "./back-button";
import { createGraphTypeSelect } from "./graph-type-select";
import type { ReferenceGraphResult } from "./reference-graph.types";
import { buildRootInfo } from "./root-info";



export function createToolbar(doc: Document, renderGraph: (newGraph: ReferenceGraphResult) => void): HTMLDivElement {
  // One panel holding the layout picker + Back (top row) and the filter checkboxes (second row),
  // instead of several separately-positioned/styled floating controls.
  const toolbar = doc.createElement("div");
  toolbar.style.cssText =
    "position:absolute;top:10px;left:10px;z-index:1;display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.92);padding:8px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-family:sans-serif;";

  const toolbarTopRow = buildTopRow(doc);
  const rootInfo = buildRootInfo(doc, graph);
  const interactionLegend = buildInteractionLegend(doc);
  toolbar.append(toolbarTopRow, rootInfo, filterRow, interactionLegend);

  return toolbar;
}

function buildTopRow(doc: Document) {
  const toolbarTopRow = doc.createElement("div");
  toolbarTopRow.style.cssText = "display:flex;flex-direction:column;gap:6px;";
  const backButton = buildBackButton(doc);
  const layoutSelect = createGraphTypeSelect(doc);
  toolbarTopRow.append(layoutSelect, backButton);
  return toolbarTopRow;
}

export function createCloseButton(doc: Document, dialog: HTMLDialogElement) {
  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.className = "fobles-reference-graph-button fobles-reference-graph-button--close";
  closeButton.style.cssText = "position:absolute;top:10px;right:10px;z-index:1;";
  closeButton.addEventListener("click", () => dialog.close());
  return closeButton;
}

export function buildInteractionLegend(doc: Document) {
  // Explains the click/double-click/ctrl-click split below, since none of it is otherwise
  // discoverable from the graph itself.
  const interactionLegend = doc.createElement("div");
  interactionLegend.style.cssText =
    "font-size:10px;color:#5a6b80;line-height:1.5;border-top:1px solid #d7e0ea;padding-top:6px;";
  interactionLegend.innerHTML =
    "Click: tooltip<br>Double-click: go to node<br>Ctrl/Cmd+click: open in new tab";
  return interactionLegend;
}




