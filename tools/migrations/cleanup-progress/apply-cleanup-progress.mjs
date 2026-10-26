import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = process.cwd();
const workPath = resolve(root, "src/content/shell/work-session/work-session.ts");
const todoPath = resolve(root, "tools/migrations/auditor-journey/NEXT-PHASE-TODO.md");
const scssPath = resolve(root, "src/content/styles/_fobles-error.scss");
let work = await readFile(workPath, "utf8");
const dialogImport = 'import { showFoblesCleanupDialog, updateFoblesCleanupDialog } from "../../../shared/error-dialog";';
work = work.replace(/import \{ showFoblesErrorDialog \} from "\.\.\/\.\.\/\.\.\/shared\/error-dialog";/, 'import { showFoblesErrorDialog, updateFoblesCleanupDialog } from "../../../shared/error-dialog";');
if (!work.includes("updateFoblesCleanupDialog")) throw new Error("WorkSession error dialog import was not recognized.");
const oldBlock = '  poolDisposalPromise ??= disposeBackgroundWorkerPool().finally(() => { poolDisposalPromise = undefined; });\n  try { await poolDisposalPromise; } finally { runFinalWorkerIframeCleanup(sessionId); }';
const newBlock = `  const initialIframeCount = document.querySelectorAll("iframe[data-worker-id]").length;
  const startedAt = performance.now();
  const timeoutMs = 10000;
  const progressTimer = setInterval(() => {
    const remaining = document.querySelectorAll("iframe[data-worker-id]").length;
    updateFoblesCleanupDialog(document, {
      removed: Math.max(0, initialIframeCount - remaining),
      total: initialIframeCount,
      remainingSeconds: Math.max(0, Math.ceil((timeoutMs - (performance.now() - startedAt)) / 1000)),
      phase: "disposing",
    });
  }, 250);
  poolDisposalPromise ??= disposeBackgroundWorkerPool().finally(() => { poolDisposalPromise = undefined; });
  try {
    await Promise.race([poolDisposalPromise, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  } finally {
    clearInterval(progressTimer);
    const remainingBeforeFailsafe = document.querySelectorAll("iframe[data-worker-id]").length;
    if (remainingBeforeFailsafe > 0) updateFoblesCleanupDialog(document, { removed: Math.max(0, initialIframeCount - remainingBeforeFailsafe), total: initialIframeCount, remainingSeconds: 0, phase: "failsafe" });
    runFinalWorkerIframeCleanup(sessionId);
    updateFoblesCleanupDialog(document, { removed: initialIframeCount, total: initialIframeCount, remainingSeconds: 0, phase: "complete" });
  }`;
if (!work.includes(oldBlock)) throw new Error("WorkSession pool disposal block was not recognized.");
work = work.replace(oldBlock, newBlock);
await writeFile(workPath, work, "utf8");
let scss = await readFile(scssPath, "utf8");
if (!scss.includes(".fobles-cleanup-dialog__progress")) scss += `\n.fobles-cleanup-dialog__progress { width: 100%; height: 8px; margin-top: 12px; accent-color: #2f6fed; }\n`;
await writeFile(scssPath, scss, "utf8");
await mkdir(resolve(root, "tools/migrations/auditor-journey"), { recursive: true });
let todo = "";
try { todo = await readFile(todoPath, "utf8"); } catch {}
const additions = [
  "- Replace the Auditor toolbar trigger magnifier with a packaged three-row/table SVG icon and match Graph button dimensions.",
  "- Fix retained worker/iframe resources and health timers after specialist completion/close; repeated runs must not increase memory.",
  "- Publish and replay real Harvesting/Resolving progress from Foundation reference-data processing instead of 0 / 0.",
  "- Make persisted-log action buttons equal width.",
  "- Move Search immediately above the audit grid.",
  "- Remove tree-row border lines, button chrome from tree glyphs/globe, and use pointer cursor across expandable rows.",
  "- Apply subtle item-row tint while preserving warning/error colors for relationship/test rows.",
  "- Make Node Details use the shared close control light variant and fill the remaining workspace height.",
  "- Correct aggregate status/journey rollup so a parent cannot disagree with terminal child outcomes.",
];
if (!todo.trim()) todo = "## Next Phase TODO\n";
for (const addition of additions) if (!todo.includes(addition)) todo += `${addition}\n`;
await writeFile(todoPath, todo, "utf8");
console.log("Cleanup progress and TODO updates applied.");
