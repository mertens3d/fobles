// @source-path [fobles] src/content/features/reference-graph/components/graph-zoom-controls.tsx

type GraphZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function GraphZoomControls({ onZoomIn, onZoomOut }: GraphZoomControlsProps) {
  return (
    <div className="fobles-reference-graph-zoom-controls">
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>+</button>
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>−</button>
    </div>
  );
}