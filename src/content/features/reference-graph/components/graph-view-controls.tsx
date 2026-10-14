// @source-path [fobles] src/content/features/reference-graph/components/graph-view-controls.tsx

import type cytoscape from "cytoscape";

type GraphViewControlsProps = {
    cy: cytoscape.Core | undefined;
    onRelayout: () => void;
};

export function GraphViewControls({
    cy,
    onRelayout,
}: GraphViewControlsProps) {
    return (
        <>
            <button
                className="fobles-reference-graph-button"
                style={{ width: "100%" }}
                type="button"
                onClick={() => {
                    cy?.fit(undefined, 40);
                }}
            >
                Recenter
            </button>

            <button
                className="fobles-reference-graph-button"
                style={{ width: "100%" }}
                type="button"
                onClick={onRelayout}
            >
                Re-layout
            </button>
        </>
    );
}
