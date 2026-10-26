import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../../..");
const reportPath = path.join(scriptDirectory, "phase4-ui-report.json");
const changes = [];

async function read(relativePath) { return fs.readFile(path.join(root, relativePath), "utf8"); }
async function write(relativePath, content) { await fs.writeFile(path.join(root, relativePath), content, "utf8"); changes.push(relativePath); }
async function allFiles(directory) {
  const results = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await allFiles(fullPath));
    else results.push(fullPath);
  }
  return results;
}

async function updateAuditorHelp() {
  const relativePath = "src/content/features/auditor/components/auditor-dialog.tsx";
  let source = await read(relativePath);
  const oldBlock = /<h2>Fobles Auditor<\/h2>[\s\S]*?<\/section>/;
  if (!oldBlock.test(source)) throw new Error(`Auditor help content was not found in ${relativePath}`);
  const replacement = `<h2>Fobles Auditor</h2>
            <p>Inspect the Reference Model as a Sitecore-style tree with audit tests attached to the exact relationship or item they evaluate.</p>
            <h3>Tree shortcuts</h3>
            <dl className="fobles-auditor-help-list">
              <div><dt>Click expand glyph</dt><dd>Expand or collapse one node.</dd></div>
              <div><dt>Ctrl/Cmd + click</dt><dd>Apply the same state to every node in that semantic category.</dd></div>
              <div><dt>Shift + click</dt><dd>Expand or collapse the selected subtree.</dd></div>
              <div><dt>Expand All / Collapse All</dt><dd>Show or hide every branch in the current result tree.</dd></div>
              <div><dt>View Data</dt><dd>Open the selected Reference Model node details. Escape, Close, or clicking outside dismisses the panel.</dd></div>
            </dl>
            <h3>Result status</h3>
            <ul className="fobles-auditor-help-key">
              <li><span className="fobles-auditor-status-key fobles-auditor-status-key--passed">✓</span><span><strong>Passed</strong> The check completed successfully.</span></li>
              <li><span className="fobles-auditor-status-key fobles-auditor-status-key--pending">…</span><span><strong>Pending</strong> The required data is still being harvested or resolved.</span></li>
              <li><span className="fobles-auditor-status-key fobles-auditor-status-key--warning">!</span><span><strong>Warning</strong> Review is recommended, but processing completed.</span></li>
              <li><span className="fobles-auditor-status-key fobles-auditor-status-key--error">×</span><span><strong>Error</strong> The check failed or required data could not be resolved.</span></li>
            </ul>
            <h3>Data origin</h3>
            <ul className="fobles-auditor-help-key">
              <li><span className="fobles-auditor-origin--referenced">↗</span><span><strong>Referenced</strong> Discovered from a field, layout, rendering parameter, or other relationship.</span></li>
              <li><span className="fobles-auditor-origin--cached">◆</span><span><strong>Cached</strong> Supplied by the local Sitecore data cache.</span></li>
              <li><span className="fobles-auditor-origin--live">●</span><span><strong>Live</strong> Retrieved from Sitecore during this operation.</span></li>
            </ul>
          </section>`;
  source = source.replace(oldBlock, replacement);
  await write(relativePath, source);
}

async function updateCleanupDialog() {
  const relativePath = "src/shared/error-dialog.ts";
  let source = await read(relativePath);
  const functionStart = source.indexOf("export function showFoblesCleanupDialog");
  if (functionStart < 0) throw new Error(`showFoblesCleanupDialog was not found in ${relativePath}`);
  const functionEnd = source.indexOf("\n}", functionStart);
  const block = source.slice(functionStart, functionEnd + 2);
  let updated = block.replace(/Fobles cleanup required/g, "Fobles cleanup complete");
  updated = updated.replace(/className\s*=\s*(["'`])([^"'`]+)\1/, (_match, quote, classes) => `className = ${quote}${classes} fobles-cleanup-dialog${quote}`);
  if (updated === block) throw new Error(`Cleanup dialog class/title could not be updated in ${relativePath}`);
  source = source.slice(0, functionStart) + updated + source.slice(functionEnd + 2);
  await write(relativePath, source);
}

async function updateQuickActionGraphButton() {
  const sourceFiles = (await allFiles(path.join(root, "src/content"))).filter((file) => /\.(ts|tsx)$/.test(file));
  let changed = false;
  for (const file of sourceFiles) {
    let source = await fs.readFile(file, "utf8");
    if (!source.includes("JUMP") || !source.includes("VIEW")) continue;
    const replacements = [
      [/(["'`])🔍\1/g, "$1≡$1"],
      [/(["'`])🔎\1/g, "$1≡$1"],
      [/(["'`])search\1(?=[^\n]{0,100}(reference|graph|audit))/gi, "$1rows$1"],
    ];
    const original = source;
    for (const [pattern, value] of replacements) source = source.replace(pattern, value);
    if (source !== original) {
      await fs.writeFile(file, source, "utf8");
      changes.push(path.relative(root, file).replaceAll(path.sep, "/"));
      changed = true;
    }
  }
  if (!changed) throw new Error("Quick-action graph trigger source was found by labels but its current icon representation was not safely recognizable. No guess was applied.");
}

async function appendStyles() {
  const relativePath = "src/content/styles/_auditor.scss";
  let source = await read(relativePath);
  const marker = ".fobles-auditor-help-list";
  if (!source.includes(marker)) {
    source += `

.fobles-auditor-help h3 { margin: 18px 0 8px; color: #203047; }
.fobles-auditor-help-list { display:grid; gap:8px; margin:0; }
.fobles-auditor-help-list > div { display:grid; grid-template-columns:minmax(150px, .45fr) 1fr; gap:12px; padding:7px 0; border-bottom:1px solid #e0e5ed; }
.fobles-auditor-help-list dt { font-weight:700; }
.fobles-auditor-help-list dd { margin:0; }
.fobles-auditor-help-key { display:grid; gap:8px; margin:0; padding:0; list-style:none; }
.fobles-auditor-help-key li { display:grid; grid-template-columns:24px 1fr; align-items:center; gap:8px; }
.fobles-auditor-status-key { display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; border-radius:50%; color:#fff; font-weight:700; }
.fobles-auditor-status-key--passed { background:#1f9d55; }
.fobles-auditor-status-key--pending { background:#7a6a00; }
.fobles-auditor-status-key--warning { background:#c58a00; }
.fobles-auditor-status-key--error { background:#b42318; }
.fobles-auditor-help-corner { display:inline-flex; align-items:center; justify-content:center; }
.fobles-cleanup-dialog, .fobles-cleanup-dialog .fobles-error-dialog-panel { border-color:#2f6fed !important; }
.fobles-cleanup-dialog h1, .fobles-cleanup-dialog h2, .fobles-cleanup-dialog .fobles-error-dialog-title { color:#1f57c3 !important; }
.fobles-cleanup-dialog button { border-color:#1f57c3 !important; background:#2f6fed !important; color:#fff !important; }
.fobles-quick-action-button { width:54px; min-width:54px; }
.fobles-quick-action-button--rows { font-size:20px; line-height:1; }
`;
    await write(relativePath, source);
  }
}

async function main() {
  try {
    await updateAuditorHelp();
    await updateCleanupDialog();
    await updateQuickActionGraphButton();
    await appendStyles();
    await fs.writeFile(reportPath, JSON.stringify({ status: "applied", changes }, null, 2) + "\n");
  } catch (error) {
    await fs.writeFile(reportPath, JSON.stringify({ status: "blocked", changes, error: String(error) }, null, 2) + "\n");
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
