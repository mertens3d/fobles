// @source-path [fobles] src/content/shell/utility/fobles-utility-lock-dialog-component.tsx

import { createRoot } from "react-dom/client";
import { FoblesMessageDialog } from "../../shared/ui/fobles-message-dialog/fobles-message-dialog";
import type { FoblesMessageDialogAction } from "../../shared/ui/fobles-message-dialog/fobles-message-dialog.types";
import type { MountedDialog } from "./MountedDialog.1.types";

function mountDialog(
  container: HTMLElement,
  renderActions: (dispose: () => void) => readonly FoblesMessageDialogAction[],
  title: string,
  message: string,
): MountedDialog {
  const host = container.ownerDocument.createElement("div");
  host.className = "fobles-utility-lock-host";
  container.classList.add("fobles-utility-container--lock-host");
  container.appendChild(host);
  const root = createRoot(host);
  let disposed = false;

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    container.classList.remove("fobles-utility-container--lock-host");
    root.unmount();
    host.remove();
  }

  root.render(<FoblesMessageDialog title={title} message={message} actions={renderActions(dispose)} />);
  return { host, root, dispose };
}

export function showFoblesUtilityLockDialog(
  container: HTMLElement,
  onTakeOwnership: () => Promise<boolean>,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let takingOwnership = false;

    function actions(dispose: () => void): readonly FoblesMessageDialogAction[] {
      return [
        {
          label: "Close",
          onClick: () => {
            dispose();
            resolve(false);
          },
        },
        {
          label: "Take Ownership",
          primary: true,
          disabled: takingOwnership,
          onClick: async () => {
            takingOwnership = true;
            const acquired = await onTakeOwnership();
            dispose();
            resolve(acquired);
          },
        },
      ];
    }

    mountDialog(
      container,
      actions,
      "Fobles Utility Already Active",
      "Another tab on this domain owns the Fobles utility.",
    );
  });
}

export function showFoblesUtilityOwnershipLostDialog(container: HTMLElement): void {
  mountDialog(
    container,
    (dispose) => [{ label: "Close", onClick: dispose }],
    "Fobles Utility Ownership Changed",
    "Another tab took ownership. This Fobles utility has stopped.",
  );
}
