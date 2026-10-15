import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";

type TreeDataViewerProps = {
  data: SitecoreHarvestResult;
  onClose: () => void;
};

export function TreeDataViewer({
  data, onClose,
}: TreeDataViewerProps) {
  return (
    <div className="fobles-tree-data-viewer">
      <button type="button" onClick={onClose}>
        Close
      </button>

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
