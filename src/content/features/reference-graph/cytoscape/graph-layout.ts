import type cytoscape from "cytoscape";
import type { LayoutGraphPresetName } from "../graph.types";
import { CONST } from "../../../../constants/const";

export function runGraphLayout(
    cy: cytoscape.Core,
    presetName: LayoutGraphPresetName,
    onComplete?: () => void,
): void {
    const preset =
        CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS[presetName];

    const edges = cy.edges();

    if (preset.edgeStyle === "taxi") {
        edges.style({
            "curve-style": "taxi",
            "taxi-direction": "downward",
        });
    } else {
        edges.style({
            "curve-style": "bezier",
            "taxi-direction": "auto",
        });
    }

    const layout = cy.layout(
        preset.build(),
    );

    if (onComplete) {
        layout.one(
            "layoutstop",
            onComplete,
        );
    }

    layout.run();
}