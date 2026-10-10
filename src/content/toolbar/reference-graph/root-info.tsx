import type { ReferenceGraphResult } from "./reference-graph.types";

let rootInfoElem: HTMLDivElement | null = null;

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

export function buildRootInfo(doc: Document, graph: ReferenceGraphResult) {
  // The current root's own Name/GUID/Path, shown here instead of as a tooltip on its node - it's
  // the one piece of info visible without clicking anything.
  rootInfoElem = doc.createElement("div");
  rootInfoElem.style.cssText = "font-size:11px;color:#203047;line-height:1.5;max-width:220px;word-break:break-word;";

  updateRootInfo(graph, rootInfoElem, doc);
  return rootInfoElem;
}

export function updateRootInfo(rootGraph: ReferenceGraphResult, rootInfo: HTMLDivElement, doc: Document): void {
  rootInfo.replaceChildren();
  const rows: Array<[string, string | undefined]> = [
    ["Name", rootGraph.rootItem.name ?? undefined],
    ["GUID", rootGraph.rootItem.itemId],
    ["Path", rootGraph.rootItem.path ?? undefined],
  ];
  rows
    .filter((row): row is [string, string] => row[1] !== undefined)
    .forEach(([label, value]) => {
      const row = doc.createElement("div");
      const strong = doc.createElement("strong");
      strong.textContent = `${label}: `;
      row.append(strong, doc.createTextNode(value));
      rootInfo.appendChild(row);
    });
}
