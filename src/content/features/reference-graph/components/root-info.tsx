// @source-path [fobles] src/content/features/reference-graph/components/root-info.tsx

import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";

type RootInfoProps = { graph: SitecoreHarvestResult };
export function RootInfo({ graph }: RootInfoProps) {
  const rows = [
    ["Name", graph.rootItem.scItemName],
    ["GUID", graph.rootItem.scItemId],
    ["Path", graph.rootItem.scItemPath],
  ].filter((row): row is [string, string] => row[1] !== undefined);
  return (
    <div style={{ fontSize: 11, color: "#203047", lineHeight: 1.5, maxWidth: 220, wordBreak: "break-word" }}>
      {" "}
      {rows.map(([label, value]) => (
        <div key={label}>
          {" "}
          <strong>{label}: </strong> {value}{" "}
        </div>
      ))}{" "}
    </div>
  );
}