// @source-path [fobles] src/content/shared/ui/reference-controls/view-reference-model-button.tsx

export type ViewReferenceModelButtonProps = {
  onViewReferenceModel: () => void;
  className?: string;
};

const BASE_CLASS = "fobles-view-reference-model-button";

// Shared by Reference Graph and Auditor - callers compose their own layout class alongside the
// shared base class rather than forking the button implementation.
export function ViewReferenceModelButton({ onViewReferenceModel, className }: ViewReferenceModelButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${BASE_CLASS} ${className}` : BASE_CLASS}
      onClick={onViewReferenceModel}
    >
      {"View Reference Model"}
    </button>
  );
}
