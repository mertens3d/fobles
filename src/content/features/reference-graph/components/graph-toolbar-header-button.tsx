type GraphToolBarHeaderButtonProps = { controlsExpanded: boolean; onControlsExpandedChange: (expanded: boolean) => void; onHelp: () => void };

export function GraphToolBarHeaderButton({ controlsExpanded, onControlsExpandedChange, onHelp }: GraphToolBarHeaderButtonProps) {
  return (
    <div className="fobles-reference-graph-controls-heading">
      <button type="button" className="fobles-reference-graph-controls-header" aria-expanded={controlsExpanded} onClick={() => onControlsExpandedChange(!controlsExpanded)}>Graph Controls</button>
      <button type="button" className="fobles-reference-graph-help-button" title="Graph help" aria-label="Graph help" onClick={onHelp}>?</button>
    </div>
  );
}
