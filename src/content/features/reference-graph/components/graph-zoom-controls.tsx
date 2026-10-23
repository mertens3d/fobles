// @source-path [fobles] src/content/features/reference-graph/components/graph-zoom-controls.tsx

type GraphZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitGraph: () => void;
  onCenterRoot: () => void;
};

function FitGraphIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CenterRootIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function GraphZoomControls({ onZoomIn, onZoomOut, onFitGraph, onCenterRoot }: GraphZoomControlsProps) {
  return (
    <div className="fobles-reference-graph-zoom-controls">
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>+</button>
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>−</button>
      <button type="button" title="Fit graph" aria-label="Fit graph" onClick={onFitGraph}><FitGraphIcon /></button>
      <button type="button" title="Center root item" aria-label="Center root item" onClick={onCenterRoot}><CenterRootIcon /></button>
    </div>
  );
}
