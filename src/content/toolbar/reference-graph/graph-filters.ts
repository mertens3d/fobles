import { CONST } from "../../../constants/const";
import { getReferenceGraphFilters, setReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import type { LayoutGraphPresetName, ReferenceGraphFiltersState } from "./graph.types";

let filterCheckboxes: {
  key: string;
  label: string;
  checkbox: HTMLInputElement;
  className: string; // where does this get populated from?
}[] = [];

export function applyFilters(): void {
  filterCheckboxes.forEach(({ className, checkbox }) => {
    cy.elements(`.${className}`).style("display", checkbox.checked ? "element" : "none");
  });
}
export function applyFilterSettings(): void {
  // Apply previously-saved filter checkboxes once they load, same non-blocking pattern as the
  // layout preference below.
  void getReferenceGraphFilters().then((filters: ReferenceGraphFiltersState) => {
    filterCheckboxes.forEach(({ key, checkbox }) => {
      checkbox.checked = filters[key];
    });
    applyFilters();
  });
}

export type checkboxAndLabel = {
  checkbox: HTMLInputElement;
  label: HTMLLabelElement;
};
export function makeCheckBox(doc: Document, filterDef: { label: string }): checkboxAndLabel {
 const label = doc.createElement("label");
    label.style.cssText = "display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:#203047;";
    const checkbox = doc.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    label.append(checkbox, doc.createTextNode(filterDef.label));

    return { checkbox, label };
}

export function attachFilterEventListeners(): void {
  filterCheckboxes.forEach(({ key, checkbox }) => {
    checkbox.addEventListener("change", () => {
      applyFilters();
      const layoutGraphPresetName = layoutSelect.value as LayoutGraphPresetName;
      cy.layout(CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS[layoutGraphPresetName].build()).run();
      void getReferenceGraphFilters().then((filters) => {
        void setReferenceGraphFilters({ ...filters, [key]: checkbox.checked });
      });
    });
  });
}

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: ReferenceGraphFiltersState = {
  parent: true,
  children: true,
  layout: true,
  referrers: true,
  sections: true,
  template: true,
};