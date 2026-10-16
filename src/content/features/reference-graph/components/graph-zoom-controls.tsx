// @source-path [fobles] src/content/features/reference-graph/components/graph-zoom-controls.tsx

type GraphZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const buttonStyle = {
  width: 36,
  height: 36,
  padding: 0,
  border: 0,
  background: "#ffffff",
  color: "#203047",
  font: "600 22px/36px Arial,sans-serif",
  cursor: "pointer",
} as const;

export function GraphZoomControls({ onZoomIn, onZoomOut }: GraphZoomControlsProps) {
  return (
    <div
      className="fobles-reference-graph-zoom-controls"
      style={{
        position: "absolute",
        right: 16,
        bottom: 16,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid #8a97a8",
        borderRadius: 6,
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        onClick={onZoomIn}
        style={buttonStyle}
      >
        +
      </button>

      <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        onClick={onZoomOut}
        style={{
          ...buttonStyle,
          borderTop: "1px solid #d3d9e2",
        }}
      >
        −
      </button>
    </div>
  );
}