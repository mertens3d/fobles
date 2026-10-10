// @source-path [fobles] src/content/toolbar/reference-graph/back-button.tsx

type BackButtonProps = { disabled: boolean; onBack: () => void };

export function BackButton({ disabled, onBack }: BackButtonProps) {
  return (
    <button type="button" className="fobles-reference-graph-button" style={{ width: 170 }} disabled={disabled} onClick={onBack}>
      {" "}
      {"< Back"}{" "}
    </button>
  );
}