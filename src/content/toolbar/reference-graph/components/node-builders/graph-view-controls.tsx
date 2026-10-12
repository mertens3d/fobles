import type cytoscape from "cytoscape";

type GraphViewControlsProps = {
    cy: cytoscape.Core | undefined;
};

export function GraphViewControls({
    cy,
}: GraphViewControlsProps) {
    return (
        <fieldset>
            <legend>View</legend>

            <button
                type="button"
                disabled={!cy}
                onClick={() => cy?.fit(undefined, 40)}
            >
                Recenter
            </button>

        </fieldset>
    );
}