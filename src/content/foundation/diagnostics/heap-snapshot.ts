// @source-path [fobles] src/content/foundation/diagnostics/heap-snapshot.ts
import { extensionLog } from "../../logger";

type ChromiumPerformance = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
};

const BYTES_PER_MB = 1024 * 1024;

function toMegabytes(bytes: number | undefined): number | undefined {
  return bytes === undefined ? undefined : Math.round((bytes / BYTES_PER_MB) * 10) / 10;
}

// Records the page's heap and the Fobles-owned DOM at a named point in a specialist run. Comparing "opened" and
// "closed+10s" across repeated runs shows whether anything is retained between runs, and the counts show whether
// that is worker iframes, stray dialogs, or general DOM growth. Heap figures are Chromium-only.
export function logHeapSnapshot(label: string, context: Record<string, unknown> = {}): void {
  const memory = (performance as ChromiumPerformance).memory;

  extensionLog.debug("Heap snapshot", {
    label,
    ...context,
    usedJSHeapMB: toMegabytes(memory?.usedJSHeapSize),
    totalJSHeapMB: toMegabytes(memory?.totalJSHeapSize),
    domNodeCount: document.getElementsByTagName("*").length,
    iframeCount: document.getElementsByTagName("iframe").length,
    workerIframeCount: document.querySelectorAll("iframe[data-worker-id]").length,
    openDialogCount: document.querySelectorAll("dialog[open]").length,
  });
}
