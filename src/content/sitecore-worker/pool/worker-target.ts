// @source-path [fobles] src/content/sitecore-worker/pool/worker-target.ts

import type { WorkerIframeTarget } from "../iframe/worker-iframe-service";

export type WorkerTabTarget = {
  kind: "tab";
  tabId: number;
};

export type WorkerTarget =
  | WorkerTabTarget
  | WorkerIframeTarget;

export function isWorkerTabTarget(
  target: WorkerTarget,
): target is WorkerTabTarget {
  return target.kind === "tab";
}

export function isWorkerIframeTarget(
  target: WorkerTarget,
): target is WorkerIframeTarget {
  return target.kind === "iframe";
}