import type { FoblesShellCommandEvent } from "./shell.types.js";
import type { FoblesShellCommand } from "./shell.types.js";

const COMMAND_EVENT_TYPE = "fobles:shell:command";
const commandTarget = new EventTarget();

export function publishFoblesShellCommand(command: FoblesShellCommand, doc: Document): void {
  commandTarget.dispatchEvent(
    new CustomEvent<FoblesShellCommandEvent>(COMMAND_EVENT_TYPE, { detail: { command, doc } }),
  );
}

export function subscribeFoblesShellCommand(
  command: FoblesShellCommand,
  listener: (event: FoblesShellCommandEvent) => void,
): () => void {
  const handler = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as FoblesShellCommandEvent;
    if (detail.command === command) {
      listener(detail);
    }
  };

  commandTarget.addEventListener(COMMAND_EVENT_TYPE, handler);
  return () => commandTarget.removeEventListener(COMMAND_EVENT_TYPE, handler);
}
