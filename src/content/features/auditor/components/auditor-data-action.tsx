// @source-path [fobles] src/content/features/auditor/components/auditor-data-action.tsx

export type AuditorDataActionProps = { onClick: () => void };

export function AuditorDataAction({ onClick }: AuditorDataActionProps) {
  return (
    <button
      type="button"
      className="fobles-auditor-data-action"
      title="View data"
      aria-label="View data"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span aria-hidden="true">▤</span>
    </button>
  );
}
