// @source-path [fobles] src/content/features/reference-graph/components/node-details-panel.tsx

import { useEffect, useRef, useState } from "react";
import prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing-state";
import { getGraphPresentationState } from "../graph-nodes/graph-presentation-state";

type NodeDetailsPanelProps = {
  selectedTreeNodeId: string | undefined;
  nodesById: Map<string, ReferenceModelNode>;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onClose?: () => void;
};

type DetailRow = [string, string];

type DiagnosticReferenceModelNode = Omit<
  ReferenceModelNode,
  "children" | "provenance" | "scItem"
> & {
  scItem?: object;
  children: string;
  provenance: string;
  childCount: number;
};

function itemDetailRows(
  treeNode: Extract<ReferenceModelNode, { nodeType: "item" }>,
): DetailRow[] {
  const rows: DetailRow[] = [["Kind", getGraphPresentationState(treeNode).kind]];

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

function provenanceDetailRows(
  treeNode: ReferenceModelNode,
): DetailRow[] {
  const provenance = treeNode.provenance;
  let rows: DetailRow[] = [];

  if (provenance.type === "section") {
    rows = [["Section", provenance.section.name]];
  } else if (provenance.type === "section-field") {
    rows = [
      ["Field Name", provenance.fieldName],
      ["Field Value", provenance.fieldValue],
    ];
  } else if (provenance.type === "field-reference") {
    rows = [
      ["Section", provenance.sectionName],
      ["Field Name", provenance.fieldName],
      ["Confidence", provenance.confidence],
      ["Strategy", provenance.strategy ?? ""],
      ["Source Value", provenance.sourceValue],
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
      [
        "Placeholder",
        provenance.control.placeholder ?? "(no placeholder)",
      ],
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
  treeNode: ReferenceModelNode,
): string | undefined {
  const provenance = treeNode.provenance;
  let rawSource: string | undefined;

  if (provenance.type === "sitecore-item") {
    rawSource = provenance.rawData
      ? JSON.stringify(provenance.rawData, null, 2)
      : provenance.item.scItemId ??
        provenance.item.scItemPath;
  } else if (provenance.type === "section-field") {
    rawSource =
      provenance.field.rawMarkup ??
      provenance.fieldValue;
  } else if (provenance.type === "field-reference") {
    rawSource = provenance.sourceValue;
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

function resolveItemRawMarkup(
  treeNode: ReferenceModelNode,
): string | undefined {
  let rawMarkup: string | undefined;

  if (treeNode.nodeType === "item") {
    rawMarkup = treeNode.scItem.rawMarkup;
  }

  return rawMarkup;
}

async function prettifyHtml(
  source: string,
): Promise<string> {
  const formatted = await prettier.format(source, {
    parser: "html",
    plugins: [prettierPluginHtml],
    printWidth: 120,
  });

  return formatted.trim();
}

async function prettifyRawSource(
  source: string,
): Promise<string> {
  let formatted = source;

  if (source.trimStart().startsWith("<")) {
    formatted = await prettifyHtml(source);
  }

  return formatted;
}

function buildDiagnosticTreeNode(
  treeNode: ReferenceModelNode,
): DiagnosticReferenceModelNode {
  const {
    children,
    provenance: _provenance,
    ...node
  } = treeNode;

  let diagnosticNode: DiagnosticReferenceModelNode;

  if (treeNode.nodeType === "item") {
    const {
      rawMarkup,
      ...scItem
    } = treeNode.scItem;

    diagnosticNode = {
      ...node,
      scItem: {
        ...scItem,
        rawMarkup: rawMarkup
          ? "[omitted from diagnostic view; see Item Raw Markup below]"
          : undefined,
      },
      children:
        `[omitted from diagnostic view; ${children.length} child node(s)]`,
      provenance:
        "[omitted from diagnostic view; see Raw Source below]",
      childCount: children.length,
    };
  } else {
    diagnosticNode = {
      ...node,
      children:
        `[omitted from diagnostic view; ${children.length} child node(s)]`,
      provenance:
        "[omitted from diagnostic view; see Raw Source below]",
      childCount: children.length,
    };
  }

  return diagnosticNode;
}

function buildClipboardText(
  treeNode: DiagnosticReferenceModelNode,
  rawSource: string | undefined,
  itemRawMarkup: string | undefined,
): string {
  return [
    "Reference Model Node",
    JSON.stringify(treeNode, null, 2),
    "",
    "Raw Source",
    rawSource ?? "",
    "",
    "Item Raw Markup",
    itemRawMarkup ?? "",
  ].join("\n");
}

export function NodeDetailsPanel({
  selectedTreeNodeId,
  nodesById,
  processingStateByTreeNodeId,
  onClose,
}: NodeDetailsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const treeNode = selectedTreeNodeId
    ? nodesById.get(selectedTreeNodeId)
    : undefined;

  const [copied, setCopied] = useState(false);
  const [formattedRawSource, setFormattedRawSource] =
    useState<string | undefined>(undefined);
  const [formattedItemRawMarkup, setFormattedItemRawMarkup] =
    useState<string | undefined>(undefined);

  const rawSource = treeNode
    ? resolveRawSource(treeNode)
    : undefined;

  const itemRawMarkup = treeNode
    ? resolveItemRawMarkup(treeNode)
    : undefined;

  useEffect((): (() => void) => {
    let disposed = false;

    setFormattedRawSource(rawSource);
    setFormattedItemRawMarkup(itemRawMarkup);

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

    if (itemRawMarkup) {
      void prettifyHtml(itemRawMarkup)
        .then((formatted): void => {
          if (!disposed) {
            setFormattedItemRawMarkup(formatted);
          }
        })
        .catch((): void => {
          if (!disposed) {
            setFormattedItemRawMarkup(itemRawMarkup);
          }
        });
    }

    return (): void => {
      disposed = true;
    };
  }, [
    rawSource,
    itemRawMarkup,
  ]);

  useEffect(() => {
    if (!treeNode || !onClose) return;

    const ownerDocument = panelRef.current?.ownerDocument;
    if (!ownerDocument) return;
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof ownerDocument.defaultView!.Node && !panelRef.current?.contains(target)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    ownerDocument.addEventListener("keydown", handleKeyDown, true);
    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
      ownerDocument.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [treeNode, onClose]);

  if (!treeNode) {
    return null;
  }

  const rows: DetailRow[] =
    treeNode.nodeType === "item"
      ? [
          ...itemDetailRows(treeNode),
      ...(processingStateByTreeNodeId.get(treeNode.treeNodeId) ? [["Processing Status", processingStateByTreeNodeId.get(treeNode.treeNodeId)!] as DetailRow] : []),
          ...provenanceDetailRows(treeNode),
        ]
      : [
          ["Kind", getGraphPresentationState(treeNode).kind],
          ["Name", treeNode.name],
          ...provenanceDetailRows(treeNode),
        ];

  const diagnosticTreeNode =
    buildDiagnosticTreeNode(treeNode);

  const handleCopy = (): void => {
    void navigator.clipboard
      .writeText(
        buildClipboardText(
          diagnosticTreeNode,
          formattedRawSource,
          formattedItemRawMarkup,
        ),
      )
      .then(() => {
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1500);
      });
  };

  return (
    <div ref={panelRef} className="fobles-reference-graph-node-details">
      <div className="fobles-reference-graph-node-details-header">
        <strong>Node Details</strong>
        {onClose ? <button type="button" className="fobles-reference-graph-node-details-close" onClick={onClose} aria-label="Close node details">×</button> : null}

        <button
          type="button"
          className={
            "fobles-reference-graph-button " +
            "fobles-reference-graph-node-details-copy"
          }
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {rows.map(([label, value]) => (
        <div
          key={label}
          className="fobles-reference-graph-node-details-row"
        >
          <strong>{label}: </strong>
          <span>{value}</span>
        </div>
      ))}

      <details open>
        <summary>Reference Model Node</summary>
        <pre>
          {JSON.stringify(
            diagnosticTreeNode,
            null,
            2,
          )}
        </pre>
      </details>

      {formattedRawSource && (
        <details open>
          <summary>Raw Source</summary>
          <pre>{formattedRawSource}</pre>
        </details>
      )}

      {formattedItemRawMarkup && (
        <details open>
          <summary>Item Raw Markup</summary>
          <pre>{formattedItemRawMarkup}</pre>
        </details>
      )}
    </div>
  );
}