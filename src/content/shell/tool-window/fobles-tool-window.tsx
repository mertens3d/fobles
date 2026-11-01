// @source-path [fobles] src/content/shell/tool-window/fobles-tool-window.tsx
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { FoblesWindow } from "../../shared/dialog/fobles-window";
import { clearFoblesWindowHost, replaceFoblesWindowHost } from "../../shared/dialog/fobles-window-host-registry";
import { acquireFoblesToolWindowLock, releaseFoblesToolWindowLock, subscribeFoblesToolWindowLockLost, takeOverFoblesToolWindowLock } from "./fobles-tool-window-lock";
import { showFoblesToolWindowLockDialog, showFoblesToolWindowOwnershipLostDialog } from "./fobles-tool-window-lock-dialog";

export type FoblesToolWindowOptions = {
  doc: Document;
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  children: ReactNode;
  onClose?: () => void | Promise<void>;
  onHelp?: () => void;
};

export async function openFoblesToolWindow(options: FoblesToolWindowOptions): Promise<boolean> {
  const { doc, id, className, title, storageKey, defaultWidth, defaultHeight, minWidth, minHeight, children, onClose, onHelp } = options;
  const ownerToken = crypto.randomUUID();
  const acquired = await acquireFoblesToolWindowLock(ownerToken) || await showFoblesToolWindowLockDialog(doc, () => takeOverFoblesToolWindowLock(ownerToken));
  if (!acquired) return false;
  const container = doc.createElement("div");
  container.className = "fobles-tool-window-container";
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.zIndex = "11000";
  container.style.pointerEvents = "none";
  const host = doc.createElement("div");
  host.style.position = "absolute";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  container.appendChild(host);
  doc.body.appendChild(container);
  const root = createRoot(host);
  replaceFoblesWindowHost(doc, id, container, root);
  let closing = false;
  const unsubscribeLockLost = subscribeFoblesToolWindowLockLost(ownerToken, () => {
    handleClose(false);
    showFoblesToolWindowOwnershipLostDialog(doc);
  });

  function handleClose(releaseLock = true): void {
    if (closing) return;
    closing = true;
    void Promise.resolve(onClose?.()).finally(() => {
      clearFoblesWindowHost(doc, id);
      root.unmount();
      container.remove();
      unsubscribeLockLost();
      if (releaseLock) void releaseFoblesToolWindowLock(ownerToken);
    });
  }

  root.render(
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto" }}>
        <FoblesWindow id={id} className={className} title={title} storageKey={storageKey} defaultWidth={defaultWidth} defaultHeight={defaultHeight}
      minWidth={minWidth} minHeight={minHeight} onClose={() => handleClose()} onHelp={onHelp}>
          {children}
        </FoblesWindow>
      </div>
    </div>,
  );
  return true;
}
