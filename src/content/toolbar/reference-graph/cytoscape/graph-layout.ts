import type cytoscape from "cytoscape";
import type { LayoutGraphPresetName } from "../graph.types";
import { CONST } from "../../../../constants/const";

export function runGraphLayout(
    cy: cytoscape.Core,
    presetName: LayoutGraphPresetName,
): void {
    cy.layout(
        CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS[presetName].build(),
    ).run();
}