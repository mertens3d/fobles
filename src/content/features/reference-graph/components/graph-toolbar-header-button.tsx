
export function GraphToolBarHeaderButton({ controlsExpanded, onControlsExpandedChange }: { controlsExpanded: boolean; onControlsExpandedChange: (expanded: boolean) => void; }) {
  return (<button
    type="button"
    className="fobles-reference-graph-controls-header"
    aria-expanded={controlsExpanded}
    onClick={() => onControlsExpandedChange(!controlsExpanded)}
  >
    Graph Controls
  </button>);
}
