// @source-path [fobles] src/content/shared/ui/reference-controls/controls-header.tsx

export type ControlsHeaderProps = {
  title: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onHelp: () => void;
  helpLabel: string;
  disabled?: boolean;
};

// The collapsible "Controls" header bar with the round help button, shared by Reference Graph and Auditor.
// It deliberately renders Graph's existing class names so both tools get the identical bar and `?` button.
export function ControlsHeader({
  title,
  expanded,
  onExpandedChange,
  onHelp,
  helpLabel,
  disabled,
}: ControlsHeaderProps) {
  return (
    <div className="fobles-reference-graph-controls-heading">
      <button
        type="button"
        className="fobles-reference-graph-controls-header"
        aria-expanded={expanded}
        disabled={disabled}
        onClick={() => onExpandedChange(!expanded)}
      >
        {title}
      </button>
      <button
        type="button"
        className="fobles-reference-graph-help-button"
        title={helpLabel}
        aria-label={helpLabel}
        onClick={onHelp}
      >
        ?
      </button>
    </div>
  );
}
