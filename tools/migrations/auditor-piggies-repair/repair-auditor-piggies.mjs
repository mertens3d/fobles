import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = process.cwd();
const path = resolve(root, "src/content/features/auditor/components/auditor-dialog.tsx");
let source = await readFile(path, "utf8");

if (!source.includes('import { LifecycleProgressFooter } from "../../../shared/ui/reference-controls/lifecycle-progress-footer";')) {
  if (source.includes('import { PhaseProgressBar } from "../../../shared/ui/reference-controls/phase-progress-bar";')) {
    source = source.replace('import { PhaseProgressBar } from "../../../shared/ui/reference-controls/phase-progress-bar";', 'import { LifecycleProgressFooter } from "../../../shared/ui/reference-controls/lifecycle-progress-footer";');
  } else {
    const anchor = 'import type { PhaseProgress } from "../../../shared/ui/reference-controls/lifecycle.types";';
    if (!source.includes(anchor)) throw new Error("PhaseProgress import not found.");
    source = source.replace(anchor, `${anchor}\nimport { LifecycleProgressFooter } from "../../../shared/ui/reference-controls/lifecycle-progress-footer";`);
  }
}

if (!source.includes("const startedAt = useRef(performance.now());")) {
  if (!source.includes('import { useEffect, useMemo, useRef, useState } from "react";')) {
    source = source.replace('import { useEffect, useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";');
  }
  const anchor = '  const [showHelp, setShowHelp] = useState(false);';
  if (!source.includes(anchor)) throw new Error("showHelp state not found.");
  source = source.replace(anchor, `${anchor}\n  const startedAt = useRef(performance.now());`);
}

const toolbarEnd = `        onViewReferenceModel={() =>\n          setViewReferenceModel(true)\n        }\n      />`;
if (!source.includes("footer={<LifecycleProgressFooter")) {
  if (!source.includes(toolbarEnd)) throw new Error("AuditorToolbar end not found.");
  source = source.replace(toolbarEnd, `        onViewReferenceModel={() =>\n          setViewReferenceModel(true)\n        }\n        footer={<LifecycleProgressFooter harvestProgress={harvestProgress} resolveProgress={resolveProgress} elapsedSeconds={resolveProgress?.status === "complete" ? (performance.now() - startedAt.current) / 1000 : undefined} buildingLabel="Building audit" />}\n      />`);
}

source = source.replace(/\n\s*<div className="fobles-auditor-progress">[\s\S]*?<\/div>\n/, "\n");

await writeFile(path, source, "utf8");
console.log("Auditor piggies integration repaired.");
