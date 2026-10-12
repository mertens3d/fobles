import type cytoscape from "cytoscape";
import { REFERENCE_GRAPH } from "../../../../constants/graph.const";
import type { LayoutGraphPresetName } from "../graph.types";

export function runGraphLayout(
    cy: cytoscape.Core,
    presetName: LayoutGraphPresetName,
): void {
    cy.layout(
        REFERENCE_GRAPH.LAYOUT_PRESETS[presetName].build(),
    ).run();
}