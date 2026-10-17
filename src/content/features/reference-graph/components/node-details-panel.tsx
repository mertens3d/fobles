// @source-path [fobles] src/content/features/reference-graph/components/node-details-panel.tsx

import { useEffect, useState } from "react";
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
  const rows: DetailRow[] = [["Kind", treeNode.kind]];

  if (treeNode.scItem.scItemName) {
    rows.push(["Name", treeNode.scItem.scItemName]);
  }

  if (treeNode.scItem.scItemId) {
    rows.push(["Item ID", treeNode.scItem.scItemId]);
  }

  if (treeNode.scItem.scItemPath) {
    rows.push(["Path", treeNode.scItem.scItemPath]);
  }

  if (treeNode.scItem.scTemplate?.scItemName) {
    rows.push(["Template", treeNode.scItem.scTemplate.scItemName]);
  }

  return rows;
}

function provenanceDetailRows(treeNode: DataTreeNode): DetailRow[] {
  const provenance = treeNode.provenance;
  let rows: DetailRow[] = [];

  if (provenance.type === "section") {
    rows = [["Section", provenance.section.name]];
  } else if (provenance.type === "section-field") {
    rows = [
      ["Field Name", provenance.fieldName],
      ["Field Value", provenance.fieldValue],
    ];
  } else if (provenance.type === "layout-device") {
    rows = [[
      "Device",
      provenance.device.scDeviceItem.scItemName ??
        provenance.device.scDeviceItem.scItemId ??
        "",
    ]];
  } else if (provenance.type === "rendering-control") {
    rows = [
      ["Placeholder", provenance.control.placeholder ?? "(no placeholder)"],
      ["Rendering UID", provenance.control.uid ?? ""],
    ];
  } else if (provenance.type === "rendering-parameter") {
    rows = [
      ["Parameter Name", provenance.parameterName],
      ["Parameter Value", provenance.parameterValue],
      ["Decoded Value", provenance.decodedValue],
    ];
  } else if (provenance.type === "placeholder") {
    rows = [["Placeholder Path", provenance.placeholderPath]];
  } else if (provenance.type === "layout-xml") {
    rows = [["Layout", provenance.label]];
  } else if (provenance.type === "synthetic") {
    rows = [["Synthetic", provenance.label]];
  }

  return rows.filter(([, value]) => Boolean(value));
}

function resolveRawSource(
  treeNode: DataTreeNode,
): string | undefined {
  const provenance = treeNode.provenance;
  let rawSource: string | undefined;

  if (provenance.type === "sitecore-item") {
    rawSource = provenance.rawData
      ? JSON.stringify(provenance.rawData, null, 2)
      : provenance.item.rawMarkup ??
        provenance.item.scItemId ??
        provenance.item.scItemPath;
  } else if (provenance.type === "section-field") {
    rawSource =
      provenance.field.rawMarkup ??
      provenance.fieldValue;
  } else if (provenance.type === "layout-device") {
    rawSource = JSON.stringify(
      provenance.device.rawData,
      null,
      2,
    );
  } else if (provenance.type === "rendering-control") {
    rawSource = JSON.stringify(
      provenance.control.rawData,
      null,
      2,
    );
  } else if (provenance.type === "rendering-parameter") {
    rawSource = JSON.stringify(
      provenance.rawData,
      null,
      2,
    );
  } else if (provenance.type === "placeholder") {
    rawSource = JSON.stringify(
      provenance.rawData,
      null,
      2,
    );
  } else if (provenance.type === "layout-xml") {
    rawSource = provenance.rawMarkup;
  }

  return rawSource;
}

async function prettifyRawSource(
  source: string,
): Promise<string> {
  let formatted = source;

  if (source.trimStart().startsWith("<")) {
    formatted = await prettier.format(source, {
      parser: "html",
      plugins: [prettierPluginHtml],
      printWidth: 120,
    });

    formatted = formatted.trim();
  }

  return formatted;
}

export function NodeDetailsPanel({
  selectedTreeNodeId,
  nodesById,
}: NodeDetailsPanelProps) {
  const treeNode = selectedTreeNodeId
    ? nodesById.get(selectedTreeNodeId)
    : undefined;

  const [formattedRawSource, setFormattedRawSource] =
    useState<string | undefined>(undefined);

  const rawSource = treeNode
    ? resolveRawSource(treeNode)
    : undefined;

  useEffect((): (() => void) => {
    let disposed = false;

    setFormattedRawSource(rawSource);

    if (rawSource) {
      void prettifyRawSource(rawSource)
        .then((formatted): void => {
          if (!disposed) {
            setFormattedRawSource(formatted);
          }
        })
        .catch((): void => {
          if (!disposed) {
            setFormattedRawSource(rawSource);
          }
        });
    }

    return (): void => {
      disposed = true;
    };
  }, [rawSource]);

  if (!treeNode) {
    return null;
  }

  const rows: DetailRow[] =
    treeNode.nodeType === "item"
      ? [...itemDetailRows(treeNode), ...provenanceDetailRows(treeNode)]
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
        <div key={label} style={{ marginBottom: 4, wordBreak: "break-word" }}>
          <strong>{label}: </strong>
          <span>{value}</span>
        </div>
      ))}

      {formattedRawSource && (
        <details>
          <summary style={{ cursor: "pointer" }}>Raw Source</summary>
          <pre
            style={{
              whiteSpace: "pre",
              fontSize: 10,
              maxHeight: 160,
              overflow: "auto",
            }}
          >
            {formattedRawSource}
          </pre>
        </details>
      )}
    </div>
  );
}