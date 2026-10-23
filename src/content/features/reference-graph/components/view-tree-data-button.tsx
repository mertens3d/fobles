// @source-path [Fobles] src/content/features/reference-graph/components/view-tree-data-button.tsx
export type ViewTreeDataButtonProps = {
  onViewTreeData: () => void;
};
export function ViewTreeDataButton({
  onViewTreeData: onViewData,
}: ViewTreeDataButtonProps) {
  return (
    <button
      type="button"
      className="fobles-reference-graph-button fobles-reference-graph-view-tree-data"
      style={{ width: "100%" }}
      onClick={onViewData}
    >
      {"View Tree Data"}
    </button>
  );
}
