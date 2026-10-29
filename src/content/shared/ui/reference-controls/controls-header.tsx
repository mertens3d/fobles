// @source-path [fobles] src/content/shared/ui/reference-controls/controls-header.tsx

export type ControlsHeaderProps = {
  title: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onHelp?: () => void;
  helpLabel?: string;
  disabled?: boolean;
};

export function ControlsHeader({ title, expanded, onExpandedChange, onHelp, helpLabel = "Help", disabled }: ControlsHeaderProps) {
  return (
    <div className="fobles-reference-graph-controls-heading-row">
      <button type="button" className="fobles-reference-graph-controls-expander" disabled={disabled} onClick={() => onExpandedChange(!expanded)}>{title}</button>
      {onHelp ? <button type="button" className="fobles-reference-graph-help-button" aria-label={helpLabel} title={helpLabel} onClick={onHelp}>?</button> : null}
    </div>
  );
}
