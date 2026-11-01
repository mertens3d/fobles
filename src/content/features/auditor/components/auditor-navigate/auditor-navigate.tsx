// @source-path [fobles] src/content/features/auditor/components/auditor-navigate/auditor-navigate.tsx

export type AuditorNavigateProps = { onClick: () => void };

export function AuditorNavigate({ onClick }: AuditorNavigateProps) {
  return (
    <button
      type="button"
      className="fobles-auditor-navigate"
      title="Navigate to item in a new tab"
      aria-label="Navigate to item in a new tab"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span aria-hidden="true" />
    </button>
  );
}
