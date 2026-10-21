// @source-path [fobles] src/content/features/reference-graph/components/interaction-legend.tsx

export function InteractionLegend() {
  return (
    <div className="fobles-reference-graph-interaction-legend">
      {
        "Click: tooltip\nDouble-click: go to node\nCtrl/Cmd+click: open in new tab\nRight-click: Zoom In\nCtrl-Right-click: Zoom Out"
      }
    </div>
  );
}
