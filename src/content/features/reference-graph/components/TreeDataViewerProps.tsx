import { ICONS } from "../../../../constants/fobles.constants";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";

type TreeDataViewerProps = {
  data: ReferenceModelNode;
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