// @source-path [fobles] src/content/shell/utility/fobles-utility.tsx

import { mountFoblesUtility } from "./fobles-utility-store";
import { acquireFoblesUtilityLock, releaseFoblesUtilityLock, takeOverFoblesUtilityLock } from "./fobles-utility-lock";
import { showFoblesUtilityLockDialog } from "./fobles-utility-lock-dialog-component";
import type { FoblesUtilityOptions } from "./FoblesUtilityOptions.types";

function createUtilityContainer(doc: Document): HTMLDivElement {
  const container = doc.createElement("div");
  container.className = "fobles-utility-container";
  doc.body.appendChild(container);
  return container;
}

export async function openFoblesUtility(options: FoblesUtilityOptions): Promise<boolean> {
  const children = await options.createChildren();
  mountFoblesUtility(options.doc, { ...options, children });
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
