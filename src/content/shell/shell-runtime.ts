// @source-path [fobles] src/content/shell/shell-runtime.ts

import { registerAuditorShellCommands } from "../features/auditor/auditor-shell-commands";
import { registerReferenceGraphShellCommands } from "../features/reference-graph/reference-graph-shell-commands";
import { registerWorkerIframeHost } from "../foundation/workers/iframe/worker-iframe-host";

let shellStarted = false;
const shellDisposers: Array<() => void> = [];

export function startFoblesShellRuntime(doc: Document, win: Window): void {
  if (shellStarted) return;
  shellStarted = true;

  if (win.top === win) registerWorkerIframeHost(doc);

  shellDisposers.push(
    registerAuditorShellCommands(),
    registerReferenceGraphShellCommands(),
  );
}

export function stopFoblesShellRuntime(): void {
  while (shellDisposers.length > 0) shellDisposers.pop()?.();
  shellStarted = false;
}
