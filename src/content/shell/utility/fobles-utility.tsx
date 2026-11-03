// @source-path [fobles] src/content/shell/utility/fobles-utility.tsx

import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { FoblesWindow } from "../../shared/dialog/fobles-window";
import { clearFoblesWindowHost, replaceFoblesWindowHost } from "../../shared/dialog/fobles-window-host-registry";
import { acquireFoblesUtilityLock, releaseFoblesUtilityLock, takeOverFoblesUtilityLock } from "./fobles-utility-lock";
import { showFoblesUtilityLockDialog } from "./fobles-utility-lock-dialog-component";

export type FoblesUtilityOptions = {
  lockAlreadyHeld?: boolean;
  doc: Document;
  id: string;
  className: string;
  title: string;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  createChildren: () => ReactNode | Promise<ReactNode>;
  onClose?: () => void | Promise<void>;
  onHelp?: () => void;
};

function createUtilityContainer(doc: Document): HTMLDivElement {
  const container = doc.createElement("div");
  container.className = "fobles-utility-container";
  doc.body.appendChild(container);
  return container;
}

export async function openFoblesUtility(options: FoblesUtilityOptions): Promise<boolean> {
  const {
    doc,
    id,
    className,
    title,
    storageKey,
    defaultWidth,
    defaultHeight,
    minWidth,
    minHeight,
    createChildren,
    onClose,
    onHelp,
  } = options;
  const container = createUtilityContainer(doc);
  let children: ReactNode;
  try {
    children = await createChildren();
  } catch (error) {
    container.remove();
    throw error;
  }
  const host = doc.createElement("div");
  host.className = "fobles-utility-host";
  host.className = "fobles-utility-host";
  container.appendChild(host);
  const root = createRoot(host);
  replaceFoblesWindowHost(doc, id, container, root);
  let closing = false;
  function handleClose(): void {
    if (closing) {
      return;
    }
    closing = true;
    void Promise.resolve(onClose?.()).finally(() => {
      clearFoblesWindowHost(doc, id);
      root.unmount();
      container.remove();
    });
  }

  root.render(
    <div className="fobles-utility-root">
      <div className="fobles-utility-content">
        <FoblesWindow
          id={id}
          className={className}
          title={title}
          storageKey={storageKey}
          defaultWidth={defaultWidth}
          defaultHeight={defaultHeight}
          minWidth={minWidth}
          minHeight={minHeight}
          onClose={() => handleClose()}
          onHelp={onHelp}
        >
          {children}
        </FoblesWindow>
      </div>
    </div>,
  );
  return true;
}

export async function runWithFoblesUtilityLock<T>(doc: Document, run: () => Promise<T>): Promise<T | undefined> {
  const ownerToken = crypto.randomUUID();
  const container = createUtilityContainer(doc);
  const acquired =
    (await acquireFoblesUtilityLock(ownerToken)) ||
    (await showFoblesUtilityLockDialog(container, () => takeOverFoblesUtilityLock(ownerToken)));
  if (!acquired) {
    container.remove();
    return undefined;
  }
  try {
    return await run();
  } finally {
    await releaseFoblesUtilityLock(ownerToken);
    container.remove();
  }
}
