import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const changed = [];

async function update(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const source = await fs.readFile(filePath, "utf8");
  const result = transform(source);
  if (result === source) throw new Error(`No recognized current-source change in ${relativePath}`);
  await fs.writeFile(filePath, result, "utf8");
  changed.push(relativePath);
}

await update("src/content/features/auditor/components/auditor-dialog.tsx", (source) => {
  const gridPattern = /\{model \? \(\s*<AuditorGrid[\s\S]*?\) : null\}\s*\{viewReferenceModel/;
  const detailsPattern = /\{selectedTreeNodeId && model \? \(\s*<NodeDetailsPanel[\s\S]*?\) : null\}/;
  const gridMatch = source.match(gridPattern);
  const detailsMatch = source.match(detailsPattern);
  if (!gridMatch || !detailsMatch) throw new Error("Current Auditor workspace blocks were not recognized.");
  const gridBlock = gridMatch[0].replace(/\s*\{viewReferenceModel$/, "");
  const detailsBlock = detailsMatch[0];
  let result = source.replace(gridPattern, `{viewReferenceModel`);
  result = result.replace(detailsPattern, `<div className={\`fobles-auditor-workspace\${selectedTreeNodeId ? " fobles-auditor-workspace--details" : ""}\`}>
        <div className="fobles-auditor-workspace-main">
          ${gridBlock}
        </div>
        {selectedTreeNodeId && model ? (
          <aside className="fobles-auditor-workspace-details">
            <NodeDetailsPanel
              selectedTreeNodeId={selectedTreeNodeId}
              nodesById={model.nodesById}
              processingStateByTreeNodeId={model.processingStateByTreeNodeId}
              onClose={() => setSelectedTreeNodeId(undefined)}
            />
          </aside>
        ) : null}
      </div>`);
  const oldHelp = /<h2>Fobles Auditor<\/h2>[\s\S]*?<\/section>/;
  if (!oldHelp.test(result)) throw new Error("Current Auditor help block was not recognized.");
  return result.replace(oldHelp, `<h2>Fobles Auditor</h2>
            <p>Inspect the Reference Model as a Sitecore-style tree with tests attached to the exact item or relationship they evaluate.</p>
            <h3>Tree shortcuts</h3>
            <dl className="fobles-auditor-help-list">
              <div><dt>Click glyph</dt><dd>Expand or collapse one node.</dd></div>
              <div><dt>Ctrl/Cmd + click</dt><dd>Apply the same state to every node in that semantic category.</dd></div>
              <div><dt>Shift + click</dt><dd>Expand or collapse the selected subtree.</dd></div>
              <div><dt>Double-click row</dt><dd>Expand or collapse that row.</dd></div>
              <div><dt>View Data</dt><dd>Open details in the right half. Escape, Close, or click-away dismisses it.</dd></div>
            </dl>
            <h3>Data journey</h3>
            <ul className="fobles-auditor-help-key">
              <li><span className="fobles-auditor-journey fobles-auditor-journey--referenced"><span className="is-complete"/><span/><span/><span/></span><span><strong>Referenced</strong> Discovered from the target or another relationship.</span></li>
              <li><span className="fobles-auditor-journey fobles-auditor-journey--cached"><span className="is-complete"/><span className="is-complete"/><span/><span/></span><span><strong>Cached</strong> Facts were supplied by the Sitecore data cache.</span></li>
              <li><span className="fobles-auditor-journey fobles-auditor-journey--live"><span className="is-complete"/><span className="is-complete"/><span className="is-complete"/><span/></span><span><strong>Live</strong> Sitecore was queried during this operation.</span></li>
              <li><span className="fobles-auditor-journey fobles-auditor-journey--tested"><span className="is-complete"/><span className="is-complete"/><span className="is-complete"/><span className="is-complete"/></span><span><strong>Tested</strong> Audit checks completed for the node.</span></li>
            </ul>
          </section>`);
});

await update("src/shared/error-dialog.ts", (source) => {
  const functionPattern = /export function showFoblesCleanupDialog\([\s\S]*?\n\}/;
  const match = source.match(functionPattern);
  if (!match) throw new Error("showFoblesCleanupDialog was not found.");
  let block = match[0];
  if (block.includes("fobles-cleanup-wait-dialog")) return source + "\n";
  if (/const dialog\s*=/.test(block)) {
    block = block.replace(/(const dialog\s*=[^;]+;)/, `$1\n  dialog.classList.add("fobles-cleanup-wait-dialog");`);
  } else if (/return\s+showFoblesErrorDialog\(/.test(block)) {
    block = block.replace(/return\s+(showFoblesErrorDialog\([\s\S]*?\));/, `const dialog = $1;\n  dialog.classList.add("fobles-cleanup-wait-dialog");\n  return dialog;`);
  } else {
    throw new Error("showFoblesCleanupDialog return shape was not recognized.");
  }
  return source.replace(functionPattern, block);
});

await fs.writeFile(path.join(root, "tools/migrations/auditor-ui/auditor-ui-report.json"), JSON.stringify({ status: "applied", changed }, null, 2) + "\n");
console.log(JSON.stringify({ status: "applied", changed }, null, 2));
