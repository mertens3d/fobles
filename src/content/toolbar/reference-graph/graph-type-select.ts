import { CONST } from "../../../constants/const";
import { setReferenceGraphLayout } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import type { LayoutGraphPresetName } from "./graph.types";


let layoutSelect: HTMLSelectElement;

export function createGraphTypeSelect(doc: Document) {
  layoutSelect = doc.createElement("select");
  layoutSelect.style.cssText =
      "width:170px;font-size:12px;padding:4px 6px;border-radius:4px;border:1px solid #2f6fed;color:#203047;";
    Object.entries(CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS).forEach(([value, preset]) => {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = preset.label;
      const layoutGraphPresetName = value as LayoutGraphPresetName;
      option.selected = layoutGraphPresetName === CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET.LayoutPresetName;
      layoutSelect.appendChild(option);
    });
  attachListener(layoutSelect);
  return layoutSelect;
}

export function getCurrentSelectLayout(): LayoutGraphPresetName {
   return layoutSelect.value as LayoutGraphPresetName;
}

function attachListener(select: HTMLSelectElement){
    select.addEventListener("change", () => {
        const layoutPresetName = select.value as LayoutGraphPresetName;
        const preset = CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS[layoutPresetName];
        extensionLog.debug("Reference graph: layout changed", { layout: layoutPresetName });
        cy.layout(preset.build()).run();
        const layoutGraphPresetName = select.value as LayoutGraphPresetName;
        void setReferenceGraphLayout(layoutGraphPresetName);
      });
}