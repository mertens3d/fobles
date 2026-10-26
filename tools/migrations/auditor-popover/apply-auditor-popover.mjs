import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dialogPath = resolve(root, "src/content/features/auditor/components/auditor-dialog.tsx");
const graphHelpPath = resolve(root, "src/content/features/reference-graph/components/graph-help-dialog.tsx");
const extensionScssPath = resolve(root, "src/content/styles/fobles-extension.scss");

async function replaceRequired(path, before, after, label) {
  const source = await readFile(path, "utf8");
  if (!source.includes(before)) throw new Error(`${label} current source was not recognized: ${path}`);
  await writeFile(path, source.replace(before, after), "utf8");
}

await replaceRequired(
  dialogPath,
  'import { createDialogCloseButton } from "../../../shared/dialog/dialog-close-button";',
  'import { createDialogCloseButton } from "../../../shared/dialog/dialog-close-button";\nimport { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";',
  "Auditor shared dialog control import",
);

await replaceRequired(
  dialogPath,
  '      <div className={`fobles-auditor-workspace${selectedTreeNodeId ? " fobles-auditor-workspace--details" : ""}`}>',
  '      <div className="fobles-auditor-workspace">',
  "Auditor workspace class",
);

await replaceRequired(
  dialogPath,
  `        {selectedTreeNodeId && model ? (
          <aside className="fobles-auditor-workspace-details">
            <NodeDetailsPanel
              selectedTreeNodeId={selectedTreeNodeId}
              nodesById={model.nodesById}
              processingStateByTreeNodeId={model.processingStateByTreeNodeId}
              onClose={() => setSelectedTreeNodeId(undefined)}
            />
          </aside>
        ) : null}`,
  `        {selectedTreeNodeId && model ? (
          <aside className="fobles-auditor-workspace-details">
            <NodeDetailsPanel
              selectedTreeNodeId={selectedTreeNodeId}
              nodesById={model.nodesById}
              processingStateByTreeNodeId={model.processingStateByTreeNodeId}
              onClose={() => setSelectedTreeNodeId(undefined)}
            />
          </aside>
        ) : null}`,
  "Auditor details popover",
);

await replaceRequired(
  dialogPath,
  `            <button
              type="button"
              className="fobles-auditor-help-close"
              onClick={() => setShowHelp(false)}
            >
              ×
            </button>`,
  `            <DialogIconButton
              kind="close"
              label="Close Auditor help"
              onClick={() => setShowHelp(false)}
              className="fobles-auditor-help-close"
            />`,
  "Auditor help close control",
);

await replaceRequired(
  dialogPath,
  `      <AuditorToolbar`,
  `      <DialogIconButton
        kind="help"
        label="Auditor help"
        onClick={() => setShowHelp(true)}
        className="fobles-auditor-help-trigger"
      />
      <AuditorToolbar`,
  "Auditor help trigger",
);

await replaceRequired(
  dialogPath,
  '        onHelp={() => setShowHelp(true)}\n',
  '',
  "Auditor toolbar help removal",
);

await replaceRequired(
  dialogPath,
  '<div><dt>Ctrl/Cmd + click</dt><dd>Apply the same state to every node in that semantic category.</dd></div>',
  '<div><dt>Ctrl/Cmd + double-click row</dt><dd>Apply the same state to every node in that semantic category.</dd></div>',
  "Auditor help shortcut",
);

await replaceRequired(
  dialogPath,
  '<div><dt>View Data</dt><dd>Open details in the right half. Escape, Close, or click-away dismisses it.</dd></div>',
  '<div><dt>View Data</dt><dd>Open a right-side details popover without resizing the audit table.</dd></div>',
  "Auditor details help",
);

await replaceRequired(
  graphHelpPath,
  'import { useRef, type ReactNode } from "react";',
  'import { useRef, type ReactNode } from "react";\nimport { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";',
  "Graph shared dialog control import",
);

await replaceRequired(
  graphHelpPath,
  `        <button
          type="button"
          className="fobles-reference-graph-help-close"
          aria-label="Close graph help"
          title="Close"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>`,
  `        <DialogIconButton
          kind="close"
          label="Close graph help"
          onClick={() => dialogRef.current?.close()}
          className="fobles-reference-graph-help-close"
        />`,
  "Graph help close control",
);

const extensionScss = await readFile(extensionScssPath, "utf8");
if (!extensionScss.includes('@use "auditor-popover";')) {
  await writeFile(extensionScssPath, `${extensionScss.trimEnd()}\n@use "auditor-popover";\n`, "utf8");
}
