// @source-path [fobles] src/content/features/reference-graph/components/graph-view-controls.tsx

import type cytoscape from "cytoscape";

type GraphViewControlsProps = { cy: cytoscape.Core | undefined; rootItemId: string; onRelayout: () => void };
const VIEWPORT_PADDING = 60;

export function GraphViewControls({ cy, rootItemId, onRelayout }: GraphViewControlsProps) {
  return (
    <>
      <button className="fobles-reference-graph-button" type="button" onClick={() => cy?.fit(undefined, VIEWPORT_PADDING)}>Fit Graph</button>
      <button className="fobles-reference-graph-button" type="button" onClick={() => {
        const rootItem = cy?.getElementById(rootItemId);
        if (rootItem?.nonempty()) cy?.fit(rootItem, VIEWPORT_PADDING);
      }}>Center Item</button>
      <button className="fobles-reference-graph-button" type="button" onClick={onRelayout}>Re-layout</button>
    </>
  );
}
