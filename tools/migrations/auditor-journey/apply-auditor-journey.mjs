import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../../..");
async function update(relativePath, mutate) { const filePath = path.join(root, relativePath); const source = await fs.readFile(filePath, "utf8"); const result = mutate(source); if (result === source) throw new Error(`No recognized change in ${relativePath}`); await fs.writeFile(filePath, result, "utf8"); }
await update("src/shared/error-dialog.ts", (source) => source.replace(/(const dialog = doc\.createElement\("dialog"\);[\s\S]{0,500}?showFoblesCleanupDialog[\s\S]{0,1000}?)/, (block) => block.includes("fobles-cleanup-dialog") ? block : block.replace(/dialog\.className\s*=\s*(["'`])([^"'`]+)\1/, (_m, quote, classes) => `dialog.className = ${quote}${classes} fobles-cleanup-dialog${quote}`)));
const stylePath = "src/content/styles/_auditor.scss";
await update(stylePath, (source) => source.includes(".fobles-auditor-journey") ? source : source + `
.fobles-auditor-journey { display:inline-flex; align-items:center; justify-content:center; gap:2px; width:100%; }
.fobles-auditor-journey > span { width:9px; height:9px; border:1px solid currentColor; border-radius:2px; background:transparent; }
.fobles-auditor-journey > span.is-complete { background:currentColor; }
.fobles-auditor-journey--referenced { color:#4676c5; }
.fobles-auditor-journey--cached { color:#b17818; }
.fobles-auditor-journey--live { color:#168ca6; }
.fobles-auditor-journey--tested { color:#238b4b; }
.fobles-auditor-journey-legend { display:flex; align-items:center; gap:10px; margin-right:auto; font-size:11px; font-weight:600; user-select:text; }
.fobles-auditor-navigate-cell { padding:0 !important; }
.fobles-auditor-navigate { width:100%; height:100%; border:0; background:transparent; color:transparent; cursor:pointer; font-size:19px; }
.ag-row:hover .fobles-auditor-navigate { color:#2f6fed; }
.fobles-auditor-selectable, .fobles-auditor-selectable * { user-select:text !important; cursor:text; }
.fobles-auditor-tree-toggle, .fobles-auditor-tree-toggle *, .fobles-auditor-navigate, .fobles-auditor-navigate *, .fobles-auditor-grid button { user-select:none !important; cursor:pointer; }
.fobles-cleanup-dialog, .fobles-cleanup-dialog::backdrop { --fobles-dialog-accent:#2f6fed; }
.fobles-cleanup-dialog { border-color:#2f6fed !important; }
.fobles-cleanup-dialog h1, .fobles-cleanup-dialog h2, .fobles-cleanup-dialog [class*="title"] { color:#1f57c3 !important; }
.fobles-cleanup-dialog button { border-color:#1f57c3 !important; background:#2f6fed !important; color:#fff !important; }
`);
console.log("Auditor journey/navigation/selection and cleanup styling applied.");
