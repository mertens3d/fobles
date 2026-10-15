import { ICONS } from "../../../../constants/fobles.constants";
import type { DataTreeNode } from "../data-tree/data-tree.types";

type TreeDataViewerProps = {
  data: DataTreeNode;
  onClose: () => void;
};

export function TreeDataViewer({
  data,
  onClose,
}: TreeDataViewerProps) {
  return (
    <div className="fobles-tree-data-viewer">
      <button
        type="button"
        className="fobles-tree-data-viewer-close"
        title="Close"
        aria-label="Close"
        onClick={onClose}
      >
        <img
          className="fobles-tree-data-viewer-close-icon"
          src={ICONS.CLOSE}
          alt=""
        />
      </button>

      <div className="scroller">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}