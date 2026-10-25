// @source-path [fobles] src/content/foundation/workers/diagnostics/memory-diagnostics.ts

import { extensionLog } from "../../../logger";
import { DEBUG_MEMORY } from "../worker-protocol.const";

type MemoryContext = Readonly<Record<string, unknown>>;
type PerformanceWithMemory = Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };

const MB = 1024 * 1024;
let baselineUsedJSHeapSize: number | undefined;

function toMb(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round((value / MB) * 10) / 10;
}

function readHeapMemory(): Record<string, number | undefined> {
  const memory = (performance as PerformanceWithMemory).memory;
  const used = memory?.usedJSHeapSize;
  if (baselineUsedJSHeapSize === undefined && used !== undefined) baselineUsedJSHeapSize = used;
  return {
    usedJSHeapMB: toMb(used),
    totalJSHeapMB: toMb(memory?.totalJSHeapSize),
    heapLimitMB: toMb(memory?.jsHeapSizeLimit),
    deltaFromBaselineMB: toMb(used !== undefined && baselineUsedJSHeapSize !== undefined ? used - baselineUsedJSHeapSize : undefined),
  };
}

export function logWorkerMemory(checkpoint: string, context: MemoryContext = {}): void {
  if (!DEBUG_MEMORY) return;
  extensionLog.debug("Worker memory diagnostic", { checkpoint, ...readHeapMemory(), ...context });
}

export function logWorkerMemoryAfterDelays(checkpoint: string, context: MemoryContext = {}): void {
  if (!DEBUG_MEMORY) return;
  logWorkerMemory(checkpoint, context);
  setTimeout(() => logWorkerMemory(`${checkpoint} +1s`, context), 1000);
  setTimeout(() => logWorkerMemory(`${checkpoint} +5s`, context), 5000);
}
