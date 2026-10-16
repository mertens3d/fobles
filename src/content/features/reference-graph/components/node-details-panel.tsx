// @source-path [fobles] src/content/features/reference-graph/components/node-details-panel.tsx

import {
  useEffect,
  useState,
} from "react";
import prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";
import type { DataTreeNode } from "../data-tree/data-tree.types";

type NodeDetailsPanelProps = {
  selectedTreeNodeId: string | undefined;
  nodesById: Map<string, DataTreeNode>;
};

type DetailRow = [string, string];

function itemDetailRows(
  treeNode: Extract<DataTreeNode, { nodeType: "item" }>,
): DetailRow[] {
  const rows: DetailRow[] = [
    ["Kind", treeNode.kind],
  ];

  if (treeNode.scItem.scItemName) {
    rows.push([
      "Name",
      treeNode.scItem.scItemName,
    ]);
  }

  if (treeNode.scItem.scItemId) {
    rows.push([
      "Item ID",
      treeNode.scItem.scItemId,
    ]);
  }

  if (treeNode.scItem.scItemPath) {
    rows.push([
      "Path",
      treeNode.scItem.scItemPath,
    ]);
  }

  if (treeNode.scItem.scTemplate?.scItemName) {
    rows.push([
      "Template",
      treeNode.scItem.scTemplate.scItemName,
    ]);
  }

  return rows;
}

function provenanceDetailRows(
  treeNode: DataTreeNode,
): DetailRow[] {
  const provenance = treeNode.provenance;
  let rows: DetailRow[] = [];

  if (provenance.type === "section") {
    rows = [
      ["Section", provenance.section.name],
    ];
  } else if (
    provenance.type === "section-field"
  ) {
    rows = [
      ["Field Name", provenance.fieldName],
      ["Field Value", provenance.fieldValue],
    ];
  } else if (
    provenance.type === "layout-device"
  ) {
    rows = [
      [
        "Device",
        provenance.device.scDeviceItem.scItemName ??
          provenance.device.scDeviceItem.scItemId ??
          "",
      ],
    ];
  } else if (
    provenance.type === "rendering-control"
  ) {
    rows = [
      [
        "Placeholder",
        provenance.control.placeholder ??
          "(no placeholder)",
      ],
      [
        "Rendering UID",
        provenance.control.uid ?? "",
      ],
    ];
  } else if (
    provenance.type === "rendering-parameter"
  ) {
    rows = [
      [
        "Parameter Name",
        provenance.parameterName,
      ],
      [
        "Parameter Value",
        provenance.parameterValue,
      ],
      [
        "Decoded Value",
        provenance.decodedValue,
      ],
    ];
  } else if (
    provenance.type === "placeholder"
  ) {
    rows = [
      [
        "Placeholder Path",
        provenance.placeholderPath,
      ],
    ];
  } else if (
    provenance.type === "layout-xml"
  ) {
    rows = [
      ["Layout", provenance.label],
    ];
  } else if (
    provenance.type === "synthetic"
  ) {
    rows = [
      ["Synthetic", provenance.label],
    ];
  }

  return rows.filter(
    ([, value]) => Boolean(value),
  );
}

function resolveRawMarkup(
  treeNode: DataTreeNode,
): string | undefined {
  const provenance = treeNode.provenance;
  let rawMarkup: string | undefined = undefined;

  if (treeNode.nodeType === "item") {
    rawMarkup = treeNode.scItem.rawMarkup;
  } else if (
    provenance.type === "section-field"
  ) {
    rawMarkup = provenance.field.rawMarkup;
  } else if (
    provenance.type === "layout-xml"
  ) {
    rawMarkup = provenance.rawMarkup;
  }

  return rawMarkup;
}

async function prettifyHtml(
  html: string,
): Promise<string> {
  const formatted = await prettier.format(
    html,
    {
      parser: "html",
      plugins: [
        prettierPluginHtml,
      ],
      printWidth: 120,
    },
  );

  return formatted.trim();
}

export function NodeDetailsPanel({
  selectedTreeNodeId,
  nodesById,
}: NodeDetailsPanelProps) {
  const treeNode = selectedTreeNodeId
    ? nodesById.get(selectedTreeNodeId)
    : undefined;

  const [formattedRawMarkup, setFormattedRawMarkup] =
    useState<string | undefined>(undefined);

  const rawMarkup = treeNode
    ? resolveRawMarkup(treeNode)
    : undefined;

  useEffect(
    (): (() => void) => {
      let disposed = false;

      setFormattedRawMarkup(rawMarkup);

      if (rawMarkup) {
        void prettifyHtml(rawMarkup)
          .then(
            (formatted): void => {
              if (!disposed) {
                setFormattedRawMarkup(
                  formatted,
                );
              }
            },
          )
          .catch(
            (): void => {
              if (!disposed) {
                setFormattedRawMarkup(
                  rawMarkup,
                );
              }
            },
          );
      }

      return (): void => {
        disposed = true;
      };
    },
    [rawMarkup],
  );

  if (!treeNode) {
    return null;
  }

  const rows: DetailRow[] =
    treeNode.nodeType === "item"
      ? [
          ...itemDetailRows(treeNode),
          ...provenanceDetailRows(treeNode),
        ]
      : [
          ["Kind", treeNode.kind],
          ["Name", treeNode.name],
          ...provenanceDetailRows(treeNode),
        ];

  return (
    <div
      className="fobles-reference-graph-node-details"
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 50,
        maxWidth: 500,
        maxHeight: "40%",
        overflowY: "auto",
        background: "#203047",
        color: "#fff",
        padding: "8px 10px",
        borderRadius: 4,
        font: "12px/1.6 sans-serif",
      }}
    >
      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            marginBottom: 4,
            wordBreak: "break-word",
          }}
        >
          <strong>{label}: </strong>
          <span>{value}</span>
        </div>
      ))}

      {formattedRawMarkup && (
        <details>
          <summary
            style={{
              cursor: "pointer",
            }}
          >
            Raw Source
          </summary>

          <pre
            style={{
              whiteSpace: "pre",
              fontSize: 10,
              maxHeight: 160,
              overflow: "auto",
            }}
          >
            {formattedRawMarkup}
          </pre>
        </details>
      )}
    </div>
  );
}