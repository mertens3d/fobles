import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dialogPath = resolve(root, "src/content/features/auditor/components/auditor-dialog.tsx");
const gridPath = resolve(root, "src/content/features/auditor/components/auditor-grid.tsx");
const extensionScssPath = resolve(root, "src/content/styles/fobles-extension.scss");

async function update(path, transform) {
  const source = await readFile(path, "utf8");
  const result = transform(source);
  if (result !== source) await writeFile(path, result, "utf8");
}

await update(dialogPath, (source) => {
  const importLine = 'import { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";';
  const lines = source.split(/\r?\n/);
  let importSeen = false;
  const deduplicated = lines.filter((line) => {
    if (line !== importLine) return true;
    if (importSeen) return false;
    importSeen = true;
    return true;
  });
  if (!importSeen) {
    const anchor = deduplicated.findIndex((line) => line.includes('createDialogCloseButton'));
    if (anchor < 0) throw new Error("Auditor dialog close import was not found.");
    deduplicated.splice(anchor + 1, 0, importLine);
  }
  let result = deduplicated.join("\n");
  if (!result.includes("onHelp={() => setShowHelp(true)}")) {
    const marker = '        onViewReferenceModel={() =>\n          setViewReferenceModel(true)\n        }';
    if (!result.includes(marker)) throw new Error("Auditor toolbar View Reference Model prop was not found.");
    result = result.replace(marker, `${marker}\n        onHelp={() => setShowHelp(true)}`);
  }
  return result;
});

await update(gridPath, (source) => {
  const oldLine = 'function handleRowDoubleClick(event: RowDoubleClickedEvent<AuditorTreeRow>): void { const target = event.event?.target; if (target instanceof Element && target.closest("button, a, input, select, textarea")) return; if (event.data) toggle(event.data, event.event ?? undefined); }';
  const newLine = `function handleRowDoubleClick(event: RowDoubleClickedEvent<AuditorTreeRow>): void {
    const target = event.event?.target;
    if (target instanceof Element && target.closest("button, a, input, select, textarea")) return;
    if (!event.data) return;
    const mouseEvent = event.event instanceof MouseEvent ? event.event : undefined;
    toggle(event.data, mouseEvent);
  }`;
  if (source.includes(oldLine)) return source.replace(oldLine, newLine);
  if (source.includes("toggle(event.data, event.event ?? undefined)")) {
    return source.replace("toggle(event.data, event.event ?? undefined)", "toggle(event.data, event.event instanceof MouseEvent ? event.event : undefined)");
  }
  return source;
});

await update(extensionScssPath, (source) => source.includes('@use "auditor-popover";') ? source : `${source.trimEnd()}\n@use "auditor-popover";\n`);

console.log("Auditor popover partial-application repair completed.");
