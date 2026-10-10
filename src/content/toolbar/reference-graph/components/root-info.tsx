// @source-path [fobles] src/content/toolbar/reference-graph/components/root-info.tsx

import type { ReferenceGraphResult } from "../reference-graph.types";

type RootInfoProps = { graph: ReferenceGraphResult };
export function RootInfo({ graph }: RootInfoProps) {
  const rows = [
    ["Name", graph.rootItem.name],
    ["GUID", graph.rootItem.itemId],
    ["Path", graph.rootItem.path],
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